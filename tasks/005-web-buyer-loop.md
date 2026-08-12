# Task 005 — Next.js buyer loop

Recommended owner: Antigravity

Status: Initial buyer-homepage backend-data slice started on `agent/task-007-admin-core` on 2026-08-12. Public dummy lot endpoint, web data adapter, static fallback, tests, and Cloudflare preview deployment are implemented; full buyer bidding loop remains pending.

## Goal

Deliver the complete English/Arabic web journey from discovery through a trustworthy live bid and post-close state.

## Prerequisites

- Tasks 002–004 complete for contracts/live behavior.
- Task 003 auction components available.
- Identity/deposit work may be mocked through contract adapters until Tasks 008–009 merge.

## Scope

- Home, category, search/filter, auction calendar/list, lot detail, watchlist, and my-bids shells.
- SSR/indexable public lot metadata and accessible responsive media gallery.
- Authenticated lot subscription, snapshot/reconnect/gap recovery, server-time countdown, reserve and soft-close UI.
- Terms acknowledgement, eligibility gating, fee confirmation, manual/custom bid, proxy setup/status, and retry-same-command behavior.
- Explicit command states: preparing, pending/unknown, accepted, rejected with latest price, outbid, extended, closed, pending approval, approved/rejected.
- Arabic RTL, localized SEO metadata, bidi-safe identifiers/money, dark/light, reduced motion.
- Analytics events that contain no proxy maximum or sensitive KYC/payment information.

## Current implementation notes

- Added public `GET /api/v1/lots` for sanitized lot-card data.
- The endpoint can serve the current backend dummy lots when `PIONEER_ADMIN_DUMMY_LOTS=1` is enabled.
- Public response omits reserve price, increment policy internals, proxy maxima, bidder identity, KYC data, and admin metadata.
- Buyer homepage uses `loadBuyerHomeData` to fetch `PIONEER_PUBLIC_API_BASE_URL/api/v1/lots` when configured.
- Cloudflare static preview uses the same three dummy lot cards as fallback so the homepage shows demo lots without a deployed API.

## Acceptance criteria

- A keyboard-only or screen-reader user can inspect totals and bid without losing status feedback.
- Timeout is presented as unknown and reconciled; UI never says failed merely because acknowledgement timed out.
- Event duplicates are ignored; gaps pause incrementals and sync; snapshots recover after reconnect/background.
- The bid panel never calculates authoritative acceptance, winner, reserve, or close time locally.
- Playwright buyer journeys pass in English/Arabic at mobile/desktop sizes.
- Core Web Vitals targets and error/empty/loading/offline states are measured.

## Validation

Run unit/component, Playwright, accessibility, visual regression, production build, and a two-browser live bidding scenario against the integration API.

## Out of scope

Seller wizard and full wallet/invoice experience beyond the MVP gate/summary.
