import type { ErrorCode, Money } from "@pioneer/contracts";

import type { BuyerBidSessionConfig } from "./bid-session";

/**
 * Mirrors `apps/api/src/bidding/bid.dto.ts`'s `PlaceBidAck` (the real wire
 * shape `BiddingController.placeBid` returns) and the equivalent
 * `BidCommandAckSchema` in `packages/contracts/src/commands.ts`.
 *
 * This is deliberately a hand-written type plus a manual runtime parser
 * (`parseBidCommandAck` below) rather than importing `BidCommandAckSchema`
 * as a value from `@pioneer/contracts`: Next.js/Turbopack cannot currently
 * bundle any runtime (non-type-only) import from `@pioneer/contracts` into
 * `apps/web` -- `next build` fails with "module has no exports" for every
 * named export, including ones that clearly exist in
 * `packages/contracts/src/index.ts` and resolve fine under `tsc`/Vitest.
 * No app in this repo has bundled a runtime `@pioneer/contracts` value
 * through a Next.js build before (only type-only imports and Vitest, which
 * uses a different resolver); this looks like a pre-existing monorepo/
 * bundler gap around that package's `zod`-based exports, not something
 * introduced here, and is out of scope for Task 005 to fix. Tracked in
 * `docs/current-state.md`. `apps/web/lib/home-data.ts` and
 * `apps/admin/lib/admin-data.ts` already establish the same "define a local
 * type + manual `as`/parse instead of importing a contracts type" pattern
 * for their own API responses, so this follows existing convention.
 */
export type BidCommandAck =
  | {
      readonly commandId: string;
      readonly contractVersion: 1;
      readonly correlationId: string;
      readonly result: {
        readonly closesAt: string;
        readonly currentBid: Money;
        readonly extended: boolean;
        readonly lotId: string;
        readonly myBidStatus: "OUTBID" | "WINNING";
        readonly nextMinimumBid: Money;
        readonly reserveStatus: string;
        readonly sequence: number;
      };
      readonly serverTime: string;
      readonly status: "ACCEPTED";
    }
  | {
      readonly commandId: string;
      readonly contractVersion: 1;
      readonly correlationId: string;
      readonly error: {
        readonly code: ErrorCode;
        readonly message: string;
        readonly retryable: boolean;
      };
      readonly latest?: BidLatestSnapshot;
      readonly serverTime: string;
      readonly status: "REJECTED";
    };

function isMoneyLike(value: unknown): value is Money {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.amountFils === "number" && record.currency === "AED";
}

/** Manual runtime validation matching `BidCommandAck` -- see its doc comment for why. */
function parseBidCommandAck(body: unknown): BidCommandAck | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.commandId !== "string" ||
    record.contractVersion !== 1 ||
    typeof record.correlationId !== "string" ||
    typeof record.serverTime !== "string"
  ) {
    return null;
  }

  if (record.status === "ACCEPTED") {
    const result = record.result;
    if (typeof result !== "object" || result === null) {
      return null;
    }
    const r = result as Record<string, unknown>;
    if (
      typeof r.closesAt !== "string" ||
      !isMoneyLike(r.currentBid) ||
      typeof r.extended !== "boolean" ||
      typeof r.lotId !== "string" ||
      (r.myBidStatus !== "WINNING" && r.myBidStatus !== "OUTBID") ||
      !isMoneyLike(r.nextMinimumBid) ||
      typeof r.reserveStatus !== "string" ||
      typeof r.sequence !== "number"
    ) {
      return null;
    }
    return {
      commandId: record.commandId,
      contractVersion: 1,
      correlationId: record.correlationId,
      result: {
        closesAt: r.closesAt,
        currentBid: r.currentBid,
        extended: r.extended,
        lotId: r.lotId,
        myBidStatus: r.myBidStatus,
        nextMinimumBid: r.nextMinimumBid,
        reserveStatus: r.reserveStatus,
        sequence: r.sequence,
      },
      serverTime: record.serverTime,
      status: "ACCEPTED",
    };
  }

  if (record.status === "REJECTED") {
    const error = record.error;
    if (typeof error !== "object" || error === null) {
      return null;
    }
    const e = error as Record<string, unknown>;
    if (
      typeof e.code !== "string" ||
      typeof e.message !== "string" ||
      typeof e.retryable !== "boolean"
    ) {
      return null;
    }

    let latest: BidLatestSnapshot | undefined;
    if (record.latest !== undefined) {
      if (typeof record.latest !== "object" || record.latest === null) {
        return null;
      }
      const l = record.latest as Record<string, unknown>;
      if (
        typeof l.closesAt !== "string" ||
        (l.currentBid !== null && !isMoneyLike(l.currentBid)) ||
        !isMoneyLike(l.nextMinimumBid) ||
        typeof l.sequence !== "number"
      ) {
        return null;
      }
      latest = {
        closesAt: l.closesAt,
        currentBid: (l.currentBid ?? null) as Money | null,
        nextMinimumBid: l.nextMinimumBid,
        sequence: l.sequence,
      };
    }

    return {
      commandId: record.commandId,
      contractVersion: 1,
      correlationId: record.correlationId,
      error: {
        code: e.code as ErrorCode,
        message: e.message,
        retryable: e.retryable,
      },
      ...(latest === undefined ? {} : { latest }),
      serverTime: record.serverTime,
      status: "REJECTED",
    };
  }

  return null;
}

/**
 * Buyer bid command state machine (pure, framework-independent so it can be
 * unit tested without a DOM). `BidPanelShell` owns the corresponding
 * `useState`/`useReducer` wiring; this module only knows how to derive
 * states from authoritative server responses.
 *
 * `gated` covers the eligibility/deposit/terms reasons Task 005 asks for.
 * There is no `/me/eligibility` endpoint yet (confirmed against every
 * `@Controller` in `apps/api/src` and against `packages/contracts/src/rest.ts`'s
 * "planned" markers), so eligibility can only be observed by attempting a
 * bid and reading the resulting `ErrorCode` -- there is nothing to
 * pre-flight against today.
 */
export type BidPanelStatus =
  | "accepted"
  | "closed"
  | "confirming"
  | "gated"
  | "idle"
  | "outbid"
  | "pending"
  | "rejected";

export const bidGateReasons = [
  "ACCOUNT_RESTRICTED",
  "DEPOSIT_INSUFFICIENT",
  "DEPOSIT_REQUIRED",
  "KYC_PENDING",
  "KYC_REQUIRED",
  "TERMS_ACCEPTANCE_REQUIRED",
] as const;
export type BidGateReason = (typeof bidGateReasons)[number];

export function isBidGateReason(code: string): code is BidGateReason {
  return (bidGateReasons as readonly string[]).includes(code);
}

export interface BidLatestSnapshot {
  readonly closesAt: string;
  readonly currentBid: Money | null;
  readonly nextMinimumBid: Money;
  readonly sequence: number;
}

export type BidPanelState =
  | { readonly status: "idle" }
  | {
      readonly status: "confirming";
      readonly amount: Money;
      readonly closesAt: string;
      readonly commandId: string;
      readonly lifecycle: string;
      readonly nextMinimumBid: Money;
      readonly termsAccepted: boolean;
    }
  | {
      readonly status: "pending";
      readonly amount: Money;
      readonly commandId: string;
      readonly unknown: boolean;
    }
  | {
      readonly status: "accepted";
      readonly amount: Money;
      readonly closesAt: string;
      readonly currentBid: Money;
      readonly extended: boolean;
      readonly nextMinimumBid: Money;
    }
  | {
      readonly status: "outbid";
      readonly amount: Money;
      readonly closesAt: string;
      readonly currentBid: Money;
      readonly nextMinimumBid: Money;
    }
  | {
      readonly status: "rejected";
      readonly amount: Money;
      readonly code: ErrorCode;
      readonly latest: BidLatestSnapshot | null;
      readonly message: string;
      readonly retryable: boolean;
    }
  | {
      readonly status: "gated";
      readonly amount: Money;
      readonly message: string;
      readonly reason: BidGateReason;
    }
  | { readonly status: "closed"; readonly lifecycle: string };

/** Non-null when the fetched lot can currently accept a manual bid. */
export interface AuthoritativeLotState {
  readonly closesAt: string;
  readonly currentBid: Money | null;
  readonly lifecycle: string;
  readonly nextMinimumBid: Money;
}

/**
 * Matches `PublicLotsResponse` in `apps/web/lib/home-data.ts` (kept as a
 * separate local type rather than a shared export to avoid coupling the two
 * call sites' evolution); `apps/api/src/auctions/public-lots.controller.ts`
 * is the real source of truth for this shape.
 */
interface PublicLotResponse {
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
}

/**
 * Fetches the authoritative public state for a single lot via `GET /api/v1/lots/:lotId`.
 * Returns `null` if the request fails, the lot is not found, or the response is invalid.
 */
export async function fetchAuthoritativeLotState(
  session: BuyerBidSessionConfig,
  lotId: string,
): Promise<AuthoritativeLotState | null> {
  let response: Response;
  try {
    response = await fetch(
      `${session.apiBaseUrl}/api/v1/lots/${encodeURIComponent(lotId)}`,
      {
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let lot: PublicLotResponse;
  try {
    lot = (await response.json()) as PublicLotResponse;
  } catch {
    return null;
  }

  if (
    typeof lot !== "object" ||
    lot === null ||
    typeof lot.closesAt !== "string" ||
    typeof lot.lifecycle !== "string" ||
    !isMoneyLike(lot.nextMinimumBid)
  ) {
    return null;
  }

  return {
    closesAt: lot.closesAt,
    currentBid: lot.currentBid,
    lifecycle: lot.lifecycle,
    nextMinimumBid: lot.nextMinimumBid,
  };
}

const liveLifecycle = "LIVE";

export function isLotLive(lifecycle: string): boolean {
  return lifecycle === liveLifecycle;
}

export type SubmitPlaceBidResult =
  | { readonly ack: BidCommandAck; readonly outcome: "ack" }
  | { readonly outcome: "unknown" };

export interface SubmitPlaceBidInput {
  readonly amount: Money;
  readonly commandId: string;
  readonly correlationId: string;
  readonly expectedSequence: number;
  readonly lotId: string;
  readonly session: BuyerBidSessionConfig;
}

/**
 * Submits a manual bid command. Per `docs/api-contracts.md` §8, a network
 * failure or a response that doesn't parse as a valid command
 * acknowledgement means "unknown," not "rejected" -- the caller must retry
 * with the *same* `commandId` (already threaded through as
 * `Idempotency-Key`), never mint a new one.
 *
 * `expectedSequence` has no authoritative REST source today (no snapshot
 * endpoint -- see `fetchAuthoritativeLotState`) and is not itself a hard
 * accept/reject gate in `evaluateManualBid` (`apps/api/src/bidding/bid-decision.ts`
 * never reads it); callers pass the best value they have, defaulting to 0.
 */
export async function submitPlaceBidCommand(
  input: SubmitPlaceBidInput,
): Promise<SubmitPlaceBidResult> {
  let response: Response;
  try {
    response = await fetch(
      `${input.session.apiBaseUrl}/api/v1/lots/${encodeURIComponent(input.lotId)}/bids`,
      {
        body: JSON.stringify({
          amount: input.amount,
          expectedSequence: input.expectedSequence,
          termsVersionId: input.session.termsVersionId,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.commandId,
          "x-correlation-id": input.correlationId,
          "x-pioneer-test-account-id": input.session.testAccountId,
        },
        method: "POST",
      },
    );
  } catch {
    return { outcome: "unknown" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { outcome: "unknown" };
  }

  const ack = parseBidCommandAck(body);
  if (ack === null) {
    return { outcome: "unknown" };
  }

  return { ack, outcome: "ack" };
}

/** Classifies a REJECTED ack's error code into the panel state it should drive. */
export function classifyRejectionStatus(
  code: string,
): "closed" | "gated" | "rejected" {
  if (code === "AUCTION_CLOSED") {
    return "closed";
  }
  if (isBidGateReason(code)) {
    return "gated";
  }
  return "rejected";
}

/**
 * The minimal shape `normalizeBidAck` needs. Both the REST `BidCommandAck`
 * above and `LotSocketClient`'s `BidCommandSocketAck`
 * (`apps/web/lib/lot-socket.ts`) satisfy this structurally -- REST's result
 * carries extra fields (`lotId`, `sequence`, `reserveStatus`) this doesn't
 * need, and the socket REJECTED error omits `retryable` (optional here) --
 * so `BidPanelShell` can call one normalizer regardless of which transport
 * a command went over instead of duplicating the ACCEPTED/REJECTED
 * classification logic per transport.
 */
export interface BidAckLike {
  readonly error?: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly latest?: BidLatestSnapshot;
  readonly result?: {
    readonly closesAt: string;
    readonly currentBid: Money;
    readonly extended: boolean;
    readonly myBidStatus: "OUTBID" | "WINNING";
    readonly nextMinimumBid: Money;
  };
  readonly status: "ACCEPTED" | "REJECTED";
}

export type NormalizedBidOutcome =
  | {
      readonly closesAt: string;
      readonly currentBid: Money;
      readonly extended: boolean;
      readonly kind: "accepted";
      readonly myBidStatus: "OUTBID" | "WINNING";
      readonly nextMinimumBid: Money;
    }
  | {
      readonly code: ErrorCode;
      readonly kind: "rejected";
      readonly latest: BidLatestSnapshot | null;
      readonly message: string;
      readonly retryable: boolean;
    };

/** Returns `null` if `ack` doesn't have the fields its own `status` requires (should not happen for a validly-parsed ack). */
export function normalizeBidAck(ack: BidAckLike): NormalizedBidOutcome | null {
  if (ack.status === "ACCEPTED") {
    if (ack.result === undefined) {
      return null;
    }
    return {
      closesAt: ack.result.closesAt,
      currentBid: ack.result.currentBid,
      extended: ack.result.extended,
      kind: "accepted",
      myBidStatus: ack.result.myBidStatus,
      nextMinimumBid: ack.result.nextMinimumBid,
    };
  }
  if (ack.error === undefined) {
    return null;
  }
  return {
    code: ack.error.code,
    kind: "rejected",
    latest: ack.latest ?? null,
    message: ack.error.message,
    retryable: ack.error.retryable ?? true,
  };
}
