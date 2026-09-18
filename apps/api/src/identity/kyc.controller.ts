import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { parseSubmitKycPayload } from "./kyc.dto.js";
import { KycService } from "./kyc.service.js";
import { SessionService } from "./session.service.js";

@Controller("/api/v1/me/kyc")
export class KycController {
  constructor(
    @Inject(KycService)
    private readonly kycService: KycService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Get()
  async getStatus(@Req() request: Request) {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.kycService.getKycStatus(account.id);
  }

  @Post("sessions")
  @HttpCode(HttpStatus.CREATED)
  async startSession(@Req() request: Request) {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.kycService.startSession(account.id);
  }

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  async submit(@Body() body: unknown, @Req() request: Request) {
    const account = await this.session.requireTestHeaderAccount(request);
    const validatedPayload = parseSubmitKycPayload(body);
    return this.kycService.submitVerification(account.id, validatedPayload);
  }
}
