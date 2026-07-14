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

## Validation

Run template snapshot tests, dedupe/replay tests, scheduler time-travel tests, deep-link integration tests, preferences matrix, and development-provider end-to-end flow.
