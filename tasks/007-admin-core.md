# Task 007 — Admin auction operations

Recommended owner: Antigravity

Status: In progress on `agent/task-007-admin-core` (started 2026-08-12, write actions wired 2026-08-13). Every previously-disabled admin control now submits real commands: final-bid approve/reject, auction pause/resume/cancel, auction create, and lot create are all live-wired to the real API when `PIONEER_ADMIN_API_BASE_URL` is configured, with the pre-existing static-preview fallback preserved when it is not. Several acceptance criteria remain out of reach because the underlying server capability was never built -- see "Explicitly not implemented" below, not silently skipped.

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
- Admin UI now renders metrics and approval rows through `loadAdminOperationsData`.
- If `PIONEER_ADMIN_API_BASE_URL` is configured at build/runtime, the UI fetches the protected admin read endpoints with `x-pioneer-test-account-id` for local development.
- If API configuration is absent or unavailable, the UI keeps the Cloudflare static preview working with localized fallback data.
- Added protected `POST /api/v1/admin/final-bid-approvals/:lotId/approve` and `POST /api/v1/admin/final-bid-approvals/:lotId/reject` command skeletons.
- Final-bid decisions require `admin.auctions.write`.
- Approval/rejection update only the pending lot lifecycle and return the existing hammer price; they do not edit the bid ledger or hammer amount.
- Rejection requires one of the approved reason codes: `BUYER_ELIGIBILITY_FAILED`, `DOCUMENTATION_INCOMPLETE`, `RESERVE_NOT_MET`, `SELLER_WITHDRAWN`, or `OTHER`.
- Both decision commands write immutable audit records with actor, correlation ID, lot subject, hammer price, and sequence metadata.
- Approval queue rows now render disabled approve/reject controls and a rejection reason selector in the static preview.
- API-loaded approval rows carry approve/reject endpoint metadata for the future authenticated runtime action handler.
- Static preview controls intentionally remain disabled to avoid exposing development test headers or unauthenticated mutation paths.
- Added `POST /api/v1/admin/auctions/:auctionId/pause`, `/resume`, and `/cancel` skeletons, guarded by `admin.auctions.write`.
- Auction pause/resume/cancel commands require a reason, accept an optional note, update only auction lifecycle, and write audit metadata.
- Added `PIONEER_ADMIN_DUMMY_LOTS=1` backend dummy lot support so `GET /api/v1/admin/lots` can serve three demo lots without PostgreSQL in development.
- Admin UI data loading now fetches `/admin/lots` when the protected API is configured and renders a backend lot list in the Lot Management panel.
- Added a disabled static lot create/edit form shell with English/Arabic title fields, lot number, starting bid, reserve, increment mode, custom increment, soft-close extension minutes, and featured flag.
- Added `submitFinalBidDecision` runtime helper for future authenticated approve/reject actions; static Cloudflare controls remain disabled until a safe admin session runtime exists.
- On 2026-08-13, added `apps/admin/lib/admin-session.ts` (mirrors the buyer web app's `bid-session.ts` pattern) so the test-account/API-base-URL config used to be inlined `process.env` reads in `admin-data.ts` is now one shared, typed source resolved once per server render and passed down as a prop -- never imported by value into a client component (only its type is), since a raw `process.env` read has no meaning once bundled into browser JS.
- On 2026-08-13, extended `admin-data.ts` to also fetch `GET /api/v1/admin/auctions` (needed so the auction panel has something to list/control and so the lot form has real auctions to attach a new lot to) and to return the resolved session alongside the read data.
- On 2026-08-13, fixed a real type drift in `admin-actions.ts`: `FinalBidDecisionResponse` declared a `lifecycle` field the real `POST /api/v1/admin/final-bid-approvals/:lotId/approve|reject` response does not have, and was missing the real `auditId` field it does have.
- On 2026-08-13, added `submitAuctionControl` (pause/resume/cancel), `submitCreateAuction`, and `submitCreateLot` to `admin-actions.ts`, matching the real Zod DTOs in `apps/api/src/auctions/auction.dto.ts` and `lot.dto.ts` field-for-field -- including `lot.dto.ts`'s "exactly one of `minimumIncrementFils` or `minimumIncrementPercentBps`" rule, and the fact that `createLotSchema` has no "featured" field at all.
- On 2026-08-13, replaced every disabled static control with a real client component: `apps/admin/components/approval-queue-panel.tsx`, `auction-operations-panel.tsx` (new auction list + lifecycle-gated pause/resume/cancel + schedule-auction form), and `lot-management-panel.tsx` (lot form rebuilt to match `createLotSchema` exactly; the old "Featured lot" checkbox was removed rather than wired to a contract field that does not exist). All three still show the original static-preview disabled notice when no admin session is configured.
- On 2026-08-13, found and fixed a second real, pre-existing Arabic/RTL bug (same class as the one already fixed in `apps/web`): `apps/admin/app/layout.tsx` hardcoded `<html lang="en">` with no `dir` at all, so `/ar` never got a correct `<html>` element. Fixed with `apps/admin/components/html-attributes-sync.tsx`, the same pattern already used in `apps/web`.

## Acceptance criteria

- UI permission hiding is backed by server authorization tests. **Partially met**: server-side authorization is real and tested (`AdminPermissionGuard` + `admin-operations.spec.ts`'s "rejects restricted accounts"), but the admin UI has no way to query its own account's permission set, so it cannot hide write controls a lower-privileged account would 403 on. No endpoint for "my permissions" exists to build this against.
- High-risk actions require reason, confirmation, correlation ID, and audit record; configured actions require step-up authentication. **Partially met**: reason/correlation ID/audit record are real end-to-end for every write action (server-enforced, not just UI copy). Step-up authentication does not exist anywhere in the codebase and was not built this pass.
- Final approval cannot alter hammer price; rejection requires an approved reason code. **Met** -- unchanged since it was already true of the server-side skeletons; the UI now actually calls them.
- All forms support English/Arabic content and expose validation accessibly. **Met** for the three wired forms (labeled fields, required-field/XOR client-side checks before submit, server validation errors surfaced as a generic status message).
- Live monitor recovers sequence gaps and clearly distinguishes stale/disconnected state. **Not implemented.** No admin-facing Socket.IO namespace or gateway exists server-side (only the buyer-facing `/auctions/v1` namespace does); building one is separate, larger scope than wiring already-implemented REST commands.
- Bulk import cannot partially and silently create invalid lots. **Not implemented.** No bulk-import endpoint exists server-side.

## Explicitly not implemented (confirmed absent server-side, not silently skipped)

- Step-up authentication for high-risk actions.
- Live monitor / realtime admin gateway with sequence-gap recovery.
- Safe bulk import (dry-run, row validation, error export, explicit commit).
- Offer and consignment review queue shells (no corresponding endpoints exist).
- Lot edit (only `POST /api/v1/admin/lots` create exists; there is no update/PATCH endpoint, so the lot form is create-only).
- UI-side permission hiding (no "my permissions" endpoint to build it against).

## Validation

Run role-matrix API tests, Playwright admin journeys, accessibility/RTL checks, audit assertions, and a live pause/resume/close rehearsal against seeded data. As of 2026-08-13: `apps/admin`'s own `test`/`typecheck`/`lint`/`build` (both normal and Cloudflare static-export modes) pass, and the write flows were exercised live in a browser against a real `next dev` server with a deliberately unreachable API base URL (confirming gating, client-side guards, and the pending -> error path all work correctly) -- no Playwright suite exists in this repo, no live NestJS+PostgreSQL backend was reachable in this environment, and no accepted/2xx response from any of the four new write commands has been verified end-to-end.

## Out of scope

Advanced analytics, campaign composer, and full seller/support CRM.
