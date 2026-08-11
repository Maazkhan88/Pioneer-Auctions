import { describe, expect, it } from "vitest";

import {
  evaluateManualBid,
  type LotBidState,
} from "../src/bidding/bid-decision.js";

const baseLot: LotBidState = {
  closesAt: new Date("2026-09-01T16:00:00.000Z"),
  currentBidFils: null,
  lifecycle: "LIVE",
  minimumIncrementFils: 100000,
  nextMinimumBidFils: 5000000,
  reservePriceFils: 5500000,
  reserveStatus: "NOT_MET",
  sequence: 0,
  softClose: {
    enabled: true,
    extensionCount: 0,
    extensionMs: 120000,
    maximumExtensions: null,
    windowMs: 120000,
  },
};

describe("manual bid decision", () => {
  it("rejects bids below the current minimum", () => {
    expect(
      evaluateManualBid({
        amountFils: 4900000,
        depositEligible: true,
        lot: baseLot,
        serverTime: new Date("2026-09-01T15:50:00.000Z"),
        termsAccepted: true,
      }),
    ).toMatchObject({
      errorCode: "BID_TOO_LOW",
      status: "REJECTED",
    });
  });

  it("rejects custom bids not aligned to the configured increment", () => {
    expect(
      evaluateManualBid({
        amountFils: 5050000,
        depositEligible: true,
        lot: baseLot,
        serverTime: new Date("2026-09-01T15:50:00.000Z"),
        termsAccepted: true,
      }),
    ).toMatchObject({
      errorCode: "BID_AMOUNT_INVALID",
      status: "REJECTED",
    });
  });

  it("accepts aligned bids and advances sequence and next minimum", () => {
    const decision = evaluateManualBid({
      amountFils: 5200000,
      depositEligible: true,
      lot: baseLot,
      serverTime: new Date("2026-09-01T15:50:00.000Z"),
      termsAccepted: true,
    });

    expect(decision).toMatchObject({
      result: {
        amountFils: 5200000,
        extended: false,
        nextMinimumBidFils: 5300000,
        sequence: 1,
      },
      status: "ACCEPTED",
    });
  });

  it("extends from previous close time by the default 2 minutes inside the window", () => {
    const decision = evaluateManualBid({
      amountFils: 5200000,
      depositEligible: true,
      lot: baseLot,
      serverTime: new Date("2026-09-01T15:59:30.000Z"),
      termsAccepted: true,
    });

    expect(decision).toMatchObject({
      result: {
        extended: true,
        extensionCount: 1,
        previousClosesAt: new Date("2026-09-01T16:00:00.000Z"),
      },
      status: "ACCEPTED",
    });
    if (decision.status === "ACCEPTED") {
      expect(decision.result.closesAt.toISOString()).toBe(
        "2026-09-01T16:02:00.000Z",
      );
    }
  });

  it("does not extend when the per-lot extension limit is reached", () => {
    const decision = evaluateManualBid({
      amountFils: 5200000,
      depositEligible: true,
      lot: {
        ...baseLot,
        softClose: {
          ...baseLot.softClose,
          extensionCount: 1,
          maximumExtensions: 1,
        },
      },
      serverTime: new Date("2026-09-01T15:59:30.000Z"),
      termsAccepted: true,
    });

    expect(decision).toMatchObject({
      result: {
        extended: false,
        extensionCount: 1,
      },
      status: "ACCEPTED",
    });
  });

  it("marks reserve met without exposing the reserve amount", () => {
    expect(
      evaluateManualBid({
        amountFils: 5500000,
        depositEligible: true,
        lot: baseLot,
        serverTime: new Date("2026-09-01T15:50:00.000Z"),
        termsAccepted: true,
      }),
    ).toMatchObject({
      result: { reserveStatus: "MET" },
      status: "ACCEPTED",
    });
  });
});
