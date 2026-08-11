# 03 — Business Domain Model

Status: Phase 2 complete (single research pass, high confidence, extensive file:line evidence). Bidding-specific mechanics are covered in [06-bidding-engine.md](06-bidding-engine.md); auth/roles in [04-users-and-permissions.md](04-users-and-permissions.md); status-transition/state-machine detail in [05-auction-lifecycle.md](05-auction-lifecycle.md).

## 1. Auction entity

Table `auctions`, managed via `application/modules/auction/models/Auction_model.php`. An auction is the scheduled **event**; it is a distinct parent entity from an individual lot.

Fields (from `Auction::save_auction()`, `Auction.php:4149-4296`): `title`/`detail` (both bilingual JSON: `{english, arabic}`), `access_type` (`'online' | 'closed' | 'live'` — see §3), `status` (free text; `'active'` is the only literal confirmed in code), `registration_no` (required, uniqueness-checked), `close_auction_users` (comma-separated user IDs, populated only when `access_type == 'closed'`), `start_time`/`expiry_time`, `category_id`/`subcategory_id`, `security`, `created_on`/`created_by`.

There is **no separate "live_auctions" table** — live, online, and closed auctions are all rows in the same `auctions` table, distinguished purely by `access_type`; `LiveAuction`'s admin form simply hardcodes `access_type = 'live'` on the same underlying model.

One auction has many lots, via the `auction_items` junction table (§2).

## 2. Lot/Item entity

Two related tables:

**`item`** — the catalogue/vehicle record itself, independent of any specific auction. Key fields (`Items::save_item()`, `Items.php:1945-2004`; mirrored in mobile-facing `Getapi::save_item()`): `name`/`detail`/`terms`/`additional_info` (bilingual JSON), `status` (`active`/`inactive` — visibility toggle), `item_status` (`created`/`completed`/`cancelled` — data-entry completeness, not a business-approval gate, see §6), `category_id`/`subcategory_id`, `feature`, `seller_id`, `lat`/`lng`, `price` (doubles as the **reserve price**, see §4/[05-auction-lifecycle.md](05-auction-lifecycle.md)), `sold` (`yes`/`no`), `in_auction` (`yes`/`no` — whether it's currently attached to any auction), `other_charges`, `unique_code`, `barcode` (QR code generated post-insert), `item_images`/`item_attachments`/`item_test_report`/`threed_images`, `inspected` (`no` by default).

Vehicle-specific fields — `year`, `mileage`, `mileage_type`, `vin_number`, `registration_no`, `make`, `model`, `specification` — are **optional and only populated when the item's category is flagged `include_make_model = 'yes'`** (§7), i.e. this is a general-purpose lot/item model that happens to be used almost entirely for vehicles, not a vehicle-only schema.

**No dedicated "condition"/"inspection status" DB column exists.** Inspection is represented by a boolean `inspected` flag plus a rendered report: `auction/OnlineAuction::inspection_report()` looks for a static generated file `uploads/items_documents/{item_id}/condition.png`; if absent, it displays "Inspection is pending." There is no structured inspection-findings record in the database — it's an image artifact plus dynamic category-specific fields (`item_category_fields`, hardcoded to `category_id = 1` in the reviewed code).

**`auction_items`** — the join row representing a lot's participation in one specific auction, carrying all the *bidding* parameters for that pairing (`Auction::add_auction_items()`/`update_bidding_rules()`, `Auction.php:3321-3390, 4305-4366`): `auction_id`, `item_id`, `lot_no` (derived from max existing ID + 1), `order_lot_no` (per-auction sequence), `bid_start_price`, `minimum_bid_price`, `bid_start_time`/`bid_end_time` (a lot can have its own end time distinct from the parent auction's), `allowed_bids`, `security` (`yes`/`no` — whether a per-lot deposit is required to bid), `deposit` (amount, required when `security == 'yes'`), `sold_status`, `buyer_id`.

## 3. Auction TYPES actually implemented

All three share the same `auctions`/`auction_items` tables; they differ by **controller** and the `access_type` value, confirmed by `Auction_model::get_auction_list()`/`get_live_auction_list()` filtering the same table on `access_type != 'live'` vs. `= 'live'` respectively:

| Type | `access_type` | Mechanism |
|---|---|---|
| **Online** (default) | `'online'` | Timed/asynchronous bidding via `auction/OnlineAuction.php` (7,099 lines) — per-lot `bid_start_time`/`bid_end_time`, closes via server cron, supports proxy/auto-bidding (`bid_auto` table) |
| **Closed** | `'closed'` | Identical mechanics to Online, restricted to an admin-curated invite list (`close_auction_users`, validated required when this type is selected) |
| **Live** | `'live'` | Hall-style real-time bidding via `auction/LiveAuction.php` (459 lines) + dedicated `live_auction_bid_log` table + operator console (`live_auction_controller` module) — full mechanics in [06-bidding-engine.md](06-bidding-engine.md) |

**No formal "absentee"/"phone"/"floor" bid concept exists** as a distinct feature (confirmed by search — nothing beyond the `bid_auto` proxy-bid mechanism). The closest equivalent to an off-platform sale is `Auction::direct_sale()` (`Auction.php:87-118`) — a staff screen for manually recording a negotiated sale of a not-yet-sold item outside the normal bidding flow, computing seller/buyer commission client-side from configurable `seller_charges` rates.

## 4. Status/lifecycle fields (inventory — see [05-auction-lifecycle.md](05-auction-lifecycle.md) for the full state-machine/transition narrative)

| Column | Observed values |
|---|---|
| `auctions.status` | `'active'` (only literal confirmed in code) |
| `auctions.access_type` | `'online' \| 'closed' \| 'live'` (not strictly a lifecycle field, but often conflated with one) |
| `item.status` | `'active' \| 'inactive'` (visibility) |
| `item.item_status` | `'created' \| 'completed' \| 'cancelled'` — `created → completed` fires **automatically** when documents are uploaded, not via manual review |
| `item.sold` | `'yes' \| 'no'` |
| `item.in_auction` | `'yes' \| 'no'` |
| `auction_items.sold_status` | `'not'` (default) \| `'sold'` \| `'not_sold'` \| `'approval'` (plus a typo variant `'approvel'` used in one OR-clause) |
| `bid.bid_status` | `'pending'`, `'won'` |
| `auction_deposit.status` | `'approved'`, `'adjusted'`, `'refund'` (plus arbitrary staff-set values via `refund()`) |
| `auction_item_deposits.status` | `'active'`, `'adjusted'` |
| `sold_items.payment_status` | `0`/`1` (unpaid/paid) |

## 5. Deposits — three distinct persisted concepts, used concurrently (not either/or)

1. **`auction_deposit` table, `deposit_type = 'temporary'`** — an auction-specific bidder registration deposit (tied to `auction_id` + `user_id`). Classic "you must deposit to be eligible to bid in *this* auction."
2. **`auction_deposit` table, `deposit_type = 'permanent'`** — a general account-level wallet/balance. Staff can explicitly convert a temporary (per-auction) deposit into a permanent one. The ledger uses `account = 'DR'/'CR'` semantics — refunds insert a mirrored `CR` row rather than deleting the original, which is a sound audit-preserving pattern (contrast with the bid-log hard-deletes documented in [06-bidding-engine.md §7/§9](06-bidding-engine.md)).
3. **`auction_item_deposits` table** — a **per-lot** security deposit, keyed by `user_id`+`auction_id`+`item_id`, directly tied to `auction_items.security`/`deposit`. Individual lots can require their own deposit independent of the general auction registration deposit.

**Deposit as a bidding precondition**: `Getapi::get_ai_list()` surfaces to a buyer which security-flagged lots they still need to deposit for (lots where `security='yes'` and no matching `auction_item_deposits` row exists yet) — strongly implying deposit is enforced as an eligibility gate, though the exact bid-acceptance-time check was not independently located in this pass (the bidding-engine review, [06-bidding-engine.md](06-bidding-engine.md), covers the bid-acceptance code path itself and did not surface an explicit deposit check inside `placebid()`/`place_bid_live()` — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** whether deposit eligibility is actually enforced server-side at bid time or only surfaced as a UI prompt).

A single global minimum-deposit amount is configurable via `settings` (`code_key = 'min_deposit'`), not hardcoded.

## 6. Sellers/consignors vs. buyers — item submission workflow

`users.type` ENUM('vendor','buyer','both') distinguishes sellers from buyers within the customer role (role 4).

- Mobile vendor submission (`Getapi::save_item()`) inserts directly into `item` with `seller_id` = the authenticated vendor, `status = 'active'`, `item_status = 'created'` — **immediately live**, not held in a pending/awaiting-approval state. No such status value exists on the `item` table.
- Becoming an actual lot requires a **separate, explicit staff action**: `Auction::add_auction_items()` — staff pick from `Items_model::get_active_item_list()`, which filters only on `item.sold = 'no'` (no `item_status`/approval filter). Any not-yet-sold item, vendor- or staff-created, is eligible to be picked into an auction.
- `item_status`'s `created → completed` transition is purely about data-entry completeness (fires automatically once documents are uploaded), not a business review/approval gate.

**Assessment**: there is no formal "pending review / approved / rejected" workflow field for vendor-submitted items. The de facto approval step is staff manually curating which items get added to a specific auction — an implicit curation gate, not a modeled state machine. **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** whether a review step exists elsewhere (e.g., a notification/admin-review screen outside the modules reviewed).

## 7. Categories / make / model hierarchy

- **Category → Subcategory** is a proper parent/child relationship via FK (`item_category` → `item_subcategories`).
- **Make → Model is a separate, flat, globally-shared two-level list**, *not* nested under category: `item_makes` is global (not scoped to any category), `item_models` is scoped only by `make_id`. An item only shows make/model fields when its category has `include_make_model = 'yes'`.
- So the real hierarchy is **not** "Category → Make → Model" as a single tree — it's "Category → Subcategory" plus an orthogonal, category-agnostic "Make → Model" list that gets attached conditionally.
- Dynamic per-category custom fields also exist (`item_category_fields`, JSON-defined label/value options) for attributes beyond the fixed columns.

## 8. Watchlist / Wishlist

A working feature, backed by table `favorites_items` (`user_id`+`item_id`), exposed only through the mobile/API layer (`getapi::wishList()`/`getWishList()`/`getWishList2()` — multiple, seemingly redundant read implementations). No equivalent admin-web UI was found in the `auction`/`items` modules — this appears to be a mobile-only feature.

## 9. Business rules found directly in code (see also [15-business-rules.md](15-business-rules.md) for the full catalogue with IDs)

- **Reserve = `item.price`**: auto-sale requires the winning bid ≥ `item.price`; below that, the lot flips to a manual-approval state (`sold_status='approval'`) rather than auto-selling or auto-failing. Enforced only for online/closed auctions (cron-driven) — live-hall reserve enforcement is 100% operator discretion (see [06-bidding-engine.md §3](06-bidding-engine.md)).
- **Security deposit required per lot when flagged**: server-side validation makes `deposit` a required field whenever a lot's `security` flag is set to `'yes'` during auction setup.
- **Closed auctions require a named buyer list**: `close_auction_users[]` is a server-validated-required field whenever `access_type == 'closed'`.
- **Commission is configurable, not hardcoded**: a `seller_charges` table (`user_type` × `type`, percent or flat amount) drives the direct-sale commission calculation.
- **Global minimum deposit** is a configurable `settings` value, not a code constant.
- **Deposit adjustment is blocked while the user has an active bid elsewhere**: `Users.php:3300-3306` explicitly checks for existing "highest bids" before allowing a deposit adjustment and shows an error/redirect if found — a real, deliberate business-rule guard.
- **No minimum-image-count rule was found** for listing an item — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** whether this is intentional or an oversight.

## 10. `cars`/`valuation` modules — a separate subsystem, not a duplicate of `items`

`cars`/`valuation` operate on an entirely separate table set (`valuation_make`, `valuation_model`, `valuation_price`, `valuation_car`, `valuation_years`, `valuation_millage`, etc.) with no code-level join or FK to `item`/`item_makes`/`item_models`/`auction_items`. This is a self-contained **"what's my car worth" estimator/calculator tool** — a real, separately-modeled feature, not a redundant reimplementation of the item catalogue.

## 11. `auction` vs `auction_____` — resolved

`Auction_model.php` is **byte-identical** between the two modules. The controllers differ only slightly (`Auction.php`: 5,039 vs. 4,725 lines; `OnlineAuction.php`: 7,099 vs. 6,403 lines), and `auction`'s `Live_auction_model.php` has exactly one extra method (`get_live_auction_items_low_load()`) absent from `auction_____`. This confirms `auction_____` is a **stale, unrouted snapshot/backup** of an earlier version of `auction` — not a materially different design, and safe to treat as dead code (consistent with it having zero entries in `routes.php`, per [02-repository-inventory.md](02-repository-inventory.md)).
