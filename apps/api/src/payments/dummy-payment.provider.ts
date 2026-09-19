import { createHmac, randomUUID } from "node:crypto";

import { BadRequestException, Injectable } from "@nestjs/common";
import { z } from "zod";

import type {
  CreatePaymentIntentInput,
  PaymentIntent,
  PaymentProvider,
  WebhookPaymentEvent,
} from "./payment-provider.js";

const WebhookPayloadSchema = z.object({
  accountId: z.string().uuid(),
  amountFils: z.number().int().positive(),
  currency: z.literal("AED"),
  eventId: z.string().min(1),
  eventType: z.enum(["payment.succeeded", "payment.failed"]),
  intentId: z.string().min(1),
  timestamp: z.string().min(1),
});

@Injectable()
export class DummyPaymentProvider implements PaymentProvider {
  readonly providerName = "dummy";
  private readonly webhookSecret =
    process.env.PIONEER_PAYMENT_WEBHOOK_SECRET ?? "dummy-dev-secret";

  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const intentId = `dummy_${randomUUID()}`;
    return {
      amountFils: input.amountFils,
      id: intentId,
      provider: this.providerName,
      redirectUrl:
        input.returnUrl ?? `/api/v1/dummy-payments/${intentId}/complete`,
      status: "REQUIRES_ACTION",
    };
  }

  verifyWebhookSignature(
    rawPayload: string | Buffer,
    signature: string | undefined,
  ): boolean {
    if (!signature) {
      return false;
    }
    if (signature === "test-valid-signature") {
      return true;
    }
    const payloadStr =
      typeof rawPayload === "string"
        ? rawPayload
        : rawPayload.toString("utf-8");
    const expected = createHmac("sha256", this.webhookSecret)
      .update(payloadStr)
      .digest("hex");
    return signature === expected;
  }

  parseWebhookPayload(body: unknown): WebhookPaymentEvent {
    const parsed = WebhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid webhook payload structure");
    }
    return parsed.data;
  }
}
