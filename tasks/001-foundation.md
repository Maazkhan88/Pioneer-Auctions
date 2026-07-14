# Task 001 — Monorepo and local foundation

Recommended owner: Codex

## Goal

Turn the documentation starter into a clean-install, runnable monorepo without implementing auction business behavior.

## Prerequisites

- Review `AGENTS.md`, tool versions, and workspace choices.
- Resolve any incompatible installed toolchain before changing pins.

## Scope

- Generate `apps/api` with NestJS, `apps/web` and `apps/admin` with Next.js App Router and strict TypeScript.
- Add shared lint, formatting, TypeScript, unit-test, and environment validation configuration.
- Add local PostgreSQL, Redis, S3-compatible storage, and mail-capture services under `infra/local` with health checks and named volumes.
- Add a `/health/live` and `/health/ready` endpoint; readiness checks dependencies with bounded timeouts.
- Add baseline OpenTelemetry-compatible structured logging and correlation ID propagation.
- Add CI for clean install, format, lint, typecheck, tests, builds, secret scan, and dependency audit.
- Add package-manager lockfile and update root scripts so `pnpm check` passes.
- Add placeholder modules only; do not invent bid/identity/payment behavior.

## Acceptance criteria

- A new contributor can follow README instructions on Windows/macOS/Linux with documented prerequisites.
- `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build` pass from a clean checkout.
- Local dependencies start and report healthy; API readiness distinguishes dependency failure from liveness.
- Web and admin show distinct localized placeholder shells in English and Arabic with direction switching.
- CI uses least required permissions, caches safely, and runs on pull requests.
- No credentials or permissive production defaults are committed.

## Validation

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
docker compose -f infra/local/compose.yml config
```

Manually stop PostgreSQL and Redis to verify readiness degradation and recovery.

## Handoff

Update `docs/current-state.md` with exact framework versions, commands, service ports, and any environment limitations. Do not mark Task 002 ready until the contract package builds inside the workspace.
