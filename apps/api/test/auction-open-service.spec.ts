import { describe, expect, it, vi } from "vitest";

import { AuctionOpenService } from "../src/bidding/auction-open.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";

interface QueryCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

class FakeClient {
  readonly queries: QueryCall[] = [];

  constructor(
    private readonly options: {
      readonly lifecycle?: string;
      readonly lotExists?: boolean;
      readonly startsAt?: Date;
    } = {},
  ) {}

  async query<T>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (text.includes("WHERE lifecycle = 'DRAFT'")) {
      return rows<T>([{ id: "11111111-1111-4111-8111-111111111111" }]);
    }
    if (text.includes("FOR UPDATE OF lots")) {
      if (this.options.lotExists === false) {
        return rows<T>([]);
      }
      return rows<T>([
        {
          auction_id: "22222222-2222-4222-8222-222222222222",
          lifecycle: this.options.lifecycle ?? "DRAFT",
          sequence: 0,
          starts_at:
            this.options.startsAt ?? new Date("2026-09-01T12:00:00.000Z"),
        },
      ]);
    }
    return rows<T>([]);
  }

  release = vi.fn();
}

describe("auction open service", () => {
  it("transitions a due lot to live, opens the parent auction, and writes an outbox event", async () => {
    const client = new FakeClient();
    const service = new AuctionOpenService(databaseFor(client));

    const result = await service.openLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T12:00:01.000Z"),
    );

    expect(result).toEqual({
      lifecycle: "LIVE",
      lotId: "11111111-1111-4111-8111-111111111111",
      opened: true,
      sequence: 1,
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO outbox_events"),
      ),
    ).toBe(true);
    const lotUpdate = client.queries.find(
      (query) =>
        query.text.includes("UPDATE lots") &&
        query.text.includes("lifecycle = 'LIVE'"),
    );
    expect(lotUpdate?.values).toEqual([
      "11111111-1111-4111-8111-111111111111",
      1,
    ]);
    const auctionUpdate = client.queries.find((query) =>
      query.text.includes("UPDATE auctions"),
    );
    expect(auctionUpdate?.values).toEqual([
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("does not open a lot that has not reached its start time yet", async () => {
    const client = new FakeClient({
      startsAt: new Date("2026-09-01T12:05:00.000Z"),
    });
    const service = new AuctionOpenService(databaseFor(client));

    const result = await service.openLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T12:00:01.000Z"),
    );

    expect(result).toEqual({
      lotId: "11111111-1111-4111-8111-111111111111",
      opened: false,
    });
    expect(
      client.queries.some((query) => query.text.includes("UPDATE lots")),
    ).toBe(false);
  });

  it("does not open a lot that is no longer in draft", async () => {
    const client = new FakeClient({ lifecycle: "LIVE" });
    const service = new AuctionOpenService(databaseFor(client));

    const result = await service.openLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T12:00:01.000Z"),
    );

    expect(result.opened).toBe(false);
  });

  it("uses due-lot selection and opens each selected lot through the same fenced open path", async () => {
    const client = new FakeClient();
    const service = new AuctionOpenService(databaseFor(client));

    const result = await service.openDueLots(
      10,
      new Date("2026-09-01T12:00:01.000Z"),
    );

    expect(result).toBe(1);
    expect(
      client.queries.some((query) =>
        query.text.includes("FOR UPDATE SKIP LOCKED"),
      ),
    ).toBe(true);
  });
});

function databaseFor(client: FakeClient): DatabasePool {
  return {
    connect: async () => client,
  } as unknown as DatabasePool;
}

function rows<T>(rowsValue: readonly unknown[]): { rows: T[] } {
  return { rows: rowsValue as T[] };
}
