# Task 007 — Admin auction operations

Recommended owner: Antigravity

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
