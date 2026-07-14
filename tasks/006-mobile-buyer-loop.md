# Task 006 — Flutter buyer loop

Recommended owner: one consistent Claude Code or Antigravity Flutter owner

## Goal

Deliver mobile parity for discovery, lot detail, live bidding, reconnect, and post-close status on iOS and Android.

## Prerequisites

- Tasks 002–004 complete.
- Flutter choices and component foundations from Task 003 accepted.

## Scope

- Generate/complete the Flutter app with agreed architecture and environment configuration.
- Home, category/search, auction list/calendar, lot detail/gallery, watchlist, and my bids.
- Typed REST/socket adapters, secure session storage, snapshot/reconnect/gap recovery, foreground resync, server-time countdown.
- Terms, eligibility, fee sheet, manual/custom bid, proxy setup/status, unknown-command reconciliation, and all close/approval states.
- EN/AR, RTL, light/dark, large text, screen-reader semantics, reduced motion, safe areas, and intentional haptics.
- Push deep-link routing contract stub for Task 010 and hosted payment return contract stub for Task 009.

## Acceptance criteria

- Behavior matches web for the same contract fixtures and event trace.
- Background/foreground, network loss, duplicate/out-of-order events, expired auth, and killed/relaunched app recover safely.
- Financial numerals and identifiers remain readable/bidi-safe in Arabic.
- Haptics occur only after authoritative acceptance/rejection/status, not optimistic tap.
- Widget/golden/integration tests pass on supported Android and iOS targets.

## Validation

Document exact Flutter format/analyze/test/build commands plus tested device/OS matrix. Replay the same golden event sequence used by the web client and compare final derived state.

## Ownership rule

Keep one tool/owner responsible for broad Flutter architecture through this task. Parallel contributions should be bounded to isolated widgets/tests and reviewed by that owner.
