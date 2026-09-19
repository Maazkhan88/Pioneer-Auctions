import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { DepositsService } from "./deposits.service.js";
import { parseCreateDepositRefundRequestInput } from "./payment-intent.dto.js";

@Controller("/api/v1/deposit-refund-requests")
export class RefundsController {
  constructor(
    @Inject(DepositsService)
    private readonly depositsService: DepositsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async requestDepositRefund(
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "refund-request",
  ) {
    const account = await this.session.requireTestHeaderAccount(request);
    const input = parseCreateDepositRefundRequestInput(body);
    return this.depositsService.requestRefund(
      account.id,
      input.amountFils,
      input.reason,
      correlationId,
    );
  }
}
