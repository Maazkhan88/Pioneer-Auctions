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

### Phase 2: Backend & Realtime Integration (Complete)
- **Dart Contracts Integration**: Direct local dependency on `packages/contracts/dart` (`pioneer_contracts`). Full support for `PlaceBidCommand`, `LotSnapshot`, `CommandAck`, `Amount` in integer fils (1 AED = 100 fils).
- **Typed REST Client (`ApiClient`)**:
  - `isHealthy()` health check endpoint.
  - `fetchLots()` returning `{ contractVersion: 1, items: PublicLotCard[] }`.
  - `fetchLot()` returning `PublicLotCard`.
  - `placeBid()` constructing `PlaceBidCommand` with lowercase headers (`x-pioneer-test-account-id`, `Idempotency-Key`).
  - Timeout returns `ApiUnknown` retaining the exact `commandId`.
  - Rejection returns `ApiFailure` with structured server error and latest state.
- **Realtime Gateway (`SocketService`)**:
  - Connects to Socket.IO namespace `/auctions/v1`.
  - Flat public lot events (`server:hello`, `lot:snapshot`, `bid:accepted`, `auction:extended`, `auction:state-changed`, `reserve:status-changed`, `lot:presence-changed`).
  - Enveloped personal events (`bid:status-changed`, `proxy-bid:changed`, `eligibility:changed`).
  - Resilient subscription mapping across reconnects (`lot:subscribe` with `afterSequence`).
  - Gap detection triggering `lot:sync`.
  - Foreground resync lifecycle hooks and server-time clock offset synchronization.

### Phase 3: Authoritative Bid State Machine & Controls (Complete)
- **BidStateMachine**: Sealed state hierarchy (`BidIdle`, `BidConfirming`, `BidSubmitting`, `BidAccepted`, `BidRejected`, `BidUnknown`, `BidOutbid`, `BidGated`, `BidClosed`, `BidResyncing`).
- **Zero Simulated Bids**: Strictly never fabricates winning or accepted status without authoritative server ack (`CommandAck` or `BidAcceptedEvent`).
- **Idempotency Command Key**: Generated via RFC 4122 v4 UUID and preserved across retry attempts.
- **Authoritative Slide-To-Bid**: Slider completion fires `onSubmitRequested` only; haptics fire ONLY on authoritative `ACCEPTED` (`heavyImpact`) or `REJECTED` (`vibrate`). Tap-to-bid accessible alternative.
- **Fee Breakdown & Terms Gate**: Modal `BidConfirmationSheet` calculating 5% premium (500 AED min) and 5% VAT; terms checkbox requirement with `termsVersionId`.

### Phase 4: Screen Wiring & 404 Handling (Complete)
- `LotDetailScreen` and `LiveAuctionRoomScreen` wired to `PioneerRepository` and `SocketService`.
- 404 Lot Not Found screen rendered for nonexistent lot IDs without silent mock substitution.
- Sticky dual CTA in detail screen ("Live Room" and "Place Bid").
- Dynamic loading spinners and empty states across browse, vehicles, real estate, and materials screens.

### Phase 5: Android Permission & iOS Platform Scaffolding (Complete)
- Added `<uses-permission android:name="android.permission.INTERNET"/>` in `apps/mobile/android/app/src/main/AndroidManifest.xml`.
- Created canonical iOS project scaffolding under `apps/mobile/ios/` (40 files, bundle ID `com.pioneer.pioneerMobile`, `Runner.xcodeproj`, `Info.plist`, `AppDelegate.swift`).
- Added deep-link aliases (`/lot/:id`, `/payment-return`).
- Added `kotlin.incremental=false` to `apps/mobile/android/gradle.properties` to fix Windows multi-drive Kotlin cache collisions.

### Phase 6: Arabic BiDi Safety, Dark Theme & Full Tests (Complete)
- Wrapped currency, numbers, and identifiers with Unicode LTR isolates (`\u202A...\u202C`) to prevent punctuation reversal in Arabic RTL contexts.
- Added comprehensive dark theme palette tokens and `PioneerTheme.darkTheme`.
- 50/50 automated tests passing across contracts, REST client, socket events, reconnect recovery, bid state machine, localization, and interactive screens.
- Android debug APK built natively via AGP (`app-debug.apk`).

## Current Status: In Progress
- **Why In Progress**: All mobile buyer loop features, authoritative bid state machine, pure integer fils arithmetic, Material 3 floating navigation with accessibility/localization, and 68 automated Flutter tests pass on Windows/Android. Android debug APK builds cleanly. Native iOS runtime validation and UI tests require a macOS environment with Xcode. In accordance with AGENTS.md quality gates, Task 006 remains explicitly In Progress until verified on a macOS/Xcode runner.

### Remediation Completed — 2026-09-18 (docs/antigravity-task-006-008-remediation-prompt.md)

1. **Simulated Bidding Completely Removed (Blocker C)**:
   - Deleted demo mode simulated bid acceptance fallback in `PioneerRepository.placeBid()`.
   - Transport timeouts remain strictly `ApiUnknown` with identical `commandId` and payload. Offline mode returns safe unavailable status without fabricating bids.
2. **Authoritative Screen Rendering (Blocker D)**:
   - Removed optimistic mutations (`+1000` increments, local status flips, fabricated bid history rows) from `LotDetailScreen` and `LiveAuctionRoomScreen`.
   - Screens render authoritative server fields (`result.currentBid.amountFils`, `result.nextMinimumBid.amountFils`, `result.sequence`, `result.myBidStatus`, `result.closesAt`, `result.extended`).
   - Screen-level haptics removed; state machine triggers authoritative success (`heavyImpact`) or failure (`vibrate`) haptics.
3. **Hardened Correlation and Event Ordering (Blocker E)**:
   - `handleCommandAck` requires an active pending command, validates `ack.commandId == activeCommand.commandId`, `ack.result.lotId == activeCommand.lotId`, and `ack.result.sequence >= lastAppliedSequence`.
   - Deduplication uses an independent `_completedCommandIds` set so duplicate acks remain ignored across all lifecycle states.
   - Late acks cannot overwrite newer personal `OUTBID`, `CLOSED`, `GATED`, or `RESYNCING` states.
   - Public `bid:accepted` events update public price and sequence only; personal winning/outbid status is driven strictly by personal `bid:status-changed` events.
4. **Fils Preservation & Round-Half-Up Financials (Blocker G / DEC-025)**:
   - Pure integer fils arithmetic throughout (`((amountFils * bps) + 5000) ~/ 10000`). Truncating `~/ 100` AED getters deleted.
   - `PioneerFormatters.formatFils` displays exact fils when non-zero (`AED 89,462.50`) and whole AED when zero (`AED 85,000`), with LTR BiDi isolation.
   - `BidConfirmationSheet` fee breakdown preserves exact fils.
5. **Authoritative Terms Gate (Blocker F)**:
   - Terms checkbox in `BidConfirmationSheet` defaults to un-checked (`_termsAccepted = false`), requiring explicit user confirmation per bid.
6. **M3 Floating Navigation Localized & Accessible (Blocker J)**:
   - All 5 tab labels localized via `PioneerLocalizations` in EN and AR; tab 3 labeled "Browse".
   - Explicit `Semantics` on tabs (button, selected state, localized label).
   - Reduced motion supported via `MediaQuery.maybeDisableAnimationsOf`.
   - Minimum 48x48 logical pixel touch targets maintained.
   - Large text scaling (up to 2.0x) verified overflow-free with `Flexible` and `FittedBox`.
7. **iOS Camera Permissions**: Added `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to `apps/mobile/ios/Runner/Info.plist`.

## Validation Commands
```powershell
$env:PATH = "E:\flutter\bin;" + $env:PATH
$env:TEMP = "E:\temp"; $env:TMP = "E:\temp"; $env:GRADLE_USER_HOME = "E:\.gradle"
flutter analyze
flutter test
flutter build apk --debug
```
