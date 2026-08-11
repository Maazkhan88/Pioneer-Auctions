# 15 — Business Rule Catalogue

Status: Phase 15 complete. Every rule below was directly observed in code (not assumed) during earlier phases; each entry links back to its source document for full evidence.

## AUTH

- **AUTH-001**: Password hashing is unsalted single-round SHA-256 across every login surface. [04](04-users-and-permissions.md)/[18](18-security-review.md) SEC-013.
- **AUTH-002**: API tokens (JWT) are valid for 120 days with no server-side revocation; logout (`deauthorize`) is a no-op. [18](18-security-review.md) SEC-015.
- **AUTH-003**: OTP codes are 4 digits, generated non-cryptographically, and expire after 3 minutes for registration/login; no expiry exists for the separate password-reset code. [04](04-users-and-permissions.md) §5.
- **AUTH-004**: Admin/jobcard password-reset tokens (`uniqid()`-based) never expire and are never invalidated after use. [18](18-security-review.md) SEC-018.
- **AUTH-005**: Social login (Google/Facebook/Apple) trusts the client-submitted email with no provider-side verification; new accounts are auto-activated with no OTP step. [04](04-users-and-permissions.md) §8, SEC-016.
- **AUTH-006**: A client can self-assign its own `role` value at registration/social-login time — no server-side restriction to the customer role. [04](04-users-and-permissions.md) §8.

## USER / ROLE

- **USER-001**: Ten numeric roles exist (Admin, Sales Manager, Sales Person, Customer, Operational Department, Tasker, Live Auction Controller, Cashier, Appraiser, Marketing); only role 4 (Customer) is excluded from the back office. [04](04-users-and-permissions.md) §1.
- **USER-002**: `users.type` (`vendor`/`buyer`/`both`) distinguishes seller vs. buyer behavior only within the customer role. [04](04-users-and-permissions.md) §1.
- **USER-003**: Back-office authorization is "any staff role logged in," not "the correct role for this action" — the built ACL/permission system is never enforced. [04](04-users-and-permissions.md) §2, SEC-020.

## AUCTION

- **AUCTION-001**: Three auction types exist — `online` (timed/async), `closed` (online + invite-list gate), `live` (hall-style) — modeled as one `access_type` value on a shared `auctions` table, not separate schemas. [03](03-business-domain.md) §3.
- **AUCTION-002**: Closed auctions require a non-empty invite list (`close_auction_users`) — server-validated as required whenever `access_type == 'closed'`. [03](03-business-domain.md) §9.
- **AUCTION-003**: A lot can have its own `bid_end_time` distinct from the parent auction's `expiry_time`, allowing staggered per-lot closes within one auction. [05](05-auction-lifecycle.md).
- **AUCTION-004**: No formal "auction archived/completed" terminal status was confirmed — `'active'` is the only literal status value found. [05](05-auction-lifecycle.md) — UNKNOWN.

## LOT / ITEM

- **LOT-001**: Reserve price = `item.price`. For online/closed auctions, a winning bid ≥ reserve auto-sells; below reserve, the lot goes to a manual `approval` state instead of auto-failing. [03](03-business-domain.md) §4/§9, [06](06-bidding-engine.md) §3.
- **LOT-002**: For live-hall auctions, reserve is display-only — sold/not-sold/approval is entirely the human auctioneer's discretion, with no automatic reserve check. [06](06-bidding-engine.md) §3 — flagged as intentional-or-gap unconfirmed.
- **LOT-003**: A per-lot security deposit can be required independently of the general auction registration deposit, via `auction_items.security`/`deposit`. [03](03-business-domain.md) §5.
- **LOT-004**: There is no formal "pending review/approved/rejected" state for vendor-submitted items — submission is immediately live; staff curation of which items get added to an auction is the de facto approval gate. [03](03-business-domain.md) §6.
- **LOT-005**: `item.item_status` transitions `created → completed` automatically upon document upload, not via manual review. [03](03-business-domain.md) §4.
- **LOT-006**: Make/model is a flat, category-agnostic two-level list, only shown when the item's category has `include_make_model = 'yes'` — not a strict Category→Make→Model tree. [03](03-business-domain.md) §7.

## BID

- **BID-001**: The bid increment amount is fully client-determined in every bidding surface (`getapi`, `OnlineAuction`, and the legacy `api` module) — no server-side minimum-increment floor exists anywhere. [06](06-bidding-engine.md) §1, SEC-007.
- **BID-002**: Proxy/auto-bidding is supported (`bid_auto` table); the server runs the auto-raise ladder itself up to a bidder-chosen `bid_limit`, in fixed bidder-chosen `bid_increment` steps (not an admin-configured schedule). [06](06-bidding-engine.md) §2.
- **BID-003**: A bid is rejected if it's stale relative to the actual current price, if the auction/lot is closed or already resolved, if the bidder's projected exposure exceeds `balance × 10`, or (live-hall) exceeds a client-supplied `max_bid_limit` ceiling. Full enumerated list in [06](06-bidding-engine.md) §6.
- **BID-004**: No duplicate/double-submission protection exists — no idempotency key or nonce on bid placement. [06](06-bidding-engine.md) §6.
- **BID-005**: No database transaction or row lock protects any bid write — "current price" is always re-derived from an unlocked `ORDER BY id DESC` read. [06](06-bidding-engine.md) §4, SEC-006/SEC-025.
- **BID-006**: Bidder-facing bids (`getapi`) and operator hall bids (`live_auction_controller`) write the same table with zero coordination between the two surfaces. [06](06-bidding-engine.md) §8, SEC-008.
- **BID-007**: Live-hall bid history can be permanently, silently deleted by staff via retract/retract-all/rollback actions, with no soft-delete or audit trail. [06](06-bidding-engine.md) §7, SEC-009.
- **BID-008**: Only successful bids are logged — rejected bid attempts are never persisted, weakening the bid log's value as a complete forensic record. [06](06-bidding-engine.md) §9.
- **BID-009**: No anti-sniping/time-extension mechanism exists in either bidding surface. [06](06-bidding-engine.md) §5 — UNKNOWN whether intentional.

## PAYMENT / FINANCE

- **FIN-001**: Three distinct deposit concepts coexist: per-auction "temporary" registration deposit, general "permanent" account balance, and per-lot security deposit — used concurrently, not as alternatives. [03](03-business-domain.md) §5.
- **FIN-002**: A global minimum deposit amount is configurable (`settings.min_deposit`), not hardcoded. [03](03-business-domain.md) §9.
- **FIN-003**: Deposit adjustments are blocked while the target user has an active bid elsewhere — an explicit, deliberate guard. [03](03-business-domain.md) §9.
- **FIN-004**: Refunds are implemented as a mirrored ledger entry (`CR` row), not a deletion of the original `DR` row — a sound audit-preserving pattern, in contrast to bid-log deletion. [03](03-business-domain.md) §5.
- **FIN-005**: Commission (buyer/seller) is configurable via the `seller_charges` table (percent or flat amount per user type), not hardcoded. [03](03-business-domain.md) §9.
- **FIN-006**: The mobile/API PayTabs deposit path performs no server-side payment verification — client-asserted status alone marks a deposit approved. The older website PayTabs path does verify server-side. [18](18-security-review.md) SEC-023.
- **FIN-007**: Monetary values appear to be stored/computed as floating-point (confirmed `double` for at least one commission field; no fixed-point casting found anywhere in the model layer for any monetary value). [11](11-database-model.md) — UNKNOWN pending DB introspection.

## ADMIN / OPERATOR

- **ADMIN-001**: Live-hall operator actions (including irreversible bulk bid-history deletion) are reachable by any authenticated staff role — no role-7-specific ("Live Auction Controller") restriction is enforced. [06](06-bidding-engine.md) §7, SEC-005.
- **ADMIN-002**: `provisionalSoldAuctionBid` is routed but does not exist as a method — a dead endpoint. [06](06-bidding-engine.md) §7, SEC-011.
- **ADMIN-003**: Staff can convert a per-auction "temporary" deposit into a general "permanent" account balance via an explicit action. [03](03-business-domain.md) §5.
- **ADMIN-004**: Financial adjustment actions (`adjust_security`, `adjust_deposit`) take user/amount identifiers from raw request parameters with no ownership or role-specific re-check. [18](18-security-review.md) SEC-019.

## NOTIFICATION

- **NOTIF-001**: Push notifications (FCM) fire on registration, outbid events, item-rejected, auction-going-live, live-hall-started, item-expiring-soon, deposit-received, and auction-won. [13](13-integrations.md).
- **NOTIF-002**: Realtime bid updates broadcast on a single global Pusher channel (`ci_pusher`) for the entire platform, not scoped per-auction/per-item. [12](12-realtime-system.md).
- **NOTIF-003**: Email notifications fire on registration/OTP and sale-out (`cronjob::sale_out_email`); the "deposit required"/void-transaction email path is dead code (early `die()` in `paytabsVoidTransaction`). [13](13-integrations.md)/[14](14-background-jobs.md).

## REPORTING

- **REPORT-001**: The `reports` module reads from essentially every core table (`auctions`, `bid`, `live_auction_bid_log`, `sold_items`, `auction_deposit`) — any of the naming/value inconsistencies catalogued in [11-database-model.md](11-database-model.md) (e.g. `bid_status` as both `'won'` and `'win'`) will silently produce incomplete reports wherever a report query filters on only one spelling. [09](09-admin-platform.md).
