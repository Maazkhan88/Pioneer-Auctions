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

interface DepositActionBody {
  readonly note?: string | undefined;
  readonly rejectionReason?: string | undefined;
}

@Controller("/api/v1/admin/deposit-actions")
export class AdminDepositsController {
  constructor(
    @Inject(DepositsService)
    private readonly depositsService: DepositsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Get()
  async getAdminDepositActions(@Req() request: Request) {
    await this.session.requireTestHeaderAccount(request);
    return this.depositsService.getAdminDepositActions();
  }

  @Post(":id")
  @HttpCode(HttpStatus.OK)
  async handleDepositAction(
    @Param("id") id: string,
    @Body() body: DepositActionBody | undefined,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "admin-action",
  ) {
    const adminAccount = await this.session.requireTestHeaderAccount(request);

    if (body?.rejectionReason) {
      return this.depositsService.rejectRefund(
        id,
        adminAccount.id,
        body.rejectionReason,
        correlationId,
      );
    }

    return this.depositsService.approveRefund(
      id,
      adminAccount.id,
      body?.note,
      correlationId,
    );
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param("id") id: string,
    @Body() body: DepositActionBody | undefined,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "admin-approve",
  ) {
    const adminAccount = await this.session.requireTestHeaderAccount(request);
    return this.depositsService.approveRefund(
      id,
      adminAccount.id,
      body?.note,
      correlationId,
    );
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param("id") id: string,
    @Body() body: DepositActionBody | undefined,
    @Req() request: Request,
    @Headers("x-correlation-id") correlationId = "admin-reject",
  ) {
    const adminAccount = await this.session.requireTestHeaderAccount(request);
    const reason = body?.rejectionReason ?? "Rejected by finance administrator";
    return this.depositsService.rejectRefund(
      id,
      adminAccount.id,
      reason,
      correlationId,
    );
  }
}
