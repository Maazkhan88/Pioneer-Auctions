import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditService } from "../src/audit/audit.service.js";
import { AdminAuctionsController } from "../src/auctions/admin-auctions.controller.js";
import { AuctionsRepository } from "../src/auctions/auctions.repository.js";
import {
  IdentityService,
  type AccountSummary,
} from "../src/identity/identity.service.js";
import { AdminPermissionGuard } from "../src/identity/admin-permission.guard.js";

const activeAdmin: AccountSummary = {
  displayName: "Ops Admin",
  id: "00000000-0000-4000-8000-000000000001",
  permissions: ["admin.auctions.read", "admin.auctions.write"],
  roles: ["operations"],
  status: "ACTIVE",
};

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
});

async function createApp(account: AccountSummary): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [AdminAuctionsController],
    providers: [
      AdminPermissionGuard,
      {
        provide: AuctionsRepository,
        useValue: {
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
        },
      },
      {
        provide: AuditService,
        useValue: { record: vi.fn() },
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
    ],
  }).compile();

  const created = module.createNestApplication();
  await created.init();
  return created;
}
