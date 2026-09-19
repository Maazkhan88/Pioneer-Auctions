import { z } from "zod";

import { MyBidStatusSchema, ReserveStatusSchema } from "./auction.js";
import {
  CommandMetaSchema,
  ContractVersionSchema,
  CurrencySchema,
  EmiratesIdNumberSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  KycStatusSchema,
  MoneySchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
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

export const SubmitKycRestRequestSchema = z.strictObject({
  cardBackRef: z.string().trim().min(1).max(256),
  cardFrontRef: z.string().trim().min(1).max(256),
  dateOfBirth: IsoDateSchema,
  emiratesIdNumber: EmiratesIdNumberSchema,
  expiryDate: IsoDateSchema,
  fullNameAr: z.string().trim().max(128).optional(),
  fullNameEn: z.string().trim().min(2).max(128),
  nationality: z.string().trim().min(2).max(64),
  selfieRef: z.string().trim().max(256).optional(),
});

export const KycStatusResponseSchema = z.strictObject({
  bidderNumber: z.string().optional(),
  status: KycStatusSchema,
});

export const KycSessionResponseSchema = z.strictObject({
  accountId: UuidSchema,
  sessionId: z.string().min(1),
  status: z.string().min(1),
});

export const SubmitKycResponseSchema = z.strictObject({
  bidderNumber: z.string().optional(),
  status: KycStatusSchema,
  verifiedAt: IsoDateTimeSchema.optional(),
});

export type SubmitKycRestRequest = z.infer<typeof SubmitKycRestRequestSchema>;
export type KycStatusResponse = z.infer<typeof KycStatusResponseSchema>;
export type KycSessionResponse = z.infer<typeof KycSessionResponseSchema>;
export type SubmitKycResponse = z.infer<typeof SubmitKycResponseSchema>;

export const DepositBalanceSchema = z.strictObject({
  availableFils: NonNegativeIntegerSchema,
  currency: CurrencySchema,
  heldFils: NonNegativeIntegerSchema,
  totalDepositedFils: NonNegativeIntegerSchema,
});
export type DepositBalance = z.infer<typeof DepositBalanceSchema>;

export const DepositLedgerEntryDirectionSchema = z.enum(["CREDIT", "DEBIT"]);
export type DepositLedgerEntryDirection = z.infer<
  typeof DepositLedgerEntryDirectionSchema
>;

export const DepositLedgerEntrySchema = z.strictObject({
  amountFils: PositiveIntegerSchema,
  createdAt: IsoDateTimeSchema,
  currency: CurrencySchema,
  direction: DepositLedgerEntryDirectionSchema,
  id: UuidSchema,
  lotId: UuidSchema.nullable().optional(),
  reasonCode: z.string().min(1),
});
export type DepositLedgerEntry = z.infer<typeof DepositLedgerEntrySchema>;

export const DepositRefundRequestStatusSchema = z.enum([
  "REQUESTED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
]);
export type DepositRefundRequestStatus = z.infer<
  typeof DepositRefundRequestStatusSchema
>;

export const DepositRefundRequestSchema = z.strictObject({
  amountFils: PositiveIntegerSchema,
  currency: CurrencySchema,
  estimatedSettlementDays: PositiveIntegerSchema,
  id: UuidSchema,
  reason: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  requestedAt: IsoDateTimeSchema,
  status: DepositRefundRequestStatusSchema,
});
export type DepositRefundRequest = z.infer<typeof DepositRefundRequestSchema>;

export const GetDepositsResponseSchema = z.strictObject({
  balance: DepositBalanceSchema,
  contractVersion: ContractVersionSchema,
  entries: z.array(DepositLedgerEntrySchema),
  refundRequests: z.array(DepositRefundRequestSchema),
});
export type GetDepositsResponse = z.infer<typeof GetDepositsResponseSchema>;

export const PaymentIntentStatusSchema = z.enum([
  "REQUIRES_ACTION",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>;

export const CreateDepositPaymentIntentRequestSchema = z.strictObject({
  amount: MoneySchema,
  returnUrl: z.string().min(1).optional(),
});
export type CreateDepositPaymentIntentRequest = z.infer<
  typeof CreateDepositPaymentIntentRequestSchema
>;

export const PaymentIntentResponseSchema = z.strictObject({
  amount: MoneySchema,
  contractVersion: ContractVersionSchema,
  id: z.string().min(1),
  provider: z.string().min(1),
  redirectUrl: z.string().min(1),
  status: PaymentIntentStatusSchema,
});
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;

export const CreateDepositRefundRequestSchema = z.strictObject({
  amount: MoneySchema,
  reason: z.string().trim().max(500).optional(),
});
export type CreateDepositRefundRequest = z.infer<
  typeof CreateDepositRefundRequestSchema
>;

export const DepositRefundResponseSchema = z.strictObject({
  contractVersion: ContractVersionSchema,
  refundRequest: DepositRefundRequestSchema,
});
export type DepositRefundResponse = z.infer<typeof DepositRefundResponseSchema>;

export const AdminDepositAccountBalanceSchema = z.strictObject({
  accountId: UuidSchema,
  availableFils: NonNegativeIntegerSchema,
  displayName: z.string().min(1),
  email: z.string().nullable().optional(),
  heldFils: NonNegativeIntegerSchema,
  phoneE164: z.string().nullable().optional(),
  totalDepositedFils: NonNegativeIntegerSchema,
});
export type AdminDepositAccountBalance = z.infer<
  typeof AdminDepositAccountBalanceSchema
>;

export const AdminDepositActionsResponseSchema = z.strictObject({
  accounts: z.array(AdminDepositAccountBalanceSchema),
  contractVersion: ContractVersionSchema,
  pendingRefunds: z.array(DepositRefundRequestSchema),
  recentEntries: z.array(DepositLedgerEntrySchema),
});
export type AdminDepositActionsResponse = z.infer<
  typeof AdminDepositActionsResponseSchema
>;

export const AdminApproveRefundRequestSchema = z.strictObject({
  note: z.string().trim().max(500).optional(),
});
export type AdminApproveRefundRequest = z.infer<
  typeof AdminApproveRefundRequestSchema
>;

export const AdminRejectRefundRequestSchema = z.strictObject({
  rejectionReason: z.string().trim().min(3).max(500),
});
export type AdminRejectRefundRequest = z.infer<
  typeof AdminRejectRefundRequestSchema
>;
