import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { DatabaseModule } from "../database/database.module.js";
import { AdminPermissionGuard } from "./admin-permission.guard.js";
import { IdentityService } from "./identity.service.js";
import { KycController } from "./kyc.controller.js";
import { KycService } from "./kyc.service.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [KycController],
  exports: [AdminPermissionGuard, IdentityService, KycService, SessionService],
  imports: [DatabaseModule],
  providers: [
    AdminPermissionGuard,
    IdentityService,
    KycService,
    Reflector,
    SessionService,
  ],
})
export class IdentityModule {}
