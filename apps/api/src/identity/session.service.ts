import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { IdentityService, type AccountSummary } from "./identity.service.js";

@Injectable()
export class SessionService {
  constructor(
    @Inject(IdentityService)
    private readonly identity: IdentityService,
  ) {}

  async requireTestHeaderAccount(request: Request): Promise<AccountSummary> {
    const accountId = request.header("x-pioneer-test-account-id");
    if (accountId === undefined || accountId.length === 0) {
      throw new UnauthorizedException("Account context is required");
    }

    const account = await this.identity.getAccountSummary(accountId);
    if (account === null) {
      throw new UnauthorizedException("Account was not found");
    }

    return account;
  }

  async requireAccountId(
    accountId: string | undefined,
  ): Promise<AccountSummary> {
    if (accountId === undefined || accountId.length === 0) {
      throw new UnauthorizedException("Account context is required");
    }

    const account = await this.identity.getAccountSummary(accountId);
    if (account === null) {
      throw new UnauthorizedException("Account was not found");
    }

    return account;
  }
}
