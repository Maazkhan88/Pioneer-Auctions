import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { BiddingController } from "./bidding.controller.js";
import { BiddingService } from "./bidding.service.js";

@Module({
  controllers: [BiddingController],
  imports: [DatabaseModule, IdentityModule],
  providers: [BiddingService],
})
export class BiddingModule {}
