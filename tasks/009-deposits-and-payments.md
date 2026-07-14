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
