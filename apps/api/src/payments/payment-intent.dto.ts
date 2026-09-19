import { z } from "zod";

export const createDepositPaymentIntentSchema = z
  .object({
    amount: z
      .object({
        amountFils: z.number().int().positive(),
        currency: z.literal("AED"),
      })
      .optional(),
    amountFils: z.number().int().positive().optional(),
    returnUrl: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.amount !== undefined || data.amountFils !== undefined,
    {
      message: "Either amount or amountFils is required",
    },
  );

export interface CreateDepositPaymentIntentInput {
  readonly amountFils: number;
  readonly returnUrl?: string | undefined;
}

export function parseCreateDepositPaymentIntentInput(
  input: unknown,
): CreateDepositPaymentIntentInput {
  const parsed = createDepositPaymentIntentSchema.parse(input);
  const amountFils = parsed.amount?.amountFils ?? parsed.amountFils!;
  return {
    amountFils,
    returnUrl: parsed.returnUrl,
  };
}

export const createDepositRefundRequestSchema = z.object({
  amount: z
    .object({
      amountFils: z.number().int().positive(),
      currency: z.literal("AED"),
    })
    .optional(),
  amountFils: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});

export interface CreateDepositRefundRequestInput {
  readonly amountFils: number;
  readonly reason?: string | undefined;
}

export function parseCreateDepositRefundRequestInput(
  input: unknown,
): CreateDepositRefundRequestInput {
  const parsed = createDepositRefundRequestSchema.parse(input);
  const amountFils = parsed.amount?.amountFils ?? parsed.amountFils!;
  return {
    amountFils,
    reason: parsed.reason,
  };
}
