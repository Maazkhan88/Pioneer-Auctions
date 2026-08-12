import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";

interface DueLotRow extends QueryResultRow {
  readonly id: string;
}

interface LockedCloseLotRow extends QueryResultRow {
  readonly auction_id: string;
  readonly closes_at: Date;
  readonly current_bid_fils: string | null;
  readonly lifecycle: "LIVE" | "PAUSED" | "CLOSED" | "PENDING_APPROVAL";
  readonly sequence: number;
}

export interface CloseLotResult {
  readonly closed: boolean;
  readonly lifecycle?: "CLOSED" | "PENDING_APPROVAL";
  readonly lotId: string;
  readonly sequence?: number;
}

@Injectable()
export class AuctionCloseService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async closeDueLots(limit = 50, serverTime = new Date()): Promise<number> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const dueLots = await client.query<DueLotRow>(
        `
          SELECT id::text
          FROM lots
          WHERE lifecycle = 'LIVE'
            AND closes_at <= $1
          ORDER BY closes_at ASC, id ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        `,
        [serverTime, limit],
      );
      await client.query("COMMIT");

      let closedCount = 0;
      for (const lot of dueLots.rows) {
        const result = await this.closeLot(lot.id, serverTime);
        if (result.closed) {
          closedCount += 1;
        }
      }
      return closedCount;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async closeLot(
    lotId: string,
    serverTime = new Date(),
  ): Promise<CloseLotResult> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const lot = await this.lockLotForClose(client, lotId);
      if (lot === null) {
        await client.query("COMMIT");
        return { closed: false, lotId };
      }
      if (
        lot.lifecycle !== "LIVE" ||
        serverTime.getTime() < lot.closes_at.getTime()
      ) {
        await client.query("COMMIT");
        return { closed: false, lotId };
      }

      const lifecycle =
        lot.current_bid_fils === null ? "CLOSED" : "PENDING_APPROVAL";
      const sequence = lot.sequence + 1;
      await client.query(
        `
          UPDATE lots
          SET
            lifecycle = $2,
            sequence = $3,
            updated_at = now()
          WHERE id = $1
        `,
        [lotId, lifecycle, sequence],
      );
      await this.writeStateChangedOutbox(
        client,
        lotId,
        lot,
        lifecycle,
        sequence,
        serverTime,
      );
      await client.query("COMMIT");
      return { closed: true, lifecycle, lotId, sequence };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockLotForClose(
    client: PoolClient,
    lotId: string,
  ): Promise<LockedCloseLotRow | null> {
    const result = await client.query<LockedCloseLotRow>(
      `
        SELECT
          auction_id::text,
          closes_at,
          current_bid_fils::text,
          lifecycle,
          sequence
        FROM lots
        WHERE id = $1
        FOR UPDATE OF lots
      `,
      [lotId],
    );
    return result.rows[0] ?? null;
  }

  private async writeStateChangedOutbox(
    client: PoolClient,
    lotId: string,
    lot: LockedCloseLotRow,
    lifecycle: "CLOSED" | "PENDING_APPROVAL",
    sequence: number,
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
        lotId,
        "auction:state-changed",
        {
          auctionId: lot.auction_id,
          closesAt: lot.closes_at.toISOString(),
          event: "auction:state-changed",
          lifecycle,
          lotId,
          previousLifecycle: lot.lifecycle,
          sequence,
        },
        "close-worker",
        serverTime,
      ],
    );
  }
}
