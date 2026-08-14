import { BadRequestException } from "@nestjs/common";

import { money, type Money } from "../bidding/bid.dto.js";

export type FinalBidRejectionReasonCode =
  | "BUYER_ELIGIBILITY_FAILED"
  | "DOCUMENTATION_INCOMPLETE"
  | "RESERVE_NOT_MET"
  | "SELLER_WITHDRAWN"
  | "OTHER";

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

export interface FinalBidDecisionResult {
  readonly auditId: string;
  readonly contractVersion: 1;
  readonly decision: "APPROVED" | "REJECTED";
  readonly decidedAt: string;
  readonly hammerPrice: Money;
  readonly lotId: string;
  readonly sequence: number;
}

export interface FinalBidApprovalDecisionRecord {
  readonly auctionId: string;
  readonly hammerPriceFils: number;
  readonly lotId: string;
  readonly sequence: number;
}

export interface RejectFinalBidInput {
  readonly note: string | null;
  readonly reasonCode: FinalBidRejectionReasonCode;
}

export interface AdminAuditEventView {
  readonly action: string;
  readonly actorAccountId: string | null;
  readonly correlationId: string;
  readonly id: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
  readonly reasonCode: string | null;
  readonly subjectId: string | null;
  readonly subjectType: string;
}

export interface AdminAuditEventsView {
  readonly contractVersion: 1;
  readonly events: readonly AdminAuditEventView[];
  readonly generatedAt: string;
}

export function toMoney(amountFils: number): Money {
  return money(amountFils);
}

const allowedRejectionReasonCodes = new Set<FinalBidRejectionReasonCode>([
  "BUYER_ELIGIBILITY_FAILED",
  "DOCUMENTATION_INCOMPLETE",
  "RESERVE_NOT_MET",
  "SELLER_WITHDRAWN",
  "OTHER",
]);

export function parseRejectFinalBidInput(body: unknown): RejectFinalBidInput {
  if (typeof body !== "object" || body === null) {
    throw new BadRequestException("Reject final-bid body must be an object");
  }
  const candidate = body as Record<string, unknown>;
  const reasonCode = candidate.reasonCode;
  if (
    typeof reasonCode !== "string" ||
    !allowedRejectionReasonCodes.has(reasonCode as FinalBidRejectionReasonCode)
  ) {
    throw new BadRequestException("Reject final-bid reasonCode is invalid");
  }
  const note = candidate.note;
  if (note !== undefined && note !== null && typeof note !== "string") {
    throw new BadRequestException("Reject final-bid note must be a string");
  }

  return {
    note: note ?? null,
    reasonCode: reasonCode as FinalBidRejectionReasonCode,
  };
}
