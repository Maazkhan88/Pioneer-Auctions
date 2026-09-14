import { z } from "zod";

import { MyBidStatusSchema, ReserveStatusSchema } from "./auction.js";
import {
  CommandMetaSchema,
  EmiratesIdNumberSchema,
  IsoDateTimeSchema,
  KycStatusSchema,
  MoneySchema,
  NonNegativeIntegerSchema,
  UuidSchema,
  createCommandAckSchema,
} from "./core.js";

export const LotSubscribeCommandSchema = CommandMetaSchema.extend({
  afterSequence: NonNegativeIntegerSchema.optional(),
  lotId: UuidSchema,
});

export const LotUnsubscribeCommandSchema = CommandMetaSchema.extend({
  lotId: UuidSchema,
});

export const LotSyncCommandSchema = CommandMetaSchema.extend({
  afterSequence: NonNegativeIntegerSchema,
  lotId: UuidSchema,
});

export const PlaceBidCommandSchema = CommandMetaSchema.extend({
  amount: MoneySchema,
  expectedSequence: NonNegativeIntegerSchema,
  lotId: UuidSchema,
  termsVersionId: UuidSchema,
});

export const SetProxyBidCommandSchema = CommandMetaSchema.extend({
  expectedSequence: NonNegativeIntegerSchema,
  lotId: UuidSchema,
  maximum: MoneySchema,
  termsVersionId: UuidSchema,
});

export const PresenceUpdateCommandSchema = CommandMetaSchema.extend({
  lotId: UuidSchema,
  state: z.enum(["VIEWING", "BACKGROUND"]),
});

export const BidCommandResultSchema = z
  .object({
    closesAt: IsoDateTimeSchema,
    currentBid: MoneySchema,
    extended: z.boolean(),
    lotId: UuidSchema,
    myBidStatus: MyBidStatusSchema.extract(["WINNING", "OUTBID"]),
    nextMinimumBid: MoneySchema,
    reserveStatus: ReserveStatusSchema,
    sequence: NonNegativeIntegerSchema,
  })
  .passthrough();

export const BidLatestStateSchema = z
  .object({
    closesAt: IsoDateTimeSchema,
    currentBid: MoneySchema,
    lotId: UuidSchema,
    nextMinimumBid: MoneySchema,
    sequence: NonNegativeIntegerSchema,
  })
  .passthrough();

export const PlaceBidRestRequestSchema = z.strictObject({
  amount: MoneySchema,
  expectedSequence: NonNegativeIntegerSchema,
  termsVersionId: UuidSchema,
});

export const SetProxyBidRestRequestSchema = z.strictObject({
  expectedSequence: NonNegativeIntegerSchema,
  maximum: MoneySchema,
  termsVersionId: UuidSchema,
});

export const BidCommandAckSchema = createCommandAckSchema(
  BidCommandResultSchema,
  BidLatestStateSchema,
);

export const clientCommandSchemas = {
  "bid:place": PlaceBidCommandSchema,
  "lot:subscribe": LotSubscribeCommandSchema,
  "lot:sync": LotSyncCommandSchema,
  "lot:unsubscribe": LotUnsubscribeCommandSchema,
  "presence:update": PresenceUpdateCommandSchema,
  "proxy-bid:set": SetProxyBidCommandSchema,
} as const;

export type ClientCommandName = keyof typeof clientCommandSchemas;
export type LotSubscribeCommand = z.infer<typeof LotSubscribeCommandSchema>;
export type LotUnsubscribeCommand = z.infer<typeof LotUnsubscribeCommandSchema>;
export type LotSyncCommand = z.infer<typeof LotSyncCommandSchema>;
export type PlaceBidCommand = z.infer<typeof PlaceBidCommandSchema>;
export type SetProxyBidCommand = z.infer<typeof SetProxyBidCommandSchema>;
export type PresenceUpdateCommand = z.infer<typeof PresenceUpdateCommandSchema>;
export type BidCommandResult = z.infer<typeof BidCommandResultSchema>;
export type BidLatestState = z.infer<typeof BidLatestStateSchema>;
export type PlaceBidRestRequest = z.infer<typeof PlaceBidRestRequestSchema>;

export const SubmitKycVerificationCommandSchema = CommandMetaSchema.extend({
  emiratesIdNumber: EmiratesIdNumberSchema,
  fullNameEn: z.string().min(3),
  fullNameAr: z.string().optional(),
  nationality: z.string().min(2),
  dateOfBirth: IsoDateTimeSchema,
  expiryDate: IsoDateTimeSchema,
  cardFrontRef: z.string().min(1),
  cardBackRef: z.string().min(1),
  selfieRef: z.string().optional(),
});

export const KycSessionResultSchema = z
  .object({
    status: KycStatusSchema,
    bidderNumber: z.string().optional(),
    verifiedAt: IsoDateTimeSchema.optional(),
    failureReason: z.string().optional(),
  })
  .passthrough();

export type SubmitKycVerificationCommand = z.infer<
  typeof SubmitKycVerificationCommandSchema
>;
export type KycSessionResult = z.infer<typeof KycSessionResultSchema>;
