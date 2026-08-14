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
    expect(data.session).toBeNull();
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
      if (String(input).endsWith("/lots")) {
        return jsonResponse([
          {
            closesAt: "2026-09-08T18:00:00.000Z",
            currentBidFils: 56000000,
            id: "33333333-3333-4333-8333-333333333333",
            lifecycle: "LIVE",
            lotNumber: "214",
            minimumIncrementFils: 100000,
            softCloseExtensionMs: 120000,
            softCloseMaximumExtensions: null,
            softCloseWindowMs: 120000,
            startsAt: "2026-09-08T14:00:00.000Z",
            titleAr: "تويوتا لاند كروزر 2019",
            titleEn: "Toyota Land Cruiser 2019",
          },
        ]);
      }
      if (String(input).endsWith("/auctions")) {
        return jsonResponse([
          {
            closesAt: "2026-09-08T18:00:00.000Z",
            id: "22222222-2222-4222-8222-222222222222",
            lifecycle: "LIVE",
            startsAt: "2026-09-08T14:00:00.000Z",
            titleAr: "مزاد السيارات الأسبوعي",
            titleEn: "Weekly car auction",
          },
        ]);
      }
      if (String(input).endsWith("/audit-events")) {
        return jsonResponse({
          contractVersion: 1,
          events: [
            {
              action: "admin.auctions.pause",
              actorAccountId: "00000000-0000-4000-8000-000000000001",
              id: "audit-event-1",
              occurredAt: "2026-09-08T15:00:00.000Z",
              subjectId: "22222222-2222-4222-8222-222222222222",
              subjectType: "auction",
            },
          ],
          generatedAt: "2026-09-08T15:00:00.000Z",
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
      auctions: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          lifecycle: "LIVE",
          title: "Weekly car auction",
        },
      ],
      auditEvents: [
        {
          action: "admin.auctions.pause",
          id: "audit-event-1",
          subjectType: "auction",
        },
      ],
      metrics: [
        { label: "Live auctions", tone: "success", value: "4" },
        { label: "Pending approvals", tone: "warning", value: "7" },
      ],
      lots: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          lifecycle: "LIVE",
          lotNumber: "214",
          title: "Toyota Land Cruiser 2019",
        },
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
    expect(data.session).toEqual({
      apiBaseUrl: "https://api.test",
      testAccountId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("degrades gracefully when the account lacks admin.audit.read but other endpoints succeed", async () => {
    vi.stubEnv("PIONEER_ADMIN_API_BASE_URL", "https://api.test");
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith("/audit-events")) {
        return new Response("forbidden", { status: 403 });
      }
      if (String(input).endsWith("/dashboard")) {
        return jsonResponse({
          contractVersion: 1,
          generatedAt: "2026-09-01T16:00:00.000Z",
          metrics: [],
        });
      }
      if (
        String(input).endsWith("/lots") ||
        String(input).endsWith("/auctions")
      ) {
        return jsonResponse([]);
      }
      return jsonResponse({
        contractVersion: 1,
        generatedAt: "2026-09-01T16:00:00.000Z",
        items: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await loadAdminOperationsData("en", messagesFor("en"));

    expect(data.source).toBe("api");
    expect(data.auditEvents).toEqual([]);
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
