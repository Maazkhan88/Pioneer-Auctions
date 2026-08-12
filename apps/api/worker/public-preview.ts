interface PublicLotCard {
  readonly auctionId: string;
  readonly closesAt: string;
  readonly contractVersion: 1;
  readonly currentBid: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly lifecycle: string;
  readonly lotId: string;
  readonly lotNumber: string;
  readonly nextMinimumBid: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly reserveStatus: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

const publicPreviewLots: readonly PublicLotCard[] = [
  {
    auctionId: "22222222-2222-4222-8222-222222222222",
    closesAt: "2026-09-01T16:00:00.000Z",
    contractVersion: 1,
    currentBid: { amountFils: 56000000, currency: "AED" },
    lifecycle: "LIVE",
    lotId: "11111111-1111-4111-8111-111111111111",
    lotNumber: "214",
    nextMinimumBid: { amountFils: 56100000, currency: "AED" },
    reserveStatus: "MET",
    titleAr: "تويوتا لاند كروزر 2019",
    titleEn: "Toyota Land Cruiser 2019",
  },
  {
    auctionId: "33333333-3333-4333-8333-333333333333",
    closesAt: "2026-09-03T18:00:00.000Z",
    contractVersion: 1,
    currentBid: { amountFils: 220000000, currency: "AED" },
    lifecycle: "SCHEDULED",
    lotId: "44444444-4444-4444-8444-444444444444",
    lotNumber: "88",
    nextMinimumBid: { amountFils: 220000000, currency: "AED" },
    reserveStatus: "NOT_MET",
    titleAr: "شقة في دبي مارينا",
    titleEn: "Dubai Marina apartment",
  },
  {
    auctionId: "55555555-5555-4555-8555-555555555555",
    closesAt: "2026-09-05T15:30:00.000Z",
    contractVersion: 1,
    currentBid: { amountFils: 18500000, currency: "AED" },
    lifecycle: "PENDING_APPROVAL",
    lotId: "66666666-6666-4666-8666-666666666666",
    lotNumber: "331",
    nextMinimumBid: { amountFils: 19000000, currency: "AED" },
    reserveStatus: "NOT_APPLICABLE",
    titleAr: "حفارة كاتربيلر",
    titleEn: "Caterpillar excavator",
  },
] as const;

interface PublicLotsResponse {
  readonly contractVersion: 1;
  readonly items: readonly PublicLotCard[];
}

const jsonHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-origin": "*",
  "content-type": "application/json; charset=utf-8",
} as const;

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: jsonHeaders, status: 204 });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ mode: "public-preview", status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/lots") {
      return json(listPublicLots());
    }

    return json(
      {
        code: "NOT_FOUND",
        message: "Route not found in Pioneer public preview API.",
      },
      404,
    );
  },
};

function listPublicLots(): PublicLotsResponse {
  return {
    contractVersion: 1,
    items: publicPreviewLots,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: jsonHeaders,
    status,
  });
}
