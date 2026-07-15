# Pioneer Auctions

Agent-ready monorepo starter for a UAE multi-category, real-time auction platform.

## Product surfaces

- `apps/mobile`: Flutter buyer and seller app for iOS and Android.
- `apps/web`: Next.js full bidding website with mobile feature parity.
- `apps/admin`: Next.js operations and finance console.
- `apps/api`: NestJS REST API and Socket.IO bidding gateway.
- `packages/contracts`: versioned REST and WebSocket types shared by TypeScript clients.
- `packages/design-tokens`: brand, semantic colour, spacing, typography, and motion tokens.
- `packages/config`: shared linting, TypeScript, formatting, and test configuration.
- `infra`: AWS infrastructure, local dependencies, observability, and runbooks.

## Start here

Every coding agent and human contributor must read these files in order:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/current-state.md`](docs/current-state.md)
3. [`docs/api-contracts.md`](docs/api-contracts.md)
4. The assigned file under [`tasks/`](tasks/README.md)

The repository is intentionally documentation-first. Do not build a client against an undocumented payload and do not change bidding semantics without updating the contract and decision log first.

## Prerequisites

Install Node.js 24.18+, Corepack, and Docker Desktop (Windows/macOS) or Docker Engine with the Compose plugin (Linux). Toolchain versions are pinned in `package.json` and `.tool-versions`.

## Bootstrap

```bash
corepack pnpm install
corepack pnpm infra:config
corepack pnpm check
corepack pnpm build
```

If you prefer bare `pnpm` commands, run `corepack enable` from a shell with permission to update the Node installation directory.

## Local dependencies

Copy `.env.example` to `.env`, then start PostgreSQL, Redis, MinIO, and Mailpit:

```powershell
Copy-Item .env.example .env
docker compose -f infra/local/compose.yml up -d --wait
```

```bash
cp .env.example .env
docker compose -f infra/local/compose.yml up -d --wait
```

Local endpoints:

- API: `http://localhost:4000` (`/health/live` and `/health/ready`)
- Customer web: `http://localhost:3000/en` and `http://localhost:3000/ar`
- Admin: `http://localhost:3001/en` and `http://localhost:3001/ar`
- MinIO API/console: `http://localhost:9000` / `http://localhost:9001`
- Mailpit inbox/SMTP: `http://localhost:8025` / `localhost:1025`

Start the TypeScript applications with `corepack pnpm dev`. Stop dependencies without deleting data using:

```bash
docker compose -f infra/local/compose.yml down
```

Add `--volumes` only when you intentionally want to erase all local dependency data. Local credentials in `.env.example` are deliberately non-production and must never be reused outside local development.

## Quality and security

`corepack pnpm check` runs formatting, linting, strict type checks, and tests across every workspace. CI also performs a clean frozen-lockfile install, Compose structure validation, production dependency audit, repository secret scan, and production builds.

Flutter is managed independently inside `apps/mobile`; its generated project will be added by Task 003.

## Status

Task 001 provides the runtime foundation and bilingual placeholder shells only. No auction business behavior is implemented. See [`docs/current-state.md`](docs/current-state.md) for the canonical handoff.
