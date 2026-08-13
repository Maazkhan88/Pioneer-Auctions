import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeProxyAck,
  parseProxyBidCommandAck,
  submitSetProxyBidCommand,
} from "../lib/proxy-bid-command";
import type { BuyerBidSessionConfig } from "../lib/bid-session";

const session: BuyerBidSessionConfig = {
  apiBaseUrl: "https://api.test",
  termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
  testAccountId: "00000000-0000-4000-8000-000000000001",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseProxyBidCommandAck", () => {
  it("parses a valid ACCEPTED ack", () => {
    const ack = parseProxyBidCommandAck({
      commandId: "cmd-1",
      contractVersion: 1,
      correlationId: "corr-1",
      result: {
        activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: { amountFils: 5_300_000, currency: "AED" },
        extended: false,
        lotId: "lot-1",
        myBidStatus: "WINNING",
        nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
        reserveStatus: "MET",
        sequence: 10,
      },
      serverTime: "2026-07-14T17:00:00.000Z",
      status: "ACCEPTED",
    });

    expect(ack).not.toBeNull();
    expect(ack?.status).toBe("ACCEPTED");
  });

  it("accepts a null currentBid (no bids exist yet)", () => {
    const ack = parseProxyBidCommandAck({
      commandId: "cmd-1",
      contractVersion: 1,
      correlationId: "corr-1",
      result: {
        activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: null,
        extended: false,
        lotId: "lot-1",
        myBidStatus: "NOT_BIDDING",
        nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
        reserveStatus: "NOT_APPLICABLE",
        sequence: 0,
      },
      serverTime: "2026-07-14T17:00:00.000Z",
      status: "ACCEPTED",
    });

    expect(ack).not.toBeNull();
  });

  it("returns null for a myBidStatus outside the known three values", () => {
    const ack = parseProxyBidCommandAck({
      commandId: "cmd-1",
      contractVersion: 1,
      correlationId: "corr-1",
      result: {
        activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: null,
        extended: false,
        lotId: "lot-1",
        myBidStatus: "SOMETHING_ELSE",
        nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
        reserveStatus: "NOT_APPLICABLE",
        sequence: 0,
      },
      serverTime: "2026-07-14T17:00:00.000Z",
      status: "ACCEPTED",
    });

    expect(ack).toBeNull();
  });

  it("parses a REJECTED ack with PROXY_MAX_TOO_LOW", () => {
    const ack = parseProxyBidCommandAck({
      commandId: "cmd-1",
      contractVersion: 1,
      correlationId: "corr-1",
      error: {
        code: "PROXY_MAX_TOO_LOW",
        message: "Your maximum must be higher than it is now.",
        retryable: true,
      },
      serverTime: "2026-07-14T17:00:00.000Z",
      status: "REJECTED",
    });

    expect(ack).not.toBeNull();
    if (ack?.status === "REJECTED") {
      expect(ack.error.code).toBe("PROXY_MAX_TOO_LOW");
    } else {
      expect.fail("expected a REJECTED ack");
    }
  });

  it("returns null for a malformed body", () => {
    expect(parseProxyBidCommandAck({ nonsense: true })).toBeNull();
    expect(parseProxyBidCommandAck(null)).toBeNull();
  });
});

describe("normalizeProxyAck", () => {
  it("normalizes an ACCEPTED ack", () => {
    const normalized = normalizeProxyAck({
      result: {
        activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: { amountFils: 5_300_000, currency: "AED" },
        myBidStatus: "WINNING",
        nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
      },
      status: "ACCEPTED",
    });

    expect(normalized).toEqual({
      activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
      closesAt: "2026-07-14T17:02:00.000Z",
      currentBid: { amountFils: 5_300_000, currency: "AED" },
      kind: "accepted",
      myBidStatus: "WINNING",
      nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
    });
  });

  it("normalizes a REJECTED ack, defaulting retryable to true when absent (socket ack shape)", () => {
    const normalized = normalizeProxyAck({
      error: { code: "PROXY_MAX_TOO_LOW", message: "too low" },
      status: "REJECTED",
    });

    expect(normalized).toEqual({
      code: "PROXY_MAX_TOO_LOW",
      kind: "rejected",
      latest: null,
      message: "too low",
      retryable: true,
    });
  });

  it("returns null when an ACCEPTED ack is missing its result", () => {
    expect(normalizeProxyAck({ status: "ACCEPTED" })).toBeNull();
  });

  it("returns null when a REJECTED ack is missing its error", () => {
    expect(normalizeProxyAck({ status: "REJECTED" })).toBeNull();
  });
});

describe("submitSetProxyBidCommand", () => {
  it("PUTs to /lots/:lotId/proxy-bid with the idempotency/correlation/test-account headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(
        "https://api.test/api/v1/lots/lot-1/proxy-bid",
      );
      expect(init?.method).toBe("PUT");
      const headers = new Headers(init?.headers);
      expect(headers.get("idempotency-key")).toBe("cmd-1");
      expect(headers.get("x-correlation-id")).toBe("corr-1");
      expect(headers.get("x-pioneer-test-account-id")).toBe(
        session.testAccountId,
      );
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.termsVersionId).toBe(session.termsVersionId);
      return new Response(
        JSON.stringify({
          commandId: "cmd-1",
          contractVersion: 1,
          correlationId: "corr-1",
          result: {
            activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
            closesAt: "2026-07-14T17:02:00.000Z",
            currentBid: { amountFils: 5_300_000, currency: "AED" },
            extended: false,
            lotId: "lot-1",
            myBidStatus: "WINNING",
            nextMinimumBid: { amountFils: 5_400_000, currency: "AED" },
            reserveStatus: "MET",
            sequence: 10,
          },
          serverTime: "2026-07-14T17:00:00.000Z",
          status: "ACCEPTED",
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitSetProxyBidCommand({
      commandId: "cmd-1",
      correlationId: "corr-1",
      expectedSequence: 0,
      lotId: "lot-1",
      maximum: { amountFils: 6_000_000, currency: "AED" },
      session,
    });

    expect(result.outcome).toBe("ack");
  });

  it("reports unknown on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("timeout");
      }),
    );

    const result = await submitSetProxyBidCommand({
      commandId: "cmd-1",
      correlationId: "corr-1",
      expectedSequence: 0,
      lotId: "lot-1",
      maximum: { amountFils: 100, currency: "AED" },
      session,
    });

    expect(result).toEqual({ outcome: "unknown" });
  });
});
