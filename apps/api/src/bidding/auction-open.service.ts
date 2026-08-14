import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";

interface DueLotRow extends QueryResultRow {
  readonly id: string;
}

interface LockedOpenLotRow extends QueryResultRow {
  readonly auction_id: string;
  readonly lifecycle: "DRAFT" | "LIVE" | "PAUSED" | "CLOSED";
  readonly sequence: number;
  readonly starts_at: Date;
}

export interface OpenLotResult {
  readonly lifecycle?: "LIVE";
  readonly lotId: string;
  readonly opened: boolean;
  readonly sequence?: number;
}

/**
 * Symmetric counterpart to `AuctionCloseService`: transitions a lot (and,
 * best-effort, its parent auction) from `DRAFT` to `LIVE` once `starts_at`
 * is reached. Only the lot's own lifecycle gates bid placement
 * (`bid-decision.ts` never reads the auction's lifecycle), so the parent
 * auction update is a display convenience for the admin UI, not a
 * correctness dependency -- it's skipped silently if the auction was
 * already moved out of `DRAFT` by an explicit admin action.
 */
@Injectable()
export class AuctionOpenService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async openDueLots(limit = 50, serverTime = new Date()): Promise<number> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const dueLots = await client.query<DueLotRow>(
        `
          SELECT id::text
          FROM lots
          WHERE lifecycle = 'DRAFT'
            AND starts_at <= $1
          ORDER BY starts_at ASC, id ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        `,
        [serverTime, limit],
      );
      await client.query("COMMIT");

      let openedCount = 0;
      for (const lot of dueLots.rows) {
        const result = await this.openLot(lot.id, serverTime);
        if (result.opened) {
          openedCount += 1;
        }
      }
      return openedCount;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async openLot(
    lotId: string,
    serverTime = new Date(),
  ): Promise<OpenLotResult> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const lot = await this.lockLotForOpen(client, lotId);
      if (lot === null) {
        await client.query("COMMIT");
        return { lotId, opened: false };
      }
      if (
        lot.lifecycle !== "DRAFT" ||
        serverTime.getTime() < lot.starts_at.getTime()
      ) {
        await client.query("COMMIT");
        return { lotId, opened: false };
      }

      const sequence = lot.sequence + 1;
      await client.query(
        `
          UPDATE lots
          SET
            lifecycle = 'LIVE',
            sequence = $2,
            updated_at = now()
          WHERE id = $1
        `,
        [lotId, sequence],
      );
      await this.openParentAuctionIfDraft(client, lot.auction_id);
      await this.writeStateChangedOutbox(
        client,
        lotId,
        lot,
        sequence,
        serverTime,
      );
      await client.query("COMMIT");
      return { lifecycle: "LIVE", lotId, opened: true, sequence };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockLotForOpen(
    client: PoolClient,
    lotId: string,
  ): Promise<LockedOpenLotRow | null> {
    const result = await client.query<LockedOpenLotRow>(
      `
        SELECT
          auction_id::text,
          lifecycle,
          sequence,
          starts_at
        FROM lots
        WHERE id = $1
        FOR UPDATE OF lots
      `,
      [lotId],
    );
    return result.rows[0] ?? null;
  }

  private async openParentAuctionIfDraft(
    client: PoolClient,
    auctionId: string,
  ): Promise<void> {
    await client.query(
      `
        UPDATE auctions
        SET lifecycle = 'LIVE', updated_at = now()
        WHERE id = $1 AND lifecycle = 'DRAFT'
      `,
      [auctionId],
    );
  }

  private async writeStateChangedOutbox(
    client: PoolClient,
    lotId: string,
    lot: LockedOpenLotRow,
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
          event: "auction:state-changed",
          lifecycle: "LIVE",
          lotId,
          previousLifecycle: lot.lifecycle,
          sequence,
          startsAt: lot.starts_at.toISOString(),
        },
        "open-worker",
        serverTime,
      ],
    );
  }
}
