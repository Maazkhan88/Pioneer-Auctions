import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";
import {
  money,
  type BidLatestState,
  type CancelProxyBidAck,
  type LotReplayEvent,
  type LotSnapshot,
  type PlaceBidAck,
  type PlaceBidInput,
  type ProxyBidStatus,
  type SetProxyBidAck,
  type SetProxyBidInput,
} from "./bid.dto.js";
import {
  evaluateManualBid,
  type LotBidLifecycle,
  type LotBidState,
  type ReserveStatus,
} from "./bid-decision.js";

interface PlaceManualBidCommand {
  readonly accountId: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly input: PlaceBidInput;
  readonly lotId: string;
}

interface SetProxyBidCommand {
  readonly accountId: string;
  readonly commandId: string;
  readonly correlationId: string;
  readonly input: SetProxyBidInput;
  readonly lotId: string;
}

interface ProxyBidQuery {
  readonly accountId: string;
  readonly lotId: string;
}

interface CancelProxyBidCommand extends ProxyBidQuery {
  readonly commandId: string;
  readonly correlationId: string;
}

interface SavedCommandRow extends QueryResultRow {
  readonly result_payload: PlaceBidAck | SetProxyBidAck;
}

interface LotForUpdateRow extends QueryResultRow {
  readonly auction_id: string;
  readonly closes_at: Date;
  readonly current_bid_fils: string | null;
  readonly lifecycle: LotBidLifecycle;
  readonly minimum_increment_fils: string;
  readonly next_minimum_bid_fils: string;
  readonly reserve_price_fils: string | null;
  readonly reserve_status: ReserveStatus;
  readonly sequence: number;
  readonly soft_close_enabled: boolean;
  readonly auction_soft_close_extension_ms: number;
  readonly auction_soft_close_maximum_extensions: number | null;
  readonly auction_soft_close_window_ms: number;
  readonly lot_soft_close_extension_ms: number | null;
  readonly lot_soft_close_maximum_extensions: number | null;
  readonly lot_soft_close_window_ms: number | null;
  readonly soft_close_extension_count: number;
  readonly leading_account_id: string | null;
}

interface EligibilityRow extends QueryResultRow {
  readonly account_active: boolean;
  readonly deposit_eligible: boolean;
  readonly kyc_verified: boolean;
  readonly terms_accepted: boolean;
}

interface ActiveProxyRow extends QueryResultRow {
  readonly account_id: string;
  readonly maximum_fils: string;
  readonly registered_at: Date;
}

interface ActiveProxyStatusRow extends QueryResultRow {
  readonly closes_at: Date | null;
  readonly current_bid_fils: string | null;
  readonly lot_exists: boolean;
  readonly maximum_fils: string | null;
  readonly next_minimum_bid_fils: string | null;
  readonly sequence: number | null;
}

interface LotSnapshotRow extends QueryResultRow {
  readonly auction_id: string;
  readonly bid_count: number;
  readonly closes_at: Date;
  readonly current_bid_fils: string | null;
  readonly lifecycle: string;
  readonly next_minimum_bid_fils: string;
  readonly reserve_status: string;
  readonly sequence: number;
  readonly soft_close_enabled: boolean;
  readonly auction_soft_close_extension_ms: number;
  readonly auction_soft_close_window_ms: number;
  readonly lot_soft_close_extension_ms: number | null;
  readonly lot_soft_close_window_ms: number | null;
  readonly soft_close_extension_count: number;
  readonly starts_at: Date;
}

interface OutboxReplayRow extends QueryResultRow {
  readonly event_name: string;
  readonly payload: Record<string, unknown>;
  readonly sequence: number | null;
}

type AcceptedBidResult = Extract<
  ReturnType<typeof evaluateManualBid>,
  { status: "ACCEPTED" }
>["result"];

interface VisibleBid {
  readonly accountId: string;
  readonly activeProxyMaximumFils: number | null;
  readonly bidKind: "MANUAL" | "PROXY";
  readonly result: AcceptedBidResult;
}

@Injectable()
export class BiddingService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async getLotSnapshot(lotId: string): Promise<LotSnapshot | null> {
    const result = await this.database.query<LotSnapshotRow>(
      `
        SELECT
          lots.auction_id::text,
          lots.bid_count,
          lots.closes_at,
          lots.current_bid_fils::text,
          lots.lifecycle,
          lots.next_minimum_bid_fils::text,
          lots.reserve_status,
          lots.sequence,
          lots.soft_close_extension_count,
          lots.starts_at,
          auctions.soft_close_enabled,
          auctions.soft_close_window_ms AS auction_soft_close_window_ms,
          auctions.soft_close_extension_ms AS auction_soft_close_extension_ms,
          lots.soft_close_window_ms AS lot_soft_close_window_ms,
          lots.soft_close_extension_ms AS lot_soft_close_extension_ms
        FROM lots
        INNER JOIN auctions ON auctions.id = lots.auction_id
        WHERE lots.id = $1
      `,
      [lotId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      auctionId: row.auction_id,
      contractVersion: 1,
      event: "lot:snapshot",
      generatedAt: new Date().toISOString(),
      lotId,
      sequence: row.sequence,
      state: {
        bidCount: row.bid_count,
        closesAt: row.closes_at.toISOString(),
        currentBid:
          row.current_bid_fils === null
            ? null
            : money(Number(row.current_bid_fils)),
        lifecycle: row.lifecycle,
        nextMinimumBid: money(Number(row.next_minimum_bid_fils)),
        reserveStatus: row.reserve_status,
        softClose: {
          enabled: row.soft_close_enabled,
          extensionCount: row.soft_close_extension_count,
          extensionMs:
            row.lot_soft_close_extension_ms ??
            row.auction_soft_close_extension_ms,
          windowMs:
            row.lot_soft_close_window_ms ?? row.auction_soft_close_window_ms,
        },
        startsAt: row.starts_at.toISOString(),
      },
    };
  }

  async getLotEventsAfter(
    lotId: string,
    afterSequence: number,
  ): Promise<readonly LotReplayEvent[]> {
    const result = await this.database.query<OutboxReplayRow>(
      `
        SELECT
          event_name,
          payload,
          (payload ->> 'sequence')::integer AS sequence
        FROM outbox_events
        WHERE aggregate_type = 'lot'
          AND aggregate_id = $1
          AND (payload ->> 'sequence')::integer > $2
        ORDER BY (payload ->> 'sequence')::integer ASC, occurred_at ASC
      `,
      [lotId, afterSequence],
    );
    return result.rows
      .filter((row) => row.sequence !== null)
      .map((row) => ({
        event: row.event_name,
        payload: row.payload,
        sequence: row.sequence ?? 0,
      }));
  }

  async placeManualBid(command: PlaceManualBidCommand): Promise<PlaceBidAck> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await this.findSavedCommand<PlaceBidAck>(
        client,
        command,
      );
      if (existing !== null) {
        await client.query("COMMIT");
        return existing;
      }

      const serverTime = new Date();
      const lotRow = await this.lockLot(client, command.lotId);
      if (lotRow === null) {
        const rejected = this.reject(
          command,
          serverTime,
          "LOT_NOT_FOUND",
          false,
        );
        await this.saveCommand(client, command, "PLACE_MANUAL_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }

      const eligibility = await this.loadEligibility(client, command);
      const lotState = toLotBidState(lotRow);
      const decision = evaluateManualBid({
        amountFils: command.input.amountFils,
        depositEligible:
          eligibility.account_active &&
          eligibility.kyc_verified &&
          eligibility.deposit_eligible,
        lot: lotState,
        serverTime,
        termsAccepted: eligibility.terms_accepted,
      });

      if (decision.status === "REJECTED") {
        const rejected = this.reject(
          command,
          serverTime,
          decision.errorCode,
          decision.retryable,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "PLACE_MANUAL_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }

      const visibleBids: VisibleBid[] = [
        {
          activeProxyMaximumFils: null,
          accountId: command.accountId,
          bidKind: "MANUAL",
          result: decision.result,
        },
      ];
      const proxyBid = await this.resolveProxyResponseToManualBid(
        client,
        command,
        lotState,
        decision.result,
        serverTime,
      );
      if (proxyBid !== null) {
        visibleBids.push(proxyBid);
      }

      for (const visibleBid of visibleBids) {
        await this.appendAcceptedBid(
          client,
          command,
          lotRow,
          visibleBid.result,
          serverTime,
          visibleBid.bidKind,
          visibleBid.accountId,
        );
        await this.writeOutbox(
          client,
          command,
          lotRow,
          visibleBid.result,
          serverTime,
          visibleBid.bidKind,
        );
      }

      const finalBid = visibleBids.at(-1);
      if (finalBid === undefined) {
        throw new Error("accepted bid command produced no visible bid");
      }
      await this.updateLot(
        client,
        command.lotId,
        finalBid.result,
        visibleBids.length,
      );
      for (const visibleBid of visibleBids) {
        await this.writePersonalBidStatusOutbox(
          client,
          visibleBid.accountId,
          command,
          lotRow,
          finalBid.result,
          finalBid.accountId === visibleBid.accountId ? "WINNING" : "OUTBID",
          serverTime,
          visibleBid.activeProxyMaximumFils,
        );
      }
      if (!visibleBids.some((bid) => bid.accountId === command.accountId)) {
        await this.writePersonalBidStatusOutbox(
          client,
          command.accountId,
          command,
          lotRow,
          finalBid.result,
          finalBid.accountId === command.accountId ? "WINNING" : "OUTBID",
          serverTime,
        );
      }
      await this.writePreviousLeaderOutbidStatusOutbox(
        client,
        lotRow.leading_account_id,
        finalBid.accountId,
        command,
        lotRow,
        finalBid.result,
        serverTime,
      );

      const accepted: PlaceBidAck = {
        commandId: command.commandId,
        contractVersion: 1,
        correlationId: command.correlationId,
        result: {
          closesAt: finalBid.result.closesAt.toISOString(),
          currentBid: money(finalBid.result.amountFils),
          extended: visibleBids.some((bid) => bid.result.extended),
          lotId: command.lotId,
          myBidStatus:
            finalBid.accountId === command.accountId ? "WINNING" : "OUTBID",
          nextMinimumBid: money(finalBid.result.nextMinimumBidFils),
          reserveStatus: finalBid.result.reserveStatus,
          sequence: finalBid.result.sequence,
        },
        serverTime: serverTime.toISOString(),
        status: "ACCEPTED",
      };

      await this.saveCommand(client, command, "PLACE_MANUAL_BID", accepted);
      await client.query("COMMIT");
      return accepted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setProxyBid(command: SetProxyBidCommand): Promise<SetProxyBidAck> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await this.findSavedCommand<SetProxyBidAck>(
        client,
        command,
      );
      if (existing !== null) {
        await client.query("COMMIT");
        return existing;
      }

      const serverTime = new Date();
      const lotRow = await this.lockLot(client, command.lotId);
      if (lotRow === null) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "LOT_NOT_FOUND",
          false,
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }

      const eligibility = await this.loadEligibility(client, command);
      const lotState = toLotBidState(lotRow);
      if (!eligibility.terms_accepted) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "TERMS_ACCEPTANCE_REQUIRED",
          false,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }
      if (
        !eligibility.account_active ||
        !eligibility.kyc_verified ||
        !eligibility.deposit_eligible
      ) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "DEPOSIT_REQUIRED",
          false,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }
      if (lotState.lifecycle !== "LIVE") {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "AUCTION_NOT_LIVE",
          true,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }
      if (serverTime.getTime() >= lotState.closesAt.getTime()) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "AUCTION_CLOSED",
          true,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }
      if (command.input.maximumFils < lotState.nextMinimumBidFils) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "PROXY_MAX_TOO_LOW",
          true,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }

      const existingProxy = await this.findActiveProxy(client, command);
      if (
        existingProxy !== null &&
        Number(existingProxy.maximum_fils) >= command.input.maximumFils
      ) {
        const rejected = this.rejectProxy(
          command,
          serverTime,
          "PROXY_MAX_TOO_LOW",
          false,
          latestFromLot(command.lotId, lotState),
        );
        await this.saveCommand(client, command, "SET_PROXY_BID", rejected);
        await client.query("COMMIT");
        return rejected;
      }

      await this.upsertProxyBid(client, command);

      const userAlreadyLeading =
        lotRow.leading_account_id === command.accountId;
      const proxyBid = userAlreadyLeading
        ? null
        : await this.resolveProxyLeaderboard(
            client,
            command,
            lotState,
            serverTime,
          );
      if (proxyBid !== null) {
        await this.appendAcceptedBid(
          client,
          command,
          lotRow,
          proxyBid.result,
          serverTime,
          "PROXY",
          proxyBid.accountId,
        );
        await this.updateLot(client, command.lotId, proxyBid.result);
        await this.writeOutbox(
          client,
          command,
          lotRow,
          proxyBid.result,
          serverTime,
          "PROXY",
        );
        await this.writePersonalBidStatusOutbox(
          client,
          command.accountId,
          command,
          lotRow,
          proxyBid.result,
          proxyBid.accountId === command.accountId ? "WINNING" : "OUTBID",
          serverTime,
          command.input.maximumFils,
        );
        if (proxyBid.accountId !== command.accountId) {
          await this.writePersonalBidStatusOutbox(
            client,
            proxyBid.accountId,
            command,
            lotRow,
            proxyBid.result,
            "WINNING",
            serverTime,
            proxyBid.activeProxyMaximumFils,
          );
        }
        await this.writePreviousLeaderOutbidStatusOutbox(
          client,
          lotRow.leading_account_id,
          proxyBid.accountId,
          command,
          lotRow,
          proxyBid.result,
          serverTime,
        );
      } else {
        await this.writePersonalBidStatusOutbox(
          client,
          command.accountId,
          command,
          lotRow,
          null,
          userAlreadyLeading ? "WINNING" : "NOT_BIDDING",
          serverTime,
          command.input.maximumFils,
        );
      }

      const accepted: SetProxyBidAck = {
        commandId: command.commandId,
        contractVersion: 1,
        correlationId: command.correlationId,
        result: {
          activeProxyMaximum: money(command.input.maximumFils),
          closesAt:
            proxyBid !== null
              ? proxyBid.result.closesAt.toISOString()
              : lotState.closesAt.toISOString(),
          currentBid:
            proxyBid !== null
              ? money(proxyBid.result.amountFils)
              : lotState.currentBidFils === null
                ? null
                : money(lotState.currentBidFils),
          extended: proxyBid !== null ? proxyBid.result.extended : false,
          lotId: command.lotId,
          myBidStatus: userAlreadyLeading
            ? "WINNING"
            : proxyBid?.accountId === command.accountId
              ? "WINNING"
              : "OUTBID",
          nextMinimumBid:
            proxyBid !== null
              ? money(proxyBid.result.nextMinimumBidFils)
              : money(lotState.nextMinimumBidFils),
          reserveStatus:
            proxyBid !== null
              ? proxyBid.result.reserveStatus
              : lotState.reserveStatus,
          sequence:
            proxyBid !== null ? proxyBid.result.sequence : lotState.sequence,
        },
        serverTime: serverTime.toISOString(),
        status: "ACCEPTED",
      };

      await this.saveCommand(client, command, "SET_PROXY_BID", accepted);
      await client.query("COMMIT");
      return accepted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveProxyBid(query: ProxyBidQuery): Promise<ProxyBidStatus> {
    const result = await this.database.query<ActiveProxyStatusRow>(
      `
        SELECT
          true AS lot_exists,
          lots.sequence,
          lots.current_bid_fils::text,
          lots.next_minimum_bid_fils::text,
          lots.closes_at,
          proxy_bids.maximum_fils::text
        FROM lots
        LEFT JOIN proxy_bids ON proxy_bids.lot_id = lots.id
          AND proxy_bids.account_id = $2
          AND proxy_bids.status = 'ACTIVE'
        WHERE lots.id = $1
        ORDER BY proxy_bids.priority_at DESC NULLS LAST
        LIMIT 1
      `,
      [query.lotId, query.accountId],
    );
    const row = result.rows[0];
    if (row === undefined || !row.lot_exists) {
      return {
        activeProxyMaximum: null,
        contractVersion: 1,
        latest: null,
        lotId: query.lotId,
        status: "NONE",
      };
    }

    return {
      activeProxyMaximum:
        row.maximum_fils === null ? null : money(Number(row.maximum_fils)),
      contractVersion: 1,
      latest:
        row.sequence === null ||
        row.next_minimum_bid_fils === null ||
        row.closes_at === null
          ? null
          : {
              closesAt: row.closes_at.toISOString(),
              currentBid:
                row.current_bid_fils === null
                  ? null
                  : money(Number(row.current_bid_fils)),
              lotId: query.lotId,
              nextMinimumBid: money(Number(row.next_minimum_bid_fils)),
              sequence: row.sequence,
            },
      lotId: query.lotId,
      status: row.maximum_fils === null ? "NONE" : "ACTIVE",
    };
  }

  async rejectProxyCancellation(
    command: CancelProxyBidCommand,
  ): Promise<CancelProxyBidAck> {
    const proxyStatus = await this.getActiveProxyBid(command);
    return {
      commandId: command.commandId,
      contractVersion: 1,
      correlationId: command.correlationId,
      error: {
        code: "VALIDATION_FAILED",
        message: "Proxy cancellation is not supported for live MVP lots.",
        retryable: false,
      },
      ...(proxyStatus.latest === null ? {} : { latest: proxyStatus.latest }),
      serverTime: new Date().toISOString(),
      status: "REJECTED",
    };
  }

  private async findSavedCommand<TAck extends PlaceBidAck | SetProxyBidAck>(
    client: PoolClient,
    command: PlaceManualBidCommand | SetProxyBidCommand,
  ): Promise<TAck | null> {
    const result = await client.query<SavedCommandRow>(
      `
        SELECT result_payload
        FROM bid_commands
        WHERE account_id = $1 AND command_id = $2
      `,
      [command.accountId, command.commandId],
    );
    return (result.rows[0]?.result_payload as TAck | undefined) ?? null;
  }

  private async lockLot(
    client: PoolClient,
    lotId: string,
  ): Promise<LotForUpdateRow | null> {
    const result = await client.query<LotForUpdateRow>(
      `
        SELECT
          lots.auction_id::text,
          lots.closes_at,
          lots.current_bid_fils::text,
          lots.lifecycle,
          lots.minimum_increment_fils::text,
          lots.next_minimum_bid_fils::text,
          lots.reserve_price_fils::text,
          lots.reserve_status,
          lots.sequence,
          lots.soft_close_extension_count,
          (
            SELECT bid_ledger.account_id::text
            FROM bid_ledger
            WHERE bid_ledger.lot_id = lots.id
            ORDER BY bid_ledger.sequence DESC
            LIMIT 1
          ) AS leading_account_id,
          auctions.soft_close_enabled,
          auctions.soft_close_window_ms AS auction_soft_close_window_ms,
          auctions.soft_close_extension_ms AS auction_soft_close_extension_ms,
          auctions.soft_close_maximum_extensions AS auction_soft_close_maximum_extensions,
          lots.soft_close_window_ms AS lot_soft_close_window_ms,
          lots.soft_close_extension_ms AS lot_soft_close_extension_ms,
          lots.soft_close_maximum_extensions AS lot_soft_close_maximum_extensions
        FROM lots
        INNER JOIN auctions ON auctions.id = lots.auction_id
        WHERE lots.id = $1
        FOR UPDATE OF lots
      `,
      [lotId],
    );
    return result.rows[0] ?? null;
  }

  private async loadEligibility(
    client: PoolClient,
    command: PlaceManualBidCommand | SetProxyBidCommand,
  ): Promise<EligibilityRow> {
    const result = await client.query<EligibilityRow>(
      `
        SELECT
          EXISTS (
            SELECT 1 FROM accounts
            WHERE id = $1 AND status = 'ACTIVE'
          ) AS account_active,
          EXISTS (
            SELECT 1 FROM accounts
            WHERE id = $1 AND kyc_status = 'VERIFIED'
          ) AS kyc_verified,
          EXISTS (
            SELECT 1 FROM terms_acceptances
            WHERE account_id = $1 AND terms_version_id = $2
          ) AS terms_accepted,
          COALESCE((
            SELECT SUM(
              CASE
                WHEN direction = 'CREDIT' THEN amount_fils
                ELSE -amount_fils
              END
            ) > 0
            FROM deposit_ledger
            WHERE account_id = $1
              AND (lot_id IS NULL OR lot_id = $3)
          ), false) AS deposit_eligible
      `,
      [command.accountId, command.input.termsVersionId, command.lotId],
    );
    return (
      result.rows[0] ?? {
        account_active: false,
        deposit_eligible: false,
        kyc_verified: false,
        terms_accepted: false,
      }
    );
  }

  private async findActiveProxy(
    client: PoolClient,
    command: SetProxyBidCommand,
  ): Promise<ActiveProxyRow | null> {
    const result = await client.query<ActiveProxyRow>(
      `
        SELECT maximum_fils::text
        FROM proxy_bids
        WHERE lot_id = $1
          AND account_id = $2
          AND status = 'ACTIVE'
        ORDER BY priority_at DESC
        LIMIT 1
      `,
      [command.lotId, command.accountId],
    );
    return result.rows[0] ?? null;
  }

  private async loadActiveProxies(
    client: PoolClient,
    lotId: string,
  ): Promise<readonly ActiveProxyRow[]> {
    const result = await client.query<ActiveProxyRow>(
      `
        SELECT account_id::text, maximum_fils::text, priority_at AS registered_at
        FROM proxy_bids
        WHERE lot_id = $1
          AND status = 'ACTIVE'
        ORDER BY maximum_fils DESC, registered_at ASC, id ASC
      `,
      [lotId],
    );
    return result.rows;
  }

  private async resolveProxyResponseToManualBid(
    client: PoolClient,
    command: PlaceManualBidCommand,
    originalLot: LotBidState,
    manualResult: AcceptedBidResult,
    serverTime: Date,
  ): Promise<VisibleBid | null> {
    const proxies = await this.loadActiveProxies(client, command.lotId);
    const competingProxy = proxies.find(
      (proxy) =>
        proxy.account_id !== command.accountId &&
        Number(proxy.maximum_fils) >= manualResult.nextMinimumBidFils,
    );
    if (competingProxy === undefined) {
      return null;
    }

    const proxyDecision = evaluateManualBid({
      amountFils: manualResult.nextMinimumBidFils,
      depositEligible: true,
      lot: lotStateAfter(originalLot, manualResult),
      serverTime,
      termsAccepted: true,
    });
    if (proxyDecision.status === "REJECTED") {
      throw new Error(`proxy response rejected: ${proxyDecision.errorCode}`);
    }
    return {
      activeProxyMaximumFils: Number(competingProxy.maximum_fils),
      accountId: competingProxy.account_id,
      bidKind: "PROXY",
      result: proxyDecision.result,
    };
  }

  private async resolveProxyLeaderboard(
    client: PoolClient,
    command: SetProxyBidCommand,
    lot: LotBidState,
    serverTime: Date,
  ): Promise<VisibleBid | null> {
    const proxies = await this.loadActiveProxies(client, command.lotId);
    const winner = proxies[0];
    if (winner === undefined) {
      return null;
    }

    const runner = proxies.find(
      (proxy) => proxy.account_id !== winner.account_id,
    );
    const runnerMaxFils =
      runner === undefined ? null : Number(runner.maximum_fils);
    const winnerMaxFils = Number(winner.maximum_fils);
    const amountFils =
      runnerMaxFils === null
        ? lot.nextMinimumBidFils
        : Math.min(
            winnerMaxFils,
            Math.max(
              lot.nextMinimumBidFils,
              runnerMaxFils + lot.minimumIncrementFils,
            ),
          );

    const decision = evaluateManualBid({
      amountFils,
      depositEligible: true,
      lot,
      serverTime,
      termsAccepted: true,
    });
    if (decision.status === "REJECTED") {
      throw new Error(`proxy leaderboard bid rejected: ${decision.errorCode}`);
    }
    return {
      activeProxyMaximumFils: Number(winner.maximum_fils),
      accountId: winner.account_id,
      bidKind: "PROXY",
      result: decision.result,
    };
  }

  private async upsertProxyBid(
    client: PoolClient,
    command: SetProxyBidCommand,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO proxy_bids (
          lot_id,
          account_id,
          maximum_fils,
          status,
          command_id,
          correlation_id
        )
        VALUES ($1, $2, $3, 'ACTIVE', $4, $5)
        ON CONFLICT (lot_id, account_id)
        DO UPDATE SET
          maximum_fils = EXCLUDED.maximum_fils,
          status = 'ACTIVE',
          command_id = EXCLUDED.command_id,
          correlation_id = EXCLUDED.correlation_id,
          priority_at = now(),
          updated_at = now()
      `,
      [
        command.lotId,
        command.accountId,
        command.input.maximumFils,
        command.commandId,
        command.correlationId,
      ],
    );
  }

  private async appendAcceptedBid(
    client: PoolClient,
    command: PlaceManualBidCommand | SetProxyBidCommand,
    lot: LotForUpdateRow,
    result: Extract<
      ReturnType<typeof evaluateManualBid>,
      { status: "ACCEPTED" }
    >["result"],
    serverTime: Date,
    bidKind: "MANUAL" | "PROXY" = "MANUAL",
    accountId: string = command.accountId,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO bid_ledger (
          lot_id,
          auction_id,
          account_id,
          command_id,
          sequence,
          bid_kind,
          amount_fils,
          reserve_status,
          accepted_at,
          correlation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        command.lotId,
        lot.auction_id,
        accountId,
        command.commandId,
        result.sequence,
        bidKind,
        result.amountFils,
        result.reserveStatus,
        serverTime,
        command.correlationId,
      ],
    );
  }

  private async updateLot(
    client: PoolClient,
    lotId: string,
    result: Extract<
      ReturnType<typeof evaluateManualBid>,
      { status: "ACCEPTED" }
    >["result"],
    bidCountIncrement = 1,
  ): Promise<void> {
    await client.query(
      `
        UPDATE lots
        SET
          current_bid_fils = $2,
          next_minimum_bid_fils = $3,
          reserve_status = $4,
          closes_at = $5,
          sequence = $6,
          bid_count = bid_count + $8,
          soft_close_extension_count = $7,
          updated_at = now()
        WHERE id = $1
      `,
      [
        lotId,
        result.amountFils,
        result.nextMinimumBidFils,
        result.reserveStatus,
        result.closesAt,
        result.sequence,
        result.extensionCount,
        bidCountIncrement,
      ],
    );
  }

  private async writeOutbox(
    client: PoolClient,
    command: PlaceManualBidCommand | SetProxyBidCommand,
    lot: LotForUpdateRow,
    result: Extract<
      ReturnType<typeof evaluateManualBid>,
      { status: "ACCEPTED" }
    >["result"],
    serverTime: Date,
    bidKind: "MANUAL" | "PROXY" = "MANUAL",
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO outbox_events (
          aggregate_type,
          aggregate_id,
          event_name,
          payload,
          correlation_id,
          occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        "lot",
        command.lotId,
        "bid:accepted",
        {
          amount: money(result.amountFils),
          auctionId: lot.auction_id,
          bidKind,
          currentBid: money(result.amountFils),
          event: "bid:accepted",
          extended: result.extended,
          lotId: command.lotId,
          nextMinimumBid: money(result.nextMinimumBidFils),
          reserveStatus: result.reserveStatus,
          sequence: result.sequence,
        },
        command.correlationId,
        serverTime,
      ],
    );
  }

  private async writePersonalBidStatusOutbox(
    client: PoolClient,
    accountId: string,
    command: PlaceManualBidCommand | SetProxyBidCommand,
    lot: LotForUpdateRow,
    result: AcceptedBidResult | null,
    status: "NOT_BIDDING" | "WINNING" | "OUTBID",
    serverTime: Date,
    activeProxyMaximumFils: number | null = null,
  ): Promise<void> {
    const currentBidFils =
      result?.amountFils ??
      (lot.current_bid_fils === null ? null : Number(lot.current_bid_fils));
    const nextMinimumBidFils =
      result?.nextMinimumBidFils ?? Number(lot.next_minimum_bid_fils);
    const closesAt = result?.closesAt ?? lot.closes_at;
    const lotSequence = result?.sequence ?? lot.sequence;
    const eventId = randomUUID();

    await client.query(
      `
        INSERT INTO outbox_events (
          aggregate_type,
          aggregate_id,
          event_name,
          payload,
          correlation_id,
          occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        "account",
        accountId,
        "bid:status-changed",
        {
          contractVersion: 1,
          correlationId: command.correlationId,
          data: {
            activeProxyMaximum:
              activeProxyMaximumFils === null
                ? null
                : money(activeProxyMaximumFils),
            auctionId: lot.auction_id,
            closesAt: closesAt.toISOString(),
            currentBid: currentBidFils === null ? null : money(currentBidFils),
            lotId: command.lotId,
            lotSequence,
            nextMinimumBid: money(nextMinimumBidFils),
            status,
          },
          event: "bid:status-changed",
          eventId,
          occurredAt: serverTime.toISOString(),
        },
        command.correlationId,
        serverTime,
      ],
    );
  }

  private async writePreviousLeaderOutbidStatusOutbox(
    client: PoolClient,
    previousLeaderAccountId: string | null,
    currentLeaderAccountId: string,
    command: PlaceManualBidCommand | SetProxyBidCommand,
    lot: LotForUpdateRow,
    result: AcceptedBidResult,
    serverTime: Date,
  ): Promise<void> {
    if (
      previousLeaderAccountId === null ||
      previousLeaderAccountId === currentLeaderAccountId ||
      previousLeaderAccountId === command.accountId
    ) {
      return;
    }
    await this.writePersonalBidStatusOutbox(
      client,
      previousLeaderAccountId,
      command,
      lot,
      result,
      "OUTBID",
      serverTime,
    );
  }

  private async saveCommand(
    client: PoolClient,
    command: PlaceManualBidCommand | SetProxyBidCommand,
    commandType: "PLACE_MANUAL_BID" | "SET_PROXY_BID",
    ack: PlaceBidAck | SetProxyBidAck,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO bid_commands (
          command_id,
          account_id,
          lot_id,
          command_type,
          request_payload,
          result_payload,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        command.commandId,
        command.accountId,
        command.lotId,
        commandType,
        command.input,
        ack,
        ack.status,
      ],
    );
  }

  private rejectProxy(
    command: SetProxyBidCommand,
    serverTime: Date,
    code: string,
    retryable: boolean,
    latest?: BidLatestState,
  ): SetProxyBidAck {
    const ack: SetProxyBidAck = {
      commandId: command.commandId,
      contractVersion: 1,
      correlationId: command.correlationId,
      error: {
        code,
        message: code,
        retryable,
      },
      serverTime: serverTime.toISOString(),
      status: "REJECTED",
    };
    return latest === undefined ? ack : { ...ack, latest };
  }

  private reject(
    command: PlaceManualBidCommand,
    serverTime: Date,
    code: string,
    retryable: boolean,
    latest?: BidLatestState,
  ): PlaceBidAck {
    const ack: PlaceBidAck = {
      commandId: command.commandId,
      contractVersion: 1,
      correlationId: command.correlationId,
      error: {
        code,
        message: code,
        retryable,
      },
      serverTime: serverTime.toISOString(),
      status: "REJECTED",
    };
    return latest === undefined ? ack : { ...ack, latest };
  }
}

function toLotBidState(row: LotForUpdateRow): LotBidState {
  return {
    closesAt: row.closes_at,
    currentBidFils:
      row.current_bid_fils === null ? null : Number(row.current_bid_fils),
    lifecycle: row.lifecycle,
    minimumIncrementFils: Number(row.minimum_increment_fils),
    nextMinimumBidFils: Number(row.next_minimum_bid_fils),
    reservePriceFils:
      row.reserve_price_fils === null ? null : Number(row.reserve_price_fils),
    reserveStatus: row.reserve_status,
    sequence: row.sequence,
    softClose: {
      enabled: row.soft_close_enabled,
      extensionCount: row.soft_close_extension_count,
      extensionMs:
        row.lot_soft_close_extension_ms ?? row.auction_soft_close_extension_ms,
      maximumExtensions:
        row.lot_soft_close_maximum_extensions ??
        row.auction_soft_close_maximum_extensions,
      windowMs:
        row.lot_soft_close_window_ms ?? row.auction_soft_close_window_ms,
    },
  };
}

function latestFromLot(lotId: string, lot: LotBidState): BidLatestState {
  return {
    closesAt: lot.closesAt.toISOString(),
    currentBid: lot.currentBidFils === null ? null : money(lot.currentBidFils),
    lotId,
    nextMinimumBid: money(lot.nextMinimumBidFils),
    sequence: lot.sequence,
  };
}

function lotStateAfter(
  lot: LotBidState,
  result: AcceptedBidResult,
): LotBidState {
  return {
    ...lot,
    closesAt: result.closesAt,
    currentBidFils: result.amountFils,
    nextMinimumBidFils: result.nextMinimumBidFils,
    reserveStatus: result.reserveStatus,
    sequence: result.sequence,
    softClose: {
      ...lot.softClose,
      extensionCount: result.extensionCount,
    },
  };
}
