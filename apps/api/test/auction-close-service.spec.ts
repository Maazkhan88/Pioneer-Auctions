import { describe, expect, it, vi } from "vitest";

import { AuctionCloseService } from "../src/bidding/auction-close.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";

interface QueryCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

class FakeClient {
  readonly queries: QueryCall[] = [];

  constructor(
    private readonly options: {
      readonly closesAt?: Date;
      readonly currentBidFils?: string | null;
      readonly lifecycle?: string;
      readonly lotExists?: boolean;
    } = {},
  ) {}

  async query<T>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (text.includes("WHERE lifecycle = 'LIVE'")) {
      return rows<T>([{ id: "11111111-1111-4111-8111-111111111111" }]);
    }
    if (text.includes("FOR UPDATE OF lots")) {
      if (this.options.lotExists === false) {
        return rows<T>([]);
      }
      return rows<T>([
        {
          auction_id: "22222222-2222-4222-8222-222222222222",
          closes_at:
            this.options.closesAt ?? new Date("2026-09-01T16:00:00.000Z"),
          current_bid_fils:
            "currentBidFils" in this.options
              ? this.options.currentBidFils
              : "5200000",
          lifecycle: this.options.lifecycle ?? "LIVE",
          sequence: 7,
        },
      ]);
    }
    return rows<T>([]);
  }

  release = vi.fn();
}

describe("auction close service", () => {
  it("transitions a due lot with a bid to pending approval and writes an outbox event", async () => {
    const client = new FakeClient();
    const service = new AuctionCloseService(databaseFor(client));

    const result = await service.closeLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T16:00:01.000Z"),
    );

    expect(result).toEqual({
      closed: true,
      lifecycle: "PENDING_APPROVAL",
      lotId: "11111111-1111-4111-8111-111111111111",
      sequence: 8,
    });
    expect(
      client.queries.some((query) =>
        query.text.includes("INSERT INTO outbox_events"),
      ),
    ).toBe(true);
    const update = client.queries.find((query) =>
      query.text.includes("UPDATE lots"),
    );
    expect(update?.values).toContain("PENDING_APPROVAL");
  });

  it("transitions a due lot without bids to closed", async () => {
    const client = new FakeClient({ currentBidFils: null });
    const service = new AuctionCloseService(databaseFor(client));

    const result = await service.closeLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T16:00:01.000Z"),
    );

    expect(result).toMatchObject({
      closed: true,
      lifecycle: "CLOSED",
    });
  });

  it("does not close a lot whose close time moved forward before the close lock was acquired", async () => {
    const client = new FakeClient({
      closesAt: new Date("2026-09-01T16:05:00.000Z"),
    });
    const service = new AuctionCloseService(databaseFor(client));

    const result = await service.closeLot(
      "11111111-1111-4111-8111-111111111111",
      new Date("2026-09-01T16:00:01.000Z"),
    );

    expect(result).toEqual({
      closed: false,
      lotId: "11111111-1111-4111-8111-111111111111",
    });
    expect(
      client.queries.some((query) => query.text.includes("UPDATE lots")),
    ).toBe(false);
  });

  it("uses due-lot selection and closes each selected lot through the same fenced close path", async () => {
    const client = new FakeClient();
    const service = new AuctionCloseService(databaseFor(client));

    const result = await service.closeDueLots(
      10,
      new Date("2026-09-01T16:00:01.000Z"),
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
