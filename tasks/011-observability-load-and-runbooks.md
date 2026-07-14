# Task 011 — Observability, load, recovery, and auction runbooks

Recommended owner: Codex with backend/SRE review

## Goal

Prove the platform can be operated safely during a real auction and that stated latency/recovery targets are measured rather than assumed.

## Prerequisites

- Task 004 complete; core identity/payment adapters sufficiently integrated for realistic eligibility.

## Scope

- OpenTelemetry traces and structured logs across HTTP, socket command, atomic decision, database, outbox, fan-out, notification, and payment webhook.
- Metrics/dashboard for active sockets, bid acknowledgements, rejections by code, sequence lag, outbox lag, close-worker lag, extensions, DB/Redis saturation, payment success/reasons, notification delivery, and approval SLA.
- Alerts with owners, severity, user impact, and runbook links.
- Reproducible load harness modeling connections, lots, bids/second, proxies, soft-close bursts, reconnects, and multiple gateway instances.
- Failure injection: gateway kill, worker kill, Redis restart/failover, DB latency, outbox backlog, provider outage.
- Runbooks listed in `infra/README.md`, including test-auction go/no-go and manual communication steps.

## Acceptance criteria

- Target workload and assumptions are documented; p50/p95/p99 and error/rejection rates are separated.
- Bid p95 and fan-out goals are measured in production-like regional topology or explicitly labeled local estimates.
- Dashboards distinguish expected auction rejection from technical failure.
- Kill/failover tests preserve ledger correctness and clients recover via snapshots.
- Every page-worthy alert has an actionable runbook and avoids sensitive log fields.
- Capacity headroom and the trigger for sharded pub/sub/search extraction are documented.

## Validation

Archive load configuration, commit/release identifier, environment shape, result summary, raw artifact location, and defects found. Re-run after material bidding/storage changes.
