import { describe, expect, it, vi } from "vitest";

import { BiddingOutboxPublisher } from "../src/bidding/bidding-outbox.publisher.js";
import type { DatabasePool } from "../src/database/database.pool.js";

interface QueryCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

class FakeClient {
  readonly queries: QueryCall[] = [];

  async query<T>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (text.includes("FROM outbox_events")) {
      return {
        rows: [
          {
            aggregate_id: "11111111-1111-4111-8111-111111111111",
            event_name: "bid:accepted",
            id: "33333333-3333-4333-8333-333333333333",
            payload: {
              event: "bid:accepted",
              lotId: "11111111-1111-4111-8111-111111111111",
              sequence: 4,
            },
          },
        ] as T[],
      };
    }
    return { rows: [] };
  }

  release = vi.fn();
}

describe("bidding outbox publisher", () => {
  it("emits unpublished lot events and marks them published after successful emit", async () => {
    const client = new FakeClient();
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const publisher = new BiddingOutboxPublisher(databaseFor(client));

    const count = await publisher.publishPendingLotEvents({ to }, 25);

    expect(count).toBe(1);
    expect(to).toHaveBeenCalledWith("lot:11111111-1111-4111-8111-111111111111");
    expect(emit).toHaveBeenCalledWith(
      "bid:accepted",
      expect.objectContaining({ sequence: 4 }),
    );
    expect(
      client.queries.some((query) =>
        query.text.includes("SET published_at = now()"),
      ),
    ).toBe(true);
  });
});

function databaseFor(client: FakeClient): DatabasePool {
  return {
    connect: async () => client,
  } as unknown as DatabasePool;
}
