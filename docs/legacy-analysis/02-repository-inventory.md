# 02 — Repository Inventory

Status: DRAFT — Phase 1 in progress. This document will be updated as later phases uncover more detail.

## 0. Source material

The working directory `PIONEER AUCTIONS WEB & PORTAL CODE/` is **not a git repository** (no `.git` anywhere, confirmed by `git status` failing with "not a git repository" at the top level and inside every subfolder). It is a flat folder of extracted/unextracted zip exports with no commit history, no branches, and no `.gitignore`-driven exclusions we can inspect after the fact except each project's own `.gitignore` file (present inside the extracted trees). All dating below is zip-internal file mtimes, not real edit history.

Five components were found:

| # | Component | Archive | Extracted to | Internal date stamp |
|---|---|---|---|---|
| 1 | Public website + backend + admin portal (monolith) | `pioneer-web-main.zip` (105 MB) | `pioneer-web-main/pioneer-web-main/` | 2023-08-30 |
| 2 | Mobile app (Flutter) | `pioneer-mobile-app-main.zip` (20 MB) | `pioneer-mobile-app-main/pioneer-mobile-app-main/` | 2024-01-25 |
| 3 | Chatbot admin console (React) | `pa-chatbot-admin-samin.zip` (386 KB) | `pa-chatbot-admin-samin/` (extracted this session) | 2023-11-07 |
| 4 | Chatbot / WhatsApp webhook service (Node.js) | `pioneer-chatbot-webhook-webhook.zip` (24 KB) | `pioneer-chatbot-webhook-webhook/` (extracted this session) | 2023-12-18 |
| 5 | `Revoked Key.zip` — credential bundle, not an application | — | inspected read-only in an isolated scratch dir, **not extracted into the project tree** | mixed, 2021–2024 |

Component 1 is by far the largest and is the core of the business: it is a single CodeIgniter 3 (HMVC/"Modular Extensions") PHP monolith that appears to serve the **public auction website, the customer account area, the API consumed by the mobile app, and the internal admin/CRM/sales back office** all from one codebase, differentiated by module/controller rather than by separate deployable services.

## 1. Component 1 — `pioneer-web-main` (PHP monolith)

- **Framework**: CodeIgniter **3.1.10** (`system/core/CodeIgniter.php` → `CI_VERSION = '3.1.10'`), using the third-party **HMVC "Modular Extensions"** pattern (`application/modules/*` instead of flat `controllers/`/`models/`). CodeIgniter 3 reached EOL/community-maintenance status years ago — this is an old, unsupported PHP framework generation.
- **Root `application/controllers` and `application/models`** contain only CodeIgniter's placeholder `index.html` — i.e. **no code lives in the conventional CI locations**; everything real is under `application/modules/<module>/{controllers,models,views}`.
- **No `application/config/database.php`** is present in the extracted zip (env-specific config dirs also absent). DB credentials/engine selection were evidently excluded from the export (likely `.gitignore`d in the real repo) — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** for exact DB host/engine version, though CI3 default driver and the `dbforge` calls point to MySQL/MariaDB.
- **Only one versioned DB migration exists**: `application/config/migrations/01_add_users.php` (creates the `users` table). This strongly suggests the live schema was hand-built/altered directly on the DB server over time and was **never kept in sync with version-controlled migrations** — a major traceability gap for Phase 9.
- Deploy tooling present at repo root: `deploy.php`, `appspec.yml` (AWS CodeDeploy), `.htaccess`, suggesting production deploys targeted **AWS (EC2 + CodeDeploy)** rather than a container platform.
- `HTML_latest_version/`, `assets_admin/`, `assets_user/`, `screen_assets/` — separate static asset trees for the admin portal vs. the customer-facing site vs. a raw HTML template staging area, consistent with the "one monolith, many faces" structure above.
- `firebase-messaging-sw.js` at the web root — confirms **Firebase Cloud Messaging (FCM)** is used for web push notifications from the customer-facing site.
- `export_pdf.js`, `printThis.js` — client-side PDF export/print helpers (likely for invoices/reports).
- `test.php` at web root (19 bytes) — a stray root-level test/debug file; needs checking for exposure risk in Phase 13.

### 1.1 Module inventory (`application/modules/`)

30 module directories, each following `controllers/models/views` HMVC layout unless noted:

| Module | Likely responsibility (name-inferred, to be confirmed in later phases) | Flag |
|---|---|---|
| `accounts` | Finance/accounting entries | |
| `acl` | Access control list — role/permission engine | central to Phase 3 |
| `admin` | Admin portal shell/dashboard | |
| `api` | API endpoints (1 controller file found) | **duplicate with `apis`, see below** |
| `apis` | API endpoints (1 controller file found) | **duplicate with `api`, see below** |
| `auction` | Core auction management (3 controller files; views include `auction_controller`, `auction_items`, `closed_auction`, `deposite`, `live_auction`, `online_auction`) | central to Phase 4/5 |
| `auction_____` | **Byte-for-byte identical subfolder structure to `auction`** (3 controllers, same 6 view subfolders) | **Flag: looks like an abandoned copy/backup module left in place — dead code or a live fork risk if both are still routed** |
| `cars` | Vehicle catalogue (make/model/etc. — Pioneer Auctions' core vertical is vehicle auctions per the mobile app's `pubspec.yaml` description "Vehicle Auction") | |
| `cms` | Content management (static pages) | |
| `crm` | Customer relationship management, has its own `views/reports` | |
| `cronjob` | Scheduled/background jobs entry point (1 controller) | central to Phase 11 |
| `customer` | Customer-facing account logic | |
| `email` | Email sending | |
| `files` | File/document handling | |
| `footer_content` | CMS footer content | |
| `getapi` | Another API-shaped module | **third API-like module — see duplication flag below** |
| `getapi.zip` | **A zip file sitting inside `application/modules/`** | **stray build artifact accidentally left in the codebase** |
| `home` | Homepage controller | |
| `items` | Lot/item catalogue (`views/categories`, `views/makes`, `views/model`) | |
| `jobcard` | Internal staff task/job-card system (`views/assigned_task_to_user`, `views/task_category`) | overlaps oddly with `users` table fields (`task_title`, `task_detail`, `assigned_to` were found directly on the `users` migration — see DB note below) |
| `live_auction_controller` | Live/real-time bidding controller (1 controller) | central to Phase 5/10 |
| `livehall` | "Auction hall" live session handling (1 controller) | central to Phase 5/10 |
| `login` | Auth/login (has a stray `views/jobcard` subview — misplaced view) | |
| `reports` | Reporting | |
| `sales` | Sales module | |
| `screens` | UI screen definitions (admin-side?) | |
| `search` | Search functionality | |
| `settings` | System settings | |
| `template` | View templating/layout | |
| `transaction` | Payments/financial transactions | |
| `user` | User module (1 controller) | **duplicate with `users`, see below** |
| `users` | User module (1 controller) | **duplicate with `user`, see below** |
| `valuation` | Item/vehicle valuation | |
| `visitor` | Guest/visitor tracking | |
| `welcome` | CI default "welcome" module — usually a leftover scaffold module | check if still routed/dead |

**Duplication flags — resolved by reading `application/config/routes.php` directly (Observed behaviour):**
- **`api` vs `apis` vs `getapi`**: `routes.php` maps **every single** `api/v1/*` URI (auth, OTP, auction listing, search, live bidding — `place_bid_live`, `broadcast_pusher`, `get_bid_log`, `get_hall_auto_bids`, `get_current_lot`, `get_winning_lots` — wishlist, documents, payments/PayTabs, inventory/sell-item, FCM push) to the **`getapi/Getapi`** controller (plus a small `getapi/Fcm` controller for push). `getapi` is confirmed as the **one live, mobile/web-facing REST API** — this is almost certainly what `pioneer-mobile-app-main`'s `Services/ApiServices.dart` talks to (to confirm in Phase 6/8). Neither `api/` nor `apis/` appears anywhere in `routes.php`. **They are very likely dead code** — but CodeIgniter 3's default routing still maps unmatched URIs directly to `controller/method` segments unless disabled, so `api/<method>` or `apis/<method>` could still be directly reachable at runtime even though nothing intentionally routes there. This is a real attack-surface question for Phase 13, not just tidiness — needs confirming by reading the `api`/`apis` controllers themselves and checking `$route['404_override']`/base URL restrictions.
- **`auction/` vs `auction_____/`**: `auction/` is extensively routed (`auction/items/...`, `auction/details/...`, `auction/live-auction/...`, `auction/online-auction/...`, etc.). **`auction_____` does not appear anywhere in `routes.php`.** Given the identical internal structure to `auction/`, this reads as an accidental in-place duplicate (e.g. a developer's "save a copy before editing" folder that got shipped) rather than a real fork. Same reachability caveat as above applies — needs confirming the controller class names/`__construct` don't register elsewhere.
- **`user/` vs `users/` — NOT a duplicate, contrary to the initial name-based guess.** `routes.php` shows a real split of responsibility: `$route['admin'] = 'user';` (the `user` module owns admin login/auth, e.g. `user/forgot`, `login/jobcard/forgot` → `user/user/jobcard_forgot_password_form`), while `users` owns the large back-office surface — customers CRUD (`customers` → `users/users_sellers_buyers`), deposits, payments, invoices, statements, security adjustments (`security-adjust/...` → `users/adjust_security/...`). Corrected: these are two legitimately distinct modules with a confusingly similar name, not dead-code duplication.

### 1.2 Config surface (`application/config/`)

`autoload.php, config.php, constants.php, custom.php, doctypes.php, email.php, email_old.php, foreign_chars.php, hooks.php, instagram_api.php, memcached.php, migration.php, mimes.php, profiler.php, routes.php, smileys.php, user_agents.php` plus `migrations/`.

Notable at a glance (to be expanded in Phase 12 integrations):
- `email.php` **and** `email_old.php` both exist — another duplicate-looking pair; need to check which is autoloaded/used.
- `instagram_api.php` — a dedicated config file implies an Instagram integration exists somewhere (marketing/social feed?).
- `memcached.php` — suggests Memcached was used for caching/sessions at some point.
- `routes.php` will be the authoritative source for resolving all the module-duplication questions above — first thing to read in Phase 8.

### 1.3 Early DB schema signal (from the one migration that exists)

`application/config/migrations/01_add_users.php` builds a single, very wide `users` table (40+ columns) that mixes several concerns in one table: identity/auth (`username`, `email`, `password`, `role`, `status`), CRM fields (`crm_id`, `crm_status` ENUM('mature','immature')), vendor/buyer typing (`type` ENUM('vendor','buyer','both')), address/KYC (`address`, `id_number`, `vat`, `vat_number`, `documents`), sales attribution (`sales_id`, `buyer_commission`, `payment` ENUM('pending','complete')), and **internal task/job-card fields** (`task_title`, `task_detail`, `assigned_to`, `operational_manager_id`, `total_deposite`) that look like they belong to the separate `jobcard` module, not to a user identity table.

Two concrete defects observed directly in this migration file (Observed behaviour, not inferred):
1. Line `'type' => ENUM('mature','immature')` — `ENUM(...)` is written as a **bare PHP function call**, not a quoted string. There is no `ENUM()` function in this codebase's global namespace, so calling `Migration_Add_user::up()` as written would fatal with "Call to undefined function ENUM()". Either this migration has never actually been re-run against a fresh DB since it was written, or the deployed schema was patched by hand and this file is stale documentation only.
2. The field array has **duplicate keys** (`unique_id` appears 3 times with different types — `varchar(50)`, `varchar(100)`, `tinyint(4)`; `code` appears twice). In PHP, later duplicate array keys silently overwrite earlier ones, so the final `unique_id` column would end up `tinyint(4)`, which seems wrong for what looks like a UUID/token field. This is a real correctness bug in the only piece of schema-as-code the project has.

Full ERD reconstruction is deferred to Phase 9 (will require reading model files' `$this->db->` calls, since migrations cannot be trusted as the schema source of truth).

## 2. Component 2 — `pioneer-mobile-app-main` (Flutter)

- **Framework**: Flutter/Dart. `pubspec.yaml`: `name: pioneer_auction`, `description: Vehicle Auction`, **`version: 1.5.0+1`**, Dart SDK `>=3.0.3 <4.0.0`.
- Confirms the business vertical directly: **this is a vehicle auction platform.**
- State management: `provider: ^6.1.1`.
- **Realtime**: `pusher_channels_flutter: ^2.2.0` — confirms **Pusher Channels** (not raw WebSockets/Socket.IO/Firebase Realtime DB) is the live-bidding transport. This is the key fact for Phase 10.
- **Auth-adjacent**: `google_sign_in`, `sign_in_with_apple`, `flutter_facebook_auth`, `jwt_decoder` — social login is wired client-side; `jwt_decoder` implies the backend issues JWTs consumed by the app.
- **Payments**: a screen named `Screens/PayTabs.dart` plus `Screens/Payments.dart` strongly indicates **PayTabs** (MENA-region payment gateway) is the payment integration — to be confirmed against `Services/ApiServices.dart` in Phase 12.
- **Maps**: both `flutter_osm_plugin` (OpenStreetMap) and `flutter_map` are dependencies — two different mapping libraries present simultaneously, worth checking for redundancy in Phase 14.
- **Calendar**: `table_calendar`, `calendar_view`, **and** `syncfusion_flutter_calendar` are all present — three calendar libraries, plus a `Screens/TestCalendar.dart` file alongside the real `Screens/Calendar.dart`, which reads as leftover experimentation (dead code candidate, Phase 6).
- **i18n**: `flutter_localizations` + `l10n/app_en.arb`, `l10n/app_ar.arb` — English/Arabic localization, consistent with a Gulf-region auction business.
- Only one `Services/ApiServices.dart` + `Services/ApiConfig.dart` — a single, centralized API client layer (good sign, to be audited in Phase 6/8 for how it maps to the web app's `api`/`apis`/`getapi` module confusion).
- Top-level `lib/` layout: `Components/` (shared widgets incl. `BidConfirmationDialog.dart`, `DirectBidDialog.dart`, `PlaceBidDialog.dart` — bidding UI lives here), `Model/` (incl. `BidPlace.dart`, `LiveAuction.dart`, `AuctionItem.dart`), `Screens/` (31 screen files), `Services/`, `widgets/`, `l10n/`.
- Full screen-by-screen inventory deferred to Phase 6.

## 3. Component 3 — `pa-chatbot-admin-samin` (chatbot admin console)

- **Framework**: React (Create React App scaffold — default CRA README still present, unmodified).
- Structure: `src/Admin/*` (Dashboard, Chat, Userchat, AdminProfile, Login, Administration, Report, Profile — **several files are 0 bytes**: `Administration.jsx`, `Profile.jsx`, `Report.jsx` are empty stubs, i.e. unfinished/scaffolded-but-never-built screens), `src/User/*` (ForgotPass, NewPass, ResetPass, UserLogin — end-user-facing chat auth flows), `src/Layout/*` (Header, Sidebar), `src/Router/Router.jsx`.
- Has a `Dockerfile`, `Jenkinsfile`, and `nginx-configuration.conf` — this service had real CI/CD (Jenkins) and containerized deployment behind nginx, unlike the main PHP monolith which shows AWS CodeDeploy tooling instead.
- Full screen/route inventory deferred to a later pass (folded into Phase 12 integrations, since this is an internal admin tool for the chatbot rather than a core auction system component).

## 4. Component 4 — `pioneer-chatbot-webhook-webhook` (WhatsApp webhook service)

- **Framework**: Node.js. `package.json` + `package-lock.json` present; `docker-compose.yml` for local/deploy orchestration.
- Structure: `src/controllers/index.js` (7.3 KB — main webhook handler), `src/database/index.js`, `src/model/{conversation,messages,template,templateResponse,users}.js`, `src/routes/index.js`, `src/services/whatsappService.js`, `src/shared/{ProcessMessage.js, Templates.js (9.2 KB), whatsappModel.js}`.
- Name and `whatsappService.js` confirm this is a **WhatsApp Business API webhook** — inbound/outbound WhatsApp messaging, template-driven responses (`Templates.js` is large — likely holds the actual conversational script/menu tree).
- Relationship to `pa-chatbot-admin-samin` (the React admin console): almost certainly the admin console is the human agent/ops UI for conversations this webhook service ingests from WhatsApp — to be confirmed by tracing `src/database/index.js`'s connection target against the admin console's API base URL in a later pass.
- Full endpoint/message-flow inventory deferred (folded into Phase 12).

## 5. Component 5 — `Revoked Key.zip` (credential bundle — not application code)

Inspected **read-only**, file type only, contents never printed, and **not extracted into the project tree** (left isolated in a scratch directory outside the repo).

| File | Identified type | Note |
|---|---|---|
| `AuthKey_VHKKNN82BV.p8` | Real private key material (PKCS8/EC, Apple APNs auth-key format by filename convention) | Apple Push Notification service auth key |
| `pioneertest.jks` | Java KeyStore data | Android app signing keystore ("test" in the name — unclear if release or a test variant) |
| `debug.keystore` | Java KeyStore | Standard Flutter/Android debug signing keystore |
| `upload_certificate.pem` | PEM certificate | Likely an app-store/Play Console upload certificate |

**Security flag (full detail in Phase 13):** the folder name asserts these are "Revoked," but the archive contains **actual key/keystore/certificate material**, not placeholders or references. Even revoked keys can leak metadata (e.g. the APNs Key ID `VHKKNN82BV` embedded in the filename) and, if the "revoked" claim is wrong or only partially true (e.g. the Android keystores were never rotated, only the APNs key was revoked), this bundle could contain live signing credentials. This needs explicit business confirmation on which of the four are actually rotated vs. still in production use — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION**. No key material is reproduced anywhere in this documentation set.

## 6. Routing-derived findings (from `application/config/routes.php`)

- **Confirmed live API surface**: `getapi/Getapi` (+ `getapi/Fcm`) is the single REST API consumed by clients, mounted at `api/v1/*`. It covers auth (register/login/social login/OTP/password reset), auction/lot listing, search, live bidding (`place_bid_live`, `broadcast_pusher`, `get_bid_log`, `get_hall_auto_bids`, `get_current_lot`, `get_winning_lots`, `get_winner_status_model`), wishlist, customer profile/documents, payments (deposit, credit card, **PayTabs return URL** — confirms PayTabs as the gateway), sell-item/inventory intake, static content (terms, FAQs, team), language switch, and FCM push registration/send.
- **Confirmed separate admin/operator surface for live auctions**: `live_auction_controller/livecontroller/*`, routed at `/livecontroller/*` — `getAuctionItems`, `getAuctionItemDetail`, `updateLiveAuctionStatus`, `sold_items`, `initialAuctionBid`, `bidLogAPi`, `retractAuctionBid`, `retractAllAuctionBid`, `rollBackAuctionBid`, `soldAuctionBid`, `approvalSoldAuctionBid`, `provisionalSoldAuctionBid`, `notSoldAuctionBid`, `getSoldItemCount`, `getAuctionUsersList`, `getAuctionSoldItems`, `updateSoldstatus`, `updateitembuyer`. This is the **auctioneer/operator console** that runs the live hall (accept/retract/rollback bids, mark sold/not-sold/provisional, reassign buyer) — distinct from the bidder-facing `place_bid_live` in `getapi`. This split is central to Phase 5 (bidding engine) and Phase 4 (lifecycle): there appear to be two independent code paths that can both mutate bid/lot state (bidder self-service vs. operator override), which is exactly where race conditions or authority conflicts would surface.
- **`getapi` vs `api`/`apis`**: confirmed `api`/`apis` have zero entries in `routes.php`; `getapi` handles 100% of the `api/v1/*` surface. `api`/`apis` are very likely orphaned/dead modules, but CI3's default routing can still expose unmapped module/controller/method URIs directly, so this needs a direct read of those two controllers before calling them fully inert (→ Phase 8/13).
- **`auction_____` module**: zero entries in `routes.php`; reads as an accidental duplicate left in the tree, same reachability caveat as above (→ Phase 8/14).
- **`user` vs `users` resolved as distinct, not duplicate** (see above) — `user` = admin auth entry point, `users` = back-office customer/financial management surface (→ Phase 3/8).
- `livehall` module is *also* separately routed (`/livehall`, `/livehall/modelsByMake`, `/livehall/getAucStatus`) with its own `Livehall` controller, distinct from both `live_auction_controller` and `auction`'s live-auction views — a third live-auction-adjacent surface to disambiguate in Phase 5.
- `application/config/autoload.php` auto-loads `database, session, form_validation, template, parser` libraries and `url, file, meta` helpers globally on every request — `email` is **not** autoloaded, so `email.php` vs `email_old.php` is loaded on demand per-controller; need to grep controllers for `$this->load->config('email'...)` vs `'email_old'` to see which is actually referenced (→ Phase 12).

## 7. Open structural questions carried into later phases

- Are `api`/`apis`/`auction_____` truly dead, or reachable via CI3 default routing without an explicit `$route[]` entry? Do their controllers' constructors/methods contain live, callable logic? (→ Phase 8/13)
- Full reconciliation of `live_auction_controller` (operator console) vs `getapi` bidder-facing `place_bid_live` vs `livehall` — who is authoritative for lot state, and what happens if both paths act on the same lot concurrently? (→ Phase 5)
- Is `email.php` or `email_old.php` actually loaded at runtime? (→ Phase 12)
- Confirm the relationship between the two chatbot services and whether they're still active/integrated with the main platform, or a parked side project. (→ Phase 12)
- Confirm mobile app's `Services/ApiServices.dart` base URL / endpoint list matches the `getapi` surface exactly, or whether it also calls anything else. (→ Phase 6/8)
