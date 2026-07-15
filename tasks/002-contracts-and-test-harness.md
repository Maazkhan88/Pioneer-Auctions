# Task 002 — Runtime contracts and compatibility harness

Recommended owner: Codex

Status: Complete on `agent/task-002-runtime-contracts` (2026-07-15).

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

## Handoff

Zod is the v1 executable source in `packages/contracts`; it generates OpenAPI 3.1, JSON Schema, and Dart models. API, web, and admin import that package, while TypeScript and Dart decode the same checked-in golden fixture. CI validates schema/examples/fixtures, generated-file drift, the API-exposed OpenAPI document, and the Dart analyzer/golden decoder. Compatibility and rollout policy is recorded in DEC-010 and DEC-011.

Validated on 2026-07-15 with:

```bash
pnpm --filter @pioneer/contracts test
pnpm --filter @pioneer/api test:contract
pnpm check
pnpm build
dart analyze packages/contracts/dart
dart run packages/contracts/dart/test/golden_decode_test.dart
```

## Out of scope

No database models, bid acceptance logic, live gateway behavior, or provider integration.
