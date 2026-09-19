export interface CreatePaymentIntentInput {
  readonly accountId: string;
  readonly amountFils: number;
  readonly correlationId: string;
  readonly purpose: "DEPOSIT";
  readonly returnUrl?: string | undefined;
}

export interface PaymentIntent {
  readonly id: string;
  readonly provider: string;
  readonly status:
    | "REQUIRES_ACTION"
    | "PROCESSING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  readonly amountFils: number;
  readonly redirectUrl: string;
}

export interface WebhookPaymentEvent {
  readonly accountId: string;
  readonly amountFils: number;
  readonly currency: "AED";
  readonly eventId: string;
  readonly eventType: "payment.succeeded" | "payment.failed";
  readonly intentId: string;
  readonly timestamp: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  verifyWebhookSignature(
    rawPayload: string | Buffer,
    signature: string | undefined,
  ): boolean;
  parseWebhookPayload(body: unknown): WebhookPaymentEvent;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
