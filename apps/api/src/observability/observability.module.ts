import { Global, Module } from "@nestjs/common";

import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";
import { StructuredLogger } from "./structured-logger.service.js";

@Global()
@Module({
  controllers: [MetricsController],
  exports: [StructuredLogger, MetricsService],
  providers: [StructuredLogger, MetricsService],
})
export class ObservabilityModule {}
