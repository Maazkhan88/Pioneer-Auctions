# 04 — Users, Roles & Permissions

Status: Phase 3 complete (single research pass, high confidence, extensive file:line evidence).

## 1. Roles found in code

`users.role` is a free-text/int-like column. The authoritative mapping only exists as a comment block (`application/modules/users/controllers/Users.php:4-12`, echoed at `user/controllers/User.php:56-113` and `users/controllers/Users.php:4317-4325`) — there is **no central role-constants file or enum**; every controller re-implements its own `if ($role == N)` branching.

| Role # | Meaning |
|---|---|
| 1 | Admin |
| 2 | Sales Manager |
| 3 | Sales Person |
| 4 | **Customer** — the only role blocked from the back-office (`Loggedin_Controller`/`Admin_Controller`) and the only role permitted into the customer portal (`Customer_Controller`) |
| 5 | Operational Department |
| 6 | Tasker |
| 7 | Live Auction Controller (i.e., the auctioneer/operator role referenced throughout [06-bidding-engine.md](06-bidding-engine.md)) |
| 8 | Cashier |
| 9 | Appraiser |
| 10 | Marketing |

`users.type` ENUM('vendor','buyer','both') is a secondary classifier checked **only in combination with role 4** (e.g. `Users.php:1155,3863`, `Transaction.php:20,67,141`: `if ($this->loginUser->role == 4 && $this->loginUser->type == 'buyer')`) — it distinguishes buyer vs. seller behavior *within* the customer role; it is not an independent permission gate.

`dept_id` (present on the `users` table per the one real migration, [02-repository-inventory.md](02-repository-inventory.md)) has **zero references anywhere else in the codebase** — a dead/unused column.

## 2. The ACL module — real system, but never actually enforced

`application/modules/acl/models/Acl_model.php` is a genuine, working DB-backed RBAC system: `acl_roles`, `acl_permissions`, `acl_role_permissions` tables, `has_permission($controller, $action, $role_id)` doing a real SQL join, plus a working admin UI (`Acl_roles` controller) that auto-discovers every controller/action in the app (via a `controllerlist` library) and lets an admin assign per-action permissions to a role.

**It is never actually used to authorize anything.** A full-codebase search for `has_permission(`/`main_permission(` shows its only real caller is the sidebar-menu template (`template/views/template_sidebar.php`, ~70 call sites) — it drives **navigation link visibility only**. The enforcement call is present but **commented out** in all three shared base controllers:

```php
// application/core/Admin_Controller.php:32-35 (and the same pattern in Customer_Controller.php:49-52, Loggedin_Controller.php:38-41)
// if (!$this->Acl_Model->has_permission($this->router->fetch_class(), $this->router->fetch_method(), $this->loginUser->role_id)) {
//     redirect(base_url().'admin/users/page_403');
//     die;
// }
```

This is a materially different (and more concerning) finding than "permissions were never built" — a working feature was switched off. Every controller-level authorization decision in the system instead comes down to one blanket check in the shared base controllers: **"is any non-customer role currently logged in"** — not "is this specific role allowed to perform this specific action." See [18-security-review.md SEC-020](18-security-review.md) for the security implications, which cascade into several other findings (SEC-005, SEC-009, SEC-019).

The `Acl_roles` screen that edits the (unenforced) permission matrix is itself only gated by "any logged-in staff account" — any staff login, not just Admin, can currently reassign roles' permissions.

## 3. Session/auth mechanism — browser-facing (admin + customer)

Confirmed session-based: CodeIgniter's native `session` library (autoloaded globally). Login state is written via `$this->session->set_userdata('logged_in', $result[0])` from (at least) four independent code paths (see §9), and read back in three separate shared base-controller constructors:

- `application/core/Admin_Controller.php:26-31`
- `application/core/Loggedin_Controller.php:12-19` (used by most back-office controllers — `Users`, `Acl_roles`, `Transaction`, `Livecontroller`, etc.)
- `application/core/Customer_Controller.php:12-25` (plus a `status==0`/blocked check at lines 28-34)
- `application/core/MY_Controller.php:20-30` also independently re-checks the same session key

**None of these constructors check which role is allowed into the specific controller/action being requested** — only "is a session present." Role-specific checks that do exist are ad hoc, scattered inside individual method bodies rather than enforced at the gate.

## 4. Auth mechanism for the API (`getapi`)

JWT-based, via a custom `Jwt` library + `application/helpers/jwt_helper.php`. Tokens are issued from `loginUser()`, the three social-login handlers, `verifyOtp()`, `otp()`, `resendOtp()`, and (critically) `token_update()` — see §7 below and [18-security-review.md SEC-012](18-security-review.md).

- **Signature verification is real**: `validateToken()` (`jwt_helper.php:42-68`) does genuinely verify the signature (`Jwt::decode($token, SECRETE_KEY, ['HS256'])`) and re-checks the user's live DB status (`status != 1` → rejected) — this is called at ~75 sites across `Getapi.php` and correctly derives the acting user ID from the token payload rather than client input at most of those sites (e.g. `getUserProfile`, `changePassword`).
- **The signing secret is a hardcoded literal** in `application/config/constants.php:89` (`SECRETE_KEY`), and is reused by two further, independently-implemented API controllers (`api/Api.php`, `apis/Apis.php`) — confirming those "legacy" modules are live, fully-functioning, JWT-issuing surfaces, not dead scaffolding (ties directly to [02-repository-inventory.md](02-repository-inventory.md)'s open question about `api`/`apis` reachability).
- **Tokens live 120 days** with no refresh/rotation and no server-side revocation — `deauthorize()` (the logout/revoke endpoint) is an **empty stub function**. A leaked token remains valid for its full lifetime regardless of user-initiated logout.
- **`token_update()`** is a severe exception to the "signature verification is real" pattern above — see §7.

## 5. OTP flow

- Generation: `application/helpers/general_helper.php:63-72` `getNumber($n)` — an `$n`-digit numeric code built with PHP's `rand()` (not a CSPRNG). Called as `getNumber(4)` for registration/login OTP and the password-reset code alike — only 10,000 possible values.
- Storage: plaintext on the `users` row (`code`, `email_verification_code`, `otp_expire`, `reset_password_code`).
- **Registration/login OTP** (`verifyOtp()`, `Getapi.php:1220-1326`) does enforce a real 3-minute expiry window, but has **no rate-limiting or attempt-throttling** — unlimited guesses can be submitted within the window, and `resendOtp()`/`resendCode()` can be called repeatedly to re-arm a fresh window.
- **Password-reset code** (`forgotPassword()`/`updatePassword()`) uses the same weak 4-digit generator but has **no expiry check at all**, and its lookup is `WHERE reset_password_code = $code` with **no email/user scoping** — given only 10,000 possible values, a collision could let one person's reset request match and reset a *different* account's password. It is single-use only in the sense that a successful reset zeroes the code afterward.

## 6. Password handling

Every password path in the system — admin login, jobcard login, customer login, API login/register/social-login, change/reset password — uses **`hash("sha256", $password)`**: a single, unsalted general-purpose hash. No `password_hash()`/bcrypt/Argon2 exists anywhere in the reviewed code.

- The admin/back-office (and separately, "jobcard" portal) forgot-password flow uses `uniqid()` (time-based, not cryptographically random) as the reset token, looked up via `WHERE unique_id = $id`, and — critically — **the token is never invalidated after a successful reset** (only `password`/`updated_on` are updated), meaning the same reset link remains valid and reusable indefinitely, with no expiry field at all.
- The API's `changePassword()` is comparatively the most careful flow: requires the old password (server-compared), and derives the acting user from the validated JWT rather than client input.

## 7. Authorization per sensitive action — role vs. "merely logged in," and IDOR risk

The back-office/staff side checks only **"is some staff member logged in"** — never "is this staff member permitted to perform this specific action" (the ACL layer that could enforce this, per §2, is unused).

- **`Users::adjust_security()` / `adjust_deposit()`** (`Users.php:3263-3306+`) — `user_id`, `auction_item_deposits_id`/`sold_item_id`, and the adjustment amount are taken as raw routed parameters and used directly to update `sold_items`/`auction_item_deposits`, with no re-verification that the target belongs to the acting staff member's remit and no amount-sanity check. Any authenticated non-customer role (1,2,3,5,6,7,8,9,10 all pass the blanket constructor check) can reach these financial-adjustment endpoints by URL. See [18-security-review.md SEC-019](18-security-review.md).
- Invoice/statement viewing methods are staff-only but have no explicit "does this role have invoice rights" check beyond the blanket gate — architecturally more defensible (staff generally do service all customers) but still relies entirely on the unused ACL layer for any finer control.
- **By contrast, the customer-facing module correctly scopes every query to the session-derived identity** (`customer/Customer.php`, ~28 occurrences of `$this->loginUser->id`-scoped queries) rather than accepting a `user_id` from the request — no IDOR pattern found on this surface.
- Most JWT-validated `getapi` endpoints similarly derive the acting user from the validated token rather than client input — **except `token_update()`**, see §8.

## 8. Social login trust boundary

`fb_login_register()`, `google_login_register()`, `apple_login_register()` (`Getapi.php:401-980`) are structurally identical: each reads `email` (plus optional name/role) straight from the client's JSON body. **None of the three make any outbound verification call to Facebook, Google, or Apple** — confirmed by a full-file search for provider-verification indicators (no Graph API call, no Google tokeninfo/`Google_Client`, no Apple JWKS validation; the only outbound HTTP calls in the file are Firebase push-related, unrelated to login). If an account with the submitted email exists, a valid JWT is issued for it immediately; if not, a new account is silently auto-created as active (`status => '1'`, no OTP/email verification step).

All three handlers (and `registerUser()` too) additionally accept a **client-supplied `role` field** written directly into the new account's `role` column with no server-side restriction to role 4 (customer) — a client can choose its own role, including a staff/admin role, at registration or social-login time. Full severity assessment in [18-security-review.md SEC-016](18-security-review.md).

## 9. How many independent "login" implementations exist

At least **six actively-referenced, independently-coded** login/credential-issuing paths, plus two more full duplicate controllers:

1. `user/User::login()` — primary admin login (role-branching redirect for all 10 roles).
2. `user/User::jobcard_login()` — a second, separate method in the same controller for a "jobcard" portal; its companion forgot-password flow queries a *different* table, `jobcard_users`, which appears unpopulated/unused elsewhere — an internal inconsistency within the same controller about which store the jobcard login actually uses.
3. `login/Login::login_user()` — a third, fully independent admin-login controller using a different model (`Login_user`, not `Users_model`) — reads as a legacy/parallel implementation of (1).
4. `home/Home::login_process()` — the public website's customer login (`role == '4'` only), its own model call, own status checks.
5. `getapi/Getapi::loginUser()` — mobile/API login, JWT-based, independent of the session mechanism entirely.
6. `getapi/Getapi::token_update()` — mints a JWT from nothing but a numeric user ID with **no credential check whatsoever**. See [18-security-review.md SEC-012](18-security-review.md) — this is the single most severe finding in the entire review: a complete, unauthenticated account-takeover primitive against any user (including Admin), requiring only a guessable sequential integer ID.
7. `application/modules/api/controllers/Api.php` and `application/modules/apis/controllers/Apis.php` — two further complete duplicate REST controllers, each with their own `loginUser()`/`registerUser()`, signing JWTs with the same hardcoded secret as (5)/(6). Not present in `routes.php` but very likely still reachable via CI3's default HMVC routing convention (unconfirmed at the infrastructure level).

**Assessment**: there is really one underlying credential store (the `users` table, SHA-256 comparison) and one JWT secret, but at least six to eight separate places re-implement "check the password / issue a session or token" rather than a single shared, centrally-maintained auth module — several of these (the `jobcard_users` reference, the `api`/`apis` duplicates, `token_update`) read as forgotten/superseded code rather than intentional parallel systems, which means any future security fix must be located and applied in every one of these places to be complete.

## Summary — role/permission matrix (as actually enforced, not as designed)

| Capability | Enforced by | Actual granularity |
|---|---|---|
| "Can reach the back office at all" | `Admin_Controller`/`Loggedin_Controller` session check | Binary: any non-customer role vs. customer |
| "Can perform back-office action X specifically" | **Nothing** (ACL exists but is disabled) | None — any staff role can call any staff-gated controller method reachable by URL |
| "Can reach the customer portal" | `Customer_Controller` session check + `status==0` blocked check | Binary: role 4 (customer) only |
| "Can call authenticated API endpoint" | JWT signature + live user-status check | Mostly correct (user-scoped from token), except `token_update` (no check at all) |
| "Can perform live-hall operator actions (retract/rollback/sold/etc.)" | `Loggedin_Controller`'s blanket "any staff" check | No role-7-specific ("Live Auction Controller") restriction found — any staff role can call these |

This table should be read alongside [06-bidding-engine.md §7](06-bidding-engine.md) (operator actions) and [18-security-review.md](18-security-review.md) SEC-005/009/012/019/020, which document the concrete consequences of the gaps above.
