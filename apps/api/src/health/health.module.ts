import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { PostgresProbe } from "./postgres.probe.js";
import { RedisProbe } from "./redis.probe.js";

@Module({
  controllers: [HealthController],
  providers: [HealthService, PostgresProbe, RedisProbe],
})
export class HealthModule {}
