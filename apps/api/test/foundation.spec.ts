import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  type AccountSummary,
  IdentityService,
} from "../src/identity/identity.service.js";

const migrationSql = readFileSync(
  fileURLToPath(
    new URL("../migrations/0001_week1_foundation.sql", import.meta.url),
  ),
  "utf8",
);

describe("week 1 backend foundation", () => {
  it("stores money as integer fils, not floating point", () => {
    expect(migrationSql).toContain("amount_fils bigint");
    expect(migrationSql).toContain("starting_bid_fils bigint");
    expect(migrationSql).not.toMatch(
      /\b(double precision|real|float|numeric\()/i,
    );
  });

  it("defines append-only bidding and audit primitives", () => {
    expect(migrationSql).toContain("CREATE TABLE bid_ledger");
    expect(migrationSql).toContain("CREATE TABLE audit_events");
    expect(migrationSql).toContain("CREATE TABLE outbox_events");
    expect(migrationSql).not.toMatch(/\bDELETE\s+FROM\s+bid_ledger\b/i);
  });

  it("requires active account status for permission checks", () => {
    const service = Object.create(IdentityService.prototype) as IdentityService;
    const account: AccountSummary = {
      displayName: "Ops Admin",
      id: "00000000-0000-4000-8000-000000000001",
      permissions: ["admin.auctions.write"],
      roles: ["operations"],
      status: "RESTRICTED",
    };

    expect(service.hasPermission(account, "admin.auctions.write")).toBe(false);
  });
});
