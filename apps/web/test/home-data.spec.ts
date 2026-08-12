import { afterEach, describe, expect, it, vi } from "vitest";

import { messagesFor } from "../i18n/messages";
import { loadBuyerHomeData } from "../lib/home-data";

describe("buyer home data adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses static fallback lots when no public API is configured", async () => {
    vi.stubEnv("PIONEER_PUBLIC_API_BASE_URL", "");

    const data = await loadBuyerHomeData("en", messagesFor("en"));

    expect(data.source).toBe("static-fallback");
    expect(data.lots.map((lot) => lot.title)).toEqual([
      "Toyota Land Cruiser 2019",
      "Dubai Marina apartment",
      "Caterpillar excavator",
    ]);
  });

  it("maps public backend lots into homepage cards", async () => {
    vi.stubEnv("PIONEER_PUBLIC_API_BASE_URL", "https://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        expect(String(input)).toBe("https://api.test/api/v1/lots");
        return new Response(
          JSON.stringify({
            contractVersion: 1,
            items: [
              {
                closesAt: "2026-09-01T16:00:00.000Z",
                currentBid: { amountFils: 56000000, currency: "AED" },
                lifecycle: "LIVE",
                lotNumber: "214",
                nextMinimumBid: { amountFils: 56100000, currency: "AED" },
                reserveStatus: "MET",
                titleAr: "تويوتا لاند كروزر 2019",
                titleEn: "Toyota Land Cruiser 2019",
              },
            ],
          }),
          { status: 200 },
        );
      }),
    );

    const data = await loadBuyerHomeData("en", messagesFor("en"));

    expect(data).toMatchObject({
      lots: [
        {
          badge: "Live",
          lotNumber: "Lot #214",
          reserve: "Reserve met",
          status: "winning",
          title: "Toyota Land Cruiser 2019",
        },
      ],
      source: "api",
    });
    expect(data.lots[0]?.price).toContain("560,000");
  });
});
