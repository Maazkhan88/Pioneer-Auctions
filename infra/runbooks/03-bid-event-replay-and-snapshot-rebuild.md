# Operational Runbook 03 — Bid Event Replay & Snapshot Rebuild

**Severity:** P1 / Data Integrity  
**Owners:** Core Backend Engineer, Database Administrator  
**User Impact:** Restores accurate real-time lot state in Redis/WebSockets from the immutable PostgreSQL audit log.

---

## 1. When to Use This Runbook

- Gateway node crashed and restarted without persisted cache.
- Discrepancy observed between client snapshot and backend database sequence.
- Client reports seeing stale price or inconsistent reserve status.
- Redis cache evicted keys under memory pressure.

---

## 2. Invariants & Guarantees

1. **PostgreSQL `bid_ledger` is the Single Source of Truth:**
   All accepted bids are recorded immutably with an auto-incrementing `sequence` number, exact `amount_fils`, and `account_id`.
2. **Confidentiality:**
   Rebuilt snapshots must NEVER leak `activeProxyMaximumFils` to public clients.
3. **Monotonicity:**
   Lot sequence must never decrease during or after a snapshot rebuild.

---

## 3. Step-by-Step Replay Procedure

### Step 3.1: Inspect PostgreSQL Bid History for Target Lot
```sql
SELECT 
  id, 
  lot_id, 
  sequence, 
  bidder_account_id, 
  amount_fils, 
  bid_kind, 
  created_at 
FROM bid_ledger 
WHERE lot_id = '11111111-1111-4111-8111-111111111111' 
ORDER BY sequence ASC;
```

### Step 3.2: Rebuild Authoritative Lot State via API
Invoke `BiddingRecoveryService` via the internal recovery endpoint:
```bash
curl -X POST http://localhost:3000/api/v1/admin/lots/{lotId}/rebuild-snapshot \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

The system executes:
```ts
const state = await recoveryService.rebuildLotState(lotId);
```
Which recalculates:
- Current winning bid & leading account ID
- Highest sequence number
- Reserve status (`MET` vs `NOT_MET`) against `reserve_price_fils`
- Next minimum bid based on applicable minimum increment rule
- Active proxy bidder count (without leaking maximums)

### Step 3.3: Broadcast Rebuilt Snapshot to WebSocket Room
Once rebuilt, publish authoritative snapshot to the lot channel:
```bash
curl -X POST http://localhost:3000/api/v1/admin/lots/{lotId}/broadcast-sync \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
Connected clients receive `lot:snapshot` event, seamlessly resetting their UI state.
