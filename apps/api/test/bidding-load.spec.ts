import { describe, expect, it } from "vitest";

import { BiddingLoadHarness } from "./load/bidding-load-harness.js";

describe("Task 011: Bidding Load Harness & SLA Targets", () => {
  it("executes simulated concurrent bidding workload and generates SLA report", async () => {
    const harness = new BiddingLoadHarness({
      concurrency: 50,
      durationMs: 500, // 500ms test run
      lotId: "11111111-1111-4111-8111-111111111111",
      proxyRatio: 0.2,
      targetBidsPerSec: 100,
    });

    const report = await harness.run();

    expect(report.totalAttempts).toBeGreaterThan(10);
    expect(report.acceptedCount).toBeGreaterThan(0);
    expect(report.domainRejectionCount).toBeGreaterThan(0);
    expect(report.technicalFailureCount).toBe(0);
    expect(report.rejectionsByCode).toHaveProperty("BID_TOO_LOW");
    expect(report.latencyMs.p95).toBeLessThanOrEqual(150);
    expect(report.targetAchieved).toBe(true);

    const formatted = BiddingLoadHarness.formatReport(report);
    expect(formatted).toContain("PIONEER BIDDING LOAD HARNESS REPORT");
    expect(formatted).toContain("50 concurrent bidders");
    expect(formatted).toContain("PASSED (Within SLA target)");
  });

  it("distinguishes expected auction rejection from technical failure under fault injection", async () => {
    const harness = new BiddingLoadHarness({
      concurrency: 10,
      durationMs: 200,
      lotId: "11111111-1111-4111-8111-111111111111",
      proxyRatio: 0.1,
      targetBidsPerSec: 50,
    });

    let attemptIndex = 0;
    const report = await harness.run(async (_cmd) => {
      attemptIndex++;
      if (attemptIndex % 2 === 0) {
        // Legitimate domain rejection
        return { code: "DEPOSIT_INSUFFICIENT", status: "REJECTED" };
      }
      if (attemptIndex % 3 === 0) {
        // Technical error
        return { code: "DATABASE_TIMEOUT", status: "ERROR" };
      }
      return { status: "ACCEPTED" };
    });

    expect(report.domainRejectionCount).toBeGreaterThan(0);
    expect(report.technicalFailureCount).toBeGreaterThan(0);
    expect(report.rejectionsByCode).toHaveProperty("DEPOSIT_INSUFFICIENT");
    expect(report.rejectionsByCode).toHaveProperty("DATABASE_TIMEOUT");
    // Under injected technical failures, targetAchieved correctly reflects failure
    expect(report.targetAchieved).toBe(false);
  });
});
