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

- Exact soft-close window and extension policy per category/auction.
- Whether a bidder may lower/cancel an unused proxy maximum, and until when.
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

