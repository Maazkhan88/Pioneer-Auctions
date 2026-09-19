# Task 009 — Deposits, payments, refunds, and financial ledger

Recommended owner: backend/payments specialist with finance review

## Goal

Implement a transparent, reconciled deposit flow behind gateway adapters, starting with a development provider and the commercially approved UAE gateway.

## Prerequisites

- Tasks 001–002 complete.
- Deposit rules, refund SLA wording, fee/VAT calculation order, and finance ledger model approved.
- Network International/secondary gateway sandbox onboarding underway.

## Scope

- Deposit requirement policy interface (global/category/auction/lot overrides as approved).
- Append-only balanced financial ledger with holds, available funds, application to purchase, refund, fee, and adjustment/compensation entries.
- Hosted checkout payment intent lifecycle; no raw card handling.
- Provider adapter, signed webhook ingestion, inbox/idempotency, reordering and retry safety.
- Eligibility updates only from authoritative cleared/approved payment state.
- Refund request/approval/processing with stated SLA, status timeline, and receipts.
- Daily provider reconciliation report and unresolved exception queue.
- Web/mobile hosted return and admin finance views required for MVP.

## Acceptance criteria

- Duplicate/reordered webhooks and repeated client commands produce one financial outcome.
- Ledger balances and invariants hold across success, failure, partial, refund, chargeback/dispute, and compensating entries.
- A payment return URL cannot mark a deposit paid; only verified provider state can.
- Provider outage/error is recoverable without requiring reinstall or duplicate charge.
- Eligibility and deposit events update clients in real time without exposing payment secrets.
- Refund ETA and reason are visible; finance actions are authorized, step-up protected, and audited.

## Validation

Run ledger property/invariant tests, webhook replay/reordering tests, provider sandbox flows, reconciliation fixtures, and end-to-end eligibility flip on web/mobile.

## Stop conditions

Do not invent gateway signatures, settlement semantics, or refund status mapping. Use official current provider documentation/sandbox evidence.

## Status

**In Progress** (Core ledger architecture, hosted checkout lifecycle, idempotent webhook ingestion, admin approvals, contracts, and mobile dashboard are implemented and verified. In progress pending commercial contract execution and production sandbox credentials from the UAE payment gateway partner).

## Implementation Progress

### Phase 1: Database Migration & Executable Contracts (Complete — commit `d3f6340`)

- **Database Migration (`0004_deposits_and_payment_intents.sql`)**:
  - Added `lots.required_deposit_fils` (nullable positive integer with default 0).
  - Created `payment_intents` table (`id`, `account_id`, `amount_fils`, `currency`, `provider`, `status`, `client_secret`, `return_url`, `created_at`, `updated_at`).
  - Created `payment_webhook_inbox` table (`id`, `provider`, `event_id`, `event_type`, `payload`, `processed_at`, `status`, `error_message`, unique constraint on `(provider, event_id)`).
  - Created `deposit_refund_requests` table (`id`, `account_id`, `amount_fils`, `currency`, `status`, `reason`, `rejection_reason`, `admin_note`, `decided_by`, `decided_at`, `requested_at`, `updated_at`).
- **Contracts (`@pioneer/contracts`)**:
  - Defined Zod schemas: `DepositBalanceSchema`, `DepositLedgerEntrySchema`, `DepositRefundRequestSchema`, `GetDepositsResponseSchema`, `CreateDepositPaymentIntentRequestSchema`, `PaymentIntentResponseSchema`, `CreateDepositRefundRequestSchema`, `DepositRefundResponseSchema`, `AdminDepositActionsResponseSchema`.
  - Updated REST operations and OpenAPI generator.
  - Regenerated Dart models (`pioneer_contracts.dart`) and OpenAPI 3.1 JSON (`openapi/v1.json`) with 0 drift.
  - Verified 15/15 tests passing in `packages/contracts/test/contracts.spec.ts`.

### Phase 2: Backend Deposits Service, Webhooks & Admin Operations (Complete — commit `82118b2`)

- **`DepositsService` (`apps/api/src/payments/deposits.service.ts`)**:
  - Dynamic balance derivation: `COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_fils ELSE -amount_fils END), 0)`.
  - Strict integer-fils arithmetic (DEC-025, DEC-027) with database check constraints.
  - Hosted checkout intent creation with external provider delegation.
  - Idempotent signed webhook ingestion: verifies HMAC-SHA256 signature, logs event in `payment_webhook_inbox (provider, event_id)` within a database transaction, updates payment intent, and appends a `CREDIT` ledger entry.
  - Refund validation: verifies requested amount <= unheld balance, transitions status `REQUESTED` -> `COMPLETED` / `REJECTED`, creates audited administrative entries.
- **`DummyPaymentProvider` (`apps/api/src/payments/dummy-payment.provider.ts`)**:
  - Implements `PaymentProvider` interface with HMAC-SHA256 verification and Zod payload parsing.
  - Throws fatal error if instantiated in production environment without real gateway credentials.
- **NestJS Controllers**:
  - `DepositsController` (`GET /api/v1/me/deposits`)
  - `PaymentsController` (`POST /api/v1/deposit-payment-intents`, `GET /api/v1/deposit-payment-intents/:id`)
  - `RefundsController` (`POST /api/v1/deposit-refund-requests`)
  - `PaymentWebhooksController` (`POST /api/v1/webhooks/payments/:provider`)
  - `AdminDepositsController` (`GET /api/v1/admin/deposit-actions`, `POST /api/v1/admin/deposit-actions/:id/approve-refund`, `POST /api/v1/admin/deposit-actions/:id/reject-refund`)
- **Backend Test Suite (`apps/api/test/deposits-and-payments.spec.ts`)**:
  - 16 unit and integration tests covering balance calculations, payment intent creation, webhook HMAC verification, duplicate webhook rejection/idempotency, refund balance enforcement, admin approval/rejection.
  - Full API suite: 19 test files, 119 tests passing.

### Phase 3: Mobile Deposit Dashboard & Bid Gating (Complete — commit `e30ad70`)

- **`DepositDashboardScreen` (`apps/mobile/lib/features/deposits/deposit_dashboard_screen.dart`)**:
  - Material 3 Expressive visual architecture.
  - Available, held, and total deposit balance card.
  - Quick Top-Up modal bottom sheet with preset quick chips (AED 1,000, 2,500, 5,000, 10,000), custom amount input, and off-platform hosted checkout redirect.
  - Refund Request modal bottom sheet with available balance validation, reason input, and 3–5 business day SLA disclosure.
  - Ledger transaction history with credit/debit indicators, reason codes, and BiDi-safe AED formatting.
- **Routing & Navigation**:
  - Registered route `/account/deposits` in `apps/mobile/lib/app/router.dart`.
  - Linked Account Dashboard "Security Deposits" menu item directly to `/account/deposits`.
  - Authoritative bid gated CTA in `BidConfirmationSheet`: redirects to `/account/deposits` when bidding response indicates `depositRequired` or `depositInsufficient`.
- **Localization**:
  - Added localized strings in `PioneerLocalizations` (`availableDeposit`, `totalDeposited`, `heldDeposit`, `topUpDeposit`, `requestRefund`, `depositHistory`, `depositSlaNotice`, etc.).
- **Mobile Validation**:
  - 3 new tests in `apps/mobile/test/deposits/deposit_dashboard_test.dart`.
  - Full mobile test suite: 71 tests passing, `flutter analyze` 0 issues.

### Phase 4: Architectural Invariants & Non-Negotiables

- **DEC-025 Compliance**: Pure integer fils throughout state, API, and UI; basis-point round-half-up arithmetic.
- **DEC-027 Compliance**: Append-only ledger, hosted payment URLs, webhook clearance only (returnUrl never credits), idempotent inbox deduplication.
- **Security & Privacy**: No raw card numbers or CVVs stored or processed; all signatures validated via HMAC-SHA256.

### Remaining External Dependency

- **Production UAE Payment Gateway**: Awaiting finalized merchant agreement and production sandbox credentials from UAE acquirer/gateway (Network International / checkout gateway) to complete live banking clearance verification.
