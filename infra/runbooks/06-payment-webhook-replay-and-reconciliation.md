# Operational Runbook 06 — Payment Webhook Replay & Deposit Reconciliation

**Severity:** P2 (Transaction Delay) -> P1 (if Discrepancy > AED 10,000)  
**Owners:** Financial Operations Lead, Backend Payments Engineer  
**User Impact:** Timely credit of security deposits enabling paddle issuance; rapid resolution of failed top-ups or duplicate charges.

---

## 1. Triggers & Indicators

- Bidder reports card charged by payment provider (Stripe, Checkout.com, Network International), but mobile app shows "Deposit Required".
- Webhook endpoint returned 502/504 during traffic spike.
- Reconciling daily bank settlement statement against internal `deposits` and `deposit_ledger` tables.

---

## 2. Invariants & Financial Safety Guardrails

1. **Integer Fils Strict Arithmetic:**
   All balances, amounts, holds, and refunds are stored strictly as integer fils (`1 AED = 100 fils`). Floats are prohibited.
2. **Idempotent Webhook Processing:**
   Every webhook transaction is recorded with the provider event ID (`provider_event_id`). Replayed webhooks must return `200 OK` without duplicating ledger credits.
3. **No Phantom Credits:**
   Deposit credit is only granted upon verified digital signature matching the provider secret.

---

## 3. Investigating Missing Webhooks

### Step 3.1: Check Payment Webhook Metrics
```bash
curl -s http://localhost:3000/metrics | grep pioneer_payment_webhooks_total
```

### Step 3.2: Query Database for Provider Event ID
```sql
SELECT 
  id, 
  account_id, 
  provider_intent_id, 
  amount_fils, 
  status, 
  created_at 
FROM payment_intents 
WHERE provider_intent_id = 'pi_3MtwBwLkdIwHu7ix28a3tqPa';
```

---

## 4. Replaying Failed Webhook via CLI

If the webhook was missed or failed with an HTTP 500:
1. Retrieve raw event payload from provider dashboard.
2. Replay payload to internal webhook endpoint with valid signature:
   ```bash
   curl -X POST http://localhost:3000/api/v1/payments/webhooks/stripe \
     -H "Content-Type: application/json" \
     -H "Stripe-Signature: $SIGNATURE" \
     --data-binary @webhook_event.json
   ```
3. Verify response status is `200 OK`:
   ```json
   {
     "contractVersion": 1,
     "received": true,
     "status": "PROCESSED"
   }
   ```

---

## 5. Daily Ledger Reconciliation Query

Execute nightly automated audit query to detect discrepancies between held deposits and active winning bids:
```sql
SELECT 
  d.account_id, 
  d.balance_fils, 
  d.held_fils,
  COALESCE(SUM(l.current_bid_fils), 0) AS total_active_bids_fils
FROM deposits d
LEFT JOIN lots l ON l.leading_account_id = d.account_id AND l.lifecycle = 'LIVE'
GROUP BY d.account_id, d.balance_fils, d.held_fils
HAVING d.held_fils < 0 OR d.balance_fils < d.held_fils;
```
If any rows are returned, alert triggers `FinancialDiscrepancyAlert` (P1).
