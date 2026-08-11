import { z } from "zod";

export const createDepositPaymentIntentSchema = z.object({
  amountFils: z.number().int().positive(),
});

export interface CreateDepositPaymentIntentInput {
  readonly amountFils: number;
}

export function parseCreateDepositPaymentIntentInput(
  input: unknown,
): CreateDepositPaymentIntentInput {
  return createDepositPaymentIntentSchema.parse(input);
}
