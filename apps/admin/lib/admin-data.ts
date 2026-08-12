import type {
  AdminLotItem,
  Locale,
  Messages,
  Metric,
  QueueItem,
} from "../i18n/messages";

type DashboardMetricKey =
  "FEATURED_LOTS" | "HIGH_RISK_ALERTS" | "LIVE_AUCTIONS" | "PENDING_APPROVALS";

interface AdminDashboardApiResponse {
  readonly contractVersion: 1;
  readonly generatedAt: string;
  readonly metrics: readonly {
    readonly key: DashboardMetricKey;
    readonly label: string;
    readonly value: number;
  }[];
}

interface FinalBidApprovalsApiResponse {
  readonly contractVersion: 1;
  readonly generatedAt: string;
  readonly items: readonly {
    readonly hammerPrice: {
      readonly amountFils: number;
      readonly currency: "AED";
    };
    readonly lot: {
      readonly lotId: string;
      readonly lotNumber: string;
      readonly titleAr: string;
      readonly titleEn: string;
    };
    readonly reserveStatus: "MET" | "NOT_APPLICABLE" | "NOT_MET";
    readonly sla: {
      readonly overdue: boolean;
      readonly remainingMs: number;
    };
  }[];
}

interface AdminLotApiResponse {
  readonly currentBidFils: number | null;
  readonly lifecycle: string;
  readonly lotNumber: string;
  readonly minimumIncrementFils: number;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminOperationsData {
  readonly lots: readonly AdminLotItem[];
  readonly metrics: readonly Metric[];
  readonly queue: readonly QueueItem[];
  readonly source: "api" | "static-fallback";
}

const metricToneByKey: Record<DashboardMetricKey, Metric["tone"]> = {
  FEATURED_LOTS: "brand",
  HIGH_RISK_ALERTS: "danger",
  LIVE_AUCTIONS: "success",
  PENDING_APPROVALS: "warning",
};

const metricLabels: Record<Locale, Record<DashboardMetricKey, string>> = {
  ar: {
    FEATURED_LOTS: "قطع مميزة",
    HIGH_RISK_ALERTS: "تنبيهات عالية الخطورة",
    LIVE_AUCTIONS: "مزادات مباشرة",
    PENDING_APPROVALS: "اعتمادات معلقة",
  },
  en: {
    FEATURED_LOTS: "Featured lots",
    HIGH_RISK_ALERTS: "High-risk alerts",
    LIVE_AUCTIONS: "Live auctions",
    PENDING_APPROVALS: "Pending approvals",
  },
};

export async function loadAdminOperationsData(
  locale: Locale,
  messages: Messages,
): Promise<AdminOperationsData> {
  const baseUrl = process.env.PIONEER_ADMIN_API_BASE_URL;
  if (baseUrl === undefined || baseUrl.length === 0) {
    return staticFallback(messages);
  }

  try {
    const [dashboard, approvals, lots] = await Promise.all([
      fetchAdminJson<AdminDashboardApiResponse>(baseUrl, "/admin/dashboard"),
      fetchAdminJson<FinalBidApprovalsApiResponse>(
        baseUrl,
        "/admin/final-bid-approvals",
      ),
      fetchAdminJson<readonly AdminLotApiResponse[]>(baseUrl, "/admin/lots"),
    ]);

    return {
      lots: lots.map((lot) => ({
        amount: formatAed(locale, lot.currentBidFils ?? 0),
        increment: formatAed(locale, lot.minimumIncrementFils),
        lifecycle: lot.lifecycle,
        lotNumber: lot.lotNumber,
        title: locale === "ar" ? lot.titleAr : lot.titleEn,
      })),
      metrics: dashboard.metrics.map((metric) => ({
        label: metricLabels[locale][metric.key],
        tone: metricToneByKey[metric.key],
        value: String(metric.value),
      })),
      queue: approvals.items.map((item) => ({
        approveEndpoint: `/api/v1/admin/final-bid-approvals/${item.lot.lotId}/approve`,
        amount: formatAed(locale, item.hammerPrice.amountFils),
        lotId: item.lot.lotId,
        meta: [
          `Lot #${item.lot.lotNumber}`,
          locale === "ar" ? item.lot.titleAr : item.lot.titleEn,
        ].join(" · "),
        rejectEndpoint: `/api/v1/admin/final-bid-approvals/${item.lot.lotId}/reject`,
        sla: formatSla(locale, item.sla),
        title:
          item.reserveStatus === "MET"
            ? messages.reserveMetApprovalTitle
            : messages.finalBidApprovalTitle,
      })),
      source: "api",
    };
  } catch {
    return staticFallback(messages);
  }
}

function staticFallback(messages: Messages): AdminOperationsData {
  return {
    lots: [],
    metrics: messages.metrics,
    queue: messages.approvalQueue,
    source: "static-fallback",
  };
}

async function fetchAdminJson<TResponse>(
  baseUrl: string,
  path: string,
): Promise<TResponse> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
    cache: "no-store",
    headers: {
      "x-pioneer-test-account-id":
        process.env.PIONEER_ADMIN_TEST_ACCOUNT_ID ??
        "00000000-0000-4000-8000-000000000001",
    },
  });
  if (!response.ok) {
    throw new Error(`Admin API request failed with ${response.status}`);
  }
  return (await response.json()) as TResponse;
}

function formatAed(locale: Locale, amountFils: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}

function formatSla(
  locale: Locale,
  sla: FinalBidApprovalsApiResponse["items"][number]["sla"],
): string {
  const absoluteMinutes = Math.max(
    1,
    Math.round(Math.abs(sla.remainingMs) / 60_000),
  );
  const value =
    absoluteMinutes >= 60
      ? `${Math.round(absoluteMinutes / 60)} h`
      : `${absoluteMinutes} min`;

  if (locale === "ar") {
    return sla.overdue ? `متأخر ${value}` : `متبقٍ ${value}`;
  }
  return sla.overdue ? `${value} overdue` : `${value} remaining`;
}
