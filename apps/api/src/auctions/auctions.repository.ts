import { Inject, Injectable } from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";
import type {
  AdminAuctionControlResult,
  AdminAuctionView,
  CreateAuctionInput,
  UpdateAuctionInput,
} from "./auction.dto.js";

interface AuctionRow {
  readonly id: string;
  readonly title_en: string;
  readonly title_ar: string;
  readonly lifecycle: string;
  readonly starts_at: Date;
  readonly closes_at: Date;
}

@Injectable()
export class AuctionsRepository {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async create(input: CreateAuctionInput): Promise<AdminAuctionView> {
    const result = await this.database.query<AuctionRow>(
      `
        INSERT INTO auctions (title_en, title_ar, starts_at, closes_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id::text, title_en, title_ar, lifecycle, starts_at, closes_at
      `,
      [input.titleEn, input.titleAr, input.startsAt, input.closesAt],
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Auction insert did not return a row");
    }
    return toAdminAuctionView(row);
  }

  async update(
    auctionId: string,
    input: UpdateAuctionInput,
  ): Promise<AdminAuctionView> {
    const result = await this.database.query<AuctionRow>(
      `
        UPDATE auctions
        SET
          title_en = COALESCE($2, title_en),
          title_ar = COALESCE($3, title_ar),
          starts_at = COALESCE($4, starts_at),
          closes_at = COALESCE($5, closes_at),
          soft_close_window_ms = COALESCE($6, soft_close_window_ms),
          soft_close_extension_ms = COALESCE($7, soft_close_extension_ms),
          soft_close_maximum_extensions = COALESCE($8, soft_close_maximum_extensions),
          updated_at = now()
        WHERE id = $1
        RETURNING id::text, title_en, title_ar, lifecycle, starts_at, closes_at
      `,
      [
        auctionId,
        input.titleEn ?? null,
        input.titleAr ?? null,
        input.startsAt ?? null,
        input.closesAt ?? null,
        input.softCloseWindowMs ?? null,
        input.softCloseExtensionMs ?? null,
        input.softCloseMaximumExtensions ?? null,
      ],
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Auction update did not return a row");
    }
    return toAdminAuctionView(row);
  }

  async list(): Promise<AdminAuctionView[]> {
    const result = await this.database.query<AuctionRow>(
      `
        SELECT id::text, title_en, title_ar, lifecycle, starts_at, closes_at
        FROM auctions
        ORDER BY starts_at DESC, id DESC
        LIMIT 100
      `,
    );
    return result.rows.map(toAdminAuctionView);
  }

  async cancel(auctionId: string): Promise<AdminAuctionControlResult> {
    return this.transition(auctionId, "CANCELLED", [
      "CLOSING",
      "DRAFT",
      "LIVE",
      "PAUSED",
      "SCHEDULED",
    ]);
  }

  async pause(auctionId: string): Promise<AdminAuctionControlResult> {
    return this.transition(auctionId, "PAUSED", ["LIVE"]);
  }

  async resume(auctionId: string): Promise<AdminAuctionControlResult> {
    return this.transition(auctionId, "LIVE", ["PAUSED"], "RESUMED");
  }

  private async transition(
    auctionId: string,
    lifecycle: string,
    allowedFrom: readonly string[],
    decision: AdminAuctionControlResult["decision"] = lifecycle as AdminAuctionControlResult["decision"],
  ): Promise<AdminAuctionControlResult> {
    const result = await this.database.query<{
      readonly id: string;
      readonly lifecycle: string;
      readonly updated_at: Date;
    }>(
      `
        UPDATE auctions
        SET lifecycle = $2, updated_at = now()
        WHERE id = $1 AND lifecycle::text = ANY($3::text[])
        RETURNING id::text, lifecycle, updated_at
      `,
      [auctionId, lifecycle, allowedFrom],
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Auction transition did not return a row");
    }

    return {
      auctionId: row.id,
      contractVersion: 1,
      decidedAt: row.updated_at.toISOString(),
      decision,
      lifecycle: row.lifecycle,
    };
  }
}

function toAdminAuctionView(row: AuctionRow): AdminAuctionView {
  return {
    closesAt: row.closes_at.toISOString(),
    id: row.id,
    lifecycle: row.lifecycle,
    startsAt: row.starts_at.toISOString(),
    titleAr: row.title_ar,
    titleEn: row.title_en,
  };
}
