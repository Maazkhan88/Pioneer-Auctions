import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditService } from "../src/audit/audit.service.js";
import { AdminLotsController } from "../src/auctions/admin-lots.controller.js";
import { LotsRepository } from "../src/auctions/lots.repository.js";
import {
  IdentityService,
  type AccountSummary,
} from "../src/identity/identity.service.js";
import { AdminPermissionGuard } from "../src/identity/admin-permission.guard.js";
import { SessionService } from "../src/identity/session.service.js";
import { PaymentsController } from "../src/payments/payments.controller.js";
import { PAYMENT_PROVIDER } from "../src/payments/payment-provider.js";

const activeAccount: AccountSummary = {
  displayName: "Ops Admin",
  id: "00000000-0000-4000-8000-000000000001",
  permissions: ["admin.auctions.read", "admin.auctions.write"],
  roles: ["operations"],
  status: "ACTIVE",
};

describe("admin lots and dummy payments foundation", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it("lists admin lots through RBAC", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get("/api/v1/admin/lots")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .expect(200)
      .expect([
        {
          auctionId: "22222222-2222-4222-8222-222222222222",
          closesAt: "2026-09-01T16:00:00.000Z",
          currentBidFils: null,
          id: "11111111-1111-4111-8111-111111111111",
          lifecycle: "DRAFT",
          lotNumber: "214",
          minimumIncrementFils: 100000,
          nextMinimumBidFils: 5000000,
          reservePriceFils: null,
          reserveStatus: "NOT_APPLICABLE",
          sequence: 0,
          startingBidFils: 5000000,
          startsAt: "2026-09-01T12:00:00.000Z",
          titleAr: "Lot Arabic",
          titleEn: "Lot English",
        },
      ]);
  });

  it("creates dummy deposit payment intents for test accounts", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post("/api/v1/deposit-payment-intents")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .set("x-correlation-id", "corr-payment-test")
      .send({ amountFils: 500000 })
      .expect(201);

    expect(response.body).toMatchObject({
      amountFils: 500000,
      provider: "dummy",
      status: "REQUIRES_ACTION",
    });
    expect(response.body.id).toMatch(/^dummy_/);
  });
});

async function createApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [AdminLotsController, PaymentsController],
    providers: [
      AdminPermissionGuard,
      SessionService,
      {
        provide: LotsRepository,
        useValue: {
          create: vi.fn(),
          list: vi.fn().mockResolvedValue([
            {
              auctionId: "22222222-2222-4222-8222-222222222222",
              closesAt: "2026-09-01T16:00:00.000Z",
              currentBidFils: null,
              id: "11111111-1111-4111-8111-111111111111",
              lifecycle: "DRAFT",
              lotNumber: "214",
              minimumIncrementFils: 100000,
              nextMinimumBidFils: 5000000,
              reservePriceFils: null,
              reserveStatus: "NOT_APPLICABLE",
              sequence: 0,
              startingBidFils: 5000000,
              startsAt: "2026-09-01T12:00:00.000Z",
              titleAr: "Lot Arabic",
              titleEn: "Lot English",
            },
          ]),
        },
      },
      {
        provide: AuditService,
        useValue: { record: vi.fn().mockResolvedValue("audit-id") },
      },
      {
        provide: IdentityService,
        useValue: {
          getAccountSummary: vi.fn().mockResolvedValue(activeAccount),
          hasPermission: (summary: AccountSummary, permission: string) =>
            summary.status === "ACTIVE" &&
            summary.permissions.includes(permission),
        },
      },
      {
        provide: PAYMENT_PROVIDER,
        useValue: {
          createIntent: vi.fn().mockResolvedValue({
            amountFils: 500000,
            id: "dummy_test",
            provider: "dummy",
            redirectUrl: "/api/v1/dummy-payments/dummy_test/complete",
            status: "REQUIRES_ACTION",
          }),
        },
      },
    ],
  }).compile();

  const created = module.createNestApplication();
  await created.init();
  return created;
}
