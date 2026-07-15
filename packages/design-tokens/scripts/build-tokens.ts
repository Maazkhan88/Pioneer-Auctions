import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const checkOnly = process.argv.includes("--check");

interface TypeScale {
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
}

interface TokensJson {
  color: Record<string, Record<string, string>>;
  space: Record<string, number>;
  radius: Record<string, number>;
  type: Record<string, TypeScale>;
  motion: Record<string, number>;
  theme: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

async function main() {
  const jsonPath = join(__dirname, "../src/tokens.json");
  const rawJson = await readFile(jsonPath, "utf8");
  const tokens = JSON.parse(rawJson) as TokensJson;

  const css = generateCss(tokens);
  const ts = generateTs(tokens);
  const dart = generateDart(tokens);

  await writeOrCheck(join(__dirname, "../src/tokens.css"), css);
  await writeOrCheck(join(__dirname, "../src/tokens.ts"), ts);
  await writeOrCheck(join(__dirname, "../../../packages/contracts/dart/lib/design_tokens.dart"), dart);
}

function generateCss(tokens: TokensJson): string {
  const lines: string[] = [":root {"];

  // Colors mapping (excluding raw palettes if not needed, but let's map them to CSS variables)
  for (const [group, values] of Object.entries(tokens.color)) {
    if (group === "semantic" || group === "slate") continue;
    for (const [key, value] of Object.entries(values)) {
      lines.push(`  --pa-color-${group}-${key}: ${value};`);
    }
  }

  // Light theme colors
  for (const [key, value] of Object.entries(tokens.theme.light)) {
    lines.push(`  --pa-color-${kebabCase(key)}: ${value};`);
  }

  // Spacing
  for (const [key, value] of Object.entries(tokens.space)) {
    lines.push(`  --pa-space-${key}: ${value}px;`);
  }

  // Radius
  for (const [key, value] of Object.entries(tokens.radius)) {
    const val = typeof value === "number" ? `${value}px` : value;
    lines.push(`  --pa-radius-${key}: ${val};`);
  }

  // Typography
  for (const [key, scale] of Object.entries(tokens.type)) {
    lines.push(`  --pa-type-${key}-size: ${scale.fontSize}px;`);
    lines.push(`  --pa-type-${key}-height: ${scale.lineHeight}px;`);
    lines.push(`  --pa-type-${key}-weight: ${scale.fontWeight};`);
  }

  // Motion
  for (const [key, value] of Object.entries(tokens.motion)) {
    lines.push(`  --pa-${kebabCase(key)}: ${value}ms;`);
  }

  lines.push("}");
  lines.push("");

  // Dark theme media query
  lines.push("@media (prefers-color-scheme: dark) {");
  lines.push("  :root {");
  for (const [key, value] of Object.entries(tokens.theme.dark)) {
    lines.push(`    --pa-color-${kebabCase(key)}: ${value};`);
  }
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // Dark theme class override
  lines.push(".theme-dark {");
  for (const [key, value] of Object.entries(tokens.theme.dark)) {
    lines.push(`  --pa-color-${kebabCase(key)}: ${value};`);
  }
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function generateTs(tokens: TokensJson): string {
  return `// Generated from tokens.json. Do not edit manually.

export const tokens = ${JSON.stringify(tokens, null, 2)} as const;

export type Tokens = typeof tokens;
`;
}

function generateDart(tokens: TokensJson): string {
  const lines: string[] = [
    "// Generated from tokens.json. Do not edit manually.",
    "// ignore_for_file: constant_identifier_names",
    "",
    "class PioneerTokens {",
  ];

  // Spacing
  lines.push("  // Spacing");
  for (const [key, value] of Object.entries(tokens.space)) {
    lines.push(`  static const double space_${key} = ${value}.0;`);
  }
  lines.push("");

  // Radius
  lines.push("  // Radius");
  for (const [key, value] of Object.entries(tokens.radius)) {
    lines.push(`  static const double radius_${key} = ${value}.0;`);
  }
  lines.push("");

  // Motion
  lines.push("  // Motion (ms)");
  for (const [key, value] of Object.entries(tokens.motion)) {
    lines.push(`  static const int ${snakeCase(key)} = ${value};`);
  }
  lines.push("");

  // Light Theme Colors
  lines.push("  // Light Theme Colors");
  for (const [key, value] of Object.entries(tokens.theme.light)) {
    const hex = value.replace("#", "0xFF").toUpperCase();
    lines.push(`  static const int light_${snakeCase(key)} = ${hex};`);
  }
  lines.push("");

  // Dark Theme Colors
  lines.push("  // Dark Theme Colors");
  for (const [key, value] of Object.entries(tokens.theme.dark)) {
    const hex = value.replace("#", "0xFF").toUpperCase();
    lines.push(`  static const int dark_${snakeCase(key)} = ${hex};`);
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function kebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`).toLowerCase();
}

async function writeOrCheck(filePath: string, content: string) {
  if (checkOnly) {
    const existing = await readFile(filePath, "utf8").catch(() => "");
    if (existing.trim() !== content.trim()) {
      console.error(`Token drift detected in: ${filePath}`);
      process.exit(1);
    }
  } else {
    await writeFile(filePath, content, "utf8");
    console.log(`Generated: ${filePath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
