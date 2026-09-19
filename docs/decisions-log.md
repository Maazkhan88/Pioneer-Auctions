# Decisions log

Record durable product and architecture decisions here. New entries are append-only; supersede an earlier decision explicitly rather than rewriting history.

## DEC-001 — Modular monolith first

- Date: 2026-07-14
- Status: accepted
- Decision: Build NestJS as a modular monolith with workers and a transactional outbox. Do not begin with independently deployed microservices.
- Why: It keeps auction invariants and financial transactions easier to reason about while preserving domain boundaries for future extraction.

## DEC-002 — Integer fils for money

- Date: 2026-07-14
- Status: accepted
- Decision: All transport and application money values are integer `amountFils`; database columns use integer/numeric types with explicit currency.
- Why: AED has two minor-unit digits and floating-point arithmetic is unacceptable for bids, premiums, tax, deposits, or ledger entries.

## DEC-003 — Server-authoritative, sequence-based live state

- Date: 2026-07-14
- Status: accepted
- Decision: The server decides bid acceptance, current price, leader, reserve status, and close time. Each lot event has a monotonic sequence. Clients recover with snapshots.
- Why: Client clocks and network ordering are unreliable, particularly under reconnects and soft-close pressure.

## DEC-004 — Full web/mobile parity

- Date: 2026-07-14
- Status: accepted
- Decision: The Next.js website is a complete bidding client, not a marketing site. Flutter and web consume the same public contract.
- Why: This is a core product requirement and avoids channel-specific auction outcomes.

## DEC-005 — English and Arabic are MVP requirements

- Date: 2026-07-14
- Status: accepted
- Decision: New screens and components are complete only with localization keys, RTL behavior, and realistic English/Arabic fixtures.
- Why: Arabic parity cannot be safely retrofitted after layout and information hierarchy settle.

## DEC-006 — Transparent closing without hammer-price renegotiation

- Date: 2026-07-14
- Status: proposed; requires business/legal confirmation
- Decision: Final approval may confirm or reject according to a disclosed policy, but may not change the hammer price. Rejection is reasoned, timed, and audited.
- Why: Post-auction price renegotiation is the largest trust risk identified in the product brief.

## DEC-007 — Proxy maximum tie rule

- Date: 2026-07-14
- Status: proposed; requires product confirmation before Task 004 completion
- Decision: When two eligible proxy maxima are equal, the maximum registered first retains/gets priority. The visible current price cannot exceed the winning maximum and advances only as required by the increment rule.
- Why: The rule is deterministic, explainable, and rewards earlier commitment without revealing maxima.

## DEC-008 — Foundation toolchain pins

- Date: 2026-07-14
- Status: accepted for scaffold; revalidate during Task 001
- Decision: Pin Node.js 24.18.0 LTS, pnpm 11.4.0, and Flutter 3.44.0 stable.
- Why: Node 24 is the current LTS line and matches the local environment; pnpm 11.4 is a mature v11 pin with the relevant integrity fix, and Flutter 3.44 is the stable SDK line at scaffold time. Exact app-framework versions are selected and compatibility-tested in Task 001 rather than guessed here.

## DEC-009 — Task 001 application framework pins

- Date: 2026-07-14
- Status: accepted
- Decision: Pin NestJS 11.1.28 for the API, Next.js 16.2.10 and React 19.2.7 for web/admin, TypeScript 5.9.3, ESLint 9.39.5, and Vitest 4.1.10. Hold ESLint at the newest v9 release until Next.js's bundled lint plugins support v10.
- Why: These exact versions pass install, peer-dependency, strict type, test, and production-build validation together. Exact pins keep parallel agents and CI reproducible.

## DEC-010 — Zod-first transport contracts and generated consumers

- Date: 2026-07-15
- Status: accepted
- Decision: Zod 4 schemas are the executable source for v1 transport validation and inferred TypeScript types. Native JSON Schema conversion feeds an OpenAPI 3.1 document and Quicktype-generated Dart models. Checked-in JSON fixtures are shared by TypeScript and Dart compatibility tests; generated artifacts must reproduce byte-for-byte in CI.
- Why: One runtime schema source rejects malformed external input while producing standard JSON Schema/OpenAPI artifacts and consumer models. This removes handwritten TypeScript/schema duplication and lets Flutter consume the same field names and golden payloads without semantic renaming.

## DEC-011 — Public contract compatibility and rollout policy

- Date: 2026-07-15
- Status: accepted
- Decision: v1 consumers must tolerate additive object fields but fail safely on unknown event names and required enum values. Adding optional fields or enum-independent endpoints is additive. Removing/renaming fields, making optional fields required, changing meaning/units, adding required enum variants without fallback, or changing event/command semantics is breaking and requires a new versioned namespace/base path, a documented overlap window, and minimum supported client versions.
- Why: Mobile clients cannot be upgraded atomically with the server. Explicit classification and overlapping rollout keep older clients safe while server authority and event observability remain intact.

## Open decisions

- Deposit eligibility model: fixed hold, category/auction hold, or purchasing-power ratio.
- Reserve disclosure wording and whether to disclose range/threshold in any category.
- Final-bid rejection taxonomy and SLA.
- Fee calculation order, VAT treatment, rounding, and invoice jurisdiction details.
- Flutter state management, navigation, networking, and localization packages.
- Search engine introduction threshold.

## DEC-012 — Flutter package decisions for mobile app

- Date: 2026-07-15
- Status: accepted
- Decision: Select the following standardized package stack for the Flutter mobile application (`apps/mobile`):
  1. **State Management:** `flutter_bloc` / `cubit` (standardized, unidirectional data flow, highly testable with block_test).
  2. **Navigation:** `go_router` (declarative routing, URL parsing, and native deep linking compatibility).
  3. **Localization:** `easy_localization` (supports JSON localization files, enabling format parity with Next.js).
  4. **Networking:** `dio` (robust networking client with interceptors for attaching correlation headers).
- Why: Provides maximum architectural parity with the web interfaces, enforces strict separation of concerns, and accelerates onboarding of parallel contributors without framework styling conflicts.

## DEC-013 — Dummy payment provider for testing

- Date: 2026-08-11
- Status: accepted for local/MVP test environments only
- Decision: Use a dummy payment gateway provider during backend and UI testing. The payment module must still expose a provider interface and ledger-safe state transitions so Network International, Telr, or Checkout.com can replace the dummy provider without changing auction/deposit domain rules.
- Why: External payment onboarding is not needed to test deposits, eligibility, invoices, and buyer flows. A dummy provider keeps development moving while avoiding any dependency on real cards or live gateway credentials.

## DEC-014 — MVP bidding policy defaults

- Date: 2026-08-11
- Status: accepted
- Decision: Use the recommended bidding policies for MVP. Manual/custom bids must align to the configured increment step. Equal proxy maxima are won by the earlier registered maximum. Active proxy maxima can be created or raised, but not lowered or cancelled while the lot is live. Soft-close defaults to a 2-minute window and 2-minute extension, and the extension is added to the previous published close time. Admin may override soft-close timing per lot.
- Why: These rules are deterministic, explainable to bidders, and avoid clock/client-latency disputes.

## DEC-015 — Lot increment configuration model

- Date: 2026-08-11
- Status: accepted
- Decision: Minimum bid increments are stored as resolved integer fils on each lot. Admin can derive that resolved increment from a percentage of the starting price or set a custom per-lot increment. The bidding engine evaluates only the resolved integer-fils increment.
- Why: Percentage defaults make bulk lot setup faster, while per-lot custom increments are necessary for unusual assets. Resolving to fils before bidding keeps the engine simple and avoids changing increments after bidding starts.

## DEC-016 — PostgreSQL-serialized bidding boundary for MVP

- Date: 2026-08-11
- Status: accepted for MVP implementation
- Decision: Start the bidding engine with a PostgreSQL transaction and `FOR UPDATE OF lots` row lock as the authoritative serialization boundary. Redis remains planned for recoverable live-state acceleration and fan-out, but accepted bids are not acknowledged until the PostgreSQL ledger, lot state update, command result, and outbox event are committed.
- Why: This gives one deterministic order per lot with fewer moving parts during MVP hardening. It satisfies the durable-ledger invariant first; Redis optimization can be added after race/recovery tests prove the database boundary.

## DEC-017 — Proxy raise priority timestamp

- Date: 2026-08-12
- Status: accepted for MVP implementation
- Decision: Raising an active proxy maximum updates that bidder's current proxy priority timestamp. Equal maximums are therefore won by the bidder who registered that effective maximum earlier, not by a stale lower maximum that was later raised.
- Why: This keeps the equal-maximum tie rule auditable and fair: priority belongs to the committed maximum currently being compared.

## DEC-018 — Cloudflare public preview API for dummy lots

- Date: 2026-08-12
- Status: accepted for preview/testing only
- Decision: Add a self-contained Cloudflare Worker under `apps/api/worker/public-preview.ts` that serves `GET /api/v1/lots` and `/health` with backend-shaped dummy lot data. Use this Worker as `PIONEER_PUBLIC_API_BASE_URL` for static buyer-web preview deployments.
- Why: The real NestJS API is a long-running Express/Nest server and is not directly deployable as a simple Cloudflare Worker. A small preview API lets remote/mobile stakeholders see homepage/detail data loaded from an API-shaped endpoint now, without changing the production backend target of NestJS/PostgreSQL/Redis on AWS.

## DEC-019 — `@pioneer/contracts` packaging and Next.js Turbopack bundling

- Date: 2026-08-12 (updated 2026-09-09)
- Status: resolved
- Decision: `packages/contracts/package.json` exports its compiled distribution (`main: ./dist/index.js`, `types: ./dist/index.d.ts`, and conditional export `{"types": "./dist/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js"}`). Turbopack and other Next.js/bundler consumers import the compiled ESM artifacts from `dist/` where all `.js` relative imports exist on disk.
- Root cause diagnosed on 2026-09-09: The original hypothesis that `zod` was causing Turbopack resolution failure was incorrect. In TypeScript `NodeNext` mode, relative imports in `src/index.ts` must use `.js` extensions (`export * from "./core.js"`). When `package.json` pointed exports directly to `./src/index.ts`, Turbopack attempted to resolve `./core.js` inside `src/` where only `.ts` existed. Turbopack failed to resolve each relative `.js` import, leaving `src/index.ts` with zero exports ("module has no exports at all"). Pointing package entry points to `dist/index.js` (built via `tsc -p tsconfig.build.json`) completely eliminates the issue.
- Production runtime proof & build ordering: `CONTRACT_VERSION` is imported as a runtime value in production-bundled code across both `apps/web` (`apps/web/lib/bid-command.ts`) and `apps/admin` (`apps/admin/lib/admin-actions.ts`), and verified with Next.js Turbopack builds (`next build` and Cloudflare static export). Workspace builds via Turborepo (`turbo build` with `dependsOn: ["^build"]`) and `pnpm -r build` automatically build `@pioneer/contracts` before apps; standalone app builds require `corepack pnpm --filter @pioneer/contracts build` first.

## DEC-020 — Local PostgreSQL for development, Docker Desktop unusable on this machine

- Date: 2026-08-14
- Status: accepted, durable environment note for future sessions
- Decision: Local development against a real database uses a native Windows PostgreSQL 18 install (`E:\PostgreSQL`, Windows service `postgresql-x64-18`, port 5432) rather than the `infra/local/compose.yml` Docker Compose stack. The `pioneer`/`pioneer`/`pioneer` role/database (matching `apps/api`'s zero-config default `DATABASE_URL`) was created manually to match what the compose file would have provisioned. `postgres` superuser credentials are not recorded here or in any other repo file -- ask the user directly if superuser access is needed again; routine work only needs the `pioneer` role, which `DATABASE_URL`'s default already covers.
- Why: Docker Desktop requires WSL2 or Hyper-V, both of which require CPU virtualization (VT-x/AMD-V). This machine has no virtualization support (confirmed via `wsl --status` failing and no Docker installation present after the user attempted to install it), so the Compose stack is not an option here. Redis/MinIO/Mailpit (also in the compose stack) remain unavailable locally as a result; nothing built so far has required them at boot (`apps/api/src/config/environment.ts` treats `REDIS_URL`/etc. as optional outside production).
- Follow-up: seeded test-account IDs are DB-generated (`gen_random_uuid()`), not fixed -- re-running `seed:dev` against a fresh database produces new IDs. As of this decision: `admin.test@pioneer.local` = `c03a980a-c442-4694-b205-4520574591f4` (`super_admin`), `buyer.test@pioneer.local` = `bd44b2e8-5e31-4e04-b0bf-cf5b2146192f` (no roles). Query `SELECT id, email FROM accounts` after any reseed to get current values.

## DEC-021 — In-process lifecycle scheduler for lot open/close, not an external cron

- Date: 2026-08-14
- Status: accepted for MVP, revisit for production
- Decision: `apps/api/src/bidding/bidding-lifecycle.scheduler.ts` runs an in-process `setInterval` (every 15s, started via `OnApplicationBootstrap`, guarded off when `NODE_ENV=test`) that calls the new `AuctionOpenService.openDueLots()`, the existing `AuctionCloseService.closeDueLots()`, and `BiddingGateway.publishPendingOutboxEvents()` on every tick. No new dependency was added (no `@nestjs/schedule`); the interval is plain Node.
- Why: `AuctionCloseService` already existed, fully built and tested, but was never invoked by anything -- confirmed by grepping the entire `apps/api/src` tree for its method name and finding zero call sites outside its own spec file. There was no scheduling infrastructure anywhere in this app (also confirmed: `BiddingGateway.publishPendingOutboxEvents` had the identical problem). Without automation, a lot's `starts_at`/`closes_at` were purely decorative -- nothing ever transitioned a lot out of `DRAFT`, which meant the buyer web app's live bidding UI (built across Task 005) had no real lot it could ever reach, since `PublicLotsController` filters out `DRAFT` lots entirely. This was found and fixed while explicitly chasing MVP-blocking gaps, not as a routine addition.
- Follow-up: a real production deployment likely wants `AuctionOpenService`/`AuctionCloseService`/outbox-publish invoked by an externally-scheduled job (k8s CronJob, systemd timer, etc.) instead of an always-on in-process timer, matching the batch-oriented, idempotent (`FOR UPDATE SKIP LOCKED`) design both services already have. The 15s interval is an MVP-simplicity choice, not a tuned production value.
- Also fixed in the same pass: there is no `SCHEDULED` intermediate lifecycle state anywhere in the running code (nothing ever sets or reads it, despite the `auction_lifecycle` enum and some allowed-transition lists mentioning it) -- `AuctionOpenService` transitions lots/auctions directly `DRAFT` -> `LIVE` rather than inventing a workflow around an unused state.

## DEC-022 — Realtime lot events are flat payloads, not the documented `LotEventEnvelope<Name, Data>` wrapper

- Date: 2026-08-14
- Status: accepted, `apps/web` now matches the real server; `docs/api-contracts.md` is not yet corrected
- Decision: `apps/web/lib/lot-socket.ts`'s `BidAcceptedEvent`/`AuctionStateChangedEvent`/`AuctionExtendedEvent`/`ReserveStatusChangedEvent` types are flat objects (`{auctionId, lotId, sequence, ...eventFields}`) rather than the enveloped `{auctionId, lotId, sequence, data: {...eventFields}}` shape `docs/api-contracts.md` §9 documents via a `LotEventEnvelope<Name, Data>` generic.
- Why: found live, for the first time this engagement having a reachable real lot to test against. Connecting a real Socket.IO client and placing a real bid crashed `BidPanelShell`'s `onBidAccepted` handler with `Cannot read properties of undefined (reading 'currentBid')`, because it read `event.data.currentBid` per the client's (doc-accurate) type, but the real server -- `BiddingOutboxPublisher.publishPendingEvents`'s `server.to(room).emit(row.event_name, row.payload)` -- emits `outbox_events.payload` completely unwrapped. Every outbox-writing call site (`bidding.service.ts`'s `bid:accepted`/`bid:status-changed` writes, `auction-close.service.ts` and the new `auction-open.service.ts`'s `auction:state-changed` writes) constructs a flat object with `event: "<name>"` as just one more field, not a `data` sub-object. `LotSnapshotEvent.state` is a genuine, confirmed exception -- `BiddingService.getLotSnapshot()` really does nest lot state under a `state` key, matching both the doc and the client.
- Also confirmed: `auction:extended` and `reserve:status-changed` are never emitted by any code in `apps/api` today (soft-close extension surfaces via `bid:accepted`'s `extended` boolean instead of a standalone event) -- their client-side types/handlers were flattened for consistency but remain unreachable dead code until the server adds those events for real.
- Follow-up: `docs/api-contracts.md` §9's `LotEventEnvelope` documentation does not match the real server and should be corrected (or the server changed to match the doc, which is the more invasive option since it touches every outbox-writing call site) before any other client is built against it. Whichever direction is chosen, `apps/web` and `docs/api-contracts.md` must not be allowed to silently diverge again -- this bug was invisible to every unit test (they mock the socket/repository layer) and was only found by finally exercising a live socket connection.

## DEC-023 — Explicit MVP proxy cancellation rejection

- Date: 2026-08-15
- Status: accepted for MVP implementation
- Decision: Implement `GET /api/v1/lots/:lotId/my-proxy-bid` and `DELETE /api/v1/lots/:lotId/proxy-bid` in the API. `GET` returns only the authenticated bidder's active maximum and latest public lot state. `DELETE` exists but always returns a versioned non-retryable `REJECTED` acknowledgement with `VALIDATION_FAILED` because live proxy cancellation is not supported for MVP.
- Why: The routes were already documented in the contract inventory, but only `PUT /proxy-bid` existed in the server. Returning an explicit rejection for cancellation is safer than a 404 and keeps client behavior deterministic while preserving the current raise-only proxy policy.

## DEC-024 — Realtime event contract drift resolution, single-lot REST endpoint, and live verification

- Date: 2026-09-09
- Status: accepted
- Decision:
  - Formally aligned `docs/api-contracts.md` §9 and `packages/contracts/src/events.ts` with the flat lot event outbox payloads (`bid:accepted`, `auction:state-changed`, `auction:extended`, `reserve:status-changed`, `lot:presence-changed`). Personal events (`bid:status-changed`) on `user:{accountId}` rooms remain enveloped under `data` for account-scoped delivery. Golden fixtures, OpenAPI schema, and Dart models were updated and regenerated with zero drift.
  - Aligned personal realtime event (`bid:status-changed`) contract: added generated UUID `eventId` server-side in `BiddingService.writePersonalBidStatusOutbox` matching `personalEventSchema`. Made `currentBid` nullable in `MyBidStatusChangedEventSchema` and `docs/api-contracts.md` §10 to support pre-bid proxy registration. Verified contract schema validation across unit tests (`bidding-service.spec.ts`) and live-PostgreSQL integration tests (`bidding-integration.spec.ts`).
  - Implemented `GET /api/v1/lots/:lotId` returning `PublicLotCard` in both `apps/api/src/auctions/public-lots.controller.ts` (with `LotsRepository.findById`) and the preview Cloudflare worker `apps/api/worker/public-preview.ts`. Returns 404 with `LOT_NOT_FOUND` if nonexistent or if lot lifecycle is `DRAFT`. Marked `GET /lots` and `GET /lots/{lotId}` as `contracted` in `packages/contracts/src/rest.ts`.
  - Updated `apps/web/lib/bid-command.ts`'s `fetchAuthoritativeLotState` to fetch `GET /api/v1/lots/:lotId` directly instead of fetching and filtering the full public lot array.
  - Added database integration test verifying soft-close extension (`extended: true`, `extensionCount` increments, `closes_at` extended by 120s) against real PostgreSQL row locks and transactions in `apps/api/test/bidding-integration.spec.ts`.
  - Added test coverage in `apps/web/test/lot-socket.spec.ts` for socket reconnect with `afterSequence` catch-up and sequence gap detection triggering `lot:sync` and snapshot application. Added `lot:sync` with `replay` coverage to `apps/api/test/bidding-gateway.spec.ts`.
  - Successfully redeployed all three Cloudflare previews: API preview worker (`8adf2ea1-d058-475f-acba-7cb5a25f207a`), buyer web preview (`8d96c41f-608c-4f70-98bf-8cc59031f8ee`), and admin preview (`bf43f3f9-91c4-4e7a-bd06-b9b890a25a11`).
- Why: Closes DEC-022's documented drift, brings executable contracts in sync with production behavior, eliminates inefficient full-list refetch on the buyer detail page, and verifies real database and socket resilience under edge cases.

## DEC-023: Authoritative Mobile Bidding State Machine, Idempotency Command Key Preservation, and Multiplatform Scaffolding

- Date: 2026-09-14
- Status: Accepted
- Context: Following the review of Task 006 (`350e16f`), 13 blocking findings were identified regarding optimistic bid simulation, slider haptics, Socket.IO contract drift, REST authentication & decoding, missing Android permissions, missing iOS platform scaffolding, and Arabic BiDi formatting.
- Decision:
  - **Authoritative Bid State Machine**: Replaced optimistic bid simulations with `BidStateMachine` across 10 discrete lifecycle states (`idle`, `confirming`, `submitting`, `accepted`, `rejected`, `unknown`, `outbid`, `gated`, `closed`, `resyncing`). Zero simulated winning states are permitted.
  - **Idempotency Command Key Preservation**: Implemented RFC 4122 v4 UUID `commandId` generation with guaranteed preservation across transport timeouts (`ApiUnknown`) and retry attempts, matching backend deduplication invariants.
  - **Authoritative Controls & Haptics**: Redesigned `PioneerSlideToBid` to act solely as a submission trigger (`onSubmitRequested`), removing optimistic "BID CONFIRMED!" banners. Haptic feedback occurs exclusively upon authoritative server ack (`heavyImpact` for `ACCEPTED`, `vibrate` for `REJECTED`). Added accessible "Tap to Bid" alternative and RTL slider support.
  - **Fee Breakdown & Terms Gate**: Implemented `BidConfirmationSheet` displaying fee calculations (5% buyer's premium, 500 AED minimum, 5% VAT) and terms-acceptance gate linked to `termsVersionId`.
  - **Socket.IO Realtime Gateway Alignment**: Configured connection on namespace `/auctions/v1`, flat public events (`server:hello`, `lot:snapshot`, `bid:accepted`, `auction:extended`, `auction:state-changed`, `reserve:status-changed`, `lot:presence-changed`), and enveloped personal events (`bid:status-changed`, `proxy-bid:changed`, `eligibility:changed`). Obsolete events (`lot:bid-placed`, `lot:going-once`) were completely removed.
  - **Reconnect & Gap Recovery**: Implemented `lot:subscribe` with `afterSequence`, gap detection triggering `lot:sync`, foreground resync lifecycle hooks, and server-time clock offset synchronization.
  - **REST Authentication & Public Lot Decoding**: Standardized `x-pioneer-test-account-id` in lowercase with valid UUIDs, added `Idempotency-Key` header, environment configuration via `--dart-define`, and verified decoding for `GET /api/v1/lots` (`PublicLotsResponse`) and `GET /api/v1/lots/:lotId` (`PublicLotCard`).
  - **Platform Scaffolding & Permissions**: Added `<uses-permission android:name="android.permission.INTERNET"/>` in `apps/mobile/android/app/src/main/AndroidManifest.xml`, and scaffolded canonical iOS project structure under `apps/mobile/ios/` (`com.pioneer.pioneerMobile`). Disabled Kotlin incremental compilation in `gradle.properties` (`kotlin.incremental=false`) to eliminate cross-drive Windows file root crashes during AGP builds.
  - **BiDi Safety & Dark Theme**: Wrapped all monetary amounts, countdowns, and identifiers with Unicode LTR isolates (`\u202A...\u202C`) to prevent numeral reversal in Arabic RTL contexts. Added complete dark theme tokens and `PioneerTheme.darkTheme`.
  - Task Lifecycle Status: Explicitly retained Task 006 status as **In Progress** because native iOS build and UI testing require a macOS/Xcode runner.
- Why: Guarantees contract parity across Web and Flutter, eliminates risk of phantom bids or double-bidding under network latency, and ensures high resilience under mobile connectivity interruptions.

## DEC-025: Integer Fils Preservation and Round-Half-Up UAE Auction Fee Arithmetic (Remediation DEC-020)

- Date: 2026-09-18
- Status: Accepted
- Context: In the review of `bba6e1f..01ec557`, financial calculations in mobile bidding UI were found to use integer floor division (`~/ 100`) to convert intermediate fils to AED, discarding fractional AED (fils). For example, a hammer price of AED 85,000 (8,500,000 fils) with 5% buyer's premium (425,000 fils) and 5% VAT (21,250 fils) resulted in displaying AED 212 VAT and AED 89,462 total instead of the exact AED 212.50 VAT and AED 89,462.50 total.
- Decision:
  - **Exact Fils Representation**: All monetary values throughout mobile state, calculations, contracts, and displays remain in pure integer fils (1 AED = 100 fils). Integer-truncating AED getters (`hammerPriceAed`, `buyerPremiumAed`, `vatAed`, `totalAed`) using `~/ 100` are deleted.
  - **Round-Half-Up Basis Point Arithmetic**: Intermediate fee calculations involving basis points (`bps`) use integer round-half-up:
    `((amountFils * bps) + 5000) ~/ 10000`.
    This resolves fractional-fil intermediate calculations deterministically without floating-point drift. (Note: This is an internal platform rounding standard and is not asserted as a UAE statutory rule without legal/accounting confirmation).
  - **Fils-Preserving Currency Formatter**: Implemented `PioneerFormatters.formatFils(int amountFils, {String symbol = 'AED', bool isolate = true})`. When `amountFils % 100 == 0`, displays without decimals (`AED 85,000`). When non-zero fils exist, displays with exactly 2 decimal places (`AED 89,462.50`). Preserves Unicode LTR isolates (`\u2066...\u2069`) for BiDi Arabic context safety.
- Why: Eliminates financial inaccuracies, ensures the buyer is billed and presented with exact fils amounts down to the exact 0.01 AED, avoids floating-point precision hazards, and guarantees legal and accounting precision.

## DEC-026: Authoritative Fail-Closed KYC Lifecycle, Provider Boundary, and Date Formats

- Date: 2026-09-18
- Status: Accepted
- Context: In the review of `bba6e1f..01ec557`, KYC was found to fail open on database errors, default mobile state to verified, accept fake bypasses, conflate general account status with KYC status, and use unversioned endpoints.
- Decision:
  - **Versioned & Authenticated Route Prefix**: All KYC client routes are mounted strictly under `/api/v1/me/kyc` and require session authentication. Missing, invalid, or unresolvable account context returns 401 Unauthorized.
  - **Independent Status Separation**: `accounts.kyc_status` (`NOT_STARTED`, `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED`) is canonical for bidding eligibility and is decoupled from `accounts.status` (`PENDING`, `ACTIVE`, `SUSPENDED`, `LOCKED`). Submissions update `accounts.kyc_status` without altering general account status.
  - **Fail-Closed Provider Boundary**: Defined `KycProvider` interface (`startSession`, `submit`, `getStatus`). Database or provider outages return 503 `PROVIDER_UNAVAILABLE` with `retryable: true` and never report `VERIFIED`.
  - **Safe Development Fake Provider**: `DevelopmentFakeKycProvider` is enabled strictly in dev/test via Nest DI token `KYC_PROVIDER`. It throws an explicit fatal exception if initialized when `NODE_ENV === 'production'`.
  - **Calendar Date-Only Wire Format**: Date of birth and document expiry dates use `IsoDateSchema` (`YYYY-MM-DD`), preventing timestamp/timezone corruption.
  - **Privacy & Audit Logging**: Sensitive PII (full Emirates ID numbers, full names, biometric images, document references) is redacted from application logs and security audit records.
  - **Online vs Live-Hall Boundary**: Pioneer timed online auctions and live-hall auctions have separate lifecycles. Timed soft-close bidding extensions (2-minute window) apply to online timed auctions only and are not conflated with live auctioneer calls.
- Why: Ensures regulatory compliance, prevents fraudulent bidding bypasses, protects buyer privacy, and guarantees system resilience under network and provider downtime.

## DEC-027: Append-Only Balanced Deposit Ledger, Hosted Checkout Lifecycle, and Idempotent Webhook Processing

- Date: 2026-09-19
- Status: Accepted
- Context: In Task 009, implementing security deposits, payment intents, and refund lifecycle required an authoritative, audited financial model preventing double crediting, unbacked bids, and unsafe storage of card data.
- Decision:
  - **Append-Only Financial Ledger**: `deposit_ledger` is strictly append-only. Balance is derived dynamically as `COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_fils ELSE -amount_fils END), 0)`. Negative balances are prevented by database check constraints (`CHECK (amount_fils > 0)`) and service-level pre-validation. All monetary values are tracked in pure integer fils per DEC-025.
  - **Hosted Checkout Lifecycle**: Pioneer servers never collect, process, or store raw credit card numbers or secrets (PCI-DSS out-of-scope compliance). Clients request a hosted session via `POST /api/v1/deposit-payment-intents`, and the client opens the returned hosted payment gateway URL.
  - **Authoritative Clearance via Signed Webhooks Only**: Client return URLs (`returnUrl`) NEVER credit the user's ledger or grant bidding eligibility. Clearance occurs exclusively upon receiving a cryptographically verified webhook from the payment provider.
  - **Idempotent Webhook Ingestion**: Webhook signatures are verified via HMAC-SHA256 (`PaymentProvider.verifyWebhookSignature`). Ingestion is recorded in `payment_webhook_inbox (provider, event_id)` with a unique constraint. Duplicate webhook deliveries are acknowledged with 200 OK without re-executing ledger mutations. Webhook inbox recording, intent status update, and deposit ledger insertion execute in a single PostgreSQL transaction.
  - **Safe Development Provider Boundary**: `DummyPaymentProvider` validates HMAC-SHA256 signatures, parses payloads with Zod, generates deterministic hosted payment URLs, and throws an explicit fatal exception if instantiated when `NODE_ENV === 'production'` without live provider credentials.
  - **Deposit Refund Lifecycle**: Refund requests (`POST /api/v1/deposit-refund-requests`) follow a state machine: `REQUESTED` -> `COMPLETED` / `REJECTED`. Refunds require that the requested amount does not exceed the available unheld balance, state a 3–5 business day SLA, and require two-step administrative approval or rejection with audited notes (`POST /api/v1/admin/deposit-actions`).
  - **Authoritative Deposit Gating**: `lots.required_deposit_fils` configures required security deposits on restricted or high-value lots. The mobile bidding flow (`BidConfirmationSheet`) evaluates available deposit balance before submission and routes users directly to `/account/deposits` when additional deposit funds are required.
- Why: Guarantees financial ledger integrity, prevents race conditions and double crediting from webhook replays, preserves PCI-DSS compliance, and prevents unbacked or unauthorized bidding.

## DEC-028: Multi-Channel Notification Dispatch, Idempotent Outbox Delivery, Bilingual BiDi Templates, and Quiet Hours Policy

- Date: 2026-09-19
- Status: Accepted
- Context: In Task 010, implementing transactional notifications, user preference management, and device token registration across in-app, push, email, and SMS required an authoritative, deduplicated architecture respecting user privacy, time zones, BiDi Arabic text rendering, and high-frequency live bidding concurrency.
- Decision:
  - **Deduplicated Multi-Channel Outbox Architecture**: Implemented `notifications` (in-app display feed) and `notification_intents` (delivery tracking across `PUSH`, `EMAIL`, `SMS`) with unique constraints on `(account_id, dedupe_key)` and `(account_id, channel, dedupe_key)`. Real-time socket delivery is achieved by appending `notification:created` events into the PostgreSQL transactional `outbox_events` table targeting the private user room (`user:{accountId}`), ensuring transactional atomicity with core auction and deposit workflows.
  - **Bilingual BiDi & Lock-Screen Privacy Formatting**: Implemented `TemplateEngineService` covering all 11 notification event types (`BID_CONFIRMED`, `OUTBID`, `PROXY_EXCEEDED`, `ENDING_SOON`, `AUCTION_EXTENDED`, `WINNER_PENDING_APPROVAL`, `BID_APPROVED`, `BID_REJECTED`, `DEPOSIT_CREDITED`, `REFUND_PROCESSED`, `REFUND_REJECTED`). All numeric and currency amounts are formatted in pure integer fils per DEC-025 and wrapped with Unicode BiDi LTR isolate characters (`\u2066...\u2069`) to prevent numeral reversal in Arabic RTL contexts. Push notification bodies enforce lock-screen privacy by withholding raw max proxy limits and sensitive personal details while providing actionable deep-link paths (`/lot/:lotId`, `/account/deposits`).
  - **Quiet Hours Policy with Time-Critical Live Bidding Bypass**: User quiet hours are evaluated in the `Asia/Dubai` (GST, UTC+4) timezone. Time-critical live bidding alerts (`OUTBID`, `PROXY_EXCEEDED`, `WINNER_PENDING_APPROVAL`, `AUCTION_EXTENDED`) immediately bypass quiet hours to protect buyers from missing competitive auction events. Non-critical notifications (such as milestone reminders and marketing announcements) are suppressed or queued during active quiet hours.
  - **Provider Boundary Abstraction & Production Guards**: Defined `PushNotificationProvider` and `EmailNotificationProvider` interfaces. Implemented `DevelopmentPushProvider` (in-memory test sink with diagnostic logging) and `DevelopmentEmailProvider` (local Mailpit at port 1025), each equipped with fatal production assertion guards if loaded when `NODE_ENV === 'production'` without live provider configurations.
  - **Material 3 Expressive Mobile Notification Center & Preferences**: Delivered `NotificationCenterScreen` (`/notifications`) featuring category filter chips ("All", "Bids", "Deposits", "Reminders"), date grouping ("Today", "Yesterday", "Earlier"), unread indicator dots, tap-to-read with deep link routing, and "Mark all as read" app bar action. Delivered `NotificationPreferencesScreen` (`/account/notifications`) supporting channel switches, alert category toggles, Dubai timezone quiet hours time pickers, and time-critical bypass advisory banners. Connected app header bell icon and account dashboard to notification routes.
- Why: Guarantees reliable, deduplicated delivery across channels without spamming users, preserves privacy and financial accuracy, provides seamless bilingual UX in both English and Arabic, and protects buyer bids during live auction events.

