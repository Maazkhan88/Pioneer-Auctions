import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditService } from "../src/audit/audit.service.js";
import { AdminAuctionsController } from "../src/auctions/admin-auctions.controller.js";
import { AuctionsRepository } from "../src/auctions/auctions.repository.js";
import { AdminPermissionGuard } from "../src/identity/admin-permission.guard.js";
import {
  IdentityService,
  type AccountSummary,
} from "../src/identity/identity.service.js";
import { SessionService } from "../src/identity/session.service.js";

const activeAdmin: AccountSummary = {
  displayName: "Ops Admin",
  id: "00000000-0000-4000-8000-000000000001",
  permissions: ["admin.auctions.read", "admin.auctions.write"],
  roles: ["operations"],
  status: "ACTIVE",
};

const auctionId = "22222222-2222-4222-8222-222222222222";

let auditRecord: ReturnType<typeof vi.fn> | undefined;
let auctionsRepository:
  | {
      readonly cancel: ReturnType<typeof vi.fn>;
      readonly create: ReturnType<typeof vi.fn>;
      readonly list: ReturnType<typeof vi.fn>;
      readonly pause: ReturnType<typeof vi.fn>;
      readonly resume: ReturnType<typeof vi.fn>;
    }
  | undefined;

describe("admin auctions foundation", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it("requires admin account context", async () => {
    app = await createApp(activeAdmin);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get("/api/v1/admin/auctions").expect(401);
  });

  it("lists auctions when the account has permission", async () => {
    app = await createApp(activeAdmin);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get("/api/v1/admin/auctions")
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .expect(200)
      .expect([
        {
          closesAt: "2026-09-01T16:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          lifecycle: "DRAFT",
          startsAt: "2026-09-01T12:00:00.000Z",
          titleAr: "مزاد تجريبي",
          titleEn: "Test Auction",
        },
      ]);
  });

  it("rejects restricted accounts even when permissions are assigned", async () => {
    app = await createApp({ ...activeAdmin, status: "RESTRICTED" });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get("/api/v1/admin/auctions")
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .expect(403);
  });

  it("pauses a live auction with an audit reason", async () => {
    app = await createApp(activeAdmin);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(`/api/v1/admin/auctions/${auctionId}/pause`)
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .set("x-correlation-id", "corr-admin-pause")
      .send({ note: "Storm delay", reason: "Operations hold" })
      .expect(201)
      .expect({
        auctionId,
        contractVersion: 1,
        decidedAt: "2026-09-01T13:00:00.000Z",
        decision: "PAUSED",
        lifecycle: "PAUSED",
      });

    expect(auctionsRepository?.pause).toHaveBeenCalledWith(auctionId);
    expect(auditRecord).toHaveBeenCalledWith({
      action: "admin.auctions.pause",
      actorAccountId: activeAdmin.id,
      correlationId: "corr-admin-pause",
      metadata: {
        decision: "PAUSED",
        lifecycle: "PAUSED",
        note: "Storm delay",
        reason: "Operations hold",
      },
      subjectId: auctionId,
      subjectType: "auction",
    });
  });

  it("resumes a paused auction with a required reason", async () => {
    app = await createApp(activeAdmin);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(`/api/v1/admin/auctions/${auctionId}/resume`)
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .send({ reason: "Issue cleared" })
      .expect(201)
      .expect({
        auctionId,
        contractVersion: 1,
        decidedAt: "2026-09-01T13:01:00.000Z",
        decision: "RESUMED",
        lifecycle: "LIVE",
      });
  });

  it("rejects auction cancel commands without a reason", async () => {
    app = await createApp(activeAdmin);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(`/api/v1/admin/auctions/${auctionId}/cancel`)
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .send({})
      .expect(400);

    expect(auctionsRepository?.cancel).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("requires write permission for auction control commands", async () => {
    app = await createApp({
      ...activeAdmin,
      permissions: ["admin.auctions.read"],
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(`/api/v1/admin/auctions/${auctionId}/pause`)
      .set("x-pioneer-test-account-id", activeAdmin.id)
      .send({ reason: "Operations hold" })
      .expect(403);

    expect(auctionsRepository?.pause).not.toHaveBeenCalled();
  });
});

async function createApp(account: AccountSummary): Promise<INestApplication> {
  const audit = vi.fn();
  const repository = {
    cancel: vi.fn().mockResolvedValue({
      auctionId,
      contractVersion: 1,
      decidedAt: "2026-09-01T13:02:00.000Z",
      decision: "CANCELLED",
      lifecycle: "CANCELLED",
    }),
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([
      {
        closesAt: "2026-09-01T16:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        lifecycle: "DRAFT",
        startsAt: "2026-09-01T12:00:00.000Z",
        titleAr: "مزاد تجريبي",
        titleEn: "Test Auction",
      },
    ]),
    pause: vi.fn().mockResolvedValue({
      auctionId,
      contractVersion: 1,
      decidedAt: "2026-09-01T13:00:00.000Z",
      decision: "PAUSED",
      lifecycle: "PAUSED",
    }),
    resume: vi.fn().mockResolvedValue({
      auctionId,
      contractVersion: 1,
      decidedAt: "2026-09-01T13:01:00.000Z",
      decision: "RESUMED",
      lifecycle: "LIVE",
    }),
  };
  auditRecord = audit;
  auctionsRepository = repository;

  const module = await Test.createTestingModule({
    controllers: [AdminAuctionsController],
    providers: [
      AdminPermissionGuard,
      {
        provide: AuctionsRepository,
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
