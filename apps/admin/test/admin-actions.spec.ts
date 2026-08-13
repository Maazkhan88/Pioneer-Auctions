import { afterEach, describe, expect, it, vi } from "vitest";

import {
  submitAuctionControl,
  submitCreateAuction,
  submitCreateLot,
  submitFinalBidDecision,
} from "../lib/admin-actions";

describe("admin action runtime helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits final-bid approval with authenticated runtime headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(
        "https://api.test/api/v1/admin/final-bid-approvals/lot-1/approve",
      );
      expect(init).toMatchObject({
        headers: {
          "content-type": "application/json",
          "x-correlation-id": "corr-approve",
          "x-pioneer-test-account-id": "admin-1",
        },
        method: "POST",
      });
      expect(init?.body).toBe("{}");
      return jsonResponse({
        auditId: "audit-1",
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "APPROVED",
        hammerPrice: { amountFils: 56000000, currency: "AED" },
        lotId: "lot-1",
        sequence: 44,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitFinalBidDecision({
        apiBaseUrl: "https://api.test/",
        correlationId: "corr-approve",
        endpoint: "/api/v1/admin/final-bid-approvals/lot-1/approve",
        testAccountId: "admin-1",
        type: "approve",
      }),
    ).resolves.toMatchObject({ decision: "APPROVED", lotId: "lot-1" });
  });

  it("submits final-bid rejection reason and note", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        note: "Missing docs",
        reasonCode: "DOCUMENTATION_INCOMPLETE",
      });
      return jsonResponse({
        auditId: "audit-2",
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "REJECTED",
        hammerPrice: { amountFils: 56000000, currency: "AED" },
        lotId: "lot-1",
        sequence: 44,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitFinalBidDecision({
      apiBaseUrl: "https://api.test",
      correlationId: "corr-reject",
      endpoint: "/admin/final-bid-approvals/lot-1/reject",
      note: "Missing docs",
      reasonCode: "DOCUMENTATION_INCOMPLETE",
      testAccountId: "admin-1",
      type: "reject",
    });
  });

  it("throws on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () => new Response("forbidden", { status: 403 }),
      ),
    );

    await expect(
      submitFinalBidDecision({
        apiBaseUrl: "https://api.test",
        correlationId: "corr-fail",
        endpoint: "/admin/final-bid-approvals/lot-1/approve",
        testAccountId: "admin-1",
        type: "approve",
      }),
    ).rejects.toThrow("403");
  });

  it("submits an auction pause command with reason and note", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(
        "https://api.test/api/v1/admin/auctions/auction-1/pause",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        note: "Payment gateway outage",
        reason: "Technical issue",
      });
      return jsonResponse({
        auctionId: "auction-1",
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "PAUSED",
        lifecycle: "PAUSED",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitAuctionControl({
        apiBaseUrl: "https://api.test",
        auctionId: "auction-1",
        correlationId: "corr-pause",
        note: "Payment gateway outage",
        reason: "Technical issue",
        testAccountId: "admin-1",
        type: "pause",
      }),
    ).resolves.toMatchObject({ decision: "PAUSED", lifecycle: "PAUSED" });
  });

  it("submits a create-auction command", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe("https://api.test/api/v1/admin/auctions");
      expect(JSON.parse(String(init?.body))).toEqual({
        closesAt: "2026-09-08T18:00:00.000Z",
        startsAt: "2026-09-08T14:00:00.000Z",
        titleAr: "مزاد السيارات الأسبوعي",
        titleEn: "Weekly car auction",
      });
      return jsonResponse({
        closesAt: "2026-09-08T18:00:00.000Z",
        id: "auction-new",
        lifecycle: "SCHEDULED",
        startsAt: "2026-09-08T14:00:00.000Z",
        titleAr: "مزاد السيارات الأسبوعي",
        titleEn: "Weekly car auction",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitCreateAuction({
        apiBaseUrl: "https://api.test",
        closesAt: "2026-09-08T18:00:00.000Z",
        correlationId: "corr-create-auction",
        startsAt: "2026-09-08T14:00:00.000Z",
        testAccountId: "admin-1",
        titleAr: "مزاد السيارات الأسبوعي",
        titleEn: "Weekly car auction",
      }),
    ).resolves.toMatchObject({ id: "auction-new", lifecycle: "SCHEDULED" });
  });

  it("submits a create-lot command with a custom increment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe("https://api.test/api/v1/admin/lots");
      expect(JSON.parse(String(init?.body))).toEqual({
        auctionId: "auction-1",
        closesAt: "2026-09-08T18:00:00.000Z",
        lotNumber: "214",
        minimumIncrementFils: 100000,
        reservePriceFils: 54000000,
        startingBidFils: 50000000,
        startsAt: "2026-09-08T14:00:00.000Z",
        titleAr: "تويوتا لاند كروزر 2019",
        titleEn: "Toyota Land Cruiser 2019",
      });
      return jsonResponse({
        auctionId: "auction-1",
        id: "lot-new",
        lifecycle: "SCHEDULED",
        lotNumber: "214",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitCreateLot({
        apiBaseUrl: "https://api.test",
        auctionId: "auction-1",
        closesAt: "2026-09-08T18:00:00.000Z",
        correlationId: "corr-create-lot",
        increment: { minimumIncrementFils: 100000, mode: "custom" },
        lotNumber: "214",
        reservePriceFils: 54000000,
        startingBidFils: 50000000,
        startsAt: "2026-09-08T14:00:00.000Z",
        testAccountId: "admin-1",
        titleAr: "تويوتا لاند كروزر 2019",
        titleEn: "Toyota Land Cruiser 2019",
      }),
    ).resolves.toMatchObject({ id: "lot-new" });
  });

  it("submits a create-lot command with a percent increment and omits the custom field", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.minimumIncrementFils).toBeUndefined();
      expect(body.minimumIncrementPercentBps).toBe(500);
      return jsonResponse({
        auctionId: "auction-1",
        id: "lot-new-2",
        lifecycle: "SCHEDULED",
        lotNumber: "215",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await submitCreateLot({
      apiBaseUrl: "https://api.test",
      auctionId: "auction-1",
      closesAt: "2026-09-08T18:00:00.000Z",
      correlationId: "corr-create-lot-2",
      increment: { minimumIncrementPercentBps: 500, mode: "percent" },
      lotNumber: "215",
      startingBidFils: 50000000,
      startsAt: "2026-09-08T14:00:00.000Z",
      testAccountId: "admin-1",
      titleAr: "تويوتا لاند كروزر 2019",
      titleEn: "Toyota Land Cruiser 2019",
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
