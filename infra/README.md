# Infrastructure

Task 001 adds local PostgreSQL, Redis, object storage, and mail-capture dependencies. AWS infrastructure is added incrementally after domain behavior is runnable locally.

Required runbooks before MVP release:

- test auction and go/no-go;
- auction pause/resume/cancel;
- bid event replay and snapshot rebuild;
- Redis degradation and recovery;
- database point-in-time recovery;
- payment webhook replay and reconciliation;
- notification provider outage;
- credential rotation and suspected account compromise.
