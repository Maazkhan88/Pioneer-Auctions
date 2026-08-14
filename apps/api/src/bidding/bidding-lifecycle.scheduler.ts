import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";

import { EnvironmentService } from "../config/environment.service.js";
import { StructuredLogger } from "../observability/structured-logger.service.js";
import { AuctionCloseService } from "./auction-close.service.js";
import { AuctionOpenService } from "./auction-open.service.js";
import { BiddingGateway } from "./bidding.gateway.js";

const TICK_INTERVAL_MS = 15_000;

/**
 * Periodically opens due `DRAFT` lots, closes due `LIVE` lots, and
 * publishes any outbox events either produces. This is the only lifecycle
 * automation anywhere in the app -- there is no external cron/scheduler
 * wired up, so without this, lots never open or close on their own
 * regardless of `starts_at`/`closes_at`. Runs in-process via `setInterval`
 * for MVP simplicity; a production deployment may prefer invoking
 * `AuctionOpenService`/`AuctionCloseService` from an externally-scheduled
 * job instead of an always-on in-process timer (see DEC-021).
 */
@Injectable()
export class BiddingLifecycleScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(AuctionOpenService)
    private readonly openService: AuctionOpenService,
    @Inject(AuctionCloseService)
    private readonly closeService: AuctionCloseService,
    @Inject(BiddingGateway)
    private readonly gateway: BiddingGateway,
    @Inject(EnvironmentService)
    private readonly environment: EnvironmentService,
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (this.environment.values.nodeEnv === "test") {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
    }
  }

  async tick(): Promise<void> {
    try {
      const opened = await this.openService.openDueLots();
      const closed = await this.closeService.closeDueLots();
      const published = await this.gateway.publishPendingOutboxEvents();
      if (opened > 0 || closed > 0 || published > 0) {
        this.logger.log("Lifecycle scheduler tick", {
          closed,
          opened,
          published,
        });
      }
    } catch (error) {
      this.logger.error("Lifecycle scheduler tick failed", error);
    }
  }
}
