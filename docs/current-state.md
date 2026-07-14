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

## What does not exist yet

- No generated NestJS, Next.js, or Flutter runtime application.
- No database migrations or runnable bidding engine.
- No local Docker dependencies.
- No connected UAE PASS, payment, KYC, push, email, or SMS provider.
- No production cloud resources or CI pipeline.

## Active task

None. The next owner should claim Task 001 by adding their agent/tool name, branch, and start time here before editing.

| Task                   | Owner      | Branch | Status             | Notes                                |
| ---------------------- | ---------- | ------ | ------------------ | ------------------------------------ |
| 001 Foundation         | Unassigned | —      | Ready              | First implementation task            |
| 002 Contracts          | Unassigned | —      | Ready after 001    | Contract tests and generated clients |
| 003 Design system      | Unassigned | —      | Ready after 001    | EN/AR primitives                     |
| 004 Bidding engine     | Unassigned | —      | Blocked by 001–002 | Highest-risk correctness work        |
| 005 Web buyer loop     | Unassigned | —      | Blocked by 002–004 | Full bidding client                  |
| 006 Mobile buyer loop  | Unassigned | —      | Blocked by 002–004 | Flutter owner stays consistent       |
| 007 Admin core         | Unassigned | —      | Blocked by 001–002 | Lots, auctions, approval queues      |
| 008 Identity/KYC       | Unassigned | —      | Blocked by 001–002 | Provider adapter first               |
| 009 Deposits/payments  | Unassigned | —      | Blocked by 001–002 | Ledger + webhook safety              |
| 010 Notifications      | Unassigned | —      | Blocked by 002     | Transactional matrix                 |
| 011 Observability/load | Unassigned | —      | Blocked by 004     | Test-auction readiness               |
| 012 MVP hardening      | Unassigned | —      | Blocked by 004–011 | Real test auction gate               |

## Decisions already made

- Monorepo: pnpm workspaces with Turborepo configuration available for app scaffolding; root checks currently use pnpm recursive execution so they work even where global Corepack shims cannot be installed. Flutter remains in the same repo but outside pnpm execution where appropriate.
- Foundation tool pins: Node.js 24.18.0 LTS, pnpm 11.4.0, and Flutter 3.44.0 stable; Task 001 verifies framework compatibility before generating apps.
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

Execute `tasks/001-foundation.md`. Scaffold the apps, shared configuration, local PostgreSQL/Redis/object-storage dependencies, and CI without changing the documented bidding contract.

## Last validation

- Documentation and starter structure were inspected locally on 2026-07-14.
- Package installation was not run; dependencies are declared but no lockfile exists yet.
- JSON syntax and all relative Markdown links passed local validation.
- `corepack pnpm install` completed and created `pnpm-lock.yaml`; this Windows installation cannot create global Corepack shims without administrator access, so README commands use `corepack pnpm` directly.
- `corepack pnpm check` passed formatting, TypeScript lint/type checks, and the current type-only package test commands on 2026-07-14. Test suites contain zero behavioral tests until Tasks 001–002 add runtime schemas and harnesses.
- `corepack pnpm build` compiled both starter packages successfully.
- No application build or behavioral test can run until Task 001 scaffolds the apps.
