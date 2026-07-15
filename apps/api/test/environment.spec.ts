import { describe, expect, it } from "vitest";

import { readEnvironment } from "../src/config/environment.js";

describe("environment", () => {
  it("uses safe local dependency defaults outside production", () => {
    const environment = readEnvironment({ NODE_ENV: "test" });

    expect(environment.databaseUrl).toContain("localhost:5432");
    expect(environment.redisUrl).toBe("redis://localhost:6379");
  });

  it("fails closed when production dependency configuration is absent", () => {
    expect(() => readEnvironment({ NODE_ENV: "production" })).toThrow(
      "DATABASE_URL is required in production",
    );
  });
});
