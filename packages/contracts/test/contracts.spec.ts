import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  BidCommandAckSchema,
  GoldenFixturesSchema,
  IsoDateTimeSchema,
  MoneySchema,
  PlaceBidRestRequestSchema,
  UuidSchema,
  clientCommandSchemas,
  restOperations,
  serverEventSchemas,
} from "../src/index.js";

interface FixtureCollection {
  readonly commands: Record<string, unknown>;
  readonly events: Record<string, unknown>;
}

const validFixtures = await readJson<FixtureCollection>(
  "fixtures/v1/valid-fixtures.json",
);
const invalidFixtures = await readJson<FixtureCollection>(
  "fixtures/v1/invalid-fixtures.json",
);
const goldenFixtures = await readJson<unknown>(
  "fixtures/v1/golden-fixtures.json",
);

describe("v1 fixture compatibility", () => {
  it("validates every named command and event", () => {
    expect(Object.keys(validFixtures.commands).sort()).toEqual(
      Object.keys(clientCommandSchemas).sort(),
    );
    expect(Object.keys(validFixtures.events).sort()).toEqual(
      Object.keys(serverEventSchemas).sort(),
    );

    for (const [name, schema] of Object.entries(clientCommandSchemas)) {
      expect(
        schema.safeParse(validFixtures.commands[name]),
        name,
      ).toMatchObject({ success: true });
    }
    for (const [name, schema] of Object.entries(serverEventSchemas)) {
      expect(schema.safeParse(validFixtures.events[name]), name).toMatchObject({
        success: true,
      });
    }
  });

  it("rejects the invalid fixture for every named command and event", () => {
    expect(Object.keys(invalidFixtures.commands).sort()).toEqual(
      Object.keys(clientCommandSchemas).sort(),
    );
    expect(Object.keys(invalidFixtures.events).sort()).toEqual(
      Object.keys(serverEventSchemas).sort(),
    );

    for (const [name, schema] of Object.entries(clientCommandSchemas)) {
      expect(
        schema.safeParse(invalidFixtures.commands[name]),
        name,
      ).toMatchObject({ success: false });
    }
    for (const [name, schema] of Object.entries(serverEventSchemas)) {
      expect(
        schema.safeParse(invalidFixtures.events[name]),
        name,
      ).toMatchObject({ success: false });
    }
  });

  it("validates the cross-language golden fixture", () => {
    expect(GoldenFixturesSchema.safeParse(goldenFixtures)).toMatchObject({
      success: true,
    });
  });
});

describe("boundary validation", () => {
  it.each([
    { amountFils: 1.5, currency: "AED" },
    { amountFils: Number.MAX_SAFE_INTEGER + 1, currency: "AED" },
    { amountFils: -1, currency: "AED" },
    { amountFils: 1, currency: "USD" },
  ])("rejects invalid money: %o", (input) => {
    expect(MoneySchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid UUIDs and non-UTC millisecond timestamps", () => {
    expect(
      UuidSchema.safeParse("11111111-1111-1111-1111-111111111111").success,
    ).toBe(false);
    expect(
      IsoDateTimeSchema.safeParse("2026-07-15T12:00:00+04:00").success,
    ).toBe(false);
    expect(IsoDateTimeSchema.safeParse("2026-07-15T08:00:00Z").success).toBe(
      false,
    );
  });

  it("tolerates additive event fields but fails safely on unknown names", () => {
    const source = validFixtures.events["bid:accepted"];
    if (typeof source !== "object" || source === null) {
      throw new TypeError("The bid:accepted fixture must be an object.");
    }
    const fixture = {
      ...structuredClone(source),
      futureEnvelopeField: "safe-to-ignore",
    };
    expect(serverEventSchemas["bid:accepted"].safeParse(fixture).success).toBe(
      true,
    );
    expect(Object.hasOwn(serverEventSchemas, "future:event")).toBe(false);
  });
});

describe("documentation drift", () => {
  it("validates every JSON example against its runtime schema", async () => {
    const document = await readFile(
      new URL("../../../docs/api-contracts.md", import.meta.url),
      "utf8",
    );
    const examples = [...document.matchAll(/```json\r?\n([\s\S]*?)```/g)].map(
      (match) => JSON.parse(match[1] ?? "null"),
    );

    expect(examples).toHaveLength(3);
    expect(PlaceBidRestRequestSchema.safeParse(examples[0])).toMatchObject({
      success: true,
    });
    expect(BidCommandAckSchema.safeParse(examples[1])).toMatchObject({
      success: true,
    });
    expect(BidCommandAckSchema.safeParse(examples[2])).toMatchObject({
      success: true,
    });
  });

  it("keeps the REST inventory aligned with generated OpenAPI inputs", async () => {
    const document = await readFile(
      new URL("../../../docs/api-contracts.md", import.meta.url),
      "utf8",
    );
    const documented = [
      ...document.matchAll(
        /^\|\s*(GET|POST|PATCH|PUT|DELETE)\s*\|\s*`([^`]+)`/gm,
      ),
    ]
      .map((match) => {
        const method = (match[1] ?? "").toLowerCase();
        const rawPath = (match[2] ?? "").split("?")[0] ?? "";
        return `${method} ${rawPath.replaceAll(/:([A-Za-z]+)/g, "{$1}")}`;
      })
      .sort();
    const executable = restOperations
      .map(({ method, path }) => `${method} ${path}`)
      .sort();

    expect(executable).toEqual(documented);
  });
});

async function readJson<T>(relativePath: string): Promise<T> {
  const content = await readFile(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8",
  );
  return JSON.parse(content) as T;
}
