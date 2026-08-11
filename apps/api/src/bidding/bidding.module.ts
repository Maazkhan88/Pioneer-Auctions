import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { BiddingController } from "./bidding.controller.js";
import { BiddingGateway } from "./bidding.gateway.js";
import { BiddingService } from "./bidding.service.js";

@Module({
  controllers: [BiddingController],
  imports: [DatabaseModule, IdentityModule],
  providers: [BiddingGateway, BiddingService],
})
export class BiddingModule {}
