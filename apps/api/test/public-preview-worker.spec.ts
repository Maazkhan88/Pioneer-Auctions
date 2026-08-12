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
});
