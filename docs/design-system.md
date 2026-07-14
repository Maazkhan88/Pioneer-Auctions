# Design system and localization contract

## Experience principles

- Photography leads; interface chrome recedes.
- Dense auction information is calm, ordered, and scannable.
- Trust state is explicit in words and icons, never implied by colour alone.
- Urgency is controlled. Orange is reserved for action and time pressure.
- The next valid action and its financial consequence are visible before commitment.

## Source tokens

Canonical machine-readable values live in `packages/design-tokens/src/tokens.json`. Platform exports are generated from that source; do not manually fork values in CSS or Dart.

Semantic palette:

- Brand/navigation: purple (`#5B21B6`, deep `#2E1065`).
- Primary bid/action: orange (`#EA580C`).
- Winning/success: green (`#16A34A`).
- Outbid/danger: red (`#DC2626`).
- Pending/review: amber (`#D97706`).
- Informational: blue (`#2563EB`).
- Text/background/borders: slate scale.

## Typography

- Latin UI and tabular financial figures: Inter.
- Arabic UI: Tajawal by default; IBM Plex Sans Arabic is the evaluated fallback.
- Arabic may render 10–15% larger at equivalent hierarchy levels and uses more generous line height.
- Prices and countdowns use tabular numerals. Do not animate changing digits in a way that blocks assistive technology.

## Layout

- 4-point spacing grid: 4, 8, 12, 16, 24, 32, 48, 64.
- Mobile: single column with a safe-area-aware sticky action zone.
- Web: 12-column grid, approximately 1280 px maximum content width; gallery and sticky bid panel on lot detail.
- Minimum interactive target: 44×44 CSS px / logical px.

## Bid-state semantics

| State            | Colour role  | Required text/icon behavior                       |
| ---------------- | ------------ | ------------------------------------------------- |
| Highest bidder   | Success      | “You’re winning” plus check/status icon           |
| Outbid           | Danger       | “You’ve been outbid” plus clear next action       |
| Pending approval | Warning      | SLA/expected decision time                        |
| Reserve met      | Success      | Explicit label                                    |
| Reserve not met  | Neutral      | Explicit label; never infer with red              |
| Ending soon      | Urgency      | Remaining time and accessible announcement policy |
| Extended         | Urgency/info | Show old/new close context and “extended” reason  |

## Core components

- Lot card: media, lot/auction numbers, title, current bid, time state, watch toggle, status.
- Bid button: “Bid AED X” or localized equivalent; loading, confirmed, and rejected states.
- Countdown: server-synchronized, tabular, neutral/amber/orange thresholds, no perpetual motion when reduced-motion is enabled.
- Bid-state banner: sticky summary of winning/outbid/eligibility state.
- Deposit chip: eligibility and available/held amount without exposing sensitive payment data.
- Fee sheet: hammer, premium, VAT/fees, deposit application, estimated total.
- Status badge: text + icon + semantic colour.

## RTL rules

- Use `dir`, CSS logical properties, Flutter `Directionality`, `EdgeInsetsDirectional`, and `AlignmentDirectional`.
- Mirror page flow, navigation placement, progress indicators, chevrons, and directional arrows.
- Do not mirror the Pioneer logo, gavel, photos, video controls, search, clock, refresh, or camera icons.
- Wrap AED amounts, Latin lot/auction IDs, VIN, IBAN, email, URL, and phone values in LTR/bidi isolation.
- Default financial numerals to Western Arabic digits; retain a future preference for Eastern Arabic digits.
- Test actual Arabic text at 200% zoom and narrow widths. Pseudolocalization does not replace native Arabic review.

## Accessibility baseline

- WCAG 2.2 AA target for web/admin; equivalent mobile accessibility semantics.
- 4.5:1 contrast for normal text and 3:1 for large text/UI boundaries where required.
- Keyboard-visible focus; skip navigation; logical heading order; correctly named controls.
- Bid acknowledgements and outbid state use a polite/assertive ARIA live strategy that avoids countdown spam.
- Modal confirmations trap/restore focus and expose totals before the final action.
- Support reduced motion, text scaling, screen readers, and colour-vision differences.

## Logo asset note

`assets/brand/pioneer-auctions-logo-transparent.png` is a provisional generated raster cleanup from a compressed JPEG. It is suitable only for prototypes. Obtain an official SVG/PDF/AI master, confirm colour values and clear-space rules, then replace the prototype asset through a separate reviewed brand task.
