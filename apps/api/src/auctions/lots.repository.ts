import { Inject, Injectable } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";
import { dummyAdminLots } from "./dummy-lots.js";
import type {
  AdminLotView,
  CreateLotInput,
  UpdateLotInput,
} from "./lot.dto.js";

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
}

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
  readonly minimum_increment_percent_bps: number | null;
  readonly bid_increment_source: "PERCENT_OF_STARTING_PRICE" | "CUSTOM";
  readonly reserve_price_fils: string | null;
  readonly reserve_status: string;
  readonly sequence: number;
  readonly soft_close_extension_ms: number | null;
  readonly soft_close_maximum_extensions: number | null;
  readonly soft_close_window_ms: number | null;
}

@Injectable()
export class LotsRepository {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async create(input: CreateLotInput): Promise<AdminLotView> {
    return insertLot(this.database, input);
  }

  /**
   * Inserts every row in a single transaction: either all lots are created
   * or none are. Callers must have already validated every input (e.g. via
   * `validateCreateLotRow`) -- this method does not partially commit on a
   * later failure, matching the "bulk import cannot partially and silently
   * create invalid lots" requirement.
   */
  async createMany(inputs: readonly CreateLotInput[]): Promise<AdminLotView[]> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const created: AdminLotView[] = [];
      for (const input of inputs) {
        created.push(await insertLot(client, input));
      }
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(lotId: string, input: UpdateLotInput): Promise<AdminLotView> {
    const result = await this.database.query<LotRow>(
      `
        UPDATE lots
        SET
          lot_number = COALESCE($2, lot_number),
          title_en = COALESCE($3, title_en),
          title_ar = COALESCE($4, title_ar),
          starts_at = COALESCE($5, starts_at),
          closes_at = COALESCE($6, closes_at),
          soft_close_window_ms = COALESCE($7, soft_close_window_ms),
          soft_close_extension_ms = COALESCE($8, soft_close_extension_ms),
          soft_close_maximum_extensions = COALESCE($9, soft_close_maximum_extensions),
          updated_at = now()
        WHERE id = $1
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
          bid_increment_source,
          minimum_increment_percent_bps,
          reserve_price_fils::text,
          reserve_status,
          sequence,
          soft_close_window_ms,
          soft_close_extension_ms,
          soft_close_maximum_extensions
      `,
      [
        lotId,
        input.lotNumber ?? null,
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
      throw new Error("Lot update did not return a row");
    }
    return toAdminLotView(row);
  }

  async list(): Promise<AdminLotView[]> {
    if (process.env.PIONEER_ADMIN_DUMMY_LOTS === "1") {
      return [...dummyAdminLots];
    }

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
          bid_increment_source,
          minimum_increment_percent_bps,
          reserve_price_fils::text,
          reserve_status,
          sequence,
          soft_close_window_ms,
          soft_close_extension_ms,
          soft_close_maximum_extensions
        FROM lots
        ORDER BY starts_at DESC, id DESC
        LIMIT 100
      `,
    );
    return result.rows.map(toAdminLotView);
  }
}

async function insertLot(
  executor: QueryExecutor,
  input: CreateLotInput,
): Promise<AdminLotView> {
  const reserveStatus =
    input.reservePriceFils === null ? "NOT_APPLICABLE" : "NOT_MET";
  const result = await executor.query<LotRow>(
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
        bid_increment_source,
        minimum_increment_percent_bps,
        reserve_price_fils,
        reserve_status,
        soft_close_window_ms,
        soft_close_extension_ms,
        soft_close_maximum_extensions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        bid_increment_source,
        minimum_increment_percent_bps,
        reserve_price_fils::text,
        reserve_status,
        sequence,
        soft_close_window_ms,
        soft_close_extension_ms,
        soft_close_maximum_extensions
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
      input.minimumIncrementSource,
      input.minimumIncrementPercentBps,
      input.reservePriceFils,
      reserveStatus,
      input.softCloseWindowMs,
      input.softCloseExtensionMs,
      input.softCloseMaximumExtensions,
    ],
  );

  const row = result.rows[0];
  if (row === undefined) {
    throw new Error("Lot insert did not return a row");
  }
  return toAdminLotView(row);
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
    minimumIncrementPercentBps: row.minimum_increment_percent_bps,
    minimumIncrementSource: row.bid_increment_source,
    nextMinimumBidFils: Number(row.next_minimum_bid_fils),
    reservePriceFils:
      row.reserve_price_fils === null ? null : Number(row.reserve_price_fils),
    reserveStatus: row.reserve_status,
    sequence: row.sequence,
    softCloseExtensionMs: row.soft_close_extension_ms,
    softCloseMaximumExtensions: row.soft_close_maximum_extensions,
    softCloseWindowMs: row.soft_close_window_ms,
    startingBidFils: Number(row.starting_bid_fils),
    startsAt: row.starts_at.toISOString(),
    titleAr: row.title_ar,
    titleEn: row.title_en,
  };
}
