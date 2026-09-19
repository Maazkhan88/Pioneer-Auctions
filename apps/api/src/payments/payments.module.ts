import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AdminDepositsController } from "./admin-deposits.controller.js";
import { DepositsController } from "./deposits.controller.js";
import { DepositsService } from "./deposits.service.js";
import { DummyPaymentProvider } from "./dummy-payment.provider.js";
import { PAYMENT_PROVIDER } from "./payment-provider.js";
import { PaymentWebhooksController } from "./payment-webhooks.controller.js";
import { PaymentsController } from "./payments.controller.js";
import { RefundsController } from "./refunds.controller.js";

@Module({
  controllers: [
    PaymentsController,
    DepositsController,
    RefundsController,
    PaymentWebhooksController,
    AdminDepositsController,
  ],
  exports: [DepositsService, PAYMENT_PROVIDER],
  imports: [AuditModule, DatabaseModule, IdentityModule],
  providers: [
    DepositsService,
    DummyPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: DummyPaymentProvider,
    },
  ],
})
export class PaymentsModule {}
