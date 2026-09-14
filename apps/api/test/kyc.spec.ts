import { describe, expect, it } from "vitest";

import { KycController } from "../src/identity/kyc.controller.js";
import { KycService } from "../src/identity/kyc.service.js";

describe("Task 008 — Identity & KYC Backend Endpoints", () => {
  const fakeDatabasePool = {
    query: async (sql: string, params: unknown[]) => {
      if (sql.includes("SELECT status")) {
        return {
          rows: [{ status: "ACTIVE", display_name: "Ahmed Al Mansoori" }],
        };
      }
      return { rows: [] };
    },
  };

  const kycService = new KycService(fakeDatabasePool as never);
  const controller = new KycController(kycService);

  it("returns verified status and bidder paddle for active account", async () => {
    const status = await controller.getStatus("bd44b2e8-5e31-4e04-b0bf-cf5b2146192f");
    expect(status.status).toBe("VERIFIED");
    expect(status.bidderNumber).toBe("Paddle #192f");
  });

  it("creates a new KYC document scanning session", async () => {
    const session = await controller.startSession("bd44b2e8-5e31-4e04-b0bf-cf5b2146192f");
    expect(session.sessionId).toMatch(/^kyc-sess-/);
    expect(session.status).toBe("INITIATED");
    expect(session.accountId).toBe("bd44b2e8-5e31-4e04-b0bf-cf5b2146192f");
  });

  it("submits valid Emirates ID verification successfully", async () => {
    const result = await controller.submit(
      {
        emiratesIdNumber: "784-1992-1234567-1",
        fullNameEn: "Ahmed Al Mansoori",
        nationality: "United Arab Emirates",
        dateOfBirth: "1992-05-15",
        expiryDate: "2028-05-14",
        cardFrontRef: "doc-front-001",
        cardBackRef: "doc-back-002",
      },
      "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f",
    );

    expect(result.status).toBe("VERIFIED");
    expect(result.bidderNumber).toBe("Paddle #192f");
    expect(result.verifiedAt).toBeDefined();
  });

  it("rejects invalid Emirates ID formats with validation error", async () => {
    await expect(
      controller.submit(
        {
          emiratesIdNumber: "invalid-id-format",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
          dateOfBirth: "1992-05-15",
          expiryDate: "2028-05-14",
          cardFrontRef: "doc-front-001",
          cardBackRef: "doc-back-002",
        },
        "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f",
      ),
    ).rejects.toThrow();
  });
});
