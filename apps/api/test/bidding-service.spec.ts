import { describe, expect, it, vi } from "vitest";

import { BiddingService } from "../src/bidding/bidding.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";

interface QueryCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

class FakeClient {
  readonly queries: QueryCall[] = [];

  constructor(
    private readonly options: {
      readonly existingResult?: unknown;
      readonly lotExists?: boolean;
      readonly depositEligible?: boolean;
      readonly existingProxyMaximumFils?: number;
      readonly activeProxies?: ReadonlyArray<{
        readonly account_id: string;
        readonly maximum_fils: string;
        readonly registered_at: Date;
      }>;
      readonly leadingAccountId?: string | null;
      readonly termsAccepted?: boolean;
    } = {},
  ) {}

  async query<T>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (text.includes("FROM bid_commands") && text.includes("SELECT")) {
      return rows<T>(
        this.options.existingResult === undefined
          ? []
          : [this.options.existingResult],
      );
    }
    if (text.includes("FROM lots") && text.includes("FOR UPDATE")) {
      if (this.options.lotExists === false) {
        return rows<T>([]);
      }
      return rows<T>([
        {
          auction_id: "22222222-2222-4222-8222-222222222222",
          auction_soft_close_extension_ms: 120000,
          auction_soft_close_maximum_extensions: null,
          auction_soft_close_window_ms: 120000,
          closes_at: new Date("2026-09-01T16:00:00.000Z"),
          current_bid_fils: null,
          lifecycle: "LIVE",
          leading_account_id: this.options.leadingAccountId ?? null,
          lot_soft_close_extension_ms: null,
          lot_soft_close_maximum_extensions: null,
          lot_soft_close_window_ms: null,
          minimum_increment_fils: "100000",
          next_minimum_bid_fils: "5000000",
          reserve_price_fils: "5500000",
          reserve_status: "NOT_MET",
          sequence: 0,
          soft_close_enabled: true,
          soft_close_extension_count: 0,
        },
      ]);
    }
    if (text.includes("AS account_active")) {
      return rows<T>([
        {
          account_active: true,
          deposit_eligible: this.options.depositEligible ?? true,
          kyc_verified: true,
          terms_accepted: this.options.termsAccepted ?? true,
        },
      ]);
    }
    if (
      text.includes("FROM proxy_bids") &&
      text.includes("ORDER BY maximum_fils DESC")
    ) {
      return rows<T>(this.options.activeProxies ?? []);
    }
    if (text.includes("FROM proxy_bids") && text.includes("maximum_fils")) {
      return rows<T>(
        this.options.existingProxyMaximumFils === undefined
          ? []
          : [
              {
                account_id: "00000000-0000-4000-8000-000000000001",
                maximum_fils: String(this.options.existingProxyMaximumFils),
                registered_at: new Date("2026-09-01T15:00:00.000Z"),
              },
            ],
      );
    }
    return rows<T>([]);
  }

  release = vi.fn();
}

describe("bidding service persistence boundary", () => {
  it("persists an accepted manual bid, lot state update, outbox event, and command result", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:59:30.000Z"));
    const client = new FakeClient({
      activeProxies: [
        {
          account_id: "00000000-0000-4000-8000-000000000001",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:00:00.000Z"),
        },
      ],
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.placeManualBid(
      command({ amountFils: 5500000 }),
    );

    expect(result).toMatchObject({
      result: {
        closesAt: "2026-09-01T16:02:00.000Z",
        currentBid: { amountFils: 5500000, currency: "AED" },
        extended: true,
        reserveStatus: "MET",
        sequence: 1,
      },
      status: "ACCEPTED",
    });
    expect(
      client.queries.map((query) =>
        query.text.trim().split(/\s+/).slice(0, 3).join(" "),
      ),
    ).toContain("INSERT INTO bid_ledger");
    expect(client.queries.map((query) => query.text)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("UPDATE lots"),
        expect.stringContaining("INSERT INTO outbox_events"),
        expect.stringContaining("INSERT INTO bid_commands"),
      ]),
    );
    vi.useRealTimers();
  });

  it("records a manual bid then an existing proxy response when the proxy can beat it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:59:30.000Z"));
    const client = new FakeClient({
      activeProxies: [
        {
          account_id: "00000000-0000-4000-8000-000000000002",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:00:00.000Z"),
        },
      ],
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.placeManualBid(
      command({ amountFils: 5200000 }),
    );

    expect(result).toMatchObject({
      result: {
        currentBid: { amountFils: 5300000, currency: "AED" },
        myBidStatus: "OUTBID",
        nextMinimumBid: { amountFils: 5400000, currency: "AED" },
        sequence: 2,
      },
      status: "ACCEPTED",
    });
    const ledgerInserts = client.queries.filter((query) =>
      query.text.includes("INSERT INTO bid_ledger"),
    );
    expect(ledgerInserts).toHaveLength(2);
    expect(ledgerInserts[0]?.values).toContain("MANUAL");
    expect(ledgerInserts[1]?.values).toContain("PROXY");
    expect(ledgerInserts[1]?.values).toContain(
      "00000000-0000-4000-8000-000000000002",
    );
    const accountOutboxInserts = accountOutboxWrites(client);
    expect(accountOutboxInserts.map((query) => query.values[1])).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);
    expect(accountOutboxInserts[0]?.values[3]).toMatchObject({
      data: { status: "OUTBID" },
    });
    expect(accountOutboxInserts[1]?.values[3]).toMatchObject({
      data: {
        activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        status: "WINNING",
      },
    });
    vi.useRealTimers();
  });

  it("returns saved idempotency result without writing another ledger row", async () => {
    const saved = {
      result_payload: {
        commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
        contractVersion: 1,
        correlationId: "corr-test",
        result: { lotId: "lot", sequence: 7 },
        serverTime: "2026-09-01T15:59:30.000Z",
        status: "ACCEPTED",
      },
    };
    const client = new FakeClient({ existingResult: saved });
    const service = new BiddingService(databaseFor(client));

    const result = await service.placeManualBid(
      command({ amountFils: 5500000 }),
    );

    expect(result).toBe(saved.result_payload);
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO bid_ledger"),
      ),
    ).toBe(false);
  });

  it("persists a rejected command when terms are missing", async () => {
    const client = new FakeClient({ termsAccepted: false });
    const service = new BiddingService(databaseFor(client));

    const result = await service.placeManualBid(
      command({ amountFils: 5500000 }),
    );

    expect(result).toMatchObject({
      error: { code: "TERMS_ACCEPTANCE_REQUIRED" },
      status: "REJECTED",
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO bid_commands"),
      ),
    ).toBe(true);
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO bid_ledger"),
      ),
    ).toBe(false);
  });

  it("registers a proxy maximum and creates the leading visible proxy bid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:59:30.000Z"));
    const client = new FakeClient({
      activeProxies: [
        {
          account_id: "00000000-0000-4000-8000-000000000001",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:00:00.000Z"),
        },
      ],
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toMatchObject({
      result: {
        activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        currentBid: { amountFils: 5000000, currency: "AED" },
        extended: true,
        myBidStatus: "WINNING",
        nextMinimumBid: { amountFils: 5100000, currency: "AED" },
        sequence: 1,
      },
      status: "ACCEPTED",
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO proxy_bids"),
      ),
    ).toBe(true);
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO bid_ledger"),
      ),
    ).toBe(true);
    const ledgerInsert = client.queries.find((query) =>
      query.text.includes("INSERT INTO bid_ledger"),
    );
    expect(ledgerInsert?.values).toContain("PROXY");
    vi.useRealTimers();
  });

  it("rejects a proxy maximum that does not raise the active maximum", async () => {
    const client = new FakeClient({ existingProxyMaximumFils: 6000000 });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toMatchObject({
      error: { code: "PROXY_MAX_TOO_LOW" },
      status: "REJECTED",
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO proxy_bids"),
      ),
    ).toBe(false);
  });

  it("raises a proxy maximum without a new visible bid when the user already leads", async () => {
    const client = new FakeClient({
      existingProxyMaximumFils: 5500000,
      leadingAccountId: "00000000-0000-4000-8000-000000000001",
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toMatchObject({
      result: {
        activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        myBidStatus: "WINNING",
        sequence: 0,
      },
      status: "ACCEPTED",
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO proxy_bids"),
      ),
    ).toBe(true);
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO bid_ledger"),
      ),
    ).toBe(false);
  });

  it("replays saved proxy command results without new writes", async () => {
    const saved = {
      result_payload: {
        commandId: "835cb208-e936-4e0c-9863-c85a96f2ff61",
        contractVersion: 1,
        correlationId: "corr-test",
        result: {
          activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        },
        serverTime: "2026-09-01T15:59:30.000Z",
        status: "ACCEPTED",
      },
    };
    const client = new FakeClient({ existingResult: saved });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toBe(saved.result_payload);
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO proxy_bids"),
      ),
    ).toBe(false);
  });

  it("resolves competing proxy maxima to the winner's minimum required visible amount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:59:30.000Z"));
    const client = new FakeClient({
      activeProxies: [
        {
          account_id: "00000000-0000-4000-8000-000000000001",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:10:00.000Z"),
        },
        {
          account_id: "00000000-0000-4000-8000-000000000002",
          maximum_fils: "5500000",
          registered_at: new Date("2026-09-01T15:00:00.000Z"),
        },
      ],
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toMatchObject({
      result: {
        currentBid: { amountFils: 5600000, currency: "AED" },
        myBidStatus: "WINNING",
        nextMinimumBid: { amountFils: 5700000, currency: "AED" },
        sequence: 1,
      },
      status: "ACCEPTED",
    });
    vi.useRealTimers();
  });

  it("gives equal proxy maximum priority to the earlier registration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:59:30.000Z"));
    const client = new FakeClient({
      activeProxies: [
        {
          account_id: "00000000-0000-4000-8000-000000000002",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:00:00.000Z"),
        },
        {
          account_id: "00000000-0000-4000-8000-000000000001",
          maximum_fils: "6000000",
          registered_at: new Date("2026-09-01T15:10:00.000Z"),
        },
      ],
    });
    const service = new BiddingService(databaseFor(client));

    const result = await service.setProxyBid(
      proxyCommand({ maximumFils: 6000000 }),
    );

    expect(result).toMatchObject({
      result: {
        currentBid: { amountFils: 6000000, currency: "AED" },
        myBidStatus: "OUTBID",
        sequence: 1,
      },
      status: "ACCEPTED",
    });
    const accountOutboxInserts = accountOutboxWrites(client);
    expect(accountOutboxInserts.map((query) => query.values[1])).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);
    expect(accountOutboxInserts[0]?.values[3]).toMatchObject({
      data: {
        activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        status: "OUTBID",
      },
    });
    expect(accountOutboxInserts[1]?.values[3]).toMatchObject({
      data: {
        activeProxyMaximum: { amountFils: 6000000, currency: "AED" },
        status: "WINNING",
      },
    });
    vi.useRealTimers();
  });
});

function accountOutboxWrites(client: FakeClient): readonly QueryCall[] {
  return client.queries.filter(
    (query) =>
      query.text.includes("INSERT INTO outbox_events") &&
      query.values[0] === "account",
  );
}

function command(input: { readonly amountFils: number }) {
  return {
    accountId: "00000000-0000-4000-8000-000000000001",
    commandId: "835cb208-e936-4e0c-9863-c85a96f2ff60",
    correlationId: "corr-test",
    input: {
      amountFils: input.amountFils,
      expectedSequence: 0,
      termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
    },
    lotId: "11111111-1111-4111-8111-111111111111",
  };
}

function proxyCommand(input: { readonly maximumFils: number }) {
  return {
    accountId: "00000000-0000-4000-8000-000000000001",
    commandId: "835cb208-e936-4e0c-9863-c85a96f2ff61",
    correlationId: "corr-test",
    input: {
      expectedSequence: 0,
      maximumFils: input.maximumFils,
      termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
    },
    lotId: "11111111-1111-4111-8111-111111111111",
  };
}

function databaseFor(client: FakeClient): DatabasePool {
  return {
    connect: async () => client,
  } as unknown as DatabasePool;
}

function rows<T>(rowsValue: readonly unknown[]): { rows: T[] } {
  return { rows: rowsValue as T[] };
}
