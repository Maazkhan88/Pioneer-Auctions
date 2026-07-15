import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

import { EnvironmentService } from "../config/environment.service.js";
import { runProbe, type ProbeResult } from "./probe.js";

@Injectable()
export class PostgresProbe implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(
    @Inject(EnvironmentService)
    private readonly environment: EnvironmentService,
  ) {
    this.pool = new Pool({
      connectionTimeoutMillis: environment.values.readinessTimeoutMs,
      connectionString: environment.values.databaseUrl,
      max: 2,
      query_timeout: environment.values.readinessTimeoutMs,
    });
  }

  async check(): Promise<ProbeResult> {
    return runProbe(async () => {
      await this.pool.query("SELECT 1");
    }, this.environment.values.readinessTimeoutMs);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
