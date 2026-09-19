import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AuctionReminderScheduler } from "./auction-reminder.scheduler.js";
import { DeviceTokensController } from "./device-tokens.controller.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsRepository } from "./notifications.repository.js";
import { NotificationsService } from "./notifications.service.js";
import { PreferencesController } from "./preferences.controller.js";
import { DevelopmentEmailProvider } from "./providers/development-email.provider.js";
import { DevelopmentPushProvider } from "./providers/development-push.provider.js";
import { EMAIL_PROVIDER } from "./providers/email-provider.interface.js";
import { PUSH_PROVIDER } from "./providers/push-provider.interface.js";
import { TemplateEngineService } from "./template-engine.service.js";

@Module({
  controllers: [
    NotificationsController,
    PreferencesController,
    DeviceTokensController,
  ],
  exports: [NotificationsService, PUSH_PROVIDER, EMAIL_PROVIDER],
  imports: [DatabaseModule, IdentityModule],
  providers: [
    NotificationsRepository,
    TemplateEngineService,
    NotificationsService,
    DevelopmentPushProvider,
    {
      provide: PUSH_PROVIDER,
      useExisting: DevelopmentPushProvider,
    },
    DevelopmentEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: DevelopmentEmailProvider,
    },
    AuctionReminderScheduler,
  ],
})
export class NotificationsModule {}
