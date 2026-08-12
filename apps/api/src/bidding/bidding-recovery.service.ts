import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";
import { money, type Money } from "./bid.dto.js";
import type { LotBidLifecycle, ReserveStatus } from "./bid-decision.js";

export interface RebuiltLotState {
  readonly activeProxyCount: number;
  readonly auctionId: string;
  readonly bidCount: number;
  readonly closesAt: string;
  readonly currentBid: Money | null;
  readonly leadingAccountId: string | null;
  readonly lifecycle: LotBidLifecycle;
  readonly lotId: string;
  readonly nextMinimumBid: Money;
  readonly reserveStatus: ReserveStatus;
  readonly sequence: number;
}

export interface DerivedLotStateStore {
  setLotState(state: RebuiltLotState): Promise<void>;
}

interface RebuiltLotStateRow extends QueryResultRow {
  readonly active_proxy_count: string;
  readonly auction_id: string;
  readonly bid_count: number;
  readonly closes_at: Date;
  readonly current_bid_fils: string | null;
  readonly leading_account_id: string | null;
  readonly lifecycle: LotBidLifecycle;
  readonly lot_id: string;
  readonly next_minimum_bid_fils: string;
  readonly reserve_status: ReserveStatus;
  readonly sequence: number;
}

@Injectable()
export class BiddingRecoveryService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async rebuildLotState(lotId: string): Promise<RebuiltLotState | null> {
    const result = await this.database.query<RebuiltLotStateRow>(
      `
        SELECT
          lots.id::text AS lot_id,
          lots.auction_id::text AS auction_id,
          lots.bid_count,
          lots.closes_at,
          lots.current_bid_fils::text,
          lots.lifecycle,
          lots.next_minimum_bid_fils::text,
          lots.reserve_status,
          lots.sequence,
          latest_bid.account_id::text AS leading_account_id,
          COALESCE(active_proxies.active_proxy_count, 0)::text AS active_proxy_count
        FROM lots
        LEFT JOIN LATERAL (
          SELECT bid_ledger.account_id
          FROM bid_ledger
          WHERE bid_ledger.lot_id = lots.id
          ORDER BY bid_ledger.sequence DESC
          LIMIT 1
        ) latest_bid ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS active_proxy_count
          FROM proxy_bids
          WHERE proxy_bids.lot_id = lots.id
            AND proxy_bids.status = 'ACTIVE'
        ) active_proxies ON TRUE
        WHERE lots.id = $1
      `,
      [lotId],
    );
    const row = result.rows[0];
    return row === undefined ? null : rebuiltLotStateFromRow(row);
  }

  async rebuildRecoverableLotStates(limit = 500): Promise<RebuiltLotState[]> {
    const result = await this.database.query<RebuiltLotStateRow>(
      `
        SELECT
          lots.id::text AS lot_id,
          lots.auction_id::text AS auction_id,
          lots.bid_count,
          lots.closes_at,
          lots.current_bid_fils::text,
          lots.lifecycle,
          lots.next_minimum_bid_fils::text,
          lots.reserve_status,
          lots.sequence,
          latest_bid.account_id::text AS leading_account_id,
          COALESCE(active_proxies.active_proxy_count, 0)::text AS active_proxy_count
        FROM lots
        LEFT JOIN LATERAL (
          SELECT bid_ledger.account_id
          FROM bid_ledger
          WHERE bid_ledger.lot_id = lots.id
          ORDER BY bid_ledger.sequence DESC
          LIMIT 1
        ) latest_bid ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS active_proxy_count
          FROM proxy_bids
          WHERE proxy_bids.lot_id = lots.id
            AND proxy_bids.status = 'ACTIVE'
        ) active_proxies ON TRUE
        WHERE lots.lifecycle <> 'DRAFT'
        ORDER BY lots.updated_at DESC
        LIMIT $1
      `,
      [limit],
    );
    return result.rows.map(rebuiltLotStateFromRow);
  }

  async rebuildLotStateIntoStore(
    lotId: string,
    store: DerivedLotStateStore,
  ): Promise<RebuiltLotState | null> {
    const state = await this.rebuildLotState(lotId);
    if (state !== null) {
      await store.setLotState(state);
    }
    return state;
  }
}

function rebuiltLotStateFromRow(row: RebuiltLotStateRow): RebuiltLotState {
  return {
    activeProxyCount: Number(row.active_proxy_count),
    auctionId: row.auction_id,
    bidCount: row.bid_count,
    closesAt: row.closes_at.toISOString(),
    currentBid:
      row.current_bid_fils === null
        ? null
        : money(Number(row.current_bid_fils)),
    leadingAccountId: row.leading_account_id,
    lifecycle: row.lifecycle,
    lotId: row.lot_id,
    nextMinimumBid: money(Number(row.next_minimum_bid_fils)),
    reserveStatus: row.reserve_status,
    sequence: row.sequence,
  };
}
