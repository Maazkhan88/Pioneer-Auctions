# Task 010 — Transactional notifications and preferences

Recommended owner: Codex

## Goal

Implement durable, localized, preference-aware bid and auction communications across in-app, push, and email without leaking private data or spamming duplicate events.

## Prerequisites

- Task 002 event contracts complete.
- Notification preference/legal defaults reviewed; marketing remains separately opt-in.

## Scope

- Notification intent/outbox, template versioning, delivery attempts, dedupe keys, receipts, and retry/dead-letter handling.
- FCM/APNs adapter (direct or via approved OneSignal strategy), email adapter, and development sinks.
- English/Arabic templates for bid confirmation, outbid, proxy max exceeded, ending soon, extension, winner pending approval, approved, lost, offer decision, deposit/refund, listing decision, and upcoming auction.
- In-app grouped notification feed with deep links.
- User preferences by category/channel, quiet hours, and time-critical exception policy.
- Scheduled 30-minute/5-minute/24-hour/1-hour reminders with cancellation/rescheduling after soft-close changes.

## Acceptance criteria

- One domain event produces at most one intended notification per user/channel/template version/dedupe key.
- Replayed outbox events are safe; delivery retries are observable.
- Outbid/extension payloads deep-link to the correct lot and contain no proxy maximum unless it is the recipient's private max-exceeded message.
- Arabic copy/layout is reviewed and bidi-safe; lock-screen copy minimizes sensitive financial detail as policy requires.
- Marketing cannot be enabled by transactional consent and respects opt-out.
- Ending reminders do not fire after a lot closes/cancels and adjust to extensions according to product policy.

## Status: Completed (Android-first & Web parity; iOS native runner deferred per DEC-024)

- **Owner**: Antigravity
- **Branch**: `agent/task-010-notifications`
- **Decisions**: [DEC-025](file:///E:/Pioneer%20Dev/pioneer-auctions-product-ux-technical-rebuild/docs/decisions-log.md#dec-025-integer-fils-preservation-and-round-half-up-uae-auction-fee-arithmetic-remediation-dec-020), [DEC-028](file:///E:/Pioneer%20Dev/pioneer-auctions-product-ux-technical-rebuild/docs/decisions-log.md#dec-028-multi-channel-notification-dispatch-idempotent-outbox-delivery-bilingual-bidi-templates-and-quiet-hours-policy)
- **Contracts**: [API Contracts Section 5d](file:///E:/Pioneer%20Dev/pioneer-auctions-product-ux-technical-rebuild/docs/api-contracts.md#5d-transactional-notifications-and-preferences)

## Delivered Components

### 1. Database & Schema Migration
- Migration `0005_notifications_and_preferences.sql`:
  - `notifications`: In-app notification feed with `(account_id, dedupe_key)` unique constraint.
  - `notification_intents`: Multi-channel intent tracker (`channel IN ('IN_APP', 'PUSH', 'EMAIL', 'SMS')`) with `(account_id, channel, dedupe_key)` deduplication and retry tracking.
  - `user_notification_preferences`: Channel and category flags, quiet hours (`Asia/Dubai` timezone).
  - `device_tokens`: Push device registration supporting Android, iOS, and Web.

### 2. Backend & Contract Boundary
- `TemplateEngineService`: Bilingual templates (EN/AR) for all 11 notification event types with pure integer fils formatting ([DEC-025](file:///E:/Pioneer%20Dev/pioneer-auctions-product-ux-technical-rebuild/docs/decisions-log.md#dec-025-integer-fils-preservation-and-round-half-up-uae-auction-fee-arithmetic-remediation-dec-020)), Unicode BiDi LTR isolation (`\u2066...\u2069`), and lock-screen privacy masking.
- `NotificationsService`: Multi-channel dispatch, quiet hours suppression with time-critical live bidding bypass (`OUTBID`, `PROXY_EXCEEDED`, `WINNER_PENDING_APPROVAL`, `AUCTION_EXTENDED`), and outbox publishing (`notification:created` to `user:{accountId}` room).
- `AuctionReminderScheduler`: Scheduled auction ending milestone notifications (24h, 1h, 30m, 5m) with anti-sniping extension re-evaluation.
- REST Controllers:
  - `GET /api/v1/me/notifications`: Paginated in-app feed with unread count.
  - `POST /api/v1/me/notifications/:id/read`: Mark individual notification as read.
  - `POST /api/v1/me/notifications/read-all`: Mark all notifications as read.
  - `GET /api/v1/me/notification-preferences`: Retrieve notification channel & category preferences.
  - `PATCH /api/v1/me/notification-preferences`: Idempotent partial update for preferences with strict time validation.
  - `POST /api/v1/me/device-tokens`: Register FCM/APNs push token.
  - `DELETE /api/v1/me/device-tokens/:token`: Unregister device push token.

### 3. Mobile UI (Flutter)
- `NotificationCenterScreen` (`/notifications`):
  - Material 3 Expressive UI with date-grouped sections ("Today", "Yesterday", "Earlier").
  - Category filter chips ("All", "Bids", "Deposits", "Reminders").
  - Unread indicators, tap-to-read with deep link routing (`/lot/:lotId`, `/account/deposits`).
  - "Mark all as read" app bar action with toast feedback.
  - Empty state with informative guidance.
  - Pull-to-refresh (`RefreshIndicator`).
- `NotificationPreferencesScreen` (`/account/notifications`):
  - Delivery channel switches (Push, Email, SMS).
  - Alert category switches (Outbid Alerts, Ending Soon Milestones, Deposits & Refunds, Marketing & Announcements).
  - Quiet hours toggle with Dubai time pickers and time-critical bypass advisory card.
- App Navigation:
  - Header notification bell with badge counter wired to `/notifications`.
  - Account dashboard list items wired to `/notifications` and `/account/notifications`.
  - Deep-link alias `/lot/:id` redirected to `/lots/:id`.

## Validation Evidence
- **Contracts Test**: `corepack pnpm --filter @pioneer/contracts test` (15/15 passed).
- **Backend Tests**: `corepack pnpm --filter @pioneer/api test` (20/20 files passed, 130 tests passed).
- **Typecheck & Lint**: Zero TypeScript errors (`tsc --noEmit`), zero ESLint errors.
- **Mobile Tests**: `flutter test` (77/77 passed), `flutter analyze` (0 issues).

