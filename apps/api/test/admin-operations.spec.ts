import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminOperationsController } from "../src/auctions/admin-operations.controller.js";
import { AdminOperationsRepository } from "../src/auctions/admin-operations.repository.js";
import {
  IdentityService,
  type AccountSummary,
} from "../src/identity/identity.service.js";
import { AdminPermissionGuard } from "../src/identity/admin-permission.guard.js";
import { SessionService } from "../src/identity/session.service.js";

const activeAccount: AccountSummary = {
  displayName: "Ops Admin",
  id: "00000000-0000-4000-8000-000000000001",
  permissions: ["admin.auctions.read"],
  roles: ["operations"],
  status: "ACTIVE",
};

describe("admin operations read models", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it("requires admin account context for the dashboard", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get("/api/v1/admin/dashboard").expect(401);
  });

  it("returns dashboard metrics for authorized admin users", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .get("/api/v1/admin/dashboard")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .expect(200);

    expect(response.body).toMatchObject({
      contractVersion: 1,
      metrics: [
        { key: "LIVE_AUCTIONS", label: "Live auctions", value: 3 },
        { key: "PENDING_APPROVALS", label: "Pending approvals", value: 18 },
        { key: "FEATURED_LOTS", label: "Featured lots", value: 42 },
        { key: "HIGH_RISK_ALERTS", label: "High-risk alerts", value: 2 },
      ],
    });
    expect(response.body.generatedAt).toEqual(expect.any(String));
  });

  it("returns final-bid approval read models without exposing editable hammer price fields", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .get("/api/v1/admin/final-bid-approvals")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .expect(200);

    expect(response.body).toMatchObject({
      contractVersion: 1,
      items: [
        {
          bidder: {
            accountId: "00000000-0000-4000-8000-000000000002",
            depositEligible: true,
            kycVerified: true,
          },
          hammerPrice: { amountFils: 56000000, currency: "AED" },
          lot: {
            lotId: "11111111-1111-4111-8111-111111111111",
            lotNumber: "214",
            titleEn: "Toyota Land Cruiser 2019",
          },
          reserveStatus: "MET",
          sequence: 12,
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain("reservePrice");
    expect(JSON.stringify(response.body)).not.toContain("proxy");
  });

  it("rejects restricted accounts", async () => {
    app = await createApp({ ...activeAccount, status: "RESTRICTED" });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get("/api/v1/admin/final-bid-approvals")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .expect(403);
  });
});

async function createApp(account: AccountSummary): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [AdminOperationsController],
    providers: [
      AdminPermissionGuard,
      {
        provide: AdminOperationsRepository,
        useValue: {
          getDashboardMetrics: vi.fn().mockResolvedValue([
            { key: "LIVE_AUCTIONS", label: "Live auctions", value: 3 },
            {
              key: "PENDING_APPROVALS",
              label: "Pending approvals",
              value: 18,
            },
            { key: "FEATURED_LOTS", label: "Featured lots", value: 42 },
            { key: "HIGH_RISK_ALERTS", label: "High-risk alerts", value: 2 },
          ]),
          listFinalBidApprovals: vi.fn().mockResolvedValue([
            {
              bidder: {
                accountId: "00000000-0000-4000-8000-000000000002",
                depositEligible: true,
                kycVerified: true,
              },
              closesAt: "2026-09-01T16:00:00.000Z",
              currentBid: { amountFils: 56000000, currency: "AED" },
              hammerPrice: { amountFils: 56000000, currency: "AED" },
              lot: {
                auctionId: "22222222-2222-4222-8222-222222222222",
                lotId: "11111111-1111-4111-8111-111111111111",
                lotNumber: "214",
                titleAr: "تويوتا لاند كروزر 2019",
                titleEn: "Toyota Land Cruiser 2019",
              },
              reserveStatus: "MET",
              sequence: 12,
              sla: {
                dueAt: "2026-09-01T17:00:00.000Z",
                overdue: false,
                remainingMs: 1800000,
              },
            },
          ]),
        },
      },
      {
        provide: IdentityService,
        useValue: {
          getAccountSummary: vi.fn().mockResolvedValue(account),
          hasPermission: (summary: AccountSummary, permission: string) =>
            summary.status === "ACTIVE" &&
            summary.permissions.includes(permission),
        },
      },
      SessionService,
    ],
  }).compile();

  const created = module.createNestApplication();
  await created.init();
  return created;
}
