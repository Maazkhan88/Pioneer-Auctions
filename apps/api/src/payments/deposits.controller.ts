import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { DepositsService } from "./deposits.service.js";

@Controller("/api/v1/me/deposits")
export class DepositsController {
  constructor(
    @Inject(DepositsService)
    private readonly depositsService: DepositsService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Get()
  async getMyDeposits(@Req() request: Request) {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.depositsService.getDeposits(account.id);
  }
}
