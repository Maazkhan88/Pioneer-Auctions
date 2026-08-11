import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createBiddingDatabaseFixture,
  runDatabaseTests,
  type BiddingDatabaseFixture,
} from "./bidding-db-fixture.js";

const describeIfDatabase = runDatabaseTests ? describe : describe.skip;

describeIfDatabase("bidding service database integration", () => {
  let fixture: BiddingDatabaseFixture;

  beforeAll(async () => {
    fixture = await createBiddingDatabaseFixture();
  }, 30_000);

  afterAll(async () => {
    await fixture?.close();
  });

  it("persists proxy registration, manual challenge, proxy response, lot state, command results, and outbox rows", async () => {
    const proxyAck = await fixture.service.setProxyBid({
      accountId: fixture.accountAId,
      commandId: randomUUID(),
      correlationId: "it-proxy-a",
      input: {
        expectedSequence: 0,
        maximumFils: 6000000,
        termsVersionId: fixture.termsVersionId,
      },
      lotId: fixture.lotId,
    });

    expect(proxyAck).toMatchObject({
      result: {
        currentBid: { amountFils: 5000000, currency: "AED" },
        myBidStatus: "WINNING",
        sequence: 1,
      },
      status: "ACCEPTED",
    });

    const manualAck = await fixture.service.placeManualBid({
      accountId: fixture.accountBId,
      commandId: randomUUID(),
      correlationId: "it-manual-b",
      input: {
        amountFils: 5200000,
        expectedSequence: 1,
        termsVersionId: fixture.termsVersionId,
      },
      lotId: fixture.lotId,
    });

    expect(manualAck).toMatchObject({
      result: {
        currentBid: { amountFils: 5300000, currency: "AED" },
        myBidStatus: "OUTBID",
        nextMinimumBid: { amountFils: 5400000, currency: "AED" },
        sequence: 3,
      },
      status: "ACCEPTED",
    });

    const ledger = await fixture.pool.query<{
      account_id: string;
      amount_fils: string;
      bid_kind: string;
      sequence: number;
    }>(
      `
        SELECT account_id::text, amount_fils::text, bid_kind, sequence
        FROM bid_ledger
        WHERE lot_id = $1
        ORDER BY sequence ASC
      `,
      [fixture.lotId],
    );
    expect(ledger.rows).toEqual([
      expect.objectContaining({
        account_id: fixture.accountAId,
        amount_fils: "5000000",
        bid_kind: "PROXY",
        sequence: 1,
      }),
      expect.objectContaining({
        account_id: fixture.accountBId,
        amount_fils: "5200000",
        bid_kind: "MANUAL",
        sequence: 2,
      }),
      expect.objectContaining({
        account_id: fixture.accountAId,
        amount_fils: "5300000",
        bid_kind: "PROXY",
        sequence: 3,
      }),
    ]);

    const lot = await fixture.pool.query<{
      bid_count: number;
      current_bid_fils: string;
      next_minimum_bid_fils: string;
      sequence: number;
    }>(
      `
        SELECT
          bid_count,
          current_bid_fils::text,
          next_minimum_bid_fils::text,
          sequence
        FROM lots
        WHERE id = $1
      `,
      [fixture.lotId],
    );
    expect(lot.rows[0]).toMatchObject({
      bid_count: 3,
      current_bid_fils: "5300000",
      next_minimum_bid_fils: "5400000",
      sequence: 3,
    });

    const outbox = await fixture.pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM outbox_events WHERE aggregate_id = $1",
      [fixture.lotId],
    );
    expect(outbox.rows[0]?.count).toBe("3");
  });
});
