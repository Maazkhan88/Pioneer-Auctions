# Infrastructure

Task 001 adds local PostgreSQL, Redis, object storage, and mail-capture dependencies. AWS infrastructure is added incrementally after domain behavior is runnable locally.

`local/compose.yml` supplies PostgreSQL, Redis, MinIO, and Mailpit with named volumes and health checks:

```bash
docker compose -f infra/local/compose.yml up -d --wait
docker compose -f infra/local/compose.yml ps
```

The API readiness endpoint probes PostgreSQL and Redis with a bounded timeout. MinIO and Mailpit remain independently health-checked in Compose until application modules consume them. Validate the checked-in structure on a machine without Docker using `corepack pnpm infra:config`.

Required runbooks before MVP release:

- test auction and go/no-go;
- auction pause/resume/cancel;
- bid event replay and snapshot rebuild;
- Redis degradation and recovery;
- database point-in-time recovery;
- payment webhook replay and reconciliation;
- notification provider outage;
- credential rotation and suspected account compromise.
