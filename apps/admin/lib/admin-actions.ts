export type FinalBidRejectionReasonCode =
  | "BUYER_ELIGIBILITY_FAILED"
  | "DOCUMENTATION_INCOMPLETE"
  | "OTHER"
  | "RESERVE_NOT_MET"
  | "SELLER_WITHDRAWN";

export interface AdminActionRuntime {
  readonly apiBaseUrl: string;
  readonly correlationId: string;
  readonly testAccountId: string;
}

export type FinalBidDecisionCommand =
  | (AdminActionRuntime & {
      readonly endpoint: string;
      readonly type: "approve";
    })
  | (AdminActionRuntime & {
      readonly endpoint: string;
      readonly note?: string;
      readonly reasonCode: FinalBidRejectionReasonCode;
      readonly type: "reject";
    });

export interface FinalBidDecisionResponse {
  readonly auditId: string;
  readonly contractVersion: 1;
  readonly decidedAt: string;
  readonly decision: "APPROVED" | "REJECTED";
  readonly hammerPrice: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly lotId: string;
  readonly sequence: number;
}

export async function submitFinalBidDecision(
  command: FinalBidDecisionCommand,
): Promise<FinalBidDecisionResponse> {
  return postAdminJson<FinalBidDecisionResponse>(command, command.endpoint, {
    body:
      command.type === "reject"
        ? { note: command.note, reasonCode: command.reasonCode }
        : {},
  });
}

export interface AuctionControlCommand extends AdminActionRuntime {
  readonly auctionId: string;
  readonly note?: string;
  readonly reason: string;
  readonly type: "cancel" | "pause" | "resume";
}

export interface AdminAuctionControlResult {
  readonly auctionId: string;
  readonly contractVersion: 1;
  readonly decidedAt: string;
  readonly decision: "CANCELLED" | "PAUSED" | "RESUMED";
  readonly lifecycle: string;
}

export async function submitAuctionControl(
  command: AuctionControlCommand,
): Promise<AdminAuctionControlResult> {
  return postAdminJson<AdminAuctionControlResult>(
    command,
    `/admin/auctions/${command.auctionId}/${command.type}`,
    { body: { note: command.note, reason: command.reason } },
  );
}

export interface CreateAuctionCommand extends AdminActionRuntime {
  readonly closesAt: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminAuctionView {
  readonly closesAt: string;
  readonly id: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export async function submitCreateAuction(
  command: CreateAuctionCommand,
): Promise<AdminAuctionView> {
  return postAdminJson<AdminAuctionView>(command, "/admin/auctions", {
    body: {
      closesAt: command.closesAt,
      startsAt: command.startsAt,
      titleAr: command.titleAr,
      titleEn: command.titleEn,
    },
  });
}

export type CreateLotIncrement =
  | { readonly mode: "custom"; readonly minimumIncrementFils: number }
  | { readonly mode: "percent"; readonly minimumIncrementPercentBps: number };

export interface CreateLotCommand extends AdminActionRuntime {
  readonly auctionId: string;
  readonly closesAt: string;
  readonly increment: CreateLotIncrement;
  readonly lotNumber: string;
  readonly reservePriceFils?: number;
  readonly softCloseExtensionMs?: number;
  readonly softCloseMaximumExtensions?: number;
  readonly softCloseWindowMs?: number;
  readonly startingBidFils: number;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminLotView {
  readonly auctionId: string;
  readonly closesAt: string;
  readonly currentBidFils: number | null;
  readonly id: string;
  readonly lifecycle: string;
  readonly lotNumber: string;
  readonly minimumIncrementFils: number;
  readonly minimumIncrementPercentBps: number | null;
  readonly minimumIncrementSource: "CUSTOM" | "PERCENT_OF_STARTING_PRICE";
  readonly nextMinimumBidFils: number;
  readonly reservePriceFils: number | null;
  readonly reserveStatus: string;
  readonly sequence: number;
  readonly softCloseExtensionMs: number | null;
  readonly softCloseMaximumExtensions: number | null;
  readonly softCloseWindowMs: number | null;
  readonly startingBidFils: number;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export async function submitCreateLot(
  command: CreateLotCommand,
): Promise<AdminLotView> {
  return postAdminJson<AdminLotView>(command, "/admin/lots", {
    body: {
      auctionId: command.auctionId,
      closesAt: command.closesAt,
      lotNumber: command.lotNumber,
      minimumIncrementFils:
        command.increment.mode === "custom"
          ? command.increment.minimumIncrementFils
          : undefined,
      minimumIncrementPercentBps:
        command.increment.mode === "percent"
          ? command.increment.minimumIncrementPercentBps
          : undefined,
      reservePriceFils: command.reservePriceFils,
      softCloseExtensionMs: command.softCloseExtensionMs,
      softCloseMaximumExtensions: command.softCloseMaximumExtensions,
      softCloseWindowMs: command.softCloseWindowMs,
      startingBidFils: command.startingBidFils,
      startsAt: command.startsAt,
      titleAr: command.titleAr,
      titleEn: command.titleEn,
    },
  });
}

async function postAdminJson<TResponse>(
  runtime: AdminActionRuntime,
  endpoint: string,
  options: { readonly body: Record<string, unknown> },
): Promise<TResponse> {
  const response = await fetch(buildAdminApiUrl(runtime.apiBaseUrl, endpoint), {
    body: JSON.stringify(options.body),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": runtime.correlationId,
      "x-pioneer-test-account-id": runtime.testAccountId,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Admin action failed with ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

function buildAdminApiUrl(apiBaseUrl: string, endpoint: string): string {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/api/v1/")
    ? endpoint
    : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  return `${baseUrl}${path}`;
}
