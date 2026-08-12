# Bidding engine technical handoff

Status: Task 004 implementation foundation is ready for technical review. The only unexecuted acceptance gate is the real PostgreSQL integration/race run because this remote Codex environment has no local PostgreSQL service and Docker is unavailable.

## Implemented boundary

- REST:
  - `POST /api/v1/lots/:lotId/bids`
  - `PUT /api/v1/lots/:lotId/proxy-bid`
- Socket.IO namespace:
  - `/auctions/v1`
  - `lot:subscribe`
  - `lot:sync`
  - `lot:unsubscribe`
  - `bid:place`
  - `proxy-bid:set`
- Close worker:
  - due-lot claim with `FOR UPDATE SKIP LOCKED`
  - per-lot close recheck under `FOR UPDATE OF lots`
- Outbox:
  - public lot events to `lot:{lotId}`
  - private account events to `user:{accountId}`
- Recovery:
  - `BiddingRecoveryService` rebuilds derived lot state from PostgreSQL.

## Correctness model

PostgreSQL is the authoritative decision boundary for MVP bidding. The service serializes all bid and close decisions for a lot through a row lock on `lots`.

For a bid command:

1. Start transaction.
2. Check idempotency in `bid_commands` for `(account_id, command_id)`.
3. Lock the lot row with `FOR UPDATE OF lots`.
4. Load eligibility and accepted terms.
5. Evaluate bid/proxy rules using server time only.
6. Resolve automatic proxy consequences inside the same transaction.
7. Append ordered rows to `bid_ledger`.
8. Update durable lot state.
9. Insert public/private `outbox_events`.
10. Save the idempotent command result.
11. Commit.
12. Publish outbox events after commit.

This means a socket acknowledgement or REST response is only returned as accepted after the durable ledger, lot state, command result, and outbox row are committed.

## Invariants covered

- Money uses integer fils, not floating point.
- Server is authoritative for accepted amount, reserve status, next minimum, close time, and sequence.
- Every accepted visible bid has a monotonically increasing per-lot `sequence`.
- Replayed command IDs return the original result and do not append another ledger row.
- Manual bids and close worker decisions both lock the same lot row, so they cannot both win the same close boundary.
- Public outbox events never include real bidder identity or proxy maximums.
- Private bid-status events are account-scoped and may include that account's active proxy maximum.
- Redis/live derived state is rebuildable from PostgreSQL and cannot reopen a closed/pending approval lot.

## Proxy behavior

- Proxy maxima are raise-only for MVP.
- A manual bid can be accepted and immediately outbid by an existing proxy in the same transaction.
- Competing proxies resolve deterministically:
  - highest maximum wins;
  - equal maximum goes to earlier registered priority;
  - visible price becomes the minimum required amount for the winning proxy to lead.
- Private status fan-out currently covers:
  - command account;
  - automatic proxy winner;
  - previous leader displaced by a new accepted bid.

## Soft-close behavior

- Default window: 2 minutes.
- Default extension: 2 minutes.
- Admin can override timing per lot.
- The bid engine uses server time.
- A qualifying accepted bid extends from the previously published close time.

## Recovery behavior

`BiddingRecoveryService` reconstructs:

- `lotId`
- `auctionId`
- `lifecycle`
- `sequence`
- `currentBid`
- `nextMinimumBid`
- `bidCount`
- `reserveStatus`
- `closesAt`
- latest ledger leader
- active proxy count

It intentionally does not expose proxy maxima in the rebuilt public/derived state.

When Redis is introduced as a concrete provider, wire this service into startup or an operator-triggered repair flow that writes rebuilt state into Redis before accepting live bid traffic for affected lots.

## Validation already run

Last local validation on 2026-08-12:

```bash
corepack pnpm --filter @pioneer/api test:bidding
corepack pnpm --filter @pioneer/api typecheck
corepack pnpm --filter @pioneer/api lint
corepack pnpm --filter @pioneer/api build
corepack pnpm --filter @pioneer/api migrate:check
corepack pnpm --filter @pioneer/api test
```

Results:

- `test:bidding`: 6 files / 33 tests passed.
- full API `test`: 12 files / 47 tests passed, 2 opt-in DB suites skipped.
- typecheck, lint, build, and migration check passed.

## Validation still required on a PostgreSQL machine

Run these with local PostgreSQL available:

```bash
$env:PIONEER_RUN_DB_TESTS = "1"
corepack pnpm --filter @pioneer/api test:integration
corepack pnpm --filter @pioneer/api test:race
```

Expected coverage:

- migrations apply into an isolated temporary schema;
- accepted manual bid persists to `bid_ledger`, `lots`, `bid_commands`, and `outbox_events`;
- proxy/manual persistence works against real PostgreSQL constraints;
- 100 same-lot concurrent manual bid commands produce one deterministic ordered ledger;
- final lot state matches the highest durable sequence and bid amount.

Known remote-environment blocker:

- Docker is not installed/available.
- PostgreSQL at `127.0.0.1:5432` is not running in the remote Codex session.

## Review checklist

- Check all accepted paths save `bid_commands` before commit.
- Check every public event remains sanitized.
- Check private events never go to lot rooms.
- Check close worker and bid commands use the same lot lock boundary.
- Check any future Redis optimization keeps PostgreSQL as the durable source of truth.
- Check any future admin final-bid approval does not mutate hammer price or bid ledger rows.
