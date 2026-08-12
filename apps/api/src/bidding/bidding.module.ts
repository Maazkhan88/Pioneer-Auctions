import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { BiddingController } from "./bidding.controller.js";
import { AuctionCloseService } from "./auction-close.service.js";
import { BiddingOutboxPublisher } from "./bidding-outbox.publisher.js";
import { BiddingGateway } from "./bidding.gateway.js";
import { BiddingService } from "./bidding.service.js";

@Module({
  controllers: [BiddingController],
  imports: [DatabaseModule, IdentityModule],
  providers: [
    AuctionCloseService,
    BiddingGateway,
    BiddingOutboxPublisher,
    BiddingService,
  ],
})
export class BiddingModule {}
