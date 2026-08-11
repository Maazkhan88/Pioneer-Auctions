import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";
import {
  money,
  type BidLatestState,
  type PlaceBidAck,
  type PlaceBidInput,
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

interface SavedCommandRow extends QueryResultRow {
  readonly result_payload: PlaceBidAck;
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
}

interface EligibilityRow extends QueryResultRow {
  readonly account_active: boolean;
  readonly deposit_eligible: boolean;
  readonly kyc_verified: boolean;
  readonly terms_accepted: boolean;
}

@Injectable()
export class BiddingService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async placeManualBid(command: PlaceManualBidCommand): Promise<PlaceBidAck> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await this.findSavedCommand(client, command);
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
        await this.saveCommand(client, command, rejected);
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
        await this.saveCommand(client, command, rejected);
        await client.query("COMMIT");
        return rejected;
      }

      await this.appendAcceptedBid(
        client,
        command,
        lotRow,
        decision.result,
        serverTime,
      );
      await this.updateLot(client, command.lotId, decision.result);
      await this.writeOutbox(
        client,
        command,
        lotRow,
        decision.result,
        serverTime,
      );

      const accepted: PlaceBidAck = {
        commandId: command.commandId,
        contractVersion: 1,
        correlationId: command.correlationId,
        result: {
          closesAt: decision.result.closesAt.toISOString(),
          currentBid: money(decision.result.amountFils),
          extended: decision.result.extended,
          lotId: command.lotId,
          myBidStatus: "WINNING",
          nextMinimumBid: money(decision.result.nextMinimumBidFils),
          reserveStatus: decision.result.reserveStatus,
          sequence: decision.result.sequence,
        },
        serverTime: serverTime.toISOString(),
        status: "ACCEPTED",
      };

      await this.saveCommand(client, command, accepted);
      await client.query("COMMIT");
      return accepted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async findSavedCommand(
    client: PoolClient,
    command: PlaceManualBidCommand,
  ): Promise<PlaceBidAck | null> {
    const result = await client.query<SavedCommandRow>(
      `
        SELECT result_payload
        FROM bid_commands
        WHERE account_id = $1 AND command_id = $2
      `,
      [command.accountId, command.commandId],
    );
    return result.rows[0]?.result_payload ?? null;
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
    command: PlaceManualBidCommand,
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

  private async appendAcceptedBid(
    client: PoolClient,
    command: PlaceManualBidCommand,
    lot: LotForUpdateRow,
    result: Extract<
      ReturnType<typeof evaluateManualBid>,
      { status: "ACCEPTED" }
    >["result"],
    serverTime: Date,
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
        VALUES ($1, $2, $3, $4, $5, 'MANUAL', $6, $7, $8, $9)
      `,
      [
        command.lotId,
        lot.auction_id,
        command.accountId,
        command.commandId,
        result.sequence,
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
          bid_count = bid_count + 1,
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
      ],
    );
  }

  private async writeOutbox(
    client: PoolClient,
    command: PlaceManualBidCommand,
    lot: LotForUpdateRow,
    result: Extract<
      ReturnType<typeof evaluateManualBid>,
      { status: "ACCEPTED" }
    >["result"],
    serverTime: Date,
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
          bidKind: "MANUAL",
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

  private async saveCommand(
    client: PoolClient,
    command: PlaceManualBidCommand,
    ack: PlaceBidAck,
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
        VALUES ($1, $2, $3, 'PLACE_MANUAL_BID', $4, $5, $6)
      `,
      [
        command.commandId,
        command.accountId,
        command.lotId,
        command.input,
        ack,
        ack.status,
      ],
    );
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
