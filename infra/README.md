# Infrastructure

Task 001 adds local PostgreSQL, Redis, object storage, and mail-capture dependencies. AWS infrastructure is added incrementally after domain behavior is runnable locally.

`local/compose.yml` supplies PostgreSQL, Redis, MinIO, and Mailpit with named volumes and health checks:

```bash
docker compose -f infra/local/compose.yml up -d --wait
docker compose -f infra/local/compose.yml ps
```

The API readiness endpoint probes PostgreSQL and Redis with a bounded timeout. MinIO and Mailpit remain independently health-checked in Compose until application modules consume them. Validate the checked-in structure on a machine without Docker using `corepack pnpm infra:config`.

Required runbooks before MVP release:

- [01: Test auction and go/no-go](runbooks/01-test-auction-and-go-no-go.md)
- [02: Auction pause/resume/cancel](runbooks/02-auction-pause-resume-cancel.md)
- [03: Bid event replay and snapshot rebuild](runbooks/03-bid-event-replay-and-snapshot-rebuild.md)
- [04: Redis degradation and recovery](runbooks/04-redis-degradation-and-recovery.md)
- [05: Database point-in-time recovery](runbooks/05-database-point-in-time-recovery.md)
- [06: Payment webhook replay and reconciliation](runbooks/06-payment-webhook-replay-and-reconciliation.md)
- [07: Notification provider outage](runbooks/07-notification-provider-outage.md)
- [08: Credential rotation and suspected account compromise](runbooks/08-credential-rotation-and-suspected-compromise.md)
