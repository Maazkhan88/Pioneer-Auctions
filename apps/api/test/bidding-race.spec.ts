import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createBiddingDatabaseFixture,
  runDatabaseTests,
  type BiddingDatabaseFixture,
} from "./bidding-db-fixture.js";

const describeIfDatabase = runDatabaseTests ? describe : describe.skip;

describeIfDatabase("bidding service database race behavior", () => {
  let fixture: BiddingDatabaseFixture;

  beforeAll(async () => {
    fixture = await createBiddingDatabaseFixture();
  }, 30_000);

  afterAll(async () => {
    await fixture?.close();
  });

  it("serializes a 100-command same-lot race into a valid ledger and final lot state", async () => {
    const commands = Array.from({ length: 100 }, (_, index) =>
      fixture.service.placeManualBid({
        accountId:
          index % 3 === 0
            ? fixture.accountAId
            : index % 3 === 1
              ? fixture.accountBId
              : fixture.accountCId,
        commandId: randomUUID(),
        correlationId: `race-${index}`,
        input: {
          amountFils: 5000000 + index * 100000,
          expectedSequence: 0,
          termsVersionId: fixture.termsVersionId,
        },
        lotId: fixture.lotId,
      }),
    );

    const acknowledgements = await Promise.all(commands);
    const accepted = acknowledgements.filter(
      (ack) => ack.status === "ACCEPTED",
    );
    expect(accepted.length).toBeGreaterThan(0);

    const ledger = await fixture.pool.query<{
      amount_fils: string;
      sequence: number;
    }>(
      `
        SELECT sequence, amount_fils::text
        FROM bid_ledger
        WHERE lot_id = $1
        ORDER BY sequence ASC
      `,
      [fixture.lotId],
    );

    expect(ledger.rows).toHaveLength(accepted.length);
    expect(ledger.rows.map((row) => row.sequence)).toEqual(
      Array.from({ length: ledger.rows.length }, (_, index) => index + 1),
    );

    const amounts = ledger.rows.map((row) => Number(row.amount_fils));
    for (let index = 1; index < amounts.length; index += 1) {
      expect(amounts[index]).toBeGreaterThan(amounts[index - 1] ?? 0);
    }

    const finalLot = await fixture.pool.query<{
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
    const finalLedgerRow = ledger.rows.at(-1);
    expect(finalLedgerRow).toBeDefined();
    expect(finalLot.rows[0]).toMatchObject({
      bid_count: ledger.rows.length,
      current_bid_fils: finalLedgerRow?.amount_fils,
      next_minimum_bid_fils: String(
        Number(finalLedgerRow?.amount_fils) + 100000,
      ),
      sequence: ledger.rows.length,
    });
  }, 30_000);
});
