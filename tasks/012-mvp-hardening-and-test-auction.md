# Task 012 — MVP hardening and real test-auction gate

Recommended owner: product owner coordinating all stream owners

## Goal

Turn integrated features into an auditable release candidate and prove the weekly auction can run end-to-end before production money or public users are exposed.

## Prerequisites

- Tasks 004–011 accepted for MVP scope.
- Legal, security, finance, Arabic QA, and vendor go-live owners identified.

## Scope

- Close all MVP-blocking decisions and high-severity defects.
- Threat model/security review, dependency/secret/SAST/DAST checks, admin-role review, and data-retention review.
- Full English/Arabic UX content review and accessibility audit.
- Production-like migration, backup, restore, deploy, rollback/forward-fix, secret rotation, and provider-key rehearsal.
- Data migration/content seeding and lot-document/media quality checks.
- Internal synthetic auction followed by invited controlled auction with approved non-production payment approach.
- Rehearse browse, KYC, deposit, terms, manual/proxy race, outbid, soft close, reconnect, close, approval, invoice/payment, refund, support, and incident paths.
- Create go/no-go checklist, on-call roster, support macros, status/incident communication, and post-auction reconciliation.

## Acceptance criteria

- No unresolved critical/high security, ledger, bidding-correctness, payment, accessibility, or data-loss defect.
- Test auction completes with one reconciled ledger and no unexplained price/winner/close discrepancy.
- Bid latency, payment success, notifications, approval SLA, and refund journey are measured against defined targets.
- Admin actions and business decisions are present in immutable audit records.
- Native Arabic reviewer signs off critical paths; counsel/finance sign off applicable policies and invoices.
- Recovery and incident runbooks are executed, not only read.
- Product owner signs a documented go/no-go with known lower-severity risks and owners.

## Release evidence

Create `docs/releases/mvp-readiness.md` linking builds, migrations, contract version, test reports, load results, accessibility/security findings, provider approvals, test-auction timeline, reconciliation, open risks, and signoffs. Do not include secrets or personal data.
