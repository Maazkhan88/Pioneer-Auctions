import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type {
  CreatePaymentIntentInput,
  PaymentIntent,
  PaymentProvider,
} from "./payment-provider.js";

@Injectable()
export class DummyPaymentProvider implements PaymentProvider {
  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const intentId = `dummy_${randomUUID()}`;
    return {
      amountFils: input.amountFils,
      id: intentId,
      provider: "dummy",
      redirectUrl: `/api/v1/dummy-payments/${intentId}/complete`,
      status: "REQUIRES_ACTION",
    };
  }
}
