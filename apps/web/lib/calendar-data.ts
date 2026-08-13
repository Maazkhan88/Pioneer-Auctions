import type { Locale } from "../i18n/messages";

/**
 * Auction calendar data. There is no dedicated `GET /auctions` calendar
 * endpoint implemented in `apps/api/src` (confirmed by grepping every
 * `@Controller` -- only `PublicLotsController`'s flat `GET /api/v1/lots`
 * list exists for public consumption), so this reuses that same endpoint
 * and groups by each lot's real `closesAt` client-side, rather than
 * inventing a new contract. `apps/web/lib/home-data.ts`'s `PreviewLot`
 * discards the raw ISO `closesAt` after formatting it into a countdown
 * label, so this is a separate, small data loader rather than reusing that
 * one -- keeps the two call sites' evolution decoupled and avoids widening
 * `PreviewLot` for a need only this page has.
 */
export interface CalendarLot {
  readonly closesAt: string;
  readonly currentBid: string;
  readonly lifecycle: string;
  readonly lotId: string;
  readonly lotNumber: string;
  readonly title: string;
}

export interface CalendarGroup {
  readonly dateLabel: string;
  readonly isoDate: string;
  readonly lots: readonly CalendarLot[];
}

interface PublicLotsResponse {
  readonly contractVersion: 1;
  readonly items: readonly {
    readonly closesAt: string;
    readonly currentBid: {
      readonly amountFils: number;
      readonly currency: "AED";
    };
    readonly lifecycle: string;
    readonly lotId?: string;
    readonly lotNumber: string;
    readonly titleAr: string;
    readonly titleEn: string;
  }[];
}

export async function loadCalendarLots(
  locale: Locale,
): Promise<readonly CalendarLot[]> {
  const baseUrl = process.env.PIONEER_PUBLIC_API_BASE_URL;
  if (baseUrl === undefined || baseUrl.length === 0) {
    return staticFallback();
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/lots`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Public lots request failed with ${response.status}`);
    }
    const body = (await response.json()) as PublicLotsResponse;
    return body.items.map((lot) => ({
      closesAt: lot.closesAt,
      currentBid: formatAed(locale, lot.currentBid.amountFils),
      lifecycle: lot.lifecycle,
      lotId: lot.lotId ?? lot.lotNumber,
      lotNumber: `Lot #${lot.lotNumber}`,
      title: locale === "ar" ? lot.titleAr : lot.titleEn,
    }));
  } catch {
    return staticFallback();
  }
}

/**
 * Groups lots by their closing calendar day (UTC date, matching how
 * `closesAt` is stored/transmitted -- `docs/api-contracts.md` specifies UTC
 * ISO 8601 on the wire) and sorts both groups and lots within a group
 * chronologically. Pure and independent of `fetch`, so it's unit-testable
 * without stubbing the network.
 */
export function groupByClosingDate(
  lots: readonly CalendarLot[],
  locale: Locale,
): readonly CalendarGroup[] {
  const byDate = new Map<string, CalendarLot[]>();
  for (const lot of lots) {
    const isoDate = lot.closesAt.slice(0, 10);
    const bucket = byDate.get(isoDate);
    if (bucket === undefined) {
      byDate.set(isoDate, [lot]);
    } else {
      bucket.push(lot);
    }
  }

  const formatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-AE" : "en-AE",
    { day: "numeric", month: "long", timeZone: "UTC", weekday: "long" },
  );

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoDate, groupLots]) => ({
      dateLabel: formatter.format(new Date(`${isoDate}T00:00:00.000Z`)),
      isoDate,
      lots: [...groupLots].sort((a, b) => a.closesAt.localeCompare(b.closesAt)),
    }));
}

function staticFallback(): readonly CalendarLot[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      closesAt: new Date(now + 14 * day).toISOString(),
      currentBid: "AED 560,000",
      lifecycle: "LIVE",
      lotId: "11111111-1111-4111-8111-111111111111",
      lotNumber: "Lot #214",
      title: "Toyota Land Cruiser 2019",
    },
    {
      closesAt: new Date(now + 16 * day).toISOString(),
      currentBid: "AED 2,200,000",
      lifecycle: "SCHEDULED",
      lotId: "44444444-4444-4444-8444-444444444444",
      lotNumber: "Lot #88",
      title: "Dubai Marina apartment",
    },
    {
      closesAt: new Date(now + 16 * day + 3 * 3_600_000).toISOString(),
      currentBid: "AED 185,000",
      lifecycle: "LIVE",
      lotId: "66666666-6666-4666-8666-666666666666",
      lotNumber: "Lot #331",
      title: "Caterpillar excavator",
    },
  ];
}

function formatAed(locale: Locale, amountFils: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}
