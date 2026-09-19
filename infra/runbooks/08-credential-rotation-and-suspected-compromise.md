# Operational Runbook 08 — Credential Rotation & Suspected Account Compromise

**Severity:** P1 (Zero Downtime Rotation) / P0 (Active Compromise Incident)  
**Owners:** Chief Information Security Officer (CISO), Security Incident Team, Lead SRE  
**User Impact:** Targeted session termination for compromised accounts; seamless rolling rotation for infrastructure credentials without service interruption.

---

## 1. Triggers & Indicators

- Anomaly detection alert: Unusual geographical login spikes or credential stuffing attack.
- Leaked developer API token, database connection string, or secret key.
- Regular scheduled security compliance rotation (quarterly requirement).
- User reports unauthorized bids or suspicious deposit withdrawals.

---

## 2. Emergency Account Lockdown (Compromised User)

If a specific account is suspected of being compromised or unauthorized bids are being submitted:

### Step 2.1: Revoke Active Sessions & Freeze Account
Execute immediate administrative account lock:
```bash
curl -X POST http://localhost:3000/api/v1/admin/accounts/{accountId}/freeze \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "SUSPECTED_COMPROMISE",
    "rationale": "High-frequency bid pattern from unrecognized IP",
    "invalidateTokens": true,
    "disconnectSockets": true
  }'
```

### Step 2.2: Immediate System Actions
1. Account status in `accounts` table transitions to `RESTRICTED`.
2. All active JWTs for `accountId` are blacklisted in Redis with TTL matching token expiry.
3. WebSocket gateway terminates all open connections for `user:${accountId}` with code `ACCOUNT_RESTRICTED`.
4. Any active proxy bids belonging to `accountId` are immediately deactivated.

---

## 3. Zero-Downtime Infrastructure Credential Rotation

### Step 3.1: JWT Secret Rotation (Overlapping Verification)
To rotate JWT signing keys without logging out active mobile bidders:
1. Generate new 256-bit cryptographically secure secret:
   ```bash
   openssl rand -base64 32
   ```
2. Configure application with primary and secondary secrets:
   - `JWT_SECRET_PRIMARY`: New secret (used for signing new tokens).
   - `JWT_SECRET_SECONDARY`: Old secret (used to verify existing valid tokens during grace period).
3. Deploy configuration update.
4. After token expiry window (default: 24 hours), remove `JWT_SECRET_SECONDARY`.

### Step 3.2: Database Password Rotation
1. In PostgreSQL, update role password:
   ```sql
   ALTER ROLE pioneer_api WITH PASSWORD 'new_strong_password_here';
   ```
2. Update application secret store (AWS Secrets Manager / Environment).
3. Restart application nodes one by one (rolling restart) to pick up new database connection string:
   ```bash
   docker compose -f infra/local/compose.yml up -d --no-deps api
   ```
4. Confirm connection health via `GET /api/health`.

### Step 3.3: Payment Webhook Secret Rotation
1. Generate new signing secret in Stripe / Payment Provider dashboard.
2. Configure dual-signing verification in application `payment_webhook_secrets` configuration array.
3. In provider dashboard, swap primary webhook secret.
4. Verify `pioneer_payment_webhooks_total` reports `status="SUCCESS"`.
5. Remove obsolete secret from configuration.

---

## 4. Audit & Post-Incident Checklist

1. Verify `audit_logs` table for actions taken by the compromised identity:
   ```sql
   SELECT * FROM audit_logs WHERE actor_id = '{accountId}' ORDER BY created_at DESC;
   ```
2. File formal Security Incident Report (SIR) within 24 hours.
3. Issue new recovery credentials to verified account owner following video KYC re-verification.
