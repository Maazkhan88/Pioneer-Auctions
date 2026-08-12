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
  readonly contractVersion: 1;
  readonly decidedAt: string;
  readonly decision: "APPROVED" | "REJECTED";
  readonly hammerPrice: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly lifecycle: "APPROVED" | "REJECTED";
  readonly lotId: string;
  readonly sequence: number;
}

export async function submitFinalBidDecision(
  command: FinalBidDecisionCommand,
): Promise<FinalBidDecisionResponse> {
  const response = await fetch(buildAdminApiUrl(command), {
    body: JSON.stringify(
      command.type === "reject"
        ? { note: command.note, reasonCode: command.reasonCode }
        : {},
    ),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": command.correlationId,
      "x-pioneer-test-account-id": command.testAccountId,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Admin decision failed with ${response.status}`);
  }

  return (await response.json()) as FinalBidDecisionResponse;
}

function buildAdminApiUrl(command: FinalBidDecisionCommand): string {
  const baseUrl = command.apiBaseUrl.replace(/\/$/, "");
  const endpoint = command.endpoint.startsWith("/api/v1/")
    ? command.endpoint
    : `/api/v1${command.endpoint.startsWith("/") ? "" : "/"}${command.endpoint}`;
  return `${baseUrl}${endpoint}`;
}
