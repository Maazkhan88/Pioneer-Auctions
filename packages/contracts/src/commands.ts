import type { CommandMeta, Money, Uuid } from "./core.js";

export interface LotSubscribeCommand extends CommandMeta {
  readonly lotId: Uuid;
  readonly afterSequence?: number;
}

export interface LotUnsubscribeCommand extends CommandMeta {
  readonly lotId: Uuid;
}

export interface LotSyncCommand extends CommandMeta {
  readonly lotId: Uuid;
  readonly afterSequence: number;
}

export interface PlaceBidCommand extends CommandMeta {
  readonly lotId: Uuid;
  readonly amount: Money;
  readonly expectedSequence: number;
  readonly termsVersionId: Uuid;
}

export interface SetProxyBidCommand extends CommandMeta {
  readonly lotId: Uuid;
  readonly maximum: Money;
  readonly expectedSequence: number;
  readonly termsVersionId: Uuid;
}

export interface PresenceUpdateCommand extends CommandMeta {
  readonly lotId: Uuid;
  readonly state: "VIEWING" | "BACKGROUND";
}

export interface BidCommandResult {
  readonly lotId: Uuid;
  readonly sequence: number;
  readonly currentBid: Money;
  readonly nextMinimumBid: Money;
  readonly myBidStatus: "WINNING" | "OUTBID";
  readonly reserveStatus: "NOT_APPLICABLE" | "NOT_MET" | "MET";
  readonly closesAt: string;
  readonly extended: boolean;
}
