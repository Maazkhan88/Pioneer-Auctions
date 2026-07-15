import { Inject, Injectable } from "@nestjs/common";

import { PostgresProbe } from "./postgres.probe.js";
import type { ProbeResult } from "./probe.js";
import { RedisProbe } from "./redis.probe.js";

export interface ReadinessResult {
  readonly checks: {
    readonly postgres: ProbeResult;
    readonly redis: ProbeResult;
  };
  readonly status: "ready" | "degraded";
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(PostgresProbe) private readonly postgres: PostgresProbe,
    @Inject(RedisProbe) private readonly redis: RedisProbe,
  ) {}

  async readiness(): Promise<ReadinessResult> {
    const [postgres, redis] = await Promise.all([
      this.postgres.check(),
      this.redis.check(),
    ]);
    const ready = postgres.status === "up" && redis.status === "up";

    return {
      checks: { postgres, redis },
      status: ready ? "ready" : "degraded",
    };
  }
}
