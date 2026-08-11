# 10 — API Catalogue

Status: Phase 8 complete for the live/routed surface (`getapi`) and the confirmed-reachable legacy surfaces (`api`, `apis`); full per-endpoint request/response/validation detail for every one of the ~90+120+46 methods across these three controllers was not exhaustively re-verified beyond what the bidding, auth, domain, and integrations research passes already surfaced — this catalogue indexes what exists and where, with detail depth matching what those passes captured. See [02-repository-inventory.md §6](02-repository-inventory.md) for how the three-way `api`/`apis`/`getapi` duplication was discovered and resolved.

## The three parallel REST API implementations

| Module | Controller | Routed in `routes.php`? | Reachability | Method count |
|---|---|---|---|---|
| `getapi` | `Getapi.php` (+ `Fcm.php`) | **Yes** — 100% of `api/v1/*` custom routes point here | Confirmed live, canonical | ~120+ public methods |
| `api` | `Api.php` | No explicit route | Very likely reachable via CI3 default routing (`/api/<method>`) — nothing in `.htaccess`/`hooks.php` blocks it | ~90 public methods |
| `apis` | `Apis.php` | No explicit route | Same as above (`/apis/<method>`) | ~46 public methods |

All three share the same JWT signing secret (`SECRETE_KEY`, hardcoded in `application/config/constants.php`) and largely overlapping functionality (auth, profile, items, bidding in `api`'s case) — see [18-security-review.md SEC-002/SEC-014](18-security-review.md) for why this matters. `apis` appears to be the oldest generation (no bidding/deposit methods), `api` a middle generation (has bidding/deposit but predates some of `getapi`'s features), `getapi` the current one.

## `getapi` — the live, routed API (grouped by domain, from `application/config/routes.php`)

**Auth**: `registerUser`, `fb_login_register`, `google_login_register`, `apple_login_register`, `deauthorize` (no-op stub — [18-security-review.md SEC-015](18-security-review.md)), `loginUser`, `token_update` (**unauthenticated account-takeover primitive** — SEC-012), `otp`, `sendotp`, `verifyOtp`, `resendOtp`, `forgotPassword`, `updatePassword`, `changePassword`, `getUserProfile`.

**Auction/lot browsing**: `categories_data/$1`, `upcoming_auction_data`, `AllFeaturedItems`, `AllHomeListing`/`AllHomeListing2`, `getOnlineLiveAuctions/$1`, `all_categories`, `get_all_users`, `delete_user_row/$1`.

**Search**: `search`, `search/$1`, `search/catalog/$1`, `getAuctionItems`, `getAuctionItems3`.

**Live/online bidding** (full mechanics in [06-bidding-engine.md](06-bidding-engine.md)): `live-online_2/$1/$2`, `live-online/$1`, `live-online-detail/$1/$2`, `place_bid_live`, `broadcast_pusher/$1/$2` (misleadingly named — see [12-realtime-system.md](12-realtime-system.md)), `get_bid_log`, `mix_function`/`mix_function2`, `get_all_lots`, `get_winning_lots`, `get_hall_auto_bids`, `get_item_fields_data`, `get_current_lot`, `get_upcoming_auctions`, `get_winner_status_model`, `online-auction/$1`, `online-auction/details/$1/$2`, `placebid`, `three_d/$1`.

**Customer profile/documents**: `customer/delete_doc_type/$1`, `customer/insert_doc_type`, `customer/update_doc_type`, `customer/select_doc_type`, `customer/profile`, `customer/update_profile`, `customer/save_profile_image`, `userBids`/`userBids2`/`userBids3`, `wishList`, `getWishList`/`getWishList2`, `docs`, `docsLoad`, `save_user_documents`, `delete_customerDocs`.

**Payments/deposits**: `customer/deposit`, `customer/cradit_card` [sic], `customer/paytabsReturnURL` (**no server-side payment verification** — SEC-023), `customer/add_bank_slip`, `customer/item_deposit`, `customer/get_ai_list`, `customer/get_ai_deposit`, `customer/bankDetail`.

**Inventory/sell-item**: `inventory`, `sell_item`, `get_item_fields`, `get_makes_options`, `get_subcategories`, `get_model_options`, `save_item`, `save_item2`, `save_item_file_images`.

**Static content/i18n**: `terms_conditions`, `contact_us`, `our_team`, `about_us`, `faqs`, `liveStreaming`, `qualityPolicy`, `lang_arabic`, `lang_english`.

**Push**: `fcm` (`getapi/Fcm/home`), `push` (`getapi/Fcm/sendPushNotification` — non-functional test stub, see [13-integrations.md](13-integrations.md)), `update_fcm`, `fcm_to_email`.

Also confirmed live but reachable directly (not through `api/v1/*`): `livecontroller/*` (operator console, see below), `search/*`, `livehall/*` — these are separate modules, not part of `getapi`.

## `live_auction_controller` — the operator/auctioneer console (routed at `/livecontroller/*`)

`getAuctionItems`, `getAuctionItemDetail`, `updateLiveAuctionStatus`, `sold_items`, `initialAuctionBid`, `bidLogAPi`, `retractAuctionBid`, `retractAllAuctionBid` (destructive, unaudited — SEC-009), `rollBackAuctionBid` (destructive, unaudited — SEC-009), `soldAuctionBid`, `approvalSoldAuctionBid`, `provisionalSoldAuctionBid` (**dead — routed but method doesn't exist**, SEC-011), `notSoldAuctionBid`, `getSoldItemCount`, `getAuctionUsersList`, `getAuctionSoldItems`, `updateSoldstatus`, `updateitembuyer` (no ownership validation). Full detail in [06-bidding-engine.md §7](06-bidding-engine.md). Authorization: only "any authenticated non-customer role" — the ACL layer that could restrict this to actual auctioneer staff (role 7) is disabled (SEC-005/SEC-020).

## `livehall` — public catalog/search surface (routed at `/livehall/*`)

`index`, `searchItems`, `getAuctionItems` (filtered/paginated), `printCatalog`, `getAuctionStatus`, `modelsByMake`. Confirmed read-only — no bid-log or bid-placement writes anywhere. A discovery/browse layer, not a bidding engine (see [06-bidding-engine.md §8](06-bidding-engine.md)).

## `search` — general site search (routed at `/search`, `/search/catalog/$1`, `/searchItems`)

Shared by the public website; overlaps functionally with `livehall`'s search but is the general-purpose entry point (`$route['search'] = 'search/Search/index'`) vs. `livehall`'s auction-specific browse.

## `api` — legacy, unrouted-but-reachable duplicate (critical security context — see SEC-002)

~90 methods including `loginUser`, `registerUser`, `verifyCode`, `resendCode`, `forgotPassword`, `updatePassword`, `changePassword`, `editProfile`, `wishList`/`getWishList`, `saveUserDocuments`, `userAuctions`, `getItems`, `getNotification`, `userBids`, `saveItem`, `insertItem`, `updateItem`, `sellItems`, `checkDeposit`, `deposit`, `BankTransfer`, **`palceBids`** (the unvalidated bid-insertion method — SEC-002/full detail in [06-bidding-engine.md §0](06-bidding-engine.md)), `userDeposite`, `addBankSlip`, `bankDetail`, `all_sellers`, `carValuation` and the full valuation-calculator field set (`getMakes`, `getModels`, `getEngine`, `getYear`, `getMillage`, `getOptions`, `getPaint`, `getSpecs`), `car_valuation`, `bookAppointment`, `upload_images`, `upload_item_documents`, `upload_signature`, `upload_condition`, `items_multiple_docs`, `loginAppraiser`, `aboutUs`, `categoryItems`, `inspection_search`.

## `apis` — earliest legacy duplicate, no bidding/deposit methods

~46 methods — a subset of `api`'s surface covering auth (`login_user`, `register_user`, OTP/reset flows), profile (`user_account`, `edit_profile`), items/valuation (`car_valuation`, `getMakes`/`getModels`/etc.), wishlist, documents, notifications, and history (`user_history_auctions`, `user_history_bids`). Notably **absent**: any bid-placement, deposit, or payment method — consistent with this being an earlier snapshot before those features existed, predating `api`.

## Cross-cutting API findings

- **Duplicate upload targets**: `api`'s multi-file upload inserts into table `documents`; `getapi`'s equivalent inserts into table `files` — the same conceptual feature, two different backing tables depending on which of the three duplicate modules handles the request (see [11-database-model.md](11-database-model.md)).
- **Mobile app usage**: cross-referenced against [07-mobile-app.md §"Full API endpoint surface"](07-mobile-app.md), the Flutter app exclusively calls the `getapi`-backed `api/v1/*` surface — it does not call `api`/`apis` directly. Those two remain a server-side-only attack-surface concern, not something the legitimate client exercises.
- **Feature-parity note (Phase 7 cross-reference)**: the website's own `auction/OnlineAuction.php`/`LiveAuction.php` controllers implement customer-facing bidding server-rendered (not via the JSON API) — `OnlineAuction::placebid()` is a near-duplicate of `getapi::placebid()` with the same lack of server-side minimum-increment enforcement (see [06-bidding-engine.md §0](06-bidding-engine.md)). This is a fourth place the same core bidding logic is independently implemented, alongside `getapi`, `api`, and (implicitly) whatever the live-hall operator console does — see [08-website.md](08-website.md) and [19-technical-debt.md](19-technical-debt.md) for the consolidated view of this duplication pattern.
