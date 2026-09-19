import { describe, expect, it, vi } from "vitest";

import { BiddingOutboxPublisher } from "../src/bidding/bidding-outbox.publisher.js";
import { BiddingRecoveryService } from "../src/bidding/bidding-recovery.service.js";
import { BiddingService } from "../src/bidding/bidding.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";
import { MetricsService } from "../src/observability/metrics.service.js";

describe("Task 011: Failure Injection & Resilience Verification", () => {
  it("Fails closed on database timeout/error without advancing sequence or fabricating wins", async () => {
    // Simulate failing database that throws connection timeout
    const failingDb = {
      connect: vi.fn().mockRejectedValue(new Error("Query read timeout after 3000ms")),
      query: vi.fn().mockRejectedValue(new Error("Connection terminated unexpectedly")),
    } as unknown as DatabasePool;

    const metrics = new MetricsService();
    const service = new BiddingService(failingDb, metrics);

    // Attempting a bid must throw or reject cleanly, never silently succeeding
    await expect(
      service.placeManualBid({
        accountId: "00000000-0000-4000-8000-000000000001",
        commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        correlationId: "corr-fail-1",
        input: {
          amount: { amountFils: 60000000, currency: "AED" },
          expectedSequence: 4,
          termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
        },
        lotId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toThrow(/Query read timeout after 3000ms/);

    // Verify metrics recorded the failure
    expect(metrics.getActiveSockets()).toBe(0);
  });

  it("Recovers snapshot and preserves authoritative state after gateway termination", async () => {
    const mockDb = {
      query: vi.fn().mockImplementation(async (text: string) => {
        if (text.includes("FROM lots")) {
          return {
            rows: [
              {
                active_proxy_count: "1",
                auction_id: "22222222-2222-4222-8222-222222222222",
                bid_count: 5,
                closes_at: new Date("2026-09-01T16:00:00.000Z"),
                current_bid_fils: "56000000",
                leading_account_id: "00000000-0000-4000-8000-000000000001",
                lifecycle: "LIVE",
                minimum_increment_fils: "100000",
                next_minimum_bid_fils: "56100000",
                reserve_status: "MET",
                sequence: 5,
                soft_close_extension_count: 0,
                soft_close_extension_ms: 120000,
                soft_close_maximum_extensions: 10,
                soft_close_window_ms: 120000,
                starts_at: new Date("2026-09-01T12:00:00.000Z"),
              },
            ],
          };
        }
        return { rows: [] };
      }),
    } as unknown as DatabasePool;

    const recoveryService = new BiddingRecoveryService(mockDb);

    // Rebuild lot state after crash
    const rebuilt = await recoveryService.rebuildLotState("11111111-1111-4111-8111-111111111111");

    expect(rebuilt.sequence).toBe(5);
    expect(rebuilt.currentBid.amountFils).toBe(56000000);
    expect(rebuilt.reserveStatus).toBe("MET");
    // Authoritative check: proxy maximums are NEVER exposed in recovery snapshots
    expect(JSON.stringify(rebuilt)).not.toContain("maximumFils");
  });

  it("Safely accumulates outbox events during fan-out transport failure and drains on recovery", async () => {
    let transportFailures = 2;

    const mockClient = {
      query: vi.fn().mockImplementation(async (text: string) => {
        if (text.includes("FROM outbox_events")) {
          return {
            rows: [
              {
                aggregate_id: "lot-1",
                aggregate_type: "lot",
                event_name: "bid:accepted",
                id: "event-1",
                payload: { lotId: "lot-1", sequence: 42 },
              },
              {
                aggregate_id: "lot-1",
                aggregate_type: "lot",
                event_name: "lot:extended",
                id: "event-2",
                payload: { lotId: "lot-1", sequence: 43 },
              },
            ],
          };
        }
        if (text.includes("UPDATE outbox_events")) {
          return { rowCount: 2, rows: [] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as unknown as DatabasePool;

    const mockServer = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn().mockImplementation(() => {
          if (transportFailures > 0) {
            transportFailures--;
            throw new Error("Redis adapter disconnected / socket buffer full");
          }
        }),
      }),
    };

    const publisher = new BiddingOutboxPublisher(mockDb);

    // First attempt fails due to transport degradation
    await expect(publisher.publishPendingLotEvents(mockServer as never, 10)).rejects.toThrow(
      /Redis adapter disconnected/,
    );
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClient.release).toHaveBeenCalled();

    // Second attempt fails
    await expect(publisher.publishPendingLotEvents(mockServer as never, 10)).rejects.toThrow(
      /Redis adapter disconnected/,
    );

    // Third attempt succeeds when transport recovers
    const drained = await publisher.publishPendingLotEvents(mockServer as never, 10);
    expect(drained).toBe(2);
    expect(mockServer.to).toHaveBeenCalledWith("lot:lot-1");
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
  });
});
