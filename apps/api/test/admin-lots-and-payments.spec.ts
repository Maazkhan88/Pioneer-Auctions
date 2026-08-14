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

let auditRecord: ReturnType<typeof vi.fn> | undefined;
let lotsRepository:
  | {
      readonly create: ReturnType<typeof vi.fn>;
      readonly createMany: ReturnType<typeof vi.fn>;
      readonly list: ReturnType<typeof vi.fn>;
      readonly update: ReturnType<typeof vi.fn>;
    }
  | undefined;

const validLotRow = {
  auctionId: "22222222-2222-4222-8222-222222222222",
  closesAt: "2026-09-08T18:00:00.000Z",
  lotNumber: "301",
  minimumIncrementPercentBps: 500,
  startingBidFils: 5000000,
  startsAt: "2026-09-08T14:00:00.000Z",
  titleAr: "قطعة تجريبية",
  titleEn: "Test lot",
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

  it("updates a lot's title/schedule/soft-close fields through RBAC", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .patch("/api/v1/admin/lots/11111111-1111-4111-8111-111111111111")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .set("x-correlation-id", "corr-lot-update")
      .send({ titleEn: "Toyota Land Cruiser 2020" })
      .expect(200);

    expect(response.body).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      titleEn: "Toyota Land Cruiser 2020",
    });
    expect(lotsRepository?.update).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      { titleEn: "Toyota Land Cruiser 2020" },
    );
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.lots.update",
        actorAccountId: activeAccount.id,
        correlationId: "corr-lot-update",
        metadata: { fields: ["titleEn"] },
        subjectId: "11111111-1111-4111-8111-111111111111",
        subjectType: "lot",
      }),
    );
  });

  it("rejects lot update commands with no fields", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch("/api/v1/admin/lots/11111111-1111-4111-8111-111111111111")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({})
      .expect(400);

    expect(lotsRepository?.update).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("requires write permission for lot update commands", async () => {
    app = await createApp({
      ...activeAccount,
      permissions: ["admin.auctions.read"],
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch("/api/v1/admin/lots/11111111-1111-4111-8111-111111111111")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({ titleEn: "New title" })
      .expect(403);

    expect(lotsRepository?.update).not.toHaveBeenCalled();
  });

  it("dry-runs a bulk import without committing", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post("/api/v1/admin/lots/bulk-import")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({ dryRun: true, rows: [validLotRow] })
      .expect(201);

    expect(response.body).toMatchObject({
      committed: false,
      results: [{ index: 0, ok: true }],
      rowCount: 1,
      validCount: 1,
    });
    expect(lotsRepository?.createMany).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("refuses to commit a bulk import when any row is invalid, and reports which rows failed", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post("/api/v1/admin/lots/bulk-import")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({
        dryRun: false,
        rows: [validLotRow, { ...validLotRow, titleEn: "" }],
      })
      .expect(201);

    expect(response.body.committed).toBe(false);
    expect(response.body.validCount).toBe(1);
    expect(response.body.results[0]).toMatchObject({ index: 0, ok: true });
    expect(response.body.results[1]).toMatchObject({ index: 1, ok: false });
    expect(response.body.results[1].errors).toBeDefined();
    expect(lotsRepository?.createMany).not.toHaveBeenCalled();
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("commits a bulk import in one transaction when every row is valid", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server)
      .post("/api/v1/admin/lots/bulk-import")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .set("x-correlation-id", "corr-bulk-import")
      .send({ dryRun: false, rows: [validLotRow] })
      .expect(201);

    expect(response.body).toMatchObject({
      committed: true,
      rowCount: 1,
      validCount: 1,
    });
    expect(lotsRepository?.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ lotNumber: "301" }),
    ]);
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.lots.bulk_import",
        actorAccountId: activeAccount.id,
        correlationId: "corr-bulk-import",
        metadata: { rowCount: 1 },
      }),
    );
  });

  it("requires write permission for bulk import", async () => {
    app = await createApp({
      ...activeAccount,
      permissions: ["admin.auctions.read"],
    });
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/api/v1/admin/lots/bulk-import")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({ dryRun: true, rows: [validLotRow] })
      .expect(403);

    expect(lotsRepository?.createMany).not.toHaveBeenCalled();
  });

  it("rejects bulk import bodies with no rows", async () => {
    app = await createApp();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post("/api/v1/admin/lots/bulk-import")
      .set("x-pioneer-test-account-id", activeAccount.id)
      .send({ dryRun: true, rows: [] })
      .expect(400);
  });

  it("can serve backend dummy lots when explicitly enabled", async () => {
    vi.stubEnv("PIONEER_ADMIN_DUMMY_LOTS", "1");
    const repository = new LotsRepository({
      query: vi.fn(),
    } as never);

    const lots = await repository.list();

    expect(lots).toHaveLength(3);
    expect(lots[0]).toMatchObject({
      lifecycle: "LIVE",
      lotNumber: "214",
      titleEn: "Toyota Land Cruiser 2019",
    });
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

async function createApp(
  account: AccountSummary = activeAccount,
): Promise<INestApplication> {
  const repository = {
    create: vi.fn(),
    createMany: vi.fn().mockImplementation((inputs: readonly unknown[]) =>
      Promise.resolve(
        inputs.map((_input, index) => ({
          auctionId: "22222222-2222-4222-8222-222222222222",
          closesAt: "2026-09-08T18:00:00.000Z",
          currentBidFils: null,
          id: `bulk-lot-${index}`,
          lifecycle: "SCHEDULED",
          lotNumber: "301",
          minimumIncrementFils: 250000,
          nextMinimumBidFils: 5000000,
          reservePriceFils: null,
          reserveStatus: "NOT_APPLICABLE",
          sequence: 0,
          startingBidFils: 5000000,
          startsAt: "2026-09-08T14:00:00.000Z",
          titleAr: "قطعة تجريبية",
          titleEn: "Test lot",
        })),
      ),
    ),
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
    update: vi.fn().mockResolvedValue({
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
      titleEn: "Toyota Land Cruiser 2020",
    }),
  };
  const audit = vi.fn().mockResolvedValue("audit-id");
  lotsRepository = repository;
  auditRecord = audit;

  const module = await Test.createTestingModule({
    controllers: [AdminLotsController, PaymentsController],
    providers: [
      AdminPermissionGuard,
      SessionService,
      {
        provide: LotsRepository,
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
