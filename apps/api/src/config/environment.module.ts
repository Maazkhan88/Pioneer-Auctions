import { Global, Module } from "@nestjs/common";

import { EnvironmentService } from "./environment.service.js";

@Global()
@Module({
  exports: [EnvironmentService],
  providers: [EnvironmentService],
})
export class EnvironmentModule {}
