import { Body, Controller, Headers, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { AuditService } from "../audit/audit.service.js";
import { SessionService } from "../identity/session.service.js";
import { parseCreateDepositPaymentIntentInput } from "./payment-intent.dto.js";
import {
  PAYMENT_PROVIDER,
  type PaymentIntent,
  type PaymentProvider,
} from "./payment-provider.js";

@Controller("/api/v1/deposit-payment-intents")
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    private readonly session: SessionService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async createDepositPaymentIntent(
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
  ): Promise<PaymentIntent> {
    const account = await this.session.requireTestHeaderAccount(request);
    const input = parseCreateDepositPaymentIntentInput(body);
    const intent = await this.paymentProvider.createIntent({
      accountId: account.id,
      amountFils: input.amountFils,
      correlationId,
      purpose: "DEPOSIT",
    });

    await this.audit.record({
      action: "payments.deposit_intent.create",
      actorAccountId: account.id,
      correlationId,
      metadata: {
        amountFils: intent.amountFils,
        provider: intent.provider,
        status: intent.status,
      },
      subjectId: null,
      subjectType: "payment_intent",
    });

    return intent;
  }
}
