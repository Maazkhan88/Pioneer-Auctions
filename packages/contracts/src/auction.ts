import { z } from "zod";

import {
  IsoDateTimeSchema,
  MoneySchema,
  NonNegativeIntegerSchema,
  UuidSchema,
} from "./core.js";

export const LotLifecycleSchema = z.enum([
  "SCHEDULED",
  "LIVE",
  "PAUSED",
  "CLOSED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const ReserveStatusSchema = z.enum(["NOT_APPLICABLE", "NOT_MET", "MET"]);

export const MyBidStatusSchema = z.enum([
  "NOT_BIDDING",
  "WINNING",
  "OUTBID",
  "WON_PENDING_APPROVAL",
  "WON",
  "LOST",
]);

export const EligibilityReasonCodeSchema = z.enum([
  "KYC_REQUIRED",
  "KYC_PENDING",
  "DEPOSIT_REQUIRED",
  "DEPOSIT_INSUFFICIENT",
  "TERMS_ACCEPTANCE_REQUIRED",
  "ACCOUNT_RESTRICTED",
]);

export const BidEligibilitySchema = z
  .object({
    eligible: z.boolean(),
    eligibleDeposit: MoneySchema.optional(),
    reasonCodes: z.array(EligibilityReasonCodeSchema),
    requiredDeposit: MoneySchema.optional(),
    termsVersionId: UuidSchema.optional(),
  })
  .passthrough();

export const SoftCloseStateSchema = z
  .object({
    enabled: z.boolean(),
    extensionCount: NonNegativeIntegerSchema,
    extensionMs: NonNegativeIntegerSchema,
    windowMs: NonNegativeIntegerSchema,
  })
  .passthrough();

export const SoftClosePolicySchema = z.strictObject({
  enabled: z.boolean(),
  extensionMs: NonNegativeIntegerSchema,
  maximumExtensions: NonNegativeIntegerSchema.nullable(),
  windowMs: NonNegativeIntegerSchema,
});

export const LotPublicStateSchema = z
  .object({
    approximateViewerCount: NonNegativeIntegerSchema.optional(),
    bidCount: NonNegativeIntegerSchema,
    closesAt: IsoDateTimeSchema,
    currentBid: MoneySchema.nullable(),
    lifecycle: LotLifecycleSchema,
    nextMinimumBid: MoneySchema,
    reserveStatus: ReserveStatusSchema,
    softClose: SoftCloseStateSchema,
    startsAt: IsoDateTimeSchema,
  })
  .passthrough();

export const MyBidStateSchema = z
  .object({
    activeProxyMaximum: MoneySchema.nullable(),
    eligibility: BidEligibilitySchema,
    myHighestVisibleBid: MoneySchema.nullable(),
    status: MyBidStatusSchema,
  })
  .passthrough();

export type LotLifecycle = z.infer<typeof LotLifecycleSchema>;
export type ReserveStatus = z.infer<typeof ReserveStatusSchema>;
export type MyBidStatus = z.infer<typeof MyBidStatusSchema>;
export type EligibilityReasonCode = z.infer<typeof EligibilityReasonCodeSchema>;
export type BidEligibility = z.infer<typeof BidEligibilitySchema>;
export type SoftCloseState = z.infer<typeof SoftCloseStateSchema>;
export type SoftClosePolicy = z.infer<typeof SoftClosePolicySchema>;
export type LotPublicState = z.infer<typeof LotPublicStateSchema>;
export type MyBidState = z.infer<typeof MyBidStateSchema>;

export const LotCategorySchema = z.enum([
  "VEHICLES",
  "REAL_ESTATE",
  "GENERAL_MATERIALS",
]);

export const LotSearchSortSchema = z.enum([
  "ending_soon",
  "price_asc",
  "price_desc",
  "newest",
  "most_bids",
]);

export const SearchLotsQuerySchema = z.object({
  category: LotCategorySchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  maxPriceFils: z.coerce.number().int().nonnegative().optional(),
  minPriceFils: z.coerce.number().int().nonnegative().optional(),
  offset: z.coerce.number().int().nonnegative().default(0),
  q: z.string().trim().optional(),
  sort: LotSearchSortSchema.default("ending_soon"),
  status: LotLifecycleSchema.optional(),
});

export const PublicLotCardSchema = z.object({
  auctionId: z.string(),
  category: LotCategorySchema.optional(),
  closesAt: IsoDateTimeSchema,
  contractVersion: z.literal(1),
  currentBid: MoneySchema,
  lifecycle: LotLifecycleSchema,
  lotId: z.string(),
  lotNumber: z.string(),
  nextMinimumBid: MoneySchema,
  reserveStatus: ReserveStatusSchema,
  titleAr: z.string(),
  titleEn: z.string(),
});

export const SearchLotsResponseSchema = z.object({
  contractVersion: z.literal(1),
  items: z.array(PublicLotCardSchema),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  total: NonNegativeIntegerSchema,
});

export type LotCategory = z.infer<typeof LotCategorySchema>;
export type LotSearchSort = z.infer<typeof LotSearchSortSchema>;
export type SearchLotsQuery = z.infer<typeof SearchLotsQuerySchema>;
export type PublicLotCard = z.infer<typeof PublicLotCardSchema>;
export type SearchLotsResponse = z.infer<typeof SearchLotsResponseSchema>;
