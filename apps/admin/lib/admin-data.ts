import type {
  AdminAuctionItem,
  AdminAuditEventItem,
  AdminLotItem,
  Locale,
  Messages,
  Metric,
  QueueItem,
} from "../i18n/messages";
import { getAdminSessionConfig } from "./admin-session";
import type { AdminSessionConfig } from "./admin-session";

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
  readonly closesAt: string;
  readonly currentBidFils: number | null;
  readonly id: string;
  readonly lifecycle: string;
  readonly lotNumber: string;
  readonly minimumIncrementFils: number;
  readonly softCloseExtensionMs: number | null;
  readonly softCloseMaximumExtensions: number | null;
  readonly softCloseWindowMs: number | null;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

interface AdminAuctionApiResponse {
  readonly closesAt: string;
  readonly id: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

interface AdminAuditEventApiResponse {
  readonly action: string;
  readonly actorAccountId: string | null;
  readonly id: string;
  readonly occurredAt: string;
  readonly subjectId: string | null;
  readonly subjectType: string;
}

interface AdminAuditEventsApiResponse {
  readonly contractVersion: 1;
  readonly events: readonly AdminAuditEventApiResponse[];
  readonly generatedAt: string;
}

export interface AdminOperationsData {
  readonly auctions: readonly AdminAuctionItem[];
  readonly auditEvents: readonly AdminAuditEventItem[];
  readonly lots: readonly AdminLotItem[];
  readonly metrics: readonly Metric[];
  readonly queue: readonly QueueItem[];
  readonly session: AdminSessionConfig | null;
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
  const session = getAdminSessionConfig();
  if (session === null) {
    return staticFallback(messages, null);
  }

  try {
    const [dashboard, approvals, lots, auctions] = await Promise.all([
      fetchAdminJson<AdminDashboardApiResponse>(session, "/admin/dashboard"),
      fetchAdminJson<FinalBidApprovalsApiResponse>(
        session,
        "/admin/final-bid-approvals",
      ),
      fetchAdminJson<readonly AdminLotApiResponse[]>(session, "/admin/lots"),
      fetchAdminJson<readonly AdminAuctionApiResponse[]>(
        session,
        "/admin/auctions",
      ),
    ]);

    return {
      auctions: auctions.map((auction) => ({
        closesAt: auction.closesAt,
        id: auction.id,
        lifecycle: auction.lifecycle,
        startsAt: auction.startsAt,
        title: locale === "ar" ? auction.titleAr : auction.titleEn,
        titleAr: auction.titleAr,
        titleEn: auction.titleEn,
      })),
      auditEvents: await fetchAuditEvents(session),
      lots: lots.map((lot) => ({
        amount: formatAed(locale, lot.currentBidFils ?? 0),
        closesAt: lot.closesAt,
        id: lot.id,
        increment: formatAed(locale, lot.minimumIncrementFils),
        lifecycle: lot.lifecycle,
        lotNumber: lot.lotNumber,
        softCloseExtensionMs: lot.softCloseExtensionMs,
        softCloseMaximumExtensions: lot.softCloseMaximumExtensions,
        softCloseWindowMs: lot.softCloseWindowMs,
        startsAt: lot.startsAt,
        title: locale === "ar" ? lot.titleAr : lot.titleEn,
        titleAr: lot.titleAr,
        titleEn: lot.titleEn,
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
      session,
      source: "api",
    };
  } catch {
    return staticFallback(messages, session);
  }
}

function staticFallback(
  messages: Messages,
  session: AdminSessionConfig | null,
): AdminOperationsData {
  return {
    auctions: [],
    auditEvents: [],
    lots: [],
    metrics: messages.metrics,
    queue: messages.approvalQueue,
    session,
    source: "static-fallback",
  };
}

/**
 * `admin.audit.read` is a separate permission from `admin.auctions.read`
 * -- the seeded `operations` role does not have it, only `super_admin`
 * does. Fetched independently so a 403 here (a real, expected outcome for
 * most admin test accounts) does not collapse the rest of the page back
 * to static fallback.
 */
async function fetchAuditEvents(
  session: AdminSessionConfig,
): Promise<readonly AdminAuditEventItem[]> {
  try {
    const response = await fetchAdminJson<AdminAuditEventsApiResponse>(
      session,
      "/admin/audit-events",
    );
    return response.events.map((event) => ({
      action: event.action,
      actorAccountId: event.actorAccountId,
      id: event.id,
      occurredAt: event.occurredAt,
      subjectId: event.subjectId,
      subjectType: event.subjectType,
    }));
  } catch {
    return [];
  }
}

async function fetchAdminJson<TResponse>(
  session: AdminSessionConfig,
  path: string,
): Promise<TResponse> {
  const response = await fetch(`${session.apiBaseUrl}/api/v1${path}`, {
    cache: "no-store",
    headers: {
      "x-pioneer-test-account-id": session.testAccountId,
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

export function formatAuditEvent(
  locale: Locale,
  event: AdminAuditEventItem,
): string {
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(event.occurredAt));
  const actor =
    event.actorAccountId ?? (locale === "ar" ? "غير معروف" : "unknown");
  const subject =
    event.subjectId === null
      ? event.subjectType
      : `${event.subjectType} ${event.subjectId.slice(0, 8)}`;

  return `${event.action} · ${subject} · ${actor.slice(0, 8)} · ${when}`;
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
