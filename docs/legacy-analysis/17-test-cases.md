# 17 — Test Case Extraction (Bidding Engine)

Status: Phase 17 complete for the core bidding paths, derived directly from the confirmed algorithm in [06-bidding-engine.md](06-bidding-engine.md). These are **behavioral compatibility tests** describing what the legacy system actually does today (including its bugs) — use them to verify a rebuild is a faithful behavioral match before deciding which behaviors to intentionally change. Tests marked "BUG" describe behavior that should very likely NOT be replicated in a rebuild; they're included so the rebuild team makes that call consciously rather than by accident.

Format: TEST ID | Scenario | Initial state | Action | Expected state (legacy, as-built) | Expected displayed price | Expected leader/winner | Expected notifications

## Online/closed auction bidding (`getapi::placebid` / `OnlineAuction::placebid`)

**BID-T01** | Normal valid bid | Lot open, current price $1,000, no prior bid from this user | Bidder submits increment $100 (total $1,100), believing current price is $1,000 | New `bid` row inserted, amount $1,100 | $1,100 | This bidder | Outbid push to previous leader (if any) via `getOutBidPushNotification` |

**BID-T02** | Stale price rejected | Lot open, current price is actually $1,100 (another bid landed first) | Bidder submits based on a stale belief that current price is $1,000 | Rejected, no row inserted | Unchanged at $1,100 | Unchanged (the other bidder) | None | `bidAmountChanged` error returned |

**BID-T03 (BUG)** | Below-minimum increment accepted | Lot open, current price $1,000 | Bidder submits increment $1 (total $1,001) | **Accepted** — no server-side minimum-increment check exists | $1,001 | This bidder | Outbid push fires | This is BID-001/SEC-007 — a rebuild should almost certainly reject this |

**BID-T04** | Bid on a closed/expired lot | Lot's `bid_end_time` has passed | Bidder submits a bid | Rejected | Unchanged | Unchanged | `item_time_expired` error |

**BID-T05** | Bid exceeding credit exposure limit | Bidder's projected exposure would exceed `balance × 10` | Bidder submits a bid within face-value range but over their real exposure limit | Rejected | Unchanged | Unchanged | `limitExceed` error |

**BID-T06 (BUG — concurrency)** | Two simultaneous valid bids | Lot open, current price $1,000, two bidders (A: +$100, B: +$150) submit within the same millisecond | Both read $1,000 as "current," both compute and insert ($1,100 and $1,150) | **Both rows exist**; whichever has the higher auto-increment `id` is treated as "current," which is not guaranteed to be the higher `bid_amount` | Non-deterministic — could show $1,100 as current even though a $1,150 bid exists | Non-deterministic | Outbid logic may fire incorrectly or not at all | This is BID-005/SEC-006 — a rebuild must not replicate this; use it as a regression test that MUST fail in the new system |

**BID-T07** | Proxy/auto-bid creation | Bidder submits a bid with `bid_limit` set (e.g. limit $2,000, increment $50) | New `bid_auto` row created (`auto_status='start'`) in addition to the immediate bid | Auto-bid armed | — | — | — |

**BID-T08** | Proxy/auto-bid consumption by a competing manual bid | Bidder A has an active auto-bid (limit $2,000, increment $50, currently leading at $1,000); Bidder B manually bids $1,020 | Server loop computes A's next auto-bid ($1,050), inserts it since $1,050 ≤ $2,000 limit and A isn't currently leading; repeats until A's limit is exhausted or A leads again | A now leads at $1,050 (assuming B doesn't re-bid) | $1,050 | Bidder A | Outbid push to B |

**BID-T09** | Proxy/auto-bid exhausted | Bidder A's auto-bid limit is $1,000; current price reaches $1,000 via A's own auto-bid; Bidder B bids $1,050 | Loop computes A's next bid ($1,050 + increment > limit) → `auto_status` flips to `'stop'`, no further auto-bid inserted | B leads | Whatever B bid | Bidder B | — |

**BID-T10** | Reserve met at auction close | Lot expires with highest bid ≥ `item.price` | `cronjob::auto_sale_auction_items()` runs | `sold_status='sold'`, `item.sold='yes'`, `bid.bid_status='won'` (or `'win'` depending on code path — see [11](11-database-model.md) inconsistency), `sold_items` row created | Final winning bid amount | Highest bidder | Buyer + seller emailed |

**BID-T11** | Reserve not met at auction close | Lot expires with a bid below `item.price`, but a bid exists | Cron runs | `sold_status='approval'` | Highest bid amount (pending approval) | Highest bidder (pending) | Seller emailed for manual decision |

**BID-T12** | No bids at auction close | Lot expires with zero bids | Cron runs | `sold_status='not_sold'`, `item.sold='no'` | No price | None | None confirmed |

## Live-hall auction bidding (`getapi::place_bid_live` / `Livecontroller::initialAuctionBid`)

**BID-T13** | Bid before operator initializes the lot | Operator hasn't called `initialAuctionBid()` yet for this lot | Bidder submits a bid | Rejected | — | — | `not_initialized` error |

**BID-T14** | Bid after operator stops the auction | Operator has flipped `start_status='stop'` via `updateLiveAuctionStatus()` | Bidder submits a bid | Rejected | Unchanged | Unchanged | `stop_by_admin` error |

**BID-T15** | Client-supplied bid ceiling exceeded | Bidder supplies `max_bid_limit=$5,000`; their bid would bring the total to $5,100 | Bidder submits | Rejected | Unchanged | Unchanged | `limitCross` error |

**BID-T16 (BUG — concurrency, same class as T06)** | Mobile bidder and operator hall-bid race on the same lot | Both act within the same window against the same `live_auction_bid_log` table with the unlocked read pattern | Same non-deterministic outcome as T06, now across two entirely different client surfaces (app vs. hall console) | Non-deterministic | Non-deterministic | Potentially incorrect | Regression test that MUST fail post-rebuild |

**BID-T17 (BUG — destructive)** | Staff retracts the latest bid | A bid was placed on a live-hall lot | Staff calls `retractAuctionBid()` | The bid row is **permanently deleted**, no soft-delete flag, no audit entry | Reverts to the prior bid's amount | Reverts to the prior bidder | None — deletion is silent | A rebuild must not replicate silent, unaudited deletion — use as a regression test |

**BID-T18 (BUG — destructive, broad)** | Staff rolls back an entire auction | Multiple lots have bids | Staff calls `rollBackAuctionBid()` | **Every** `live_auction_bid_log` row for the whole auction is deleted; all lots' `sold_status`/`buyer_id` reset | All lots revert to no-bid state | No leaders | None | Same as T17, at auction scope — must not be replicated as-is |

**BID-T19 (dead endpoint)** | Operator calls "provisional sold" | A lot has a winning bid | Staff calls `provisionalSoldAuctionBid()` | **CodeIgniter "method not found" error** — the routed method doesn't exist | N/A | N/A | N/A | Confirms this endpoint is non-functional; a rebuild should either implement the apparently-intended feature or remove the dead route |

**BID-T20** | Reserve display-only for live-hall | Highest live bid is below `item.price` | Operator calls `soldAuctionBid()` anyway | **Succeeds** — sale is recorded regardless of reserve, since no automatic reserve check exists for live-hall | Sale price = the below-reserve bid | Winning bidder | Buyer/seller emailed | Confirms LOT-002 — flag for business confirmation on whether this should gain an automatic check in a rebuild |

**BID-T21 (unauthorized-but-allowed)** | Non-auctioneer staff performs a destructive operator action | A logged-in staff account with role = Cashier (8), not Live Auction Controller (7) | Calls `retractAllAuctionBid()` | **Succeeds** — no role-7-specific check exists (ACL disabled) | Bid history erased for the lot | — | None | Confirms EC-09/SEC-005 — a rebuild must enforce role 7 (or equivalent) specifically |

## Auth/account edge cases worth testing explicitly in a rebuild (contrast against legacy "as-built" behavior)

**AUTH-T01 (BUG — critical)** | `token_update` account takeover | Any active user ID (including an Admin's) | Unauthenticated POST `{"id": <target_id>}` to `token_update` | **Legacy: succeeds, returns a valid JWT for the target account with no credential check.** A rebuild MUST reject this outright — this is not a compatibility target, it's the single highest-priority thing to verify is impossible in the new system. |

**AUTH-T02** | Social login as an existing user's email, no proof of ownership | An account already exists for `victim@example.com` | Call `fb_login_register` with `{"email": "victim@example.com"}` and no real Facebook verification | **Legacy: succeeds, logs in as that account.** Must not be replicated — verify the provider token server-side in the rebuild. |

**AUTH-T03** | Weak OTP brute-force | A registration OTP has just been issued (4-digit, no throttle) | Submit up to 10,000 guesses within the 3-minute window | **Legacy: no lockout, no rate limit — eventually succeeds.** Rebuild should add attempt throttling/lockout. |

## Notes for whoever picks this up

These test cases are deliberately written against **observed legacy behavior**, bugs included, so they double as a specification of "what changed and why" once a rebuild diverges intentionally (e.g. BID-T03, BID-T06, BID-T16, BID-T17, BID-T18, AUTH-T01, AUTH-T02 should all have a **new, corrected** expected result in the rebuild's own test suite — do not port these particular expectations forward unchanged). Tests without a "(BUG)" tag describe intentional, sound business logic (reserve handling for online auctions, proxy-bid consumption, credit-exposure limits, status-based rejection) that a rebuild should faithfully preserve.
