import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import openApiDocument from "@pioneer/contracts/openapi/v1.json" with { type: "json" };
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";

describe("runtime contract exposure", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("serves the generated v1 OpenAPI document without drift", async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get("/api/v1/openapi.json")
      .expect(200);

    expect(response.body).toEqual(openApiDocument);
  });
});
