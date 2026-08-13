import type { ErrorCode, Money } from "@pioneer/contracts";

import {
  classifyRejectionStatus,
  isBidGateReason,
  type BidGateReason,
  type BidLatestSnapshot,
} from "./bid-command";
import type { BuyerBidSessionConfig } from "./bid-session";

/**
 * Proxy (maximum) bid client -- `PUT /api/v1/lots/:lotId/proxy-bid`, per
 * `docs/api-contracts.md` §11 and `apps/api/src/bidding/bidding.service.ts`'s
 * `setProxyBid()` (read in full to derive this file, not guessed from the
 * docs alone). Deliberately a separate module from `bid-command.ts` rather
 * than folded into the same `BidPanelState` union: it's a genuinely
 * different server command (different endpoint, different DTO,
 * `activeProxyMaximum`/nullable `currentBid` fields manual bids don't have)
 * even though it shares the same eligibility/lifecycle/terms validation
 * shape -- `classifyRejectionStatus`/`isBidGateReason`/`BidLatestSnapshot`
 * are reused from `bid-command.ts` rather than duplicated.
 *
 * MVP rule (`docs/decisions-log.md` DEC-017, `docs/api-contracts.md` §11):
 * an active proxy maximum may only be created or *raised*, never lowered or
 * cancelled while the lot is live -- `PROXY_MAX_TOO_LOW` covers both "below
 * the current next-minimum-bid" and "not higher than your own existing
 * active proxy."
 *
 * Same DEC-019 constraint as `bid-command.ts`: local hand-written type +
 * manual parser instead of a runtime `@pioneer/contracts` import.
 */
export type ProxyBidCommandAck =
  | {
      readonly commandId: string;
      readonly contractVersion: 1;
      readonly correlationId: string;
      readonly result: {
        readonly activeProxyMaximum: Money;
        readonly closesAt: string;
        readonly currentBid: Money | null;
        readonly extended: boolean;
        readonly lotId: string;
        readonly myBidStatus: "NOT_BIDDING" | "OUTBID" | "WINNING";
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

export type ProxyBidPanelStatus =
  | "accepted"
  | "closed"
  | "confirming"
  | "gated"
  | "idle"
  | "not-bidding"
  | "outbid"
  | "pending"
  | "rejected";

export type ProxyBidPanelState =
  | { readonly status: "idle" }
  | {
      readonly status: "confirming";
      readonly closesAt: string;
      readonly commandId: string;
      readonly lifecycle: string;
      readonly maximum: Money;
      readonly nextMinimumBid: Money;
    }
  | {
      readonly status: "pending";
      readonly commandId: string;
      readonly maximum: Money;
      readonly unknown: boolean;
    }
  | {
      readonly status: "accepted";
      readonly activeProxyMaximum: Money;
      readonly closesAt: string;
      readonly currentBid: Money | null;
      readonly maximum: Money;
      readonly nextMinimumBid: Money;
    }
  | {
      readonly status: "outbid";
      readonly activeProxyMaximum: Money;
      readonly closesAt: string;
      readonly currentBid: Money | null;
      readonly maximum: Money;
      readonly nextMinimumBid: Money;
    }
  | {
      // `myBidStatus === "NOT_BIDDING"`: the maximum was saved, but no
      // visible bid was needed (e.g. the account was already leading
      // outright). Distinct from "accepted"/"outbid" because nothing about
      // the visible price changed as a result of this command.
      readonly status: "not-bidding";
      readonly activeProxyMaximum: Money;
      readonly maximum: Money;
    }
  | {
      readonly status: "rejected";
      readonly code: ErrorCode;
      readonly latest: BidLatestSnapshot | null;
      readonly maximum: Money;
      readonly message: string;
      readonly retryable: boolean;
    }
  | {
      readonly status: "gated";
      readonly maximum: Money;
      readonly message: string;
      readonly reason: BidGateReason;
    }
  | { readonly status: "closed"; readonly lifecycle: string };

function isMoneyLike(value: unknown): value is Money {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.amountFils === "number" && record.currency === "AED";
}

/** Manual runtime validation matching `ProxyBidCommandAck` -- see its doc comment for why. */
export function parseProxyBidCommandAck(
  body: unknown,
): ProxyBidCommandAck | null {
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
      !isMoneyLike(r.activeProxyMaximum) ||
      typeof r.closesAt !== "string" ||
      (r.currentBid !== null && !isMoneyLike(r.currentBid)) ||
      typeof r.extended !== "boolean" ||
      typeof r.lotId !== "string" ||
      (r.myBidStatus !== "WINNING" &&
        r.myBidStatus !== "OUTBID" &&
        r.myBidStatus !== "NOT_BIDDING") ||
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
        activeProxyMaximum: r.activeProxyMaximum,
        closesAt: r.closesAt,
        currentBid: (r.currentBid ?? null) as Money | null,
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

export type SubmitSetProxyBidResult =
  | { readonly ack: ProxyBidCommandAck; readonly outcome: "ack" }
  | { readonly outcome: "unknown" };

export interface SubmitSetProxyBidInput {
  readonly commandId: string;
  readonly correlationId: string;
  readonly expectedSequence: number;
  readonly lotId: string;
  readonly maximum: Money;
  readonly session: BuyerBidSessionConfig;
}

/** REST submission. Same "unknown, not rejected" timeout/parse-failure semantics as `submitPlaceBidCommand`. */
export async function submitSetProxyBidCommand(
  input: SubmitSetProxyBidInput,
): Promise<SubmitSetProxyBidResult> {
  let response: Response;
  try {
    response = await fetch(
      `${input.session.apiBaseUrl}/api/v1/lots/${encodeURIComponent(input.lotId)}/proxy-bid`,
      {
        body: JSON.stringify({
          expectedSequence: input.expectedSequence,
          maximum: input.maximum,
          termsVersionId: input.session.termsVersionId,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.commandId,
          "x-correlation-id": input.correlationId,
          "x-pioneer-test-account-id": input.session.testAccountId,
        },
        method: "PUT",
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

  const ack = parseProxyBidCommandAck(body);
  if (ack === null) {
    return { outcome: "unknown" };
  }

  return { ack, outcome: "ack" };
}

export type NormalizedProxyOutcome =
  | {
      readonly activeProxyMaximum: Money;
      readonly closesAt: string;
      readonly currentBid: Money | null;
      readonly kind: "accepted";
      readonly myBidStatus: "NOT_BIDDING" | "OUTBID" | "WINNING";
      readonly nextMinimumBid: Money;
    }
  | {
      readonly code: ErrorCode;
      readonly kind: "rejected";
      readonly latest: BidLatestSnapshot | null;
      readonly message: string;
      readonly retryable: boolean;
    };

/**
 * The minimal shape `normalizeProxyAck` needs. Both the REST
 * `ProxyBidCommandAck` above and `LotSocketClient`'s
 * `ProxyBidCommandSocketAck` (`apps/web/lib/lot-socket.ts`) satisfy this
 * structurally -- REST's result carries extra fields (`lotId`,
 * `reserveStatus`, `sequence`) this doesn't need, and the socket REJECTED
 * error omits `retryable` (optional here) -- mirrors `BidAckLike` in
 * `bid-command.ts`.
 */
export interface ProxyAckLike {
  readonly error?: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly retryable?: boolean;
  };
  readonly latest?: BidLatestSnapshot;
  readonly result?: {
    readonly activeProxyMaximum: Money;
    readonly closesAt: string;
    readonly currentBid: Money | null;
    readonly myBidStatus: "NOT_BIDDING" | "OUTBID" | "WINNING";
    readonly nextMinimumBid: Money;
  };
  readonly status: "ACCEPTED" | "REJECTED";
}

/** Returns `null` if `ack` doesn't have the fields its own `status` requires (should not happen for a validly-parsed ack). Mirrors `normalizeBidAck` in `bid-command.ts`. */
export function normalizeProxyAck(
  ack: ProxyAckLike,
): NormalizedProxyOutcome | null {
  if (ack.status === "ACCEPTED") {
    if (ack.result === undefined) {
      return null;
    }
    return {
      activeProxyMaximum: ack.result.activeProxyMaximum,
      closesAt: ack.result.closesAt,
      currentBid: ack.result.currentBid,
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

export { classifyRejectionStatus, isBidGateReason };
