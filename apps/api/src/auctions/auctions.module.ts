import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AdminAuctionsController } from "./admin-auctions.controller.js";
import { AuctionsRepository } from "./auctions.repository.js";

@Module({
  controllers: [AdminAuctionsController],
  imports: [AuditModule, DatabaseModule, IdentityModule],
  providers: [AuctionsRepository],
})
export class AuctionsModule {}
