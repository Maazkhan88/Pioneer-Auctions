import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { DatabaseModule } from "../database/database.module.js";
import { AdminPermissionGuard } from "./admin-permission.guard.js";
import { IdentityService } from "./identity.service.js";
import { SessionService } from "./session.service.js";

@Module({
  exports: [AdminPermissionGuard, IdentityService, SessionService],
  imports: [DatabaseModule],
  providers: [AdminPermissionGuard, IdentityService, Reflector, SessionService],
})
export class IdentityModule {}
