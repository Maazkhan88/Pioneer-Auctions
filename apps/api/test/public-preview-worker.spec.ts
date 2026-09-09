import { describe, expect, it } from "vitest";

import worker from "../worker/public-preview.js";

describe("public preview worker", () => {
  it("serves backend-shaped dummy lots", async () => {
    const response = worker.fetch(
      new Request("https://pioneer-auctions-api.test/api/v1/lots"),
    );

    const body = await response.json();

    expect(body).toHaveProperty("contractVersion", 1);
    expect(body).toHaveProperty("items");

    const items = (body as { readonly items: readonly unknown[] }).items;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      contractVersion: 1,
      currentBid: { currency: "AED" },
      lotId: "11111111-1111-4111-8111-111111111111",
      lotNumber: "214",
      nextMinimumBid: { currency: "AED" },
    });
  });

  it("serves a single dummy lot by ID", async () => {
    const response = worker.fetch(
      new Request(
        "https://pioneer-auctions-api.test/api/v1/lots/11111111-1111-4111-8111-111111111111",
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      contractVersion: 1,
      currentBid: { currency: "AED" },
      lotId: "11111111-1111-4111-8111-111111111111",
      lotNumber: "214",
      titleEn: "Toyota Land Cruiser 2019",
    });
  });

  it("returns 404 for nonexistent lot ID", async () => {
    const response = worker.fetch(
      new Request(
        "https://pioneer-auctions-api.test/api/v1/lots/00000000-0000-0000-0000-000000000000",
      ),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toMatchObject({
      code: "LOT_NOT_FOUND",
    });
  });
});
