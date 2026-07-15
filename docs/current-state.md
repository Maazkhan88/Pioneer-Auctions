# Current state

Last updated: 2026-07-15

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
- No database migrations or runnable bidding engine.
- No connected UAE PASS, payment, KYC, push, email, or SMS provider.
- No production cloud resources.

## Active task

None. Task 003 was completed on 2026-07-15. The next owner should claim Task 004.

| Task                   | Owner        | Branch                             | Status             | Notes                                     |
| ---------------------- | ------------ | ---------------------------------- | ------------------ | ----------------------------------------- |
| 001 Foundation         | Codex        | `agent/task-001-foundation`        | Complete           | Scaffold, local services, CI              |
| 002 Contracts          | Codex        | `agent/task-002-runtime-contracts` | Complete           | Runtime schemas and compatibility harness |
| 003 Design system      | Antigravity  | `agent/task-003-design-system`     | Complete           | EN/AR web and Flutter primitives & tokens |
| 004 Bidding engine     | Unassigned   | —                                  | Ready after 002    | Product rulings still gate production     |
| 005 Web buyer loop     | Unassigned   | —                                  | Blocked by 002–004 | Full bidding client                       |
| 006 Mobile buyer loop  | Unassigned   | —                                  | Blocked by 002–004 | Flutter owner stays consistent            |
| 007 Admin core         | Unassigned   | —                                  | Ready after 002    | Lots, auctions, approval queues           |
| 008 Identity/KYC       | Unassigned   | —                                  | Ready after 002    | Provider adapter first                    |
| 009 Deposits/payments  | Unassigned   | —                                  | Ready after 002    | Ledger + webhook safety                   |
| 010 Notifications      | Unassigned   | —                                  | Ready after 002    | Transactional matrix                      |
| 011 Observability/load | Unassigned   | —                                  | Blocked by 004     | Test-auction readiness                    |
| 012 MVP hardening      | Unassigned   | —                                  | Blocked by 004–011 | Real test auction gate                    |

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

See `docs/decisions-log.md` for rationale and open decisions.

## Known risks and blockers

- UAE PASS and Network International commercial onboarding are external critical paths and must begin outside the codebase immediately.
- The supplied logo is a compressed JPEG. The transparent PNG is a generated cleanup draft and not a replacement for an official vector master.
- Provider attributes, fees, settlement times, refund SLAs, and regulatory obligations require confirmation with vendors and UAE counsel.
- The bidding engine needs a written product ruling for proxy-bid ties before production. The proposed default is earliest maximum wins ties.
- Final-bid rejection reason taxonomy and SLA need business/legal approval.

## Next action

Execute `tasks/004-bidding-engine.md`. Implement proxy and manual bid evaluation, soft-close triggers, sequence numbering, and administrative queues in the NestJS backend.

## Last validation

- Added contrast ratio check tests under `packages/design-tokens` validating WCAG AA constraints.
- Added `formatMoney` utility unit tests under `packages/contracts` for English/Arabic.
- Added pseudolocalizer validation tests under `apps/web` and `apps/admin` to prevent hardcoded content.
- `corepack pnpm check` passed formatting, lint, strict type checks, 12 contract tests, 5 API tests, 4 web tests, and 4 admin tests on 2026-07-15.
- `corepack pnpm --filter @pioneer/api test:contract` proved the served OpenAPI document matches the generated artifact.
- Dart SDK 3.12.2 reported no analysis issues, generated the new token representations, and decoded/round-tripped the shared `Money`, `LotSnapshot`, `PlaceBidCommand`, and `CommandAck` fixture.
- `corepack pnpm build` compiled the API, contracts, design tokens, and both Next.js applications successfully.
- `corepack pnpm security:audit` reported no known production dependency vulnerabilities.
- GitHub Actions passed all check/build workflows on the task branch on 2026-07-15.
- Docker compose validation successfully verified the Compose configurations and persistent volumes.
- Local ports: web 3000, admin 3001, API 4000, PostgreSQL 5432, Redis 6379, MinIO 9000/9001, Mailpit SMTP/UI 1025/8025.
