# Operational Runbook 02 — Auction Pause, Resume & Cancellation SOP

**Severity:** P1 / Emergency Intervention  
**Owners:** Auctioneer Lead, On-Call SRE  
**User Impact:** Temporarily stops incoming bids; preserves bidder sequence numbers, highest bids, and locks lot timers.

---

## 1. Triggers & Indications

- Sudden network partition between auction nodes or database latency spike.
- Operator error discovered in starting price, reserve, or catalog specification.
- Disputed bidding sequence requiring manual referee review.
- External regulatory or legal hold instruction.

---

## 2. Emergency Pause Execution

### Immediate API Command
Execute pause command with audit rationale:
```bash
curl -X POST http://localhost:3000/api/v1/admin/auctions/{auctionId}/pause \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "TECHNICAL_CALIBRATION",
    "rationale": "Investigating transient network latency spike",
    "operatorId": "op-admin-01"
  }'
```

### Invariants Maintained During Pause
1. Bidding engine transitions lot lifecycles from `LIVE` -> `PAUSED`.
2. Any subsequent manual or proxy bid submission is rejected with `AUCTION_PAUSED` (non-retryable until resumed).
3. Soft-close extension countdown timer freezes; remaining duration is preserved.
4. WebSocket gateway broadcasts `lot:paused` event to all connected clients:
   ```json
   {
     "event": "lot:paused",
     "lotId": "11111111-1111-4111-8111-111111111111",
     "contractVersion": 1,
     "serverTime": "2026-09-19T14:50:00.000Z"
   }
   ```

---

## 3. Post-Pause Diagnostic Procedure

1. **Verify Outbox Fan-out:**
   ```sql
   SELECT count(*) FROM outbox_events WHERE published_at IS NULL;
   ```
2. **Verify Bid Ledger Integrity:**
   ```sql
   SELECT sequence, amount_fils, bidder_account_id, created_at 
   FROM bid_ledger 
   WHERE lot_id = '11111111-1111-4111-8111-111111111111' 
   ORDER BY sequence DESC LIMIT 5;
   ```
3. **Verify Proxy Bids:** Ensure active proxies did not trigger unintended cascades during the pause window.

---

## 4. Clean Resume Execution

When resuming an auction:
- To ensure fairness to bidders who may have stepped away during the pause, automatically add a minimum buffer (default: **300 seconds / 5 minutes**) to `closes_at`.

```bash
curl -X POST http://localhost:3000/api/v1/admin/auctions/{auctionId}/resume \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "extensionSeconds": 300,
    "rationale": "Network latency resolved; extending closing by 5 minutes",
    "operatorId": "op-admin-01"
  }'
```

---

## 5. Cancellation Procedure (Irreversible)

If an auction or individual lot must be cancelled:
```bash
curl -X POST http://localhost:3000/api/v1/admin/lots/{lotId}/cancel \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "CATALOG_ERROR",
    "rationale": "Duplicate listing error",
    "operatorId": "op-admin-01"
  }'
```
- **Consequences:**
  - Lot lifecycle set to `CANCELLED`.
  - All active proxy bids deleted or marked invalid.
  - Bidder deposits earmarked for this lot are automatically unlocked/refunded.
