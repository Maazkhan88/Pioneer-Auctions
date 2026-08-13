# Task 005 — Next.js buyer loop

Recommended owner: Antigravity

Status: Buyer discovery/detail preview slice continued on `agent/task-007-admin-core` on 2026-08-12. Public dummy lot endpoint, Cloudflare preview API, web data adapter, static fallback, homepage lot links, local watch interaction, lot-detail pages, tests, and Cloudflare preview deployment are implemented. The real buyer bid action state machine (session/test-account adapter, eligibility/deposit/terms gate states, client `commandId` generation, `POST /api/v1/lots/:lotId/bids` wiring, idle/confirming/pending-unknown/accepted/rejected/outbid/closed states) was added on 2026-08-12 -- see "Bid action state machine" below. It builds, typechecks, lints, and passes unit tests, but has **not** been exercised against a real running NestJS+PostgreSQL API: the currently deployed Cloudflare public preview API (`apps/api/worker/public-preview.ts`, DEC-018) only serves `GET /api/v1/lots` and has no bidding routes, so the new code has only been verified via unit tests with a stubbed `fetch`, not an end-to-end live request. Socket.IO wiring (the other half of Task 005's "REST/Socket.IO acknowledgement handling") is still not started.

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

## Bid action state machine (added 2026-08-12)

- `apps/web/lib/bid-session.ts` -- server-only session/test-account adapter. `getBuyerBidSessionConfig()` reads `PIONEER_PUBLIC_API_BASE_URL`, `PIONEER_PUBLIC_TEST_ACCOUNT_ID` (new env var, mirrors `apps/admin`'s `PIONEER_ADMIN_TEST_ACCOUNT_ID`), and `PIONEER_PUBLIC_TERMS_VERSION_ID` (new env var; there is no `POST /lots/:lotId/terms-acceptances` or `GET /auctions/:auctionId` implementation yet to source a real terms version from, so this is an operator-configured placeholder pending Task 008). Returns `null` (no session) if any are unset, in which case the bid panel shows the pre-existing disabled "Connect account to bid" state unchanged. `apps/web/app/[locale]/lots/[lotId]/page.tsx` resolves this once per request (server component) and passes it as a prop into `BidPanelShell`.
- `apps/web/lib/bid-command.ts` -- pure, framework-independent state machine and network functions (fully unit-testable, see `apps/web/test/bid-command.spec.ts`, 13 tests):
  - `BidPanelState` union covers `idle`, `confirming`, `pending` (carries an `unknown: boolean` flag distinguishing "sent, awaiting ack" from "sent, no ack yet, safe to retry with the same command"), `accepted`, `outbid`, `rejected`, `gated` (eligibility/deposit/terms reasons), `closed`.
  - `fetchAuthoritativeLotState()` re-fetches `GET /api/v1/lots` (the same endpoint `home-data.ts` uses -- there is no `GET /lots/:lotId` or `GET /lots/:lotId/snapshot` REST route implemented in `apps/api` yet, only the Socket.IO `lot:subscribe`/`lot:sync` snapshot) and extracts the matching lot's live `currentBid`/`nextMinimumBid`/`lifecycle`/`closesAt` right before a bid is prepared, rather than trusting the static/possibly-stale preview display strings already on the page.
  - `submitPlaceBidCommand()` POSTs to `/api/v1/lots/:lotId/bids` with `Idempotency-Key` set to a client-generated `crypto.randomUUID()` (persisted across retries of the same logical attempt) and `x-pioneer-test-account-id`/`x-correlation-id` headers, matching `apps/admin/lib/admin-actions.ts`'s existing pattern. A network failure or unparseable body returns `{ outcome: "unknown" }` (never treated as rejection, per `docs/api-contracts.md` §8 and §14); a parsed `ACCEPTED`/`REJECTED` ack is classified into the corresponding panel state via `classifyRejectionStatus()`.
  - `expectedSequence` is sent as `0` in the absence of any REST source for the real value; confirmed against `apps/api/src/bidding/bid-decision.ts` that `evaluateManualBid` never reads it (it is not a hard accept/reject gate server-side today).
- `apps/web/components/bid-panel-shell.tsx` -- rewritten to wire the above into the existing shell markup: quick/custom amount selection (unchanged), an inline confirm step with a required terms checkbox (the "terms gate"), the existing single ARIA live region (`role="status" aria-live="polite"`) updated per state with a tone class (`is-success`/`is-danger`/`is-warning`/`is-idle`) that reinforces but never replaces the text content, and state-appropriate action buttons ("Retry" for unknown-pending, "Place another bid" for terminal states). No new modal/layout was introduced.
- New CSS in `apps/web/app/styles.css`: `.m3-live-bid-status.is-success/.is-danger/.is-warning` tone variants and a `.m3-bid-confirm` block, reusing existing design tokens (`--m3-green-600`, `--m3-red-600`, `--m3-surface-2`, `--m3-border`).
- `apps/web/next.config.ts`: added `@pioneer/contracts` to `transpilePackages` (did not, by itself, fix the Turbopack bundling issue below, but is still a correct config fix worth keeping).
- **Known gap, not fixed in this pass**: `apps/web` cannot bundle any *runtime* value import from `@pioneer/contracts` through `next build` (Turbopack fails with "module has no exports"); see `docs/decisions-log.md` DEC-019. Worked around by defining a local `BidCommandAck` type + manual runtime parser in `bid-command.ts` (hand-verified against `apps/api/src/bidding/bid.dto.ts`'s real `PlaceBidAck` shape) and a local AED formatter in `bid-panel-shell.tsx`, instead of importing `BidCommandAckSchema`/`formatMoney`.
- **Not yet done**: no live end-to-end verification against a real NestJS+PostgreSQL backend (none is reachable from this environment); a dedicated single-lot/snapshot REST endpoint (would remove the need to re-fetch the whole public lot list before every bid attempt -- the socket path already gets a real snapshot via `lot:subscribe`, this REST gap is specifically about `beginBidAttempt`'s fresh-price check, which still always goes over REST); component/Playwright-level tests (only pure-function Vitest tests exist, matching the pre-existing `apps/web` test convention -- no React Testing Library or Playwright is installed in this repo yet); distinguishing `DEPOSIT_REQUIRED`'s three bundled real causes (inactive account / unverified KYC / insufficient deposit -- `apps/api/src/bidding/bid-decision.ts` returns one error code for all three today).

## Socket.IO wiring (added 2026-08-12)

- `apps/web/lib/lot-socket.ts` -- `LotSocketClient`, a per-lot-page realtime connection to namespace `/auctions/v1` (matches `docs/api-contracts.md` §6 and `apps/api/src/bidding/bidding.gateway.ts` exactly, including the `handshake.auth.testAccountId` auth mechanism, not the documented-but-unimplemented `Authorization: Bearer` scheme -- same drift already noted for REST). Connects with `socket.io-client@4.8.1`, pinned to match the server's `socket.io@4.8.1`. On every `connect` (including reconnects), automatically re-subscribes via `lot:subscribe` with `afterSequence` set to the last applied sequence, implementing the §14 reconnect algorithm without the caller needing to detect reconnects itself.
  - `classifySequence(lastAppliedSequence, incomingSequence)` -- pure function implementing §9's "apply only sequence + 1; equal/older are duplicates; anything else is a gap" rule. A detected gap triggers `handlers.onGapDetected` and an automatic `lot:sync` re-sync from the last known sequence, never a silent skip.
  - `placeBid()` -- submits `bid:place` over the live socket with a client-generated `commandId`, wrapped in a Promise with an 8-second ack timeout that resolves `{ outcome: "unknown" }` rather than rejecting or hanging, matching the REST path's "timeout is unknown, not rejected" semantics. Resolves `{ outcome: "not-connected" }` immediately (no timeout) if the socket isn't currently connected, so the caller can fall back to REST without waiting.
  - Like `bid-command.ts`, event/command payload shapes are hand-written local mirrors of `packages/contracts/src/{events,commands,core}.ts` rather than imported at runtime (DEC-019) -- `Money`/`ErrorCode` remain type-only imports. Unlike the REST bid-acknowledgement parser (which validates every field, since it drives financial state), incoming passive event payloads here are lightly cast, matching the "trust our own backend's shape" convention `home-data.ts` already uses for `GET /api/v1/lots` -- a malformed passive event still fails safe: `classifySequence` treats it as a gap and the client re-syncs from a snapshot rather than applying bad data.
- `apps/web/lib/bid-command.ts` gained `normalizeBidAck()` and the `BidAckLike`/`NormalizedBidOutcome` types so `BidPanelShell` has one ACCEPTED/REJECTED -> `BidPanelState` classification path regardless of whether a given bid command went over the socket or REST, instead of duplicating that logic per transport.
- `apps/web/components/bid-panel-shell.tsx`:
  - Opens one `LotSocketClient` per mount (`useEffect`, disposed on unmount or if `lotId`/`session` change) and uses `bid:accepted`/`lot:snapshot` events to keep the displayed current/next bid live without polling -- falls back to the original static server-rendered strings until the first realtime update arrives.
  - `runSubmit()` now tries the socket first when connected (per `docs/api-contracts.md` §4: "Socket commands are preferred while connected"), falling back to the existing REST `submitPlaceBidCommand` when there's no connection or the socket ack times out -- so a bid attempt is never stranded by a flaky/absent realtime connection.
  - `beginBidAttempt()`'s pre-bid authoritative-price refresh still always goes over REST (`fetchAuthoritativeLotState`), not the socket's last-known snapshot -- a deliberate scope boundary to keep this change reviewable; using the live snapshot instead is a reasonable follow-up, not done here.
- 9 new tests in `apps/web/test/lot-socket.spec.ts` (`classifySequence` table tests, snapshot application, sequence apply/stale/gap-triggers-resync, `placeBid` connected/not-connected/ack-timeout, and `dispose()` cleanup), using a fake `Socket` object and Vitest's `vi.mock("socket.io-client", ...)` + `vi.mocked(io).mockReturnValue(...)` (not `vi.doMock`, which does not re-mock a module already loaded via a static top-level import in the same file).

## Proxy (maximum) bidding (added 2026-08-13)

Wires `PUT /api/v1/lots/:lotId/proxy-bid` and the socket `proxy-bid:set` event -- Task 005's "proxy setup/status" scope item. Derived directly from a full read of `apps/api/src/bidding/bidding.service.ts`'s `setProxyBid()` (not guessed from `docs/api-contracts.md` alone), so the client matches real server behavior including two things the docs don't spell out: `myBidStatus` on a proxy ACCEPTED ack is `"WINNING" | "OUTBID" | "NOT_BIDDING"` (an extra state manual bids don't have -- the maximum was saved but no new visible bid was needed, e.g. the account was already leading outright), and `currentBid` in that result is nullable (no bids may exist on the lot yet).

- `apps/web/lib/proxy-bid-command.ts` (new) -- deliberately a separate module from `bid-command.ts` rather than folded into the same `BidPanelState` union: proxy is a genuinely different server command (different endpoint, different DTO, `activeProxyMaximum`/nullable `currentBid` fields manual bids don't have), even though it shares the same eligibility/lifecycle/terms validation shape -- `classifyRejectionStatus`/`isBidGateReason`/`BidLatestSnapshot` are imported and reused from `bid-command.ts`, not duplicated. Exposes `ProxyBidPanelState` (idle/confirming/pending-unknown/accepted/outbid/**not-bidding**/rejected/gated/closed -- one more state than manual bids), `parseProxyBidCommandAck`/`submitSetProxyBidCommand` (REST), and `normalizeProxyAck`/`ProxyAckLike` (mirrors `bid-command.ts`'s `normalizeBidAck`/`BidAckLike` so REST and socket proxy acks classify through one code path). MVP rule enforced server-side, not re-validated client-side (`docs/decisions-log.md` DEC-017): an active proxy maximum may only be created or *raised*, never lowered/cancelled while live; `PROXY_MAX_TOO_LOW` covers both cases and is treated as a plain `rejected` state (not `gated` -- it's a validation failure, not an eligibility gate).
- `apps/web/lib/lot-socket.ts` gained `LotSocketClient.setProxyBid()` (mirrors `placeBid()` exactly: same 8s ack-timeout-to-"unknown" semantics, same `not-connected`/`unknown`/`ack` outcome shape) and `ProxyBidCommandSocketAck` + its parser.
- `apps/web/components/bid-panel-shell.tsx`: added a third "Max bid" mode alongside quick/custom bid, with its own `proxyState`/`proxyAmountText`/`proxyAttemptRef` -- a fully separate state machine from the manual-bid one, since a user does one or the other, not both at once. The mode-selector row and both confirm panels are only shown while **both** state machines are idle/closed (`bothIdle`), so the UI can never show two conflicting in-flight attempts. Shares the session/socket connection, the terms-acceptance checkbox, and the live current/next bid display already built for manual bids -- no new connection or session logic needed.
- 13 new tests: `apps/web/test/proxy-bid-command.spec.ts` (ack parsing incl. the null-`currentBid`/`NOT_BIDDING` cases, `normalizeProxyAck`, REST submission headers/body), plus 2 more in `apps/web/test/lot-socket.spec.ts` for `setProxyBid` (not-connected, and a full ACCEPTED/`NOT_BIDDING` round trip).

## Remaining UI shells: search/filter, category browse, calendar, SEO metadata, Arabic `<html>` fix (added 2026-08-13)

Closes several of the "Home, category, search/filter, auction calendar/list... SSR/indexable public lot metadata... Arabic RTL" scope items still open after the bidding work above. `GET /categories` and `GET /auctions` from `docs/api-contracts.md` are not implemented anywhere in `apps/api/src` (confirmed by grepping every `@Controller`) -- only `PublicLotsController`'s flat `GET /api/v1/lots` exists -- so search/filter/category and the calendar page are built by filtering/grouping that one real endpoint's data client-side rather than inventing new server contracts.

- **Fixed a real, previously-broken bug**: the category chip labels (`Messages.categories`: "Cars"/"Equipment"/"Real Estate"/"Marine") never matched the actual category values `apps/web/lib/home-data.ts::categoryFor()` assigned to lots ("Automotive"/"Real estate"/"Heavy equipment") -- clicking any chip could never have matched a single lot. Aligned `categoryFor()` and `staticFallback()`'s hardcoded lot categories to the same vocabulary as the chip labels.
- `apps/web/components/lot-browser.tsx` (new, client component) -- extracted the search input, category chip row, and lot grid out of `apps/web/app/[locale]/page.tsx` into their own component with real `useState`/`useMemo`-driven filtering (matches on title/lot number/category substring; category chips filter by exact match, "All" clears the filter). `LotCard` moved here too since it's only used in this filtered grid. Added a `noResults` empty-state message (EN/AR) and an `.m3-empty-state` style. Also replaced a hardcoded `.m3-chip-row button:first-child` CSS rule (which faked the "All" chip always looking selected) with a real `.is-selected` class rule driven by actual state.
- `apps/web/lib/calendar-data.ts` + `apps/web/app/[locale]/calendar/page.tsx` (new route) -- a real auction calendar grouping live/upcoming lots by their actual `closesAt` date (not a static shell): fetches the same public lots endpoint `home-data.ts` uses (kept as a separate small loader rather than widening `PreviewLot`, which discards the raw ISO date after formatting it into a countdown label), groups by UTC calendar day via a pure `groupByClosingDate()` function, and renders each day's lots linking to their detail pages. Wired the previously-defined-but-unused `navCalendar` nav link to this route. 8 new tests in `apps/web/test/calendar-data.spec.ts`.
- `generateMetadata` added to the homepage, lot detail page, and calendar page (`title`, `description`, Open Graph, Twitter card, `alternates.languages` for EN/AR cross-linking) -- the "SSR/indexable public lot metadata" scope item. Lot detail metadata is per-lot (title includes the lot number, description pulled from the real lot data).
- **Found and fixed a real Arabic/RTL bug while browser-verifying this work**: `<html lang="en">` was hardcoded in the root `app/layout.tsx` regardless of locale -- confirmed live in a browser that `document.documentElement.lang`/`dir` stayed `"en"`/empty on `/ar` pages even though the inner `<main dir="rtl" lang="ar">` was correct. Screen readers and search engines key off `<html lang>`/`<html dir>` specifically, so the inner-only attribute wasn't sufficient. Next.js App Router requires the single `<html>` element in the top-level `app/layout.tsx`, which sits above the `[locale]` segment and has no access to `params.locale`, and restructuring that (there's a separate non-locale `app/page.tsx` redirect using the same root layout) was judged too large/risky for this pass. Fixed pragmatically with `apps/web/components/html-attributes-sync.tsx`, a client component that syncs `document.documentElement.lang`/`dir` on mount/locale-change from inside `[locale]/layout.tsx`. Re-verified live in the browser after the fix: `/ar` now reports `lang="ar"`/`dir="rtl"`, `/en` reports `lang="en"`/`dir="ltr"`.
- **This round was verified in an actual running browser, not just build/test/typecheck**, per the "test UI changes in a browser" requirement: started the dev server, clicked the "Cars" category chip and confirmed the grid correctly narrowed to the one Cars-tagged lot, loaded `/en/calendar` and confirmed lots grouped under real dates ("Thursday, 27 August" / "Saturday, 29 August") with the right lots under each, checked `document.documentElement.lang`/`dir` directly via injected JS on both locales, and reloaded the lot detail page to confirm no regressions to the bid panel. (Caught one operational hazard doing this: running `next build` -- which does `rm -rf .next` first -- while a `next dev` process on the same directory was still running corrupted the dev server's cache and produced misleading 500s; documented so a future agent doesn't lose time on the same thing -- don't run `build` and `dev` concurrently against the same `.next` directory.)

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

Bid action state machine validation on 2026-08-12:

- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web test` passed 5 files / 19 tests (13 new in `test/bid-command.spec.ts`).
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files after running `prettier --write` to fix initial formatting.
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack) passed after removing the runtime `@pioneer/contracts` import (see DEC-019) -- generated all 13 static routes including the 6 EN/AR lot-detail pages.
- Not run: the Cloudflare-flavored `build:cloudflare` variant, a live `wrangler deploy`, or any request against a real (non-preview-Worker) NestJS API -- none is reachable from this environment, and redeploying the static preview was not requested for this change.

Socket.IO wiring validation on 2026-08-12:

- `corepack pnpm install --filter @pioneer/web` added `socket.io-client@4.8.1` (pinned to match `apps/api`'s `socket.io@4.8.1`).
- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web test` passed 6 files / 29 tests (9 new in `test/lot-socket.spec.ts`).
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after one `prettier --write` pass).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed, generating all 13 static routes -- confirms `socket.io-client` bundles fine (unlike the `@pioneer/contracts` runtime-import issue in DEC-019, which is specific to that workspace package).
- Not run: any request against a real Socket.IO server -- `apps/api`'s `BiddingGateway` was read in full to verify event/command shapes and the auth mechanism match what `LotSocketClient` sends, but no live connection was exercised (same "no reachable NestJS+PostgreSQL instance" limitation as the REST work above).

Proxy bidding validation on 2026-08-13:

- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web test` passed 7 files / 42 tests (13 new: 11 in `test/proxy-bid-command.spec.ts`, 2 more in `test/lot-socket.spec.ts`).
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after one `prettier --write` pass).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed, generating all 13 static routes.
- Not run: any request against a real backend -- same limitation as the manual-bid and Socket.IO work above; `setProxyBid()`'s exact behavior (including the `NOT_BIDDING`/nullable-`currentBid` cases) was derived from a full read of `apps/api/src/bidding/bidding.service.ts`, not exercised live.

UI shells (search/filter, calendar, metadata, Arabic `<html>` fix) validation on 2026-08-13:

- `corepack pnpm --filter @pioneer/web typecheck` passed.
- `corepack pnpm --filter @pioneer/web lint` passed.
- `corepack pnpm --filter @pioneer/web test` passed 8 files / 49 tests (7 new in `test/calendar-data.spec.ts`).
- `corepack pnpm --filter @pioneer/web exec prettier --check` passed on all touched files (after `prettier --write` passes).
- `corepack pnpm --filter @pioneer/web build` (`next build`, Turbopack, clean `.next`) passed, generating 15 static routes (up from 13 -- the new `/en/calendar` and `/ar/calendar`).
- **Verified live in a browser** (`next dev`, not just build output): category chip filtering, calendar-page date grouping with real dates, per-page `<title>` from `generateMetadata` on the homepage/lot-detail/calendar pages, and `document.documentElement.lang`/`dir` on both `/en` and `/ar` after the `HtmlAttributesSync` fix. Full detail above.
- Not verified: a real request against a live NestJS+PostgreSQL `GET /api/v1/lots` (the dev-browser session used the static fallback data throughout, since `PIONEER_PUBLIC_API_BASE_URL` was not set in this environment) -- `loadCalendarLots`'s and `LotBrowser`'s API-backed code paths are only unit-tested with a stubbed `fetch`, not exercised live.

## Out of scope

Seller wizard and full wallet/invoice experience beyond the MVP gate/summary.
