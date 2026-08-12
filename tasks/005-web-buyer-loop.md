# Task 005 — Next.js buyer loop

Recommended owner: Antigravity

Status: Buyer discovery/detail preview slice continued on `agent/task-007-admin-core` on 2026-08-12. Public dummy lot endpoint, Cloudflare preview API, web data adapter, static fallback, homepage lot links, local watch interaction, lot-detail pages, bid panel shell, tests, and Cloudflare preview deployment are implemented; full authenticated live buyer bidding loop remains pending.

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
- A Cloudflare public preview API serves dummy lot cards at `https://pioneer-auctions-api.maaz-n-khan.workers.dev/api/v1/lots`. This is not the full NestJS runtime; it exists so the remote/mobile preview can consume backend-shaped public lot data immediately.
- Buyer lot cards link to statically exported detail pages for each dummy lot in English and Arabic.
- Lot detail pages show gallery placeholder, reserve/lifecycle context, specs, documents, fee lines, a local watch button, and a disabled bid panel shell aligned to `POST /api/v1/lots/:lotId/bids`.
- The watch button stores preview state locally in `localStorage`; it is not yet account-backed.

## Acceptance criteria

- A keyboard-only or screen-reader user can inspect totals and bid without losing status feedback.
- Timeout is presented as unknown and reconciled; UI never says failed merely because acknowledgement timed out.
- Event duplicates are ignored; gaps pause incrementals and sync; snapshots recover after reconnect/background.
- The bid panel never calculates authoritative acceptance, winner, reserve, or close time locally.
- Playwright buyer journeys pass in English/Arabic at mobile/desktop sizes.
- Core Web Vitals targets and error/empty/loading/offline states are measured.

## Validation

Run unit/component, Playwright, accessibility, visual regression, production build, and a two-browser live bidding scenario against the integration API.

Current preview-slice validation on 2026-08-12:

- `corepack pnpm --filter @pioneer/api exec vitest run test/public-preview-worker.spec.ts` passed.
- `corepack pnpm --filter @pioneer/api typecheck` passed.
- `corepack pnpm --filter @pioneer/api lint` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `PIONEER_PUBLIC_API_BASE_URL=https://pioneer-auctions-api.maaz-n-khan.workers.dev CLOUDFLARE_PAGES=true corepack pnpm --filter @pioneer/web build:cloudflare` passed.
- `corepack pnpm exec wrangler deploy --config apps/api/wrangler.jsonc` deployed API version `b600d143-3167-4404-9da3-e840065dbfdf`.
- `corepack pnpm exec wrangler deploy --config apps/web/wrangler.jsonc` deployed web version `255a115a-9cdc-4f51-90d9-3ddc49f670b4`.
- Remote URL checks returned HTTP 200 for `/en`, the preview API `/api/v1/lots`, and `/en/lots/11111111-1111-4111-8111-111111111111`.

## Out of scope

Seller wizard and full wallet/invoice experience beyond the MVP gate/summary.
