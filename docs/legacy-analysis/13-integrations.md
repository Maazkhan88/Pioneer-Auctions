# 13 — Third-Party Integrations

Status: Phase 12 complete, drawn from the integrations research pass. Security implications of hardcoded credentials are consolidated in [18-security-review.md SEC-022](18-security-review.md) rather than repeated per-integration below.

## Email

Two config files exist: `application/config/email.php` (**live** — Hostgator SMTP, `smtp_host = gator3220.hostgator.com`, sender `noreply@pioneerauctions.info`, port 465/SSL) and `application/config/email_old.php` (**dead** — Mailgun SMTP, `smtp_host = smtp.mailgun.org`, sender `postmaster@mg.pioneerauctions.ae`, port 587/TLS; confirmed unreferenced anywhere in the codebase by name). CI3's loader auto-discovers `email.php` by filename whenever any module calls `$this->load->library('email')` without an explicit config array — which is how the majority of call sites work. Two modules do explicitly `$this->config->load('email')` (`email/models/Email_model.php`, `email/controllers/Email_controller.php`). `settings/controllers/Settings.php::htmlmail()` loads the email library with obvious placeholder/demo config — leftover boilerplate, not a real path.

Triggers: registration/OTP email, sale-out notification (`cronjob/Cronjob::sale_out_email()`), deposit-required/void-transaction emails (the latter dead — see [14-background-jobs.md](14-background-jobs.md), `paytabsVoidTransaction()`).

**Note**: both config files' domains (`pioneerauctions.info` vs `pioneerauctions.ae`) differ from each other and from the mobile app's apparent production domain (`pioneerauctions.ae`, commented out in `ApiConfig.dart` — see [18-security-review.md SEC-028](18-security-review.md)) — worth reconciling with the business which domains are actually current.

## SMS/OTP delivery

Two independent, live SMS gateways are wired in — not a stub that merely stores an OTP without delivery:

- **SendSmart** (`application/libraries/SendSmart.php`) — calls `https://meapi.goinfinito.me/unified/v2/send`, currently the dominant path (used by `resendOtp()`, `registerUser()`, `sale_out_email()`). SSL certificate verification is explicitly disabled in this library's HTTP call. A `SendSmart_old.php` also exists (unconfirmed usage — appears superseded).
- **Unifonic** (`application/libraries/TestUnifonic.php` wrapping a vendored `application/libraries/Unifonic/` SDK) — used by the older `sendotp()`/`resendCode()` functions. Note the "Test" prefix on the wrapper class name despite apparently being loaded in production code paths (`Getapi.php` constructor).

Both providers' credentials are hardcoded in plaintext (see SEC-022).

## PayTabs (payment gateway)

Two parallel implementations with **materially different security postures**:

- **Newer, mobile/API path** (`getapi/Getapi.php::cradit_card()`/`paytabsReturnURL()`, library `Paytabs2.php`) — builds a payment request with a hardcoded profile ID and server key, POSTs to `https://secure.paytabs.com/payment/request`. The return-URL handler trusts the client-posted `respStatus` field directly with **no server-side verification call back to PayTabs**, despite the library having unused `verify_payment()`/`authenticationPay()` methods. See [18-security-review.md SEC-023](18-security-review.md) for full severity.
- **Older web path** (`customer/Customer.php::return_paytab()`, library `Paytabs.php`) — **does** call `verify_payment()` server-side and checks the response code before approving a deposit. This is the correct pattern; the newer path regressed from it.
- `cronjob/Cronjob::paytabsVoidTransaction()` (intended void/refund webhook handler) is dead code — logs to a file and `die()`s before any real logic runs.

## Firebase Cloud Messaging (push notifications)

Real push sending happens through a `sendPushNotification()` method duplicated across four locations (`getapi/Getapi.php`, `auction/Auction.php`, `auction/OnlineAuction.php`, `cronjob/Cronjob.php`) plus a shared `application/libraries/Fcm.php`, all POSTing to the **legacy** FCM HTTP API (`fcm.googleapis.com/fcm/send`) with a hardcoded server key duplicated in all four files (SEC-022). The dedicated `getapi/controllers/Fcm.php::sendPushNotification()` "test" endpoint is non-functional — its actual `curl_exec()` call is commented out.

Trigger points (private helper methods in `Getapi.php`, ~line 16546+): registration, outbid notification (fired from the live-bidding flow), item-rejected, auction-going-live, live-hall-started, item-expiring-soon, deposit-received, auction-won, plus a generic custom-message sender.

Web push: `firebase-messaging-sw.js` at the web root carries a client-exposed (by design) Firebase Web `apiKey`/`messagingSenderId`.

## Pusher Channels (realtime)

Credentials hardcoded in `application/config/custom.php` (SEC-022). `getapi/Getapi.php` instantiates the Pusher client inline at six separate call sites rather than through a shared wrapper. **All bidding-related broadcasts use a single global channel, `ci_pusher`** — not per-item or per-auction channels — with two event names (`my-event` for online/auto-bid flows, `live-event` for live-hall bidding). Every connected client subscribes to the same firehose channel regardless of which lot/auction they're actually viewing; client-side filtering (not reviewed in this pass) would be responsible for ignoring irrelevant events. This is a scalability and payload-noise concern more than a security one, but worth flagging for any future rebuild.

The route literally named `broadcast_pusher($item_id, $auction_id)` does **not** itself call `->trigger()` — it only returns a JSON snapshot; the actual `trigger()` calls happen inline within the bid-submission logic elsewhere in the same controller. The name is misleading relative to its actual behavior.

## Instagram

Vestigial. `application/config/instagram_api.php` and `application/libraries/Instagram_api.php` exist but are never loaded/instantiated anywhere in `application/modules` (confirmed by exhaustive grep). The configured callback URL points to an unrelated placeholder domain (`pa.yourvteams.com`), confirming this was boilerplate from a project template that was never adapted or removed. The only live "Instagram" surface is a plain CMS text field for a social-media profile URL, unrelated to the API.

## Social login (Google / Facebook / Apple)

No server-side SDK or verification HTTP call exists for any of the three providers (no vendored SDK, no `vendor/` directory at all in this export). Full trust-boundary detail and severity assessment in [04-users-and-permissions.md §8](04-users-and-permissions.md) and [18-security-review.md SEC-016](18-security-review.md).

## Maps (mobile app)

Of the two declared map dependencies, only `flutter_osm_plugin` (OpenStreetMap) is actually used — a single embedded map on the deposit/payment screen (`lib/Screens/Payments.dart`) showing the auction/pickup location. `flutter_map` is a declared-but-unused dependency (vestigial).

## Google Analytics / Google Ads / Google Tag Manager

Live on the customer-facing website header/footer (`template/views/new/template_user.php`): Universal Analytics tag, a Google Ads conversion tag, and a GTM container, loaded both as async script and `<noscript>` iframe fallback.

## Google reCAPTCHA

Widget markup present client-side across ~36 view files (login, register, header). No server-side `siteverify` call was found in the corresponding controllers — see [18-security-review.md SEC-024](18-security-review.md).

## Memcached

Configured (`application/config/memcached.php`, `127.0.0.1:11211`) but never referenced/loaded anywhere in `application/modules` — vestigial, matching the pattern of several other config-only, never-wired integrations in this codebase (Instagram, `email_old`).

## The two chatbot services — confirmed architecturally disconnected from the main platform

- `pioneer-chatbot-webhook-webhook` connects to its own **MongoDB** instance (via `mongoose`, env-configured), implements real WhatsApp Cloud API webhook verification and message handling (`graph.facebook.com/v17.0/{PHONE_NO_ID}/messages`), and drives a fixed decision-tree of static, canned auction-related response templates — it does **not** query the main platform's item/auction database live.
- `pa-chatbot-admin-samin` (the React ops console) points at `https://chatbotapi.pa.mindzbase.com/whatsapp/api` — a domain unrelated to `pioneerauctions.info`/`.ae`.
- Exhaustive bidirectional grep (chatbot services searched for `pioneerauctions`/`api/v1`/`getapi`; `pioneer-web-main` searched for `mindzbase`/`chatbot`) found **zero cross-references in either direction**.

**Assessment**: these are real, live WhatsApp integrations, but they are a separate side-project/system (different database technology, different backend domain, no shared auth or API) rather than an integrated part of the core auction platform. Whether they are still actively maintained/used by the business is **UNKNOWN — REQUIRES BUSINESS CONFIRMATION**.

## Summary table

| Integration | Status | Notes |
|---|---|---|
| Email (Hostgator SMTP) | Live | `email_old.php` (Mailgun) is dead |
| SMS (SendSmart) | Live, dominant | SSL verification disabled in the HTTP client |
| SMS (Unifonic) | Live, secondary/legacy path | "Test" class name in what looks like production use |
| PayTabs (mobile path) | Live, **unverified server-side** | See SEC-023 |
| PayTabs (web path) | Live, properly verified | The correct pattern; not applied to the mobile path |
| Firebase Cloud Messaging | Live | Legacy HTTP API (deprecated by Google), key duplicated in 4 files |
| Pusher Channels | Live | Single global channel for all bidding events |
| Instagram | Dead/vestigial | Never loaded |
| Social login (Google/FB/Apple) | Live, **not verified server-side** | See SEC-016 |
| OpenStreetMap (`flutter_osm_plugin`) | Live | `flutter_map` dependency unused |
| Google Analytics/Ads/GTM | Live | Website only |
| reCAPTCHA | Live client-side, unconfirmed server-side | See SEC-024 |
| Memcached | Dead/vestigial | Configured, never used |
| WhatsApp chatbot services | Live, but disconnected from main platform | Separate DB, domain, auth |
