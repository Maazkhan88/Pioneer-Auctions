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

## Implementation Progress

### Phase 1: High-Fidelity UI Implementation (Complete)
- **Architecture**: Flutter 3.47.3 / Dart 3.13.3 application scaffolded at `apps/mobile`.
- **Target Platform**: Android First with strict canonical viewport `390 × 844` pt (`853 × 1844` px reference screens, scale ratio `2.1872`).
- **Visual Tokens**: Exact palette (`#5208B6`, `#3D1088`, `#F77A10`, `#EE233E`, `#E3FBEB`, `#FDE7EC`), typography scale (`displayTitle`, `pageTitle`, `priceLarge`, `countdownLarge`), spacing grid, and 30 extracted assets.
- **Custom Components**:
  - `PioneerAppHeader` (logo, notifications badge '3', avatar 'AA', root & subpage back modes)
  - `PioneerStatusChip` (LIVE with pulse dot, UPCOMING, REGISTERED, ENDING SOON, WINNING, OUTBID, WON, LOST, GOING ONCE)
  - `PioneerSearchField` (search icon, filter button trigger)
  - `PioneerButton` (42pt standard and 52pt sticky CTA, fitted typography)
  - `PioneerLotCard` (2-column card with image, badges, specs, price)
  - `PioneerAuctionCard` (horizontal event card with status, date, location, lot count)
  - `PioneerSlideToBid` (interactive physics slider, 85% threshold, haptics, spring reset)
  - `PioneerBottomNav` (5 persistent tabs with active purple indicator bar)
- **10 Screens**:
  1. `01 — Home` (`home_screen.dart`)
  2. `02 — Auctions` (`auctions_screen.dart`)
  3. `03 — Browse Lots` (`browse_lots_screen.dart`)
  4. `04 — Vehicles` (`vehicles_screen.dart`)
  5. `05 — Real Estate` (`real_estate_screen.dart`)
  6. `06 — General Materials` (`materials_screen.dart`)
  7. `07 — Lot Detail` (`lot_detail_screen.dart`)
  8. `08 — Live Auction Room` (`live_auction_room_screen.dart`)
  9. `09 — My Bids` (`my_bids_screen.dart`)
  10. `10 — Account Dashboard` (`account_dashboard_screen.dart`)
- **Navigation**: `go_router` StatefulShellRoute for persistent 5-tab bottom navigation with deep-linkable subroutes.
- **Validation**:
  - 14/14 automated widget and unit tests passing (`flutter test`).
  - 0 issues in `flutter analyze`.
  - Debug APK built natively via Android Gradle Plugin (`app-debug.apk` — 162.9 MB).

### Phase 2: Backend & Realtime Integration (In Progress)
- Package dependencies: `pioneer_contracts`, `http`, `socket_io_client`, `flutter_localizations`.
- Typed REST client for auctions, lots, and user bids.
- Socket.IO live bidding gateway integration (`/auctions/v1`).
- Arabic (AR) RTL localization and bidi-safe numerals.

## Validation Commands
```powershell
$env:PATH = "E:\flutter\bin;$env:PATH"
flutter analyze
flutter test
flutter build apk --debug
```
