import { money, type Money } from "../bidding/bid.dto.js";

export interface AdminDashboardMetric {
  readonly key:
    | "LIVE_AUCTIONS"
    | "PENDING_APPROVALS"
    | "FEATURED_LOTS"
    | "HIGH_RISK_ALERTS";
  readonly label: string;
  readonly value: number;
}

export interface AdminDashboardView {
  readonly contractVersion: 1;
  readonly generatedAt: string;
  readonly metrics: readonly AdminDashboardMetric[];
}

export interface FinalBidApprovalView {
  readonly bidder: {
    readonly accountId: string;
    readonly depositEligible: boolean;
    readonly kycVerified: boolean;
  };
  readonly closesAt: string;
  readonly currentBid: Money;
  readonly hammerPrice: Money;
  readonly lot: {
    readonly auctionId: string;
    readonly lotId: string;
    readonly lotNumber: string;
    readonly titleAr: string;
    readonly titleEn: string;
  };
  readonly reserveStatus: "MET" | "NOT_APPLICABLE" | "NOT_MET";
  readonly sequence: number;
  readonly sla: {
    readonly dueAt: string;
    readonly overdue: boolean;
    readonly remainingMs: number;
  };
}

export interface FinalBidApprovalsView {
  readonly contractVersion: 1;
  readonly generatedAt: string;
  readonly items: readonly FinalBidApprovalView[];
}

export function toMoney(amountFils: number): Money {
  return money(amountFils);
}
