import { z } from "zod";

import {
  BidEligibilitySchema,
  LotLifecycleSchema,
  LotPublicStateSchema,
  MyBidStateSchema,
  MyBidStatusSchema,
  ReserveStatusSchema,
} from "./auction.js";
import {
  ContractVersionSchema,
  CorrelationIdSchema,
  DeepLinkSchema,
  IsoDateTimeSchema,
  MoneySchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
  UuidSchema,
} from "./core.js";

export const ServerHelloSchema = z
  .object({
    connectionId: z.string().min(1),
    contractVersion: ContractVersionSchema,
    heartbeatIntervalMs: PositiveIntegerSchema,
    maxCommandSkewSequence: NonNegativeIntegerSchema,
    serverTime: IsoDateTimeSchema,
  })
  .passthrough();

function lotEventSchema<TName extends string, TFields extends z.ZodRawShape>(
  event: TName,
  fields: TFields,
) {
  return z
    .object({
      auctionId: UuidSchema,
      contractVersion: ContractVersionSchema.optional(),
      correlationId: CorrelationIdSchema.optional(),
      event: z.literal(event),
      eventId: UuidSchema.optional(),
      lotId: UuidSchema,
      occurredAt: IsoDateTimeSchema.optional(),
      sequence: NonNegativeIntegerSchema,
      ...fields,
    })
    .passthrough();
}

function personalEventSchema<TName extends string, TData extends z.ZodType>(
  event: TName,
  data: TData,
) {
  return z
    .object({
      contractVersion: ContractVersionSchema,
      correlationId: CorrelationIdSchema,
      data,
      event: z.literal(event),
      eventId: UuidSchema,
      occurredAt: IsoDateTimeSchema,
    })
    .passthrough();
}

export const LotSnapshotSchema = z
  .object({
    auctionId: UuidSchema,
    contractVersion: ContractVersionSchema,
    event: z.literal("lot:snapshot"),
    generatedAt: IsoDateTimeSchema,
    lotId: UuidSchema,
    myBidState: MyBidStateSchema.optional(),
    sequence: NonNegativeIntegerSchema,
    state: LotPublicStateSchema,
  })
  .passthrough();

export const BidAcceptedEventSchema = lotEventSchema("bid:accepted", {
  amount: MoneySchema,
  bidCount: NonNegativeIntegerSchema.optional(),
  bidId: UuidSchema.optional(),
  bidderAlias: z.string().min(1).max(64).optional(),
  bidKind: z.enum(["MANUAL", "PROXY"]),
  currentBid: MoneySchema,
  extended: z.boolean().default(false),
  nextMinimumBid: MoneySchema,
  reserveStatus: ReserveStatusSchema,
});

export const AuctionExtendedEventSchema = lotEventSchema("auction:extended", {
  closesAt: IsoDateTimeSchema,
  extensionCount: PositiveIntegerSchema,
  extensionMs: PositiveIntegerSchema.optional(),
  previousClosesAt: IsoDateTimeSchema.optional(),
  reason: z.literal("QUALIFYING_BID_IN_SOFT_CLOSE_WINDOW").optional(),
});

export const AuctionStateChangedEventSchema = lotEventSchema(
  "auction:state-changed",
  {
    approvalSlaDueAt: IsoDateTimeSchema.optional(),
    closesAt: IsoDateTimeSchema.optional(),
    lifecycle: LotLifecycleSchema,
    previousLifecycle: LotLifecycleSchema,
    reasonCode: z.string().min(1).optional(),
    startsAt: IsoDateTimeSchema.optional(),
  },
);

export const ReserveStatusChangedEventSchema = lotEventSchema(
  "reserve:status-changed",
  {
    reserveStatus: z.literal("MET"),
  },
);

export const LotPresenceChangedEventSchema = lotEventSchema(
  "lot:presence-changed",
  {
    approximateViewerCount: NonNegativeIntegerSchema,
  },
);

export const MyBidStatusChangedEventSchema = personalEventSchema(
  "bid:status-changed",
  z
    .object({
      activeProxyMaximum: MoneySchema.nullable(),
      auctionId: UuidSchema,
      closesAt: IsoDateTimeSchema,
      currentBid: MoneySchema.nullable(),
      lotId: UuidSchema,
      lotSequence: NonNegativeIntegerSchema,
      nextMinimumBid: MoneySchema,
      status: MyBidStatusSchema,
    })
    .passthrough(),
);

export const EligibilityChangedEventSchema = personalEventSchema(
  "eligibility:changed",
  z
    .object({
      eligibility: BidEligibilitySchema,
      lotId: UuidSchema.optional(),
    })
    .passthrough(),
);

export const ProxyBidChangedEventSchema = personalEventSchema(
  "proxy-bid:changed",
  z
    .object({
      activeProxyMaximum: MoneySchema.nullable(),
      currentBid: MoneySchema,
      lotId: UuidSchema,
      lotSequence: NonNegativeIntegerSchema,
      nextMinimumBid: MoneySchema,
      status: z.enum(["ACTIVE", "EXCEEDED", "CANCELLED", "ENDED"]),
    })
    .passthrough(),
);

export const ApprovalChangedEventSchema = personalEventSchema(
  "approval:changed",
  z
    .object({
      approvalSlaDueAt: IsoDateTimeSchema.optional(),
      auctionId: UuidSchema,
      deepLink: DeepLinkSchema,
      hammerPrice: MoneySchema,
      lotId: UuidSchema,
      outcome: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      paymentDueAt: IsoDateTimeSchema.optional(),
      rejectionReason: z
        .object({ code: z.string().min(1), message: z.string().min(1) })
        .passthrough()
        .optional(),
    })
    .passthrough(),
);

function entityChangedDataSchema(idField: string) {
  return z
    .object({
      changedAt: IsoDateTimeSchema,
      deepLink: DeepLinkSchema,
      displayAmount: MoneySchema.optional(),
      state: z.string().trim().min(1).max(64),
    })
    .catchall(z.unknown())
    .refine((data) => UuidSchema.safeParse(data[idField]).success, {
      message: `${idField} must be a UUID`,
      path: [idField],
    });
}

export const DepositChangedEventSchema = personalEventSchema(
  "deposit:changed",
  entityChangedDataSchema("depositId"),
);
export const PaymentChangedEventSchema = personalEventSchema(
  "payment:changed",
  entityChangedDataSchema("paymentId"),
);
export const OfferChangedEventSchema = personalEventSchema(
  "offer:changed",
  entityChangedDataSchema("offerId"),
);
export const NotificationCreatedEventSchema = personalEventSchema(
  "notification:created",
  entityChangedDataSchema("notificationId"),
);

export const serverEventSchemas = {
  "approval:changed": ApprovalChangedEventSchema,
  "auction:extended": AuctionExtendedEventSchema,
  "auction:state-changed": AuctionStateChangedEventSchema,
  "bid:accepted": BidAcceptedEventSchema,
  "bid:status-changed": MyBidStatusChangedEventSchema,
  "deposit:changed": DepositChangedEventSchema,
  "eligibility:changed": EligibilityChangedEventSchema,
  "lot:presence-changed": LotPresenceChangedEventSchema,
  "lot:snapshot": LotSnapshotSchema,
  "notification:created": NotificationCreatedEventSchema,
  "offer:changed": OfferChangedEventSchema,
  "payment:changed": PaymentChangedEventSchema,
  "proxy-bid:changed": ProxyBidChangedEventSchema,
  "reserve:status-changed": ReserveStatusChangedEventSchema,
  "server:hello": ServerHelloSchema,
} as const;

export type ServerEventName = keyof typeof serverEventSchemas;
export type ServerHello = z.infer<typeof ServerHelloSchema>;
export type LotSnapshot = z.infer<typeof LotSnapshotSchema>;
export type BidAcceptedEvent = z.infer<typeof BidAcceptedEventSchema>;
export type AuctionExtendedEvent = z.infer<typeof AuctionExtendedEventSchema>;
export type AuctionStateChangedEvent = z.infer<
  typeof AuctionStateChangedEventSchema
>;
export type ReserveStatusChangedEvent = z.infer<
  typeof ReserveStatusChangedEventSchema
>;
export type LotPresenceChangedEvent = z.infer<
  typeof LotPresenceChangedEventSchema
>;
export type MyBidStatusChangedEvent = z.infer<
  typeof MyBidStatusChangedEventSchema
>;
export type EligibilityChangedEvent = z.infer<
  typeof EligibilityChangedEventSchema
>;
export type ProxyBidChangedEvent = z.infer<typeof ProxyBidChangedEventSchema>;
export type ApprovalChangedEvent = z.infer<typeof ApprovalChangedEventSchema>;
export type DepositChangedEvent = z.infer<typeof DepositChangedEventSchema>;
export type PaymentChangedEvent = z.infer<typeof PaymentChangedEventSchema>;
export type OfferChangedEvent = z.infer<typeof OfferChangedEventSchema>;
export type NotificationCreatedEvent = z.infer<
  typeof NotificationCreatedEventSchema
>;

export type PublicLotEvent =
  | BidAcceptedEvent
  | AuctionExtendedEvent
  | AuctionStateChangedEvent
  | ReserveStatusChangedEvent
  | LotPresenceChangedEvent;
