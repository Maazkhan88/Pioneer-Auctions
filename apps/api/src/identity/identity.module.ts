import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { DatabaseModule } from "../database/database.module.js";
import { AdminPermissionGuard } from "./admin-permission.guard.js";
import { DevelopmentFakeKycProvider } from "./development-fake-kyc.provider.js";
import { IdentityService } from "./identity.service.js";
import { KYC_PROVIDER } from "./kyc-provider.interface.js";
import { KycController } from "./kyc.controller.js";
import { KycService } from "./kyc.service.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [KycController],
  exports: [
    AdminPermissionGuard,
    IdentityService,
    KYC_PROVIDER,
    KycService,
    SessionService,
  ],
  imports: [DatabaseModule],
  providers: [
    AdminPermissionGuard,
    DevelopmentFakeKycProvider,
    IdentityService,
    KycService,
    Reflector,
    SessionService,
    {
      provide: KYC_PROVIDER,
      useExisting: DevelopmentFakeKycProvider,
    },
  ],
})
export class IdentityModule {}
