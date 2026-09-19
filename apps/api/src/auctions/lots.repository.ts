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

  async search(
    query: {
      category?: string;
      limit?: number;
      maxPriceFils?: number;
      minPriceFils?: number;
      offset?: number;
      q?: string;
      sort?: "ending_soon" | "price_asc" | "price_desc" | "newest" | "most_bids";
      status?: string;
    },
  ): Promise<{ items: AdminLotView[]; total: number }> {
    if (process.env.PIONEER_ADMIN_DUMMY_LOTS === "1") {
      let lots = dummyAdminLots.filter((l) => l.lifecycle !== "DRAFT");
      if (query.q) {
        const qLower = query.q.toLowerCase();
        lots = lots.filter(
          (l) =>
            l.titleEn.toLowerCase().includes(qLower) ||
            l.titleAr.toLowerCase().includes(qLower) ||
            l.lotNumber.toLowerCase().includes(qLower),
        );
      }
      if (query.status) {
        lots = lots.filter((l) => l.lifecycle === query.status);
      }
      if (query.minPriceFils !== undefined) {
        lots = lots.filter(
          (l) => (l.currentBidFils ?? l.startingBidFils) >= query.minPriceFils!,
        );
      }
      if (query.maxPriceFils !== undefined) {
        lots = lots.filter(
          (l) => (l.currentBidFils ?? l.startingBidFils) <= query.maxPriceFils!,
        );
      }
      if (query.sort === "price_asc") {
        lots.sort(
          (a, b) =>
            (a.currentBidFils ?? a.startingBidFils) -
            (b.currentBidFils ?? b.startingBidFils),
        );
      } else if (query.sort === "price_desc") {
        lots.sort(
          (a, b) =>
            (b.currentBidFils ?? b.startingBidFils) -
            (a.currentBidFils ?? a.startingBidFils),
        );
      } else if (query.sort === "newest") {
        lots.sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        );
      } else {
        lots.sort(
          (a, b) =>
            new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime(),
        );
      }
      const total = lots.length;
      const offset = query.offset ?? 0;
      const limit = query.limit ?? 50;
      const paged = lots.slice(offset, offset + limit);
      return { items: paged, total };
    }

    const conditions: string[] = ["lifecycle != 'DRAFT'"];
    const params: unknown[] = [];

    if (query.q) {
      params.push(`%${query.q}%`);
      conditions.push(
        `(title_en ILIKE $${params.length} OR title_ar ILIKE $${params.length} OR lot_number ILIKE $${params.length})`,
      );
    }

    if (query.status) {
      params.push(query.status);
      conditions.push(`lifecycle = $${params.length}`);
    }

    if (query.minPriceFils !== undefined) {
      params.push(query.minPriceFils);
      conditions.push(
        `COALESCE(current_bid_fils, starting_bid_fils) >= $${params.length}`,
      );
    }

    if (query.maxPriceFils !== undefined) {
      params.push(query.maxPriceFils);
      conditions.push(
        `COALESCE(current_bid_fils, starting_bid_fils) <= $${params.length}`,
      );
    }

    let orderBy = "closes_at ASC, id ASC";
    if (query.sort === "price_asc") {
      orderBy = "COALESCE(current_bid_fils, starting_bid_fils) ASC, id ASC";
    } else if (query.sort === "price_desc") {
      orderBy = "COALESCE(current_bid_fils, starting_bid_fils) DESC, id ASC";
    } else if (query.sort === "newest") {
      orderBy = "starts_at DESC, id DESC";
    }

    const whereClause = conditions.join(" AND ");

    const countResult = await this.database.query<{ count: string }>(
      `SELECT count(*)::text FROM lots WHERE ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

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
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      params,
    );

    return {
      items: result.rows.map(toAdminLotView),
      total,
    };
  }

  async findById(id: string): Promise<AdminLotView | null> {
    if (process.env.PIONEER_ADMIN_DUMMY_LOTS === "1") {
      return dummyAdminLots.find((lot) => lot.id === id) ?? null;
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
        WHERE id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? null : toAdminLotView(row);
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
