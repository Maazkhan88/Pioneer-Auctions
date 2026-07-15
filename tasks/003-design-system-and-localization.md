# Task 003 — Cross-platform design system and localization foundation

Recommended owner: Codex for tokens/web primitives; one designated Flutter owner for Dart primitives

Status: In progress on `agent/task-003-design-system` (started 2026-07-15). Codex owns both token/web work and the bounded Flutter primitives for consistency.

## Goal

Create accessible, themeable English/Arabic primitives that keep visual and semantic behavior consistent across web, admin, and Flutter.

## Prerequisites

- Task 001 complete.
- Brand owner acknowledges the prototype logo limitation and supplies official master when available.

## Scope

- Generate TypeScript/CSS and Dart outputs from one canonical token source.
- Add light/dark semantic themes with automated contrast checks.
- Configure Inter and Tajawal with licensed/self-hosted or approved delivery strategy.
- Implement primitives: button, icon button, field, money display, countdown display, status badge, card, sheet/dialog, toast/live announcement, skeleton, and direction-aware layout helpers.
- Implement auction components: lot card, bid-state banner, bid CTA, deposit chip, fee breakdown, reserve state, and extension notice.
- Add English, Arabic, and pseudolocale fixtures with no hardcoded component strings.
- Decide Flutter state management/navigation/localization packages and record the decision before generating broad app code.
- Add Storybook or equivalent web catalogue and Flutter component gallery.

## Acceptance criteria

- Components render correctly in LTR and RTL, light/dark, narrow/wide, 200% web zoom, and large mobile text.
- Directional icons mirror correctly; logo/gavel/photos/media controls/numerals do not.
- Bid states include text/icon semantics and pass automated contrast checks.
- Keyboard focus, screen-reader names, reduced motion, and minimum target sizes are tested.
- AED values use integer-fils formatting and bidi isolation.
- Token drift between CSS/TypeScript/Dart is generated and CI-detected.

## Validation

Run package unit tests, visual regression tests for the state matrix, automated accessibility checks, Flutter widget tests, and token-generation drift checks. Record exact commands in the handoff.

## Out of scope

No completed product screen or live data connection.
