import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAdminOperationsData } from "../lib/admin-data";
import { messagesFor } from "../i18n/messages";

describe("admin operations data adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses static fallback data when no admin API base URL is configured", async () => {
    vi.stubEnv("PIONEER_ADMIN_API_BASE_URL", "");

    const messages = messagesFor("en");
    const data = await loadAdminOperationsData("en", messages);

    expect(data.source).toBe("static-fallback");
    expect(data.metrics).toBe(messages.metrics);
    expect(data.queue).toBe(messages.approvalQueue);
  });

  it("maps protected admin API read models into localized UI data", async () => {
    vi.stubEnv("PIONEER_ADMIN_API_BASE_URL", "https://api.test");
    vi.stubEnv(
      "PIONEER_ADMIN_TEST_ACCOUNT_ID",
      "00000000-0000-4000-8000-000000000001",
    );
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toMatch(/^https:\/\/api\.test\/api\/v1\/admin\//);
      expect(init?.headers).toMatchObject({
        "x-pioneer-test-account-id": "00000000-0000-4000-8000-000000000001",
      });
      if (String(input).endsWith("/dashboard")) {
        return jsonResponse({
          contractVersion: 1,
          generatedAt: "2026-09-01T16:00:00.000Z",
          metrics: [
            { key: "LIVE_AUCTIONS", label: "ignored", value: 4 },
            { key: "PENDING_APPROVALS", label: "ignored", value: 7 },
          ],
        });
      }
      return jsonResponse({
        contractVersion: 1,
        generatedAt: "2026-09-01T16:00:00.000Z",
        items: [
          {
            hammerPrice: { amountFils: 56000000, currency: "AED" },
            lot: {
              lotId: "11111111-1111-4111-8111-111111111111",
              lotNumber: "214",
              titleAr: "تويوتا لاند كروزر 2019",
              titleEn: "Toyota Land Cruiser 2019",
            },
            reserveStatus: "MET",
            sla: { overdue: false, remainingMs: 42 * 60_000 },
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await loadAdminOperationsData("en", messagesFor("en"));

    expect(data).toMatchObject({
      metrics: [
        { label: "Live auctions", tone: "success", value: "4" },
        { label: "Pending approvals", tone: "warning", value: "7" },
      ],
      queue: [
        {
          approveEndpoint:
            "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/approve",
          lotId: "11111111-1111-4111-8111-111111111111",
          meta: "Lot #214 · Toyota Land Cruiser 2019",
          rejectEndpoint:
            "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/reject",
          sla: "42 min remaining",
          title: "Reserve met",
        },
      ],
      source: "api",
    });
    expect(data.queue[0]?.amount).toContain("560,000");
  });

  it("falls back to static data when the admin API is unavailable", async () => {
    vi.stubEnv("PIONEER_ADMIN_API_BASE_URL", "https://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("network unavailable");
      }),
    );

    const data = await loadAdminOperationsData("en", messagesFor("en"));

    expect(data.source).toBe("static-fallback");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
