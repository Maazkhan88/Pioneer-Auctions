# Current state

Last updated: 2026-08-11

Repository: `https://github.com/Maazkhan88/Pioneer-Auctions` (`main`)

This is the canonical handoff for the repository. Update it at the end of every task or material work session.

## Product goal

Deliver one trustworthy auction platform across Flutter mobile, Next.js web bidding, Next.js admin, and a NestJS/PostgreSQL/Redis backend. MVP succeeds when a real weekly auction can run end-to-end in English and Arabic with verified users, deposit eligibility, real-time manual/proxy bidding, transparent soft-close, final-bid approval, and auditable outcomes.

## Current phase

Phase 0: foundation and contract definition are implemented on draft branches; cross-platform design-system implementation is active. None of these tasks are on `main` until their stacked draft PRs are reviewed and merged.

## Delivery status

- [PR #1 — Task 001 foundation](https://github.com/Maazkhan88/Pioneer-Auctions/pull/1) is an open draft targeting `main`; both CI jobs pass. Merge this first.
- [PR #2 — Task 002 executable contracts](https://github.com/Maazkhan88/Pioneer-Auctions/pull/2) is an open stacked draft targeting `agent/task-001-foundation`; both CI jobs pass. Its latest commit is `6578a07`.
- After PR #1 merges, retarget/rebase PR #2 onto `main`, rerun CI, then merge PR #2 before starting work that depends on runtime contracts.

## What exists

- Shared agent rules in `AGENTS.md` and Claude Code entry point in `CLAUDE.md`.
- Monorepo root configuration for pnpm and Turborepo.
- Product and system architecture in `docs/architecture.md`.
- Versioned REST and Socket.IO contract in `docs/api-contracts.md`.
- Design/RTL rules in `docs/design-system.md`.
- Legacy reverse-engineering audit in `docs/legacy-analysis/`, imported from `E:\Pioneer Dev\PIONEER AUCTIONS WEB & PORTAL CODE\docs\legacy-analysis`; source code, zips, and credential material were intentionally not imported.
- Quality gates in `docs/quality-gates.md`.
- Initial TypeScript contract and design-token packages.
- Sequenced task packets under `tasks/`.
- A provisional transparent raster logo under `assets/brand/`.
- NestJS 11.1.28 API foundation with structured JSON logging, correlation IDs, OpenTelemetry auto-instrumentation, and dependency-aware health endpoints.
- Next.js 16.2.10 / React 19.2.7 customer-web and admin shells, statically rendered in English/LTR and Arabic/RTL.
- Shared ESLint 9.39.5, TypeScript 5.9.3, Vitest 4.1.10, and Prettier configuration.
- Local PostgreSQL, Redis, MinIO, and Mailpit Compose services with health checks and named volumes.
- Pull-request CI covering clean install, Compose validation, formatting, linting, type checks, tests, builds, secret scanning, and production dependency audit.
- Zod 4.4.3 runtime schemas and inferred TypeScript types for v1 money/time/errors, snapshots, bid/proxy commands, acknowledgements, and every named Socket.IO event.
- Typed Socket.IO client/server maps plus shared valid, invalid, and cross-language golden fixtures.
- Generated OpenAPI 3.1, JSON Schema, and Quicktype 25.0.0 Dart models with byte-for-byte drift checks in CI.
- The API serves the generated contract at `GET /api/v1/openapi.json`; API, web, and admin compatibility tests import the same package.

## What does not exist yet

- No generated Flutter runtime application.
- No runnable bidding engine.
- No connected UAE PASS, payment, KYC, push, email, or SMS provider.
- No production cloud resources.

## Active task

Task 004 / backend Week 1 foundation is complete. Owner: Codex. Branch: `agent/task-004-backend-week1`. Started and completed: 2026-08-11.

| Task                   | Owner       | Branch                             | Status             | Notes                                     |
| ---------------------- | ----------- | ---------------------------------- | ------------------ | ----------------------------------------- |
| 001 Foundation         | Codex       | `agent/task-001-foundation`        | Complete           | Scaffold, local services, CI              |
| 002 Contracts          | Codex       | `agent/task-002-runtime-contracts` | Complete           | Runtime schemas and compatibility harness |
| 003 Design system      | Antigravity | `agent/task-003-design-system`     | Complete           | EN/AR web and Flutter primitives & tokens |
| 004 Bidding engine     | Codex       | `agent/task-004-backend-week1`     | In progress        | Week 1 complete; bidding engine next      |
| 005 Web buyer loop     | Unassigned  | —                                  | Blocked by 002–004 | Full bidding client                       |
| 006 Mobile buyer loop  | Unassigned  | —                                  | Blocked by 002–004 | Flutter owner stays consistent            |
| 007 Admin core         | Unassigned  | —                                  | Ready after 002    | Lots, auctions, approval queues           |
| 008 Identity/KYC       | Unassigned  | —                                  | Ready after 002    | Provider adapter first                    |
| 009 Deposits/payments  | Unassigned  | —                                  | Ready after 002    | Ledger + webhook safety                   |
| 010 Notifications      | Unassigned  | —                                  | Ready after 002    | Transactional matrix                      |
| 011 Observability/load | Unassigned  | —                                  | Blocked by 004     | Test-auction readiness                    |
| 012 MVP hardening      | Unassigned  | —                                  | Blocked by 004–011 | Real test auction gate                    |

## Decisions already made

- Monorepo: pnpm workspaces with Turborepo configuration available for app scaffolding; root checks currently use pnpm recursive execution so they work even where global Corepack shims cannot be installed. Flutter remains in the same repo but outside pnpm execution where appropriate.
- Foundation tool pins: Node.js 24.18.0 LTS, pnpm 11.4.0, and Flutter 3.44.0 stable; Task 001 verifies framework compatibility before generating apps.
- TypeScript runtime pins: NestJS 11.1.28 for the API and Next.js 16.2.10 with React 19.2.7 for both web surfaces.
- Clients: Flutter mobile; Next.js web and admin.
- Backend: NestJS, PostgreSQL, Redis, Socket.IO.
- Money: integer fils on the wire and in code.
- Time: UTC on the wire; `Asia/Dubai` presentation default.
- Authority: server owns bids, price, reserve state, and close time.
- Languages: English and Arabic/RTL in MVP.
- Primary infrastructure target: AWS, with provider abstractions for local development.
- Contracts: Zod is the executable transport source; OpenAPI 3.1 and Dart models are generated, fixtures are shared across languages, and CI rejects artifact drift.
- Compatibility: v1 tolerates additive object fields but rejects unknown event names and required enum values; breaking changes require a new REST base path and Socket.IO namespace with an overlap rollout.
- Payments: local/MVP testing uses a dummy gateway provider behind the future payment-provider interface; no real card gateway is required for backend development until integration hardening.
- Bidding policy: manual/custom bids must align to configured increment steps; equal proxy maxima are won by the earlier registered maximum; live proxy maxima may be raised but not lowered/cancelled for MVP.
- Soft close: default window and extension are 2 minutes; accepted qualifying bids extend from the previous published close time; admin can override soft-close timing per lot.
- Bid increments: admin can derive a lot's resolved minimum increment from a percentage of starting price or set a custom per-lot increment; the engine evaluates the resolved integer-fils value.
- Bidding persistence: MVP manual bidding uses a PostgreSQL transaction with `FOR UPDATE OF lots` as the authoritative per-lot serialization boundary. Accepted bids write the bid ledger, lot state, bid command idempotency result, and outbox event before acknowledgement.
- Proxy bidding: `PUT /api/v1/lots/:lotId/proxy-bid` now supports raise-only proxy maximum registration. If the bidder is not already leading, the service records the proxy maximum and resolves the visible proxy leaderboard so the highest-priority maximum leads at the minimum required visible amount. Manual bids against an existing active proxy now append the manual bid and the automatic proxy response in order, and command acknowledgements return the final user-relative state.
- Database-backed bidding validation now has opt-in Vitest suites behind `PIONEER_RUN_DB_TESTS=1`: `test:integration` applies migrations in an isolated temporary schema and validates real-table proxy/manual/outbox persistence; `test:race` fires 100 same-lot manual commands and verifies ledger sequence/final-lot consistency.
- Socket.IO bidding gateway foundation exists on namespace `/auctions/v1`: connection hello, test-header-equivalent socket account context via `handshake.auth.testAccountId`, `lot:subscribe`, `lot:sync`, `lot:unsubscribe`, `bid:place`, and `proxy-bid:set`. Bid/proxy socket commands call the same durable bidding service as REST; subscribe/sync return authoritative database snapshots.
- Socket.IO durable outbox foundation exists: unpublished lot outbox rows can be claimed with `FOR UPDATE SKIP LOCKED`, emitted to `lot:{lotId}` rooms, and marked published after successful emit. Lot subscribe/sync can return contiguous retained outbox events after `afterSequence` as an additive `replay` array, otherwise the authoritative snapshot remains the recovery fallback.
- Personal bid-status event foundation exists: accepted manual/proxy commands write private `bid:status-changed` outbox rows for command accounts, automatic proxy winners, and previous leaders who become outbid after durable state changes. The outbox publisher emits account-scoped rows to `user:{accountId}` rooms. Payloads include the user-relative status, public current/next bid, lot sequence, close time, and private active proxy maximum when applicable.
- Close worker fencing foundation exists: due live lots are selected with `FOR UPDATE SKIP LOCKED`, each lot is re-locked with `FOR UPDATE OF lots`, close time/lifecycle are rechecked under the same row-lock boundary used by bids, lots with bids transition to `PENDING_APPROVAL`, lots without bids transition to `CLOSED`, sequence increments, and an `auction:state-changed` outbox event is written before commit.
- Cloudflare preview: buyer web static UI is prepared for Cloudflare export and deployed to `https://pioneer-auctions-web.maaz-n-khan.workers.dev`. The current deployed version uses the new Material 3 Expressive-inspired Pioneer buyer UI direction.

See `docs/decisions-log.md` for rationale and open decisions.

## Known risks and blockers

- UAE PASS and Network International commercial onboarding are external critical paths and must begin outside the codebase immediately.
- The supplied logo is a compressed JPEG. The transparent PNG is a generated cleanup draft and not a replacement for an official vector master.
- Provider attributes, fees, settlement times, refund SLAs, and regulatory obligations require confirmation with vendors and UAE counsel.
- Final-bid rejection reason taxonomy and SLA need business/legal approval.
- Legacy audit findings should inform Task 004 and later security/payment work: do not reuse legacy bid, auth, payment, or audit behavior without correcting server-side increments, transaction/locking, immutable history, provider verification, and RBAC.

## Next action

Continue Task 004 with a technical correctness review/handoff and any remaining test hardening that can run without local PostgreSQL. When PostgreSQL is available, run `PIONEER_RUN_DB_TESTS=1` database integration/race suites. When Redis is introduced as a concrete provider, wire `BiddingRecoveryService` into startup/operational recovery. UI redesign work is intentionally paused until the visual direction is revisited.

## Last validation

- Added contrast ratio check tests under `packages/design-tokens` validating WCAG AA constraints.
- Added `formatMoney` utility unit tests under `packages/contracts` for English/Arabic.
- Added pseudolocalizer validation tests under `apps/web` and `apps/admin` to prevent hardcoded content.
- `docs/legacy-analysis/*.md` were copied into the rebuild repo on 2026-08-11. This was a documentation-only import; the full app test suite was not rerun for the docs-only change.
- Week 1 backend foundation started on 2026-08-11: added the initial PostgreSQL migration for accounts, RBAC, auctions/lots, terms, bid command idempotency, proxy registrations, append-only bid/deposit ledgers, audit events, and outbox events; added shared database, identity, and audit services.
- `corepack pnpm --filter @pioneer/api migrate:check` passed on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test:foundation` passed on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 4 files / 8 tests on 2026-08-11.
- Continued Week 1 on 2026-08-11: added idempotent migration runner scripts, development seed script for roles/permissions/test accounts, an admin permission decorator/guard, and `/api/v1/admin/auctions` list/create foundation endpoints with audit recording.
- `corepack pnpm --filter @pioneer/api migrate:check` passed again on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 2 files / 7 tests on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed again on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed again on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 5 files / 12 tests on 2026-08-11.
- Completed the Week 1 backend foundation on 2026-08-11: added admin lot repository/endpoints, auth/session test-header skeleton, and dummy payment-provider interface plus test deposit payment-intent endpoint.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after Week 1 completion on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 3 files / 9 tests on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed after Week 1 completion on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed after Week 1 completion on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 6 files / 14 tests on 2026-08-11.
- Continued Task 004 after product decisions on 2026-08-11: recorded MVP bidding policy defaults, added a forward migration for per-lot increment and soft-close override policy, added percentage-derived/admin-custom increment parsing for admin lot creation, and added a framework-independent manual bid decision function with aligned-increment, eligibility, reserve, and soft-close behavior tests.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after the Task 004 policy migration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 1 file / 6 tests on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 3 files / 9 tests on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed after the bid decision function on 2026-08-11.
- `corepack pnpm --filter @pioneer/api lint` passed after the bid decision function on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed after the bid decision function on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 7 files / 20 tests on 2026-08-11.
- `corepack pnpm format:check` was run on 2026-08-11 and still reports pre-existing formatting warnings in unrelated Task 003/design-token files; touched Task 004 TypeScript/Markdown files were formatted directly with Prettier.
- Continued Task 004 on 2026-08-11: added `BiddingModule`, `POST /api/v1/lots/:lotId/bids`, a PostgreSQL-serialized manual bid service, command idempotency replay, durable bid ledger writes, lot state updates, bid outbox events, and service tests for accepted, replayed, and rejected commands.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 2 files / 9 tests after the persistence boundary on 2026-08-11.
- `corepack pnpm --filter @pioneer/api lint` passed after the persistence boundary on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed after the persistence boundary on 2026-08-11.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after the persistence boundary on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed after the persistence boundary on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 8 files / 23 tests on 2026-08-11.
- Continued Task 004 on 2026-08-11: added `PUT /api/v1/lots/:lotId/proxy-bid`, proxy bid request/ack DTOs, raise-only active proxy registration, minimum visible proxy bid creation for non-leading bidders, idempotent proxy command replay, and proxy service tests.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 2 files / 13 tests after proxy registration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api lint` passed after proxy registration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api typecheck` passed after proxy registration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after proxy registration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api build` passed after proxy registration on 2026-08-11.
- `corepack pnpm --filter @pioneer/api test` passed 8 files / 27 tests on 2026-08-11.
- Continued Task 004 on 2026-08-12: added competing proxy resolution for manual bids and proxy maximums, including immediate proxy response to manual bids, highest-max proxy visible-price calculation, equal-maximum earlier-registration priority, multiple visible ledger rows per command, and `OUTBID` acknowledgements for accepted commands defeated by proxy priority.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 2 files / 16 tests after competing proxy resolution on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after competing proxy resolution on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after competing proxy resolution on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after competing proxy resolution on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after competing proxy resolution on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 8 files / 30 tests after competing proxy resolution on 2026-08-12.
- Continued Task 004 on 2026-08-12: fixed real PostgreSQL proxy persistence compatibility by querying `priority_at AS registered_at`, replacing the invalid update-then-insert proxy raise path with `INSERT ... ON CONFLICT ... DO UPDATE`, and adding migration `0003_proxy_bid_audit_fields.sql` for proxy command/correlation audit fields.
- Added opt-in real-database bidding suites on 2026-08-12: `apps/api/test/bidding-integration.spec.ts`, `apps/api/test/bidding-race.spec.ts`, and shared isolated-schema fixture `apps/api/test/bidding-db-fixture.ts`.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test:integration` could not execute in this remote environment on 2026-08-12 because local PostgreSQL was not running and Docker is not installed/available; the suite failed before test execution with `ECONNREFUSED 127.0.0.1:5432`.
- `corepack pnpm --filter @pioneer/api test:integration` passed as skipped without `PIONEER_RUN_DB_TESTS=1` on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test:race` passed as skipped without `PIONEER_RUN_DB_TESTS=1` on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 2 files / 16 tests after DB harness additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after DB harness additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after DB harness additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after DB harness additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after DB harness additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 8 files / 30 tests with 2 opt-in DB suites skipped after DB harness additions on 2026-08-12.
- Continued Task 004 on 2026-08-12: added NestJS Socket.IO dependencies, `BiddingGateway`, socket command parsers, test-account socket session helper, and authoritative lot snapshot query support.
- Socket gateway coverage added on 2026-08-12 for connection hello/user room join, lot subscribe snapshot ack, manual bid command routing, proxy bid command routing, and malformed command rejection.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 3 files / 21 tests after Socket.IO gateway foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after Socket.IO gateway foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after Socket.IO gateway foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after Socket.IO gateway foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after Socket.IO gateway foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 9 files / 35 tests with 2 opt-in DB suites skipped after Socket.IO gateway foundation on 2026-08-12.
- Continued Task 004 on 2026-08-12: added `BiddingOutboxPublisher`, `BiddingGateway.publishPendingOutboxEvents`, retained lot event replay via `BiddingService.getLotEventsAfter`, and additive snapshot `replay` support for contiguous replay after `afterSequence`.
- Outbox/replay coverage added on 2026-08-12 for publisher emit/mark-published behavior, gateway publisher delegation, and contiguous replay on lot subscribe.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 4 files / 24 tests after outbox replay foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after outbox replay foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after outbox replay foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after outbox replay foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after outbox replay foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 10 files / 38 tests with 2 opt-in DB suites skipped after outbox replay foundation on 2026-08-12.
- Continued Task 004 on 2026-08-12: added `AuctionCloseService` for close worker fencing, due-lot selection with `FOR UPDATE SKIP LOCKED`, per-lot close recheck under `FOR UPDATE OF lots`, `PENDING_APPROVAL` vs `CLOSED` transition rules, sequence incrementing, and `auction:state-changed` outbox writes.
- Close worker coverage added on 2026-08-12 for bid-present pending approval, no-bid closed, future-close recheck/no-op, and due-lot selection through the fenced close path.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 5 files / 28 tests after close worker fencing on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after close worker fencing on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after close worker fencing on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after close worker fencing on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after close worker fencing on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 11 files / 42 tests with 2 opt-in DB suites skipped after close worker fencing on 2026-08-12.
- Continued Task 004 on 2026-08-12: added private `bid:status-changed` outbox writes for accepted manual/proxy commands and extended `BiddingOutboxPublisher` to emit account-scoped outbox rows to `user:{accountId}` rooms.
- Personal event coverage added on 2026-08-12 for account outbox publishing to private user rooms.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 5 files / 29 tests after personal bid-status event foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after personal bid-status event foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after personal bid-status event foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after personal bid-status event foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after personal bid-status event foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 11 files / 43 tests with 2 opt-in DB suites skipped after personal bid-status event foundation on 2026-08-12.
- Continued Task 004 on 2026-08-12: added `BiddingRecoveryService` to rebuild derived lot state from PostgreSQL lot, bid-ledger, and proxy tables; preserve closed/pending-approval lifecycle states; avoid exposing proxy maxima; and write rebuilt state to an abstract derived-state store for future Redis integration.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 6 files / 33 tests after recovery rebuild foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after recovery rebuild foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after recovery rebuild foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after recovery rebuild foundation on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after recovery rebuild foundation on 2026-08-12.
- First `corepack pnpm --filter @pioneer/api test` run after recovery rebuild foundation hit a transient timeout in `test/admin-auctions.spec.ts > requires admin account context`; the same spec passed alone immediately afterward.
- Second `corepack pnpm --filter @pioneer/api test` run passed 12 files / 47 tests with 2 opt-in DB suites skipped after recovery rebuild foundation on 2026-08-12.
- Continued Task 004 on 2026-08-12: expanded private bid-status fan-out so accepted commands notify the command account, automatic proxy winners, and previous leaders who are displaced; proxy maxima remain private to the owning account event only.
- `corepack pnpm --filter @pioneer/api test:bidding` passed 6 files / 33 tests after expanded personal status fan-out on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after expanded personal status fan-out on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after expanded personal status fan-out on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after expanded personal status fan-out on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after expanded personal status fan-out on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 12 files / 47 tests with 2 opt-in DB suites skipped after expanded personal status fan-out on 2026-08-12.
- Prepared Cloudflare static deployment on 2026-08-12: added web static export config, `apps/web/wrangler.jsonc`, Cloudflare deployment notes, and fixed buyer web build issues in the component preview.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/web build:cloudflare` passed on 2026-08-12 and generated `apps/web/out`.
- `cmd /c npx wrangler deploy` deployed the buyer web preview to `https://pioneer-auctions-web.maaz-n-khan.workers.dev` on 2026-08-12. Wrangler reported version ID `68fdd981-72aa-4aba-9ff5-63df0801c91b`.
- Replaced the buyer web visual direction on 2026-08-12 with a Material 3 Expressive-inspired Pioneer UI: mobile-first hero, live lot cards, search chips, lot detail preview, admin metrics preview, and clean English/Arabic copy.
- `corepack pnpm --filter @pioneer/web typecheck` passed after the new UI direction on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/web build:cloudflare` passed after the new UI direction on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the new buyer web UI to `https://pioneer-auctions-web.maaz-n-khan.workers.dev` on 2026-08-12. Wrangler reported version ID `586ae120-5c77-4fb7-b49d-54c93ae5aab8`.
- `corepack pnpm check` passed formatting, lint, strict type checks, 12 contract tests, 5 API tests, 4 web tests, and 4 admin tests on 2026-07-15.
- `corepack pnpm --filter @pioneer/api test:contract` proved the served OpenAPI document matches the generated artifact.
- Dart SDK 3.12.2 reported no analysis issues, generated the new token representations, and decoded/round-tripped the shared `Money`, `LotSnapshot`, `PlaceBidCommand`, and `CommandAck` fixture.
- `corepack pnpm build` compiled the API, contracts, design tokens, and both Next.js applications successfully.
- `corepack pnpm security:audit` reported no known production dependency vulnerabilities.
- GitHub Actions passed all check/build workflows on the task branch on 2026-07-15.
- Docker compose validation successfully verified the Compose configurations and persistent volumes.
- Local ports: web 3000, admin 3001, API 4000, PostgreSQL 5432, Redis 6379, MinIO 9000/9001, Mailpit SMTP/UI 1025/8025.
