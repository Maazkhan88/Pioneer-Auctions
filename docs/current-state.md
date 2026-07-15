# Current state

Last updated: 2026-07-14

Repository: `https://github.com/Maazkhan88/Pioneer-Auctions` (`main`)

This is the canonical handoff for the repository. Update it at the end of every task or material work session.

## Product goal

Deliver one trustworthy auction platform across Flutter mobile, Next.js web bidding, Next.js admin, and a NestJS/PostgreSQL/Redis backend. MVP succeeds when a real weekly auction can run end-to-end in English and Arabic with verified users, deposit eligibility, real-time manual/proxy bidding, transparent soft-close, final-bid approval, and auditable outcomes.

## Current phase

Phase 0: foundation and contract definition.

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

## What does not exist yet

- No generated Flutter runtime application.
- No database migrations or runnable bidding engine.
- No connected UAE PASS, payment, KYC, push, email, or SMS provider.
- No production cloud resources.

## Active task

No task is active. Task 001 was completed by Codex on `agent/task-001-foundation`.

| Task                   | Owner      | Branch                      | Status             | Notes                                |
| ---------------------- | ---------- | --------------------------- | ------------------ | ------------------------------------ |
| 001 Foundation         | Codex      | `agent/task-001-foundation` | Complete           | Scaffold, local services, CI         |
| 002 Contracts          | Unassigned | —                           | Ready              | Contract tests and generated clients |
| 003 Design system      | Unassigned | —                           | Ready after 001    | EN/AR primitives                     |
| 004 Bidding engine     | Unassigned | —                           | Blocked by 001–002 | Highest-risk correctness work        |
| 005 Web buyer loop     | Unassigned | —                           | Blocked by 002–004 | Full bidding client                  |
| 006 Mobile buyer loop  | Unassigned | —                           | Blocked by 002–004 | Flutter owner stays consistent       |
| 007 Admin core         | Unassigned | —                           | Blocked by 001–002 | Lots, auctions, approval queues      |
| 008 Identity/KYC       | Unassigned | —                           | Blocked by 001–002 | Provider adapter first               |
| 009 Deposits/payments  | Unassigned | —                           | Blocked by 001–002 | Ledger + webhook safety              |
| 010 Notifications      | Unassigned | —                           | Blocked by 002     | Transactional matrix                 |
| 011 Observability/load | Unassigned | —                           | Blocked by 004     | Test-auction readiness               |
| 012 MVP hardening      | Unassigned | —                           | Blocked by 004–011 | Real test auction gate               |

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

See `docs/decisions-log.md` for rationale and open decisions.

## Known risks and blockers

- UAE PASS and Network International commercial onboarding are external critical paths and must begin outside the codebase immediately.
- The supplied logo is a compressed JPEG. The transparent PNG is a generated cleanup draft and not a replacement for an official vector master.
- Provider attributes, fees, settlement times, refund SLAs, and regulatory obligations require confirmation with vendors and UAE counsel.
- The bidding engine needs a written product ruling for proxy-bid ties before production. The proposed default is earliest maximum wins ties.
- Final-bid rejection reason taxonomy and SLA need business/legal approval.

## Next action

Claim and execute `tasks/002-contracts-and-test-harness.md`. The contract and design-token packages build successfully inside the completed workspace.

## Last validation

- `corepack pnpm install` and the lockfile supply-chain policy check passed on 2026-07-14.
- `corepack pnpm infra:config`, formatting, linting, strict type checks, and 8 tests passed.
- `corepack pnpm build` compiled the API, contract package, design tokens, and both localized Next.js surfaces.
- Runtime smoke tests returned HTTP 200 from API liveness, Arabic customer web, and English admin routes.
- Production dependency audit reports no known vulnerabilities after the PostCSS security override.
- Docker is not installed in the current Windows environment. Compose YAML and required health/volume structure were validated, but container startup, readiness degradation, and recovery must be exercised on the first Docker-enabled machine or CI runner.
- Local ports: web 3000, admin 3001, API 4000, PostgreSQL 5432, Redis 6379, MinIO 9000/9001, Mailpit SMTP/UI 1025/8025.
