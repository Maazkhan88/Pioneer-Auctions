import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

import { Pool, type PoolClient } from "pg";

import { readEnvironment } from "../config/environment.js";

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations", import.meta.url),
);

export interface AppliedMigration {
  readonly name: string;
  readonly checksum: string;
}

export async function runMigrations(
  databaseUrl = readEnvironment().databaseUrl,
): Promise<AppliedMigration[]> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    const migrationFiles = await listMigrationFiles();
    const applied: AppliedMigration[] = [];

    for (const name of migrationFiles) {
      const path = join(migrationsDirectory, name);
      const sql = await readFile(path, "utf8");
      const checksum = sha256(sql);
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [name],
      );

      if (existing.rows[0]?.checksum === checksum) {
        continue;
      }

      if (existing.rows[0] !== undefined) {
        throw new Error(`Migration checksum changed after apply: ${name}`);
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [name, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      applied.push({ checksum, name });
    }

    return applied;
  } finally {
    client.release();
    await pool.end();
  }
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(migrationsDirectory);
  return files.filter((file) => file.endsWith(".sql")).sort();
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function migrationDirectoryName(): string {
  return dirname(join(migrationsDirectory, "placeholder"));
}
