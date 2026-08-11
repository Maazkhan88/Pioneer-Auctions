import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";

import { AuditModule } from "./audit/audit.module.js";
import { EnvironmentModule } from "./config/environment.module.js";
import { ContractsModule } from "./contracts/contracts.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { IdentityModule } from "./identity/identity.module.js";
import { CorrelationIdMiddleware } from "./observability/correlation-id.middleware.js";
import { ObservabilityModule } from "./observability/observability.module.js";

@Module({
  imports: [
    EnvironmentModule,
    ObservabilityModule,
    DatabaseModule,
    IdentityModule,
    AuditModule,
    HealthModule,
    ContractsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
