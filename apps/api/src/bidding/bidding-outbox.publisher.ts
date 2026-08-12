import { Inject, Injectable } from "@nestjs/common";
import type { Server } from "socket.io";
import type { PoolClient, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";

interface OutboxRow extends QueryResultRow {
  readonly aggregate_id: string;
  readonly aggregate_type: "account" | "lot";
  readonly event_name: string;
  readonly id: string;
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class BiddingOutboxPublisher {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async publishPendingEvents(
    server: Pick<Server, "to">,
    batchSize = 100,
  ): Promise<number> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const rows = await this.claimUnpublishedEvents(client, batchSize);

      for (const row of rows) {
        const room =
          row.aggregate_type === "account"
            ? `user:${row.aggregate_id}`
            : `lot:${row.aggregate_id}`;
        server.to(room).emit(row.event_name, row.payload);
      }

      if (rows.length > 0) {
        await client.query(
          `
            UPDATE outbox_events
            SET published_at = now()
            WHERE id = ANY($1::uuid[])
          `,
          [rows.map((row) => row.id)],
        );
      }

      await client.query("COMMIT");
      return rows.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async publishPendingLotEvents(
    server: Pick<Server, "to">,
    batchSize = 100,
  ): Promise<number> {
    return this.publishPendingEvents(server, batchSize);
  }

  private async claimUnpublishedEvents(
    client: PoolClient,
    batchSize: number,
  ): Promise<readonly OutboxRow[]> {
    const result = await client.query<OutboxRow>(
      `
        SELECT
          id::text,
          aggregate_type,
          aggregate_id::text,
          event_name,
          payload
        FROM outbox_events
        WHERE aggregate_type IN ('lot', 'account')
          AND published_at IS NULL
        ORDER BY occurred_at ASC, id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [batchSize],
    );
    return result.rows;
  }
}
