import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LotsRepository } from "../src/auctions/lots.repository.js";
import { PublicLotsController } from "../src/auctions/public-lots.controller.js";

describe("public lots search & filtering", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function createApp(): Promise<Parameters<typeof request>[0]> {
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
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it("filters lots by text query across title and lot number", async () => {
    const server = await createApp();

    // Query "Toyota"
    const res1 = await request(server).get("/api/v1/lots?q=Toyota").expect(200);
    expect(res1.body.total).toBe(1);
    expect(res1.body.items).toHaveLength(1);
    expect(res1.body.items[0].titleEn).toContain("Toyota");

    // Query lot number "214"
    const res2 = await request(server).get("/api/v1/lots?q=214").expect(200);
    expect(res2.body.total).toBe(1);
    expect(res2.body.items[0].lotNumber).toBe("214");

    // Query nonexistent text
    const res3 = await request(server)
      .get("/api/v1/lots?q=NonExistentModel999")
      .expect(200);
    expect(res3.body.total).toBe(0);
    expect(res3.body.items).toHaveLength(0);
  });

  it("filters lots by lifecycle status", async () => {
    const server = await createApp();

    const liveRes = await request(server)
      .get("/api/v1/lots?status=LIVE")
      .expect(200);
    expect(liveRes.body.total).toBe(1);
    expect(liveRes.body.items[0].lifecycle).toBe("LIVE");
    expect(liveRes.body.items[0].titleEn).toContain("Toyota");

    const scheduledRes = await request(server)
      .get("/api/v1/lots?status=SCHEDULED")
      .expect(200);
    expect(scheduledRes.body.total).toBe(1);
    expect(scheduledRes.body.items[0].lifecycle).toBe("SCHEDULED");
    expect(scheduledRes.body.items[0].titleEn).toContain("Dubai Marina");
  });

  it("filters lots by min and max price fils", async () => {
    const server = await createApp();

    // Min price 100,000 AED = 100,000,000 fils (Dubai Marina apartment @ 220,000,000 fils)
    const highPriceRes = await request(server)
      .get("/api/v1/lots?minPriceFils=100000000")
      .expect(200);
    expect(highPriceRes.body.total).toBe(1);
    expect(highPriceRes.body.items[0].titleEn).toContain("Dubai Marina");

    // Max price 40,000 AED = 40,000,000 fils (Caterpillar excavator @ 18,500,000 fils)
    const lowPriceRes = await request(server)
      .get("/api/v1/lots?maxPriceFils=40000000")
      .expect(200);
    expect(lowPriceRes.body.total).toBe(1);
    expect(lowPriceRes.body.items[0].titleEn).toContain("Caterpillar");
  });

  it("sorts lots by price ascending and descending", async () => {
    const server = await createApp();

    const ascRes = await request(server)
      .get("/api/v1/lots?sort=price_asc")
      .expect(200);
    expect(ascRes.body.items).toHaveLength(3);
    const ascPrices = ascRes.body.items.map(
      (i: { currentBid: { amountFils: number } }) => i.currentBid.amountFils,
    );
    expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));

    const descRes = await request(server)
      .get("/api/v1/lots?sort=price_desc")
      .expect(200);
    expect(descRes.body.items).toHaveLength(3);
    const descPrices = descRes.body.items.map(
      (i: { currentBid: { amountFils: number } }) => i.currentBid.amountFils,
    );
    expect(descPrices).toEqual([...descPrices].sort((a, b) => b - a));
  });

  it("paginates lots with limit and offset", async () => {
    const server = await createApp();

    const page1 = await request(server)
      .get("/api/v1/lots?limit=2&offset=0")
      .expect(200);
    expect(page1.body.total).toBe(3);
    expect(page1.body.limit).toBe(2);
    expect(page1.body.offset).toBe(0);
    expect(page1.body.items).toHaveLength(2);

    const page2 = await request(server)
      .get("/api/v1/lots?limit=2&offset=2")
      .expect(200);
    expect(page2.body.total).toBe(3);
    expect(page2.body.limit).toBe(2);
    expect(page2.body.offset).toBe(2);
    expect(page2.body.items).toHaveLength(1);
  });
});
