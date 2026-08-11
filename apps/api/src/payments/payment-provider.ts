export interface CreatePaymentIntentInput {
  readonly accountId: string;
  readonly amountFils: number;
  readonly correlationId: string;
  readonly purpose: "DEPOSIT";
}

export interface PaymentIntent {
  readonly id: string;
  readonly provider: string;
  readonly status: "REQUIRES_ACTION" | "SUCCEEDED";
  readonly amountFils: number;
  readonly redirectUrl: string;
}

export interface PaymentProvider {
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
