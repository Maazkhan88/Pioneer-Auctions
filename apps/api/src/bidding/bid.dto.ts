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

export function money(amountFils: number): Money {
  return { amountFils, currency: "AED" };
}
