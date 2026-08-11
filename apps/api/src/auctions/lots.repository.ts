import { Inject, Injectable } from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";
import type { AdminLotView, CreateLotInput } from "./lot.dto.js";

interface LotRow {
  readonly id: string;
  readonly auction_id: string;
  readonly lot_number: string;
  readonly title_en: string;
  readonly title_ar: string;
  readonly lifecycle: string;
  readonly starts_at: Date;
  readonly closes_at: Date;
  readonly starting_bid_fils: string;
  readonly current_bid_fils: string | null;
  readonly next_minimum_bid_fils: string;
  readonly minimum_increment_fils: string;
  readonly reserve_price_fils: string | null;
  readonly reserve_status: string;
  readonly sequence: number;
}

@Injectable()
export class LotsRepository {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async create(input: CreateLotInput): Promise<AdminLotView> {
    const reserveStatus =
      input.reservePriceFils === null ? "NOT_APPLICABLE" : "NOT_MET";
    const result = await this.database.query<LotRow>(
      `
        INSERT INTO lots (
          auction_id,
          lot_number,
          title_en,
          title_ar,
          starts_at,
          closes_at,
          starting_bid_fils,
          next_minimum_bid_fils,
          minimum_increment_fils,
          reserve_price_fils,
          reserve_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
        RETURNING
          id::text,
          auction_id::text,
          lot_number,
          title_en,
          title_ar,
          lifecycle,
          starts_at,
          closes_at,
          starting_bid_fils::text,
          current_bid_fils::text,
          next_minimum_bid_fils::text,
          minimum_increment_fils::text,
          reserve_price_fils::text,
          reserve_status,
          sequence
      `,
      [
        input.auctionId,
        input.lotNumber,
        input.titleEn,
        input.titleAr,
        input.startsAt,
        input.closesAt,
        input.startingBidFils,
        input.minimumIncrementFils,
        input.reservePriceFils,
        reserveStatus,
      ],
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Lot insert did not return a row");
    }
    return toAdminLotView(row);
  }

  async list(): Promise<AdminLotView[]> {
    const result = await this.database.query<LotRow>(
      `
        SELECT
          id::text,
          auction_id::text,
          lot_number,
          title_en,
          title_ar,
          lifecycle,
          starts_at,
          closes_at,
          starting_bid_fils::text,
          current_bid_fils::text,
          next_minimum_bid_fils::text,
          minimum_increment_fils::text,
          reserve_price_fils::text,
          reserve_status,
          sequence
        FROM lots
        ORDER BY starts_at DESC, id DESC
        LIMIT 100
      `,
    );
    return result.rows.map(toAdminLotView);
  }
}

function toAdminLotView(row: LotRow): AdminLotView {
  return {
    auctionId: row.auction_id,
    closesAt: row.closes_at.toISOString(),
    currentBidFils:
      row.current_bid_fils === null ? null : Number(row.current_bid_fils),
    id: row.id,
    lifecycle: row.lifecycle,
    lotNumber: row.lot_number,
    minimumIncrementFils: Number(row.minimum_increment_fils),
    nextMinimumBidFils: Number(row.next_minimum_bid_fils),
    reservePriceFils:
      row.reserve_price_fils === null ? null : Number(row.reserve_price_fils),
    reserveStatus: row.reserve_status,
    sequence: row.sequence,
    startingBidFils: Number(row.starting_bid_fils),
    startsAt: row.starts_at.toISOString(),
    titleAr: row.title_ar,
    titleEn: row.title_en,
  };
}
