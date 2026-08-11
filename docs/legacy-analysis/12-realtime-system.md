# 12 — Realtime Architecture

Status: Phase 10 complete, synthesized from the bidding-engine and integrations research passes (no dedicated additional research needed — the transport and event-flow facts were fully surfaced by those two passes).

## Transport

**Pusher Channels**, not raw WebSockets, Socket.IO, Firebase Realtime Database, MQTT, SSE, or polling. Confirmed by the mobile app's `pusher_channels_flutter` dependency and server-side `Pusher\Pusher` PHP SDK usage in `getapi/Getapi.php`. Credentials (app key/secret/app ID, cluster `ap1`) are hardcoded in `application/config/custom.php` (see [18-security-review.md SEC-022](18-security-review.md)).

## Channel/event design

**A single global channel, `ci_pusher`, is used for all bidding-related broadcasts** — not per-item or per-auction channels. Two event names are used on this one channel:
- `my-event` — fired from the online/auto-bid flow (`placebid()` and its auto-bid cascade, three call sites in `Getapi.php`).
- `live-event` — fired from the live-hall bidding flow (`place_bid_live()` and its auto-bid cascade, three call sites in `Getapi.php`).

Because every connected client subscribes to the same channel regardless of which lot or auction they're actually viewing, **client-side filtering is entirely responsible for discarding irrelevant events** — the server does no channel-level scoping. This was not further verified against the Flutter client's event-handling code in this pass, but it is the architecture the server presents.

The controller method literally named `broadcast_pusher($item_id, $auction_id)` (routed at `getapi/Getapi/broadcast_pusher/$1/$2`, and duplicated in the `cronjob` module as `broadcast_pusher`/`broadcast_pusher_without_image`/`broadcast_pusher_low_load`) is **misleadingly named** — it does not itself call `->trigger()`. It only builds and returns a JSON snapshot of current item/bid state for on-demand polling/refresh. The actual `->trigger()` calls that push realtime events happen inline, embedded directly in the bid-submission logic (`placebid()`/`place_bid_live()`), not in this named "broadcast" method.

## Bid submitted → other bidders updated: the actual flow

```
Client submits bid (placebid / place_bid_live)
        |
        v
Server validates (auth, status, timing, balance — see 06-bidding-engine.md §1/§6)
        |
        v
Server computes new bid amount (client-supplied increment, no server floor — SEC-007)
        |
        v
Plain INSERT into bid / live_auction_bid_log (no transaction, no row lock — SEC-006)
        |
        v
Auto-bid cascade runs if applicable (same unguarded pattern, §2 of 06-bidding-engine.md)
        |
        v
Pusher trigger('ci_pusher', 'my-event'/'live-event', <payload>) fires inline,
still within the same request — a genuine push, not a delayed/batched broadcast
        |
        v
All clients subscribed to ci_pusher receive the event and presumably
re-render/re-filter client-side (client-side handling not verified in this pass)
```

## Source of truth & consistency risk

The database (`bid`/`live_auction_bid_log`, read via the same unlocked `ORDER BY id DESC LIMIT 1` pattern used everywhere else) is the intended source of truth — Pusher is purely a notification/push mechanism layered on top, not an independent state store. However, because bid writes themselves have no transactional/locking protection (see [06-bidding-engine.md §4](06-bidding-engine.md), [18-security-review.md SEC-006](18-security-review.md)), **the "truth" a Pusher event announces can itself already be the product of a race** — two near-simultaneous bids could both insert, and whichever Pusher trigger fires "last" (not necessarily the one corresponding to the actually-higher bid, since ordering isn't guaranteed under the unlocked read-then-write pattern) is what clients will momentarily believe is current, until/unless a subsequent fetch corrects it.

## Reconnect / missed-event recovery

No evidence of a sequence number, event ID, or "catch-up" mechanism was found in the server-side Pusher integration — events are fire-and-forget `trigger()` calls with no persisted event log a reconnecting client could replay against (aside from re-fetching current bid state via `broadcast_pusher`'s snapshot endpoint or the various `get_bid_log`/`get_current_lot`/`get_winning_lots` endpoints, which a client would need to call explicitly on reconnect — whether the mobile app actually does this was not confirmed in the mobile-app screen review, which focused on screen/API inventory rather than Pusher client event-handling code).

## Ordering & duplicate protection

**None found.** Pusher does not guarantee delivery ordering matches server-side event-firing order across all subscribers under all network conditions, and there is no event ID/nonce in the payload structure that was identified to allow a client to deduplicate or reorder events defensively. Combined with the underlying data race described above, this means the realtime layer can propagate a momentarily-inconsistent view of "current price"/"current leader" to connected clients, self-correcting only on the next authoritative fetch.

## Scaling limits

A single global channel for every bidding event across the entire platform (rather than per-auction or per-item channels) means:
- Every connected client receives every bid event platform-wide, filtering client-side — this is unnecessary payload/bandwidth overhead that grows with total platform bidding activity, not with what an individual user is actually watching.
- Pusher's own per-channel/per-app message-rate and concurrent-connection limits (plan-dependent, not verifiable from source) would be shared across the *entire* platform's bidding activity rather than isolated per auction — a busy day across many simultaneous live/online auctions could contend for the same channel's throughput ceiling in a way per-auction channels would avoid.

## Summary of risk themes

1. Single global channel (`ci_pusher`) rather than per-auction/per-item scoping — a design choice with real bandwidth and scaling implications, not a bug per se.
2. The realtime layer faithfully reports whatever the database currently holds, but the database write path itself is not race-safe (see [06-bidding-engine.md §4](06-bidding-engine.md)) — so realtime "truth" can itself be momentarily wrong.
3. No reconnect/catch-up or event-ordering/deduplication mechanism was identified server-side.
4. `broadcast_pusher`'s name is misleading relative to its actual (snapshot-only, non-triggering) behavior — worth flagging for anyone tracing this code in the future.
