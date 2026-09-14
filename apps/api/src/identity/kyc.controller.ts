import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { KycService, KycVerificationPayload } from "./kyc.service.js";

@Controller("me/kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  async getStatus(
    @Headers("x-pioneer-test-account-id") accountId?: string,
  ) {
    const resolvedAccount = accountId ?? "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f";
    return this.kycService.getKycStatus(resolvedAccount);
  }

  @Post("sessions")
  @HttpCode(HttpStatus.CREATED)
  async startSession(
    @Headers("x-pioneer-test-account-id") accountId?: string,
  ) {
    const resolvedAccount = accountId ?? "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f";
    return {
      sessionId: `kyc-sess-${Date.now()}`,
      status: "INITIATED",
      accountId: resolvedAccount,
    };
  }

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  async submit(
    @Body() payload: KycVerificationPayload,
    @Headers("x-pioneer-test-account-id") accountId?: string,
  ) {
    const resolvedAccount = accountId ?? "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f";
    return this.kycService.submitVerification(resolvedAccount, payload);
  }
}
