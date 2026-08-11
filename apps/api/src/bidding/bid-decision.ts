export type LotBidLifecycle = "SCHEDULED" | "LIVE" | "PAUSED" | "CLOSED";
export type ReserveStatus = "NOT_APPLICABLE" | "NOT_MET" | "MET";

export interface SoftCloseState {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly extensionMs: number;
  readonly maximumExtensions: number | null;
  readonly extensionCount: number;
}

export interface LotBidState {
  readonly closesAt: Date;
  readonly currentBidFils: number | null;
  readonly lifecycle: LotBidLifecycle;
  readonly minimumIncrementFils: number;
  readonly nextMinimumBidFils: number;
  readonly reservePriceFils: number | null;
  readonly reserveStatus: ReserveStatus;
  readonly sequence: number;
  readonly softClose: SoftCloseState;
}

export interface EvaluateManualBidInput {
  readonly amountFils: number;
  readonly depositEligible: boolean;
  readonly lot: LotBidState;
  readonly serverTime: Date;
  readonly termsAccepted: boolean;
}

export type BidDecision =
  | {
      readonly status: "ACCEPTED";
      readonly result: {
        readonly amountFils: number;
        readonly closesAt: Date;
        readonly extended: boolean;
        readonly extensionCount: number;
        readonly nextMinimumBidFils: number;
        readonly previousClosesAt: Date | null;
        readonly reserveStatus: ReserveStatus;
        readonly sequence: number;
      };
    }
  | {
      readonly status: "REJECTED";
      readonly errorCode:
        | "AUCTION_CLOSED"
        | "AUCTION_NOT_LIVE"
        | "BID_AMOUNT_INVALID"
        | "BID_TOO_LOW"
        | "DEPOSIT_REQUIRED"
        | "TERMS_ACCEPTANCE_REQUIRED";
      readonly retryable: boolean;
    };

export function evaluateManualBid(input: EvaluateManualBidInput): BidDecision {
  const { amountFils, lot, serverTime } = input;

  if (!input.termsAccepted) {
    return reject("TERMS_ACCEPTANCE_REQUIRED", false);
  }
  if (!input.depositEligible) {
    return reject("DEPOSIT_REQUIRED", false);
  }
  if (lot.lifecycle !== "LIVE") {
    return reject("AUCTION_NOT_LIVE", true);
  }
  if (serverTime.getTime() >= lot.closesAt.getTime()) {
    return reject("AUCTION_CLOSED", true);
  }
  if (!Number.isInteger(amountFils) || amountFils <= 0) {
    return reject("BID_AMOUNT_INVALID", false);
  }
  if (amountFils < lot.nextMinimumBidFils) {
    return reject("BID_TOO_LOW", true);
  }
  if (
    !isAlignedToIncrement(
      amountFils,
      lot.nextMinimumBidFils,
      lot.minimumIncrementFils,
    )
  ) {
    return reject("BID_AMOUNT_INVALID", false);
  }

  const softClose = applySoftClose(lot, serverTime);
  const reserveStatus = resolveReserveStatus(lot.reservePriceFils, amountFils);

  return {
    status: "ACCEPTED",
    result: {
      amountFils,
      closesAt: softClose.closesAt,
      extended: softClose.extended,
      extensionCount: softClose.extensionCount,
      nextMinimumBidFils: amountFils + lot.minimumIncrementFils,
      previousClosesAt: softClose.previousClosesAt,
      reserveStatus,
      sequence: lot.sequence + 1,
    },
  };
}

type BidRejectionCode = Extract<
  BidDecision,
  { status: "REJECTED" }
>["errorCode"];

function reject(errorCode: BidRejectionCode, retryable: boolean): BidDecision {
  return { errorCode, retryable, status: "REJECTED" };
}

function isAlignedToIncrement(
  amountFils: number,
  nextMinimumBidFils: number,
  minimumIncrementFils: number,
): boolean {
  return (amountFils - nextMinimumBidFils) % minimumIncrementFils === 0;
}

function resolveReserveStatus(
  reservePriceFils: number | null,
  amountFils: number,
): ReserveStatus {
  if (reservePriceFils === null) {
    return "NOT_APPLICABLE";
  }
  return amountFils >= reservePriceFils ? "MET" : "NOT_MET";
}

function applySoftClose(
  lot: LotBidState,
  serverTime: Date,
): {
  readonly closesAt: Date;
  readonly extended: boolean;
  readonly extensionCount: number;
  readonly previousClosesAt: Date | null;
} {
  const policy = lot.softClose;
  const msUntilClose = lot.closesAt.getTime() - serverTime.getTime();
  const extensionLimitReached =
    policy.maximumExtensions !== null &&
    policy.extensionCount >= policy.maximumExtensions;

  if (
    !policy.enabled ||
    msUntilClose > policy.windowMs ||
    extensionLimitReached
  ) {
    return {
      closesAt: lot.closesAt,
      extended: false,
      extensionCount: policy.extensionCount,
      previousClosesAt: null,
    };
  }

  return {
    closesAt: new Date(lot.closesAt.getTime() + policy.extensionMs),
    extended: true,
    extensionCount: policy.extensionCount + 1,
    previousClosesAt: lot.closesAt,
  };
}
