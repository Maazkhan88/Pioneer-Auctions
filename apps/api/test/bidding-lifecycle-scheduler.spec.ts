import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuctionCloseService } from "../src/bidding/auction-close.service.js";
import type { AuctionOpenService } from "../src/bidding/auction-open.service.js";
import { BiddingLifecycleScheduler } from "../src/bidding/bidding-lifecycle.scheduler.js";
import type { BiddingGateway } from "../src/bidding/bidding.gateway.js";
import type { EnvironmentService } from "../src/config/environment.service.js";
import type { StructuredLogger } from "../src/observability/structured-logger.service.js";

describe("bidding lifecycle scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens, closes, and publishes on each tick, logging when there is activity", async () => {
    const openDueLots = vi.fn().mockResolvedValue(2);
    const closeDueLots = vi.fn().mockResolvedValue(1);
    const publishPendingOutboxEvents = vi.fn().mockResolvedValue(3);
    const log = vi.fn();
    const scheduler = createScheduler({
      closeDueLots,
      log,
      nodeEnv: "development",
      openDueLots,
      publishPendingOutboxEvents,
    });

    await scheduler.tick();

    expect(openDueLots).toHaveBeenCalled();
    expect(closeDueLots).toHaveBeenCalled();
    expect(publishPendingOutboxEvents).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "Lifecycle scheduler tick",
      expect.objectContaining({ closed: 1, opened: 2, published: 3 }),
    );
  });

  it("does not log when a tick has no activity", async () => {
    const log = vi.fn();
    const scheduler = createScheduler({
      closeDueLots: vi.fn().mockResolvedValue(0),
      log,
      nodeEnv: "development",
      openDueLots: vi.fn().mockResolvedValue(0),
      publishPendingOutboxEvents: vi.fn().mockResolvedValue(0),
    });

    await scheduler.tick();

    expect(log).not.toHaveBeenCalled();
  });

  it("catches errors from a tick and logs them instead of throwing", async () => {
    const error = vi.fn();
    const scheduler = createScheduler({
      closeDueLots: vi.fn().mockResolvedValue(0),
      error,
      openDueLots: vi.fn().mockRejectedValue(new Error("db unavailable")),
      publishPendingOutboxEvents: vi.fn().mockResolvedValue(0),
    });

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "Lifecycle scheduler tick failed",
      expect.any(Error),
    );
  });

  it("does not start a timer when NODE_ENV is test", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const scheduler = createScheduler({ nodeEnv: "test" });

    scheduler.onApplicationBootstrap();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("starts a timer outside test mode and clears it on destroy", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const scheduler = createScheduler({ nodeEnv: "development" });

    scheduler.onApplicationBootstrap();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    scheduler.onModuleDestroy();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});

interface SchedulerTestOptions {
  readonly closeDueLots?: ReturnType<typeof vi.fn>;
  readonly error?: ReturnType<typeof vi.fn>;
  readonly log?: ReturnType<typeof vi.fn>;
  readonly nodeEnv?: string;
  readonly openDueLots?: ReturnType<typeof vi.fn>;
  readonly publishPendingOutboxEvents?: ReturnType<typeof vi.fn>;
}

function createScheduler(
  options: SchedulerTestOptions,
): BiddingLifecycleScheduler {
  const openService = {
    openDueLots: options.openDueLots ?? vi.fn().mockResolvedValue(0),
  } as unknown as AuctionOpenService;
  const closeService = {
    closeDueLots: options.closeDueLots ?? vi.fn().mockResolvedValue(0),
  } as unknown as AuctionCloseService;
  const gateway = {
    publishPendingOutboxEvents:
      options.publishPendingOutboxEvents ?? vi.fn().mockResolvedValue(0),
  } as unknown as BiddingGateway;
  const environment = {
    values: { nodeEnv: options.nodeEnv ?? "development" },
  } as unknown as EnvironmentService;
  const logger = {
    error: options.error ?? vi.fn(),
    log: options.log ?? vi.fn(),
  } as unknown as StructuredLogger;

  return new BiddingLifecycleScheduler(
    openService,
    closeService,
    gateway,
    environment,
    logger,
  );
}
