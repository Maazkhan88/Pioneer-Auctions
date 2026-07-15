import { readFile, writeFile } from "node:fs/promises";

import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
} from "quicktype-core";
import { z } from "zod";

import { GoldenFixturesSchema } from "../src/golden.js";
import { createOpenApiDocument } from "../src/openapi.js";

const checkOnly = process.argv.includes("--check");

const goldenSchema = {
  ...z.toJSONSchema(GoldenFixturesSchema, { target: "draft-2020-12" }),
  $id: "https://pioneer-auctions.ae/schemas/v1/golden-fixtures.json",
  title: "PioneerContracts",
};

const generatedDart = await generateDart(JSON.stringify(goldenSchema));

await writeOrCheck(
  "openapi/v1.json",
  `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`,
);
await writeOrCheck(
  "schemas/v1/golden-fixtures.schema.json",
  `${JSON.stringify(goldenSchema, null, 2)}\n`,
);
await writeOrCheck(
  "dart/lib/pioneer_contracts.dart",
  `${generatedDart.trimEnd()}\n`,
);

async function generateDart(schema: string): Promise<string> {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  await schemaInput.addSource({ name: "PioneerContracts", schema });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    inputData,
    lang: "dart",
    rendererOptions: {
      "coders-in-class": "true",
      "null-safety": "true",
    },
  });

  return result.lines.join("\n");
}

async function writeOrCheck(
  relativePath: string,
  expected: string,
): Promise<void> {
  const url = new URL(relativePath, `${new URL("..", import.meta.url).href}/`);

  if (!checkOnly) {
    await writeFile(url, expected, "utf8");
    return;
  }

  const actual = await readFile(url, "utf8").catch(() => "");
  if (actual !== expected) {
    throw new Error(
      `Generated artifact drift: ${relativePath}. Run pnpm generate.`,
    );
  }
}
