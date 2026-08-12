import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditService } from "../src/audit/audit.service.js";
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
  permissions: ["admin.auctions.read", "admin.auctions.write"],
  roles: ["operations"],
  status: "ACTIVE",
};

describe("admin operations read models and final-bid decisions", () => {
  let app: INestApplication | undefined;
  let auditRecord: ReturnType<typeof vi.fn> | undefined;
  let operations: MockAdminOperationsRepository | undefined;

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

  it("approves final bids with audit metadata and unchanged hammer price", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post(
        "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/approve",
      )
      .set("x-pioneer-test-account-id", activeAccount.id)
      .set("x-correlation-id", "corr-approve")
      .send({})
      .expect(201);

    expect(response.body).toMatchObject({
      auditId: "audit-test-id",
      contractVersion: 1,
      decision: "APPROVED",
      hammerPrice: { amountFils: 56000000, currency: "AED" },
      lotId: "11111111-1111-4111-8111-111111111111",
      sequence: 12,
    });
    expect(operations?.approveFinalBid).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.final_bid.approve",
        actorAccountId: activeAccount.id,
        correlationId: "corr-approve",
        metadata: expect.objectContaining({
          hammerPriceFils: 56000000,
          sequence: 12,
        }),
        subjectId: "11111111-1111-4111-8111-111111111111",
        subjectType: "lot",
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain("reservePrice");
  });

  it("rejects final bids only with an approved reason code and audit reason", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post(
        "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/reject",
      )
      .set("x-pioneer-test-account-id", activeAccount.id)
      .set("x-correlation-id", "corr-reject")
      .send({ note: "Buyer documents did not clear.", reasonCode: "OTHER" })
      .expect(201);

    expect(response.body).toMatchObject({
      decision: "REJECTED",
      hammerPrice: { amountFils: 56000000, currency: "AED" },
      lotId: "11111111-1111-4111-8111-111111111111",
    });
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.final_bid.reject",
        reasonCode: "OTHER",
        metadata: expect.objectContaining({
          hammerPriceFils: 56000000,
          note: "Buyer documents did not clear.",
        }),
      }),
    );
  });

  it("rejects final-bid rejection commands without an approved reason code", async () => {
    app = await createApp(activeAccount);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(
        "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/reject",
      )
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({ note: "Missing code" })
      .expect(400);

    expect(operations?.rejectFinalBid).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("requires write permission for final-bid decisions", async () => {
    app = await createApp({
      ...activeAccount,
      permissions: ["admin.auctions.read"],
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(
        "/api/v1/admin/final-bid-approvals/11111111-1111-4111-8111-111111111111/approve",
      )
      .set("x-pioneer-test-account-id", activeAccount.id)
      .expect(403);
  });

  async function createApp(account: AccountSummary): Promise<INestApplication> {
    const repository = createRepository();
    const audit = vi.fn().mockResolvedValue("audit-test-id");
    operations = repository;
    auditRecord = audit;

    const module = await Test.createTestingModule({
      controllers: [AdminOperationsController],
      providers: [
        AdminPermissionGuard,
        {
          provide: AdminOperationsRepository,
          useValue: repository,
        },
        {
          provide: AuditService,
          useValue: { record: audit },
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
});

interface MockAdminOperationsRepository {
  readonly approveFinalBid: ReturnType<typeof vi.fn>;
  readonly getDashboardMetrics: ReturnType<typeof vi.fn>;
  readonly listFinalBidApprovals: ReturnType<typeof vi.fn>;
  readonly rejectFinalBid: ReturnType<typeof vi.fn>;
}

function createRepository(): MockAdminOperationsRepository {
  return {
    approveFinalBid: vi.fn().mockResolvedValue(decisionRecord()),
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
    rejectFinalBid: vi.fn().mockResolvedValue(decisionRecord()),
  };
}

function decisionRecord() {
  return {
    auctionId: "22222222-2222-4222-8222-222222222222",
    hammerPriceFils: 56000000,
    lotId: "11111111-1111-4111-8111-111111111111",
    sequence: 12,
  };
}
