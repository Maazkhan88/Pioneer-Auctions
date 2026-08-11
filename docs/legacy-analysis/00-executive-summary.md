# 00 — Executive Summary

## Pioneer Auctions Legacy System — Complete Functional & Technical Specification (Milestone 1: Reverse-Engineering Report)

**Scope**: `pioneer-web-main` (PHP/CodeIgniter 3.1.10 monolith — public website, customer portal, mobile/web API, and admin/back-office), `pioneer-mobile-app-main` (Flutter, "Vehicle Auction," v1.5.0+1), `pa-chatbot-admin-samin` (React chat-ops console) and `pioneer-chatbot-webhook-webhook` (Node.js WhatsApp webhook — confirmed architecturally disconnected from the main platform), and `Revoked Key.zip` (credential bundle, inspected read-only). None of this working directory is under git version control — all analysis is from static code review of the extracted zip exports.

## What the business does

Pioneer Auctions runs a **vehicle auction platform** (confirmed by the mobile app's own description) offering three auction formats from one shared data model: **online** (timed, asynchronous bidding with proxy/auto-bid), **closed** (the same mechanics, restricted to an invite list), and **live** (real-time hall-style bidding, run by a human auctioneer through a dedicated operator console, with its own bid-log table and Pusher-driven realtime broadcast to bidders). Sellers ("vendors") submit vehicles; staff curate which submitted items are added to a specific auction; buyers register, deposit funds (at general-account, per-auction, and per-lot granularity, all three used concurrently), bid, and settle via invoices/statements once a lot is won. See [03-business-domain.md](03-business-domain.md) and [05-auction-lifecycle.md](05-auction-lifecycle.md) for full detail.

## System shape

One large CodeIgniter 3 HMVC monolith (~30 modules, no separate services) serves the public website, the customer account area, the JSON API consumed by the mobile app, and the entire admin/back-office/auctioneer-console surface — all differentiated by module, not by deployment boundary. The Flutter mobile app and the website both talk to the same live API surface (`getapi`). Two further, unrouted-but-reachable legacy API implementations (`api`, `apis`) sit alongside it, still fully functional and signing tokens with the same secret. Realtime bidding runs on Pusher Channels over a single global channel. Full inventory in [01-system-map.md](01-system-map.md)/[02-repository-inventory.md](02-repository-inventory.md).

## The headline finding

**This system's foundational integrity mechanisms are missing or disabled, not merely outdated.** This isn't a "modernize the framework" situation — it's specific, confirmed, and severe:

- **No database transactions or row locking exist anywhere in the codebase** — not just in bidding, but in every multi-table financial operation (sale settlement, invoicing). Confirmed by an exhaustive grep returning zero hits.
- **An unauthenticated endpoint (`token_update`) mints a valid, 120-day login token for any user ID with zero credential check** — a complete account-takeover primitive against every account in the system, including Admin, requiring only a small guessable integer.
- **A real, working role-permission system (ACL) was built and then deliberately disabled** (its enforcement call is commented out in three shared base controllers) — every back-office authorization decision today is really just "is any staff member logged in," not "is this the right staff member for this action."
- **Social login trusts whatever email the client asserts**, with no server-side verification against Google/Facebook/Apple — a malicious client can log into or register as any email address, and can self-assign its own account role in the same request.
- **Passwords are unsalted single-round SHA-256** across every login path, and admin/back-office password-reset tokens never expire and are never invalidated after use.
- **Two unauthenticated debug/utility files sit at the production web root** — one runs `git pull` via `shell_exec()` on any request, the other is a bare `phpinfo()` — establishing this as a repeated pattern, not an isolated slip.
- **Every third-party integration credential (PayTabs, Pusher, SMS, FCM, JWT signing) is hardcoded in committed source**, not environment-managed.
- **Massive, drifted duplication**: three parallel API implementations, two parallel bid-log tables with different status vocabularies, two parallel user tables, and several whole duplicated modules — meaning fixes applied once do not propagate, and already haven't.

Full detail, evidence, and severity ratings for all of the above: [18-security-review.md](18-security-review.md) (28 numbered findings) and [19-technical-debt.md](19-technical-debt.md) (26 numbered debt items).

## What is implemented well

Not everything is broken. Reserve-price enforcement for online/closed auctions is genuinely server-authoritative with a sensible manual-approval fallback when reserve isn't met. JWT signature verification (aside from the `token_update` bypass) is real, not cosmetic. The customer-facing account area correctly scopes queries to the authenticated user with no IDOR pattern found. Refunds are implemented as audit-preserving mirrored ledger entries rather than deletions. Commission and minimum-deposit rules are properly configurable rather than hardcoded. The proxy/auto-bid ladder genuinely runs server-side. These are worth preserving as correct behavior in any rebuild — see the "Assessment: looks correct" callouts throughout [06-bidding-engine.md](06-bidding-engine.md) and [03-business-domain.md](03-business-domain.md).

## Document map

| Doc | Covers |
|---|---|
| [01-system-map.md](01-system-map.md) | High-level component/dependency map |
| [02-repository-inventory.md](02-repository-inventory.md) | Full repo inventory, module duplication resolution |
| [03-business-domain.md](03-business-domain.md) | Entities: auctions, lots, deposits, categories, sellers/buyers |
| [04-users-and-permissions.md](04-users-and-permissions.md) | Roles, ACL, auth mechanisms, IDOR findings |
| [05-auction-lifecycle.md](05-auction-lifecycle.md) | State machines: auction, lot, item, deposit |
| [06-bidding-engine.md](06-bidding-engine.md) | **Critical** — full bidding algorithm, concurrency, closing, operator actions |
| [07-mobile-app.md](07-mobile-app.md) | Flutter app: 31 screens, API surface, client-side risk |
| [08-website.md](08-website.md) | Public website, customer portal, feature-parity matrix |
| [09-admin-platform.md](09-admin-platform.md) | Back-office modules, operator console |
| [10-api-catalogue.md](10-api-catalogue.md) | Full endpoint inventory across all three API implementations |
| [11-database-model.md](11-database-model.md) | Reconstructed schema, table-by-table, cross-cutting integrity findings |
| [12-realtime-system.md](12-realtime-system.md) | Pusher architecture, consistency risk |
| [13-integrations.md](13-integrations.md) | All third-party services, credential handling |
| [14-background-jobs.md](14-background-jobs.md) | Cronjob module, scheduling gaps |
| [15-business-rules.md](15-business-rules.md) | Numbered rule catalogue (AUTH/USER/AUCTION/LOT/BID/FIN/ADMIN/NOTIF/REPORT) |
| [16-edge-cases.md](16-edge-cases.md) | 22-scenario edge-case matrix |
| [17-test-cases.md](17-test-cases.md) | Behavioral compatibility test cases, bugs flagged separately from intended behavior |
| [18-security-review.md](18-security-review.md) | 28 numbered security findings, CRITICAL→LOW |
| [19-technical-debt.md](19-technical-debt.md) | 26 numbered debt items, CRITICAL→LOW |
| [20-open-questions.md](20-open-questions.md) | Every open confirmation needed from the business |

## Status and next step

This completes the reverse-engineering milestone requested. Per the original brief, **no next-generation architecture planning has been started** — this report is the deliverable to review first. Two things are worth acting on regardless of what happens next: SEC-012 (`token_update`) should be treated as a live incident if this codebase is still running in production, since it's exploitable today independent of any future rebuild timeline; and the open questions in [20-open-questions.md](20-open-questions.md) around production database/PHP versions and which subsystems are still actually in active use would materially sharpen every phase of this report if answered.
