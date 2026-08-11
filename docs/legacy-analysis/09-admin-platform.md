# 09 — Admin / Back-Office Platform

Status: Phase 8/9 complete for what surfaced during the auth, domain, database, and bidding research passes. This document indexes the admin/back-office surface rather than re-deriving it — a dedicated screen-by-screen admin UI walkthrough (analogous to [07-mobile-app.md](07-mobile-app.md)'s screen table) was not separately commissioned in this research round and would be a reasonable follow-up if deeper admin-UX detail is needed.

## Access & roles

Entry point: `$route['admin'] = 'user'` — the `user` module owns admin login (`User::login()`), redirecting by role to different landing views. Session-gated via `Admin_Controller`/`Loggedin_Controller` (any of the 9 non-customer roles passes; no per-action role restriction is enforced — the ACL system that could do this is built but disabled, see [04-users-and-permissions.md §2](04-users-and-permissions.md)). Full role list and the "how many independent login implementations exist" finding are in [04-users-and-permissions.md](04-users-and-permissions.md).

## Modules comprising the back office

| Module | Function |
|---|---|
| `admin` | Dashboard/shell |
| `users` | Customer/back-office user management, deposits, payments, invoices, statements, security/deposit adjustments (IDOR-exposed — SEC-019) |
| `acl` | Role/permission management UI — built, but its output is never enforced anywhere except sidebar visibility (SEC-020) |
| `auction` | Full auction/lot CRUD, direct-sale, deposit management — the admin half of the module whose customer-facing half (`OnlineAuction.php`/`LiveAuction.php`) is covered in [08-website.md](08-website.md) |
| `live_auction_controller` | The live-hall operator/auctioneer console — full detail in [06-bidding-engine.md §7](06-bidding-engine.md) |
| `items` | Item/lot catalog CRUD, categories, makes/models, dynamic per-category fields |
| `cars` / `valuation` | Vehicle valuation calculator back-office (separate `valuation_*` tables, unrelated to the item catalog) |
| `crm` | Lead/customer-relationship tracking (`crm_detail`, lead source/category/stage, loss reasons, email templates) |
| `sales` | Sales-side reporting/management (specific scope not independently deep-dived) |
| `accounts` | Finance/accounting entries (specific scope not independently deep-dived) |
| `transaction` | Payment/transaction management, including the older, properly-verified PayTabs flow (`Transaction.php`) |
| `reports` | Reporting surface — referenced extensively by the database-reconstruction pass as a consumer of nearly every core table (`auctions`, `bid`, `live_auction_bid_log`, `sold_items`, `auction_deposit`) |
| `jobcard` | Internal staff task/job-card system — has its own `jobcard_login()` with an apparent internal inconsistency (queries a seemingly-unpopulated `jobcard_users` table in one place, the main `users` table in another — see [04-users-and-permissions.md §9](04-users-and-permissions.md)) |
| `settings` | System configuration — commission rates (`seller_charges`), minimum deposit, bank details, popup/CMS singletons |
| `cms` / `footer_content` | Static content management |
| `login` | A **third, independent** admin-login implementation (`Login::login_user()`) separate from `user::login()` — see [04-users-and-permissions.md §9](04-users-and-permissions.md), likely legacy/superseded |
| `screens` | UI screen definitions feeding the live-hall public display screens (`main-screen`, `bid-screen`, `screen-three`, `image-screen` routes) — a "big screen" presentation layer for the physical auction hall, distinct from the operator console |

## Cross-cutting admin-side findings (full detail linked, not repeated)

- **No enforced role-specific authorization on any back-office action** — every controller gate is "any staff role," not "the correct staff role for this action." See [04-users-and-permissions.md §2/§7](04-users-and-permissions.md), [18-security-review.md SEC-005/SEC-019/SEC-020](18-security-review.md).
- **Financial adjustment endpoints are IDOR-exposed** (`adjust_security`, `adjust_deposit`) — SEC-019.
- **Live-hall operator actions include irreversible, unaudited bulk-delete operations** reachable by any staff login — SEC-009.
- **The ACL admin screen itself** (`Acl_roles`, for assigning the — currently unenforced — permission matrix) has no restriction beyond "any staff login," meaning any staff account can currently reassign any role's permissions even though those permissions don't yet gate anything.
- **`jobcard` module's login/table inconsistency** suggests this sub-portal may be partially abandoned or drifted from the main `users` table — worth a direct business check on whether the jobcard/task-assignment feature is still actively used.

## Screen presentation layer (`screens` module) — the physical-hall display

Distinct from both the operator console and the customer-facing live-auction views: `main-screen`, `bid-screen` (`screens/screen_two`), `screen-three`, `image-screen` routes suggest a dedicated "what's showing on the big screen in the auction room" presentation layer, likely reflecting the `live_auction_bid_log`/current-lot state for an audience display rather than for interaction. Not independently deep-dived in this research round — **UNKNOWN — REQUIRES FOLLOW-UP** if a full understanding of the physical-hall technology stack is needed for a rebuild.

## Open questions carried forward

- Detailed screen-by-screen admin UI walkthrough (analogous to the mobile app's) was not performed — if the rebuild scope needs precise admin-UX parity, a dedicated pass over `admin`, `accounts`, `sales`, `reports` view files is recommended before design work begins.
- Exact scope/purpose of the `accounts` and `sales` modules beyond their names was not independently confirmed.
- Whether `login` module (the third independent admin-login implementation) is still reachable/used, or fully superseded by `user::login()` — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION.**
