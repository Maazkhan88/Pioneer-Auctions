# Task 002 — Runtime contracts and compatibility harness

Recommended owner: Codex

## Goal

Make `docs/api-contracts.md` executable through runtime schemas, OpenAPI, Socket.IO typing, examples, and consumer compatibility tests.

## Prerequisites

- Task 001 complete.
- Product owner reviews open proxy/soft-close questions or accepts proposed defaults for development.

## Scope

- Select and record one runtime schema approach compatible with NestJS/OpenAPI and TypeScript clients.
- Implement schemas for common money/time/error types, lot snapshots, bid/proxy commands, acknowledgements, and all named v1 events.
- Export typed client/server Socket.IO event maps.
- Generate or expose OpenAPI for documented REST endpoints without hand-maintained drift.
- Add valid and invalid JSON fixtures for every event/command.
- Add contract compatibility tests and an additive/breaking change policy.
- Define Dart contract generation/consumption strategy; prove it with `Money`, `LotSnapshot`, `PlaceBidCommand`, and `CommandAck` fixtures.

## Acceptance criteria

- Documentation examples validate against runtime schemas.
- Invalid currency, fractional fils, unsafe integers, invalid UUIDs/times, negative sequences, and unknown required enum values fail predictably.
- API, web, and admin import the same TypeScript contract package.
- A Flutter/Dart test decodes shared golden fixtures with no manual semantic renaming.
- CI detects contract/schema/example drift.
- Versioning and rollout guidance is recorded in the decision log.

## Validation

```bash
pnpm --filter @pioneer/contracts test
pnpm --filter @pioneer/api test:contract
pnpm check
```

Run the Flutter golden decode command documented by the implementation.

## Out of scope

No database models, bid acceptance logic, live gateway behavior, or provider integration.
