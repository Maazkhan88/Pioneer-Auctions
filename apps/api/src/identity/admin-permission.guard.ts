import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { IdentityService } from "./identity.service.js";
import { REQUIRED_PERMISSION_METADATA } from "./permission.decorator.js";
import { SessionService } from "./session.service.js";

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(IdentityService)
    private readonly identity: IdentityService,
    @Inject(SessionService)
    private readonly session: SessionService,
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
    const account = await this.session.requireTestHeaderAccount(request);

    if (!this.identity.hasPermission(account, requiredPermission)) {
      throw new ForbiddenException("Admin permission is required");
    }

    return true;
  }
}
