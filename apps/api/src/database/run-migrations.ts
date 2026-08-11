import { runMigrations } from "./migration-runner.js";

const applied = await runMigrations();

if (applied.length === 0) {
  console.log("Database schema is already current");
} else {
  console.log(`Applied ${applied.length} migration(s):`);
  for (const migration of applied) {
    console.log(`- ${migration.name}`);
  }
}
