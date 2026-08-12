import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabasePool } from "../database/database.pool.js";
import {
  type AdminDashboardMetric,
  type FinalBidApprovalView,
  toMoney,
} from "./admin-operations.dto.js";

interface DashboardCountsRow extends QueryResultRow {
  readonly featured_lots: string;
  readonly high_risk_alerts: string;
  readonly live_auctions: string;
  readonly pending_approvals: string;
}

interface FinalBidApprovalRow extends QueryResultRow {
  readonly account_id: string;
  readonly auction_id: string;
  readonly closes_at: Date;
  readonly current_bid_fils: string;
  readonly deposit_eligible: boolean;
  readonly hammer_price_fils: string;
  readonly kyc_verified: boolean;
  readonly lot_id: string;
  readonly lot_number: string;
  readonly reserve_status: "MET" | "NOT_APPLICABLE" | "NOT_MET";
  readonly sequence: number;
  readonly title_ar: string;
  readonly title_en: string;
}

@Injectable()
export class AdminOperationsRepository {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async getDashboardMetrics(): Promise<readonly AdminDashboardMetric[]> {
    const result = await this.database.query<DashboardCountsRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE auctions.lifecycle = 'LIVE')::text AS live_auctions,
          (SELECT COUNT(*) FROM lots WHERE lifecycle = 'PENDING_APPROVAL')::text AS pending_approvals,
          0::text AS featured_lots,
          0::text AS high_risk_alerts
        FROM auctions
      `,
    );
    const row =
      result.rows[0] ??
      ({
        featured_lots: "0",
        high_risk_alerts: "0",
        live_auctions: "0",
        pending_approvals: "0",
      } satisfies DashboardCountsRow);

    return [
      {
        key: "LIVE_AUCTIONS",
        label: "Live auctions",
        value: Number(row.live_auctions),
      },
      {
        key: "PENDING_APPROVALS",
        label: "Pending approvals",
        value: Number(row.pending_approvals),
      },
      {
        key: "FEATURED_LOTS",
        label: "Featured lots",
        value: Number(row.featured_lots),
      },
      {
        key: "HIGH_RISK_ALERTS",
        label: "High-risk alerts",
        value: Number(row.high_risk_alerts),
      },
    ];
  }

  async listFinalBidApprovals(
    serverTime: Date,
  ): Promise<readonly FinalBidApprovalView[]> {
    const result = await this.database.query<FinalBidApprovalRow>(
      `
        SELECT
          lots.id::text AS lot_id,
          lots.auction_id::text AS auction_id,
          lots.lot_number,
          lots.title_en,
          lots.title_ar,
          lots.closes_at,
          lots.current_bid_fils::text,
          lots.current_bid_fils::text AS hammer_price_fils,
          lots.reserve_status,
          lots.sequence,
          latest_bid.account_id::text AS account_id,
          (accounts.kyc_status = 'VERIFIED') AS kyc_verified,
          COALESCE(deposit_status.deposit_eligible, false) AS deposit_eligible
        FROM lots
        INNER JOIN LATERAL (
          SELECT bid_ledger.account_id
          FROM bid_ledger
          WHERE bid_ledger.lot_id = lots.id
          ORDER BY bid_ledger.sequence DESC
          LIMIT 1
        ) latest_bid ON TRUE
        INNER JOIN accounts ON accounts.id = latest_bid.account_id
        LEFT JOIN LATERAL (
          SELECT SUM(
            CASE
              WHEN direction = 'CREDIT' THEN amount_fils
              ELSE -amount_fils
            END
          ) > 0 AS deposit_eligible
          FROM deposit_ledger
          WHERE account_id = latest_bid.account_id
            AND (lot_id IS NULL OR lot_id = lots.id)
        ) deposit_status ON TRUE
        WHERE lots.lifecycle = 'PENDING_APPROVAL'
          AND lots.current_bid_fils IS NOT NULL
        ORDER BY lots.closes_at ASC, lots.id ASC
        LIMIT 100
      `,
    );

    return result.rows.map((row) => toFinalBidApprovalView(row, serverTime));
  }
}

function toFinalBidApprovalView(
  row: FinalBidApprovalRow,
  serverTime: Date,
): FinalBidApprovalView {
  const dueAt = new Date(row.closes_at.getTime() + 60 * 60 * 1000);
  const remainingMs = dueAt.getTime() - serverTime.getTime();
  const hammerPrice = toMoney(Number(row.hammer_price_fils));

  return {
    bidder: {
      accountId: row.account_id,
      depositEligible: row.deposit_eligible,
      kycVerified: row.kyc_verified,
    },
    closesAt: row.closes_at.toISOString(),
    currentBid: toMoney(Number(row.current_bid_fils)),
    hammerPrice,
    lot: {
      auctionId: row.auction_id,
      lotId: row.lot_id,
      lotNumber: row.lot_number,
      titleAr: row.title_ar,
      titleEn: row.title_en,
    },
    reserveStatus: row.reserve_status,
    sequence: row.sequence,
    sla: {
      dueAt: dueAt.toISOString(),
      overdue: remainingMs < 0,
      remainingMs,
    },
  };
}
