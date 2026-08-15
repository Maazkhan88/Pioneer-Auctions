# Current state

Last updated: 2026-08-14

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
- Bidding-engine technical handoff in `docs/bidding-engine-handoff.md`.
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

Task 007 / admin core is active. Owner: Codex. Branch: `agent/task-007-admin-core`. Started: 2026-08-12. Task 005's buyer bid action state machine was also implemented on this same branch on 2026-08-12 per explicit continuation instructions (see the Task 005 row below and `tasks/005-web-buyer-loop.md`).

| Task                   | Owner       | Branch                             | Status             | Notes                                     |
| ---------------------- | ----------- | ---------------------------------- | ------------------ | ----------------------------------------- |
| 001 Foundation         | Codex       | `agent/task-001-foundation`        | Complete           | Scaffold, local services, CI              |
| 002 Contracts          | Codex       | `agent/task-002-runtime-contracts` | Complete           | Runtime schemas and compatibility harness |
| 003 Design system      | Antigravity | `agent/task-003-design-system`     | Complete           | EN/AR web and Flutter primitives & tokens |
| 004 Bidding engine     | Codex       | `agent/task-004-backend-week1`     | In progress        | Week 1 complete; bidding engine next      |
| 005 Web buyer loop     | Codex       | `agent/task-007-admin-core`        | In progress         | Bid/proxy action state machines (REST+socket), search/filter, calendar, SEO metadata, Arabic `<html>` fix; browser-verified, live-backend verification pending |
| 006 Mobile buyer loop  | Unassigned  | —                                  | Blocked by 002–004 | Flutter owner stays consistent            |
| 007 Admin core         | Codex       | `agent/task-007-admin-core`        | In progress        | Write actions (final-bid decisions, auction pause/resume/cancel/create/edit, lot create/edit, audit-events read, transactional bulk lot import) fully wired to real endpoints; live monitor, step-up auth, offer/consignment/deposit queues remain unbuilt (see notes below) |
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
- Cloudflare preview: buyer web static UI is prepared for Cloudflare export and deployed to `https://pioneer-auctions-web.maaz-n-khan.workers.dev`. The current deployed version uses the new Material 3 Expressive-inspired Pioneer buyer UI direction, links dummy lots to detail pages, includes local watch interactions, and was rebuilt against the public preview API.
- Cloudflare public preview API exists at `https://pioneer-auctions-api.maaz-n-khan.workers.dev`; `GET /api/v1/lots` serves backend-shaped dummy lot cards for remote/mobile buyer-web preview only. This is separate from the full NestJS API runtime.
- Admin core first UI slice exists on `agent/task-007-admin-core`: responsive EN/AR operations dashboard, lot-management actions, auction controls, approval queue, and audit trail using seed-style data until PostgreSQL/API-backed read models are available. The admin preview is deployed to `https://pioneer-auctions-admin.maaz-n-khan.workers.dev`.
- Admin core protected read endpoints exist: `GET /api/v1/admin/dashboard` for operations metrics and `GET /api/v1/admin/final-bid-approvals` for final-bid approval queue context, both guarded by `admin.auctions.read`.
- Admin UI data adapter exists: it fetches the protected admin read endpoints when `PIONEER_ADMIN_API_BASE_URL` is configured and otherwise uses localized static fallback data so the Cloudflare preview remains viewable.
- Admin final-bid decision skeletons exist: `POST /api/v1/admin/final-bid-approvals/:lotId/approve` and `/reject`, guarded by `admin.auctions.write`, preserving hammer price and writing audit records.
- Admin approval queue UI now shows approve/reject controls, rejection reason selection, and static-preview disabled notices; API-loaded rows include endpoint metadata for future authenticated runtime actions.
- Admin auction control skeletons exist: `POST /api/v1/admin/auctions/:auctionId/pause`, `/resume`, and `/cancel`, guarded by `admin.auctions.write`, requiring a reason, accepting an optional note, changing only auction lifecycle, and writing audit metadata.
- Backend dummy lots can be served in development with `PIONEER_ADMIN_DUMMY_LOTS=1`; `GET /api/v1/admin/lots` then returns three demo lots covering live vehicle, scheduled real estate, and pending-approval equipment states.
- Public `GET /api/v1/lots` now returns sanitized lot-card data from the same dummy/backend source without reserve price, increment policy internals, proxy data, or admin metadata.
- Buyer web homepage now loads lots through `loadBuyerHomeData`: it fetches `PIONEER_PUBLIC_API_BASE_URL/api/v1/lots` when configured and otherwise shows the same three dummy lots in static Cloudflare preview.
- Buyer web mobile header now uses a compact responsive layout: brand and language switch share the top row, and navigation is a smaller horizontal scroll row to avoid covering the first lot card.
- Buyer web lot detail preview routes now exist for the three dummy lots in English and Arabic, including a gallery placeholder, reserve/lifecycle context, specs/documents/fees, local watch button, and disabled bid panel shell aligned to `POST /api/v1/lots/:lotId/bids`.
- Admin UI now fetches protected `/admin/lots` when API configuration is available and renders a backend lot list in the Lot Management panel; static Cloudflare preview falls back safely when no API is configured.
- Admin Lot Management now includes a disabled static create/edit lot form shell with English/Arabic title fields, lot number, AED starting/reserve inputs, increment mode, custom increment, soft-close extension minutes, and featured flag.
- Admin runtime helper `submitFinalBidDecision` exists for future authenticated final-bid approve/reject actions; static preview controls remain disabled until a safe admin session runtime is connected.
- On 2026-08-12, continued the buyer preview slice: added `apps/api/worker/public-preview.ts`, `apps/api/wrangler.jsonc`, `apps/api/test/public-preview-worker.spec.ts`, statically exported lot detail routes, `WatchButton`, `BidPanelShell`, and `loadLotDetailData`.
- `corepack pnpm --filter @pioneer/api exec vitest run test/public-preview-worker.spec.ts` passed on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed on 2026-08-12.
- `corepack pnpm --filter @pioneer/web lint` passed on 2026-08-12.
- `corepack pnpm --filter @pioneer/web typecheck` passed on 2026-08-12.
- `PIONEER_PUBLIC_API_BASE_URL=https://pioneer-auctions-api.maaz-n-khan.workers.dev CLOUDFLARE_PAGES=true corepack pnpm --filter @pioneer/web build:cloudflare` passed on 2026-08-12.
- API preview deployed to Cloudflare Worker version `b600d143-3167-4404-9da3-e840065dbfdf` at `https://pioneer-auctions-api.maaz-n-khan.workers.dev`; remote `GET /api/v1/lots` returned HTTP 200 with three dummy lots.
- Buyer web preview deployed to Cloudflare Worker version `255a115a-9cdc-4f51-90d9-3ddc49f670b4` at `https://pioneer-auctions-web.maaz-n-khan.workers.dev`; remote `/en` and `/en/lots/11111111-1111-4111-8111-111111111111` returned HTTP 200.
- Buyer bid action state machine exists: `apps/web/lib/bid-session.ts` (server-only test-account/session config, new env vars `PIONEER_PUBLIC_TEST_ACCOUNT_ID` and `PIONEER_PUBLIC_TERMS_VERSION_ID`), `apps/web/lib/bid-command.ts` (pure state machine, authoritative-lot-state refetch, `POST /api/v1/lots/:lotId/bids` submission with client-generated `Idempotency-Key`, a transport-agnostic `normalizeBidAck` classifier), and a rewritten `apps/web/components/bid-panel-shell.tsx` covering idle/confirming/pending-unknown/accepted/outbid/rejected/gated/closed states with an inline terms-acceptance gate. Full detail in `tasks/005-web-buyer-loop.md`. Not yet verified against a live NestJS+PostgreSQL backend -- see DEC-019 and the known-gap note below.
- Buyer realtime lot connection exists: `apps/web/lib/lot-socket.ts`'s `LotSocketClient` connects to Socket.IO namespace `/auctions/v1` (`socket.io-client@4.8.1`, pinned to the server's `socket.io@4.8.1`), auto-resubscribes with `afterSequence` on every (re)connect, detects sequence gaps and re-syncs, and keeps the lot-detail page's displayed current/next bid live via `bid:accepted`/`lot:snapshot`. `BidPanelShell` now prefers submitting `bid:place` over the live socket and falls back to REST when not connected or the ack times out. Unlike `@pioneer/contracts` runtime imports (DEC-019), `socket.io-client` bundles through `next build` without issue.
- Proxy (maximum) bidding exists: `apps/web/lib/proxy-bid-command.ts` (`PUT /api/v1/lots/:lotId/proxy-bid`, `ProxyBidPanelState`, `normalizeProxyAck`) and `LotSocketClient.setProxyBid()` (`proxy-bid:set`), both derived from a full read of `apps/api/src/bidding/bidding.service.ts::setProxyBid()` -- confirmed the real ack includes a `NOT_BIDDING` `myBidStatus` (maximum saved, no visible bid needed) and a nullable `currentBid` that manual bids' ack doesn't have. `BidPanelShell` gained a third "Max bid" mode with its own state machine, mutually exclusive with the manual-bid flow (mode switching is hidden while either is mid-flow), sharing the same session/socket/terms-checkbox infrastructure. MVP rule (DEC-017): a proxy maximum can only be raised, never lowered/cancelled while live -- enforced server-side, `PROXY_MAX_TOO_LOW` surfaces as a plain rejection client-side.
- Buyer homepage search/filter now works for real: `apps/web/components/lot-browser.tsx` filters the already-fetched public lot list client-side by title/lot-number/category text and by category chip (no server-side search/filter/category endpoint exists yet -- `GET /categories` from `docs/api-contracts.md` is not implemented in `apps/api/src`). Fixed a real pre-existing bug in the process: the category chip labels never matched the category values lots were actually assigned (`apps/web/lib/home-data.ts::categoryFor()`), so no chip could ever have filtered anything before this.
- Auction calendar page exists at `/{locale}/calendar` (`apps/web/lib/calendar-data.ts`, `apps/web/app/[locale]/calendar/page.tsx`): groups live/upcoming lots by real closing date (no `GET /auctions` calendar endpoint exists server-side either, so this reuses the public lots list and groups client-side). Wired the previously-unused `navCalendar` nav link to it.
- `generateMetadata` (title/description/Open Graph/Twitter/`alternates.languages`) added to the homepage, lot detail page, and calendar page -- localized per EN/AR.
- Fixed a real Arabic/RTL bug found while browser-verifying the above: `<html lang="en">` was hardcoded regardless of locale (Next.js App Router structurally can't set it from the nested `[locale]` layout without a larger root-layout restructure this pass didn't attempt). `apps/web/components/html-attributes-sync.tsx` syncs `document.documentElement.lang`/`dir` client-side on mount/locale-change; verified live in a browser on both `/en` (`lang="en"` `dir="ltr"`) and `/ar` (`lang="ar"` `dir="rtl"`).
- Admin core write actions now fully wired to real endpoints on 2026-08-13, replacing every previously-disabled control: `apps/admin/lib/admin-session.ts` (mirrors `apps/web/lib/bid-session.ts`; `getAdminSessionConfig()` reads `PIONEER_ADMIN_API_BASE_URL`/`PIONEER_ADMIN_TEST_ACCOUNT_ID`, `null` when unconfigured), extended `admin-data.ts` to also fetch `GET /api/v1/admin/auctions` (needed for the auction panel and the lot form's auction picker) and to return the resolved session alongside read data, fixed a real type drift in `admin-actions.ts` (`FinalBidDecisionResponse` had a fabricated `lifecycle` field and was missing the real `auditId` field), and added `submitAuctionControl`/`submitCreateAuction`/`submitCreateLot` matching the real Zod DTOs in `apps/api/src/auctions/{auction,lot}.dto.ts` exactly (including `lot.dto.ts`'s exactly-one-of `minimumIncrementFils`/`minimumIncrementPercentBps` rule, and that `createLotSchema` has no "featured" field at all -- the old static form's featured checkbox was dropped rather than wired to a nonexistent contract).
- Three new client components replace the disabled static markup: `apps/admin/components/approval-queue-panel.tsx` (per-item approve/reject with pending/success/error state, gated on session), `auction-operations-panel.tsx` (live auction list with lifecycle-gated pause/resume/cancel plus a schedule-auction create form), and `lot-management-panel.tsx` (lot create form rebuilt to match `createLotSchema` field-for-field, with an auction picker sourced from the new auctions read). All three fall back to the pre-existing static-preview disabled state when `PIONEER_ADMIN_API_BASE_URL` is not configured.
- Fixed a second real, pre-existing Arabic/RTL bug found while browser-verifying the above (same class of bug as the web app's, independently present in `apps/admin`): `apps/admin/app/layout.tsx` also hardcoded `<html lang="en">` with no `dir` at all. Added `apps/admin/components/html-attributes-sync.tsx` (same fix pattern) and wired it into `apps/admin/app/[locale]/layout.tsx`; confirmed via injected JS that `/en` now reports `lang="en" dir="ltr"` and `/ar` reports `lang="ar" dir="rtl"` (previously `dir` was empty string on both locales).
- Browser-verified end-to-end with a real `next dev` server and a deliberately unreachable `PIONEER_ADMIN_API_BASE_URL` (`http://localhost:4000`, nothing listening): confirmed all 8 buttons / 23 inputs are disabled with the static-preview notice when no session is configured; confirmed they become live when a session is configured, with the lot form specifically staying disabled (and showing "create an auction first") because no auctions exist yet, and the approval queue's per-item controls specifically staying disabled because the static-fallback queue data (used since the fake backend is unreachable) has no `lotId` to act on -- both are the client-side guard code behaving correctly under a real degraded-backend condition, not a display bug. Submitted the schedule-auction form and confirmed the real fetch failure renders `"Failed to fetch"` in the `is-error` status style, proving the pending -> error path executes for real, not just in unit tests. No live NestJS+PostgreSQL backend was reachable in this environment, so the accepted/success path (a real 2xx response) was not exercised live -- same limitation already recorded for Task 005's client work.
- Continued Task 007 on 2026-08-14: added `GET /api/v1/admin/audit-events` (real read over `audit_events`, guarded by the previously-unused seeded `admin.audit.read` permission, fetched independently client-side so a 403 there -- expected for the seeded `operations` role, which lacks that permission -- degrades only that panel instead of the whole page), `PATCH /api/v1/admin/auctions/:id`, `PATCH /api/v1/admin/lots/:id` (deliberately scoped to title/schedule/soft-close fields, excluding money/increment fields pending a product decision on bid-integrity edge cases), and `POST /api/v1/admin/lots/bulk-import` (per-row validation against the existing `createLotSchema`, dry-run and commit modes, all-or-nothing single-transaction commit via a checked-out `PoolClient`). Wired all of this into the admin UI: a real audit trail panel, inline edit affordances on auction and lot rows, and a new minimal JSON-textarea bulk-import panel.
- Fixed a real, pre-existing, unrelated build bug found while validating on 2026-08-14: `apps/api/tsconfig.build.json` set `rootDir: "src"` but inherited `worker/**/*.ts` from the base `tsconfig.json`'s `include`, so `npm run build` (`tsc -p tsconfig.build.json`) failed with a rootDir violation. Excluded `worker/` from the build tsconfig since it's bundled separately by `wrangler`, not `tsc`.

See `docs/decisions-log.md` for rationale and open decisions.

## Known risks and blockers

- UAE PASS and Network International commercial onboarding are external critical paths and must begin outside the codebase immediately.
- The supplied logo is a compressed JPEG. The transparent PNG is a generated cleanup draft and not a replacement for an official vector master.
- Provider attributes, fees, settlement times, refund SLAs, and regulatory obligations require confirmation with vendors and UAE counsel.
- Final-bid rejection reason taxonomy and SLA need business/legal approval.
- Legacy audit findings should inform Task 004 and later security/payment work: do not reuse legacy bid, auth, payment, or audit behavior without correcting server-side increments, transaction/locking, immutable history, provider verification, and RBAC.
- `apps/web` cannot bundle a *runtime* value import from `@pioneer/contracts` through `next build`/Turbopack ("module has no exports" for every named export, reproduced with a clean `.next` cache and with `@pioneer/contracts` added to `transpilePackages`). Worked around in `bid-command.ts`/`bid-panel-shell.tsx` with local types/parsers/formatters; root cause not diagnosed. See DEC-019. `apps/admin` has the same latent exposure and will hit it the first time any of its `lib/*.ts` files import a contracts runtime value.
- Task 007's acceptance criteria are only partially met even after the 2026-08-13/2026-08-14 write-action wiring. As of 2026-08-14, bulk import, lot edit, and auction edit are done and now verified against a real database (see "Local PostgreSQL now available" below); still explicitly **not** implemented, because the underlying server capability does not exist yet (not silently skipped -- confirmed absent by reading every `apps/api` controller): step-up authentication for high-risk actions (no such mechanism exists anywhere in the codebase), a live monitor with sequence-gap recovery for admin (no admin-facing Socket.IO namespace/gateway exists; only the buyer-facing `/auctions/v1` namespace exists), offer/consignment review queue shells (no such endpoints or underlying tables exist -- these are net-new domain slices, not wiring gaps), the deposit operations queue (`deposit_ledger` exists but has no "pending action" concept to query against -- building this would mean inventing a business rule with no product decision behind it), and lot money/increment edit (`startingBidFils`/`reservePriceFils`/increment fields stay create-only because they interact with derived state and, once a lot has a live bid, bid-integrity invariants this pass has no rule for). Also not implemented: UI-side permission hiding (the admin UI has no way to query the current test account's own permission set, so it cannot hide write controls a lower-privileged account would 403 on -- server-side authorization is still fully enforced by `AdminPermissionGuard` either way).
- No admin "publish"/"go-live" action exists, and there was no lifecycle automation anywhere in the app until 2026-08-14's scheduler (see below) -- before that, a lot's `starts_at`/`closes_at` were purely decorative and nothing ever moved a lot out of `DRAFT`.

## Local PostgreSQL now available -- and three real, previously-undetected bugs found and fixed

On 2026-08-14, native PostgreSQL 18 was installed locally (`E:\PostgreSQL`, service `postgresql-x64-18`, port 5432; Docker Desktop is not usable on this machine -- no CPU virtualization support, confirmed via `wsl --status` and absence of any Docker installation). The `pioneer`/`pioneer`/`pioneer` role/database matching the API's zero-config default `DATABASE_URL` was created, migrations applied (`pnpm --filter @pioneer/api migrate:up`), and dev data seeded (`pnpm --filter @pioneer/api seed:dev`). Real seeded account IDs (DB-generated, not fixed): `admin.test@pioneer.local` = `c03a980a-c442-4694-b205-4520574591f4` (`super_admin`, has every admin permission including `admin.audit.read`); `buyer.test@pioneer.local` = `bd44b2e8-5e31-4e04-b0bf-cf5b2146192f` (no roles, `ACTIVE`/`VERIFIED`).

This is the first time in the entire two-session rebuild engagement that any client code has run against a real PostgreSQL instance instead of a stub/mock/dummy fallback. Enabling `PIONEER_RUN_DB_TESTS=1` for the first time surfaced two real, completely undetected bugs in server code that unit tests structurally cannot catch (they mock the repository/query layer), and running the API live surfaced a third:

1. **`apps/api/src/auctions/lots.repository.ts`'s lot-insert SQL had 16 target columns but only 15 `VALUES` placeholders** (missing `$15` for `soft_close_maximum_extensions`) -- every real `POST /admin/lots` (and therefore every bulk import) has been broken since it was written; unit tests never caught it because they mock `LotsRepository` entirely. Fixed by adding the missing `$15` placeholder. Confirmed via a live `POST /api/v1/admin/lots` call, which failed with a raw Postgres `42601` syntax error before the fix and succeeded with correct derived values after.
2. **`apps/api/src/bidding/bidding.service.ts::findActiveProxy` ordered by a nonexistent `registered_at` column** -- the real column is `priority_at`. A sibling query (`loadActiveProxies`) had already been correctly fixed to alias `priority_at AS registered_at` in an earlier session (see the 2026-08-12 "fixed real PostgreSQL proxy persistence compatibility" note above), but this second, separate query with the same bug was missed. Fixed by using the real column name directly. Undetected until now because it's only reachable via `PIONEER_RUN_DB_TESTS=1`, which had never successfully executed (see bug 3).
3. **`apps/api/test/bidding-db-fixture.ts`'s isolated-schema `search_path` excluded `public`**, where the `citext` extension's type lives (extensions are installed once per database; their exported types resolve via whichever schema is on the search path). Every `PIONEER_RUN_DB_TESTS=1` run before now failed immediately with `type "citext" does not exist` before a single assertion could run -- confirmed by `docs/current-state.md`'s own prior validation log entries, which always recorded these suites as skipped or failing at the connection stage. Fixed by setting `search_path=${schemaName},public` (the isolated schema stays first so new tables still default there). This fix is what made bugs 1 and 2 visible at all.
4. **`apps/api/src/auctions/auctions.repository.ts`'s shared `transition()` helper (used by `pause`/`resume`/`cancel`) compared the `lifecycle` column -- a native Postgres `auction_lifecycle` enum, not `text` -- against `ANY($3::text[])`**, which fails with `42883 operator does not exist` because an enum column has no default `=` operator against an explicitly-`text[]`-typed array (unlike a bare string literal, which Postgres coerces automatically -- which is exactly why the final-bid approve/reject endpoints, which compare against a single string literal, worked live on the first try while this one didn't). Found live: `POST /admin/auctions/:id/cancel` against a real `DRAFT` auction failed with a 500 before the fix. Every admin auction pause/resume/cancel call had been broken against a real database since it was written; the mocked unit tests for these endpoints never exercised real SQL. Fixed by casting the column instead: `lifecycle::text = ANY($3::text[])`. Confirmed working live afterward for all three transitions: cancel (from `DRAFT`), pause (`LIVE` -> `PAUSED`), and resume (`PAUSED` -> `LIVE`).

With all three fixed, `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test` passes 17 files / 77 tests with **zero skipped** for the first time, including the 100-concurrent-command same-lot race suite (the single most safety-critical correctness property of the whole bidding engine, now verified against a real `FOR UPDATE OF lots` row lock instead of only reasoned about).

Live, manual, real end-to-end verification performed against this database (via direct HTTP calls and, for admin, a real click-through in a browser):

- **Admin lot/auction create, edit, and bulk import**: created a real auction and lot via the live admin UI/API, edited both via `PATCH` (both through a real browser click-through of the `Edit`/`Save` UI flow built earlier today, not just curl -- pre-filled values, submitted change, confirmed the row updated in place), ran a real 2-row bulk import (both committed, correct derived `minimumIncrementFils` for both custom and percent-bps rows), and confirmed a mixed valid/invalid bulk import batch correctly created **nothing** (the specific acceptance-criterion behavior) while reporting per-row errors.
- **Real Arabic/RTL round-trip**: an auction created with an Arabic title initially appeared corrupted (`????`) when typed directly into a Bash command-line argument on Windows -- confirmed via `SELECT octet_length(title_ar)` that this was a shell/terminal codepage artifact, not a server bug, by resending the identical request via a UTF-8 file body instead: the Arabic text round-tripped perfectly through Zod validation, Postgres storage, and the JSON response.
- **Audit trail**: `GET /admin/audit-events` and the real admin UI panel correctly showed all six real actions taken, in order, with correct actor/correlation/subject metadata -- the first time this panel has ever displayed anything but the static fallback list.
- **Buyer manual bidding**: seeded a `terms_versions` row, a `terms_acceptances` row for the buyer test account, and a `deposit_ledger` CREDIT entry (the dev-seed script does not create these; there is also no admin "publish/go-live" endpoint to move a lot from `DRAFT` to `LIVE`, so the auction/lot were moved to `LIVE` directly via SQL for this test -- a real, confirmed gap, not a workaround for a bug). `POST /api/v1/lots/:lotId/bids` accepted a real manual bid: `status: "ACCEPTED"`, `myBidStatus: "WINNING"`, `nextMinimumBid` correctly computed as current bid plus the configured increment, `bid_ledger`/`lots` rows correctly updated.
- **Final-bid approval**: `GET /admin/final-bid-approvals` correctly computed `depositEligible`/`kycVerified` from real `deposit_ledger`/`accounts` rows; `POST .../approve` correctly transitioned the lot, preserved the hammer price unchanged, and wrote a real audit record.
- **Auction lifecycle control**: cancel (from `DRAFT`), pause (`LIVE` -> `PAUSED`), and resume (`PAUSED` -> `LIVE`) all verified live after fixing bug 4 above.

The local Postgres instance now has some manually-created test data from this validation pass (a few extra auctions/lots/terms/deposit rows beyond the clean `seed:dev` baseline) -- harmless for local dev, safe to leave or wipe with a fresh `migrate:up` if a clean slate is wanted later.

## MVP blockers closed on 2026-08-14: lifecycle scheduler, real lot browsing, and a real-time event bug

Two structural gaps stood between "the bidding engine works" (proven above) and "a real buyer can actually use it," plus a third bug found while closing the second:

1. **No lifecycle automation anywhere in the app.** `AuctionCloseService` (built in an earlier session, fully tested) was never invoked by anything -- confirmed by grepping the whole `apps/api/src` tree for its method name and finding zero call sites outside its own spec file; `BiddingGateway.publishPendingOutboxEvents` had the identical problem. Without this, a lot's `starts_at`/`closes_at` were decorative and nothing ever left `DRAFT`, and `PublicLotsController` filters out `DRAFT` lots entirely -- so no real lot could ever become visible to a buyer no matter what the UI did. Fixed by adding `AuctionOpenService` (`apps/api/src/bidding/auction-open.service.ts`, symmetric counterpart to `AuctionCloseService`: `DRAFT` -> `LIVE` when `starts_at` is reached, best-effort opens the parent auction too, writes the same `auction:state-changed` outbox event) and `BiddingLifecycleScheduler` (`apps/api/src/bidding/bidding-lifecycle.scheduler.ts`: an in-process 15s `setInterval`, no new dependency, guarded off under `NODE_ENV=test`) that ticks open, close, and outbox-publish together. See DEC-021 for the production-deployment caveat (an external cron may be preferable to an always-on in-process timer). **Live-verified**: created a `DRAFT` lot with `starts_at` in the past via the real admin API, confirmed it was invisible on `GET /api/v1/lots`, waited 18s with zero manual intervention, confirmed it (and its parent auction) had transitioned to `LIVE` automatically.
2. **The buyer web app's lot detail page hard-locked to three fixed dummy lot UUIDs** via `export const dynamicParams = false` and a static `previewLotIds` list -- confirmed by a real 404 for a real lot ID before this fix. This made the entire `BidPanelShell` UI (manual/proxy bidding, the socket connection) unreachable for any lot outside that fixed set, regardless of whether the underlying engine worked. Next.js requires route-segment-config exports like `dynamicParams` to be a static literal boolean (rejects any computed expression, even one that resolves to a constant), and separately forbids `dynamicParams: true` outright under `output: "export"` -- so the same source line cannot serve both deployment targets directly. Fixed by checking in `dynamicParams = true` (correct for `next dev` and any real server deployment) and adding `apps/web/scripts/build-cloudflare.mjs`, a small wrapper that temporarily flips the literal to `false` only around the Cloudflare static-export `next build` invocation and restores the checked-in value afterward in a `finally` block, so a local `build:cloudflare` run never leaves the working tree modified. `apps/web/package.json`'s `build:cloudflare` script now calls this wrapper instead of `next build` directly. **Live-verified**: navigated to the real auto-opened lot's detail page at `http://localhost:3000/en/lots/<real-uuid>` and got a fully rendered page (title, current/next bid, bid panel) instead of a 404; both `next build` and `npm run build:cloudflare` still succeed.
3. **A real Socket.IO event-shape bug**, found while placing the first-ever live bid through the actual UI (task 2 immediately made this reachable for the first time). `BidPanelShell`'s `onBidAccepted` handler read `event.data.currentBid`, matching the enveloped `LotEventEnvelope<Name, Data>` shape `docs/api-contracts.md` §9 documents -- but the real server (`BiddingOutboxPublisher.publishPendingEvents`) emits `outbox_events.payload` completely flat and unwrapped, so `event.data` was always `undefined`, throwing `Cannot read properties of undefined (reading 'currentBid')` on every real `bid:accepted` event. This is a real, confirmed drift between the documented contract and the real server (not a client bug in isolation) -- see DEC-022 for full detail, including that `auction:extended`/`reserve:status-changed` are never emitted by any server code today and remain unreachable dead code. Fixed by flattening `BidAcceptedEvent`/`AuctionStateChangedEvent`/`AuctionExtendedEvent`/`ReserveStatusChangedEvent` in `apps/web/lib/lot-socket.ts` to match the real server shape and fixing `bid-panel-shell.tsx`'s handler to read fields directly. **Live-verified**: placed two real bids through the actual browser UI (terms checkbox, confirm dialog, real REST submission) after the fix with zero console errors; both landed correctly in `bid_ledger` at sequences 2 and 3 with the correct raised amount.

With all three closed, **a complete, real, first-ever end-to-end path now works**: an admin creates a `DRAFT` lot via the real UI -> the scheduler opens it automatically with no manual intervention -> a buyer browses to that real lot's detail page and places a real bid through the actual UI -> the bid is accepted and correctly recorded. This is the first time in the entire two-session rebuild engagement that this full path has been exercised, not just its individual pieces.

Not yet exercised live (at the time): Socket.IO proxy/maximum bidding, outbid/rejected/closed bid states, soft-close extension, and reconnect/gap-resync under a real network drop. Also noted, not fixed (low priority, cosmetic): the "Current bid" display in `BidPanelShell` did not visibly refresh immediately after the buyer's own second bid was accepted, even though the underlying ledger/lot state were correct -- likely a missing refetch/state update after a successful submit, not investigated further this pass.

## Proxy (maximum) bidding live-verified on 2026-08-14

Following up on the manual-bid-only verification above, proxy bidding was live-verified end-to-end against the real local PostgreSQL/API and, separately, through the real buyer web UI. Used `admin.test@pioneer.local` as a second eligible bidder (bidding endpoints only check `SessionService.requireTestHeaderAccount` + account/deposit/terms eligibility, never admin role, so any `ACTIVE` account works) by inserting the same `terms_acceptances`/`deposit_ledger` rows already present for `buyer.test@pioneer.local`.

REST-level, against the real lot `8fd8d1e7-d415-4d18-a63b-a654d5dd2f92`:

- **Raise-only enforcement**: registering a first proxy succeeded and bid the uncontested minimum (matches `resolveProxyLeaderboard`'s no-competing-proxy branch); a second `PUT` attempting to *lower* the same account's maximum was correctly rejected `PROXY_MAX_TOO_LOW`; a third attempt setting an *equal* maximum was also correctly rejected (raise-only means strictly higher, not `>=`) -- confirms `bidding.service.ts`'s `existingProxy.maximum_fils >= command.input.maximumFils` check. Retrying the rejected equal-amount command with the same `commandId` returned the identical cached result with no new ledger row, confirming idempotency also applies to rejections, not just acceptances.
- **Equal-maximum tie-break by earlier registration**: with `admin.test` already holding an active 1,300,000-fils proxy, `buyer.test` registered an equal 1,300,000-fils proxy. `buyer.test`'s own command was accepted (their proxy row was saved), but the leaderboard resolution correctly kept `admin.test` -- the earlier `priority_at` -- as the winning bid at the shared maximum, and `buyer.test`'s ack correctly reported `myBidStatus: "OUTBID"` even though their own command succeeded. Verified directly against `bid_ledger`: the new row was credited to `admin.test`, not the account that submitted the command.
- **Manual bid vs. active proxy resolution**: with `admin.test`'s proxy raised to a 2,000,000-fils maximum (raising while already leading correctly did *not* force an immediate re-bid -- the price only moves when a new competing bid arrives, so a bidder's true ceiling isn't prematurely revealed), `buyer.test` placed a manual bid at the current next-minimum. The command was accepted into the ledger, and `admin.test`'s proxy automatically and atomically posted a counter-bid one increment above it in the same transaction (`resolveProxyResponseToManualBid`) -- confirmed as two consecutive `bid_ledger` rows, both correct.

Real browser click-through of `BidPanelShell`'s "Max bid" mode (`apps/web`, real `next dev`, not a stub): clicked the "Max bid" tab, entered a maximum, confirmed through the terms/review screen, and the command was submitted as a real `PUT` to the real API. The server-side result matched the REST-level tests exactly (proxy won at one increment above the competing proxy's maximum, not at the full amount entered), and the "Current bid"/"Next valid bid" display -- flagged as a possible lag in the prior session -- did update correctly via the live Socket.IO `bid:accepted` event within a few seconds, so that earlier note was propagation delay, not a persistent bug.

Two real, previously-unconfirmed things found while setting this up (both environment/config gaps, not business-logic bugs):

- `apps/api/src/main.ts`'s CORS `origin` allowlist is `[environment.webBaseUrl, environment.adminBaseUrl]`, defaulting to `http://localhost:3000`/`:3001`. Running the buyer web dev server on any other port (needed this session because an unrelated project already held port 3000) silently CORS-blocks every browser-side fetch with no server-side error -- confirmed via the browser console (`Access to fetch ... has been blocked by CORS policy`). Not a bug: the fix is simply to set `WEB_BASE_URL` to match whatever origin the web dev server actually runs on.
- A stale **production** `apps/web/.next` build directory (left over from an earlier `build:cloudflare` quality-gate run) can be picked up by a subsequent `next dev` on the same port and serve cached/prerendered 404s for real dynamic lot IDs even though `dynamicParams = true` is correctly set in source -- deleting `.next` before starting `next dev` resolved it. Worth remembering as a recurring local-dev gotcha given `build:cloudflare` runs are part of this task's own quality gates.
- Also confirmed by reading `apps/api/src/bidding/bidding.controller.ts`: the contract-documented `DELETE /lots/{lotId}/proxy-bid` (cancel) and `GET /lots/{lotId}/my-proxy-bid` routes (`packages/contracts/src/rest.ts`) have no server implementation at all -- only `PUT proxy-bid` exists. So "no cancel while live" (DEC-017) is currently true by the endpoint simply not existing, not by an explicit guard; worth building the real endpoint (returning a clear "not supported" error, or omitting it from the contract until built) rather than leaving a documented route that 404s.

Outstanding from the original list: outbid/rejected/closed bid states beyond what the above exercised, soft-close extension, and reconnect/gap-resync under a real network drop are still not live-verified.

## Next action

With manual and proxy bidding both now live-verified end-to-end (REST and real browser UI), the next highest-value gaps are: (1) live-verify soft-close extension and reconnect/gap-resync under a real network drop, (2) resolve DEC-022's documented-vs-real contract drift for realtime events (`docs/api-contracts.md` §9 vs. the real flat payloads) so future client work isn't built against the wrong shape again, and (3) decide whether to implement the documented-but-missing `DELETE /lots/:lotId/proxy-bid` and `GET /lots/:lotId/my-proxy-bid` routes or remove them from the contract. After that: a dedicated single-lot/snapshot REST endpoint to replace the current "refetch the whole public lot list" approach in `fetchAuthoritativeLotState`, and diagnosing the Turbopack/`@pioneer/contracts` bundling gap (DEC-019).

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
- Added Task 004 technical correctness handoff on 2026-08-12 at `docs/bidding-engine-handoff.md`, covering the PostgreSQL lock model, idempotency, proxy behavior, soft close, recovery, validation already run, and PostgreSQL-only validation still required.
- Started Task 007 on 2026-08-12: replaced the thin admin placeholder with a responsive EN/AR operations dashboard, lot-management action cards, auction operation controls, approval queue, and audit trail; fixed admin dictionary strings to clean UTF-8.
- `corepack pnpm --filter @pioneer/admin test` passed 3 files / 5 tests after the first admin-core UI slice on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after the first admin-core UI slice on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin lint` passed after the first admin-core UI slice on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin build` passed after the first admin-core UI slice on 2026-08-12.
- Prepared and deployed the admin static Cloudflare preview on 2026-08-12: added admin static export config, `apps/admin/wrangler.jsonc`, and `build:cloudflare`.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/admin build:cloudflare` passed on 2026-08-12 and generated `apps/admin/out`.
- `cmd /c npx wrangler deploy` deployed the admin preview to `https://pioneer-auctions-admin.maaz-n-khan.workers.dev` on 2026-08-12. Wrangler reported version ID `ddacb940-5e94-4ef7-8f0c-2e9b1fa45eff`.
- Continued Task 007 on 2026-08-12: added `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/final-bid-approvals`, `AdminOperationsRepository`, and guarded admin read-model tests.
- `corepack pnpm --filter @pioneer/api exec vitest run test/admin-operations.spec.ts --reporter verbose` passed 1 file / 4 tests on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 4 files / 13 tests after admin read endpoints on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after admin read endpoints on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after admin read endpoints on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after admin read endpoints on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after admin read endpoints on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 13 files / 51 tests with 2 opt-in DB suites skipped after admin read endpoints on 2026-08-12.
- Continued Task 007 on 2026-08-12: added `apps/admin/lib/admin-data.ts` so the admin UI maps `GET /api/v1/admin/dashboard` and `GET /api/v1/admin/final-bid-approvals` into localized UI data when `PIONEER_ADMIN_API_BASE_URL` is configured, with static fallback for Cloudflare preview.
- `corepack pnpm --filter @pioneer/admin test` passed 4 files / 8 tests after admin UI data adapter on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after admin UI data adapter on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin lint` passed after admin UI data adapter on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/admin build:cloudflare` passed after admin UI data adapter on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the admin preview to `https://pioneer-auctions-admin.maaz-n-khan.workers.dev` after admin UI data adapter on 2026-08-12. Wrangler reported version ID `f5b27aa6-8604-4047-912b-6d5990de0b79`.
- Continued Task 007 on 2026-08-12: added audited final-bid approve/reject command skeletons, approved rejection reason validation, write-permission tests, audit metadata assertions, and lifecycle-only repository transitions that preserve hammer price.
- `corepack pnpm --filter @pioneer/api exec vitest run test/admin-operations.spec.ts --reporter verbose` passed 1 file / 8 tests after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 4 files / 17 tests after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after final-bid decision skeletons on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 13 files / 55 tests with 2 opt-in DB suites skipped after final-bid decision skeletons on 2026-08-12.
- Continued Task 007 on 2026-08-12: added approval queue approve/reject UI controls, rejection reason selector, static-preview disabled notice, and approve/reject endpoint metadata on API-loaded queue rows.
- `corepack pnpm --filter @pioneer/admin test` passed 4 files / 8 tests after final-bid decision UI controls on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after final-bid decision UI controls on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin lint` passed after final-bid decision UI controls on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/admin build:cloudflare` passed after final-bid decision UI controls on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the admin preview to `https://pioneer-auctions-admin.maaz-n-khan.workers.dev` after final-bid decision UI controls on 2026-08-12. Wrangler reported version ID `05ca943d-53c7-4176-b113-8b8a1aef88c6`.
- Continued Task 007 on 2026-08-12: added audited auction pause/resume/cancel command skeletons, backend dummy lots behind `PIONEER_ADMIN_DUMMY_LOTS=1`, admin runtime final-bid decision helper, protected API lot-list mapping in the admin data adapter, visible backend lot list, and disabled lot create/edit form shell.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 4 files / 22 tests after auction controls and dummy backend lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin test` passed 5 files / 11 tests after runtime helper and lot UI additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after auction controls and dummy backend lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after auction controls and dummy backend lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after runtime helper and lot UI additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/admin lint` passed after runtime helper and lot UI additions on 2026-08-12.
- `corepack pnpm --filter @pioneer/api build` passed after auction controls and dummy backend lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/api migrate:check` passed after auction controls and dummy backend lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 13 files / 60 tests with 2 opt-in DB suites skipped after auction controls and dummy backend lots on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/admin build:cloudflare` passed after lot UI additions on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the admin preview to `https://pioneer-auctions-admin.maaz-n-khan.workers.dev` after lot UI additions on 2026-08-12. Wrangler reported version ID `67d6ef46-3d63-48d9-aa50-1998f1934087`.
- Continued Task 005 initial buyer-homepage integration on 2026-08-12: added public sanitized `GET /api/v1/lots`, buyer homepage API adapter, dummy-lot static fallback, and homepage rendering from loaded data.
- `corepack pnpm --filter @pioneer/api exec vitest run test/public-lots.spec.ts test/admin-lots-and-payments.spec.ts --reporter verbose` passed 2 files / 4 tests after public dummy lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/web test` passed 4 files / 6 tests after buyer homepage dummy lot adapter on 2026-08-12.
- `corepack pnpm --filter @pioneer/web typecheck` passed after buyer homepage dummy lot adapter on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test:foundation` passed 4 files / 22 tests after public dummy lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/api typecheck` passed after public dummy lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/api lint` passed after public dummy lots on 2026-08-12.
- `corepack pnpm --filter @pioneer/web lint` passed after buyer homepage dummy lot adapter on 2026-08-12.
- `corepack pnpm --filter @pioneer/api test` passed 14 files / 61 tests with 2 opt-in DB suites skipped after public dummy lots on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/web build:cloudflare` passed after homepage dummy lots on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the buyer web preview to `https://pioneer-auctions-web.maaz-n-khan.workers.dev` after homepage dummy lots on 2026-08-12. Wrangler reported version ID `11eca963-c891-4770-93eb-34ef24bfe570`.
- Fixed the buyer web mobile header on 2026-08-12 so it no longer stacks into a tall floating card.
- `corepack pnpm --filter @pioneer/web test` passed 4 files / 6 tests after the mobile header fix on 2026-08-12.
- `corepack pnpm --filter @pioneer/web typecheck` passed after the mobile header fix on 2026-08-12.
- `corepack pnpm --filter @pioneer/web lint` passed after the mobile header fix on 2026-08-12.
- `$env:CLOUDFLARE_PAGES='true'; corepack pnpm --filter @pioneer/web build:cloudflare` passed after the mobile header fix on 2026-08-12.
- `cmd /c npx wrangler deploy` redeployed the buyer web preview to `https://pioneer-auctions-web.maaz-n-khan.workers.dev` after the mobile header fix on 2026-08-12. Wrangler reported version ID `08eba58f-0876-4414-b963-eaa6befd73d5`.
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
- Continued Task 005 on 2026-08-12: added the buyer bid action state machine (`apps/web/lib/bid-session.ts`, `apps/web/lib/bid-command.ts`, rewritten `apps/web/components/bid-panel-shell.tsx`), wired it into `apps/web/app/[locale]/lots/[lotId]/page.tsx`, added `.m3-live-bid-status` tone variants and a `.m3-bid-confirm` block to `apps/web/app/styles.css`, and added `@pioneer/contracts` to `apps/web/next.config.ts`'s `transpilePackages`.
- `corepack pnpm --filter @pioneer/web typecheck` passed after the bid action state machine.
- `corepack pnpm --filter @pioneer/web lint` passed after the bid action state machine.
- `corepack pnpm --filter @pioneer/web test` passed 5 files / 19 tests (13 new in `test/bid-command.spec.ts`) after the bid action state machine.
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after running `prettier --write` once to fix initial formatting).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack) failed twice with "module has no exports" while `bid-command.ts`/`bid-panel-shell.tsx` imported `BidCommandAckSchema`/`formatMoney` as runtime values from `@pioneer/contracts` -- reproduced after adding `@pioneer/contracts` to `transpilePackages` and after clearing `apps/web/.next`, so neither was the cause. Fixed by replacing those two runtime imports with a local hand-written type/parser and a local AED formatter (see DEC-019); `corepack pnpm --filter @pioneer/web build` then passed, generating all 13 static routes including the 6 EN/AR lot-detail pages.
- Not run: `build:cloudflare`, `wrangler deploy`, or any request against a real (non-preview-Worker) NestJS API -- none reachable from this environment; redeploying the static preview was not requested for this change.
- Continued Task 005 on 2026-08-12: added Socket.IO wiring -- `apps/web/lib/lot-socket.ts` (`LotSocketClient`), `apps/web/lib/bid-command.ts`'s `normalizeBidAck`/`BidAckLike`/`NormalizedBidOutcome`, `bid-panel-shell.tsx` updated to open a live lot connection, show realtime current/next bid, and prefer socket submission with REST fallback. Added `socket.io-client@4.8.1` to `apps/web/package.json` (pinned to `apps/api`'s `socket.io@4.8.1`).
- `corepack pnpm install --filter @pioneer/web` passed after adding `socket.io-client`.
- `corepack pnpm --filter @pioneer/web typecheck` passed after Socket.IO wiring.
- `corepack pnpm --filter @pioneer/web lint` passed after Socket.IO wiring.
- `corepack pnpm --filter @pioneer/web test` passed 6 files / 29 tests (9 new in `test/lot-socket.spec.ts`) after Socket.IO wiring.
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after one `prettier --write` pass).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed after Socket.IO wiring, generating all 13 static routes; confirms `socket.io-client` bundles without the DEC-019 issue that blocks `@pioneer/contracts` runtime imports.
- Not run: any request against a real Socket.IO server -- verified `LotSocketClient`'s event/command shapes and auth mechanism against a full read of `apps/api/src/bidding/bidding.gateway.ts`, but no live connection was exercised (same reachability limitation as the REST work).
- Continued Task 005 on 2026-08-13: added proxy (maximum) bidding -- `apps/web/lib/proxy-bid-command.ts`, `LotSocketClient.setProxyBid()` in `lot-socket.ts`, and a third "Max bid" mode in `bid-panel-shell.tsx` with its own mutually-exclusive state machine. Derived from a full read of `apps/api/src/bidding/bidding.service.ts::setProxyBid()`.
- `corepack pnpm --filter @pioneer/web typecheck` passed after proxy bidding.
- `corepack pnpm --filter @pioneer/web lint` passed after proxy bidding.
- `corepack pnpm --filter @pioneer/web test` passed 7 files / 42 tests (13 new: 11 in `test/proxy-bid-command.spec.ts`, 2 more in `test/lot-socket.spec.ts`) after proxy bidding.
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after one `prettier --write` pass).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed after proxy bidding, generating all 13 static routes.
- Not run: any request against a real backend -- `setProxyBid()`'s behavior (including `NOT_BIDDING`/nullable-`currentBid`) was derived from reading server source, not exercised live; same limitation as the rest of Task 005's client work.
- Continued Task 005 on 2026-08-13: search/filter (with a real category-vocabulary bug fix), the `/calendar` route, `generateMetadata` on three pages, and an Arabic `<html lang>`/`dir` fix.
- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web test` passed 8 files / 49 tests (7 new in `test/calendar-data.spec.ts`).
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files.
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed, generating 15 static routes.
- `corepack pnpm --filter @pioneer/web dev` was run and the app was exercised live in the Browser pane (not just build output): confirmed category-chip filtering actually narrows the lot grid, `/en/calendar` groups lots under real dates, per-page `<title>` reflects the new `generateMetadata`, and `document.documentElement.lang`/`dir` are correct on both `/en` and `/ar` after the `HtmlAttributesSync` fix -- verified via injected JS (`document.documentElement.lang`/`dir`), not just visual inspection.
- Operational note for future agents: running `next build` (which `rm -rf`s `.next`) while a `next dev` process on the same app is still running corrupts the dev server's cache and produces misleading 500 errors -- don't run them concurrently against the same `.next` directory; stop `dev` before `build`, or use separate checkouts.
- Continued Task 007 on 2026-08-13: wired every previously-disabled admin write control to real endpoints -- `apps/admin/lib/admin-session.ts` (new), extended `admin-data.ts` (auctions read, session passthrough), fixed `admin-actions.ts`'s `FinalBidDecisionResponse` type drift and added `submitAuctionControl`/`submitCreateAuction`/`submitCreateLot`, three new client components (`approval-queue-panel.tsx`, `auction-operations-panel.tsx`, `lot-management-panel.tsx`), rewired `app/[locale]/page.tsx` to use them, rebuilt the lot form's fields to match `createLotSchema` exactly (dropped the unsupported "featured" checkbox), and fixed the admin app's own `<html lang>`/`dir` bug with `html-attributes-sync.tsx`.
- `corepack pnpm --filter @pioneer/admin test` passed 5 files / 15 tests after the write-action wiring on 2026-08-13.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after the write-action wiring on 2026-08-13.
- `corepack pnpm --filter @pioneer/admin lint` passed after the write-action wiring on 2026-08-13.
- `corepack pnpm exec prettier --check "apps/admin/**/*.{ts,tsx,css}"` initially reported 4 files needing formatting; `prettier --write` fixed them, then typecheck/test/lint were re-run clean.
- `corepack pnpm --filter @pioneer/admin build` (`next build`, Turbopack, non-Cloudflare) passed after the write-action wiring on 2026-08-13, generating `/`, `/en`, `/ar`.
- `CLOUDFLARE_PAGES=true corepack pnpm --filter @pioneer/admin build` (static export mode) also passed on 2026-08-13.
- `corepack pnpm --filter @pioneer/admin dev` was run and exercised live in the Browser pane on both `/en` and `/ar`: confirmed the fully-disabled gated state (8/8 buttons, 23/23 inputs disabled) when `PIONEER_ADMIN_API_BASE_URL` is unset; confirmed the live-session state correctly enables controls except where client-side guards correctly keep them disabled (lot form with zero auctions, approval-queue rows sourced from static-fallback data with no `lotId`); confirmed `document.documentElement.lang`/`dir` are correct on both locales after the `HtmlAttributesSync` fix; submitted the schedule-auction form against a deliberately unreachable API base URL and confirmed the real fetch failure renders the `is-error` status text. Not run: any request against a real NestJS+PostgreSQL backend (none reachable in this environment), so the accepted/2xx response path for any of the four new write commands is unverified end-to-end.
- Continued Task 007 on 2026-08-14: added `GET /api/v1/admin/audit-events` (`AdminOperationsRepository.listAuditEvents`, guarded by `admin.audit.read`), `PATCH /api/v1/admin/auctions/:id` (`AuctionsRepository.update`), `PATCH /api/v1/admin/lots/:id` (`LotsRepository.update`, title/schedule/soft-close fields only), and `POST /api/v1/admin/lots/bulk-import` (`LotsRepository.createMany`, single-transaction all-or-nothing commit via a checked-out `PoolClient`, refactored `LotsRepository.create`/`createMany` to share one `insertLot` helper). Also fixed a real, pre-existing, unrelated `apps/api/tsconfig.build.json` rootDir bug that made `npm run build` fail (the Cloudflare worker directory was being pulled into the `tsc` build target it doesn't belong in).
- `corepack pnpm --filter @pioneer/api exec vitest run test/admin-operations.spec.ts test/admin-auctions.spec.ts test/admin-lots-and-payments.spec.ts --reporter verbose` passed 26 tests on 2026-08-14 after the audit/update endpoints (before bulk import).
- `corepack pnpm --filter @pioneer/api typecheck` passed after the audit/update/bulk-import endpoints on 2026-08-14.
- `corepack pnpm --filter @pioneer/api lint` passed after the audit/update/bulk-import endpoints on 2026-08-14.
- `corepack pnpm --filter @pioneer/api test` passed 15 files / 75 tests with 2 opt-in DB suites skipped after the audit/update/bulk-import endpoints on 2026-08-14 (11 tests in `admin-lots-and-payments.spec.ts` alone, including 5 new bulk-import tests: dry-run, partial-invalid-refusal with per-row error reporting, full-commit, write-permission-required, and empty-rows-rejected).
- `corepack pnpm --filter @pioneer/api build` (`tsc -p tsconfig.build.json`) passed on 2026-08-14 after the `worker/` exclusion fix -- this command had never actually been re-validated since the Cloudflare worker file was added in an earlier session, so this was a real latent break, not a regression from this session's other changes.
- `corepack pnpm exec prettier --check` on all touched `apps/api`/`apps/admin` files passed after one `prettier --write` pass.
- Continued Task 007 on 2026-08-14: wired the audit trail panel, auction row/lot row inline edit affordances (`submitUpdateAuction`, `submitUpdateLot` in `admin-actions.ts`), and a new minimal bulk-import panel (`bulk-import-panel.tsx`, `submitBulkImportLots`) into the admin UI. Added `titleEn`/`titleAr` to `AdminAuctionItem` and expanded `AdminLotItem` with `id`/schedule/soft-close fields so edit forms can be pre-filled with real values, not just the locale-picked display string.
- `corepack pnpm --filter @pioneer/admin test` passed 5 files / 19 tests after the audit/edit/bulk-import UI wiring on 2026-08-14.
- `corepack pnpm --filter @pioneer/admin typecheck` passed after the audit/edit/bulk-import UI wiring on 2026-08-14.
- `corepack pnpm --filter @pioneer/admin lint` passed after the audit/edit/bulk-import UI wiring on 2026-08-14.
- `corepack pnpm --filter @pioneer/admin build` (both normal and `CLOUDFLARE_PAGES=true` static-export modes) passed after the audit/edit/bulk-import UI wiring on 2026-08-14.
- `corepack pnpm exec prettier --check "apps/admin/**/*.{ts,tsx,css}"` passed clean after the audit/edit/bulk-import UI wiring on 2026-08-14.
- `corepack pnpm --filter @pioneer/admin dev` was run again with a deliberately unreachable API base URL and exercised live in the Browser pane on both `/en` and `/ar`: confirmed the audit trail correctly shows the static fallback list (since the fake backend returns nothing, matching the designed graceful-degradation behavior, not a bug); confirmed the bulk-import textarea accepts a pasted JSON array and the Preview button triggers a real fetch that fails against the unreachable backend, rendering `"Failed to fetch"` in the `is-error` style (proving the parse -> submit -> error-render pipeline works end-to-end); confirmed `document.documentElement.lang`/`dir` remain correct on both locales; confirmed no unexpected console errors (only the expected `ERR_CONNECTION_REFUSED` from the deliberately-unreachable fake backend). Not verified live: the auction/lot edit inline forms and the bulk-import commit success path, since the fake backend returns no auctions/lots to click "Edit" on and no real 2xx response is reachable in this environment -- these were verified by typecheck (the edit-mode JSX and its data flow are well-typed) and by the same code-review rigor applied throughout this session, not by a live click-through.
- Installed local PostgreSQL 18 on 2026-08-14 (see "Local PostgreSQL now available" above for full detail); created the `pioneer` role/database, ran `migrate:up` (3 migrations applied cleanly) and `seed:dev`.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test:integration` failed on the first real attempt on 2026-08-14 with `type "citext" does not exist` -- a genuine, previously-undetected bug in `test/bidding-db-fixture.ts`'s isolated-schema `search_path` (excluded `public`, where the `citext` extension's type lives). Fixed.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test:integration` failed again after that fix with `column "registered_at" does not exist` -- a second genuine, previously-undetected bug in `BiddingService.findActiveProxy` (referenced the wrong column name; the real column is `priority_at`). Fixed.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test:integration` and `test:race` both passed on 2026-08-14 after both fixes -- the first time either suite has ever executed successfully, including the 100-concurrent-command same-lot race test.
- Separately, a live `POST /api/v1/admin/lots` call against the real database failed with a raw Postgres `42601` syntax error, revealing a third genuine, previously-undetected bug: `LotsRepository`'s lot-insert SQL had 16 target columns but only 15 `VALUES` placeholders (missing `$15` for `soft_close_maximum_extensions`). Fixed; confirmed working with a follow-up live call.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test` passed 17 files / 77 tests with **zero skipped** on 2026-08-14 after all three fixes.
- `corepack pnpm --filter @pioneer/api typecheck`, `lint`, and `build` (`tsc -p tsconfig.build.json`) all passed after the three fixes on 2026-08-14.
- `corepack pnpm exec prettier --check` on all three fixed files passed clean.
- Full live end-to-end verification performed against the real database on 2026-08-14 via direct HTTP calls and (for admin) a real browser click-through: real auction/lot create, real `PATCH` edit through the actual `Edit`/`Save` UI flow (not just curl), a real 2-row bulk import commit with correct derived increments, a real mixed valid/invalid bulk-import batch that correctly created nothing, a real Arabic-title round-trip confirming no server-side corruption (an earlier apparent corruption was isolated to a Bash/Windows terminal codepage artifact, not a bug, by resending via a UTF-8 file body), the real audit trail panel showing all six real actions for the first time, a real manual bid accepted end-to-end (`ACCEPTED`/`WINNING`, correct ledger and lot-state updates), and a real final-bid approval that preserved the hammer price and wrote a real audit record. Confirmed the buyer web app's lot-detail page 404s for any real lot ID (`dynamicParams = false`, hard-locked to three dummy IDs) -- a real, separate UI-routing gap, not a bidding-engine bug. Not yet exercised live: Socket.IO bidding, proxy bidding, and outbid/rejected/closed bid states.
- A live `POST /api/v1/admin/auctions/:id/cancel` call against a real `DRAFT` auction failed with a 500 immediately after the above, revealing a fourth genuine, previously-undetected bug: `AuctionsRepository`'s shared `pause`/`resume`/`cancel` transition helper compared the `lifecycle` enum column against `ANY($3::text[])`, which Postgres rejects (`42883 operator does not exist`) because an enum column has no default `=` operator against an explicitly-`text[]`-typed array. Fixed by casting the column (`lifecycle::text = ANY($3::text[])`) rather than the array. Confirmed working live afterward for cancel (`DRAFT` -> `CANCELLED`), pause (`LIVE` -> `PAUSED`), and resume (`PAUSED` -> `LIVE`).
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test` passed 17 files / 77 tests with zero skipped again after this fourth fix; `typecheck`, `lint`, `build`, and `prettier --check` all passed clean.
- Continued on 2026-08-14, closing the two structural MVP blockers identified after the above (see "MVP blockers closed" section above for full detail): added `apps/api/src/bidding/auction-open.service.ts` (symmetric `DRAFT` -> `LIVE` counterpart to `AuctionCloseService`) and `apps/api/src/bidding/bidding-lifecycle.scheduler.ts` (in-process 15s interval invoking open/close/outbox-publish, registered in `BiddingModule`), fixed `apps/web/app/[locale]/lots/[lotId]/page.tsx`'s `dynamicParams` (now `true`, checked in) with a new `apps/web/scripts/build-cloudflare.mjs` wrapper to keep the Cloudflare static-export build working, and fixed a real Socket.IO event-shape bug in `apps/web/lib/lot-socket.ts`/`components/bid-panel-shell.tsx` (flat payloads, not the documented `LotEventEnvelope` wrapper -- see DEC-022).
- `corepack pnpm --filter @pioneer/api exec vitest run test/auction-open-service.spec.ts test/bidding-lifecycle-scheduler.spec.ts --reporter verbose` passed 9/9 new tests on 2026-08-14.
- `PIONEER_RUN_DB_TESTS=1 corepack pnpm --filter @pioneer/api test` passed 19 files / 86 tests with zero skipped after the scheduler/open-service addition on 2026-08-14 (one transient timeout in `admin-lots-and-payments.spec.ts` under full-suite load, matching the same known flakiness class already documented elsewhere in this log; passed cleanly alone in 0.5s).
- `corepack pnpm --filter @pioneer/api typecheck`, `lint`, and `build` all passed after the scheduler/open-service addition on 2026-08-14.
- `corepack pnpm --filter @pioneer/web test` passed 8 files / 49 tests, `typecheck` and `lint` passed clean, and both `corepack pnpm --filter @pioneer/web build` (normal) and `build:cloudflare` (via the new wrapper script) succeeded, after the `dynamicParams`/socket-event fixes on 2026-08-14. Confirmed the wrapper script correctly restores `dynamicParams = true` in the working tree after a `build:cloudflare` run (checked via `grep` immediately after) and produces no ESLint findings.
- `corepack pnpm exec prettier --check` on every file touched in this round passed clean.
- Full live end-to-end verification of the complete new path on 2026-08-14: created a real `DRAFT` lot via the admin API with `starts_at` in the past; confirmed it was invisible on `GET /api/v1/lots`; waited 18s with zero manual intervention; confirmed the lot and its parent auction had both auto-transitioned to `LIVE`. Started the buyer web app against the real backend and navigated to that real lot's detail page -- rendered correctly (title, current/next bid, bid panel) where it previously 404'd. Clicked through the actual UI (mode selection, custom amount, terms checkbox, confirm dialog) to place a real bid: accepted, `bid_ledger` updated at sequence 2. This first attempt also surfaced the Socket.IO event-shape bug (a real console error, `Cannot read properties of undefined (reading 'currentBid')`) despite the bid itself succeeding via the REST path; fixed per DEC-022, then placed a second real bid through the UI with zero console errors, landing correctly at sequence 3 with the raised amount. Confirmed no other consumers of the affected event types existed elsewhere in `apps/web` before considering the fix complete.
