# 06 — Bidding Engine Deep Dive

Status: Phase 5 complete (single research pass, high confidence — every claim below is evidence-backed with file:line references). This is the most critical document in the report per the engagement brief; treat it as authoritative for any future rebuild decisions.

## 0. Two distinct bidding surfaces exist

The codebase implements **two functionally separate bidding engines**, sharing some support tables but operating independently:

| | **(A) Online / closed auction bidding** | **(B) Live-hall bidding** |
|---|---|---|
| Bid table | `bid` | `live_auction_bid_log` |
| Bidder-facing entry point | `getapi/Getapi::placebid()` (`Getapi.php:5609`) — identical duplicate logic also exists in `auction/OnlineAuction::placebid()` (`OnlineAuction.php:1572`) | `getapi/Getapi::place_bid_live()` (`Getapi.php:5952`) |
| Operator entry point | Cron-driven only (`cronjob/Cronjob::auto_sale_auction_items()`) | `live_auction_controller/Livecontroller::initialAuctionBid()` and the retract/rollback/sold/not-sold family |
| Closing mechanism | Server-clock cron job compares `bid_end_time` | Operator-triggered `start_status` flag (`updateLiveAuctionStatus()`), re-checked server-side on every bid |
| Reserve enforcement | Automatic (cron compares winning bid to `item.price`) | Manual (auctioneer discretion; reserve shown as info only) |

There is also a third routed module, `livehall/Livehall`, which was confirmed to be a **read-only public catalog/search/browse surface** for live-hall auctions (listing, filtering, catalog PDF export, auction status lookup) — it contains **no bid-placement or bid-log code at all**, and should not be confused with the two actual bidding engines above.

Additionally (found independently during Phase 1 reconnaissance, not by this deep-dive pass — see [18-security-review.md SEC-002](18-security-review.md)), a third, unrouted-but-reachable legacy module `application/modules/api/controllers/Api.php` contains its own bid-placement method, `palceBids()`, which is even less validated than either (A) or (B) above (no price/status/increment checks at all, just an authenticated insert). That endpoint is treated as a standalone critical security finding rather than part of "the" bidding engine, since it appears to be superseded/abandoned code — but it is very likely still live at the HTTP layer.

## 1. Starting state & normal bidding

**Auth**: JWT bearer token, validated by `validateToken()` (`application/helpers/jwt_helper.php:42-68`), which also rejects deactivated users (`status != 1` → `USER_NOT_ACTIVE`).

**(A) `placebid()`** (`Getapi.php:5609`, duplicated in `OnlineAuction.php:1572`):
- Rejects if the client's believed `current_price` doesn't match the actual latest bid (`bidAmountChanged`) — i.e. optimistic staleness check, evaluated at request time.
- Rejects if item `bid_status == 'won'`, `sold_status != 'not'`, or `bid_end_time` has passed (server clock).
- New bid amount = `latest_bid_amount + $data['bid_amount']`, where **`$data['bid_amount']` (the increment) is taken verbatim from the client** — no server-side minimum-increment floor exists anywhere in this method.

**(B) `place_bid_live()`** (`Getapi.php:5952`):
- Rejects if auction `start_status == 'stop'` or `expiry_time` has passed (DB-sourced, not client-supplied).
- Rejects if the live auction hasn't been initialized by the operator yet (`empty($last_bid)` → `not_initialized`).
- Rejects if item already resolved (`bid_status` in `['win','not_sold']`).
- New bid amount = `last_bid['bid_amount'] + $data['bid_amount']` — same client-supplied-increment pattern as (A), same absence of a server-side minimum-increment check.
- A credit-limit check IS enforced server-side: computed exposure vs. `balance * 10`, and a client-supplied `max_bid_limit` ceiling is also checked (`limitCross`).

**Assessment**: Authentication, status, and timing checks are genuinely server-side and trustworthy in both paths. **The bid increment itself is fully client-determined in both paths — there is no server-side minimum-increment enforcement anywhere in the bidding engine.** Language strings for a `min_increment` validation message exist (`Getapi.php:12418`, `12916`) but are never wired into the actual validation logic — dead/vestigial UI copy, not a real check.

## 2. Proxy / max (auto) bidding

Supported, backed by table `bid_auto` (`item_id`, `auction_id`, `user_id`, `bid_limit`, `bid_increment`, `auto_status`).

- **Created**: when a bidder submits a bid with `$data['bid_limit']` present, both `placebid()` (`Getapi.php:5729-5745`) and `OnlineAuction::placebid()` insert a `bid_auto` row with the bidder's chosen `bid_limit` (max) and `bid_increment` (fixed step — also client-chosen, no admin-configured floor or ceiling).
- **Consumed**: identical logic appears in **three** places — `placebid()` (`Getapi.php:5793-5907`), `place_bid_live()` (`Getapi.php:6094-6218`), and the operator's `initialAuctionBid()` (`Livecontroller.php:308-436`). Algorithm: loop over active (`auto_status='start'`) `bid_auto` rows; compute `bid_price = last_bid_amount + bid_increment`; if `bid_limit >= bid_price` and this auto-bidder isn't already leading, insert a new bid on their behalf and loop again (`do...while` / `goto auto_bid_loop`); otherwise flip `auto_status` to `'stop'` (auto-bidder exhausted their limit).
- **Increment is a single fixed value per proxy-bid entry** — there is no increment schedule/table by price range, and it is not centrally/admin-configured; whatever the bidder typed as "my increment" when setting up the max bid is what the system uses for every subsequent auto-raise.
- **Equal/tied maximum bids**: not explicitly handled by any special-case code found — the loop processes `bid_auto` rows in whatever order the query returns them (no documented tie-break rule, e.g. earliest-created-wins), so behaviour when two proxy bidders share the exact same `bid_limit` is **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** (needs a direct read of the exact SQL `ORDER BY` on the `bid_auto` query, which was not captured verbatim by this pass — flagged for Phase 16 edge-case follow-up).

**Assessment**: Functionally the server does run the auto-bid ladder itself (authoritative), which is correct in principle. Risky in that: (a) the increment step is bidder-chosen and unbounded rather than admin/auction-configured, and (b) the entire multi-iteration loop runs with no transaction (see §4) — a race during the loop could leave `bid_auto` state inconsistent with the actual bid log.

## 3. Reserve price

- Reserve = `item.price` (called `reserve_price` in operator-facing views and language strings).
- **Online/closed auctions**: enforced automatically by `cronjob/Cronjob::auto_sale_auction_items()` (`Cronjob.php:72-300`). At expiry: `if ($buyer['bid_amount'] >= $item['price'])` → auto-marks `sold` and creates a `sold_items` row; otherwise sets `sold_status = 'approval'` and emails the seller for a manual accept/reject decision. This is a real, server-enforced reserve with a sensible fallback (human approval when reserve isn't met).
- **Live-hall auctions**: **no automatic reserve check exists at all.** `soldAuctionBid()`, `approvalSoldAuctionBid()`, `notSoldAuctionBid()` (`Livecontroller.php:582-818`) never compare the winning bid to `item.price`. The reserve is shown to the operator as information only (`getAuctionItemDetail()`, `Livecontroller.php:918-924`); whether a lot sells, goes to approval, or is passed is **100% the human auctioneer's live judgment call**, not a system rule.

**Assessment**: Online/closed path looks correct and deliberate. Live-hall path is UNKNOWN whether "reserve is advisory-only, auctioneer decides live" is an intentional business design (plausible for a real-world hall auction where the auctioneer negotiates in real time) or a gap — **REQUIRES BUSINESS CONFIRMATION**.

## 4. Concurrency / race conditions

**No transactions, no row locking (`FOR UPDATE`), no optimistic-version column exist anywhere in either bidding surface.** Confirmed by direct search across `getapi`, `live_auction_controller`, `livehall` for transaction/locking primitives — none found.

The pattern repeated in every single bid-accepting method (`placebid`, `place_bid_live`, `initialAuctionBid`, and the auto-bid consumption loops) is:
1. `SELECT ... ORDER BY id DESC LIMIT 1` to find the "current"/"last" bid (un-locked read).
2. Compute the new bid amount in PHP.
3. Plain `$this->db->insert()`.

There is no atomic "current price" column updated in the same transaction as the insert — the current price is *always* re-derived from the latest row, and nothing prevents two concurrent requests from reading the same "last bid," both computing a valid-looking new amount, and both inserting — with no guarantee that insertion (auto-increment `id`) order matches the actual higher bid amount, and no unique constraint preventing a lower `bid_amount` from landing after a higher one.

This exact unguarded pattern is shared by:
- The bidder-facing API (both A and B paths)
- The operator console's `initialAuctionBid` (hall bids) and `retractAuctionBid` (which deletes "the last row by id DESC" — itself a second read-then-act race)
- The proxy/auto-bid cascade loop (§2), which iterates and writes without any transactional boundary around the whole ladder

**Assessment**: Looks buggy/risky. This is a textbook race-condition exposure — under real concurrent load (a mobile bidder, a hall bidder, and an auto-bid cascade all touching the same lot within milliseconds of each other) this can produce lost updates, an incorrect "current leader," or bid amounts landing out of numeric order relative to insertion order. Given §8 below (two independent surfaces writing the same table with zero coordination), this risk is not theoretical — it's the single highest-impact correctness finding in the bidding engine.

## 5. Auction/lot closing & anti-sniping

- **Live-hall**: closing is entirely **operator-triggered, server-side**. `Livecontroller::updateLiveAuctionStatus()` flips `auctions.start_status` between `start`/`stop` and broadcasts a Pusher event (`start-event`/`stop-event`) to connected clients. `place_bid_live()` re-checks `start_status`/`expiry_time` from the DB on every single bid request — a bidder cannot get a bid accepted after the operator has stopped the auction, regardless of what the client believes.
- **Online/closed**: closing is **server cron-driven**, comparing `bid_end_time` to the PHP server clock — not client-triggered in any way.
- **No anti-sniping / bid-triggered time-extension logic exists anywhere** in either path (confirmed by search for extension-related keywords across both bidding controllers — nothing found). If this is a real gap rather than an intentional business choice, it means a bid placed in the very last second of a closing auction has no grace period, unlike many commercial auction platforms.
- **Access-control gap on the closing mechanism itself**: `cronjob/Cronjob` extends plain `MX_Controller`, not the authenticated base controller — its constructor has no login check, IP allow-list, or shared-secret check. Combined with `sale_out_email` being an explicitly public route (`routes.php:156`) and CI3's default routing conventions, `auto_sale_auction_items` (the method that resolves reserve/sold status for expiring online auctions) is very likely reachable as a bare, unauthenticated HTTP URL — meaning anyone who finds it could trigger auction-closing resolution logic on demand, outside the intended schedule. Whether this is mitigated at the infrastructure layer (firewalled cron-only path, secret query param not visible in this code) is **UNKNOWN — REQUIRES BUSINESS/INFRA CONFIRMATION**.

**Assessment**: The actual closing *decision* logic is correctly server-authoritative in both paths (good). The cron endpoint's total lack of in-app authentication is a real manipulation-surface concern regardless of the underlying resolution logic being sound. Absence of anti-sniping is a business-rule question, not necessarily a defect.

## 6. Bid rejection reasons (exhaustive, as implemented)

From `place_bid_live()` and `placebid()`:

1. Missing/invalid/expired JWT → `user_or_token_not_found`
2. User deactivated (`status != 1`) → `USER_NOT_ACTIVE`
3. Auction stopped by operator or past `expiry_time` (live only) → `stop_by_admin`
4. Live auction not yet initialized by operator (`empty($last_bid)`) → `not_initialized`
5. Item already resolved (`bid_status` in `['win','not_sold']` live / `'won'` online) → `soldout`
6. Item `sold_status != 'not'` → already sold/in approval
7. Lot's `bid_end_time` passed (online/closed) → `item_time_expired`
8. Client's believed `current_price` is stale vs. actual latest bid → `bidAmountChanged`
9. Projected exposure exceeds `balance * 10` credit limit → `limitExceed`
10. `bid_total_amount` exceeds client-supplied `max_bid_limit` (live only) → `limitCross`
11. Missing/empty request payload → `some_information_missed`
12. Not logged in (redundant secondary check in the live path) → `you_need_login`

**Explicitly NOT a rejection reason (i.e., not enforced) despite existing UI copy suggesting otherwise:**
- Bid below minimum increment — no such server-side check exists (see §1).
- Duplicate/double-submission — no idempotency key, nonce, or debounce anywhere; a double-tap or client retry would insert twice, only incidentally caught (sometimes) by the stale-price check, which itself is subject to the same race condition as §4.

## 7. Operator/admin actions (`live_auction_controller/Livecontroller.php`)

All of the following run under `Loggedin_Controller`, whose **ACL/permission check is commented out in source** (`Loggedin_Controller.php:38-41`) — see [18-security-review.md SEC-005](18-security-review.md). In practice this means *any* authenticated non-customer account (role != 4) can invoke every action below, not just designated auctioneer staff. None of these methods wrap their writes in a DB transaction.

| Method | Effect | Audit trail |
|---|---|---|
| `initialAuctionBid()` | Inserts a hall bid into `live_auction_bid_log` as the acting staff user; also runs the shared auto-bid cascade (§2) | `user_id`/`created_on` on the row identify who/when — no separate immutable log |
| `retractAuctionBid()` | **Hard-`DELETE`s** the single latest `live_auction_bid_log` row (found via the same un-locked "last by id" read as everywhere else) | **None** — no soft delete, no "retracted_by/at" fields, no separate audit entry |
| `retractAllAuctionBid()` | **Hard-`DELETE`s every** `live_auction_bid_log` row for a given `(auction_id, item_id)` — erases the lot's entire bid history | **None** |
| `rollBackAuctionBid()` | Resets `auction_items.sold_status`/`buyer_id` for the **whole auction** and hard-`DELETE`s **all** `live_auction_bid_log` rows for the entire `auction_id` (not just one item) — broadest, most destructive action available | **None** |
| `soldAuctionBid()` | Marks lot sold, marks winning bid row `bid_status='win'`, creates a `sold_items` row (`created_by` recorded here), updates `buyer_id`, sends buyer/seller emails | Partial — the `sold_items` row does carry `created_by` |
| `approvalSoldAuctionBid()` | Marks lot `sold_status='approval'`, marks winning bid row, emails buyer for approval | Same as above |
| `provisionalSoldAuctionBid()` | **Routed in `routes.php:77` but the method does not exist in `Livecontroller.php`.** Confirmed by full-file read (1,059 lines) and text search. **This is a dead/broken route** — invoking it produces a CodeIgniter "method not found" error. | N/A — non-functional |
| `notSoldAuctionBid()` | Marks `sold_status='not_sold'`, `item.sold='no'`, marks bid row `bid_status='win'` (reused status value even for a not-sold outcome — appears to just mean "terminal bid record," not literal win) | None beyond the row itself |
| `updateitembuyer()` | Directly overwrites `auction_items.buyer_id`/`sold_items.buyer_id` from raw POST values with **no validation that the named buyer ever actually bid on the item** | None |

**Assessment**: Looks risky/buggy on multiple independent axes — irreversible DELETE-based history erasure with no audit trail, a broken routed endpoint, and effectively no role-based gate distinguishing "any staff login" from "authorized auctioneer."

## 8. The three-surface coordination question

- **Confirmed**: `getapi::place_bid_live()` and `live_auction_controller::initialAuctionBid()`/retract/rollback/sold family all read and write the **same table**, `live_auction_bid_log`, using the identical unguarded read-then-write pattern (§4). There is **no coordination mechanism** between the bidder-facing API and the operator console — no mutex, no "this lot is currently under operator control" lock, no version check. Both also feed the same shared proxy-bid cascade, so a hall bid entered by staff can trigger the same auto-bid chain reaction a mobile bidder's bid would.
- **`livehall` module, independently confirmed as unrelated to bid execution**: fully read (669 lines) — it is a public catalog/search/browse controller (`index`, `searchItems`, `getAuctionItems` with filtering/pagination, `printCatalog`, `getAuctionStatus`, `modelsByMake`) with **zero bid-log or bid-placement writes anywhere**. It exists to let visitors browse/search live-hall lots and auction status before/during a session — a discovery layer, not a third bidding engine. It does not add to the race-condition surface described in §4/§8.

**Assessment**: The real, confirmed risk is the unsynchronized two-writer situation between the mobile/web bidder API and the operator's hall console on the exact same table — this is where a bid placed remotely and a bid entered live in the room by staff could genuinely clobber each other with no system-level arbitration, only whatever timing happens to occur.

## 9. Bid history / audit trail

- Both `bid` and `live_auction_bid_log` record each successful bid (`user_id`/`buyer_id`, amount, timestamp, and for the live table, `bid_type` — `online`/`hall`/`initial` — plus `bid_increment_amount`, `lot_no`).
- **Not immutable in practice**: `retractAuctionBid()`/`retractAllAuctionBid()`/`rollBackAuctionBid()` perform real hard deletes on `live_auction_bid_log` — a retracted bid leaves zero trace, no soft-delete flag, no separate deletion log.
- **Rejected bid attempts are never persisted** — only successful inserts create a row, so the log is not a complete record of "everything that was tried," only "everything that succeeded and wasn't later deleted by an operator."
- User IDs are sourced from JWT-validated sessions (trustworthy at write time) and timestamps are server-generated (not client-supplied) — the parts of the record that DO exist are trustworthy.

**Assessment**: Looks risky as a dispute-resolution/forensic artifact — real user attribution and real timestamps, but destructible by design (no soft-delete) and incomplete (rejected attempts never logged).

## 10. Client-side bidding logic (mobile app)

Files: `lib/Components/PlaceBidDialog.dart`, `DirectBidDialog.dart`, `BidConfirmationDialog.dart`, `lib/Model/BidPlace.dart`.

- Bid amount entry is a free-text field; the +/- stepper buttons move by the server-supplied `minBid` display value, but **manual typing accepts arbitrary numeric text** with no client-side min/max clamp enforced on direct entry (`PlaceBidDialog.dart:112-124`).
- `BidConfirmationDialog`'s "Confirm" button enablement is a purely client-side comparison (`value >= minBid + currentBid`) — UI gating only, not a security control.
- On confirm, the **client computes the increment to submit** as `enteredAmount - currentBid` and sends that as `bid_amount`, alongside the client's own belief of `current_price`, directly to `/api/v1/placebid` (`BidConfirmationDialog.dart:693-702`, mirrored for auto-bid).
- As established in §1/§6, the server re-validates price staleness, balance, and status — but does **not** independently recompute or floor-check the increment. So whatever the app (or a modified client, or a direct API call bypassing the app entirely) decides to submit as the increment is what actually gets applied.

**Assessment**: The mobile client performs the security-sensitive "is this a valid bid" and "what increment to send" computation entirely on-device, and the server does not compensate with its own increment floor — this is the same gap identified server-side in §1, now confirmed to originate from (or at least be unguarded by) the client layer too.

## Summary — cross-cutting risk themes

1. **No server-side minimum bid increment enforcement** anywhere in the bidding engine — the client fully dictates the increment in both bidding surfaces.
2. **No database transactions or row locks anywhere in the bid-write path** — a genuine, non-theoretical race condition shared by the bidder API, the operator console, and the proxy-bid cascade, all racing unsynchronized on the same tables.
3. **Reserve price is automatically enforced only for online/closed auctions**; live-hall reserve enforcement is entirely manual/operator discretion (status: intentional-or-gap unconfirmed).
4. **Role-based authorization is disabled in source** (`Loggedin_Controller`'s ACL check is commented out) on every live-hall operator endpoint, including irreversible bulk-delete actions.
5. **`provisionalSoldAuctionBid` is a dead, routed-but-nonexistent endpoint.**
6. **Bid history is not immutable** — operator retract/rollback actions permanently and silently erase bid records.
7. **The `cronjob` auction-closing controller has no in-app authentication**, making its reachability entirely dependent on infrastructure-level protection that could not be confirmed from source.
8. A separate, unrouted legacy module (`api/Api::palceBids`) contains an even less validated bid-insertion path and is very likely still reachable — see [18-security-review.md SEC-002](18-security-review.md).

These findings feed directly into [15-business-rules.md](15-business-rules.md) (BID-* rules), [16-edge-cases.md](16-edge-cases.md) (concurrency/tie/retraction scenarios), and [18-security-review.md](18-security-review.md) (new SEC entries below).
