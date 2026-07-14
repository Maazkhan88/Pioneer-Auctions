# Architecture

## Context

Pioneer Auctions is one domain platform with three clients and one operations surface. Web and mobile must have bidding parity; admin may use privileged commands but does not bypass domain rules or audit logging.

```text
Flutter mobile ─┐
Next.js web ────┼── HTTPS + Socket.IO ── NestJS edge/API
Next.js admin ──┘                         │
                                         ├─ Identity / KYC
                                         ├─ Catalog / search
                                         ├─ Auction orchestration
                                         ├─ Atomic bidding engine
                                         ├─ Deposits / payments
                                         ├─ Offers / approvals
                                         └─ Notifications / reporting
                                              │
                           ┌──────────────────┼──────────────────┐
                           PostgreSQL         Redis              S3/OpenSearch
                           durable ledgers    live state/locks   media/search
```

## Monorepo boundaries

```text
apps/
  api/                    NestJS REST, Socket.IO, workers
  web/                    public browsing and complete bidding client
  admin/                  protected operations console
  mobile/                 Flutter iOS/Android app
packages/
  contracts/              versioned transport types and schemas
  design-tokens/          source tokens consumed by web/admin and exported for Flutter
  config/                 shared TypeScript, lint, test, formatting configuration
infra/
  local/                  local PostgreSQL, Redis, object store, mail sink
  aws/                    infrastructure as code, added after local architecture settles
  runbooks/               incident, replay, recovery, and auction operations
docs/                     decisions, contracts, state, quality, product rules
tasks/                    bounded implementation packets
```

Apps may depend on packages. Packages must never depend on apps. Domain code in `apps/api` must not import framework/controller code into core services.

## Backend modules

- `identity`: accounts, sessions, roles, UAE PASS/provider linking, KYC status.
- `catalog`: categories, lots, media, documents, specifications, sellers.
- `auctions`: schedule, lot assignment, terms versions, reserve configuration, lifecycle.
- `bidding`: command validation, manual/proxy resolution, sequence assignment, soft-close, durable bid outbox.
- `eligibility`: deposit holds, restrictions, terms acceptance, risk decisions.
- `payments`: intents, hosted checkout, webhooks, deposit/financial ledgers, refunds.
- `offers`: make-an-offer and admin decisions.
- `approvals`: final-bid and consignment queues with SLAs and audit events.
- `notifications`: user preferences, templates, fan-out, delivery receipts.
- `reporting`: read models for dashboards, lot analytics, finance, and operations.
- `audit`: immutable admin and security action records.

Start as a modular monolith. Use an internal transactional outbox for durable asynchronous work. Extract services only when scale, security isolation, or team ownership demonstrates the need.

## Data ownership

PostgreSQL owns:

- identity links and KYC state (sensitive attributes encrypted or tokenized);
- catalog and auction configuration;
- append-only bid, deposit, payment, and audit ledgers;
- terms acceptances, offers, approvals, invoices, and notification intents;
- last durable auction state and outbox events.

Redis owns only recoverable/derived operational state:

- current lot bid state used by the atomic accept path;
- idempotency and short-lived command results;
- distributed fencing/coordination where required;
- Socket.IO fan-out and presence estimates;
- timer/scheduler indexes for close evaluation.

Redis loss must degrade service safely and be rebuildable from PostgreSQL. It must never silently reopen a closed lot or lose an accepted bid.

## Atomic bidding boundary

The acceptance transaction must behave as one serializable decision per lot:

1. authenticate bidder and resolve account;
2. return the saved result for a repeated `commandId`;
3. validate KYC, account restrictions, deposit eligibility, and accepted terms version;
4. read authoritative current state and server time;
5. reject if not live or already at/past `closesAt`;
6. validate requested amount against increment and proxy rules;
7. resolve competing proxy maxima, including deterministic ties;
8. calculate reserve status without exposing the reserve price;
9. extend `closesAt` if the accepted action meets soft-close policy;
10. allocate ordered per-lot sequence values;
11. append bid records and state/outbox records durably;
12. acknowledge the command and publish sanitized events.

Implementation may use a Redis Lua script plus a durable-write protocol or a PostgreSQL row lock/serializable transaction. Task 004 must prove crash behavior and may choose the simpler correct path before optimizing. No WebSocket broadcast may be presented as durable acceptance before the durable commit succeeds.

## Event delivery model

- Commands use Socket.IO acknowledgements with a stable envelope.
- Public lot events are at-least-once and ordered by `sequence` within a lot.
- Clients discard duplicates, detect gaps, and request `lot:sync` after reconnect or a gap.
- Personal events are emitted only to authenticated user rooms.
- Database outbox rows are the durable source for publish/retry; consumers are idempotent.
- A `lot:snapshot` supersedes older derived client state up to its `sequence`.

## Search and analytics

PostgreSQL is sufficient during foundation/MVP development. Add OpenSearch behind an indexing consumer when faceted scale requires it. Lot views and active-time events enter an analytics stream/read model; raw client pings are rate-limited, consent-aware, and never used as the financial source of truth.

## Security and compliance posture

- Hosted/tokenized payments only; do not handle raw PAN/CVV.
- OAuth 2.0/OIDC authorization-code flow with PKCE for UAE PASS and other identity providers.
- Short-lived access tokens and rotating/revocable refresh sessions.
- Encryption in transit; KMS-backed encryption at rest for sensitive fields and objects.
- Least-privilege admin RBAC with step-up authentication for financial and close actions.
- Append-only audit records for approvals, rejection, refunds, manual pause/close, role changes, and configuration changes.
- Data classification, retention, subject-rights, consent, and deletion workflows require legal sign-off before production.
- Production bid and payment actions expose correlation IDs, metrics, alerts, and reconciliations.

## Deployment target

- CloudFront/WAF for public traffic and media delivery.
- ECS/Fargate services behind ALB for API, gateway, workers, web, and admin.
- RDS PostgreSQL Multi-AZ with point-in-time recovery.
- ElastiCache Redis Multi-AZ with appropriate persistence/failover configuration.
- S3 for private/public media classes; presigned upload/download and malware scanning for documents.
- Secrets Manager, KMS, CloudWatch/OpenTelemetry, and isolated environments/accounts.

The initial implementation must stay cloud-portable at application boundaries, while AWS-specific infrastructure is expected under `infra/aws`.
