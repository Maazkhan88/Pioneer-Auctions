import { Controller, Get, Header, Inject } from "@nestjs/common";

import { MetricsService } from "./metrics.service.js";

@Controller()
export class MetricsController {
  constructor(
    @Inject(MetricsService)
    private readonly metrics: MetricsService,
  ) {}

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  getPrometheusMetrics(): string {
    return this.metrics.toPrometheusText();
  }

  @Get("api/v1/metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  getApiMetrics(): string {
    return this.metrics.toPrometheusText();
  }

  @Get("api/v1/metrics/summary")
  getJsonSummary(): Record<string, unknown> {
    const percentiles = this.metrics.getBidPercentiles();
    return {
      activeSockets: this.metrics.getActiveSockets(),
      bidLatency: percentiles,
      contractVersion: 1,
      outboxLag: this.metrics.getOutboxLag(),
      softCloseExtensions: this.metrics.getSoftCloseExtensions(),
      timestamp: new Date().toISOString(),
    };
  }
}
