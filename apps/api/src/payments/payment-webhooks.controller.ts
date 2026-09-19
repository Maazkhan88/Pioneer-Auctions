import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { DepositsService } from "./deposits.service.js";

@Controller("/api/v1/webhooks/payments")
export class PaymentWebhooksController {
  constructor(
    @Inject(DepositsService)
    private readonly depositsService: DepositsService,
  ) {}

  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(
    @Param("provider") provider: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("x-webhook-signature") signature?: string,
    @Headers("x-signature") altSignature?: string,
    @Headers("x-correlation-id") correlationId = "webhook-corr",
  ) {
    const rawPayload =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(body);

    const sig = signature ?? altSignature;

    return this.depositsService.processWebhook(
      provider,
      rawPayload,
      sig,
      body,
      correlationId,
    );
  }
}
