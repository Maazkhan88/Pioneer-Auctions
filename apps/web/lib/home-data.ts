import type { Locale, Messages, PreviewLot } from "../i18n/messages";

interface PublicLotsResponse {
  readonly contractVersion: 1;
  readonly items: readonly {
    readonly closesAt: string;
    readonly currentBid: {
      readonly amountFils: number;
      readonly currency: "AED";
    };
    readonly lifecycle: string;
    readonly lotNumber: string;
    readonly nextMinimumBid: {
      readonly amountFils: number;
      readonly currency: "AED";
    };
    readonly reserveStatus: string;
    readonly titleAr: string;
    readonly titleEn: string;
  }[];
}

export interface BuyerHomeData {
  readonly lots: readonly PreviewLot[];
  readonly source: "api" | "static-fallback";
}

export async function loadBuyerHomeData(
  locale: Locale,
  messages: Messages,
): Promise<BuyerHomeData> {
  void messages;
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
    return {
      lots: body.items.map((lot, index) => ({
        badge: badgeFor(locale, lot.lifecycle),
        bids: lot.lifecycle === "SCHEDULED" ? "0 bids" : "Live bidding",
        category: categoryFor(locale, index),
        closesIn: formatCountdownLabel(locale, lot.closesAt),
        imageClass: imageClassFor(index),
        increment: formatAed(locale, lot.nextMinimumBid.amountFils),
        lotNumber: `Lot #${lot.lotNumber}`,
        price: formatAed(locale, lot.currentBid.amountFils),
        reserve: reserveLabel(locale, lot.reserveStatus),
        status: statusFor(lot.lifecycle),
        title: locale === "ar" ? lot.titleAr : lot.titleEn,
      })),
      source: "api",
    };
  } catch {
    return staticFallback();
  }
}

function staticFallback(): BuyerHomeData {
  return {
    lots: [
      {
        badge: "Live",
        bids: "Live bidding",
        category: "Automotive",
        closesIn: "14d",
        imageClass: "m3-lot-car",
        increment: "AED 561,000",
        lotNumber: "Lot #214",
        price: "AED 560,000",
        reserve: "Reserve met",
        status: "winning",
        title: "Toyota Land Cruiser 2019",
      },
      {
        badge: "Upcoming",
        bids: "0 bids",
        category: "Real estate",
        closesIn: "16d",
        imageClass: "m3-lot-material",
        increment: "AED 2,200,000",
        lotNumber: "Lot #88",
        price: "AED 2,200,000",
        reserve: "Reserve not met",
        status: "neutral",
        title: "Dubai Marina apartment",
      },
      {
        badge: "Live",
        bids: "Live bidding",
        category: "Heavy equipment",
        closesIn: "18d",
        imageClass: "m3-lot-equipment",
        increment: "AED 190,000",
        lotNumber: "Lot #331",
        price: "AED 185,000",
        reserve: "No reserve",
        status: "outbid",
        title: "Caterpillar excavator",
      },
    ],
    source: "static-fallback",
  };
}

function badgeFor(locale: Locale, lifecycle: string): string {
  if (locale === "ar") {
    return lifecycle === "SCHEDULED" ? "قريباً" : "مباشر";
  }
  return lifecycle === "SCHEDULED" ? "Upcoming" : "Live";
}

function categoryFor(locale: Locale, index: number): string {
  const english = ["Automotive", "Real estate", "Heavy equipment"];
  const arabic = ["سيارات", "عقارات", "معدات ثقيلة"];
  return (locale === "ar" ? arabic : english)[index % 3] ?? "Automotive";
}

function formatAed(locale: Locale, amountFils: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}

function formatCountdownLabel(locale: Locale, closesAt: string): string {
  const closesAtMs = new Date(closesAt).getTime();
  const remainingMinutes = Math.max(
    1,
    Math.round((closesAtMs - Date.now()) / 60_000),
  );
  if (remainingMinutes >= 1440) {
    const days = Math.round(remainingMinutes / 1440);
    return locale === "ar" ? `${days} يوم` : `${days}d`;
  }
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:00`;
}

function imageClassFor(index: number): string {
  return ["m3-lot-car", "m3-lot-material", "m3-lot-equipment"][index % 3]!;
}

function reserveLabel(locale: Locale, reserveStatus: string): string {
  if (reserveStatus === "MET") {
    return locale === "ar" ? "تم بلوغ الاحتياطي" : "Reserve met";
  }
  if (reserveStatus === "NOT_APPLICABLE") {
    return locale === "ar" ? "بدون احتياطي" : "No reserve";
  }
  return locale === "ar" ? "لم يبلغ الاحتياطي" : "Reserve not met";
}

function statusFor(lifecycle: string): PreviewLot["status"] {
  if (lifecycle === "LIVE") {
    return "winning";
  }
  if (lifecycle === "PENDING_APPROVAL") {
    return "outbid";
  }
  return "neutral";
}
