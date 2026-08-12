import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AdminAuctionsController } from "./admin-auctions.controller.js";
import { AdminLotsController } from "./admin-lots.controller.js";
import { AdminOperationsController } from "./admin-operations.controller.js";
import { AdminOperationsRepository } from "./admin-operations.repository.js";
import { AuctionsRepository } from "./auctions.repository.js";
import { LotsRepository } from "./lots.repository.js";
import { PublicLotsController } from "./public-lots.controller.js";

@Module({
  controllers: [
    AdminAuctionsController,
    AdminLotsController,
    AdminOperationsController,
    PublicLotsController,
  ],
  imports: [AuditModule, DatabaseModule, IdentityModule],
  providers: [AdminOperationsRepository, AuctionsRepository, LotsRepository],
})
export class AuctionsModule {}
