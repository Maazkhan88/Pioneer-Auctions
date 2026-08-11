# Task 004 — Atomic bidding engine and close orchestration

Recommended owner: Claude Code

Status: In progress on `agent/task-004-backend-week1` (started 2026-08-11). Backend Week 1 foundation is complete; MVP bidding policies are decided; manual bid persistence, proxy registration, and initial competing-proxy resolution are implemented.

## Goal

Implement the server-authoritative manual/proxy bidding engine, durable ordered ledger, idempotency, soft-close, event outbox, and close worker behind the v1 contract.

## Prerequisites

- Tasks 001 and 002 complete.
- Proxy tie rule, custom amount alignment, proxy cancellation, and soft-close formula recorded as accepted decisions for MVP in `docs/decisions-log.md`.
- Local/MVP testing will use a dummy payment gateway provider; real gateway integration is deferred behind the payment-provider interface.

## Scope

- Add auction/lot/bid/proxy/terms/eligibility persistence models and forward-only migrations.
- Implement a framework-independent domain decision function using an injected deterministic clock.
- Select PostgreSQL-serialized or Redis-atomic architecture and document crash/recovery guarantees.
- Implement command idempotency, per-lot sequencing, manual bids, proxy resolution, reserve status transition, soft-close extension, and transactional outbox.
- Implement REST bid/proxy routes and Socket.IO command acknowledgements.
- Implement public/personal room authorization, sanitized broadcasts, snapshots, replay or snapshot fallback, and close worker fencing.
- Add rebuild/reconciliation logic for any Redis-derived state.
- Emit metrics/traces/logs without bidder identity, proxy maxima, or regulated data leakage.

## Non-negotiable invariants

- No accepted bid is acknowledged or broadcast as durable before durable commit.
- Exactly one serial ordering exists per lot under concurrency.
- Retrying a `commandId` returns the original result and causes no new ledger row/event.
- Close and bid cannot both win the same decision boundary.
- Public payloads never reveal proxy maximums or real bidder identity.
- Admin cannot edit/delete the bid ledger or hammer price.

## Acceptance criteria

- Every bidding-engine case in `docs/quality-gates.md` is automated.
- A 100-command same-lot race yields one deterministic ordered ledger and valid final state.
- Different lots are not globally serialized.
- Kill-point tests cover before commit, after commit/before publish, and after publish.
- Redis loss/rebuild cannot lose an accepted bid or reopen a closed lot.
- Contract fixtures and clients remain compatible.
- A technical review explains why the implementation is correct, not merely that tests pass.

## Validation

```bash
pnpm --filter @pioneer/api test:bidding
pnpm --filter @pioneer/api test:integration
pnpm --filter @pioneer/api test:race
pnpm --filter @pioneer/api test:recovery
```

Include reproducible seed, load parameters, database isolation level, and result artifact in the handoff.

## Current implementation notes

- Manual bid REST path exists at `POST /api/v1/lots/:lotId/bids`.
- Proxy bid REST path exists at `PUT /api/v1/lots/:lotId/proxy-bid`.
- Manual bid acceptance is serialized with a PostgreSQL row lock on the lot.
- Accepted manual/proxy visible bids append `bid_ledger`, update `lots`, save `bid_commands.result_payload`, and write `outbox_events` before acknowledgement.
- Manual bids against active proxies now append both the manual bid and automatic proxy response in sequence when the proxy can beat the manual amount.
- Proxy maximum registration now resolves the active proxy leaderboard to the minimum visible amount required for the highest-priority proxy to lead, including equal-maximum priority by earlier registration.
- Accepted manual/proxy commands can acknowledge `OUTBID` when the submitted command is valid but immediately defeated by a higher/equal-priority proxy.
- Socket.IO commands, close worker fencing, real database race tests, and Redis rebuild/recovery work remain.

## Stop conditions

Stop and request a product decision if an unresolved rule could change price, winner, eligibility, or close time. Do not encode a guess in production behavior.
