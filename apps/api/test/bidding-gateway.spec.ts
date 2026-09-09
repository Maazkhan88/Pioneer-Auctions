import { describe, expect, it, vi } from "vitest";

import { BiddingGateway } from "../src/bidding/bidding.gateway.js";
import { money, type LotSnapshot } from "../src/bidding/bid.dto.js";
import type { BiddingOutboxPublisher } from "../src/bidding/bidding-outbox.publisher.js";
import type { BiddingService } from "../src/bidding/bidding.service.js";
import type { SessionService } from "../src/identity/session.service.js";

interface FakeSocket {
  readonly data: Record<string, string | undefined>;
  readonly emit: ReturnType<typeof vi.fn>;
  readonly handshake: {
    readonly auth: Record<string, string>;
    readonly headers: Record<string, string>;
  };
  readonly id: string;
  readonly join: ReturnType<typeof vi.fn>;
  readonly leave: ReturnType<typeof vi.fn>;
}

const accountId = "00000000-0000-4000-8000-000000000001";
const lotId = "11111111-1111-4111-8111-111111111111";
const commandId = "835cb208-e936-4e0c-9863-c85a96f2ff60";
const termsVersionId = "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d";

describe("bidding gateway", () => {
  it("emits a server hello and joins the authenticated user room on connect", () => {
    const socket = fakeSocket({ accountId });
    const gateway = gatewayFor();

    gateway.handleConnection(socket as never);

    expect(socket.join).toHaveBeenCalledWith(`user:${accountId}`);
    expect(socket.emit).toHaveBeenCalledWith(
      "server:hello",
      expect.objectContaining({
        contractVersion: 1,
        heartbeatIntervalMs: 25_000,
      }),
    );
  });

  it("subscribes to a lot room and returns an authoritative snapshot", async () => {
    const snapshot = lotSnapshot();
    const socket = fakeSocket({ accountId });
    const gateway = gatewayFor({
      getLotSnapshot: vi.fn().mockResolvedValue(snapshot),
    });

    const result = await gateway.subscribeToLot(socket as never, {
      commandId,
      contractVersion: 1,
      lotId,
      sentAt: "2026-09-01T15:59:30.000Z",
    });

    expect(socket.join).toHaveBeenCalledWith(`lot:${lotId}`);
    expect(result).toMatchObject({
      result: snapshot,
      status: "ACCEPTED",
    });
  });

  it("replays contiguous retained lot events on subscribe when afterSequence is supplied", async () => {
    const replayPayload = {
      event: "bid:accepted",
      lotId,
      sequence: 2,
    };
    const gateway = gatewayFor({
      getLotEventsAfter: vi.fn().mockResolvedValue([
        {
          event: "bid:accepted",
          payload: replayPayload,
          sequence: 2,
        },
      ]),
      getLotSnapshot: vi.fn().mockResolvedValue({
        ...lotSnapshot(),
        sequence: 2,
      }),
    });

    const result = await gateway.subscribeToLot(
      fakeSocket({ accountId }) as never,
      {
        afterSequence: 1,
        commandId,
        contractVersion: 1,
        lotId,
        sentAt: "2026-09-01T15:59:30.000Z",
      },
    );

    expect(result).toMatchObject({
      result: {
        replay: [replayPayload],
      },
      status: "ACCEPTED",
    });
  });

  it("syncs lot state on lot:sync with afterSequence", async () => {
    const replayPayload = {
      event: "bid:accepted",
      lotId,
      sequence: 5,
    };
    const gateway = gatewayFor({
      getLotEventsAfter: vi.fn().mockResolvedValue([
        {
          event: "bid:accepted",
          payload: replayPayload,
          sequence: 5,
        },
      ]),
      getLotSnapshot: vi.fn().mockResolvedValue({
        ...lotSnapshot(),
        sequence: 5,
      }),
    });

    const result = await gateway.syncLot({
      afterSequence: 4,
      commandId,
      contractVersion: 1,
      lotId,
      sentAt: "2026-09-01T15:59:30.000Z",
    });

    expect(result).toMatchObject({
      result: {
        replay: [replayPayload],
        sequence: 5,
      },
      status: "ACCEPTED",
    });
  });

  it("routes socket manual bid commands to the durable bidding service", async () => {
    const placeManualBid = vi.fn().mockResolvedValue({
      commandId,
      contractVersion: 1,
      correlationId: "socket",
      result: {
        closesAt: "2026-09-01T16:02:00.000Z",
        currentBid: money(5200000),
        extended: true,
        lotId,
        myBidStatus: "WINNING",
        nextMinimumBid: money(5300000),
        reserveStatus: "NOT_MET",
        sequence: 1,
      },
      serverTime: "2026-09-01T15:59:30.000Z",
      status: "ACCEPTED",
    });
    const gateway = gatewayFor({ placeManualBid });

    const result = await gateway.placeBid(fakeSocket({ accountId }) as never, {
      amount: money(5200000),
      commandId,
      contractVersion: 1,
      expectedSequence: 0,
      lotId,
      sentAt: "2026-09-01T15:59:30.000Z",
      termsVersionId,
    });

    expect(placeManualBid).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        commandId,
        input: expect.objectContaining({ amountFils: 5200000 }),
        lotId,
      }),
    );
    expect(result).toMatchObject({ status: "ACCEPTED" });
  });

  it("routes socket proxy bid commands to the durable bidding service", async () => {
    const setProxyBid = vi.fn().mockResolvedValue({
      commandId,
      contractVersion: 1,
      correlationId: "socket",
      result: {
        activeProxyMaximum: money(6000000),
        closesAt: "2026-09-01T16:02:00.000Z",
        currentBid: money(5000000),
        extended: true,
        lotId,
        myBidStatus: "WINNING",
        nextMinimumBid: money(5100000),
        reserveStatus: "NOT_MET",
        sequence: 1,
      },
      serverTime: "2026-09-01T15:59:30.000Z",
      status: "ACCEPTED",
    });
    const gateway = gatewayFor({ setProxyBid });

    const result = await gateway.setProxyBid(
      fakeSocket({ accountId }) as never,
      {
        commandId,
        contractVersion: 1,
        expectedSequence: 0,
        lotId,
        maximum: money(6000000),
        sentAt: "2026-09-01T15:59:30.000Z",
        termsVersionId,
      },
    );

    expect(setProxyBid).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        commandId,
        input: expect.objectContaining({ maximumFils: 6000000 }),
        lotId,
      }),
    );
    expect(result).toMatchObject({ status: "ACCEPTED" });
  });

  it("rejects malformed socket commands as validation failures", async () => {
    const result = await gatewayFor().placeBid(
      fakeSocket({ accountId }) as never,
      {
        commandId,
        contractVersion: 1,
        lotId,
        sentAt: "2026-09-01T15:59:30.000Z",
      },
    );

    expect(result).toMatchObject({
      error: { code: "VALIDATION_FAILED" },
      status: "REJECTED",
    });
  });

  it("publishes pending outbox events through the injected publisher", async () => {
    const publishPendingLotEvents = vi.fn().mockResolvedValue(3);
    const gateway = gatewayFor({}, { publishPendingLotEvents });
    const server = { to: vi.fn() };
    Object.defineProperty(gateway, "server", { value: server });

    const count = await gateway.publishPendingOutboxEvents(50);

    expect(count).toBe(3);
    expect(publishPendingLotEvents).toHaveBeenCalledWith(server, 50);
  });
});

function gatewayFor(
  overrides: Partial<BiddingService> = {},
  publisherOverrides: Partial<BiddingOutboxPublisher> = {},
): BiddingGateway {
  const bidding = {
    getLotEventsAfter: vi.fn().mockResolvedValue([]),
    getLotSnapshot: vi.fn().mockResolvedValue(lotSnapshot()),
    placeManualBid: vi.fn(),
    setProxyBid: vi.fn(),
    ...overrides,
  } as unknown as BiddingService;
  const publisher = {
    publishPendingLotEvents: vi.fn().mockResolvedValue(0),
    ...publisherOverrides,
  } as unknown as BiddingOutboxPublisher;
  const session = {
    requireAccountId: vi.fn().mockResolvedValue({ id: accountId }),
  } as unknown as SessionService;
  return new BiddingGateway(bidding, publisher, session);
}

function fakeSocket(input: { readonly accountId?: string }): FakeSocket {
  return {
    data: {},
    emit: vi.fn(),
    handshake: {
      auth:
        input.accountId === undefined ? {} : { testAccountId: input.accountId },
      headers: {},
    },
    id: "socket-1",
    join: vi.fn(),
    leave: vi.fn(),
  };
}

function lotSnapshot(): LotSnapshot {
  return {
    auctionId: "22222222-2222-4222-8222-222222222222",
    contractVersion: 1,
    event: "lot:snapshot",
    generatedAt: "2026-09-01T15:59:30.000Z",
    lotId,
    sequence: 1,
    state: {
      bidCount: 1,
      closesAt: "2026-09-01T16:02:00.000Z",
      currentBid: money(5000000),
      lifecycle: "LIVE",
      nextMinimumBid: money(5100000),
      reserveStatus: "NOT_MET",
      softClose: {
        enabled: true,
        extensionCount: 1,
        extensionMs: 120000,
        windowMs: 120000,
      },
      startsAt: "2026-09-01T15:00:00.000Z",
    },
  };
}
