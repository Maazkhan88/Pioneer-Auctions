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

## DEC-019 — `apps/web` types against `@pioneer/contracts` but does not bundle it at runtime yet

- Date: 2026-08-12
- Status: accepted, revisit once a fix is confirmed
- Decision: `apps/web/lib/bid-command.ts` defines its own local `BidCommandAck` type and a manual runtime parser (`parseBidCommandAck`) instead of importing `BidCommandAckSchema`/`formatMoney` as runtime values from `@pioneer/contracts`. Type-only imports (`import type { Money, ErrorCode } from "@pioneer/contracts"`) remain in place and are fine.
- Why: `next build` (Turbopack) fails with "module has no exports" for every named export of `packages/contracts/src/index.ts` as soon as `apps/web` imports any *runtime* value from that package -- confirmed independent of `next.config.ts`'s `transpilePackages` list (added `@pioneer/contracts` there too; did not fix it) and independent of the Next.js build cache (reproduced after a clean `.next`). `@pioneer/design-tokens` uses the identical `exports: { ".": "./src/index.ts" }` + `export * from "./x.js"` re-export pattern and bundles fine, so the differentiator is most likely `@pioneer/contracts`'s `zod` runtime dependency interacting badly with Turbopack's resolution of that package's own `node_modules/zod` from within a transpiled workspace package -- not confirmed further. No app in this repo had bundled a runtime `@pioneer/contracts` value through a Next.js build before Task 005 (only `apps/web/test/contracts.spec.ts` under Vitest, which resolves modules differently). The local type + manual parser is hand-verified against the real wire shape (`apps/api/src/bidding/bid.dto.ts`'s `PlaceBidAck`, which `packages/contracts/src/commands.ts`'s `BidCommandAckSchema` is structurally equivalent to) rather than invented.
- Follow-up: diagnose the Turbopack/zod interaction properly (try `serverExternalPackages`, pin/adjust zod's resolved exports, or reproduce with a minimal repro) before any future task relies on importing `@pioneer/contracts` runtime values into `apps/web`/`apps/admin`. `apps/admin` has the same latent exposure (its `lib/*.ts` files also only use local types today) and would hit the identical failure the first time it imports a contracts value at runtime.

## DEC-020 — Local PostgreSQL for development, Docker Desktop unusable on this machine

- Date: 2026-08-14
- Status: accepted, durable environment note for future sessions
- Decision: Local development against a real database uses a native Windows PostgreSQL 18 install (`E:\PostgreSQL`, Windows service `postgresql-x64-18`, port 5432) rather than the `infra/local/compose.yml` Docker Compose stack. The `pioneer`/`pioneer`/`pioneer` role/database (matching `apps/api`'s zero-config default `DATABASE_URL`) was created manually to match what the compose file would have provisioned. `postgres` superuser credentials are not recorded here or in any other repo file -- ask the user directly if superuser access is needed again; routine work only needs the `pioneer` role, which `DATABASE_URL`'s default already covers.
- Why: Docker Desktop requires WSL2 or Hyper-V, both of which require CPU virtualization (VT-x/AMD-V). This machine has no virtualization support (confirmed via `wsl --status` failing and no Docker installation present after the user attempted to install it), so the Compose stack is not an option here. Redis/MinIO/Mailpit (also in the compose stack) remain unavailable locally as a result; nothing built so far has required them at boot (`apps/api/src/config/environment.ts` treats `REDIS_URL`/etc. as optional outside production).
- Follow-up: seeded test-account IDs are DB-generated (`gen_random_uuid()`), not fixed -- re-running `seed:dev` against a fresh database produces new IDs. As of this decision: `admin.test@pioneer.local` = `c03a980a-c442-4694-b205-4520574591f4` (`super_admin`), `buyer.test@pioneer.local` = `bd44b2e8-5e31-4e04-b0bf-cf5b2146192f` (no roles). Query `SELECT id, email FROM accounts` after any reseed to get current values.
