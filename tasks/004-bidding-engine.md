# Task 004 — Atomic bidding engine and close orchestration

Recommended owner: Claude Code

Status: In progress on `agent/task-004-backend-week1` (started 2026-08-11). Backend Week 1 foundation is complete; MVP bidding policies are decided; manual bid persistence, proxy registration, initial competing-proxy resolution, opt-in database integration/race harnesses, Socket.IO command acknowledgement foundation, durable outbox replay/publish foundation, close worker fencing foundation, personal bid-status event fan-out for command/proxy/previous-leader accounts, PostgreSQL-derived recovery rebuild foundation, and technical correctness handoff are implemented.

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
- Real database integration/race test harnesses exist and are opt-in with `PIONEER_RUN_DB_TESTS=1`; they need execution in an environment with local PostgreSQL available.
- Socket.IO gateway foundation exists for connection hello, lot subscribe/sync/unsubscribe, manual bid, and proxy bid commands. Bid/proxy socket commands use the same durable bidding service as REST and subscribe/sync return authoritative database snapshots.
- Durable outbox publish/replay foundation exists: unpublished lot events are emitted from `outbox_events` to lot rooms and marked published; subscribe/sync can replay retained contiguous lot events after `afterSequence` or fall back to snapshot state.
- Close worker fencing foundation exists: due live lots are selected with `FOR UPDATE SKIP LOCKED`, rechecked under a lot row lock, moved to `PENDING_APPROVAL` when they have a bid or `CLOSED` when they do not, assigned the next lot sequence, and recorded through the outbox.
- Personal bid-status event foundation exists: accepted manual/proxy commands write private account-scoped `bid:status-changed` outbox rows for command accounts, automatic proxy winners, and previous leaders who become outbid; the publisher emits account rows to `user:{accountId}` rooms.
- Recovery rebuild foundation exists: `BiddingRecoveryService` can reconstruct derived lot state from PostgreSQL lot/bid-ledger/proxy tables, preserve closed/pending-approval lifecycle states, avoid exposing proxy maxima, and write rebuilt state to an abstract derived-state store for future Redis integration.
- Technical correctness handoff exists at `docs/bidding-engine-handoff.md`.
- Executed database race results remain.
- **2026-08-14**: `PIONEER_RUN_DB_TESTS=1` was actually executed against a real PostgreSQL instance for the first time (see `docs/decisions-log.md` DEC-020) and immediately surfaced two real bugs this task's own DB-integration test harness had never once caught, because the harness itself was broken and had never successfully run: `test/bidding-db-fixture.ts`'s isolated-schema `search_path` excluded `public`, where the `citext` extension's type lives, failing every run before a single assertion executed; and `BiddingService.findActiveProxy` ordered by a nonexistent `registered_at` column (the real column is `priority_at`) -- a sibling query had already been fixed correctly in an earlier session but this one was missed. Both fixed; the 100-concurrent-command same-lot race suite now passes for real, verifying this task's single most safety-critical property (the `FOR UPDATE OF lots` serialization boundary) against an actual database for the first time.
- **2026-08-14**: found and fixed a real, previously-invisible bug in `AuctionsRepository`'s shared pause/resume/cancel transition helper (compared the `lifecycle` enum column against `ANY($::text[])`, which Postgres rejects) -- every real pause/resume/cancel call had been failing with a 500 since it was written; only caught once a live database was available. See `docs/current-state.md`'s "Local PostgreSQL now available" section for full detail.
- **2026-08-14**: added `AuctionOpenService` and `BiddingLifecycleScheduler` (`apps/api/src/bidding/`) -- there was no lifecycle automation anywhere in this app until now; `AuctionCloseService` (already built, already tested) was never actually invoked by anything, confirmed by grepping the whole `apps/api/src` tree. Without this, no lot could ever leave `DRAFT` on its own, which meant Task 005's buyer bidding UI had no real lot it could ever reach. See DEC-021 for the production-deployment caveat and `docs/current-state.md`'s "MVP blockers closed" section for the full live-verified end-to-end path this unblocked.
- **2026-08-14**: found and fixed a real drift between `docs/api-contracts.md` §9's documented `LotEventEnvelope<Name, Data>` realtime event shape and the actual server implementation, which emits every outbox event flat/unwrapped (`BiddingOutboxPublisher.publishPendingEvents`). See DEC-022. The doc itself has not yet been corrected to match the real server -- flagged as a follow-up, not resolved.

## Stop conditions

Stop and request a product decision if an unresolved rule could change price, winner, eligibility, or close time. Do not encode a guess in production behavior.
