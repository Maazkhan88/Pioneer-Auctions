import { afterEach, describe, expect, it, vi } from "vitest";

import { groupByClosingDate, loadCalendarLots } from "../lib/calendar-data";
import type { CalendarLot } from "../lib/calendar-data";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const lotA: CalendarLot = {
  closesAt: "2026-09-01T10:00:00.000Z",
  currentBid: "AED 100",
  lifecycle: "LIVE",
  lotId: "lot-a",
  lotNumber: "Lot #1",
  title: "A",
};
const lotB: CalendarLot = {
  closesAt: "2026-09-01T08:00:00.000Z",
  currentBid: "AED 200",
  lifecycle: "LIVE",
  lotId: "lot-b",
  lotNumber: "Lot #2",
  title: "B",
};
const lotC: CalendarLot = {
  closesAt: "2026-09-03T12:00:00.000Z",
  currentBid: "AED 300",
  lifecycle: "SCHEDULED",
  lotId: "lot-c",
  lotNumber: "Lot #3",
  title: "C",
};

describe("groupByClosingDate", () => {
  it("groups lots by their UTC closing calendar day", () => {
    const groups = groupByClosingDate([lotA, lotB, lotC], "en");

    expect(groups).toHaveLength(2);
    expect(groups[0]?.isoDate).toBe("2026-09-01");
    expect(groups[0]?.lots.map((lot) => lot.lotId)).toEqual(["lot-b", "lot-a"]);
    expect(groups[1]?.isoDate).toBe("2026-09-03");
  });

  it("sorts groups chronologically regardless of input order", () => {
    const groups = groupByClosingDate([lotC, lotA, lotB], "en");

    expect(groups.map((group) => group.isoDate)).toEqual([
      "2026-09-01",
      "2026-09-03",
    ]);
  });

  it("returns an empty array for no lots", () => {
    expect(groupByClosingDate([], "en")).toEqual([]);
  });

  it("produces a locale-appropriate date label", () => {
    const [group] = groupByClosingDate([lotA], "en");
    expect(group?.dateLabel).toContain("September");

    const [arGroup] = groupByClosingDate([lotA], "ar");
    expect(arGroup?.dateLabel).toBeTruthy();
    expect(arGroup?.dateLabel).not.toBe(group?.dateLabel);
  });
});

describe("loadCalendarLots", () => {
  it("uses the static fallback when no public API is configured", async () => {
    vi.stubEnv("PIONEER_PUBLIC_API_BASE_URL", "");

    const lots = await loadCalendarLots("en");

    expect(lots.length).toBeGreaterThan(0);
    expect(lots.every((lot) => typeof lot.closesAt === "string")).toBe(true);
  });

  it("maps public API lots into calendar lots", async () => {
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
                currentBid: { amountFils: 56_000_000, currency: "AED" },
                lifecycle: "LIVE",
                lotId: "lot-x",
                lotNumber: "214",
                titleAr: "تويوتا",
                titleEn: "Toyota Land Cruiser 2019",
              },
            ],
          }),
          { status: 200 },
        );
      }),
    );

    const lots = await loadCalendarLots("en");

    expect(lots).toEqual([
      {
        closesAt: "2026-09-01T16:00:00.000Z",
        currentBid: expect.stringContaining("560,000"),
        lifecycle: "LIVE",
        lotId: "lot-x",
        lotNumber: "Lot #214",
        title: "Toyota Land Cruiser 2019",
      },
    ]);
  });

  it("falls back to static data on a network failure", async () => {
    vi.stubEnv("PIONEER_PUBLIC_API_BASE_URL", "https://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("network down");
      }),
    );

    const lots = await loadCalendarLots("en");

    expect(lots.length).toBeGreaterThan(0);
  });
});
