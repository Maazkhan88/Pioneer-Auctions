import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyRejectionStatus,
  fetchAuthoritativeLotState,
  isBidGateReason,
  isLotLive,
  submitPlaceBidCommand,
} from "../lib/bid-command";
import type { BuyerBidSessionConfig } from "../lib/bid-session";

const session: BuyerBidSessionConfig = {
  apiBaseUrl: "https://api.test",
  termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
  testAccountId: "00000000-0000-4000-8000-000000000001",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifyRejectionStatus", () => {
  it("routes AUCTION_CLOSED to the closed state", () => {
    expect(classifyRejectionStatus("AUCTION_CLOSED")).toBe("closed");
  });

  it("routes eligibility reasons to the gated state", () => {
    for (const code of [
      "ACCOUNT_RESTRICTED",
      "DEPOSIT_INSUFFICIENT",
      "DEPOSIT_REQUIRED",
      "KYC_PENDING",
      "KYC_REQUIRED",
      "TERMS_ACCEPTANCE_REQUIRED",
    ]) {
      expect(classifyRejectionStatus(code)).toBe("gated");
    }
  });

  it("routes every other reason to the plain rejected state", () => {
    for (const code of [
      "BID_TOO_LOW",
      "BID_AMOUNT_INVALID",
      "AUCTION_NOT_LIVE",
      "LOT_NOT_FOUND",
      "COMMAND_CONFLICT",
    ]) {
      expect(classifyRejectionStatus(code)).toBe("rejected");
    }
  });
});

describe("isBidGateReason / isLotLive", () => {
  it("only recognizes the six eligibility codes as gate reasons", () => {
    expect(isBidGateReason("DEPOSIT_REQUIRED")).toBe(true);
    expect(isBidGateReason("BID_TOO_LOW")).toBe(false);
  });

  it("treats only LIVE as biddable", () => {
    expect(isLotLive("LIVE")).toBe(true);
    expect(isLotLive("PAUSED")).toBe(false);
    expect(isLotLive("SCHEDULED")).toBe(false);
  });
});

describe("fetchAuthoritativeLotState", () => {
  it("returns the matching lot's authoritative state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        expect(String(input)).toBe(
          "https://api.test/api/v1/lots/11111111-1111-4111-8111-111111111111",
        );
        return new Response(
          JSON.stringify({
            closesAt: "2026-07-14T17:02:00.000Z",
            contractVersion: 1,
            currentBid: { amountFils: 5_200_000, currency: "AED" },
            lifecycle: "LIVE",
            lotId: "11111111-1111-4111-8111-111111111111",
            lotNumber: "214",
            nextMinimumBid: { amountFils: 5_300_000, currency: "AED" },
          }),
          { status: 200 },
        );
      }),
    );

    const state = await fetchAuthoritativeLotState(
      session,
      "11111111-1111-4111-8111-111111111111",
    );

    expect(state).toEqual({
      closesAt: "2026-07-14T17:02:00.000Z",
      currentBid: { amountFils: 5_200_000, currency: "AED" },
      lifecycle: "LIVE",
      nextMinimumBid: { amountFils: 5_300_000, currency: "AED" },
    });
  });

  it("returns null when the lot endpoint returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({ code: "LOT_NOT_FOUND", message: "Lot not found" }),
            { status: 404 },
          ),
      ),
    );

    const state = await fetchAuthoritativeLotState(session, "missing-lot");

    expect(state).toBeNull();
  });

  it("returns null on a network failure instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("network down");
      }),
    );

    const state = await fetchAuthoritativeLotState(session, "any-lot");

    expect(state).toBeNull();
  });

  it("returns null on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response("", { status: 500 })),
    );

    const state = await fetchAuthoritativeLotState(session, "any-lot");

    expect(state).toBeNull();
  });
});

describe("submitPlaceBidCommand", () => {
  it("sends the idempotency key, correlation id, and test-account header", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("idempotency-key")).toBe(
        "835cb208-e936-4e0c-9863-c85a96f2ff60",
      );
      expect(headers.get("x-correlation-id")).toBe("corr-1");
      expect(headers.get("x-pioneer-test-account-id")).toBe(
        session.testAccountId,
      );
      return new Response(
        JSON.stringify({
          commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
          contractVersion: 1,
          correlationId: "corr-1",
          result: {
            closesAt: "2026-07-14T17:02:00.000Z",
            currentBid: { amountFils: 5_200_000, currency: "AED" },
            extended: true,
            lotId: "11111111-1111-4111-8111-111111111111",
            myBidStatus: "WINNING",
            nextMinimumBid: { amountFils: 5_300_000, currency: "AED" },
            reserveStatus: "MET",
            sequence: 42,
          },
          serverTime: "2026-07-14T17:00:00.000Z",
          status: "ACCEPTED",
        }),
        { status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPlaceBidCommand({
      amount: { amountFils: 5_200_000, currency: "AED" },
      commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
      correlationId: "corr-1",
      expectedSequence: 41,
      lotId: "11111111-1111-4111-8111-111111111111",
      session,
    });

    expect(result.outcome).toBe("ack");
    if (result.outcome === "ack" && result.ack.status === "ACCEPTED") {
      expect(result.ack.result.myBidStatus).toBe("WINNING");
    } else {
      expect.fail("expected an ACCEPTED ack");
    }
  });

  it("reports unknown on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("timeout");
      }),
    );

    const result = await submitPlaceBidCommand({
      amount: { amountFils: 100, currency: "AED" },
      commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
      correlationId: "corr-1",
      expectedSequence: 0,
      lotId: "lot-1",
      session,
    });

    expect(result).toEqual({ outcome: "unknown" });
  });

  it("reports unknown when the response body is not a valid ack", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ nonsense: true }), { status: 200 }),
      ),
    );

    const result = await submitPlaceBidCommand({
      amount: { amountFils: 100, currency: "AED" },
      commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
      correlationId: "corr-1",
      expectedSequence: 0,
      lotId: "lot-1",
      session,
    });

    expect(result).toEqual({ outcome: "unknown" });
  });

  it("parses a REJECTED ack instead of treating it as a transport failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
              contractVersion: 1,
              correlationId: "corr-1",
              error: {
                code: "DEPOSIT_REQUIRED",
                message: "A deposit is required before bidding.",
                retryable: false,
              },
              serverTime: "2026-07-14T17:00:00.000Z",
              status: "REJECTED",
            }),
            { status: 201 },
          ),
      ),
    );

    const result = await submitPlaceBidCommand({
      amount: { amountFils: 100, currency: "AED" },
      commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
      correlationId: "corr-1",
      expectedSequence: 0,
      lotId: "lot-1",
      session,
    });

    expect(result.outcome).toBe("ack");
    if (result.outcome === "ack" && result.ack.status === "REJECTED") {
      expect(result.ack.error.code).toBe("DEPOSIT_REQUIRED");
    } else {
      expect.fail("expected a REJECTED ack");
    }
  });
});
