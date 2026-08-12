import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { BiddingController } from "./bidding.controller.js";
import { BiddingOutboxPublisher } from "./bidding-outbox.publisher.js";
import { BiddingGateway } from "./bidding.gateway.js";
import { BiddingService } from "./bidding.service.js";

@Module({
  controllers: [BiddingController],
  imports: [DatabaseModule, IdentityModule],
  providers: [BiddingGateway, BiddingOutboxPublisher, BiddingService],
})
export class BiddingModule {}
