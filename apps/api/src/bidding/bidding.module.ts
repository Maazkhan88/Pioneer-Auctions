import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { BiddingController } from "./bidding.controller.js";
import { AuctionCloseService } from "./auction-close.service.js";
import { AuctionOpenService } from "./auction-open.service.js";
import { BiddingLifecycleScheduler } from "./bidding-lifecycle.scheduler.js";
import { BiddingOutboxPublisher } from "./bidding-outbox.publisher.js";
import { BiddingGateway } from "./bidding.gateway.js";
import { BiddingRecoveryService } from "./bidding-recovery.service.js";
import { BiddingService } from "./bidding.service.js";

@Module({
  controllers: [BiddingController],
  imports: [DatabaseModule, IdentityModule],
  providers: [
    AuctionCloseService,
    AuctionOpenService,
    BiddingGateway,
    BiddingLifecycleScheduler,
    BiddingRecoveryService,
    BiddingOutboxPublisher,
    BiddingService,
  ],
})
export class BiddingModule {}
