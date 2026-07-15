import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";

import { EnvironmentModule } from "./config/environment.module.js";
import { HealthModule } from "./health/health.module.js";
import { CorrelationIdMiddleware } from "./observability/correlation-id.middleware.js";
import { ObservabilityModule } from "./observability/observability.module.js";

@Module({
  imports: [EnvironmentModule, ObservabilityModule, HealthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
