import { describe, expect, it, vi } from "vitest";

import {
  BiddingRecoveryService,
  type RebuiltLotState,
} from "../src/bidding/bidding-recovery.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";

interface QueryCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

class FakeDatabase {
  readonly queries: QueryCall[] = [];

  constructor(
    private readonly rows: ReadonlyArray<Record<string, unknown>> = [],
  ) {}

  async query<T>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    return { rows: [...this.rows] as T[] };
  }
}

describe("bidding recovery service", () => {
  it("rebuilds derived lot state from PostgreSQL without exposing proxy maxima", async () => {
    const database = new FakeDatabase([
      lotRow({
        active_proxy_count: "2",
        current_bid_fils: "5300000",
        leading_account_id: "00000000-0000-4000-8000-000000000001",
        sequence: 4,
      }),
    ]);
    const service = new BiddingRecoveryService(databaseFor(database));

    const state = await service.rebuildLotState(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(state).toMatchObject({
      activeProxyCount: 2,
      auctionId: "22222222-2222-4222-8222-222222222222",
      bidCount: 4,
      currentBid: { amountFils: 5300000, currency: "AED" },
      leadingAccountId: "00000000-0000-4000-8000-000000000001",
      lifecycle: "LIVE",
      nextMinimumBid: { amountFils: 5400000, currency: "AED" },
      reserveStatus: "NOT_MET",
      sequence: 4,
    });
    expect(JSON.stringify(state)).not.toContain("maximum");
    expect(database.queries[0]?.text).toContain("FROM bid_ledger");
    expect(database.queries[0]?.text).toContain("FROM proxy_bids");
  });

  it("preserves terminal approval lifecycle during recovery", async () => {
    const database = new FakeDatabase([
      lotRow({
        lifecycle: "PENDING_APPROVAL",
        sequence: 9,
      }),
    ]);
    const service = new BiddingRecoveryService(databaseFor(database));

    const state = await service.rebuildLotState(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(state?.lifecycle).toBe("PENDING_APPROVAL");
    expect(state?.sequence).toBe(9);
  });

  it("writes rebuilt state into a derived store only when the lot exists", async () => {
    const existingDatabase = new FakeDatabase([lotRow()]);
    const missingDatabase = new FakeDatabase([]);
    const store = {
      setLotState: vi.fn<(_: RebuiltLotState) => Promise<void>>(),
    };

    const existingService = new BiddingRecoveryService(
      databaseFor(existingDatabase),
    );
    const missingService = new BiddingRecoveryService(
      databaseFor(missingDatabase),
    );

    await existingService.rebuildLotStateIntoStore(
      "11111111-1111-4111-8111-111111111111",
      store,
    );
    await missingService.rebuildLotStateIntoStore(
      "33333333-3333-4333-8333-333333333333",
      store,
    );

    expect(store.setLotState).toHaveBeenCalledTimes(1);
    expect(store.setLotState.mock.calls[0]?.[0].lotId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("rebuilds recoverable non-draft lot states in bounded batches", async () => {
    const database = new FakeDatabase([
      lotRow({ lifecycle: "LIVE" }),
      lotRow({
        lifecycle: "CLOSED",
        lot_id: "33333333-3333-4333-8333-333333333333",
      }),
    ]);
    const service = new BiddingRecoveryService(databaseFor(database));

    const states = await service.rebuildRecoverableLotStates(100);

    expect(states.map((state) => state.lifecycle)).toEqual(["LIVE", "CLOSED"]);
    expect(database.queries[0]?.text).toContain("lots.lifecycle <> 'DRAFT'");
    expect(database.queries[0]?.values).toEqual([100]);
  });
});

function lotRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    active_proxy_count: "0",
    auction_id: "22222222-2222-4222-8222-222222222222",
    bid_count: 4,
    closes_at: new Date("2026-09-01T16:00:00.000Z"),
    current_bid_fils: null,
    leading_account_id: null,
    lifecycle: "LIVE",
    lot_id: "11111111-1111-4111-8111-111111111111",
    next_minimum_bid_fils: "5400000",
    reserve_status: "NOT_MET",
    sequence: 0,
    ...overrides,
  };
}

function databaseFor(database: FakeDatabase): DatabasePool {
  return database as unknown as DatabasePool;
}
