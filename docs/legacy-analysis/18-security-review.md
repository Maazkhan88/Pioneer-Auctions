# 18 — Security Review

Status: DRAFT — seeded with findings confirmed by direct code inspection during Phase 1 reconnaissance. Will be expanded once the bidding-engine, auth/permissions, and integrations research agents report back, and once a dedicated Phase 13 pass is run. Findings below are already CONFIRMED (Observed behaviour, with file evidence), not speculative.

## Critical findings (confirmed by direct read, Aug 2026 reconnaissance)

### SEC-001 — Unauthenticated deploy trigger with shell command execution
**File**: [`pioneer-web-main/pioneer-web-main/deploy.php`](../../pioneer-web-main/pioneer-web-main/deploy.php)

**Observed behaviour**: The file is 14 lines, sits at the web application root (same level as `index.php`), contains **no authentication, no token check, no IP allowlist, nothing** gating access, and on any HTTP request executes:
```php
echo "<BR>".shell_exec("git pull origin master 2>&1");
```
The full stdout/stderr of the `git pull` is echoed back in the HTTP response.

**Implication**: If this file is reachable at its default path on the production host (nothing in `.htaccess` or `application/config/routes.php` blocks static `.php` files at the root — CI3's rewrite rule only redirects requests that aren't real files/directories, and `deploy.php` IS a real file, so it bypasses the CodeIgniter routing/auth layer entirely and is served directly by the webserver), then **any unauthenticated party who knows or guesses the URL can**:
- Trigger a deploy/code update at will (resource exhaustion / unwanted deploys / potential denial of service if this interrupts running requests).
- Read git command output, which can leak internal file paths, branch names, merge conflict details, or error messages revealing server structure.
- More broadly, this confirms the codebase's philosophy toward "internal tooling" endpoints is **no-auth-by-default** — a pattern worth checking for elsewhere (see SEC-002, and check `test-email`/`my-test-email` routes and `test.php` at the web root, which were also flagged in Phase 1 as unauthenticated-looking debug/utility endpoints).

**Assessment**: CRITICAL. This is the single worst finding so far — an unauthenticated shell-command-triggering endpoint. Even scoped narrowly to `git pull`, this is a live remote-trigger surface that should never be internet-reachable without authentication. **UNKNOWN — REQUIRES BUSINESS CONFIRMATION**: whether this file is actually deployed to the production web root or was only ever used locally/behind a VPN — the presence of `appspec.yml` (AWS CodeDeploy) as the primary deploy mechanism suggests `deploy.php` may be a legacy/superseded deploy method, but it still shipped in the same tree that goes to the webserver, so it must be assumed reachable until proven otherwise.

### SEC-002 — Legacy/parallel API modules (`api`, `apis`) are fully reachable and contain unvalidated write endpoints
**Files**: [`pioneer-web-main/pioneer-web-main/application/modules/api/controllers/Api.php`](../../pioneer-web-main/pioneer-web-main/application/modules/api/controllers/Api.php) (4,126 lines, ~90 public methods), [`.../application/modules/apis/controllers/Apis.php`](../../pioneer-web-main/pioneer-web-main/application/modules/apis/controllers/Apis.php) (1,662 lines, ~46 public methods)

**Observed behaviour**:
- `application/config/routes.php` contains **zero** entries routing to `api/` or `apis/` — the only officially wired API is `getapi/Getapi` at `/api/v1/*`.
- However, CodeIgniter 3's default routing maps any unmatched URI directly to `<module>/<Controller>/<method>` unless something blocks it. Nothing does: `application/config/hooks.php` only sets timezone and loads language files (no auth/access-control hook), and the web root `.htaccess` rewrites all non-file/non-directory requests to `index.php/$1` with no path denylist.
- Both `Api.php` and `Apis.php` are fully-implemented controllers (not stubs) with real constructors that load real models (`Api_model`, `Files_model`, `Home_model`, `Items_model`, `Email_model`, `Online_auction_model`) and real libraries (`jwt`, `TestUnifonic` — an SMS library, note the "Test" prefix on what appears to be a production-loaded class), meaning **these are very likely still live and callable at URLs like `/api/palceBids` or `/apis/loginUser`**, in parallel with the "canonical" `/api/v1/*` (`getapi`) surface.
- `Api.php` contains a bid-placement method, `palceBids()` (line 2651; note the typo in the method name itself), with the following logic, quoted in full because every line matters:
  ```php
  public function palceBids()
  {
    $id = validateToken();
    $posted_data = json_decode(file_get_contents("php://input"), true);
    $item = $this->db->get_where('auction_items', ['item_id' => $posted_data['item_id']])->row_array();
    $data['user_id'] = $id;
    $data['date'] = date('Y-m-d', time());
    $data['item_id'] = $posted_data['item_id'];
    $data['start_price'] = $item['bid_start_price'];
    $data['end_price']   = $posted_data['bid_amount'];
    $data['auction_id']  = $item['auction_id'];
    $data['buyer_id']    = $id;
    $data['bid_amount']  = $posted_data['bid_amount'];
    $data['bid_time']    = date('Y-m-d H:i:s', time());
    $data['bid_status']  = 'pending';
    $insert = $this->db->insert('bid', $data);
    // ... echoes success/failure JSON
  }
  ```
  The **only** guard is `validateToken()` (presumably confirms the requester is a logged-in user — exact behaviour to be confirmed by the auth research agent). There is:
  - **No check** that `bid_amount` exceeds the item's current price or `bid_start_price`.
  - **No minimum-increment check.**
  - **No check** that the auction/item is still open, not closed, not withdrawn.
  - **No reserve-price logic.**
  - **No DB transaction or row locking** — a pure insert.
  - **No duplicate-submission protection.**
  - The client-supplied `bid_amount` is trusted outright and written straight into the `bid` table.

**Implication**: this is a textbook **client-controlled sensitive value / price manipulation** vulnerability (see Phase 13 checklist item: "the backend must be authoritative" for bid amount). It doesn't matter how well-validated the current, routed bidding path (`getapi/Getapi::place_bid_live`/`placebid`, under analysis by a separate research pass) turns out to be — if `api/Api::palceBids` is reachable, it is a lower-friction bypass of whatever validation the newer path added. At minimum a malicious authenticated user could insert arbitrary "pending" bids at arbitrary amounts; the real-world impact depends on whether anything downstream (settlement, "winning bid" calculation, admin review) blindly trusts rows in the `bid` table without re-validating — to be cross-checked once the bidding-engine and database research agents report.

**Assessment**: CRITICAL, pending confirmation of live reachability. Needs a direct HTTP probe against a staging/production instance to fully confirm (out of scope for a read-only code review) — but from a pure code-reachability standpoin there is nothing in this codebase that prevents it.

### SEC-003 — Real cryptographic key material committed to a project archive
**File**: `Revoked Key.zip` (top-level, not extracted into the working tree by this review; inspected read-only, file types identified only, no key content reproduced anywhere in this documentation set — see [02-repository-inventory.md §5](02-repository-inventory.md))

**Observed behaviour**: contains an Apple Push Notification service auth key (`AuthKey_VHKKNN82BV.p8`, real PKCS8/EC private key data, not a placeholder), an Android upload keystore (`pioneertest.jks`), a debug keystore, and an upload certificate (`upload_certificate.pem`).

**Assessment**: MEDIUM-to-HIGH depending on business confirmation. The folder name claims these are "Revoked," and Apple auth keys can indeed be revoked/rotated in App Store Connect independent of the file continuing to exist. However: (a) the Android keystores (`pioneertest.jks`, `debug.keystore`) have no equivalent "revocation" concept — if `pioneertest.jks` is the real Play Store upload/signing key and it's still in active use, having it sitting in a plaintext zip in a general project folder (not a secrets manager) is a live risk regardless of the folder's name; (b) even a genuinely revoked APNs key still discloses its Key ID (`VHKKNN82BV`, visible in the filename) which is metadata a real attacker could use for reconnaissance/social engineering. **UNKNOWN — REQUIRES BUSINESS CONFIRMATION**: which of the four files are actually rotated/inert vs. still live in production signing/push pipelines.

### SEC-004 — Unauthenticated `phpinfo()` exposed at web root
**File**: [`pioneer-web-main/pioneer-web-main/test.php`](../../pioneer-web-main/pioneer-web-main/test.php) (full file, 3 lines):
```php
<?php
phpinfo();
?>
```

**Observed behaviour**: identical pattern to SEC-001 — a bare utility/debug file sitting at the web root, outside the CodeIgniter routing/auth layer entirely, reachable by anyone who requests `/test.php` directly (nothing in `.htaccess` blocks real files). `phpinfo()` dumps the full PHP configuration: exact PHP version and build, all loaded extensions and their versions, absolute server file paths, loaded php.ini directives, and — depending on how the server is configured — potentially environment variables (which on some hosting setups is where DB credentials/API keys are injected).

**Implication**: this is reconnaissance gold for an attacker (exact PHP version pinpoints known CVEs; paths reveal server layout) and, in the worst case, could leak secrets if any are exposed via environment variables rather than files.

**Assessment**: CRITICAL, and combined with SEC-001 (`deploy.php`) establishes a clear pattern: **debug/utility scripts were left in the production web root without authentication at least twice**. This strongly suggests a systemic gap (no pre-deploy checklist / no `.gitignore` or build step stripping debug files) rather than two isolated mistakes — worth calling out as a process issue, not just two bugs, in Phase 14 (technical debt).

### SEC-005 — ACL/permission check disabled in the shared authenticated base controller
**File**: `application/core/Loggedin_Controller.php:38-41` (all live-auction operator endpoints in `live_auction_controller/Livecontroller.php` extend this base class)

**Observed behaviour**: the base controller's role/permission enforcement call (`$this->acl_model->has_permission(...)`) is **commented out in source**. The only active check is "is this an authenticated, non-blocked, non-customer (role != 4) account." There is no further gate distinguishing an authorized auctioneer from any other authenticated staff login.

**Implication**: every operator action documented in [06-bidding-engine.md §7](06-bidding-engine.md#7-operatoradmin-actions-live_auction_controllerlivecontrollerphp) — including `retractAllAuctionBid()` and `rollBackAuctionBid()`, both of which perform irreversible bulk `DELETE`s of bid history — is callable by any staff account, not just designated auctioneers. Since the ACL system (`acl` module) clearly exists in the codebase (there's a real model, a real `has_permission` method being called), this reads as **a permission check that was deliberately disabled at some point** (commented out, not simply never written), which is a materially different and more concerning finding than a missing feature — something worked, then was turned off.

**Assessment**: HIGH. Combine with SEC-006 below (destructive, unaudited deletes) for full severity — this isn't just "any staff can do X," it's "any staff can silently and irreversibly erase bid history."

### SEC-006 — No transactions/locking in the bidding engine → real race-condition exposure
**Files**: `application/modules/getapi/controllers/Getapi.php` (`placebid()`, `place_bid_live()`), `application/modules/live_auction_controller/controllers/Livecontroller.php` (`initialAuctionBid()`, `retractAuctionBid()`)

Full detail in [06-bidding-engine.md §4](06-bidding-engine.md#4-concurrency--race-conditions). Summary: every bid-accepting/bid-modifying method uses an unguarded "read latest row via `ORDER BY id DESC` → compute in PHP → plain insert/delete" pattern, with no DB transaction, row lock (`FOR UPDATE`), or optimistic-version check anywhere. Two concurrent requests (e.g., a mobile bidder and an operator's hall console, which write the **same table**, `live_auction_bid_log`, with no coordination — see SEC-008) can both read the same "current price," both compute a valid-looking next bid, and both insert, with no guarantee the higher `id` corresponds to the higher `bid_amount` and no constraint preventing an out-of-order result.

**Assessment**: HIGH. This is not a theoretical concern given the confirmed multi-writer situation in SEC-008 — it is the single highest-impact correctness/integrity risk in the core transaction-processing logic of the platform.

### SEC-007 — No server-side minimum bid increment enforcement
Full detail in [06-bidding-engine.md §1](06-bidding-engine.md#1-starting-state--normal-bidding). The bid increment amount is taken verbatim from the client (mobile app or any direct API caller) in both bidding surfaces; server-side validation messages for "below minimum increment" exist as dead language strings but are never wired into actual logic. A malicious or buggy client could submit a $0.01 increment, or (pending confirmation of numeric handling) a zero/negative value.

**Assessment**: HIGH — classic "trust the client for a financially significant value" pattern.

### SEC-008 — Bidder API and operator console write the same bid table with zero coordination
Full detail in [06-bidding-engine.md §8](06-bidding-engine.md#8-the-three-surface-coordination-question). `getapi::place_bid_live()` (bidder-facing, reachable from the mobile app/website) and `live_auction_controller::Livecontroller` (staff hall console) both read and write `live_auction_bid_log` using the same unsynchronized pattern described in SEC-006, with no lock, mutex, or "auction currently under operator control" flag arbitrating between them.

**Assessment**: HIGH, compounds directly with SEC-006.

### SEC-009 — Destructive, unaudited bid-history deletion
Full detail in [06-bidding-engine.md §7](06-bidding-engine.md#7-operatoradmin-actions-live_auction_controllerlivecontrollerphp). `retractAuctionBid()`, `retractAllAuctionBid()`, and `rollBackAuctionBid()` perform hard `DELETE`s on bid history with no soft-delete flag, no "retracted_by/at" fields, and no separate audit log entry — combined with SEC-005 (disabled ACL), any authenticated staff account can permanently and silently erase part or all of a lot's (or even a whole auction's) bid history.

**Assessment**: HIGH — both a data-integrity and a dispute-resolution/compliance risk (no way to reconstruct what was deleted or by whom after the fact).

### SEC-010 — Unauthenticated auction-closing/reserve-resolution endpoint
Full detail in [06-bidding-engine.md §5](06-bidding-engine.md#5-auctionlot-closing--anti-sniping). The `cronjob` module's controller extends plain `MX_Controller`, not the authenticated base controller — no login check, IP allowlist, or shared secret gates it. `sale_out_email` is explicitly a public route; `auto_sale_auction_items` (which resolves reserve/sold status for expiring online auctions) is very likely reachable the same way via CI3 default routing. Whether this is mitigated at the infrastructure layer (e.g., firewalled) could not be determined from source.

**Assessment**: MEDIUM-HIGH pending infra confirmation — **UNKNOWN — REQUIRES BUSINESS/INFRA CONFIRMATION.**

### SEC-011 — Dead routed endpoint (`provisionalSoldAuctionBid`)
`application/config/routes.php:77` routes to a `Livecontroller::provisionalSoldAuctionBid` method that does not exist in the controller (confirmed by full-file read). Not a security defect per se, but recorded here because it's exactly the kind of drift that produces confusing error responses and should be checked for equivalents elsewhere in the routing table.

**Assessment**: LOW (functional bug, tracked further in [19-technical-debt.md](19-technical-debt.md)).

### SEC-012 — `token_update` endpoint: unauthenticated account takeover for any user (including Admin)
**File**: `application/modules/getapi/controllers/Getapi.php:345-397` (method `token_update()`), routed publicly at `application/config/routes.php:224` (`api/v1/token_update`), model helper `Getapi_model.php:389-399` (`login_check3()`)

**Observed behaviour**: this endpoint accepts only `{"id": <user_id>}` in the POST body. `login_check3($username)` looks the user up by **primary key alone** — `WHERE id = $username` — with **no password, no OTP, no prior session/token, no proof of ownership whatsoever**. If the target account's `status == 1` (active), the endpoint issues a fully valid, signed JWT for that user and returns it to the caller, using the same signing path (`Jwt::encode`) as a real login.

**Implication**: `users.id` is a small, sequential, trivially-enumerable auto-increment integer. Anyone — unauthenticated — can call this endpoint with `id=1`, `id=2`, `id=3`, etc. and receive a valid, 120-day-lived login token for that account, **including staff/admin accounts** (nothing in the check excludes role 1). This is a complete, unauthenticated account-takeover primitive for the entire user base, requiring no credentials, no OTP, no social-engineering — just guessing small integers.

**Assessment**: CRITICAL — the most severe finding in this review. This alone would allow full compromise of any account in the system, including administrative accounts, via a single unauthenticated POST request. Whatever the original intent of this endpoint was (likely a "refresh my token" utility that was supposed to require the *caller's own* prior valid token, not an arbitrary target ID), as implemented it has no such restriction.

### SEC-013 — Unsalted single-round SHA-256 password hashing, used everywhere
**Files**: `application/modules/user/controllers/User.php:49,315,339,358,386`, `application/modules/home/controllers/Home.php:241`, `application/modules/getapi/controllers/Getapi.php` (`loginUser()` L284, `registerUser()` L1153, social handlers L535, `updatePassword()` L1608, `changePassword()` L1683/1690)

**Observed behaviour**: every password-handling code path in the system uses `hash("sha256", $password)` — a single, unsalted general-purpose hash — with no `password_hash()`/bcrypt/Argon2 anywhere.

**Assessment**: HIGH. Unsalted SHA-256 is fast to compute, making offline brute-force/rainbow-table attacks against a leaked `users` table practical at scale. This is a foundational weakness affecting every account in the system, not an edge case.

### SEC-014 — Hardcoded JWT signing secret, shared across three parallel API controllers
**File**: `application/config/constants.php:89` (`define('SECRETE_KEY', ...)`, value withheld here — see file for verification), reused by `getapi/Getapi.php`, and independently by the two apparently-legacy duplicate controllers `application/modules/api/controllers/Api.php` and `application/modules/apis/controllers/Apis.php` (both call `Jwt::encode($payload, SECRETE_KEY)`), confirming SEC-002's suspicion that `api`/`apis` are live, functioning, JWT-issuing API surfaces, not dead scaffolding.

**Assessment**: HIGH. A static, committed secret used to sign long-lived (120-day) tokens across three independent controller implementations is both a single point of total compromise (secret leak = forge any token) and evidence that the "legacy" `api`/`apis` modules were fully wired for real authentication, reinforcing SEC-002.

### SEC-015 — No token revocation; `deauthorize()`/logout is a no-op
**File**: `application/modules/getapi/controllers/Getapi.php:988` (`deauthorize()`)

**Observed behaviour**: tokens are issued with a 120-day expiry (`exp: time() + (120*60*24)`, note: this arithmetic is actually only ~2000 minutes ≈ 33 hours if `120*60*24` is meant as `120 days * 60 min * 24 hr` — but written this way it computes minutes, not seconds, needs a precise re-check of `Jwt`'s expected unit — flagged for verification either way, since either interpretation means a very long-lived, non-revocable token). The `deauthorize()` method that should invalidate a token on logout is an **empty stub** — there is no server-side session/token blacklist, so a captured or leaked token remains valid for its full lifetime regardless of user-initiated logout.

**Assessment**: MEDIUM-HIGH. Long-lived, non-revocable bearer tokens substantially raise the impact of any token leak (device theft, XSS, log exposure, etc.).

### SEC-016 — Social login (Facebook/Google/Apple) never verifies the provider token server-side
**File**: `application/modules/getapi/controllers/Getapi.php` — `fb_login_register()` (L401-593), `google_login_register()` (L595-786), `apple_login_register()` (L792-980)

**Observed behaviour**: none of the three handlers make any outbound call to Facebook/Google/Apple to verify the access token/id-token the client claims to have obtained (confirmed by full-text search — the only outbound `curl_init()` calls in the whole file are for Firebase push, unrelated). Each handler simply trusts the `email` (plus optional name/role) fields the client sends in the JSON body: if an account with that email exists, it's logged in (a fresh JWT issued); if not, a new account is silently auto-created with `status => '1'` (active, no verification step).

**Implication**: a malicious client can register or log in as **any email address it chooses to assert**, including impersonating an existing customer's email (auto-login into their account) purely by sending that email in a POST body — no proof of owning the email or the social account is ever checked. Compounding this, all three handlers additionally accept a client-supplied `role` field written directly into the new account's `role` column with no server-side restriction to the customer role (same pattern independently present in `registerUser()`), meaning a client can choose its own privileged role at account-creation time via social login or direct registration.

**Assessment**: CRITICAL. This is a full authentication-bypass: identity is asserted by the client, not proven, and the same request can also self-assign a staff/admin role.

### SEC-017 — Weak, unthrottled OTP; unscoped and non-expiring password-reset code
**File**: `application/helpers/general_helper.php:63-72` (`getNumber()`), `application/modules/getapi/controllers/Getapi.php` (`verifyOtp()` L1220-1326, `updatePassword()` L1494-1626)

**Observed behaviour**: OTP/verification/reset codes are 4-digit numbers generated with PHP's non-cryptographic `rand()` (10,000 possible values), stored in plaintext on the `users` row. Registration/login OTP does enforce a genuine 3-minute expiry, but has **no rate-limiting or attempt-throttling** — a client can submit unlimited guesses inside the 3-minute window, and `resendOtp()` can be called repeatedly to re-arm a fresh window indefinitely. The separate password-reset code has **no expiry check at all** in `updatePassword()`, and critically, the lookup is `WHERE reset_password_code = $code` **without scoping by email/user** (`Getapi.php:1605`) — given only 10,000 possible codes, a code collision could let one person's reset request match and reset a *different* user's password.

**Assessment**: HIGH. Combines a small guessable code space, no throttling, and (for password reset specifically) no expiry and no per-user scoping — realistically brute-forceable and has a plausible cross-account collision path.

### SEC-018 — Predictable, never-expiring, reusable password-reset token (admin/back-office portal)
**File**: `application/modules/user/controllers/User.php:222-349` (`forgot_password()`/`reset_password()`), model `Users_model.php:536-541` (`update_forgot_password()`)

**Observed behaviour**: the admin/back-office (and separately, the "jobcard" portal) forgot-password flow generates its reset token with PHP's `uniqid()` — time-based, not cryptographically random — and the token is **never invalidated after use**: the successful-reset DB update only touches `password`/`updated_on`, leaving the original `unique_id` (the reset token) intact and reusable indefinitely. No expiry field/check exists for this flow at all.

**Assessment**: HIGH. A predictable, permanently-valid password-reset link for staff/admin accounts (the highest-privilege accounts in the system) is a serious and durable weakness — unlike a leaked OTP that expires in minutes, a leaked/guessed `uniqid()` reset link here works forever.

### SEC-019 — IDOR on financial adjustment endpoints (`adjust_security`, `adjust_deposit`)
**File**: `application/modules/users/controllers/Users.php:3263-3306+` (`adjust_security()`, `adjust_deposit()`), routed at `application/config/routes.php:112-113`

**Observed behaviour**: both methods take `user_id`, `auction_item_deposits_id`/`sold_item_id`, and the adjustment amount as raw routed parameters and act on them directly — updating `sold_items.adjusted_security`/`payable_amount` and `auction_item_deposits.status` — with no re-verification that the acting staff member has any specific claim/role over that user's deposit, and no amount-sanity check. The only gate is the generic `Loggedin_Controller` constructor check ("is any non-customer role logged in"), which — per SEC-005/SEC-020 — is effectively "is any staff account logged in," since the ACL layer that could restrict this further is unused.

**Assessment**: HIGH. Textbook IDOR/authorization-boundary gap on endpoints that move money (security deposit and payable-amount adjustments).

### SEC-020 — ACL/RBAC system exists but is completely unused for authorization (only drives sidebar visibility)
**Files**: `application/modules/acl/models/Acl_model.php` (real DB-backed roles/permissions, `has_permission()`), `application/core/Admin_Controller.php:32-35`, `Customer_Controller.php:49-52`, `Loggedin_Controller.php:38-41` (all three have their `has_permission(...)` enforcement call **commented out in source**)

**Observed behaviour**: a genuine, working RBAC system exists (`acl_roles`, `acl_permissions`, `acl_role_permissions` tables; a real admin UI to assign per-controller/per-action permissions to roles) — but a full-codebase search for `has_permission(`/`main_permission(` shows its **only actual caller** is the sidebar-menu-rendering template (`template/views/template_sidebar.php`), which uses it purely to show/hide navigation links. It is never called to block execution of an action. The enforcement call is present-but-disabled (commented out) in all three shared base controllers, meaning this was very likely a working feature at some point that was switched off rather than a feature that was never finished.

**Assessment**: This is the root cause underlying SEC-005, SEC-009, and SEC-019 above — every one of those "any staff can do X, even destructive/financial X" findings traces back to this single disabled check. Re-enabling/repairing this one mechanism (after auditing what permission matrix it would actually enforce) would meaningfully close several other findings at once. Also note `Acl_roles` (the screen that edits the permission matrix itself) has no additional restriction beyond "any logged-in staff" — any staff account can currently reassign any role's permissions, even though those permissions aren't enforced anywhere yet.

### SEC-021 — At least six to eight independently-implemented "login" code paths
Full detail in [04-users-and-permissions.md §9](04-users-and-permissions.md). Summary: distinct, separately-coded login/credential-issuing implementations were found in `user/User::login()`, `user/User::jobcard_login()` (whose companion forgot-password flow queries a seemingly-unpopulated `jobcard_users` table — an internal inconsistency), `login/Login::login_user()` (an apparent third, fully separate legacy admin-login controller), `home/Home::login_process()` (public customer login), `getapi/Getapi::loginUser()` (JWT/mobile), and `getapi/Getapi::token_update()` (SEC-012). Plus two more full duplicate implementations in `api/Api.php` and `apis/Apis.php` (SEC-002/SEC-014).

**Assessment**: MEDIUM as a standalone item, but HIGH as a multiplier — every one of the auth weaknesses above (SEC-013 hashing, SEC-016 social-login trust, SEC-017 OTP) had to be independently reviewed per code path rather than trusted as "fixed once, correct everywhere," and any future fix must be applied in six-plus places or it will silently miss some of them.

### SEC-022 — Numerous live third-party credentials hardcoded in committed source
**Files** (each confirmed by direct agent read; exact values withheld, file/line given for verification): PayTabs server key (`application/libraries/Paytabs2.php:22`, second commented-out key at line 23), PayTabs merchant email/ID/secret key (`application/modules/customer/controllers/Customer.php:2112-2116`), Pusher app key/secret/app ID (`application/config/custom.php:30-32`, prior credential set commented out at lines 27-29), Unifonic AppSid (`application/libraries/Unifonic/config.php:4`), SendSmart SMS gateway username/password (`application/libraries/SendSmart.php:5-6`), legacy FCM HTTP API server key (duplicated in **four** locations: `application/libraries/Fcm.php:4`, `getapi/controllers/Fcm.php:63`, `getapi/controllers/Getapi.php:8434`, `cronjob/controllers/Cronjob.php:697`), Instagram client secret (`application/config/instagram_api.php`), and the JWT `SECRETE_KEY` already noted in SEC-014.

**Assessment**: HIGH, as a pattern. Every external integration in this platform is authenticated with a plaintext, committed credential rather than an environment variable or secrets manager — this is a project-wide practice, not an isolated slip, and means a source-code leak of any kind (git history, backup, this very zip export) is equivalent to a full credential leak across payments, SMS, push, realtime, and auth.

### SEC-023 — New mobile-app PayTabs deposit path has no server-side payment verification (older web path does)
**File**: `application/modules/getapi/controllers/Getapi.php::paytabsReturnURL()` (lines 9779-9838), library `application/libraries/Paytabs2.php`

**Observed behaviour**: `paytabsReturnURL()` reads `respStatus`/`tranRef` directly from the client-posted body and, if `respStatus == 'A'`, immediately marks the matching `auction_deposit` row `status = 'approved'` — **no signature/HMAC check and no server-to-server call back to PayTabs** to independently confirm the transaction (`Paytabs2.php`'s own `verify_payment()`/`authenticationPay()` methods exist but are never called from this path). By contrast, the **older** web deposit flow (`customer/Customer.php::return_paytab()`, using the separate `Paytabs.php` library) *does* call `$this->paytabs->verify_payment(...)` server-side and checks the response code before approving.

**Corroborating evidence from the mobile-app review**: the Flutter client's own payment-completion detection (`WebView.dart:42-61`) works by scraping the *rendered HTML text* of the PayTabs return page for the substring `"successfully"` — there is no confirming API call back to the backend either, on the client side. Both the client and the current server-side handler for this specific (newer, mobile) payment path rely on unverified signals rather than an authoritative check.

**Assessment**: HIGH — this is a real "client asserts payment succeeded, server believes it" pattern for the mobile deposit flow specifically, coexisting with a properly-verified equivalent on the older web flow. A malicious or buggy client could potentially mark a deposit as approved without an actual successful charge.

### SEC-024 — Client-side-only reCAPTCHA (no server-side `siteverify` found)
**Files**: ~36 view files reference the reCAPTCHA widget (`home/views/login.php`, `register.php`, `template/views/new/header_customer.php:1236`), loading `https://www.google.com/recaptcha/api.js`

**Observed behaviour**: the reCAPTCHA badge/widget renders client-side, but no server-side call to Google's `siteverify` endpoint was found in the corresponding login/register controllers.

**Assessment**: MEDIUM — if truly unverified server-side, the CAPTCHA provides no actual bot-mitigation (a scripted client can simply omit the token or submit any value), only a UX deterrent for casual abuse.

### SEC-025 — No database transactions or row locking anywhere in the codebase (confirmed platform-wide, not just bidding)
Independently confirmed by the database-reconstruction pass: `grep -rl "trans_start\|trans_begin\|trans_commit"` across all of `application/modules` returns **zero results**. This corroborates and generalizes SEC-006 beyond the bidding engine — sale settlement (`Cronjob.php`: update `bid`, insert `sold_items`, update `item`, update `auction_items` as four independent statements), invoice creation, and every other multi-table write sequence in the platform is non-atomic. A failure or concurrent request mid-sequence leaves financially-relevant tables (`bid.bid_status`, `item.sold`, `auction_items.sold_status`, `sold_items`) permanently inconsistent with no compensating/reconciliation logic anywhere.

**Assessment**: CRITICAL at platform scale — this is not a bidding-specific gap but a systemic absence of transactional integrity across every money- and status-affecting operation in the system.

### SEC-026 — Removed/insecure `mcrypt_*` extension usage with a hardcoded encryption key
**Files**: `application/modules/cars/models/Common_Model.php` and `application/modules/admin/models/Common_model.php` (confirmed near-identical copy-pasted utility classes)

**Observed behaviour**: both files reference a hardcoded `mcryptKey` and call the `mcrypt_*` PHP extension family, which was deprecated in PHP 7.1 and **fully removed in PHP 7.2+** — meaning either this code path is already dead/broken on any modern PHP version the app might run under, or the production environment is pinned to an EOL, unsupported PHP release specifically to keep this working (both are notable findings). A hardcoded, unrotated encryption key compounds this regardless.

**Assessment**: HIGH — either a live security/crypto weakness (weak, deprecated cipher primitives, static key) or evidence the platform depends on an EOL PHP runtime with its own large unpatched-CVE surface. **UNKNOWN — REQUIRES BUSINESS/INFRA CONFIRMATION** of the actual production PHP version.

### SEC-027 — Auth token and full user PII stored in plaintext local storage (mobile app)
**File**: `lib/Services/ApiServices.dart` (e.g. lines 71-83, 278-292), constants defined in `lib/AppConstants.dart`

**Observed behaviour**: the JWT bearer token plus the user's email, name, phone, address, city/state/country, and profile URL are all stored via plain Flutter `SharedPreferences` — on Android this is an unencrypted XML file (readable on a rooted device or via ADB backup on debuggable builds), on iOS an unencrypted plist — rather than `flutter_secure_storage`/Keystore/Keychain-backed storage.

**Assessment**: MEDIUM, compounds with SEC-015 (120-day non-revocable tokens) — a device-level compromise (physical access, malware, or an unlocked/rooted device) directly yields a long-lived, unrevocable account credential plus full PII in plaintext.

### SEC-028 — Mobile app is built against a non-production-looking backend domain
**File**: `lib/Services/ApiConfig.dart:2-6`

**Observed behaviour**: the compiled-in `baseURL` is `https://pas3.mindzbase.com`, with four other URLs commented out in the same file including what looks like the actual production domain (`https://pioneerauctions.ae`) and a staging variant (`https://stg.pioneerauctions.ae`), plus a raw LAN dev IP. There is no build-flavor/environment-variable mechanism — switching backends requires hand-editing this file and rebuilding.

**Assessment**: Not a vulnerability per se, but an operational/provenance red flag worth resolving before relying on any other finding in this review being representative of what's actually live in production today — **UNKNOWN — REQUIRES BUSINESS CONFIRMATION** of which domain/backend snapshot this app build (and by extension, this whole `pioneer-web-main` export) actually corresponds to.

## Carried-forward flags from Phase 1 (not yet fully assessed — will be resolved as remaining research agents report)

- `email.php` vs `email_old.php` — need to confirm which is loaded and whether either contains hardcoded SMTP credentials in a way that's web-reachable (source files themselves aren't web-servable in CI3's structure, but worth confirming `application/` isn't accidentally web-exposed given `deploy.php`'s existence at the root shows at least one internal file did end up reachable).
- `test.php` (19 bytes) and `test-email`/`my-test-email` routes (`email/Email_controller/index`, `email/Email_controller/my_test_email`) — likely unauthenticated debug endpoints; same pattern as `deploy.php`. Needs direct read.
- `three_d/(:any)` route (`getapi/Getapi/three_d`) — name suggests 3D-Secure payment handling; needs checking whether payment-completion state can be spoofed via this endpoint (ties into the PayTabs integration review).
- Full authorization/IDOR review (does every endpoint that takes a `user_id`/`customer_id` verify the caller owns it or is admin?) — assigned to the auth/permissions research agent, to be merged in here.
- Full bid-manipulation and concurrency review of the "canonical" bidding path — assigned to the bidding-engine research agent, to be merged in here alongside SEC-002 above.
- CSRF: `application/config/config.php` sets `$config['csrf_protection'] = TRUE` globally — needs checking whether this is actually compatible with/enforced on the JSON API surface (`getapi`/`api`/`apis`) or only on browser form posts, since CI3's CSRF protection by default only applies to POST form submissions processed through its form helper, not raw JSON bodies read via `php://input` (which is exactly how `palceBids` and similar methods read their input) — if so, CSRF protection may be giving a false sense of security on the very endpoints most in need of protection.

## Not yet reviewed (deferred to full Phase 13 pass after all research agents report)

SQL/NoSQL injection sweep, XSS sweep, unsafe file upload review (`upload_images`/`upload_item_documents`/`upload_signature` methods observed in `Api.php` — file upload validation not yet inspected), session management detail, rate limiting (or absence of it) on OTP/login endpoints, admin privilege escalation paths, sensitive data logging.
