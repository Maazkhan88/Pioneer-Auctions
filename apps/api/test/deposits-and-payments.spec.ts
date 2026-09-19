import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AdminDepositsController } from "../src/payments/admin-deposits.controller.js";
import { DepositsController } from "../src/payments/deposits.controller.js";
import { DepositsService } from "../src/payments/deposits.service.js";
import { DummyPaymentProvider } from "../src/payments/dummy-payment.provider.js";
import { PaymentWebhooksController } from "../src/payments/payment-webhooks.controller.js";
import { PaymentsController } from "../src/payments/payments.controller.js";
import { RefundsController } from "../src/payments/refunds.controller.js";

describe("Task 009 — Deposits, Payments, Refunds, and Financial Ledger", () => {
  const accountId = "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f";
  const adminAccountId = "a1111111-1111-1111-1111-111111111111";

  const createMockDb = () => {
    const ledger: Array<{
      id: string;
      account_id: string;
      amount_fils: number;
      direction: "CREDIT" | "DEBIT";
      reason_code: string;
      lot_id: string | null;
      created_at: Date;
    }> = [];

    const intents: Array<{
      id: string;
      account_id: string;
      amount_fils: number;
      provider: string;
      provider_intent_id: string;
      status: "REQUIRES_ACTION" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
      redirect_url: string;
      return_url: string | null;
    }> = [];

    const webhookInbox = new Set<string>();

    const refunds: Array<{
      id: string;
      account_id: string;
      amount_fils: number;
      status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED";
      reason: string | null;
      rejection_reason: string | null;
      created_at: Date;
      processed_at: Date | null;
      processed_by: string | null;
    }> = [];

    const auditEvents: unknown[] = [];
    const outboxEvents: unknown[] = [];

    const mockPool = {
      connect: async () => ({
        query: async (sql: string, params: unknown[] = []) => {
          if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
            return { rowCount: 0, rows: [] };
          }
          return mockPool.query(sql, params);
        },
        release: () => {},
      }),
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes("FROM deposit_ledger") && sql.includes("WHERE account_id = $1")) {
          const userRows = ledger.filter((row) => row.account_id === params[0]);
          return { rowCount: userRows.length, rows: userRows };
        }

        if (sql.includes("INSERT INTO payment_intents")) {
          const newIntent = {
            account_id: params[0] as string,
            amount_fils: Number(params[1]),
            id: `intent_${intents.length + 1}`,
            provider: params[2] as string,
            provider_intent_id: params[3] as string,
            redirect_url: params[5] as string,
            return_url: (params[6] as string) ?? null,
            status: params[4] as "REQUIRES_ACTION",
          };
          intents.push(newIntent);
          return {
            rowCount: 1,
            rows: [
              {
                amount_fils: newIntent.amount_fils,
                id: newIntent.id,
                provider: newIntent.provider,
                redirect_url: newIntent.redirect_url,
                status: newIntent.status,
              },
            ],
          };
        }

        if (sql.includes("FROM payment_intents") && sql.includes("WHERE (id::text = $1")) {
          const intent = intents.find(
            (i) =>
              (i.id === params[0] || i.provider_intent_id === params[0]) &&
              i.account_id === params[1],
          );
          if (!intent) return { rowCount: 0, rows: [] };
          return {
            rowCount: 1,
            rows: [
              {
                amount_fils: intent.amount_fils,
                id: intent.id,
                provider: intent.provider,
                redirect_url: intent.redirect_url,
                status: intent.status,
              },
            ],
          };
        }

        if (sql.includes("INSERT INTO payment_webhook_inbox")) {
          const key = `${params[0]}_${params[1]}`;
          if (webhookInbox.has(key)) {
            return { rowCount: 0, rows: [] };
          }
          webhookInbox.add(key);
          return { rowCount: 1, rows: [{ id: "inbox_1" }] };
        }

        if (sql.includes("UPDATE payment_intents")) {
          const intent = intents.find(
            (i) => i.id === params[1] || i.provider_intent_id === params[1],
          );
          if (intent) {
            intent.status = params[0] as "SUCCEEDED";
          }
          return { rowCount: 1, rows: [] };
        }

        if (sql.includes("INSERT INTO deposit_ledger")) {
          const isCredit = sql.includes("'CREDIT'");
          const reasonCode = isCredit ? "DEPOSIT_CLEARED" : "DEPOSIT_REFUND";
          const entry = {
            account_id: params[0] as string,
            amount_fils: Number(params[1]),
            created_at: new Date(),
            direction: (isCredit ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
            id: `dl_${ledger.length + 1}`,
            lot_id: null,
            reason_code: reasonCode,
          };
          ledger.push(entry);
          return { rowCount: 1, rows: [{ id: entry.id }] };
        }

        if (sql.includes("INSERT INTO audit_events")) {
          auditEvents.push(params);
          return { rowCount: 1, rows: [] };
        }

        if (sql.includes("INSERT INTO outbox_events")) {
          outboxEvents.push(params);
          return { rowCount: 1, rows: [] };
        }

        if (sql.includes("FROM deposit_refund_requests") && sql.includes("WHERE account_id = $1")) {
          const userRefunds = refunds.filter((r) => r.account_id === params[0]);
          return { rowCount: userRefunds.length, rows: userRefunds };
        }

        if (sql.includes("INSERT INTO deposit_refund_requests")) {
          const refund = {
            account_id: params[0] as string,
            amount_fils: Number(params[1]),
            created_at: new Date(),
            id: `ref_${refunds.length + 1}`,
            processed_at: null,
            processed_by: null,
            reason: (params[2] as string) ?? null,
            rejection_reason: null,
            status: "REQUESTED" as const,
          };
          refunds.push(refund);
          return {
            rowCount: 1,
            rows: [
              {
                amount_fils: refund.amount_fils,
                created_at: refund.created_at,
                id: refund.id,
                reason: refund.reason,
                status: refund.status,
              },
            ],
          };
        }

        if (sql.includes("FROM deposit_refund_requests") && sql.includes("FOR UPDATE")) {
          const refund = refunds.find((r) => r.id === params[0]);
          if (!refund) return { rowCount: 0, rows: [] };
          return { rowCount: 1, rows: [refund] };
        }

        if (sql.includes("UPDATE deposit_refund_requests") && sql.includes("SET status = 'COMPLETED'")) {
          const refund = refunds.find((r) => r.id === params[0]);
          if (refund) {
            refund.status = "COMPLETED";
            refund.processed_at = new Date();
            refund.processed_by = params[1] as string;
          }
          return { rowCount: 1, rows: [refund] };
        }

        if (sql.includes("UPDATE deposit_refund_requests") && sql.includes("SET status = 'REJECTED'")) {
          const refund = refunds.find((r) => r.id === params[0]);
          if (refund) {
            refund.status = "REJECTED";
            refund.rejection_reason = params[1] as string;
            refund.processed_at = new Date();
            refund.processed_by = params[2] as string;
          }
          return { rowCount: 1, rows: [refund] };
        }

        if (sql.includes("FROM accounts a") && sql.includes("LEFT JOIN deposit_ledger")) {
          return {
            rowCount: 1,
            rows: [
              {
                account_id: accountId,
                display_name: "Test User",
                email: "test@pioneer.ae",
                phone_e164: "+971501234567",
                total_debited: "0",
                total_deposited: "1000000",
                total_held: "0",
              },
            ],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return {
      auditEvents,
      intents,
      ledger,
      mockPool,
      outboxEvents,
      refunds,
      webhookInbox,
    };
  };

  const setupServices = () => {
    const db = createMockDb();
    const provider = new DummyPaymentProvider();
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const depositsService = new DepositsService(
      db.mockPool as never,
      provider,
      audit as never,
    );

    const sessionService = {
      requireTestHeaderAccount: vi.fn().mockResolvedValue({
        displayName: "Ahmed Al Mansoori",
        id: accountId,
        permissions: ["admin.auctions.read", "finance"],
        roles: ["buyer", "finance"],
        status: "ACTIVE",
      }),
    };

    return {
      audit,
      db,
      depositsService,
      provider,
      sessionService,
    };
  };

  it("calculates initial deposit balance as zero when ledger is empty", async () => {
    const { depositsService } = setupServices();
    const result = await depositsService.getDeposits(accountId);

    expect(result.contractVersion).toBe(1);
    expect(result.balance.availableFils).toBe(0);
    expect(result.balance.heldFils).toBe(0);
    expect(result.balance.totalDepositedFils).toBe(0);
    expect(result.entries).toEqual([]);
    expect(result.refundRequests).toEqual([]);
  });

  it("creates a payment intent and returns contract-shaped response", async () => {
    const { depositsService, db } = setupServices();
    const result = await depositsService.createPaymentIntent(
      accountId,
      500000,
      "https://pioneer.ae/return",
    );

    expect(result.contractVersion).toBe(1);
    expect(result.amount.amountFils).toBe(500000);
    expect(result.amount.currency).toBe("AED");
    expect(result.provider).toBe("dummy");
    expect(result.status).toBe("REQUIRES_ACTION");
    expect(db.intents).toHaveLength(1);
  });

  it("retrieves an existing payment intent by ID", async () => {
    const { depositsService } = setupServices();
    const created = await depositsService.createPaymentIntent(accountId, 1000000);
    const retrieved = await depositsService.getPaymentIntent(created.id, accountId);

    expect(retrieved.id).toBe(created.id);
    expect(retrieved.amount.amountFils).toBe(1000000);
  });

  it("throws NotFoundException when intent does not exist", async () => {
    const { depositsService } = setupServices();
    await expect(
      depositsService.getPaymentIntent("non-existent-id", accountId),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects webhooks with invalid signatures", async () => {
    const { depositsService } = setupServices();
    await expect(
      depositsService.processWebhook(
        "dummy",
        JSON.stringify({ test: 1 }),
        "bad-signature",
        { test: 1 },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("ingests payment.succeeded webhook, credits ledger, and unlocks deposit balance", async () => {
    const { depositsService, db } = setupServices();
    const intent = await depositsService.createPaymentIntent(accountId, 500000);

    const webhookPayload = {
      accountId,
      amountFils: 500000,
      currency: "AED",
      eventId: "evt_12345",
      eventType: "payment.succeeded",
      intentId: intent.id,
      timestamp: new Date().toISOString(),
    };

    const webhookResult = await depositsService.processWebhook(
      "dummy",
      JSON.stringify(webhookPayload),
      "test-valid-signature",
      webhookPayload,
    );

    expect(webhookResult.status).toBe("processed");
    expect(webhookResult.eventId).toBe("evt_12345");
    expect(db.ledger).toHaveLength(1);
    expect(db.ledger[0]?.direction).toBe("CREDIT");
    expect(db.ledger[0]?.reason_code).toBe("DEPOSIT_CLEARED");
    expect(db.ledger[0]?.amount_fils).toBe(500000);

    const updatedDeposits = await depositsService.getDeposits(accountId);
    expect(updatedDeposits.balance.availableFils).toBe(500000);
    expect(updatedDeposits.balance.totalDepositedFils).toBe(500000);
  });

  it("idempotently ignores replayed webhooks with the same event ID", async () => {
    const { depositsService, db } = setupServices();
    const intent = await depositsService.createPaymentIntent(accountId, 500000);

    const webhookPayload = {
      accountId,
      amountFils: 500000,
      currency: "AED",
      eventId: "evt_duplicate_test",
      eventType: "payment.succeeded",
      intentId: intent.id,
      timestamp: new Date().toISOString(),
    };

    const first = await depositsService.processWebhook(
      "dummy",
      JSON.stringify(webhookPayload),
      "test-valid-signature",
      webhookPayload,
    );
    expect(first.status).toBe("processed");
    expect(db.ledger).toHaveLength(1);

    const second = await depositsService.processWebhook(
      "dummy",
      JSON.stringify(webhookPayload),
      "test-valid-signature",
      webhookPayload,
    );
    expect(second.status).toBe("already_processed");
    expect(db.ledger).toHaveLength(1);
  });

  it("prevents refund requests that exceed available refundable balance", async () => {
    const { depositsService } = setupServices();
    await expect(
      depositsService.requestRefund(accountId, 100000),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates a refund request when balance is sufficient", async () => {
    const { depositsService, db } = setupServices();
    db.ledger.push({
      account_id: accountId,
      amount_fils: 1000000,
      created_at: new Date(),
      direction: "CREDIT",
      id: "dl_init",
      lot_id: null,
      reason_code: "DEPOSIT_CLEARED",
    });

    const refund = await depositsService.requestRefund(
      accountId,
      500000,
      "Returning unused deposit",
    );

    expect(refund.contractVersion).toBe(1);
    expect(refund.refundRequest.status).toBe("REQUESTED");
    expect(refund.refundRequest.amountFils).toBe(500000);
    expect(refund.refundRequest.estimatedSettlementDays).toBe(5);
  });

  it("approves a refund request, marks it COMPLETED, and appends DEBIT ledger entry", async () => {
    const { depositsService, db } = setupServices();
    db.ledger.push({
      account_id: accountId,
      amount_fils: 1000000,
      created_at: new Date(),
      direction: "CREDIT",
      id: "dl_init",
      lot_id: null,
      reason_code: "DEPOSIT_CLEARED",
    });

    const requested = await depositsService.requestRefund(accountId, 400000);
    const approved = await depositsService.approveRefund(
      requested.refundRequest.id,
      adminAccountId,
      "Approved by finance officer",
    );

    expect(approved.refundRequest.status).toBe("COMPLETED");
    expect(db.ledger).toHaveLength(2);
    expect(db.ledger[1]?.direction).toBe("DEBIT");
    expect(db.ledger[1]?.reason_code).toBe("DEPOSIT_REFUND");
    expect(db.ledger[1]?.amount_fils).toBe(400000);

    const afterRefund = await depositsService.getDeposits(accountId);
    expect(afterRefund.balance.availableFils).toBe(600000);
  });

  it("rejects a refund request with an audit trail and stated reason", async () => {
    const { depositsService, db } = setupServices();
    db.ledger.push({
      account_id: accountId,
      amount_fils: 1000000,
      created_at: new Date(),
      direction: "CREDIT",
      id: "dl_init",
      lot_id: null,
      reason_code: "DEPOSIT_CLEARED",
    });

    const requested = await depositsService.requestRefund(accountId, 300000);
    const rejected = await depositsService.rejectRefund(
      requested.refundRequest.id,
      adminAccountId,
      "Active leading bid locks deposit funds",
    );

    expect(rejected.refundRequest.status).toBe("REJECTED");
    expect(rejected.refundRequest.rejectionReason).toBe(
      "Active leading bid locks deposit funds",
    );
  });

  describe("HTTP Controllers Integration", () => {
    it("PaymentsController creates intent and returns flat + money shaped output", async () => {
      const { depositsService, sessionService } = setupServices();
      const controller = new PaymentsController(
        depositsService,
        sessionService as never,
      );

      const res = await controller.createDepositPaymentIntent(
        { amount: { amountFils: 200000, currency: "AED" } },
        {} as never,
      );

      expect(res.status).toBe("REQUIRES_ACTION");
      expect(res.amountFils).toBe(200000);
      expect(res.amount.amountFils).toBe(200000);
    });

    it("DepositsController returns user deposits", async () => {
      const { depositsService, sessionService } = setupServices();
      const controller = new DepositsController(
        depositsService,
        sessionService as never,
      );

      const res = await controller.getMyDeposits({} as never);
      expect(res.balance.availableFils).toBe(0);
    });

    it("RefundsController accepts refund request", async () => {
      const { depositsService, sessionService, db } = setupServices();
      db.ledger.push({
        account_id: accountId,
        amount_fils: 500000,
        created_at: new Date(),
        direction: "CREDIT",
        id: "dl_1",
        lot_id: null,
        reason_code: "DEPOSIT_CLEARED",
      });

      const controller = new RefundsController(
        depositsService,
        sessionService as never,
      );

      const res = await controller.requestDepositRefund(
        { amountFils: 200000 },
        {} as never,
      );

      expect(res.refundRequest.status).toBe("REQUESTED");
      expect(res.refundRequest.amountFils).toBe(200000);
    });

    it("PaymentWebhooksController handles valid webhook", async () => {
      const { depositsService } = setupServices();
      const controller = new PaymentWebhooksController(depositsService);

      const payload = {
        accountId,
        amountFils: 100000,
        currency: "AED",
        eventId: "evt_webhook_ctrl",
        eventType: "payment.succeeded",
        intentId: "dummy_intent_1",
        timestamp: new Date().toISOString(),
      };

      const res = await controller.handlePaymentWebhook(
        "dummy",
        payload,
        { body: JSON.stringify(payload) } as never,
        "test-valid-signature",
      );

      expect(res.status).toBe("processed");
      expect(res.eventId).toBe("evt_webhook_ctrl");
    });

    it("AdminDepositsController approves and rejects refunds", async () => {
      const { depositsService, sessionService, db } = setupServices();
      db.ledger.push({
        account_id: accountId,
        amount_fils: 1000000,
        created_at: new Date(),
        direction: "CREDIT",
        id: "dl_1",
        lot_id: null,
        reason_code: "DEPOSIT_CLEARED",
      });

      const req = await depositsService.requestRefund(accountId, 100000);
      const controller = new AdminDepositsController(
        depositsService,
        sessionService as never,
      );

      const approved = await controller.approveRefund(
        req.refundRequest.id,
        { note: "Approved" },
        {} as never,
      );
      expect(approved.refundRequest.status).toBe("COMPLETED");

      const req2 = await depositsService.requestRefund(accountId, 100000);
      const rejected = await controller.rejectRefund(
        req2.refundRequest.id,
        { rejectionReason: "Documentation missing" },
        {} as never,
      );
      expect(rejected.refundRequest.status).toBe("REJECTED");
    });
  });
});
