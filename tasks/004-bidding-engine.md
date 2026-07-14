# Task 004 — Atomic bidding engine and close orchestration

Recommended owner: Claude Code

## Goal

Implement the server-authoritative manual/proxy bidding engine, durable ordered ledger, idempotency, soft-close, event outbox, and close worker behind the v1 contract.

## Prerequisites

- Tasks 001 and 002 complete.
- Proxy tie rule, custom amount alignment, proxy cancellation, and soft-close formula recorded as accepted decisions for MVP.

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

## Stop conditions

Stop and request a product decision if an unresolved rule could change price, winner, eligibility, or close time. Do not encode a guess in production behavior.
