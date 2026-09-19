import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { MetricsController } from "../src/observability/metrics.controller.js";
import { MetricsService } from "../src/observability/metrics.service.js";

describe("Prometheus Metrics & Observability", () => {
  let app: INestApplication | undefined;
  let metricsService: MetricsService;

  afterEach(async () => {
    await app?.close();
  });

  async function createApp(): Promise<Parameters<typeof request>[0]> {
    metricsService = new MetricsService();
    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: metricsService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    return app.getHttpServer() as Parameters<typeof request>[0];
  }

  it("serves Prometheus text format at /metrics and /api/v1/metrics", async () => {
    const server = await createApp();

    const res = await request(server)
      .get("/metrics")
      .expect(200);

    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("# HELP pioneer_active_sockets");
    expect(res.text).toContain("# TYPE pioneer_active_sockets gauge");
    expect(res.text).toContain("# HELP pioneer_bid_commands_total");
    expect(res.text).toContain("# HELP pioneer_bid_duration_ms");
    expect(res.text).toContain("# HELP pioneer_outbox_lag");
    expect(res.text).toContain("# HELP pioneer_db_pool_active");

    const resApi = await request(server)
      .get("/api/v1/metrics")
      .expect(200);
    expect(resApi.text).toEqual(res.text);
  });

  it("tracks socket connections and disconnections in active sockets gauge", async () => {
    const server = await createApp();

    expect(metricsService.getActiveSockets()).toBe(0);
    metricsService.recordSocketConnect();
    metricsService.recordSocketConnect();
    expect(metricsService.getActiveSockets()).toBe(2);

    metricsService.recordSocketDisconnect();
    expect(metricsService.getActiveSockets()).toBe(1);

    const res = await request(server).get("/metrics").expect(200);
    expect(res.text).toContain("pioneer_active_sockets 1");
  });

  it("records bid commands, separates rejections from accepted bids, and calculates latency percentiles", async () => {
    const server = await createApp();

    // Record various bid latencies
    metricsService.recordBidCommand("ACCEPTED", 12);
    metricsService.recordBidCommand("ACCEPTED", 18);
    metricsService.recordBidCommand("ACCEPTED", 25);
    metricsService.recordBidCommand("ACCEPTED", 45);
    metricsService.recordBidCommand("REJECTED", 8, "BID_TOO_LOW");
    metricsService.recordSoftCloseExtension();

    const percentiles = metricsService.getBidPercentiles();
    expect(percentiles.totalSamples).toBe(5);
    expect(percentiles.p50).toBeGreaterThanOrEqual(12);
    expect(percentiles.p95).toBe(45);

    const res = await request(server).get("/metrics").expect(200);
    expect(res.text).toContain('pioneer_bid_commands_total{status="ACCEPTED",reason="NONE"} 4');
    expect(res.text).toContain('pioneer_bid_commands_total{status="REJECTED",reason="BID_TOO_LOW"} 1');
    expect(res.text).toContain("pioneer_soft_close_extensions_total 1");
    expect(res.text).toContain("pioneer_bid_duration_ms_count 5");
  });

  it("serves JSON metrics summary at /api/v1/metrics/summary", async () => {
    const server = await createApp();

    metricsService.setActiveSockets(15);
    metricsService.setOutboxLag(3);
    metricsService.recordBidCommand("ACCEPTED", 30);

    const res = await request(server)
      .get("/api/v1/metrics/summary")
      .expect(200);

    expect(res.body).toMatchObject({
      activeSockets: 15,
      contractVersion: 1,
      outboxLag: 3,
      bidLatency: {
        totalSamples: 1,
        p50: 30,
        p95: 30,
      },
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
