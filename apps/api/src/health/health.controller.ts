import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Response } from "express";

import { HealthService, type ReadinessResult } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get("live")
  liveness(): { readonly status: "alive" } {
    return { status: "alive" };
  }

  @Get("ready")
  async readiness(
    @Res() response: Response,
  ): Promise<Response<ReadinessResult>> {
    const result = await this.health.readiness();
    return response.status(result.status === "ready" ? 200 : 503).json(result);
  }
}
