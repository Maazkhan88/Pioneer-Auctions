import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

import { EnvironmentService } from "../config/environment.service.js";
import { runProbe, type ProbeResult } from "./probe.js";

@Injectable()
export class RedisProbe implements OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(
    @Inject(EnvironmentService)
    private readonly environment: EnvironmentService,
  ) {
    this.client = createClient({
      socket: {
        connectTimeout: environment.values.readinessTimeoutMs,
        reconnectStrategy: false,
      },
      url: environment.values.redisUrl,
    });
    this.client.on("error", () => undefined);
  }

  async check(): Promise<ProbeResult> {
    return runProbe(async () => {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.ping();
    }, this.environment.values.readinessTimeoutMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }
}
