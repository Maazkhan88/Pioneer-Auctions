import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdminDepositAccountBalance,
  AdminDepositActionsResponse,
  DepositLedgerEntry,
  DepositRefundRequest,
  DepositRefundResponse,
  GetDepositsResponse,
  PaymentIntentResponse,
} from "@pioneer/contracts";

import { AuditService } from "../audit/audit.service.js";
import { DatabasePool } from "../database/database.pool.js";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./payment-provider.js";

@Injectable()
export class DepositsService {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  async getDeposits(accountId: string): Promise<GetDepositsResponse> {
    const entriesResult = await this.database.query<{
      id: string;
      amount_fils: string | number;
      direction: "CREDIT" | "DEBIT";
      reason_code: string;
      lot_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, amount_fils, direction, reason_code, lot_id, created_at
       FROM deposit_ledger
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [accountId],
    );

    let credited = 0n;
    let debited = 0n;
    let held = 0n;

    const entries: DepositLedgerEntry[] = entriesResult.rows.map((row) => {
      const amountFils = BigInt(row.amount_fils);
      if (row.direction === "CREDIT") {
        credited += amountFils;
      } else {
        debited += amountFils;
      }
      if (row.reason_code === "DEPOSIT_HOLD") {
        held += amountFils;
      } else if (row.reason_code === "DEPOSIT_RELEASE") {
        held -= amountFils;
      }

      return {
        amountFils: Number(amountFils),
        createdAt: row.created_at.toISOString(),
        currency: "AED",
        direction: row.direction,
        id: row.id,
        lotId: row.lot_id,
        reasonCode: row.reason_code,
      };
    });

    if (held < 0n) {
      held = 0n;
    }

    const available = credited - debited - held;
    const availableFils = available > 0n ? Number(available) : 0;

    const refundsResult = await this.database.query<{
      id: string;
      amount_fils: string | number;
      status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED";
      reason: string | null;
      rejection_reason: string | null;
      created_at: Date;
    }>(
      `SELECT id, amount_fils, status, reason, rejection_reason, created_at
       FROM deposit_refund_requests
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [accountId],
    );

    const refundRequests: DepositRefundRequest[] = refundsResult.rows.map(
      (row) => ({
        amountFils: Number(row.amount_fils),
        currency: "AED",
        estimatedSettlementDays: 5,
        id: row.id,
        reason: row.reason,
        rejectionReason: row.rejection_reason,
        requestedAt: row.created_at.toISOString(),
        status: row.status,
      }),
    );

    return {
      balance: {
        availableFils,
        currency: "AED",
        heldFils: Number(held),
        totalDepositedFils: Number(credited),
      },
      contractVersion: 1,
      entries,
      refundRequests,
    };
  }

  async createPaymentIntent(
    accountId: string,
    amountFils: number,
    returnUrl?: string,
    correlationId = "missing-correlation-id",
  ): Promise<PaymentIntentResponse> {
    const providerIntent = await this.paymentProvider.createIntent({
      accountId,
      amountFils,
      correlationId,
      purpose: "DEPOSIT",
      returnUrl,
    });

    const result = await this.database.query<{
      id: string;
      status:
        | "REQUIRES_ACTION"
        | "PROCESSING"
        | "SUCCEEDED"
        | "FAILED"
        | "CANCELLED";
      provider: string;
      amount_fils: string | number;
      redirect_url: string;
    }>(
      `INSERT INTO payment_intents (
         account_id, amount_fils, currency, purpose, provider,
         provider_intent_id, status, redirect_url, return_url, correlation_id
       ) VALUES ($1, $2, 'AED', 'DEPOSIT', $3, $4, $5, $6, $7, $8)
       RETURNING id, status, provider, amount_fils, redirect_url`,
      [
        accountId,
        amountFils,
        providerIntent.provider,
        providerIntent.id,
        providerIntent.status,
        providerIntent.redirectUrl,
        returnUrl ?? null,
        correlationId,
      ],
    );

    const row = result.rows[0]!;

    await this.audit.record({
      action: "payments.deposit_intent.create",
      actorAccountId: accountId,
      correlationId,
      metadata: {
        amountFils,
        intentId: row.id,
        provider: row.provider,
        status: row.status,
      },
      subjectId: row.id,
      subjectType: "payment_intent",
    });

    return {
      amount: {
        amountFils: Number(row.amount_fils),
        currency: "AED",
      },
      contractVersion: 1,
      id: row.id,
      provider: row.provider,
      redirectUrl: row.redirect_url,
      status: row.status,
    };
  }

  async getPaymentIntent(
    intentId: string,
    accountId: string,
  ): Promise<PaymentIntentResponse> {
    const result = await this.database.query<{
      id: string;
      status:
        | "REQUIRES_ACTION"
        | "PROCESSING"
        | "SUCCEEDED"
        | "FAILED"
        | "CANCELLED";
      provider: string;
      amount_fils: string | number;
      redirect_url: string;
    }>(
      `SELECT id, status, provider, amount_fils, redirect_url
       FROM payment_intents
       WHERE (id::text = $1 OR provider_intent_id = $1)
         AND account_id = $2`,
      [intentId, accountId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        contractVersion: 1,
        error: {
          code: "PAYMENT_INTENT_NOT_FOUND",
          correlationId: "intent-lookup",
          message: `Payment intent ${intentId} was not found`,
          retryable: false,
        },
      });
    }

    return {
      amount: {
        amountFils: Number(row.amount_fils),
        currency: "AED",
      },
      contractVersion: 1,
      id: row.id,
      provider: row.provider,
      redirectUrl: row.redirect_url,
      status: row.status,
    };
  }

  async processWebhook(
    provider: string,
    rawPayload: string | Buffer,
    signature: string | undefined,
    body: unknown,
    correlationId = "webhook-process",
  ): Promise<{ status: string; eventId: string }> {
    const isValid = this.paymentProvider.verifyWebhookSignature(
      rawPayload,
      signature,
    );
    if (!isValid) {
      throw new BadRequestException({
        contractVersion: 1,
        error: {
          code: "INVALID_WEBHOOK_SIGNATURE",
          correlationId,
          message: "The webhook signature is missing or invalid",
          retryable: false,
        },
      });
    }

    const event = this.paymentProvider.parseWebhookPayload(body);

    const inboxResult = await this.database.query<{ id: string }>(
      `INSERT INTO payment_webhook_inbox (provider, event_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id`,
      [provider, event.eventId, event.eventType, JSON.stringify(body)],
    );

    if (inboxResult.rowCount === 0) {
      return { eventId: event.eventId, status: "already_processed" };
    }

    const client = await this.database.connect();
    try {
      await client.query("BEGIN");

      const newStatus =
        event.eventType === "payment.succeeded" ? "SUCCEEDED" : "FAILED";

      await client.query(
        `UPDATE payment_intents
         SET status = $1, updated_at = now()
         WHERE (id::text = $2 OR provider_intent_id = $2)
           AND account_id = $3`,
        [newStatus, event.intentId, event.accountId],
      );

      if (event.eventType === "payment.succeeded") {
        const ledgerResult = await client.query<{ id: string }>(
          `INSERT INTO deposit_ledger (
             account_id, amount_fils, direction, reason_code, correlation_id
           ) VALUES ($1, $2, 'CREDIT', 'DEPOSIT_CLEARED', $3)
           RETURNING id`,
          [event.accountId, event.amountFils, correlationId],
        );

        const ledgerId = ledgerResult.rows[0]!.id;

        await client.query(
          `INSERT INTO audit_events (
             actor_account_id, action, subject_type, subject_id,
             reason_code, metadata, correlation_id
           ) VALUES ($1, 'payments.deposit_cleared', 'deposit_ledger', $2, 'DEPOSIT_CLEARED', $3, $4)`,
          [
            event.accountId,
            ledgerId,
            JSON.stringify({
              amountFils: event.amountFils,
              currency: event.currency,
              eventId: event.eventId,
              intentId: event.intentId,
              provider,
            }),
            correlationId,
          ],
        );

        await client.query(
          `INSERT INTO outbox_events (
             aggregate_type, aggregate_id, event_name, payload, correlation_id
           ) VALUES ('account', $1, 'payment:cleared', $2, $3)`,
          [
            event.accountId,
            JSON.stringify({
              amountFils: event.amountFils,
              currency: event.currency,
              intentId: event.intentId,
              ledgerId,
              provider,
            }),
            correlationId,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { eventId: event.eventId, status: "processed" };
  }

  async requestRefund(
    accountId: string,
    amountFils: number,
    reason?: string,
    correlationId = "refund-request",
  ): Promise<DepositRefundResponse> {
    const balanceInfo = await this.getDeposits(accountId);
    const availableFils = balanceInfo.balance.availableFils;

    const pendingResult = await this.database.query<{
      total_pending: string | null;
    }>(
      `SELECT COALESCE(SUM(amount_fils), 0) AS total_pending
       FROM deposit_refund_requests
       WHERE account_id = $1
         AND status IN ('REQUESTED', 'PROCESSING')`,
      [accountId],
    );

    const pendingFils = Number(pendingResult.rows[0]?.total_pending ?? 0);
    const maxRefundable = availableFils - pendingFils;

    if (amountFils > maxRefundable) {
      throw new BadRequestException({
        contractVersion: 1,
        error: {
          code: "REFUND_INSUFFICIENT_BALANCE",
          correlationId,
          message: `Requested refund of ${amountFils} fils exceeds available refundable balance of ${maxRefundable} fils`,
          retryable: false,
        },
      });
    }

    const result = await this.database.query<{
      id: string;
      amount_fils: string | number;
      status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED";
      reason: string | null;
      created_at: Date;
    }>(
      `INSERT INTO deposit_refund_requests (
         account_id, amount_fils, status, reason, correlation_id
       ) VALUES ($1, $2, 'REQUESTED', $3, $4)
       RETURNING id, amount_fils, status, reason, created_at`,
      [accountId, amountFils, reason ?? null, correlationId],
    );

    const row = result.rows[0]!;

    await this.audit.record({
      action: "payments.deposit_refund_requested",
      actorAccountId: accountId,
      correlationId,
      metadata: {
        amountFils,
        reason: reason ?? null,
        refundRequestId: row.id,
      },
      subjectId: row.id,
      subjectType: "deposit_refund_request",
    });

    return {
      contractVersion: 1,
      refundRequest: {
        amountFils: Number(row.amount_fils),
        currency: "AED",
        estimatedSettlementDays: 5,
        id: row.id,
        reason: row.reason,
        requestedAt: row.created_at.toISOString(),
        status: row.status,
      },
    };
  }

  async getAdminDepositActions(): Promise<AdminDepositActionsResponse> {
    const accountsResult = await this.database.query<{
      account_id: string;
      display_name: string;
      email: string | null;
      phone_e164: string | null;
      total_deposited: string | null;
      total_debited: string | null;
      total_held: string | null;
    }>(
      `SELECT
         a.id AS account_id,
         a.display_name,
         a.email,
         a.phone_e164,
         COALESCE(SUM(CASE WHEN dl.direction = 'CREDIT' THEN dl.amount_fils ELSE 0 END), 0) AS total_deposited,
         COALESCE(SUM(CASE WHEN dl.direction = 'DEBIT' THEN dl.amount_fils ELSE 0 END), 0) AS total_debited,
         COALESCE(SUM(CASE WHEN dl.reason_code = 'DEPOSIT_HOLD' THEN dl.amount_fils
                           WHEN dl.reason_code = 'DEPOSIT_RELEASE' THEN -dl.amount_fils
                           ELSE 0 END), 0) AS total_held
       FROM accounts a
       LEFT JOIN deposit_ledger dl ON a.id = dl.account_id
       GROUP BY a.id, a.display_name, a.email, a.phone_e164
       ORDER BY total_deposited DESC
       LIMIT 100`,
    );

    const accounts: AdminDepositAccountBalance[] = accountsResult.rows.map(
      (row) => {
        const deposited = BigInt(row.total_deposited ?? "0");
        const debited = BigInt(row.total_debited ?? "0");
        let held = BigInt(row.total_held ?? "0");
        if (held < 0n) held = 0n;
        const available = deposited - debited - held;

        return {
          accountId: row.account_id,
          availableFils: available > 0n ? Number(available) : 0,
          displayName: row.display_name,
          email: row.email,
          heldFils: Number(held),
          phoneE164: row.phone_e164,
          totalDepositedFils: Number(deposited),
        };
      },
    );

    const refundsResult = await this.database.query<{
      id: string;
      amount_fils: string | number;
      status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED";
      reason: string | null;
      rejection_reason: string | null;
      created_at: Date;
    }>(
      `SELECT id, amount_fils, status, reason, rejection_reason, created_at
       FROM deposit_refund_requests
       WHERE status IN ('REQUESTED', 'PROCESSING')
       ORDER BY created_at ASC`,
    );

    const pendingRefunds: DepositRefundRequest[] = refundsResult.rows.map(
      (row) => ({
        amountFils: Number(row.amount_fils),
        currency: "AED",
        estimatedSettlementDays: 5,
        id: row.id,
        reason: row.reason,
        rejectionReason: row.rejection_reason,
        requestedAt: row.created_at.toISOString(),
        status: row.status,
      }),
    );

    const recentEntriesResult = await this.database.query<{
      id: string;
      amount_fils: string | number;
      direction: "CREDIT" | "DEBIT";
      reason_code: string;
      lot_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, amount_fils, direction, reason_code, lot_id, created_at
       FROM deposit_ledger
       ORDER BY created_at DESC
       LIMIT 50`,
    );

    const recentEntries: DepositLedgerEntry[] = recentEntriesResult.rows.map(
      (row) => ({
        amountFils: Number(row.amount_fils),
        createdAt: row.created_at.toISOString(),
        currency: "AED",
        direction: row.direction,
        id: row.id,
        lotId: row.lot_id,
        reasonCode: row.reason_code,
      }),
    );

    return {
      accounts,
      contractVersion: 1,
      pendingRefunds,
      recentEntries,
    };
  }

  async approveRefund(
    refundId: string,
    adminAccountId: string,
    note?: string,
    correlationId = "admin-refund-approve",
  ): Promise<DepositRefundResponse> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");

      const selectResult = await client.query<{
        id: string;
        account_id: string;
        amount_fils: string | number;
        status: string;
        reason: string | null;
        created_at: Date;
      }>(
        `SELECT id, account_id, amount_fils, status, reason, created_at
         FROM deposit_refund_requests
         WHERE id = $1
         FOR UPDATE`,
        [refundId],
      );

      const request = selectResult.rows[0];
      if (!request) {
        throw new NotFoundException({
          contractVersion: 1,
          error: {
            code: "DEPOSIT_REFUND_NOT_FOUND",
            correlationId,
            message: `Deposit refund request ${refundId} was not found`,
            retryable: false,
          },
        });
      }

      if (request.status !== "REQUESTED" && request.status !== "PROCESSING") {
        throw new BadRequestException({
          contractVersion: 1,
          error: {
            code: "VALIDATION_FAILED",
            correlationId,
            message: `Deposit refund request is already ${request.status}`,
            retryable: false,
          },
        });
      }

      const amountFils = BigInt(request.amount_fils);

      await client.query(
        `UPDATE deposit_refund_requests
         SET status = 'COMPLETED', processed_at = now(), processed_by = $2, updated_at = now()
         WHERE id = $1`,
        [refundId, adminAccountId],
      );

      const ledgerResult = await client.query<{ id: string }>(
        `INSERT INTO deposit_ledger (
           account_id, amount_fils, direction, reason_code, correlation_id
         ) VALUES ($1, $2, 'DEBIT', 'DEPOSIT_REFUND', $3)
         RETURNING id`,
        [request.account_id, amountFils, correlationId],
      );

      const ledgerId = ledgerResult.rows[0]!.id;

      await client.query(
        `INSERT INTO audit_events (
           actor_account_id, action, subject_type, subject_id,
           reason_code, metadata, correlation_id
         ) VALUES ($1, 'payments.deposit_refund_approved', 'deposit_refund_request', $2, 'DEPOSIT_REFUND', $3, $4)`,
        [
          adminAccountId,
          refundId,
          JSON.stringify({
            amountFils: Number(amountFils),
            ledgerId,
            note: note ?? null,
            targetAccountId: request.account_id,
          }),
          correlationId,
        ],
      );

      await client.query(
        `INSERT INTO outbox_events (
           aggregate_type, aggregate_id, event_name, payload, correlation_id
         ) VALUES ('account', $1, 'deposit:refund-completed', $2, $3)`,
        [
          request.account_id,
          JSON.stringify({
            amountFils: Number(amountFils),
            currency: "AED",
            ledgerId,
            refundRequestId: refundId,
          }),
          correlationId,
        ],
      );

      await client.query("COMMIT");

      return {
        contractVersion: 1,
        refundRequest: {
          amountFils: Number(amountFils),
          currency: "AED",
          estimatedSettlementDays: 0,
          id: refundId,
          reason: request.reason,
          requestedAt: request.created_at.toISOString(),
          status: "COMPLETED",
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectRefund(
    refundId: string,
    adminAccountId: string,
    rejectionReason: string,
    correlationId = "admin-refund-reject",
  ): Promise<DepositRefundResponse> {
    const result = await this.database.query<{
      id: string;
      account_id: string;
      amount_fils: string | number;
      status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED";
      reason: string | null;
      rejection_reason: string | null;
      created_at: Date;
    }>(
      `UPDATE deposit_refund_requests
       SET status = 'REJECTED', rejection_reason = $2, processed_at = now(), processed_by = $3, updated_at = now()
       WHERE id = $1
       RETURNING id, account_id, amount_fils, status, reason, rejection_reason, created_at`,
      [refundId, rejectionReason, adminAccountId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        contractVersion: 1,
        error: {
          code: "DEPOSIT_REFUND_NOT_FOUND",
          correlationId,
          message: `Deposit refund request ${refundId} was not found`,
          retryable: false,
        },
      });
    }

    await this.audit.record({
      action: "payments.deposit_refund_rejected",
      actorAccountId: adminAccountId,
      correlationId,
      metadata: {
        rejectionReason,
        refundRequestId: refundId,
        targetAccountId: row.account_id,
      },
      subjectId: refundId,
      subjectType: "deposit_refund_request",
    });

    return {
      contractVersion: 1,
      refundRequest: {
        amountFils: Number(row.amount_fils),
        currency: "AED",
        estimatedSettlementDays: 0,
        id: row.id,
        reason: row.reason,
        rejectionReason: row.rejection_reason,
        requestedAt: row.created_at.toISOString(),
        status: "REJECTED",
      },
    };
  }
}
