import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { IdentityService } from "./identity.service.js";
import { REQUIRED_PERMISSION_METADATA } from "./permission.decorator.js";

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(IdentityService)
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermission === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accountId = request.header("x-pioneer-test-account-id");
    if (accountId === undefined || accountId.length === 0) {
      throw new UnauthorizedException("Admin account context is required");
    }

    const account = await this.identity.getAccountSummary(accountId);
    if (account === null) {
      throw new UnauthorizedException("Admin account was not found");
    }

    if (!this.identity.hasPermission(account, requiredPermission)) {
      throw new ForbiddenException("Admin permission is required");
    }

    return true;
  }
}
