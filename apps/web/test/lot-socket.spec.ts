import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";

import { classifySequence, LotSocketClient } from "../lib/lot-socket";
import type { BuyerBidSessionConfig } from "../lib/bid-session";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));

const session: BuyerBidSessionConfig = {
  apiBaseUrl: "https://api.test",
  termsVersionId: "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d",
  testAccountId: "00000000-0000-4000-8000-000000000001",
};

describe("classifySequence", () => {
  it("treats no prior sequence as a gap so the caller waits for a snapshot", () => {
    expect(classifySequence(null, 1)).toBe("gap");
    expect(classifySequence(null, 0)).toBe("gap");
  });

  it("applies exactly sequence + 1", () => {
    expect(classifySequence(41, 42)).toBe("apply");
  });

  it("treats an equal or older sequence as stale (duplicate delivery)", () => {
    expect(classifySequence(42, 42)).toBe("stale");
    expect(classifySequence(42, 10)).toBe("stale");
  });

  it("treats anything beyond sequence + 1 as a gap", () => {
    expect(classifySequence(42, 44)).toBe("gap");
    expect(classifySequence(42, 100)).toBe("gap");
  });
});

/** Minimal fake matching the subset of the socket.io-client `Socket` API `LotSocketClient` uses. */
interface FakeSocket {
  connected: boolean;
  readonly emit: ReturnType<typeof vi.fn>;
  readonly handlers: Map<string, (...args: unknown[]) => void>;
  readonly on: ReturnType<typeof vi.fn>;
  readonly removeAllListeners: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
}

function createFakeSocket(): FakeSocket {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    connected: true,
    disconnect: vi.fn(),
    emit: vi.fn(),
    handlers,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    removeAllListeners: vi.fn(),
  };
}

describe("LotSocketClient", () => {
  let fakeSocket: FakeSocket;

  beforeEach(() => {
    fakeSocket = createFakeSocket();
    vi.mocked(io).mockReturnValue(
      fakeSocket as unknown as ReturnType<typeof io>,
    );
  });

  it("applies a snapshot ack from lot:subscribe and reports connection state", () => {
    const snapshots: number[] = [];
    const connectionChanges: boolean[] = [];
    const client = new LotSocketClient(session, "lot-1", {
      onConnectionChange: (connected) => connectionChanges.push(connected),
      onSnapshot: (event) => snapshots.push(event.sequence),
    });

    client.connect();
    expect(client.isConnected()).toBe(true);

    // Simulate the server's "connect" event, which triggers subscribe().
    fakeSocket.handlers.get("connect")?.();
    expect(connectionChanges).toEqual([true]);

    // The subscribe emit's ack callback is the 3rd emit() argument.
    const subscribeCall = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "lot:subscribe",
    );
    expect(subscribeCall).toBeDefined();
    const ackCallback = subscribeCall?.[2] as (ack: unknown) => void;
    ackCallback({
      commandId: "cmd-1",
      contractVersion: 1,
      correlationId: "corr-1",
      result: {
        auctionId: "auction-1",
        lotId: "lot-1",
        sequence: 5,
        state: {
          bidCount: 1,
          closesAt: "2026-07-14T17:02:00.000Z",
          currentBid: { amountFils: 100, currency: "AED" },
          lifecycle: "LIVE",
          nextMinimumBid: { amountFils: 200, currency: "AED" },
          reserveStatus: "MET",
        },
      },
      serverTime: "2026-07-14T17:00:00.000Z",
      status: "ACCEPTED",
    });

    expect(snapshots).toEqual([5]);
  });

  it("classifies bid:accepted sequences correctly: applies the next one, ignores stale, and syncs on a gap", () => {
    const appliedSequences: number[] = [];
    let gapDetected = false;
    const client = new LotSocketClient(session, "lot-1", {
      onBidAccepted: (event) => appliedSequences.push(event.sequence),
      onGapDetected: () => {
        gapDetected = true;
      },
    });
    client.connect();

    // Seed a snapshot at sequence 5 first (as the real server always does on subscribe).
    fakeSocket.handlers.get("lot:snapshot")?.({
      auctionId: "auction-1",
      lotId: "lot-1",
      sequence: 5,
      state: {
        bidCount: 1,
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: { amountFils: 100, currency: "AED" },
        lifecycle: "LIVE",
        nextMinimumBid: { amountFils: 200, currency: "AED" },
        reserveStatus: "MET",
      },
    });

    const bidAcceptedHandler = fakeSocket.handlers.get("bid:accepted");
    expect(bidAcceptedHandler).toBeDefined();

    // Sequence 6 (5 + 1) should apply.
    bidAcceptedHandler?.({
      amount: { amountFils: 200, currency: "AED" },
      auctionId: "auction-1",
      bidKind: "MANUAL",
      currentBid: { amountFils: 200, currency: "AED" },
      extended: false,
      lotId: "lot-1",
      nextMinimumBid: { amountFils: 300, currency: "AED" },
      reserveStatus: "MET",
      sequence: 6,
    });
    expect(appliedSequences).toEqual([6]);

    // Sequence 6 again (duplicate delivery) should be ignored, not re-applied.
    bidAcceptedHandler?.({
      amount: { amountFils: 200, currency: "AED" },
      auctionId: "auction-1",
      bidKind: "MANUAL",
      currentBid: { amountFils: 200, currency: "AED" },
      extended: false,
      lotId: "lot-1",
      nextMinimumBid: { amountFils: 300, currency: "AED" },
      reserveStatus: "MET",
      sequence: 6,
    });
    expect(appliedSequences).toEqual([6]);

    // Sequence 9 (a gap after 6) should trigger onGapDetected and a lot:sync emit, not apply.
    bidAcceptedHandler?.({
      amount: { amountFils: 900, currency: "AED" },
      auctionId: "auction-1",
      bidKind: "MANUAL",
      currentBid: { amountFils: 900, currency: "AED" },
      extended: false,
      lotId: "lot-1",
      nextMinimumBid: { amountFils: 1_000, currency: "AED" },
      reserveStatus: "MET",
      sequence: 9,
    });
    expect(appliedSequences).toEqual([6]);
    expect(gapDetected).toBe(true);

    const syncCall = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "lot:sync",
    );
    expect(syncCall).toBeDefined();
    expect(syncCall?.[1]).toMatchObject({
      afterSequence: 6,
      lotId: "lot-1",
    });

    // Simulate lot:sync ack resolving with the sequence 9 snapshot
    const syncAckCallback = syncCall?.[2] as (ack: unknown) => void;
    syncAckCallback({
      commandId: "sync-cmd-1",
      contractVersion: 1,
      result: {
        auctionId: "auction-1",
        lotId: "lot-1",
        sequence: 9,
        state: {
          bidCount: 4,
          closesAt: "2026-07-14T17:02:00.000Z",
          currentBid: { amountFils: 900, currency: "AED" },
          lifecycle: "LIVE",
          nextMinimumBid: { amountFils: 1_000, currency: "AED" },
          reserveStatus: "MET",
        },
      },
      serverTime: "2026-07-14T17:01:00.000Z",
      status: "ACCEPTED",
    });

    // Sequence 10 should now apply cleanly after the sync restored continuity
    bidAcceptedHandler?.({
      amount: { amountFils: 1_000, currency: "AED" },
      auctionId: "auction-1",
      bidKind: "MANUAL",
      currentBid: { amountFils: 1_000, currency: "AED" },
      extended: false,
      lotId: "lot-1",
      nextMinimumBid: { amountFils: 1_100, currency: "AED" },
      reserveStatus: "MET",
      sequence: 10,
    });
    expect(appliedSequences).toEqual([6, 10]);
  });

  it("re-subscribes with afterSequence when reconnecting after a disconnect", () => {
    const connectionChanges: boolean[] = [];
    const client = new LotSocketClient(session, "lot-1", {
      onConnectionChange: (connected) => connectionChanges.push(connected),
    });
    client.connect();

    // 1. Initial connect
    fakeSocket.handlers.get("connect")?.();

    // 2. Initial snapshot at sequence 7
    const subscribeCall = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "lot:subscribe",
    );
    expect(subscribeCall?.[1].afterSequence).toBeUndefined();
    const ackCallback = subscribeCall?.[2] as (ack: unknown) => void;
    ackCallback({
      commandId: "cmd-sub",
      contractVersion: 1,
      result: {
        auctionId: "auction-1",
        lotId: "lot-1",
        sequence: 7,
        state: {
          bidCount: 3,
          closesAt: "2026-07-14T17:02:00.000Z",
          currentBid: { amountFils: 700, currency: "AED" },
          lifecycle: "LIVE",
          nextMinimumBid: { amountFils: 800, currency: "AED" },
          reserveStatus: "MET",
        },
      },
      status: "ACCEPTED",
    });

    // 3. Disconnect happens
    fakeSocket.handlers.get("disconnect")?.();
    expect(connectionChanges).toEqual([true, false]);

    // Clear previous emit calls to isolate reconnect emit
    fakeSocket.emit.mockClear();

    // 4. Reconnect event
    fakeSocket.handlers.get("connect")?.();
    expect(connectionChanges).toEqual([true, false, true]);

    const reconnectSubscribe = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "lot:subscribe",
    );
    expect(reconnectSubscribe).toBeDefined();
    expect(reconnectSubscribe?.[1]).toMatchObject({
      afterSequence: 7,
      lotId: "lot-1",
    });
  });

  it("placeBid resolves 'not-connected' when there is no live socket", async () => {
    fakeSocket.connected = false;
    const client = new LotSocketClient(session, "lot-1", {});
    client.connect();

    const result = await client.placeBid({
      amount: { amountFils: 100, currency: "AED" },
      commandId: "cmd-1",
      expectedSequence: 0,
    });

    expect(result).toEqual({ outcome: "not-connected" });
  });

  it("placeBid resolves the parsed ack when the server acknowledges", async () => {
    const client = new LotSocketClient(session, "lot-1", {});
    client.connect();

    const resultPromise = client.placeBid({
      amount: { amountFils: 5_200_000, currency: "AED" },
      commandId: "cmd-1",
      expectedSequence: 41,
    });

    const placeBidCall = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "bid:place",
    );
    expect(placeBidCall).toBeDefined();
    const [, payload, ackCallback] = placeBidCall as [
      string,
      Record<string, unknown>,
      (ack: unknown) => void,
    ];
    expect(payload.lotId).toBe("lot-1");
    expect(payload.commandId).toBe("cmd-1");

    ackCallback({
      commandId: "cmd-1",
      result: {
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: { amountFils: 5_200_000, currency: "AED" },
        extended: true,
        myBidStatus: "WINNING",
        nextMinimumBid: { amountFils: 5_300_000, currency: "AED" },
      },
      status: "ACCEPTED",
    });

    const result = await resultPromise;
    expect(result.outcome).toBe("ack");
    if (result.outcome === "ack" && result.ack.status === "ACCEPTED") {
      expect(result.ack.result.myBidStatus).toBe("WINNING");
    } else {
      expect.fail("expected an ACCEPTED ack");
    }
  });

  it("placeBid resolves 'unknown' when the ack never arrives before the timeout", async () => {
    vi.useFakeTimers();
    try {
      const client = new LotSocketClient(session, "lot-1", {});
      client.connect();

      const resultPromise = client.placeBid({
        amount: { amountFils: 100, currency: "AED" },
        commandId: "cmd-1",
        expectedSequence: 0,
      });

      await vi.advanceTimersByTimeAsync(10_000);

      const result = await resultPromise;
      expect(result).toEqual({ outcome: "unknown" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("setProxyBid resolves 'not-connected' when there is no live socket", async () => {
    fakeSocket.connected = false;
    const client = new LotSocketClient(session, "lot-1", {});
    client.connect();

    const result = await client.setProxyBid({
      commandId: "cmd-1",
      expectedSequence: 0,
      maximum: { amountFils: 6_000_000, currency: "AED" },
    });

    expect(result).toEqual({ outcome: "not-connected" });
  });

  it("setProxyBid emits proxy-bid:set and resolves the parsed ack, including the NOT_BIDDING status", async () => {
    const client = new LotSocketClient(session, "lot-1", {});
    client.connect();

    const resultPromise = client.setProxyBid({
      commandId: "cmd-1",
      expectedSequence: 41,
      maximum: { amountFils: 6_000_000, currency: "AED" },
    });

    const proxyBidCall = fakeSocket.emit.mock.calls.find(
      (call) => call[0] === "proxy-bid:set",
    );
    expect(proxyBidCall).toBeDefined();
    const [, payload, ackCallback] = proxyBidCall as [
      string,
      Record<string, unknown>,
      (ack: unknown) => void,
    ];
    expect(payload.lotId).toBe("lot-1");
    expect(payload.maximum).toEqual({ amountFils: 6_000_000, currency: "AED" });

    ackCallback({
      commandId: "cmd-1",
      result: {
        activeProxyMaximum: { amountFils: 6_000_000, currency: "AED" },
        closesAt: "2026-07-14T17:02:00.000Z",
        currentBid: { amountFils: 5_200_000, currency: "AED" },
        extended: false,
        myBidStatus: "NOT_BIDDING",
        nextMinimumBid: { amountFils: 5_300_000, currency: "AED" },
      },
      status: "ACCEPTED",
    });

    const result = await resultPromise;
    expect(result.outcome).toBe("ack");
    if (result.outcome === "ack" && result.ack.status === "ACCEPTED") {
      expect(result.ack.result.myBidStatus).toBe("NOT_BIDDING");
      expect(result.ack.result.activeProxyMaximum).toEqual({
        amountFils: 6_000_000,
        currency: "AED",
      });
    } else {
      expect.fail("expected an ACCEPTED ack");
    }
  });

  it("dispose() unsubscribes, removes listeners, and disconnects", () => {
    const client = new LotSocketClient(session, "lot-1", {});
    client.connect();
    client.dispose();

    expect(
      fakeSocket.emit.mock.calls.some((call) => call[0] === "lot:unsubscribe"),
    ).toBe(true);
    expect(fakeSocket.removeAllListeners).toHaveBeenCalled();
    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });
});
