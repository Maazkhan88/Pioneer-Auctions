import { afterEach, describe, expect, it, vi } from "vitest";

import { submitFinalBidDecision } from "../lib/admin-actions";

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
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "APPROVED",
        hammerPrice: { amountFils: 56000000, currency: "AED" },
        lifecycle: "APPROVED",
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
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "REJECTED",
        hammerPrice: { amountFils: 56000000, currency: "AED" },
        lifecycle: "REJECTED",
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
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
