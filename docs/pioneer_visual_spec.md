# Pioneer Auctions Mobile Visual Specification

**Design Canonical Viewport**: `390 × 844` logical pixels (pt)  
**Exported High-Resolution Reference**: `853 × 1844` physical pixels (px)  
**Reference Scale Ratio**: `2.1872 px / pt`  
**Target Platform**: Android First (Material/Cupertino defaults forbidden — pixel-faithful custom styling)

This visual specification is extracted directly from the 10 canonical reference screens (`01_home.png` to `10_account_dashboard.png`) located in `docs/reference_screens/`.

---

## 1. Color Palette & State Tokens

### 1.1 Brand & Interactive
| Token Name | Hex Code | Flutter `Color` | Usage |
| :--- | :--- | :--- | :--- |
| `PioneerColors.brandPurple` | `#5208B6` | `const Color(0xFF5208B6)` | Primary brand color, logo circle, primary action buttons, active tab pills, active navigation icon and indicator. |
| `PioneerColors.brandPurpleDeep` | `#3D1088` | `const Color(0xFF3D1088)` | Slide-to-bid track background in Live Room, high-emphasis interactive surfaces. |
| `PioneerColors.brandOrange` | `#F77A10` | `const Color(0xFFF77A10)` | Brand accent, hammer icon in Pioneer logo. |
| `PioneerColors.brandPurpleLight` | `#F2ECF9` | `const Color(0xFFF2ECF9)` | Light purple tint for category chips and secondary badges. |

### 1.2 Status & Badge Colors
| Status Badge | Background Hex | Text / Icon Hex | Border Hex | Description |
| :--- | :--- | :--- | :--- | :--- |
| `LIVE` (Auction / Lot) | `#EE233E` | `#FFFFFF` | N/A | High-urgency live indicator, red pulse dot (`#FFFFFF`). |
| `UPCOMING` | `#7433D9` | `#FFFFFF` | N/A | Scheduled auction / lot badge. |
| `REGISTERED` | `#19B449` | `#FFFFFF` | N/A | User registered for auction / verified lot. |
| `ENDING SOON` | `#FDC04E` | `#FFFFFF` | N/A | Lot entering final countdown window (flame icon). |
| `WINNING` | `#E3FBEB` | `#046E2E` | N/A | User holds winning bid (trophy icon). |
| `OUTBID` | `#FDE7EC` | `#E5233D` | N/A | User is outbid (upward arrow icon). |
| `WON` | `#E3FBEB` | `#046E2E` | N/A | User won the lot after closing. |
| `LOST` | `#EFF0F5` | `#4B5563` | N/A | User lost the lot after closing. |
| `PAST` | `#E5E7EB` | `#4B5563` | N/A | Concluded auction. |
| `GOING ONCE` | `#F2ECF9` | `#5208B6` | N/A | Auctioneer callout in Live Room (hammer icon). |

### 1.3 Canvas, Surfaces & Neutrals
| Token Name | Hex Code | Flutter `Color` | Usage |
| :--- | :--- | :--- | :--- |
| `PioneerColors.background` | `#F8F9FD` | `const Color(0xFFF8F9FD)` | Main application background (subtle cool off-white). |
| `PioneerColors.surface` | `#FFFFFF` | `const Color(0xFFFFFFFF)` | Card surface, bottom navigation bar, modals, bottom sheets. |
| `PioneerColors.surfaceSubtle` | `#F6F6FC` | `const Color(0xFFF6F6FC)` | Search field fill, inactive filter chip fill, secondary card fills. |
| `PioneerColors.border` | `#E5E7EB` | `const Color(0xFFE5E7EB)` | Card outline, input border, dividers. |
| `PioneerColors.borderLight` | `#EEF0F6` | `const Color(0xFFEEF0F6)` | Subtle dividers and chip borders. |

### 1.4 Typography Ink Colors
| Token Name | Hex Code | Flutter `Color` | Usage |
| :--- | :--- | :--- | :--- |
| `PioneerColors.textPrimary` | `#0C0D19` | `const Color(0xFF0C0D19)` | High-emphasis page headings, card titles, price amounts. |
| `PioneerColors.textSecondary` | `#4B5563` | `const Color(0xFF4B5563)` | Body text, labels, specifications, breadcrumbs. |
| `PioneerColors.textMuted` | `#6B7280` | `const Color(0xFF6B7280)` | Subtitles, helper text, inactive navigation icons/labels. |
| `PioneerColors.textUrgent` | `#EE233E` | `const Color(0xFFEE233E)` | Countdown timer ("2h 14m 32s"), overdue indicators. |

---

## 2. Layout Geometry & Spacing Grid

All measurements are given in **logical points (`pt`)** matching the canonical `390 × 844` viewport.

### 2.1 Margins & Gutters
- **Screen Horizontal Page Margin**: `16.0 pt` (left and right edges).
- **2-Column Grid Card Width**: `173.0 pt` (`[390 - (16 * 2) - 12] / 2 = 173 pt`).
- **2-Column Grid Gutter**: `12.0 pt` horizontal gap, `14.0 pt` vertical gap.
- **Single-Column Card Width**: `358.0 pt` (`390 - 32`).
- **Section Vertical Spacing**: `20.0 pt` to `24.0 pt` between major sections.
- **Header Top Padding**: `StatusBarHeight + 8.0 pt` (standard Android status bar inset handling).

### 2.2 Component Heights
- **App Top Bar Content Height**: `52.0 pt` (logo, notification bell with badge, avatar pill).
- **Search Field Height**: `44.0 pt` (rounded rectangle with `12.0 pt` radius).
- **Filter Chips Row Height**: `36.0 pt` (pill shape).
- **Primary Action Buttons** (e.g. "Join Live", "BID AGAIN"): `42.0 pt`.
- **Large Sticky CTA Button** (e.g. "BID AED 87,000"): `52.0 pt`.
- **Slide-to-Bid Track Height**: `58.0 pt` with `50.0 pt` circular draggable knob.
- **Bottom Navigation Bar Height**: `58.0 pt` content height (`+ ViewInsets.bottom` / SafeArea).

### 2.3 Corner Radii (`BorderRadius`)
- **Card Radius (`radiusCard`)**: `14.0 pt` to `16.0 pt`.
- **Input Radius (`radiusInput`)**: `12.0 pt`.
- **Button Radius (`radiusButton`)**: `10.0 pt` to `12.0 pt`.
- **Badge / Chip Radius (`radiusPill`)**: `999.0 pt` (full capsule pill).
- **Small Tile Radius (`radiusSmall`)**: `8.0 pt`.
- **Media Thumbnails Radius**: `8.0 pt`.

### 2.4 Shadows (`BoxShadow`)
- **Card Shadow**:
  ```dart
  BoxShadow(
    color: const Color(0x0A000000), // 4% black
    blurRadius: 8.0,
    offset: const Offset(0, 2),
  ),
  BoxShadow(
    color: const Color(0x05000000), // 2% black
    blurRadius: 2.0,
    offset: const Offset(0, 1),
  )
  ```
- **Bottom Navigation Shadow**:
  ```dart
  BoxShadow(
    color: const Color(0x0D000000), // 5% black
    blurRadius: 12.0,
    offset: const Offset(0, -2),
  )
  ```

---

## 3. Typography Hierarchy

Primary Font Family: `Tajawal` or `Inter` / System Sans-Serif with clean geometric rendering and numbers.

| Style Name | Size (`sp`) | Weight | Line Height | Letter Spacing | Color | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `displayTitle` | `26.0` | `FontWeight.w800` | `1.2` | `-0.5` | `#0C0D19` | Hero page titles ("My Bids", "Auctions", "Real Estate"). |
| `pageTitle` | `20.0` | `FontWeight.w700` | `1.25` | `-0.2` | `#0C0D19` | Screen headers ("Live Auction Room", "Browse Lots"). |
| `sectionTitle` | `17.0` | `FontWeight.w700` | `1.3` | `-0.1` | `#0C0D19` | Section headers ("Live Now", "Upcoming Auctions", "Featured Lots"). |
| `cardTitle` | `14.0` | `FontWeight.w700` | `1.3` | `0.0` | `#0C0D19` | Lot and auction card titles. |
| `priceLarge` | `22.0` | `FontWeight.w800` | `1.15` | `-0.2` | `#5208B6` | Current bid on Lot Detail & Live Auction Room. |
| `priceMedium` | `16.0` | `FontWeight.w800` | `1.2` | `0.0` | `#0C0D19` | Card price ("AED 185,000"). |
| `priceLabel` | `11.0` | `FontWeight.w500` | `1.2` | `0.0` | `#6B7280` | "Current Bid", "Your Bid", "Next Bid". |
| `countdownLarge`| `18.0` | `FontWeight.w800` | `1.15` | `0.0` | `#EE233E` | Prominent countdown timer ("2h 14m 32s"). |
| `countdownCard` | `11.0` | `FontWeight.w700` | `1.2` | `0.0` | `#EE233E` | Card corner countdown timer ("2h 14m"). |
| `metadata` | `11.0` | `FontWeight.w500` | `1.3` | `0.0` | `#6B7280` | Specs, mileage, year, location. |
| `buttonLabel` | `14.0` | `FontWeight.w700` | `1.2` | `0.1` | `#FFFFFF` | Button text ("Join Live", "BID AGAIN", "BID AED 87,000"). |
| `navLabel` | `10.5` | `FontWeight.w600` | `1.2` | `0.0` | Active: `#5208B6`, Inactive: `#8F8FA1` | Bottom navigation tab labels. |

---

## 4. Screen-by-Screen Structural Breakdown

### Screen 01 — Home
- **Top Header**: Logo (36pt height), Bell icon with red count pill `3`, Avatar circle `AA` (`#8C8FAE` background, 32pt diameter).
- **Search Field**: 44pt height, placeholder "Search auctions, lots, categories...", right filter slider icon.
- **3 Category Discovery Modules**: Horizontal row of 3 cards (Vehicles, Real Estate, General Materials). Height: `144 pt`. Dark gradient overlay, category icon top-left, title, subtitle, circular arrow button bottom-right.
- **Live Now Section**: "Live Now" title with pulsing red radio icon, "View All >" purple link. Hero card with large lot preview, red `LIVE` badge, UAE Government Vehicles Auction, current lot #128, total lots 320, time left 2h 14m, full-width purple `Join Live >` button.
- **Upcoming Auctions**: 3 horizontally scrollable cards (Dubai Vehicle Auction APR 26, Residential Property Auction APR 28, Industrial Equipment Auction APR 30).
- **Featured Lots**: 3 grid/carousel cards (#102 2022 BMW X5, #204 4BR Villa Dubai Hills, #318 CAT 320D Excavator).
- **Promotional Banner**: "Trusted Auctions for a Stronger Tomorrow", Dubai skyline purple background, "Bid. Win. Move Forward. >".
- **Bottom Navigation**: Home active.

### Screen 02 — Auctions
- **Header**: Standard header + Title "Auctions".
- **Search**: "Search auctions, categories, locations...".
- **Time Tabs**: Segmented tab bar with 3 tabs: `LIVE (1)` (purple active), `UPCOMING (3)`, `PAST (1)`.
- **Category Filter Chips**: Horizontal scroll row: `ALL` (active), `VEHICLES`, `REAL ESTATE`, `GENERAL MATERIALS`.
- **Auction Event Cards**: List of cards with left image (aspect ~4:3), category badge, date, location, lot count, watching/interested count, and action button (`Join Live >`, `Register >`, `View Auction >`, `View Results >`).
- **Bottom Navigation**: Auctions active.

### Screen 03 — Browse Lots
- **Header**: Title "Browse Lots", subtitle "Discover great deals across all categories".
- **Search**: "Search lots, makes, models, locations..." with filter button.
- **Category Filter Pills**: `All` (purple active with 4-square icon), `Vehicles`, `Real Estate`, `General Materials`, `Equipment`.
- **Sort Bar**: "1,248 Lots", Sort dropdown: "Sort by: Ending Soon v".
- **2-Column Mixed Grid**: Cards for vehicles, villas, generators, excavators with tailored metadata per category.
- **Bottom Navigation**: Auctions active.

### Screen 04 — Vehicles
- **Header**: Standard header, Back button, "Vehicles", "Cars, Trucks, Buses & More", "450 Lots", Sort "Latest v".
- **Search**: "Search by make, model, or keyword...".
- **Filter Grid**: 2-column dropdown filter buttons (Make, Model, Year, Price, Mileage, Transmission, Fuel, Condition, Auction) + "Clear All" & "Show Results (450)" button.
- **2-Column Vehicle Grid**: Cards featuring BMW X5, Hilux, GLC 300, Hiace, MAN TGS, Range Rover Sport with state badges (`LIVE`, `UPCOMING`, `REGISTERED`, `ENDING SOON`).

### Screen 05 — Real Estate
- **Header**: Standard header, "Real Estate", "Residential, Commercial & Land Properties Across the UAE".
- **Search**: "Search by location, property type, community...".
- **Category Tiles (5)**: Villas (active purple), Apartments, Commercial, Land, Warehouses.
- **Filters**: Location, Property Type, Beds, Price, Size, Occupancy, Auction.
- **Featured Real Estate Grid**: 4BR Villa Dubai Hills, Luxury Apartment Downtown, Warehouse Jebel Ali, Commercial Office Business Bay, Land Plot Al Furjan.

### Screen 06 — General Materials
- **Header**: Standard header, "General Materials", "Construction Equipment, Industrial Assets & Surplus", "View All" button.
- **Filters**: Asset Type, Condition, Manufacturer, Quantity, Location, Auction, Price.
- **Industrial Banner**: "Industrial Assets Build Greater Opportunities" with excavator photo.
- **Sort Bar**: "236 Lots Found", "Sort by: Ending Soon v".
- **2-Column Materials Grid**: CAT 320D Excavator, Industrial Generator, Toyota Forklift, Construction Materials Lot, Office Equipment Bulk Lot, Warehouse Assets.

### Screen 07 — Lot Detail
- **Header**: Back button, Pioneer logo, Heart (watchlist) icon, Share icon.
- **Media Gallery**: Large hero carousel with photo counter `1 / 10`, left/right arrows, thumbnail strip below with `+6` dark tile.
- **Lot Title Block**: "2022 BMW X5 xDrive40i", "Lot #118", breadcrumbs.
- **Live Auction State**: Red pill `• LIVE AUCTION`, `Time Left 2h 14m 32s`.
- **Bid Amounts**: Current Bid `AED 85,000`, Next Bid `AED 87,000`.
- **Vehicle Specs Strip**: 4 columns (2022 Year, 42,000 km Mileage, 3.0L I6 Engine, Automatic Transmission) with vertical dividers.
- **Expandable Sections**: Accordion cards for Overview, Condition, Inspection Report, Documents, Auction Information, Terms & Conditions.
- **Sticky CTA**: Full-width purple button with hammer icon: `BID AED 87,000`.

### Screen 08 — Live Auction Room
- **Header**: Back arrow, "Live Auction Room", "UAE Government Vehicles Auction", green pulsating dot "• Live & Connected", Bell, Avatar.
- **Media Carousel**: Live image overlay, `• LIVE` red badge, `128 watching` dark badge, fullscreen icon, lot counter `1 / 24`.
- **Lot Quick Specs**: Lot #118, 2022 BMW X5 xDrive40i, 3.0L Turbo, Automatic, Petrol, Watch button.
- **Bid Display**: Current Bid `AED 86,000` by Bidder #2456, Next Bid `AED 87,000`, Time Left `2h 14m 32s`.
- **SLIDE TO BID Widget**:
  - Horizontal pill track (`#3D1088` deep purple).
  - Draggable circular handle (`#FFFFFF`) with purple double-chevron `>>`.
  - Label: "Slide to place bid of AED 87,000".
  - Subtitle below: "Slide right to confirm your bid. This helps prevent accidental bidding."
  - Threshold: 85-90% drag completion triggers bid submission, auto-snaps back on release before threshold.
  - Haptic feedback on confirmation and state transition to "YOU'RE WINNING".
- **Winning Banner**: Green card with trophy: "YOU'RE WINNING - You have the highest bid at AED 86,000. Keep going! Next bid: AED 87,000".
- **Split Activity & Progress**:
  - Left: "Live Bidding Activity" stream (Bidder #2456 "Your Bid" AED 86,000, Bidder #3178 AED 85,000, etc.).
  - Right: "Auction Progress" (118 of 320 lots - 37% bar), "GOING ONCE" hammer card, "Auctioneer is live" audio wave.
- **Next Lot Preview**: Lot #119 2021 Range Rover Sport HSE, "Starts in ~ 2 min".

### Screen 09 — My Bids
- **Header**: Standard header + Title "My Bids", subtitle "Track and manage all your auction activity".
- **Filter Tabs**: `ACTIVE (3)` (active purple), `WON (5)`, `LOST (8)`, `ALL (16)`.
- **Active Bids List**:
  - BMW X5 (#102): `WINNING` green badge, Your Bid AED 185,000, Current Bid AED 185,000, Time Left 2h 14m.
  - 4BR Villa Dubai Hills (#204): `OUTBID` red badge, Your Bid AED 4,000,000, Current Bid AED 4,250,000, Time Left 1d 3h, purple `BID AGAIN` button.
  - CAT 500 KVA Generator (#318): `WINNING` green badge, Your Bid AED 320,000, Current Bid AED 320,000.
- **Completed Bids Section**: "View All >" link.
  - Mercedes-Benz Actros (#076): `WON` green badge, Final Bid AED 210,000.
  - Structural Steel Beams (#562): `LOST` grey badge, Final Bid AED 52,000.
- **Bottom Navigation**: My Bids active.

### Screen 10 — Account Dashboard
- **Header**: Standard header.
- **Profile Card**: Dubai skyline purple card, Avatar `AA`, "Ahmed Al Mansoori", "Member since Apr 2022", "✔ Verified Account" green badge, "Edit Profile" button with pencil.
- **Metrics Strip**: 5 horizontal cards (12 Active Bids, 8 Registered Auctions, 23 Watchlist, 5 Won Lots, AED 42,500 Payments Due).
- **Navigation Menu**: List tiles with colored icons (My Auctions, My Bids, Won Assets, Payments, Deposits, Documents, Notifications with red badge `3`, Profile, Support).
- **Recent Activity**: Stream of actions with category badges (Bid Placed, Auction Won, Payment Due, Registered for Auction).
- **Bottom Navigation**: Profile active.

---

## 5. Bottom Navigation Specification

Height: `58.0 pt` + SafeArea bottom inset.  
Background: `#FFFFFF`, Top border: `1.0 pt solid #E5E7EB`.  

| Index | Tab Name | Icon (Inactive `#8F8FA1`) | Icon (Active `#5208B6`) | Active Indicator |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `Home` | Outline Home | Filled / Bold Home | Purple bottom bar (`48 × 3 pt`) |
| `1` | `Auctions` | Outline Gavel / Hammer | Filled Gavel / Hammer | Purple bottom bar (`48 × 3 pt`) |
| `2` | `Watchlist` | Outline Heart | Filled Heart | Purple bottom bar (`48 × 3 pt`) |
| `3` | `My Bids` | Outline Document / Bid | Filled Document / Bid | Purple bottom bar (`48 × 3 pt`) |
| `4` | `Profile` | Outline User / Person | Filled User / Person | Purple bottom bar (`48 × 3 pt`) |
