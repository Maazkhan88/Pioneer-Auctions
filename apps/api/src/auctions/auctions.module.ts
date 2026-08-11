import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AdminAuctionsController } from "./admin-auctions.controller.js";
import { AdminLotsController } from "./admin-lots.controller.js";
import { AuctionsRepository } from "./auctions.repository.js";
import { LotsRepository } from "./lots.repository.js";

@Module({
  controllers: [AdminAuctionsController, AdminLotsController],
  imports: [AuditModule, DatabaseModule, IdentityModule],
  providers: [AuctionsRepository, LotsRepository],
})
export class AuctionsModule {}
