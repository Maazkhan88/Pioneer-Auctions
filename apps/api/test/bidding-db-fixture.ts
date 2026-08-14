import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { BiddingService } from "../src/bidding/bidding.service.js";
import { readEnvironment } from "../src/config/environment.js";
import { runMigrations } from "../src/database/migration-runner.js";
import type { DatabasePool } from "../src/database/database.pool.js";

export const runDatabaseTests = process.env.PIONEER_RUN_DB_TESTS === "1";

export interface BiddingDatabaseFixture {
  readonly accountAId: string;
  readonly accountBId: string;
  readonly accountCId: string;
  readonly lotId: string;
  readonly pool: Pool;
  readonly schemaName: string;
  readonly service: BiddingService;
  readonly termsVersionId: string;
  close(): Promise<void>;
}

export async function createBiddingDatabaseFixture(): Promise<BiddingDatabaseFixture> {
  const baseUrl = readEnvironment().databaseUrl;
  const schemaName = `test_${randomUUID().replaceAll("-", "_")}`;
  const adminPool = new Pool({ connectionString: baseUrl, max: 1 });

  try {
    await adminPool.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  } finally {
    await adminPool.end();
  }

  const schemaUrl = withSearchPath(baseUrl, schemaName);
  await runMigrations(schemaUrl);

  const pool = new Pool({ connectionString: schemaUrl, max: 20 });
  const service = new BiddingService({
    connect: () => pool.connect(),
    query: (text: string, values: readonly unknown[] = []) =>
      pool.query(text, [...values]),
  } as unknown as DatabasePool);

  const seeded = await seedBiddingData(pool);

  return {
    ...seeded,
    pool,
    schemaName,
    service,
    async close() {
      await pool.end();
      const cleanupPool = new Pool({ connectionString: baseUrl, max: 1 });
      try {
        await cleanupPool.query(
          `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`,
        );
      } finally {
        await cleanupPool.end();
      }
    },
  };
}

async function seedBiddingData(pool: Pool): Promise<{
  readonly accountAId: string;
  readonly accountBId: string;
  readonly accountCId: string;
  readonly lotId: string;
  readonly termsVersionId: string;
}> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const accountAId = await insertAccount(
      client,
      "buyer-a@test.pioneer.local",
    );
    const accountBId = await insertAccount(
      client,
      "buyer-b@test.pioneer.local",
    );
    const accountCId = await insertAccount(
      client,
      "buyer-c@test.pioneer.local",
    );
    const termsVersionId = await insertTerms(client);
    for (const accountId of [accountAId, accountBId, accountCId]) {
      await client.query(
        `
          INSERT INTO terms_acceptances (account_id, terms_version_id)
          VALUES ($1, $2)
        `,
        [accountId, termsVersionId],
      );
      await client.query(
        `
          INSERT INTO deposit_ledger (
            account_id,
            amount_fils,
            direction,
            reason_code,
            correlation_id
          )
          VALUES ($1, 10000000, 'CREDIT', 'TEST_DEPOSIT', 'test-seed')
        `,
        [accountId],
      );
    }

    const auction = await client.query<{ id: string }>(
      `
        INSERT INTO auctions (
          title_en,
          title_ar,
          lifecycle,
          starts_at,
          closes_at
        )
        VALUES (
          'Test Auction',
          'مزاد اختبار',
          'LIVE',
          now() - interval '1 hour',
          now() + interval '10 minutes'
        )
        RETURNING id::text
      `,
    );
    const auctionId = requiredRow(auction.rows[0]).id;

    const lot = await client.query<{ id: string }>(
      `
        INSERT INTO lots (
          auction_id,
          lot_number,
          title_en,
          title_ar,
          lifecycle,
          starts_at,
          closes_at,
          starting_bid_fils,
          next_minimum_bid_fils,
          minimum_increment_fils,
          reserve_price_fils,
          reserve_status
        )
        VALUES (
          $1,
          '001',
          'Test Lot',
          'قطعة اختبار',
          'LIVE',
          now() - interval '1 hour',
          now() + interval '10 minutes',
          5000000,
          5000000,
          100000,
          5500000,
          'NOT_MET'
        )
        RETURNING id::text
      `,
      [auctionId],
    );

    await client.query("COMMIT");
    return {
      accountAId,
      accountBId,
      accountCId,
      lotId: requiredRow(lot.rows[0]).id,
      termsVersionId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertAccount(
  client: { query: Pool["query"] },
  email: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO accounts (email, display_name, status, kyc_status)
      VALUES ($1, $2, 'ACTIVE', 'VERIFIED')
      RETURNING id::text
    `,
    [email, email],
  );
  return requiredRow(result.rows[0]).id;
}

async function insertTerms(client: { query: Pool["query"] }): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO terms_versions (scope, version, body_en, body_ar)
      VALUES ('auction', $1, 'Test terms', 'شروط اختبار')
      RETURNING id::text
    `,
    [randomUUID()],
  );
  return requiredRow(result.rows[0]).id;
}

function withSearchPath(databaseUrl: string, schemaName: string): string {
  const url = new URL(databaseUrl);
  // `public` must stay on the search path: extensions (e.g. `citext`) are
  // installed once per database, and their types/functions live in
  // whatever schema was current when `CREATE EXTENSION` ran (`public`,
  // from the main migration). Without it, unqualified `citext` references
  // in the isolated schema's own migration run can't resolve. `schemaName`
  // stays first so new objects still default into the isolated schema.
  url.searchParams.set("options", `-c search_path=${schemaName},public`);
  return url.toString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function requiredRow<T>(row: T | undefined): T {
  if (row === undefined) {
    throw new Error("Expected database row");
  }
  return row;
}
