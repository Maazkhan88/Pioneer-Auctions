import { z } from "zod";

export const placeBidSchema = z.object({
  amount: z.object({
    amountFils: z.number().int().positive(),
    currency: z.literal("AED"),
  }),
  expectedSequence: z.number().int().nonnegative(),
  termsVersionId: z.uuid(),
});

export const setProxyBidSchema = z.object({
  expectedSequence: z.number().int().nonnegative(),
  maximum: z.object({
    amountFils: z.number().int().positive(),
    currency: z.literal("AED"),
  }),
  termsVersionId: z.uuid(),
});

export const socketPlaceBidSchema = placeBidSchema.extend({
  commandId: z.uuid(),
  contractVersion: z.literal(1),
  lotId: z.uuid(),
  sentAt: z.iso.datetime(),
});

export const socketSetProxyBidSchema = setProxyBidSchema.extend({
  commandId: z.uuid(),
  contractVersion: z.literal(1),
  lotId: z.uuid(),
  sentAt: z.iso.datetime(),
});

export const lotSubscribeSchema = z.object({
  afterSequence: z.number().int().nonnegative().optional(),
  commandId: z.uuid(),
  contractVersion: z.literal(1),
  lotId: z.uuid(),
  sentAt: z.iso.datetime(),
});

export const lotSyncSchema = z.object({
  afterSequence: z.number().int().nonnegative(),
  commandId: z.uuid(),
  contractVersion: z.literal(1),
  lotId: z.uuid(),
  sentAt: z.iso.datetime(),
});

export interface PlaceBidInput {
  readonly amountFils: number;
  readonly expectedSequence: number;
  readonly termsVersionId: string;
}

export interface SetProxyBidInput {
  readonly expectedSequence: number;
  readonly maximumFils: number;
  readonly termsVersionId: string;
}

export interface SocketPlaceBidCommand extends PlaceBidInput {
  readonly commandId: string;
  readonly lotId: string;
}

export interface SocketSetProxyBidCommand extends SetProxyBidInput {
  readonly commandId: string;
  readonly lotId: string;
}

export interface LotSubscribeInput {
  readonly afterSequence?: number;
  readonly commandId: string;
  readonly lotId: string;
}

export interface LotSyncInput {
  readonly afterSequence: number;
  readonly commandId: string;
  readonly lotId: string;
}

export interface BidLatestState {
  readonly lotId: string;
  readonly sequence: number;
  readonly currentBid: Money | null;
  readonly nextMinimumBid: Money;
  readonly closesAt: string;
}

export interface Money {
  readonly currency: "AED";
  readonly amountFils: number;
}

export interface LotSnapshot {
  readonly contractVersion: 1;
  readonly event: "lot:snapshot";
  readonly lotId: string;
  readonly auctionId: string;
  readonly sequence: number;
  readonly generatedAt: string;
  readonly state: {
    readonly lifecycle: string;
    readonly currentBid: Money | null;
    readonly nextMinimumBid: Money;
    readonly bidCount: number;
    readonly reserveStatus: string;
    readonly startsAt: string;
    readonly closesAt: string;
    readonly softClose: {
      readonly enabled: boolean;
      readonly windowMs: number;
      readonly extensionMs: number;
      readonly extensionCount: number;
    };
  };
}

export type PlaceBidAck =
  | {
      readonly contractVersion: 1;
      readonly commandId: string;
      readonly status: "ACCEPTED";
      readonly correlationId: string;
      readonly serverTime: string;
      readonly result: {
        readonly lotId: string;
        readonly sequence: number;
        readonly currentBid: Money;
        readonly nextMinimumBid: Money;
        readonly myBidStatus: "WINNING" | "OUTBID";
        readonly reserveStatus: string;
        readonly closesAt: string;
        readonly extended: boolean;
      };
    }
  | {
      readonly contractVersion: 1;
      readonly commandId: string;
      readonly status: "REJECTED";
      readonly correlationId: string;
      readonly serverTime: string;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
      readonly latest?: BidLatestState;
    };

export type SetProxyBidAck =
  | {
      readonly contractVersion: 1;
      readonly commandId: string;
      readonly status: "ACCEPTED";
      readonly correlationId: string;
      readonly serverTime: string;
      readonly result: {
        readonly lotId: string;
        readonly sequence: number;
        readonly activeProxyMaximum: Money;
        readonly currentBid: Money | null;
        readonly nextMinimumBid: Money;
        readonly myBidStatus: "WINNING" | "OUTBID" | "NOT_BIDDING";
        readonly reserveStatus: string;
        readonly closesAt: string;
        readonly extended: boolean;
      };
    }
  | {
      readonly contractVersion: 1;
      readonly commandId: string;
      readonly status: "REJECTED";
      readonly correlationId: string;
      readonly serverTime: string;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
      readonly latest?: BidLatestState;
    };

export function parsePlaceBidInput(input: unknown): PlaceBidInput {
  const parsed = placeBidSchema.parse(input);
  return {
    amountFils: parsed.amount.amountFils,
    expectedSequence: parsed.expectedSequence,
    termsVersionId: parsed.termsVersionId,
  };
}

export function parseSetProxyBidInput(input: unknown): SetProxyBidInput {
  const parsed = setProxyBidSchema.parse(input);
  return {
    expectedSequence: parsed.expectedSequence,
    maximumFils: parsed.maximum.amountFils,
    termsVersionId: parsed.termsVersionId,
  };
}

export function parseSocketPlaceBidCommand(
  input: unknown,
): SocketPlaceBidCommand {
  const parsed = socketPlaceBidSchema.parse(input);
  return {
    amountFils: parsed.amount.amountFils,
    commandId: parsed.commandId,
    expectedSequence: parsed.expectedSequence,
    lotId: parsed.lotId,
    termsVersionId: parsed.termsVersionId,
  };
}

export function parseSocketSetProxyBidCommand(
  input: unknown,
): SocketSetProxyBidCommand {
  const parsed = socketSetProxyBidSchema.parse(input);
  return {
    commandId: parsed.commandId,
    expectedSequence: parsed.expectedSequence,
    lotId: parsed.lotId,
    maximumFils: parsed.maximum.amountFils,
    termsVersionId: parsed.termsVersionId,
  };
}

export function parseLotSubscribeInput(input: unknown): LotSubscribeInput {
  const parsed = lotSubscribeSchema.parse(input);
  return {
    commandId: parsed.commandId,
    lotId: parsed.lotId,
    ...(parsed.afterSequence === undefined
      ? {}
      : { afterSequence: parsed.afterSequence }),
  };
}

export function parseLotSyncInput(input: unknown): LotSyncInput {
  const parsed = lotSyncSchema.parse(input);
  return {
    afterSequence: parsed.afterSequence,
    commandId: parsed.commandId,
    lotId: parsed.lotId,
  };
}

export function money(amountFils: number): Money {
  return { amountFils, currency: "AED" };
}
