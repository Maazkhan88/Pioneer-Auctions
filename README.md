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

## Bootstrap

Toolchain versions are pinned in `package.json` and `.tool-versions`.

```bash
corepack pnpm install
corepack pnpm check
```

If you prefer bare `pnpm` commands, run `corepack enable` from a shell with permission to update the Node installation directory.

Flutter is managed independently inside `apps/mobile`; its generated project will be added by Task 003.

## Status

The starter kit is ready for implementation. No runtime application has been scaffolded yet. See [`docs/current-state.md`](docs/current-state.md) for the canonical handoff.
