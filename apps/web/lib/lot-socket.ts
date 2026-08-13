import type { ErrorCode, Money } from "@pioneer/contracts";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

import type { BuyerBidSessionConfig } from "./bid-session";

/**
 * Realtime lot connection over Socket.IO, namespace `/auctions/v1`, per
 * `docs/api-contracts.md` §6-§10 and §14 (reconnect algorithm).
 *
 * Event/command payload shapes below are hand-written local mirrors of the
 * real wire contract (`packages/contracts/src/{events,commands,core}.ts`,
 * cross-checked against the actual server implementation in
 * `apps/api/src/bidding/bidding.gateway.ts`) rather than imported at
 * runtime from `@pioneer/contracts` -- see the doc comment at the top of
 * `bid-command.ts` (DEC-019 in `docs/decisions-log.md`) for why: Next.js/
 * Turbopack cannot currently bundle a runtime value import from that
 * package into `apps/web`. `Money`/`ErrorCode` remain type-only imports,
 * which are erased at compile time and unaffected by that issue.
 *
 * Unlike `bid-command.ts`'s bid-acknowledgement parsing (which is
 * hand-validated field-by-field because it directly drives financial
 * state), incoming server events here are lightly cast rather than fully
 * validated -- the same "trust our own backend's response shape" posture
 * `apps/web/lib/home-data.ts` already takes for `GET /api/v1/lots`. A
 * malformed/unexpected event is still handled safely: `classifySequence`
 * treats anything that doesn't look like a valid next-in-order event as a
 * gap and the caller re-syncs from a snapshot.
 */

export type SequenceDecision = "apply" | "gap" | "stale";

/**
 * Per `docs/api-contracts.md` §9: "Clients apply only an event whose
 * sequence is exactly the current sequence + 1. Equal/older events are
 * duplicates. A larger gap triggers `lot:sync`." `lastAppliedSequence` of
 * `null` means no snapshot has been applied yet -- the caller should always
 * have a snapshot before evaluating incremental events, but this returns
 * `"gap"` rather than blindly applying if that invariant is ever violated.
 */
export function classifySequence(
  lastAppliedSequence: number | null,
  incomingSequence: number,
): SequenceDecision {
  if (lastAppliedSequence === null) {
    return "gap";
  }
  if (incomingSequence <= lastAppliedSequence) {
    return "stale";
  }
  if (incomingSequence === lastAppliedSequence + 1) {
    return "apply";
  }
  return "gap";
}

export interface LotPublicStateLike {
  readonly bidCount: number;
  readonly closesAt: string;
  readonly currentBid: Money | null;
  readonly lifecycle: string;
  readonly nextMinimumBid: Money;
  readonly reserveStatus: string;
}

export interface LotSnapshotEvent {
  readonly auctionId: string;
  readonly lotId: string;
  readonly sequence: number;
  readonly state: LotPublicStateLike;
}

interface LotEventEnvelope<TData> {
  readonly auctionId: string;
  readonly data: TData;
  readonly lotId: string;
  readonly sequence: number;
}

export type BidAcceptedEvent = LotEventEnvelope<{
  readonly bidCount: number;
  readonly currentBid: Money;
  readonly nextMinimumBid: Money;
  readonly reserveStatus: string;
}>;

export type AuctionExtendedEvent = LotEventEnvelope<{
  readonly closesAt: string;
  readonly extensionCount: number;
}>;

export type AuctionStateChangedEvent = LotEventEnvelope<{
  readonly closesAt: string;
  readonly lifecycle: string;
}>;

export type ReserveStatusChangedEvent = LotEventEnvelope<{
  readonly reserveStatus: "MET";
}>;

/** Personal event -- only delivered to the bidder's own `user:{accountId}` room. */
export interface MyBidStatusChangedEvent {
  readonly closesAt: string;
  readonly currentBid: Money;
  readonly lotId: string;
  readonly lotSequence: number;
  readonly nextMinimumBid: Money;
  readonly status: string;
}

export interface LotSocketHandlers {
  readonly onAuctionExtended?: (event: AuctionExtendedEvent) => void;
  readonly onAuctionStateChanged?: (event: AuctionStateChangedEvent) => void;
  readonly onBidAccepted?: (event: BidAcceptedEvent) => void;
  readonly onBidStatusChanged?: (event: MyBidStatusChangedEvent) => void;
  readonly onConnectionChange?: (connected: boolean) => void;
  readonly onGapDetected?: () => void;
  readonly onReserveStatusChanged?: (event: ReserveStatusChangedEvent) => void;
  readonly onSnapshot?: (event: LotSnapshotEvent) => void;
}

export interface SocketPlaceBidResult {
  readonly ack: BidCommandSocketAck;
  readonly outcome: "ack";
}
export type SocketPlaceBidOutcome =
  | SocketPlaceBidResult
  | { readonly outcome: "not-connected" }
  | { readonly outcome: "unknown" };

export type BidCommandSocketAck =
  | {
      readonly commandId: string;
      readonly result: {
        readonly closesAt: string;
        readonly currentBid: Money;
        readonly extended: boolean;
        readonly nextMinimumBid: Money;
        readonly myBidStatus: "OUTBID" | "WINNING";
      };
      readonly status: "ACCEPTED";
    }
  | {
      readonly commandId: string;
      readonly error: { readonly code: ErrorCode; readonly message: string };
      readonly status: "REJECTED";
    };

export interface SocketSetProxyBidResult {
  readonly ack: ProxyBidCommandSocketAck;
  readonly outcome: "ack";
}
export type SocketSetProxyBidOutcome =
  | SocketSetProxyBidResult
  | { readonly outcome: "not-connected" }
  | { readonly outcome: "unknown" };

export type ProxyBidCommandSocketAck =
  | {
      readonly commandId: string;
      readonly result: {
        readonly activeProxyMaximum: Money;
        readonly closesAt: string;
        readonly currentBid: Money | null;
        readonly extended: boolean;
        readonly myBidStatus: "NOT_BIDDING" | "OUTBID" | "WINNING";
        readonly nextMinimumBid: Money;
      };
      readonly status: "ACCEPTED";
    }
  | {
      readonly commandId: string;
      readonly error: { readonly code: ErrorCode; readonly message: string };
      readonly status: "REJECTED";
    };

const ackTimeoutMs = 8_000;

/**
 * A single lot's realtime connection. One instance per lot-detail page
 * view; call `dispose()` on unmount. Automatically re-subscribes with
 * `afterSequence` on every (re)connect, per the §14 reconnect algorithm --
 * the caller does not need to detect reconnects itself.
 */
export class LotSocketClient {
  private readonly handlers: LotSocketHandlers;
  private lastAppliedSequence: number | null = null;
  private readonly lotId: string;
  private readonly session: BuyerBidSessionConfig;
  private socket: Socket | null = null;

  constructor(
    session: BuyerBidSessionConfig,
    lotId: string,
    handlers: LotSocketHandlers,
  ) {
    this.session = session;
    this.lotId = lotId;
    this.handlers = handlers;
  }

  connect(): void {
    if (this.socket !== null) {
      return;
    }
    const socket: Socket = io(`${this.session.apiBaseUrl}/auctions/v1`, {
      auth: { testAccountId: this.session.testAccountId },
      transports: ["websocket", "polling"],
    });
    this.socket = socket;

    socket.on("connect", () => {
      this.handlers.onConnectionChange?.(true);
      this.subscribe();
    });
    socket.on("disconnect", () => {
      this.handlers.onConnectionChange?.(false);
    });

    socket.on("lot:snapshot", (event: unknown) => {
      this.applySnapshot(event);
    });
    socket.on("bid:accepted", (event: unknown) => {
      this.applySequenced(event, this.handlers.onBidAccepted);
    });
    socket.on("auction:extended", (event: unknown) => {
      this.applySequenced(event, this.handlers.onAuctionExtended);
    });
    socket.on("auction:state-changed", (event: unknown) => {
      this.applySequenced(event, this.handlers.onAuctionStateChanged);
    });
    socket.on("reserve:status-changed", (event: unknown) => {
      this.applySequenced(event, this.handlers.onReserveStatusChanged);
    });
    socket.on("bid:status-changed", (event: unknown) => {
      const data = extractPersonalEventData(event);
      if (data !== null && isMyBidStatusChangedEvent(data)) {
        this.handlers.onBidStatusChanged?.(data);
      }
    });
  }

  dispose(): void {
    const socket = this.socket;
    if (socket === null) {
      return;
    }
    if (socket.connected) {
      socket.emit("lot:unsubscribe", {
        commandId: cryptoRandomUuid(),
        contractVersion: 1,
        lotId: this.lotId,
        sentAt: new Date().toISOString(),
      });
    }
    socket.removeAllListeners();
    socket.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Submits a bid over the live socket. Times out to "unknown" (never "rejected"), matching the REST path's semantics. */
  async placeBid(input: {
    readonly amount: Money;
    readonly commandId: string;
    readonly expectedSequence: number;
  }): Promise<SocketPlaceBidOutcome> {
    const socket = this.socket;
    if (socket === null || !socket.connected) {
      return { outcome: "not-connected" };
    }

    const payload = {
      amount: input.amount,
      commandId: input.commandId,
      contractVersion: 1,
      expectedSequence: input.expectedSequence,
      lotId: this.lotId,
      sentAt: new Date().toISOString(),
      termsVersionId: this.session.termsVersionId,
    };

    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ outcome: "unknown" });
        }
      }, ackTimeoutMs);

      socket.emit("bid:place", payload, (ack: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        const parsed = parseBidCommandSocketAck(ack);
        resolve(
          parsed === null
            ? { outcome: "unknown" }
            : { ack: parsed, outcome: "ack" },
        );
      });
    });
  }

  /** Raises/creates a proxy maximum over the live socket. Same "unknown, not rejected" timeout semantics as `placeBid`. */
  async setProxyBid(input: {
    readonly commandId: string;
    readonly expectedSequence: number;
    readonly maximum: Money;
  }): Promise<SocketSetProxyBidOutcome> {
    const socket = this.socket;
    if (socket === null || !socket.connected) {
      return { outcome: "not-connected" };
    }

    const payload = {
      commandId: input.commandId,
      contractVersion: 1,
      expectedSequence: input.expectedSequence,
      lotId: this.lotId,
      maximum: input.maximum,
      sentAt: new Date().toISOString(),
      termsVersionId: this.session.termsVersionId,
    };

    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ outcome: "unknown" });
        }
      }, ackTimeoutMs);

      socket.emit("proxy-bid:set", payload, (ack: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        const parsed = parseProxyBidCommandSocketAck(ack);
        resolve(
          parsed === null
            ? { outcome: "unknown" }
            : { ack: parsed, outcome: "ack" },
        );
      });
    });
  }

  /** Re-subscribes from the last applied sequence, or fresh if none yet. */
  private subscribe(): void {
    const socket = this.socket;
    if (socket === null) {
      return;
    }
    socket.emit(
      "lot:subscribe",
      {
        ...(this.lastAppliedSequence === null
          ? {}
          : { afterSequence: this.lastAppliedSequence }),
        commandId: cryptoRandomUuid(),
        contractVersion: 1,
        lotId: this.lotId,
        sentAt: new Date().toISOString(),
      },
      (ack: unknown) => {
        const snapshot = extractSnapshotFromAck(ack);
        if (snapshot !== null) {
          this.applySnapshot(snapshot);
        }
      },
    );
  }

  private applySequenced<TEvent extends { readonly sequence: number }>(
    raw: unknown,
    handler: ((event: TEvent) => void) | undefined,
  ): void {
    const event = raw as TEvent | null;
    if (event === null || typeof event !== "object") {
      return;
    }
    const decision = classifySequence(this.lastAppliedSequence, event.sequence);
    if (decision === "stale") {
      return;
    }
    if (decision === "gap") {
      this.handlers.onGapDetected?.();
      this.resync();
      return;
    }
    this.lastAppliedSequence = event.sequence;
    handler?.(event);
  }

  private applySnapshot(raw: unknown): void {
    const snapshot = raw as LotSnapshotEvent | null;
    if (
      snapshot === null ||
      typeof snapshot !== "object" ||
      typeof snapshot.sequence !== "number"
    ) {
      return;
    }
    this.lastAppliedSequence = snapshot.sequence;
    this.handlers.onSnapshot?.(snapshot);
  }

  private resync(): void {
    const socket = this.socket;
    if (socket === null || this.lastAppliedSequence === null) {
      return;
    }
    socket.emit(
      "lot:sync",
      {
        afterSequence: this.lastAppliedSequence,
        commandId: cryptoRandomUuid(),
        contractVersion: 1,
        lotId: this.lotId,
        sentAt: new Date().toISOString(),
      },
      (ack: unknown) => {
        const snapshot = extractSnapshotFromAck(ack);
        if (snapshot !== null) {
          this.applySnapshot(snapshot);
        }
      },
    );
  }
}

function extractSnapshotFromAck(ack: unknown): unknown {
  if (typeof ack !== "object" || ack === null) {
    return null;
  }
  const record = ack as Record<string, unknown>;
  return record.status === "ACCEPTED" ? (record.result ?? null) : null;
}

function extractPersonalEventData(event: unknown): unknown {
  if (typeof event !== "object" || event === null) {
    return null;
  }
  return (event as Record<string, unknown>).data ?? null;
}

function isMyBidStatusChangedEvent(
  value: unknown,
): value is MyBidStatusChangedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.lotId === "string" &&
    typeof v.lotSequence === "number" &&
    typeof v.status === "string"
  );
}

function parseBidCommandSocketAck(value: unknown): BidCommandSocketAck | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.commandId !== "string") {
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
      !isMoneyLike(r.nextMinimumBid) ||
      (r.myBidStatus !== "WINNING" && r.myBidStatus !== "OUTBID")
    ) {
      return null;
    }
    return {
      commandId: record.commandId,
      result: {
        closesAt: r.closesAt,
        currentBid: r.currentBid,
        extended: r.extended,
        myBidStatus: r.myBidStatus,
        nextMinimumBid: r.nextMinimumBid,
      },
      status: "ACCEPTED",
    };
  }
  if (record.status === "REJECTED") {
    const error = record.error;
    if (typeof error !== "object" || error === null) {
      return null;
    }
    const e = error as Record<string, unknown>;
    if (typeof e.code !== "string" || typeof e.message !== "string") {
      return null;
    }
    return {
      commandId: record.commandId,
      error: { code: e.code as ErrorCode, message: e.message },
      status: "REJECTED",
    };
  }
  return null;
}

function parseProxyBidCommandSocketAck(
  value: unknown,
): ProxyBidCommandSocketAck | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.commandId !== "string") {
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
      !isMoneyLike(r.nextMinimumBid) ||
      (r.myBidStatus !== "WINNING" &&
        r.myBidStatus !== "OUTBID" &&
        r.myBidStatus !== "NOT_BIDDING")
    ) {
      return null;
    }
    return {
      commandId: record.commandId,
      result: {
        activeProxyMaximum: r.activeProxyMaximum,
        closesAt: r.closesAt,
        currentBid: (r.currentBid ?? null) as Money | null,
        extended: r.extended,
        myBidStatus: r.myBidStatus,
        nextMinimumBid: r.nextMinimumBid,
      },
      status: "ACCEPTED",
    };
  }
  if (record.status === "REJECTED") {
    const error = record.error;
    if (typeof error !== "object" || error === null) {
      return null;
    }
    const e = error as Record<string, unknown>;
    if (typeof e.code !== "string" || typeof e.message !== "string") {
      return null;
    }
    return {
      commandId: record.commandId,
      error: { code: e.code as ErrorCode, message: e.message },
      status: "REJECTED",
    };
  }
  return null;
}

function isMoneyLike(value: unknown): value is Money {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.amountFils === "number" && record.currency === "AED";
}

function cryptoRandomUuid(): string {
  return crypto.randomUUID();
}
