# 11 — Database & Data Model

Status: Phase 9 complete. **Critical caveat**: no `application/config/database.php` exists in this export and only one (broken) migration file exists ([02-repository-inventory.md](02-repository-inventory.md)) — every table/column/type claim below is reconstructed purely from how PHP model/controller code *uses* tables (`select`/`where`/`insert`/`update`/`join` calls), not from a schema definition. Actual column types (beyond the one confirmed `double`) are **UNKNOWN — REQUIRES DIRECT DATABASE INTROSPECTION** to verify.

## Table inventory

### Auction / bidding core

**`auctions`** — one auction event. `id, title(JSON bilingual), detail(JSON), popup_message(JSON), access_type('online'|'live'|'closed'), status('active'), registration_no, category_id, subcategory_id, start_time, expiry_time, bid_options, created_on, created_by`. FK: `category_id → item_category.id`. Hard-deleted.

**`auction_items`** — lot-in-auction join/config row. `id, item_id, auction_id, category_id, sold_status('not'|'sold'|'approvel'[sic]|'return'), status('active'), bid_start_price, bid_start_time, bid_end_time, allowed_bids, minimum_bid_price, security, deposit, lot_no, order_lot_no, updated_by/on, created_by/on`. FKs: `item_id → item.id`, `auction_id → auctions.id`. Hard-deleted. **Bug**: `lot_no` is computed as `MAX(id)` across the *entire* table (not scoped per-auction) + 1, with no locking — race-condition-prone, not a true sequential per-auction lot number.

**`bid`** — bid log for **online** auctions. `id, auction_id, item_id, user_id, buyer_id, seller_id, bid_amount, start_price, end_price, bid_status('pending'|'bid'|'won'|'win'), bid_time, date`. **`bid_status` uses both `'won'` and `'win'` interchangeably across different call sites** — any single-value filter silently misses rows written with the other spelling. Insert is a plain read-max-then-insert with no locking/transaction (see [06-bidding-engine.md](06-bidding-engine.md), [18-security-review.md SEC-006/025](18-security-review.md)).

**`bid_auto`** — proxy/auto-bid config. `id, item_id, auction_item_id, auction_id, user_id, bid_limit, bid_increment, auto_status('start'|'stop'), date`.

**`live_auction_bid_log`** — a **structurally separate, parallel bid-log table** for live-hall auctions, not the same table as `bid` with a type flag. `id, auction_id, item_id, user_id, buyer_id, seller_id, bid_amount, bid_increment_amount, bid_type('initial'|'online'), initial_priority_type('yes'|'no'), lot_no, bid_status('bid'|'win'), created_on`. **Bug**: one update call site has a table-name literal with a leading space (`' live_auction_bid_log'`) — CI's query builder tolerates it, but it's exactly the kind of typo that breaks under a stricter driver or a raw-SQL refactor.

**Two parallel bid-log tables covering the same real-world fact** (a bid was placed) with divergent columns and divergent status vocabularies is itself a major schema-consistency finding, not just a naming quirk — any future unification/reporting effort has to reconcile `bid.bid_status ∈ {won,win}` against `live_auction_bid_log.bid_status ∈ {bid,win}` by hand.

**`sold_items`** — settlement record. `id, item_id, auction_id, auction_item_id, buyer_id, seller_id, price, buyer_charges, seller_charges, payable_amount, payment_status(int), seller_payment_status, adjusted_security, adjusted_deposit, sale_type('online'), created_by/on, updated_by/on`. **`sold_items.price` is a denormalized copy of `bid.bid_amount`** taken at settlement time, with no FK/trigger keeping them in sync — combined with the absence of transactions (below), these two values can diverge on partial failure.

**`auction_deposit`** — double-entry ledger for user deposits/balance. `id, user_id, auction_id, amount, deposit_type('permanent'|'temporary'), status('approved'|'refund'|...), account('DR'|'CR'), deleted('no'|'yes')`. Balance is computed application-side as `SUM(DR) - SUM(CR)` on every read — no cached balance column.

**`auction_item_deposits`** — a *different* per-lot deposit table (name collision risk against `auction_deposit`).

**`auction_item_ratings`**, **`auction_live_settings`**, **`auction_guide`**, **`online_auction_item_visits`** — post-auction feedback, per-auction live config, CMS guide content, and item view-count tracking respectively.

### Item catalog

**`item`** — the richest table in the system. `id, name, price(=reserve price), category_id, subcategory_id, lot_id, detail, feature, specification, keyword, unique_code, registration_no, barcode, vin_number, make, model, year, mileage, mileage_type, item_images, item_attachments, item_test_report, inspected, other_charges, seller_id, sold('no'|'yes'|'return'), in_auction, status('active'|'inactive'), item_status('created'|'completed'|'cancelled'), created_on, updated_on/by`.

Two notable inconsistencies on this one table:
- **`item.make`/`item.model` are FK-id columns** (storing `item_makes.id`/`item_models.id`) **but lack the `_id` suffix** every other FK in the schema uses (`category_id`, `subcategory_id`, `seller_id`) — misleading to anyone reading the schema cold.
- **Two overlapping status columns**, `status` (active/inactive visibility) and `item_status` (data-entry completeness) — used inconsistently across query sites with no documented distinction.

**`item_category` → `item_subcategories`** — proper FK parent/child. **`item_makes` → `item_models`** — a *separate*, flat, category-agnostic two-level list (FK only `make_id`, not scoped by category) — see [03-business-domain.md §7](03-business-domain.md) for why this isn't a single Category→Make→Model tree.

**`item_category_fields`** (dynamic field *definitions* per category) + **`item_fields_data`** (the field *values* per item) — a classic EAV pattern layered on top of the already-wide `item` table; some vehicle attributes are real columns, others are EAV rows, decided ad hoc per category configuration rather than in the schema itself.

**`item_attachments`**, **`item_bidding_setting`**, **`item_expencses`** (sic), **`item_other_charges`** (no model layer — posted directly from a controller), **`sort_catagories`** (sic).

### Users / identity

**`users`** — the only table with a real (broken) migration; see [02-repository-inventory.md](02-repository-inventory.md) for the `ENUM()`-as-bare-function-call bug and duplicate-key issue. Confirmed columns used in code but **absent from the migration** (evidence of significant schema drift beyond what's captured in version control, or dead code referencing fields that don't actually exist): `name`, `gender`, `type` used as a bare `'seller'` string in places despite the migration only declaring `ENUM('vendor','buyer','both')`, and `total_deposite` (consistently misspelled, used everywhere as the deposit accumulator field). `role` is compared numerically throughout the codebase (`where('role', 4)`) despite being declared `varchar(30)` in the one migration that exists.

**`users2`** — a **structurally parallel duplicate of `users`**, with its own complete login/register/forgot-password/verify-code method family in `getapi/Getapi_model.php` (`get_login_user2`, `check_email2_users2`, `insert_user_details2`, `update_user_details2`, `verify_code2_user2`). Same conceptual entity, second physical table — a user existing in one table is invisible to logic hardcoded against the other. Presumed leftover from an unconsolidated v1/v2 API split.

**`user_bank_detail`**, **`user_deposit_detail`** (distinct from the `auction_deposit` ledger), **`user_documents`** (+ lookup `documents_type`), **`security`** (a *third* item-keyed deposit-amount table, distinct from both `auction_items.security`/`deposit` and `auction_item_deposits`), **`reset_password_code`** (see Cross-cutting #6 — the insert path for this table is a confirmed no-op bug).

### Financial / commission / settlement

**`transaction`** — general payment/deposit ledger. `id, user_id, amount, payment_type('cheque'|'manuall'[sic]), delete_status(0/1), transaction_info, created_on`. **The only table in the codebase with a genuine soft-delete flag** (`delete_status`) — but it is *also* hard-deleted in other code paths that ignore that flag entirely, so the same table is soft-deleted in some places and permanently destroyed in others depending on which controller touches it.

**`invoices`** — heavy JSON usage: `other_details` is literally `json_encode()` of whatever POST fields weren't explicitly mapped to a real column — a textbook schema-less escape hatch rather than a deliberate structured JSON field.

**`seller_charges`** — despite the name, holds **both** buyer- and seller-side commission configuration, disambiguated only by a `user_type('buyer'|'seller')` column — the table name itself is misleading.

**`payments`, `orders`, `order_items`, `adjustment_items`** — referenced only via `get_where`/`update` calls keyed by `trans_id`/`payment_reference`; **no `insert()` for any of these four tables exists anywhere in the scanned codebase.** Combined with unrelated vocabulary found nearby (`item_type => 'custom_addon'`, `logo_is_approved`), this strongly suggests these are **leftover boilerplate from an unrelated e-commerce/print-shop template** that was never fully adapted or removed, rather than live auction-platform tables. **UNKNOWN — REQUIRES BUSINESS CONFIRMATION.**

**`bank_deposit_slip`**, **`bank_info`**.

### CRM

`crm_detail` (the lead record, `assigned_to → users.id`), `crm_customer_type`, `crm_lead_source`, `crm_lead_category`, `crm_lead_stage`, `crm_loss_reasons`, `crm_next_step`, `crm_email_template`. Standard lookup/status tables, hard-deleted.

### ACL

`acl_roles`, `acl_permissions`, `acl_role_permissions` — a genuine, well-structured RBAC schema that is (per [04-users-and-permissions.md](04-users-and-permissions.md)) never actually consulted for authorization decisions in practice.

### Jobcard

`task`, `task_category`, `assigned_task`, `assigned_tasks_detail`, `notify_me`, `jobcard_users` (referenced only via raw update queries, no model coverage found — likely dead/orphaned, consistent with the jobcard-login inconsistency noted in [04-users-and-permissions.md](04-users-and-permissions.md)).

### CMS / static content

`ques_ans`, `terms_condition`, `our_team`, `team_info`, `home_slider`, `home_side_banner`, `popup` (modeled oddly — the code `TRUNCATE`s this table before every insert, i.e. it's designed to hold at most one row; a `status` flag or a dedicated settings column would be the conventional choice instead), `media`, `about_us`, `about_us_history`, `privacy_policy`, `quality_policy`, `press`, `partners`, `social_links`, `store_links`, `how_to_register`, `how_to_deposit`, `contact_us`.

### Valuation / vehicle-pricing calculator

`valuation_make`, `valuation_model`, `valuation_enginesize`, `valuation_price`, `valuation_years`, `valuation_millage` (config), `valuation_location`, `valuation_dates`, `valuation_config_setting`, `valuation_car`, `valuate_cars_options`, `milleage` (sic, "mileage"), `option_` (trailing underscore, apparently to dodge the SQL reserved word `OPTION`), `vehicle_detail`, `vehicle_specs`. Entirely separate from the `item`/`item_makes`/`item_models` catalog — see [03-business-domain.md §10](03-business-domain.md). **Suspicious join found**: `vehicle_detail.car_id` is joined against `item.category_id` in two call sites — joining a vehicle-detail row's car ID against an unrelated item's *category* ID, which reads like a copy-pasted join condition rather than an intentional relationship.

### Files / uploads

**`files`** — one generic upload table (`id, name, orignal_name`[sic]`, type, size, path, file_order, created_by/on`) shared across images, documents, and 3D images, disambiguated only by which foreign column references it. Deletes match by non-unique `name`, not ID — a real data-integrity risk if `name` is ever non-unique. **`documents`** — a *separate* upload table used only by the legacy `api` module's upload method, while the "canonical" `getapi` module's near-identical upload method inserts into `files` instead — same feature, two different target tables depending on which of the three duplicate API modules handles the request.

### Notifications / misc

`notification`, `favorites_items` (wishlist), `sms_history` (IP + timestamp only, used for OTP rate-limiting), `venue_users` (a separate users-like table for physical venue check-in, never cross-referenced with `users` in code seen).

## Cross-cutting findings

### 1. The one migration is provably broken
Confirmed independently by two research passes: `01_add_users.php` calls `ENUM(...)` as a bare, undefined PHP function rather than a string literal, which would fatal on execution — meaning this file, as committed, cannot have been the process that actually provisioned the live `users` table. Combined with duplicate array keys (`unique_id` appears 3x with different types, `code` 2x) whose earlier definitions are silently discarded by PHP, the migration cannot be trusted as documentation of intent, let alone as executable schema-as-code.

### 2. Zero use of database transactions anywhere in the codebase
Confirmed by direct grep: no `trans_start`/`trans_begin`/`trans_commit` calls exist anywhere in `application/modules`. Every multi-table write sequence found — bid placement + auto-bid cascade, sale settlement (update `bid`, insert `sold_items`, update `item`, update `auction_items` as four independent statements), invoice creation + status flips — is non-atomic. See [18-security-review.md SEC-025](18-security-review.md).

### 3. No row locking / concurrency control on bid placement
Every bid-accepting method reads the current highest bid with a plain unlocked `SELECT ... ORDER BY id DESC LIMIT 1`, then inserts based on that value — full detail in [06-bidding-engine.md §4](06-bidding-engine.md).

### 4. Monetary fields appear to be floats/doubles throughout, not fixed-point
The one confirmed example from the migration (`users.buyer_commission double`) is not an outlier — every other monetary value found (`bid.bid_amount`, `sold_items.price`/`payable_amount`, `auction_items.bid_start_price`, `transaction.amount`, commission percentages) is built via plain PHP arithmetic (`+`, `select_sum()`) with no cast to a fixed-point/decimal representation anywhere in the model layer. **Actual column types cannot be confirmed without direct DB introspection**, but nothing in the code path enforces decimal precision, so floating-point rounding drift across bid increments, commission math, and settlement totals is a live, unconfirmed risk.

### 5. Soft-delete vs. hard-delete is inconsistent, and hard-delete dominates
The large majority of "delete" functions across every module perform genuine `DELETE FROM` operations. The one clear soft-delete pattern (`transaction.delete_status`) is *also* bypassed by hard-delete code elsewhere touching the same table. `item.sold = 'return'` is a third pattern again — overloading a business-status enum value to also mean "hide this record," rather than a dedicated deleted flag.

### 6. Concrete functional bug found during reconstruction
`home/models/Home_model.php::insert_code($email)`:
```php
public function insert_code($email)
{
    $this->db->insert('reset_password_code');
    $this->db->where('email', $email);
}
```
`insert()` is called with **no data argument** (inserts an empty/all-default row), and the `where()` call runs *after* the insert already executed, so it has zero effect on it. This function silently never stores the reset code or its associated email — it "works" (no error thrown) while doing nothing useful. Direct evidence that reading model code compiling/running without error is not sufficient to infer correct business behavior.

### 7. Duplication is the dominant pattern across the whole schema
- **Whole-module duplication**: `auction`/`auction_____`; `api`/`apis`/`getapi` (nearly identical function bodies, yet disagreeing even on which table backs "upload a file" — `documents` vs. `files`); `customer`/`visitor` (near-byte-identical models); `users`/`user`; `cars/Common_Model.php`/`admin/Common_model.php` (copy-pasted utility class, including the hardcoded encryption key noted in [18-security-review.md SEC-026](18-security-review.md)).
- **Two parallel bid-log tables** (`bid` vs. `live_auction_bid_log`) for the same real-world fact.
- **Two parallel user tables** (`users` vs. `users2`).
- **Near-collision deposit tables**: `auction_deposit`, `auction_item_deposits`, `user_deposit_detail`, `security` — four different flavors of "money held against a user/item" with no consistent naming convention distinguishing them.
- **Typos baked into load-bearing identifiers**: `total_deposite`, `item_expencses`, `sort_catagories`, `orignal_name`, `milleage` (table name), inconsistent `chahge_status`/`change_status` function naming across modules for the same operation.

### 8. Denormalization and JSON-as-schema-escape-hatch
`sold_items.price` duplicates `bid.bid_amount` at settlement with no sync mechanism (compounds with #2's lack of transactions). Bilingual text is uniformly stored as `{"english":..., "arabic":...}` JSON inside a single text column — a deliberate but schema-less i18n approach requiring every read site to `json_decode()`. `invoices.other_details` is an ad hoc catch-all for unmapped form fields. The `item_category_fields`/`item_fields_data` EAV pattern coexists with `item`'s already-wide fixed-column set.

### 9. Audit/timestamp fields are present but inconsistently applied
Most transactional tables carry `created_on`/`updated_on` + `created_by`/`updated_by`, but reference/lookup tables frequently have only one or the other, and several insert paths (CRM, ACL) pass whatever `$data` array the calling controller happened to build with no central enforcement that timestamp fields are actually included — as demonstrated concretely by finding #6 above, that responsibility can be silently dropped entirely.

### 10. No way to independently verify any of the above against a real schema
Reiterating the caveat at the top of this document: absent `database.php` and absent real migrations, every claim here is inferred from usage, not from a schema definition. Enum-like value sets in particular (e.g. `bid_status`) reflect only the string literals found in code, not a DB-enforced constraint — the real column could permit any value. **A `SHOW CREATE TABLE` dump (or equivalent) against the live database is required to convert this document from "high-confidence inference" to "verified fact."**
