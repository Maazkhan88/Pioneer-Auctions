# Operational Runbook 04 — Redis Degradation, Failover & Recovery

**Severity:** P2 (Degraded Mode) -> P1 (if Outbox Backlog exceeds 5,000)  
**Owners:** On-Call SRE, Infrastructure Team  
**User Impact:** Real-time push updates may experience latency; bidders may fall back to HTTP REST polling; bidding core remains transactional and safe.

---

## 1. Architectural Guardrail & Invariant

> **Critical Architecture Principle:**  
> **Redis is NOT the source of truth.** Redis provides Pub/Sub fan-out and short-lived caching. The PostgreSQL database holds the authoritative lock (`FOR UPDATE` row lock on `lots`), the immutable `bid_ledger`, and the transactional `outbox_events` table.
> If Redis crashes, bids submitted via REST continue to succeed and commit. Event fan-out buffers automatically in `outbox_events` until Redis recovers.

---

## 2. Detection & Alerts

| Alert | Condition | Severity | Action |
| :--- | :--- | :--- | :--- |
| `RedisDown` | Health check endpoint reports Redis unreachable | P1 | Restart or trigger replica promotion |
| `RedisMemoryHigh` | Memory usage > 85% of `maxmemory` | P2 | Evict volatile keys, inspect socket client buffers |
| `OutboxBacklogSpike` | `pioneer_outbox_lag > 500` events | P2 | Check Redis pub/sub throughput |

---

## 3. Triage & Diagnostic Steps

### Step 3.1: Check Redis Health & Memory
```bash
# Check container status
docker compose -f infra/local/compose.yml ps redis

# Test ping & memory
docker compose -f infra/local/compose.yml exec redis redis-cli ping
docker compose -f infra/local/compose.yml exec redis redis-cli info memory
```

### Step 3.2: Inspect Outbox Lag
```bash
curl -s http://localhost:3000/metrics | grep pioneer_outbox_lag
```

---

## 4. Recovery Procedures

### Scenario A: Transient Disconnection (Automatic Recovery)
The Node.js Redis client features automatic exponential backoff.
Once connection is re-established:
1. `BiddingOutboxPublisher` resumes draining `outbox_events`.
2. Socket adapter re-subscribes to channels.
3. Verify lag drops to 0:
   ```bash
   curl -s http://localhost:3000/api/v1/metrics/summary | jq .outboxLag
   ```

### Scenario B: Memory Saturation / OOM Eviction
If Redis is running out of memory:
1. Inspect client output buffers:
   ```bash
   redis-cli client list | grep -E "omem=[1-9]"
   ```
2. If slow subscribers are consuming buffer space, terminate slow clients:
   ```bash
   redis-cli client kill type pubsub
   ```
3. Update `redis.conf` to configure `maxmemory-policy volatile-lru`.

### Scenario C: Unresponsive Instance (Restart & Re-sync)
```bash
docker compose -f infra/local/compose.yml restart redis
```
When restarted, the application reconnects automatically and triggers `BiddingGateway.publishPendingOutboxEvents()`.
