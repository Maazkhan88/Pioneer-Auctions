import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LotsRepository } from "../src/auctions/lots.repository.js";
import { PublicLotsController } from "../src/auctions/public-lots.controller.js";

describe("public lots", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns sanitized dummy lot cards without admin-only fields", async () => {
    vi.stubEnv("PIONEER_ADMIN_DUMMY_LOTS", "1");
    const module = await Test.createTestingModule({
      controllers: [PublicLotsController],
      providers: [
        {
          provide: LotsRepository,
          useValue: new LotsRepository({ query: vi.fn() } as never),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server).get("/api/v1/lots").expect(200);

    expect(response.body.contractVersion).toBe(1);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).toMatchObject({
      contractVersion: 1,
      currentBid: { amountFils: 56000000, currency: "AED" },
      lifecycle: "LIVE",
      lotNumber: "214",
      reserveStatus: "MET",
      titleEn: "Toyota Land Cruiser 2019",
    });
    expect(JSON.stringify(response.body)).not.toContain("reservePriceFils");
    expect(JSON.stringify(response.body)).not.toContain("minimumIncrement");
  });

  it("returns a single public lot card by lotId", async () => {
    vi.stubEnv("PIONEER_ADMIN_DUMMY_LOTS", "1");
    const module = await Test.createTestingModule({
      controllers: [PublicLotsController],
      providers: [
        {
          provide: LotsRepository,
          useValue: new LotsRepository({ query: vi.fn() } as never),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get("/api/v1/lots/11111111-1111-4111-8111-111111111111")
      .expect(200);

    expect(response.body).toMatchObject({
      contractVersion: 1,
      currentBid: { amountFils: 56000000, currency: "AED" },
      lifecycle: "LIVE",
      lotId: "11111111-1111-4111-8111-111111111111",
      lotNumber: "214",
      reserveStatus: "MET",
      titleEn: "Toyota Land Cruiser 2019",
    });
    expect(JSON.stringify(response.body)).not.toContain("reservePriceFils");
    expect(JSON.stringify(response.body)).not.toContain("minimumIncrement");
  });

  it("returns 404 when a lotId does not exist", async () => {
    vi.stubEnv("PIONEER_ADMIN_DUMMY_LOTS", "1");
    const module = await Test.createTestingModule({
      controllers: [PublicLotsController],
      providers: [
        {
          provide: LotsRepository,
          useValue: new LotsRepository({ query: vi.fn() } as never),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get("/api/v1/lots/00000000-0000-0000-0000-000000000000")
      .expect(404);

    expect(response.body).toMatchObject({
      code: "LOT_NOT_FOUND",
      message: "Lot not found",
    });
  });
});
