import type { IsoDateTime, Money, Uuid } from "./core.js";

export type LotLifecycle =
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "CLOSED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type ReserveStatus = "NOT_APPLICABLE" | "NOT_MET" | "MET";

export type MyBidStatus =
  | "NOT_BIDDING"
  | "WINNING"
  | "OUTBID"
  | "WON_PENDING_APPROVAL"
  | "WON"
  | "LOST";

export type EligibilityReasonCode =
  | "KYC_REQUIRED"
  | "KYC_PENDING"
  | "DEPOSIT_REQUIRED"
  | "DEPOSIT_INSUFFICIENT"
  | "TERMS_ACCEPTANCE_REQUIRED"
  | "ACCOUNT_RESTRICTED";

export interface BidEligibility {
  readonly eligible: boolean;
  readonly reasonCodes: readonly EligibilityReasonCode[];
  readonly requiredDeposit?: Money;
  readonly eligibleDeposit?: Money;
  readonly termsVersionId?: Uuid;
}

export interface SoftCloseState {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly extensionMs: number;
  readonly extensionCount: number;
}

export interface SoftClosePolicy {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly extensionMs: number;
  readonly maximumExtensions: number | null;
}

export interface LotPublicState {
  readonly lifecycle: LotLifecycle;
  readonly currentBid: Money | null;
  readonly nextMinimumBid: Money;
  readonly bidCount: number;
  readonly reserveStatus: ReserveStatus;
  readonly startsAt: IsoDateTime;
  readonly closesAt: IsoDateTime;
  readonly softClose: SoftCloseState;
  readonly approximateViewerCount?: number;
}

export interface MyBidState {
  readonly status: MyBidStatus;
  readonly myHighestVisibleBid: Money | null;
  readonly activeProxyMaximum: Money | null;
  readonly eligibility: BidEligibility;
}
