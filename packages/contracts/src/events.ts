import type {
  BidEligibility,
  LotLifecycle,
  LotPublicState,
  MyBidState,
  MyBidStatus,
  ReserveStatus,
} from "./auction.js";
import type { ContractVersion, IsoDateTime, Money, Uuid } from "./core.js";

export interface ServerHello {
  readonly contractVersion: ContractVersion;
  readonly connectionId: string;
  readonly serverTime: IsoDateTime;
  readonly heartbeatIntervalMs: number;
  readonly maxCommandSkewSequence: number;
}

export interface LotEventEnvelope<TName extends string, TData> {
  readonly contractVersion: ContractVersion;
  readonly eventId: Uuid;
  readonly event: TName;
  readonly lotId: Uuid;
  readonly auctionId: Uuid;
  readonly sequence: number;
  readonly occurredAt: IsoDateTime;
  readonly correlationId: string;
  readonly data: TData;
}

export interface LotSnapshot {
  readonly contractVersion: ContractVersion;
  readonly event: "lot:snapshot";
  readonly lotId: Uuid;
  readonly auctionId: Uuid;
  readonly sequence: number;
  readonly generatedAt: IsoDateTime;
  readonly state: LotPublicState;
  readonly myBidState?: MyBidState;
}

export type BidAcceptedEvent = LotEventEnvelope<
  "bid:accepted",
  {
    readonly bidId: Uuid;
    readonly amount: Money;
    readonly bidderAlias: string;
    readonly bidKind: "MANUAL" | "PROXY";
    readonly currentBid: Money;
    readonly nextMinimumBid: Money;
    readonly bidCount: number;
    readonly reserveStatus: ReserveStatus;
  }
>;

export type AuctionExtendedEvent = LotEventEnvelope<
  "auction:extended",
  {
    readonly previousClosesAt: IsoDateTime;
    readonly closesAt: IsoDateTime;
    readonly extensionMs: number;
    readonly extensionCount: number;
    readonly reason: "QUALIFYING_BID_IN_SOFT_CLOSE_WINDOW";
  }
>;

export type AuctionStateChangedEvent = LotEventEnvelope<
  "auction:state-changed",
  {
    readonly previousLifecycle: LotLifecycle;
    readonly lifecycle: LotLifecycle;
    readonly closesAt: IsoDateTime;
    readonly reasonCode?: string;
    readonly approvalSlaDueAt?: IsoDateTime;
  }
>;

export type ReserveStatusChangedEvent = LotEventEnvelope<
  "reserve:status-changed",
  { readonly reserveStatus: "MET" }
>;

export type LotPresenceChangedEvent = LotEventEnvelope<
  "lot:presence-changed",
  { readonly approximateViewerCount: number }
>;

export interface MyBidStatusChangedEvent {
  readonly contractVersion: ContractVersion;
  readonly eventId: Uuid;
  readonly event: "bid:status-changed";
  readonly occurredAt: IsoDateTime;
  readonly correlationId: string;
  readonly data: {
    readonly lotId: Uuid;
    readonly auctionId: Uuid;
    readonly lotSequence: number;
    readonly status: MyBidStatus;
    readonly currentBid: Money;
    readonly nextMinimumBid: Money;
    readonly activeProxyMaximum: Money | null;
    readonly closesAt: IsoDateTime;
  };
}

export interface EligibilityChangedEvent {
  readonly contractVersion: ContractVersion;
  readonly eventId: Uuid;
  readonly event: "eligibility:changed";
  readonly occurredAt: IsoDateTime;
  readonly correlationId: string;
  readonly data: {
    readonly lotId?: Uuid;
    readonly eligibility: BidEligibility;
  };
}

export type PublicLotEvent =
  | BidAcceptedEvent
  | AuctionExtendedEvent
  | AuctionStateChangedEvent
  | ReserveStatusChangedEvent
  | LotPresenceChangedEvent;
