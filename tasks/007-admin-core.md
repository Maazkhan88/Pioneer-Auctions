# Task 007 — Admin auction operations

Recommended owner: Antigravity

Status: In progress on `agent/task-007-admin-core` (started 2026-08-12). First static admin operations UI slice and protected dashboard/final-bid approval read endpoints are implemented without requiring local PostgreSQL execution.

## Goal

Give authorized operations staff safe, auditable control over lots, auctions, deposits overview, and approval queues without bypassing domain invariants.

## Prerequisites

- Tasks 001–003 complete.
- Task 004 lifecycle/admin command boundaries available before live controls ship.

## Scope

- Protected admin shell with role/permission guards and step-up hooks.
- Dashboard queue counts and operational alerts.
- Lot CRUD, localized content, media/doc upload status, auction assignment, reserve/start/increment configuration, featured flag, and validation.
- Auction scheduling, soft-close disclosure/configuration, live monitor, and audited pause/resume/cancel commands.
- Final-bid approval queue with hammer/reserve/eligibility context, visible SLA, immutable approve/reject decision, and structured reason.
- Offer and consignment review queue shells aligned to v1 contract.
- Read-only bid ledger/timeline and audit event explorer.
- Safe bulk import dry-run, row validation, error export, and explicit commit step.

## Current implementation notes

- Admin shell now renders a responsive operations dashboard in English and Arabic/RTL.
- Implemented visible sections for dashboard metrics, lot management, auction operations, final-bid/deposit approval queue, and audit trail.
- High-risk operation copy explicitly references reason, confirmation, correlation/audit requirements.
- All visible strings are in `apps/admin/i18n/messages.ts`.
- Current data is seed-style static UI data until PostgreSQL/API-backed admin read models are available.
- Added protected `GET /api/v1/admin/dashboard` read endpoint for operations metrics.
- Added protected `GET /api/v1/admin/final-bid-approvals` read endpoint for pending final-bid approval context.
- Admin read endpoints use `AdminPermissionGuard` and `admin.auctions.read`.
- Final-bid approval read models expose hammer/current price, bidder KYC/deposit eligibility, SLA, reserve status, and lot metadata; they do not expose reserve price, proxy maxima, or editable hammer fields.

## Acceptance criteria

- UI permission hiding is backed by server authorization tests.
- High-risk actions require reason, confirmation, correlation ID, and audit record; configured actions require step-up authentication.
- Final approval cannot alter hammer price; rejection requires an approved reason code.
- All forms support English/Arabic content and expose validation accessibly.
- Live monitor recovers sequence gaps and clearly distinguishes stale/disconnected state.
- Bulk import cannot partially and silently create invalid lots.

## Validation

Run role-matrix API tests, Playwright admin journeys, accessibility/RTL checks, audit assertions, and a live pause/resume/close rehearsal against seeded data.

## Out of scope

Advanced analytics, campaign composer, and full seller/support CRM.
