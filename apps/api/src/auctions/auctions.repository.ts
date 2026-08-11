import { Inject, Injectable } from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";
import type { AdminAuctionView, CreateAuctionInput } from "./auction.dto.js";

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
