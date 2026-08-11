import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const migrationDir = new URL("../../migrations", import.meta.url);
const migrationPath = fileURLToPath(migrationDir);
const files = readdirSync(migrationDir).filter((file) => file.endsWith(".sql"));

if (files.length === 0) {
  throw new Error("No SQL migrations found");
}

for (const file of files) {
  const sql = readFileSync(join(migrationPath, file), "utf8");
  if (/\bdouble precision\b|\breal\b|\bfloat\b/i.test(sql)) {
    throw new Error(`${file} uses floating-point storage`);
  }
  if (/\bdelete\s+from\s+bid_ledger\b/i.test(sql)) {
    throw new Error(`${file} deletes from the bid ledger`);
  }
}

console.log(`Checked ${files.length} SQL migration(s)`);
