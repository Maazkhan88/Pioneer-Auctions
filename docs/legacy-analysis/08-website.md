# 08 — Public Website & Customer Portal

Status: Phase 7 complete, synthesized from the domain/lifecycle, auth, and API-catalogue research passes (the website is served by the same CodeIgniter monolith already deeply reviewed for those phases — its customer-facing controllers were read directly as part of understanding auction types and bid placement, so this document indexes and cross-references rather than re-deriving from scratch).

## Structure

The public website, customer account area, and API are all one codebase (`pioneer-web-main`), differentiated by module rather than by deployment. Relevant customer-facing modules: `home` (landing/login/register), `visitor` (about/contact/FAQ/livestream, guest-accessible), `search` (general search), `livehall` (live-auction catalog/browse, read-only), `auction` (contains both admin CRUD *and* the customer-facing bidding controllers `OnlineAuction.php`/`LiveAuction.php`), `customer` (logged-in account area — dashboard, deposits, sell-item, profile, balance, bid history), `items` (customer-facing item detail, `items/details/$1`), `cms` (static content), `template` (shared layout/header/footer, including the Analytics/GTM/reCAPTCHA integration points noted in [13-integrations.md](13-integrations.md)).

## Routes (from `application/config/routes.php`, full detail in [02-repository-inventory.md §6](02-repository-inventory.md))

- **Public browsing**: `/`, `search`, `livehall`, `about-us`, `contact-us`, `faqs`, `livestream`, `auction/items/$1`, `auction/details/$1/$2`, `auction/online-auction/$1`, `auction/online-auction/details/$1/$2`, `auction/live-auction`, `auction/live-auction-items/$1`, `auction/live-auction/details/$1/$2`, `live-online/$1`, `live-online-detail/$1/$2`, `items/details/$1`, `inspection_report/$1`, `about/mission`, `about/team`.
- **Auth**: `user-login` → `home/login`, `user-register` → `home/register`.
- **Customer account** (requires session, `Customer_Controller` gate): `customer` (dashboard), `deposits`, `sell-item`, `deposit`, `profile`, `change-password`, `logout`, `balance`, `user-bids`.
- **Deposits/payments** (customer + admin-shared routes): `user-deposits/$1`, `user-deposits-general*`, `user-payments/$1`, `user-payables/$1`, `security-adjust/*` (staff-only, IDOR-flagged — SEC-019), `deposit-adjust/*`, `make-payment/$1/$2`, `receipt/$1`, `buyer-invoice/$1`, `buyer-statement/$1`, `seller-invoice/$1`, `seller-statement/$1`.

## Auction types as experienced on the website

The website exposes all three auction types found in [03-business-domain.md §3](03-business-domain.md) through distinct URL patterns and controllers, but shares the same underlying `auctions`/`auction_items` tables:

- **Online** (`auction/online-auction/*`, controller `OnlineAuction.php`, 7,099 lines) — the timed/asynchronous bidding experience with proxy/auto-bid support.
- **Live** (`auction/live-auction*`, `live-online*`, controller `LiveAuction.php`, 459 lines) — the hall-style experience, paired with the `livehall` catalog/browse module and the `live_auction_controller` operator console (not customer-facing).
- **Closed** — same `OnlineAuction.php` controller as Online, gated to the invite list stored in `auctions.close_auction_users`.

`OnlineAuction::placebid()` on the website is a **near-duplicate implementation** of `getapi::placebid()` (the mobile/JS API method) — same lack of server-side minimum-increment enforcement, same unlocked read-then-write pattern (see [06-bidding-engine.md §0](06-bidding-engine.md)). This means the core bidding vulnerability/gap findings apply to browser-based bidding on the website exactly as they do to the mobile app, independently of which client is used.

## Customer account area (`customer` module)

Session-gated via `Customer_Controller` (role 4 only, plus a `status==0` blocked-user check). Provides: dashboard, deposit management (`deposits`/`deposit`), sell-item submission (feeds the same `item`/`save_item` flow documented in [03-business-domain.md §6](03-business-domain.md)), profile/change-password, balance view, and bid history (`user-bids`). Correctly scopes essentially all queries to the session-derived user ID (~28 occurrences confirmed in the auth research pass) — this is the one major surface in the codebase **without** the IDOR pattern found in the staff-facing financial-adjustment endpoints (SEC-019).

## Feature parity matrix

| Function | Mobile app | Website | Admin portal | Backend API used |
|---|---|---|---|---|
| Browse/search auctions | Yes | Yes | Yes (as staff) | `getapi` (mobile) / server-rendered (website) |
| Register/login (email) | Yes | Yes | Yes (separate staff login) | `getapi::registerUser/loginUser` / `home::login_process` / `user::login` |
| Social login (Google/FB/Apple) | Yes | UNKNOWN — not confirmed in website review; social-login buttons not specifically traced in `home/views` in this pass | No | `getapi` only, confirmed |
| Place bid (online/closed) | Yes (`getapi::placebid`) | Yes (`OnlineAuction::placebid`, near-duplicate logic) | N/A (operator uses live-hall console instead, for live auctions) | Two independent implementations, same gaps |
| Place bid (live-hall) | Yes (`getapi::place_bid_live`) | UNKNOWN — live-hall customer bidding via browser not specifically confirmed distinct from the mobile path in this pass; `LiveAuction.php` (customer controller) exists but its bid-submission path wasn't independently traced | Operator console (`live_auction_controller`) — distinct, staff-only path | See [06-bidding-engine.md §8](06-bidding-engine.md) |
| Proxy/auto-bid | Yes | Yes (same `bid_auto` mechanism) | N/A | Shared table, three consumer call sites |
| Wishlist/favorites | Yes | UNKNOWN — no customer-facing wishlist UI was confirmed in the website modules reviewed; `favorites_items` table is written only from `getapi` per the domain research pass | No | `getapi` confirmed; website UNKNOWN |
| Deposit / PayTabs payment | Yes (unverified server-side, SEC-023) | Yes, via the **older**, properly-verified `Paytabs.php`/`Customer::return_paytab()` path | Staff can adjust/refund deposits (IDOR-exposed, SEC-019) | Two different PayTabs library versions — see [13-integrations.md](13-integrations.md) |
| Sell/submit item | Yes (`AddNewItem` screen) | Yes (`customer/sell-item`) | Yes (full CRUD, `items` module) | Same underlying `item` table/flow |
| Vehicle valuation calculator | UNKNOWN — not found as a mobile screen in the Phase 6 review | Yes (`valuation` module, `cars` module tables) | Yes (admin CRUD for valuation reference data) | Entirely separate `valuation_*` tables, unrelated to the item catalog |
| Notifications (push) | Yes (FCM) | Web push (`firebase-messaging-sw.js` present at web root) | N/A | Shared FCM integration, legacy HTTP API |
| WhatsApp chat | UNKNOWN — no in-app WhatsApp integration found in mobile screens | UNKNOWN — not confirmed on website | Separate system entirely | `pioneer-chatbot-webhook-webhook` (architecturally disconnected — [13-integrations.md](13-integrations.md)) |

## SEO / marketing

`sitemap.xml` present at the web root (80 KB — a substantial, presumably auto-generated sitemap). Google Analytics (Universal Analytics), Google Ads conversion tracking, and Google Tag Manager are live in the shared customer template header/footer (`template/views/new/template_user.php`) — see [13-integrations.md](13-integrations.md). reCAPTCHA is present on login/register forms client-side only (server-side `siteverify` not confirmed — SEC-024).

## Open questions carried forward

- Exact website-side live-hall bidding flow (`LiveAuction.php`'s customer-facing bid submission) was not independently traced with the same rigor as the mobile/API path — **UNKNOWN — REQUIRES FOLLOW-UP** whether it calls the same `getapi::place_bid_live` endpoint via JS, or has its own server-rendered form-post bidding path (which would be a *fourth* independent bid-submission implementation alongside `getapi`, `api`, and `OnlineAuction`).
- Social login and wishlist availability on the website (vs. mobile-only) were not conclusively confirmed — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION**.
- Whether the vehicle valuation calculator is mobile-accessible at all (no matching screen found in the Phase 6 mobile review) — if web-only, this is a real feature-parity gap worth confirming is intentional.
