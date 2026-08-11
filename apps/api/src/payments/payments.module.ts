import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { DummyPaymentProvider } from "./dummy-payment.provider.js";
import { PAYMENT_PROVIDER } from "./payment-provider.js";
import { PaymentsController } from "./payments.controller.js";

@Module({
  controllers: [PaymentsController],
  imports: [AuditModule, IdentityModule],
  providers: [
    DummyPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: DummyPaymentProvider,
    },
  ],
})
export class PaymentsModule {}
