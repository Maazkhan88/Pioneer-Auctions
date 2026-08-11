# 14 — Background Jobs & Automation

Status: Phase 11 complete, drawn from the integrations research pass.

## The `cronjob` module (`application/modules/cronjob/controllers/Cronjob.php` + `models/Cronjob_model.php`)

All methods are plain, directly HTTP-callable CodeIgniter controller actions (`Cronjob` extends `MX_Controller`, not the authenticated base controller) — there is no CLI-only guard, no cron-secret/token check, and no IP allowlist visible in the constructor (`Cronjob.php:5-17` only sets CORS headers and loads models). See [18-security-review.md SEC-010](18-security-review.md).

| Method | Trigger/frequency | Action | Failure/retry behaviour |
|---|---|---|---|
| `index()` | Ad hoc | Prints current DB timestamp — a health-check/no-op, not a real job | N/A |
| `sale_out_email($item_id, $buyer_id)` | Explicitly routed (`sale-out-email/$1/$2`), presumably called once per sale event | Sends "item sold" email + SMS (via SendSmart) to buyer and to the contact-us address | No visible retry/idempotency guard — repeated calls would resend |
| `auto_sale_auction_items()` | Presumed periodic (mechanism unconfirmed, see below) | Iterates online/closed auctions past expiry; resolves each lot to sold/approval/not_sold per [05-auction-lifecycle.md](05-auction-lifecycle.md) | No transaction (SEC-025); a partial failure mid-loop leaves some lots resolved and others not, with no resumption logic beyond re-running the whole method |
| `paytabsVoidTransaction()` | Intended as a PayTabs void/refund webhook handler | **Dead code** — logs the raw POST body to `./uploads/newfile.txt` then calls `die()` before any of the actual refund/void logic executes | N/A — non-functional |
| `broadcast_pusher_without_image($item_id, $auction_id)` | Called from bid flows | Pushes a reduced Pusher payload (no image data) for the item | — |
| `broadcast_pusher($item_id, $auction_id)` | Called from bid flows | Full Pusher broadcast for an item's current state | — |
| `broadcast_pusher_low_load($item_id, $auction_id)` | Called from bid flows | A further-reduced payload variant, presumably for high-frequency/low-bandwidth situations | — |
| `sendPushNotification($to, $data)` | Called from various triggers | Sends an FCM push via the legacy HTTP API (hardcoded server key) — a duplicate implementation of the same logic found independently in `Getapi.php` and `Fcm.php` | — |

## How is this actually scheduled?

**UNKNOWN — REQUIRES BUSINESS/INFRA CONFIRMATION.** No OS-level crontab file, `systemd` timer, or scheduler configuration exists anywhere in this repository export. `appspec.yml` (AWS CodeDeploy) only defines a `BeforeInstall` hook running an external `/var/www/html/deploy.sh` (not present in this export) — no cron reference. `deploy.php` (web root) is an unrelated, unauthenticated `git pull` trigger (see [18-security-review.md SEC-001](18-security-review.md)), also not a scheduler.

The most likely real-world explanation is an OS-level cron entry or a third-party uptime/ping/scheduler service configured directly on the production server, hitting these controller URLs on a timer — but nothing evidencing that is committed to source control. This means:

1. The actual cadence of lot resolution (`auto_sale_auction_items`) cannot be confirmed from code — a lot could close its bidding window and sit unresolved for anywhere from seconds to hours depending on how frequently (if at all) this is actually invoked.
2. Because nothing in the controller gates these methods to only the scheduler, anyone who discovers the URLs can invoke auction-resolution or notification logic on demand, independent of the intended schedule (SEC-010).

## Other background/automation-adjacent behaviour noted elsewhere in the review

- **OTP/SMS rate-limiting table exists but is minimal**: `sms_history` (`ip_address`, `created_on` only — no message content) is referenced purely for basic OTP/SMS throttling by IP, separate from any cron mechanism.
- **No image-processing, export/report-generation, or cleanup jobs were identified** as background/scheduled processes in either research pass — reporting (`reports` module) and PDF/print export (`export_pdf.js`, `printThis.js`) appear to be synchronous, on-demand, user-triggered actions rather than background jobs.
- **No reconciliation job** was found that would detect/repair the non-transactional inconsistencies flagged in [18-security-review.md SEC-025](18-security-review.md) (e.g. a lot whose `sold_items` row exists but whose `item.sold`/`auction_items.sold_status` flags weren't updated due to a mid-sequence failure) — if such drift occurs, nothing in the codebase appears to detect or fix it automatically.
