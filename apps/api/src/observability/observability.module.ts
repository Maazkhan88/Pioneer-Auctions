import { Global, Module } from "@nestjs/common";

import { StructuredLogger } from "./structured-logger.service.js";

@Global()
@Module({
  exports: [StructuredLogger],
  providers: [StructuredLogger],
})
export class ObservabilityModule {}
