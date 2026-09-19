import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { DepositsService } from "./deposits.service.js";
import { parseCreateDepositPaymentIntentInput } from "./payment-intent.dto.js";

@Controller("/api/v1/deposit-payment-intents")
export class PaymentsController {
  constructor(
    @Inject(DepositsService)
    private readonly depositsService: DepositsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDepositPaymentIntent(
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
  ) {
    const account = await this.session.requireTestHeaderAccount(request);
    const input = parseCreateDepositPaymentIntentInput(body);
    const intent = await this.depositsService.createPaymentIntent(
      account.id,
      input.amountFils,
      input.returnUrl,
      correlationId,
    );

    return {
      ...intent,
      amountFils: intent.amount.amountFils,
    };
  }

  @Get(":id")
  async getDepositPaymentIntent(
    @Param("id") id: string,
    @Req() request: Request,
  ) {
    const account = await this.session.requireTestHeaderAccount(request);
    const intent = await this.depositsService.getPaymentIntent(id, account.id);
    return {
      ...intent,
      amountFils: intent.amount.amountFils,
    };
  }
}
