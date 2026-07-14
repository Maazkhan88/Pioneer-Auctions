# Quality gates

## Repository baseline

Every pull request runs formatting, lint, type checking, unit tests, contract tests, dependency/security scanning, and secret scanning. Build only affected workspaces locally; CI must also run a clean install from the lockfile.

## Bidding engine test wall

Task 004 cannot complete without automated coverage for:

- first manual bid, exact increment, custom valid amount, invalid amount;
- auction not started, paused, closed, cancelled, and server time exactly at close;
- KYC, account restriction, deposit, and terms failures;
- duplicate `commandId` before, during, and after original completion;
- 100+ concurrent commands against one lot with exactly one valid ordering;
- commands for different lots proceeding independently;
- bidder replacing their own lead and proxy maximum behavior;
- competing proxy maxima below, equal to, and above one another;
- deterministic tie rule and non-disclosure of maxima;
- reserve transition without publishing the reserve amount;
- soft-close just outside, exactly on, and inside the window;
- repeated extensions, configured cap/no-cap behavior, and close-worker races;
- process crash before durable commit, after commit/before publish, and after publish;
- Redis failover/rebuild with no accepted-bid loss and no closed-lot reopening;
- duplicate, delayed, and out-of-order event handling;
- reconnect snapshots and sequence-gap recovery;
- authorization: public vs personal events and admin-only commands;
- immutable ledger/audit verification and outbox replay.

Use deterministic clocks in domain tests. Add a real-clock smoke test only as a supplement.

## Contract compatibility

- Validate example payloads in `docs/api-contracts.md` against runtime schemas.
- Run consumer contract tests for web, admin, and Flutter fixtures.
- A public breaking change requires versioning and a migration window.
- Unknown event fields must be tolerated; unknown event names must fail safely and be observable.

## Web/admin

- Unit/component tests for state variants.
- Playwright journeys for browse → terms → deposit gate → bid → outbid → extension → result.
- Same journeys in English LTR and Arabic RTL at mobile and desktop viewports.
- Automated accessibility checks plus keyboard and screen-reader spot checks for bidding.
- No hydration-dependent loss of critical lot/price content.

## Mobile

- Widget tests for all bid states in both directions.
- Integration tests for app background/foreground, socket reconnect, push deep links, payment return, and locale switch.
- Device coverage for a supported low/mid Android device and current/previous iOS major versions.
- Verify text scaling, safe areas, haptics, and reduced motion.

## Payments and ledgers

- Webhook signature validation, replay, reordering, timeout, and provider-retry tests.
- Idempotent payment intent/refund commands.
- Double-entry or balanced-ledger invariant tests as selected in Task 009.
- Daily reconciliation fixtures with unmatched, duplicate, partial, failed, and refunded cases.
- No raw card data in logs, traces, fixtures, database, or screenshots.

## Performance targets

- Bid command acknowledgement p95 below 500 ms under agreed target load, measured end-to-end in-region.
- Live event fan-out p95 below 200 ms from committed outbox event to connected client where feasible.
- Lot snapshot recovery within 2 seconds under normal mobile conditions.
- Web Core Web Vitals target: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at the 75th percentile.
- Payment success target above 99% excludes issuer/customer declines and is segmented by provider/reason.

Load tests must define concurrency, connection ramp, bids/second, lot distribution, soft-close behavior, and failure injection. A single headline “users” number is insufficient.

## MVP release gate

Run at least one internal and one invited test auction using production-like topology and synthetic/non-production money. Rehearse pause, reconnect, close, approval, notification, payment reconciliation, rollback/forward-fix, and incident communications. Document evidence in `infra/runbooks/test-auction.md`.
