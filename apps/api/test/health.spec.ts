import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { PostgresProbe } from "../src/health/postgres.probe.js";
import type { ProbeResult } from "../src/health/probe.js";
import { RedisProbe } from "../src/health/redis.probe.js";

class UpProbe {
  check(): Promise<ProbeResult> {
    return Promise.resolve({ latencyMs: 1, status: "up" });
  }
}

class DownProbe {
  check(): Promise<ProbeResult> {
    return Promise.resolve({ latencyMs: 1, status: "down" });
  }
}

describe("health endpoints", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("keeps liveness independent and reports ready dependencies", async () => {
    app = await createApp(UpProbe, UpProbe);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get("/health/live")
      .set("x-correlation-id", "health-test")
      .expect("x-correlation-id", "health-test")
      .expect(200, { status: "alive" });
    await request(server)
      .get("/health/ready")
      .expect(200)
      .expect({
        checks: {
          postgres: { latencyMs: 1, status: "up" },
          redis: { latencyMs: 1, status: "up" },
        },
        status: "ready",
      });
  });

  it("returns 503 without exposing dependency errors", async () => {
    app = await createApp(DownProbe, UpProbe);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(server).get("/health/ready").expect(503);
    expect(response.body).toEqual({
      checks: {
        postgres: { latencyMs: 1, status: "down" },
        redis: { latencyMs: 1, status: "up" },
      },
      status: "degraded",
    });
  });
});

async function createApp(
  postgresProbe: new () => UpProbe | DownProbe,
  redisProbe: new () => UpProbe | DownProbe,
): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PostgresProbe)
    .useClass(postgresProbe)
    .overrideProvider(RedisProbe)
    .useClass(redisProbe)
    .compile();

  const created = module.createNestApplication();
  await created.init();
  return created;
}
