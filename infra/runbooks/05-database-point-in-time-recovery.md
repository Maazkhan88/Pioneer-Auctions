# Operational Runbook 05 — Database Point-In-Time Recovery (PITR) & Disaster Recovery

**Severity:** P0 / Critical Disaster Recovery  
**Owners:** Principal Database Administrator, SRE Lead  
**User Impact:** Entire platform placed in maintenance mode during restoration; zero financial ledger data loss permitted.

---

## 1. Scope & Objective

Recover the Pioneer Auctions PostgreSQL database to a precise timestamp prior to data corruption, errant schema modification, or physical host failure, using Write-Ahead Logging (WAL) and continuous base backups.

---

## 2. Recovery Prerequisites

1. Access to target PostgreSQL instance and S3/MinIO WAL archive.
2. Exact target recovery timestamp (UTC) identified by the incident commander:
   - Example: `2026-09-19 14:15:00 UTC`
3. Platform locked in Maintenance Mode to prevent new inbound transactions during restoration.

---

## 3. Step-by-Step Restoration Procedure

### Step 3.1: Put Platform in Maintenance Mode
```bash
# Set maintenance flag via gateway or edge reverse proxy
curl -X POST http://localhost:3000/api/v1/admin/system/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "reason": "Emergency database restoration"}'
```

### Step 3.2: Stop API and Worker Instances
Prevent any connection attempts against the database cluster during recovery:
```bash
# Docker local
docker compose -f infra/local/compose.yml stop api worker
```

### Step 3.3: Execute Point-in-Time Recovery (WAL)
1. Stop PostgreSQL service:
   ```bash
   docker compose -f infra/local/compose.yml stop postgres
   ```
2. Place `recovery.signal` file in the database directory:
   ```bash
   touch $PGDATA/recovery.signal
   ```
3. Configure target recovery timestamp in `postgresql.conf` / `recovery.conf`:
   ```ini
   restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
   recovery_target_time = '2026-09-19 14:15:00.000 UTC'
   recovery_target_action = 'promote'
   ```
4. Start PostgreSQL to trigger replay:
   ```bash
   docker compose -f infra/local/compose.yml start postgres
   docker compose -f infra/local/compose.yml logs -f postgres
   ```
5. Confirm successful log replay ending in promotion:
   `LOG: archive recovery complete; database system was not properly shut down; automatic recovery in progress`
   `LOG: redo starts at ... redo done at ...`
   `LOG: database system is ready to accept connections`

---

## 4. Post-Recovery Validation & Reconciliation

Before reopening traffic, execute the audit reconciliation script:
1. **Check Highest Sequences:**
   ```sql
   SELECT lot_id, max(sequence) as max_seq FROM bid_ledger GROUP BY lot_id;
   ```
2. **Reconcile Account Deposit Balances:**
   ```sql
   SELECT account_id, balance_fils, held_fils FROM deposits WHERE balance_fils < 0;
   -- Must return 0 rows
   ```
3. **Verify No Broken Foreign Keys or Orphaned Bids:**
   ```sql
   SELECT count(*) FROM bid_ledger WHERE lot_id NOT IN (SELECT id FROM lots);
   -- Must return 0
   ```

### Step 4.2: Disable Maintenance Mode
```bash
docker compose -f infra/local/compose.yml start api worker
```
Verify readiness via `GET /api/health`.
