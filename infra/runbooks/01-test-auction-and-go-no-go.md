# Operational Runbook 01 — Test Auction & Go / No-Go Procedure

**Severity:** P1 (Pre-flight Gate)  
**Owners:** Auctioneer Lead, Primary SRE, Compliance Officer  
**User Impact:** Decides whether live auction opens to public bidders or is rescheduled without financial impact.

---

## 1. Objective & Scope

Validate platform readiness through an isolated synthetic test auction before opening public bidding. Ensure all critical paths (real-time WebSocket bidding, atomic PostgreSQL decision engine, transactional outbox fan-out, KYC eligibility, security deposits, and notification delivery) meet technical SLAs.

---

## 2. Roles & Responsibilities

| Role | Designee | Responsibilities |
| :--- | :--- | :--- |
| **Auction Commander** | Operations Director | Authoritative Go/No-Go decision; commercial alignment. |
| **SRE Lead** | Principal Infrastructure Eng | Systems health, latency percentiles, telemetry, outbox lag. |
| **Domain Lead** | Core Backend Engineer | Bid state machine correctness, sequence monotonicity, lock contention. |
| **Support Lead** | Operations Lead | Customer communications, dispute hotline readiness, user paddle state. |

---

## 3. Pre-Flight Checklist & Verification Steps

Execute 60 minutes prior to scheduled public auction:

### Step 3.1: Database Migrations & Pool Saturation
Verify all database migrations are applied and pool connections are healthy:
```bash
corepack pnpm --filter @pioneer/api migrate:check
curl -s http://localhost:3000/api/health | jq .
```
- **Pass Criteria:** `status: "ok"`, `database: "healthy"`, pool active connections < 20% of max.

### Step 3.2: Runtime Contracts & API Drift
Confirm OpenAPI schema and client contracts are in exact byte-for-byte synchronization:
```bash
corepack pnpm --filter @pioneer/contracts check:generated
```
- **Pass Criteria:** Exit code 0, 0 schema drift.

### Step 3.3: Prometheus Telemetry & Scrape Endpoint
Verify the Prometheus scrape endpoint is publishing metrics:
```bash
curl -s http://localhost:3000/metrics | grep pioneer_
```
- **Pass Criteria:** `pioneer_active_sockets`, `pioneer_bid_commands_total`, `pioneer_outbox_lag` present.

### Step 3.4: Synthetic Load Harness Smoke Run
Execute a 5-second synthetic workload against the test auction lot:
```bash
npx tsx apps/api/test/load/bidding-load-harness.ts
```
- **Pass Criteria:**
  - Technical failures: **0**
  - p95 latency: **<= 150ms**
  - Outbox lag: **0** at completion

---

## 4. Go / No-Go Decision Criteria

| Check Item | Target Metric | Hard Stop Condition (NO-GO) |
| :--- | :--- | :--- |
| **Bid Latency (p95)** | `<= 150 ms` | `> 250 ms` under test load |
| **Technical Errors** | `0.00%` | Any 5xx or unhandled WebSocket exception |
| **Database Pool** | `< 40%` utilization | Connection exhaustion or lock timeout > 2s |
| **Outbox Lag** | `0` pending events | Lag continuously increasing > 50 events |
| **Redis Connectivity** | `< 2 ms` round-trip | Disconnection or reconnect loops |
| **Payment Gateway** | Live webhook responder 200 | Webhook replay backlog or signature failures |

---

## 5. Abort & Postponement Procedure

If a **NO-GO** condition is met:
1. **Declare Hold:** Commander issues formal Hold in incident channel `#auction-ops-live`.
2. **Lock Lots:** Ensure auction lifecycle remains `SCHEDULED` or set to `PAUSED`:
   ```bash
   # CLI / API command to lock auction
   curl -X POST http://localhost:3000/api/v1/admin/auctions/{auctionId}/pause \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
3. **Notify Users:** Broadcast in-app banner and push notification via Communication Service:
   *"Auction scheduled start delayed by 30 minutes for pre-auction system calibration."*
4. **Remediate:** SRE lead investigates error logs and repeats Pre-Flight Checklist.
