import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

import { DatabasePool } from "../database/database.pool.js";
import { NotificationsService } from "./notifications.service.js";

interface Milestone {
  readonly label: string;
  readonly maxMs: number;
  readonly minMs: number;
  readonly timeRemaining: string;
}

const MILESTONES: Milestone[] = [
  {
    label: "5m",
    maxMs: 5 * 60 * 1000,
    minMs: 3.5 * 60 * 1000,
    timeRemaining: "5 minutes",
  },
  {
    label: "30m",
    maxMs: 30 * 60 * 1000,
    minMs: 27 * 60 * 1000,
    timeRemaining: "30 minutes",
  },
  {
    label: "1h",
    maxMs: 60 * 60 * 1000,
    minMs: 57 * 60 * 1000,
    timeRemaining: "1 hour",
  },
  {
    label: "24h",
    maxMs: 24 * 60 * 60 * 1000,
    minMs: 23.5 * 60 * 60 * 1000,
    timeRemaining: "24 hours",
  },
];

@Injectable()
export class AuctionReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    if (process.env["PIONEER_DISABLE_SCHEDULER"] !== "1") {
      this.timer = setInterval(() => {
        void this.checkReminders();
      }, 30_000);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkReminders(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    let reminderCount = 0;

    try {
      const now = Date.now();
      const liveLots = await this.database.query<{
        id: string;
        lot_number: string;
        title_en: string;
        title_ar: string;
        closes_at: string;
      }>(
        `
          SELECT id, lot_number, title_en, title_ar, closes_at
          FROM lots
          WHERE lifecycle = 'LIVE' AND closes_at > now()
        `,
      );

      for (const lot of liveLots.rows) {
        const closesAtMs = new Date(lot.closes_at).getTime();
        const diffMs = closesAtMs - now;

        for (const milestone of MILESTONES) {
          if (diffMs <= milestone.maxMs && diffMs > milestone.minMs) {
            // Find interested accounts (bidders on this lot)
            const bidders = await this.database.query<{ account_id: string }>(
              `
                SELECT DISTINCT account_id
                FROM bid_ledger
                WHERE lot_id = $1
              `,
              [lot.id],
            );

            for (const bidder of bidders.rows) {
              await this.notificationsService.dispatchNotification(
                bidder.account_id,
                {
                  eventType: "ENDING_SOON",
                  lotId: lot.id,
                  lotNumber: lot.lot_number,
                  timeRemaining: milestone.timeRemaining,
                  titleAr: lot.title_ar,
                  titleEn: lot.title_en,
                },
                `reminder:${milestone.label}`,
              );
              reminderCount++;
            }
          }
        }
      }
    } catch (err) {
      this.logger.error("Error during auction reminder check", err);
    } finally {
      this.isProcessing = false;
    }

    return reminderCount;
  }
}
