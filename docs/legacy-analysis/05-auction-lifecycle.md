# 05 — Auction & Lot Lifecycle

Status: Phase 4 complete, synthesized from the Phase 2 domain research pass, the Phase 5 bidding-engine pass, and the Phase 12 integrations pass (cron trigger detail). See [03-business-domain.md](03-business-domain.md) for entity definitions and [06-bidding-engine.md](06-bidding-engine.md) for full bid-level mechanics.

## Auction (event) lifecycle

```
[Staff creates auction] --Auction::save_auction()--> auctions row (status='active', access_type set)
        |
        | staff runs Auction::add_auction_items() for each item to include
        v
[auction_items rows created] (sold_status='not', lot_no/order_lot_no assigned)
        |
        +-- access_type='online'/'closed': bidding opens per-lot at bid_start_time,
        |   closes per-lot at bid_end_time (or auction-level expiry_time)
        |
        +-- access_type='live': bidding opens/closes via operator action
        |   (Livecontroller::updateLiveAuctionStatus, start_status flag),
        |   re-validated server-side on every bid request
        v
[Lot resolution — see per-type sections below]
        |
        v
[sold_items row created on sale] --> settlement/payment/invoice flow (Users/Transaction modules)
```

There is no explicit "auction closed/archived" terminal status confirmed in code beyond `auctions.status='active'` being the only literal value found — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** whether a formal "auction archived" state exists elsewhere (e.g. set manually by staff, or inferred purely from all lots being resolved).

## Lot (item-in-auction) resolution — online/closed auctions

Driven entirely by the server-clock cron job `cronjob/Cronjob::auto_sale_auction_items()` (`Cronjob.php:72-300`), not by any client/bidder action:

```
                         auction_items.bid_end_time (or auction.expiry_time) reached
                                            |
                                            v
                          Does a bid exist for this lot?
                          /                              \
                        NO                                YES
                         |                                  |
                         v                                  v
             sold_status = 'not_sold'          highest bid_amount >= item.price (reserve)?
             item.sold = 'no'                    /                          \
                                                YES                          NO
                                                 |                            |
                                                 v                            v
                                  sold_status = 'sold'          sold_status = 'approval'
                                  item.sold = 'yes'              (seller emailed for
                                  bid.bid_status = 'won'          manual accept/reject —
                                  sold_items row inserted         the actual approve/reject
                                  buyer/seller emailed            action was not located in
                                                                   this pass; presumed to live
                                                                   in code outside the modules
                                                                   directly reviewed)
```

**Trigger mechanism**: this cron method has **no in-app authentication** (`Cronjob` extends plain `MX_Controller`, not the authenticated base controller) and no evidence of an OS-level crontab/scheduler config exists anywhere in the repository (`appspec.yml` only defines a CodeDeploy `BeforeInstall` hook, unrelated to scheduling). How this method is actually invoked on a schedule in production is **UNKNOWN — REQUIRES BUSINESS/INFRA CONFIRMATION**; per [18-security-review.md SEC-010](18-security-review.md) it is also very likely reachable as a bare, unauthenticated HTTP URL regardless of whatever scheduling mechanism also calls it.

**Non-atomicity**: this whole four-statement sequence (update `bid`, insert `sold_items`, update `item`, update `auction_items`) runs with **no database transaction** — see [18-security-review.md SEC-025](18-security-review.md). A failure partway through leaves these tables inconsistent with no reconciliation logic.

## Lot resolution — live-hall auctions

Entirely operator-driven, no cron/timer involvement:

```
Operator calls Livecontroller::initialAuctionBid() to open bidding on a lot
        |
        v
Bidders (mobile/web via getapi::place_bid_live) and/or operator (hall bids via
initialAuctionBid) submit bids -- BOTH write live_auction_bid_log, unsynchronized
        |
        v
Operator makes the call:
   soldAuctionBid()          -> sold_status='sold',   item.sold='yes',  winning bid row bid_status='win', sold_items row created, buyer/seller emailed
   approvalSoldAuctionBid()  -> sold_status='approval', winning bid row bid_status='win', buyer emailed for approval
   notSoldAuctionBid()       -> sold_status='not_sold', item.sold='no', winning bid row bid_status='win' (reused value, not a literal "win")
   provisionalSoldAuctionBid() -> DEAD ROUTE, method does not exist (see 06-bidding-engine.md §7)
```

Reserve (`item.price`) is **not** automatically checked at any point in this flow — the operator sees it as information and decides sold/approval/not-sold at their own discretion (see [06-bidding-engine.md §3](06-bidding-engine.md)).

**Reversibility**: unlike the online/closed path, live-hall resolution is fully reversible by staff at any time via `retractAuctionBid()`/`retractAllAuctionBid()`/`rollBackAuctionBid()` — but these are irreversible, unaudited hard-deletes of bid history when used (see [06-bidding-engine.md §7](06-bidding-engine.md) and [18-security-review.md SEC-009](18-security-review.md)), not a safe "undo."

## Deposit lifecycle (cross-cutting, applies to both auction types)

```
auction_deposit (deposit_type='temporary', tied to one auction) created by user action
        |
        +--> staff can convert to deposit_type='permanent' (general account balance)
        |
        v
auction_item_deposits (per-lot security deposit, if auction_items.security='yes')
        |
        v
[bidding — deposit eligibility surfaced to buyer via get_ai_list(), enforcement
 at bid-acceptance time UNCONFIRMED — see 03-business-domain.md §5]
        |
        v
On settlement: sold_items.adjusted_security / adjusted_deposit set by staff via
Users::adjust_security()/adjust_deposit() -- see 18-security-review.md SEC-019 (IDOR risk)
        |
        v
Refund: Auction::refund() inserts a mirrored CR ledger row (does not delete the
original DR row) -- a genuinely sound audit-preserving pattern, in contrast to
bid-log deletion elsewhere in the system
```

## Item (catalogue record) lifecycle — independent of any specific auction

```
item created (web admin OR mobile vendor submission via getapi::save_item())
   status='active', item_status='created', in_auction='no', sold='no'
        |
        | documents uploaded (automatic transition, not a manual review step)
        v
   item_status='completed'
        |
        | staff selects item via Auction::add_auction_items()
        | (eligibility filter: sold='no' only -- no approval-status filter)
        v
   in_auction='yes', auction_items row created
        |
        | lot resolution (see above)
        v
   sold='yes' (if sold) / remains 'no' (if not_sold, item can be re-listed
   in a future auction -- in_auction flag would need to be reset, exact
   mechanism for that reset was not located in this pass)
```

There is no formal approval/review gate between "vendor submits item" and "item is immediately live and eligible to be auctioned" — see [03-business-domain.md §6](03-business-domain.md) for full detail and the open confirmation question.

## Summary of what drives each transition

| Transition | Driven by |
|---|---|
| Auction created / lots added | Explicit staff action only |
| Online/closed lot open → resolved | Server-clock cron (`auto_sale_auction_items`), unauthenticated endpoint |
| Live-hall lot open → resolved | Explicit operator action only (`updateLiveAuctionStatus`, `soldAuctionBid`/etc.), re-validated server-side per bid |
| Item `created` → `completed` | Automatic on document upload |
| Item → in an auction | Explicit staff curation (implicit approval gate, not a formal state) |
| Deposit → adjusted/refunded | Explicit staff action, IDOR-exposed (SEC-019) |
| Bid → retracted/rolled back (live only) | Explicit staff action, irreversible, unaudited (SEC-009) |
