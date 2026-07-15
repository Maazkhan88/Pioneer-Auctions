import { z } from "zod";

export const CONTRACT_VERSION = 1 as const;
export type ContractVersion = typeof CONTRACT_VERSION;

export const ContractVersionSchema = z
  .int()
  .min(CONTRACT_VERSION)
  .max(CONTRACT_VERSION) as z.ZodType<ContractVersion>;
export const CurrencySchema = z.literal("AED");
export const UuidSchema = z.uuid();
export const IsoDateTimeSchema = z.iso.datetime({ precision: 3 });
export const NonNegativeIntegerSchema = z.int().nonnegative();
export const PositiveIntegerSchema = z.int().positive();
export const CorrelationIdSchema = z.string().trim().min(1).max(128);
export const DeepLinkSchema = z.string().trim().min(1).max(512);

export const MoneySchema = z.strictObject({
  amountFils: NonNegativeIntegerSchema,
  currency: CurrencySchema,
});

export const ErrorCodeSchema = z.enum([
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "ACCOUNT_RESTRICTED",
  "KYC_REQUIRED",
  "KYC_PENDING",
  "DEPOSIT_REQUIRED",
  "DEPOSIT_INSUFFICIENT",
  "TERMS_ACCEPTANCE_REQUIRED",
  "AUCTION_NOT_LIVE",
  "AUCTION_PAUSED",
  "AUCTION_CLOSED",
  "LOT_NOT_FOUND",
  "LOT_NOT_BIDDABLE",
  "BID_TOO_LOW",
  "BID_AMOUNT_INVALID",
  "PROXY_MAX_TOO_LOW",
  "OFFER_NOT_ALLOWED",
  "COMMAND_CONFLICT",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "VALIDATION_FAILED",
  "INTERNAL_ERROR",
]);

export const CommandMetaSchema = z.strictObject({
  commandId: UuidSchema,
  contractVersion: ContractVersionSchema,
  sentAt: IsoDateTimeSchema,
});

export const CommandErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    retryAfterMs: NonNegativeIntegerSchema.optional(),
  })
  .passthrough();

export const FieldErrorSchema = z
  .object({
    code: z.string().min(1),
    field: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

export const ApiErrorSchema = z
  .object({
    contractVersion: ContractVersionSchema,
    error: z
      .object({
        code: ErrorCodeSchema,
        correlationId: CorrelationIdSchema,
        fieldErrors: z.array(FieldErrorSchema).optional(),
        message: z.string().min(1),
        retryable: z.boolean(),
        retryAfterMs: NonNegativeIntegerSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

export function createCommandAckSchema<
  TResult extends z.ZodType,
  TLatest extends z.ZodType,
>(result: TResult, latest: TLatest) {
  return z.discriminatedUnion("status", [
    z
      .object({
        commandId: UuidSchema,
        contractVersion: ContractVersionSchema,
        correlationId: CorrelationIdSchema,
        result,
        serverTime: IsoDateTimeSchema,
        status: z.literal("ACCEPTED"),
      })
      .passthrough(),
    z
      .object({
        commandId: UuidSchema,
        contractVersion: ContractVersionSchema,
        correlationId: CorrelationIdSchema,
        error: CommandErrorSchema,
        latest: latest.optional(),
        serverTime: IsoDateTimeSchema,
        status: z.literal("REJECTED"),
      })
      .passthrough(),
  ]);
}

export type Currency = z.infer<typeof CurrencySchema>;
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
export type Uuid = z.infer<typeof UuidSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type CommandMeta = z.infer<typeof CommandMetaSchema>;
export type CommandError = z.infer<typeof CommandErrorSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type CommandAck<TResult, TLatest = never> =
  | {
      readonly contractVersion: ContractVersion;
      readonly commandId: Uuid;
      readonly status: "ACCEPTED";
      readonly correlationId: string;
      readonly serverTime: IsoDateTime;
      readonly result: TResult;
    }
  | {
      readonly contractVersion: ContractVersion;
      readonly commandId: Uuid;
      readonly status: "REJECTED";
      readonly correlationId: string;
      readonly serverTime: IsoDateTime;
      readonly error: CommandError;
      readonly latest?: TLatest;
    };

export function formatMoney(amountFils: number, locale: "en" | "ar"): string {
  const amount = amountFils / 100;
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: amountFils % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(amount);
  if (locale === "ar") {
    return `${formatted} د.إ`;
  }
  return `AED ${formatted}`;
}

