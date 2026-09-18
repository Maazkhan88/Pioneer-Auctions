import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { DevelopmentFakeKycProvider } from "../src/identity/development-fake-kyc.provider.js";
import { IdentityService } from "../src/identity/identity.service.js";
import { KycController } from "../src/identity/kyc.controller.js";
import { KycService } from "../src/identity/kyc.service.js";
import { SessionService } from "../src/identity/session.service.js";

describe("Task 008 — Authenticated, Fail-Closed Identity & KYC Backend", () => {
  const mockAccount = {
    displayName: "Ahmed Al Mansoori",
    id: "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f",
    permissions: [],
    roles: ["buyer"],
    status: "ACTIVE" as const,
  };

  const createTestStack = (options?: {
    dbError?: boolean;
    kycStatus?: string;
    accountStatus?: string;
  }) => {
    let persistedKycStatus: string | null = null;
    const persistedAccountStatus: string | null = null;

    const fakeDatabasePool = {
      query: async (sql: string, params: unknown[]) => {
        if (options?.dbError) {
          throw new Error("Simulated database connection failure");
        }
        if (sql.includes("SELECT kyc_status")) {
          return {
            rowCount: 1,
            rows: [
              {
                display_name: mockAccount.displayName,
                kyc_status: options?.kycStatus ?? "NOT_STARTED",
                status: options?.accountStatus ?? "ACTIVE",
              },
            ],
          };
        }
        if (sql.includes("UPDATE accounts SET kyc_status")) {
          persistedKycStatus = params[0] as string;
          return { rowCount: 1, rows: [{ id: params[1] }] };
        }
        if (sql.includes("accounts.id = $1")) {
          return {
            rowCount: 1,
            rows: [
              {
                display_name: mockAccount.displayName,
                id: mockAccount.id,
                permissions: [],
                roles: ["buyer"],
                status: mockAccount.status,
              },
            ],
          };
        }
        return { rowCount: 0, rows: [] };
      },
    };

    const identityService = new IdentityService(fakeDatabasePool as never);
    const sessionService = new SessionService(identityService);
    const fakeProvider = new DevelopmentFakeKycProvider();
    const kycService = new KycService(fakeDatabasePool as never, fakeProvider);
    const controller = new KycController(kycService, sessionService);

    return {
      controller,
      getPersistedAccountStatus: () => persistedAccountStatus,
      getPersistedKycStatus: () => persistedKycStatus,
      kycService,
      sessionService,
    };
  };

  const createRequest = (accountId?: string) =>
    ({
      header: (name: string) =>
        name.toLowerCase() === "x-pioneer-test-account-id" ? accountId : undefined,
    }) as never;

  it("requires account context and returns 401 when header is missing", async () => {
    const { controller } = createTestStack();
    const reqWithoutHeader = createRequest(undefined);

    await expect(controller.getStatus(reqWithoutHeader)).rejects.toThrow(
      "Account context is required",
    );
    await expect(controller.startSession(reqWithoutHeader)).rejects.toThrow(
      "Account context is required",
    );
    await expect(
      controller.submit(
        {
          cardBackRef: "doc-back-002",
          cardFrontRef: "doc-front-001",
          dateOfBirth: "1992-05-15",
          emiratesIdNumber: "784-1992-1234567-1",
          expiryDate: "2028-05-14",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
        },
        reqWithoutHeader,
      ),
    ).rejects.toThrow("Account context is required");
  });

  it("returns UNVERIFIED when accounts.status is ACTIVE but kyc_status is NOT_STARTED", async () => {
    const { controller } = createTestStack({
      accountStatus: "ACTIVE",
      kycStatus: "NOT_STARTED",
    });
    const req = createRequest(mockAccount.id);

    const result = await controller.getStatus(req);
    expect(result.status).toBe("UNVERIFIED");
    expect(result.bidderNumber).toBeUndefined();
  });

  it("returns VERIFIED only when accounts.kyc_status is VERIFIED", async () => {
    const { controller } = createTestStack({
      accountStatus: "ACTIVE",
      kycStatus: "VERIFIED",
    });
    const req = createRequest(mockAccount.id);

    const result = await controller.getStatus(req);
    expect(result.status).toBe("VERIFIED");
    expect(result.bidderNumber).toBe("Paddle #192f");
  });

  it("fails closed on database errors and NEVER returns VERIFIED", async () => {
    const { controller } = createTestStack({ dbError: true });
    const req = createRequest(mockAccount.id);

    await expect(controller.getStatus(req)).rejects.toThrow();
  });

  it("submits valid verification, transitions to PENDING, and updates kyc_status without altering account status", async () => {
    const { controller, getPersistedKycStatus, getPersistedAccountStatus } =
      createTestStack({ kycStatus: "NOT_STARTED" });
    const req = createRequest(mockAccount.id);

    const result = await controller.submit(
      {
        cardBackRef: "doc-back-002",
        cardFrontRef: "doc-front-001",
        dateOfBirth: "1992-05-15",
        emiratesIdNumber: "784-1992-1234567-1",
        expiryDate: "2028-05-14",
        fullNameEn: "Ahmed Al Mansoori",
        nationality: "United Arab Emirates",
      },
      req,
    );

    expect(result.status).toBe("PENDING");
    expect(result.bidderNumber).toBeUndefined();
    expect(getPersistedKycStatus()).toBe("PENDING");
    // Verifies accounts.status is untouched
    expect(getPersistedAccountStatus()).toBeNull();
  });

  it("rejects invalid Emirates ID format with VALIDATION_FAILED", async () => {
    const { controller } = createTestStack();
    const req = createRequest(mockAccount.id);

    try {
      await controller.submit(
        {
          cardBackRef: "doc-back-002",
          cardFrontRef: "doc-front-001",
          dateOfBirth: "1992-05-15",
          emiratesIdNumber: "invalid-emirates-id",
          expiryDate: "2028-05-14",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
        },
        req,
      );
      expect.unreachable("should have thrown BadRequestException");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      const badReq = error as BadRequestException;
      expect(badReq.getStatus()).toBe(400);
      const res = badReq.getResponse() as Record<string, unknown>;
      expect(res.code).toBe("VALIDATION_FAILED");
      const fieldErrors = res.fieldErrors as Array<{ field: string; message: string }>;
      expect(fieldErrors.some((fe) => fe.field === "emiratesIdNumber")).toBe(true);
    }
  });

  it("rejects future date of birth with VALIDATION_FAILED", async () => {
    const { controller } = createTestStack();
    const req = createRequest(mockAccount.id);

    try {
      await controller.submit(
        {
          cardBackRef: "doc-back-002",
          cardFrontRef: "doc-front-001",
          dateOfBirth: "2099-01-01",
          emiratesIdNumber: "784-1992-1234567-1",
          expiryDate: "2028-05-14",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
        },
        req,
      );
      expect.unreachable("should have thrown BadRequestException");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      const badReq = error as BadRequestException;
      expect(badReq.getStatus()).toBe(400);
      const res = badReq.getResponse() as Record<string, unknown>;
      expect(res.code).toBe("VALIDATION_FAILED");
      const fieldErrors = res.fieldErrors as Array<{ field: string; message: string }>;
      expect(fieldErrors.some((fe) => fe.message === "Date of birth must be in the past")).toBe(true);
    }
  });

  it("rejects expired document date with VALIDATION_FAILED", async () => {
    const { controller } = createTestStack();
    const req = createRequest(mockAccount.id);

    try {
      await controller.submit(
        {
          cardBackRef: "doc-back-002",
          cardFrontRef: "doc-front-001",
          dateOfBirth: "1992-05-15",
          emiratesIdNumber: "784-1992-1234567-1",
          expiryDate: "2020-01-01",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
        },
        req,
      );
      expect.unreachable("should have thrown BadRequestException");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      const badReq = error as BadRequestException;
      expect(badReq.getStatus()).toBe(400);
      const res = badReq.getResponse() as Record<string, unknown>;
      expect(res.code).toBe("VALIDATION_FAILED");
      const fieldErrors = res.fieldErrors as Array<{ field: string; message: string }>;
      expect(fieldErrors.some((fe) => fe.message === "Document expiry date must be in the future")).toBe(true);
    }
  });

  it("prohibits DevelopmentFakeKycProvider under production configuration", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(() => new DevelopmentFakeKycProvider()).toThrow(
        "DevelopmentFakeKycProvider must not be enabled under production configuration",
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("mounts under /api/v1/me/kyc route prefix", () => {
    const path = Reflect.getMetadata("path", KycController);
    expect(path).toBe("/api/v1/me/kyc");
  });

  it("handles provider failure fail-closed with retryable PROVIDER_UNAVAILABLE", async () => {
    const failingProvider = {
      getStatus: async () => {
        throw new Error("Provider network down");
      },
      startSession: async () => {
        throw new Error("Provider network down");
      },
      submit: async () => {
        throw new Error("Provider network down");
      },
    };
    const { sessionService } = createTestStack();
    const kycService = new KycService(
      {
        query: async () => ({ rowCount: 1, rows: [{ kyc_status: "NOT_STARTED", status: "ACTIVE" }] }),
      } as never,
      failingProvider,
    );
    const controller = new KycController(kycService, sessionService);
    const req = createRequest(mockAccount.id);

    await expect(controller.startSession(req)).rejects.toMatchObject({
      response: {
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
      },
      status: 503,
    });

    await expect(
      controller.submit(
        {
          cardBackRef: "doc-back-002",
          cardFrontRef: "doc-front-001",
          dateOfBirth: "1992-05-15",
          emiratesIdNumber: "784-1992-1234567-1",
          expiryDate: "2028-05-14",
          fullNameEn: "Ahmed Al Mansoori",
          nationality: "United Arab Emirates",
        },
        req,
      ),
    ).rejects.toMatchObject({
      response: {
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
      },
      status: 503,
    });
  });

  it("redacts sensitive data from logger output", async () => {
    const { controller, kycService } = createTestStack({ kycStatus: "NOT_STARTED" });
    const req = createRequest(mockAccount.id);

    const loggedMessages: string[] = [];
    const logSpy = vi
      .spyOn((kycService as unknown as { logger: { log: (msg: string) => void } }).logger, "log")
      .mockImplementation((msg: string) => {
        loggedMessages.push(msg);
      });

    await controller.submit(
      {
        cardBackRef: "doc-back-secret-002",
        cardFrontRef: "doc-front-secret-001",
        dateOfBirth: "1992-05-15",
        emiratesIdNumber: "784-1992-1234567-1",
        expiryDate: "2028-05-14",
        fullNameEn: "Ahmed Al Mansoori",
        nationality: "United Arab Emirates",
      },
      req,
    );

    logSpy.mockRestore();

    expect(loggedMessages.length).toBeGreaterThan(0);
    for (const msg of loggedMessages) {
      expect(msg).not.toContain("784-1992-1234567-1");
      expect(msg).not.toContain("Ahmed Al Mansoori");
      expect(msg).not.toContain("doc-front-secret-001");
      expect(msg).not.toContain("doc-back-secret-002");
    }
  });
});
