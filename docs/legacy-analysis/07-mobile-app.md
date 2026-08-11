# 07 — Mobile App (Flutter)

Status: Phase 6 complete. Bidding-dialog internals are covered in depth by [06-bidding-engine.md §10](06-bidding-engine.md); this document covers the app's screen architecture, API surface, and client-side findings.

## Navigation architecture

There are **no named routes** — `main.dart` boots `SplashScreen` → `HomeScreen` unconditionally (login state does not gate the landing screen), and all navigation is imperative (`Navigator.push(MaterialPageRoute(...))`) scattered across screens. `SidebarScreen` (the hamburger drawer) is the hub most screens are reachable from. `main.dart` also contains ~250 lines of fully commented-out legacy bottom-navigation code (`MyHomePage`/`GNav`) — dead but still present as a comment block.

## Screen inventory (31 screens)

| Screen | Purpose | Backend endpoint(s) | Auth | Notable logic |
|---|---|---|---|---|
| splashScreen | Video splash | none | guest | 2s timer → Home |
| home_screen | Landing: featured/categories/upcoming | `/AllHomeListing2` | guest | category tab filter |
| login_screen | Email/password + social login | `/loginUser`, `/google_login_register`, `/fb_login_register`, `/apple_login_register` | guest | Apple nonce/sha256; "login-to-bid" re-entry flow |
| register_screen | Signup | `/registerUser` | guest | **Bug**: `if (_formKey.currentState?.validate() != null)` — `validate()` never returns null, so this is always true and form validation never actually blocks submission |
| otp_verfication | 4-digit OTP after registration | `/verifyOtp`, `/resendOtp` | guest | 1:59 resend countdown |
| forgot_password_screen | Request reset OTP | `/forgotPassword` | guest | success detected via hardcoded string-match on response text |
| PasswordResetOTP | OTP + new password | `/updatePassword`, `/resendOtp` | guest | **no client-side new/confirm match check** (inconsistent with ChangePassword, which does check) |
| reset_password | Password reset UI | none — makes no API call at all | n/a | **dead code**, see below |
| ChangePassword | Change password while logged in | `/changePassword` | logged-in | new==confirm check present |
| ProfileScreen | View/edit profile, avatar, KYC docs | `/customer/profile`, `/customer/update_profile`, `/customer/save_profile_image`, `/customer/select_doc_type`, `/save_user_documents` | logged-in | no field validation before submit |
| sidebar_screen | Drawer/hub | none directly | mixed | **`Logout` calls `prefs?.clear()`** — wipes all local storage, not just auth (also drops saved language preference) |
| auction_screen | Category/auction browse + filter (2,585 lines, largest screen) | `/getAuctionItems`, `/get_makes_options`, `/livehall/getAucStatusById`, `/notify_me` | guest for browse | "Join Live Hall" flow branches to live detail or a "Notify Me" email capture |
| auction_detail_screen | Lot detail + bid entry (2,030 lines) | `/online-auction/details`, `/wishList` | guest can view; login-gated to bid | countdown timer math; `directOffer==""` toggles Direct-Bid visibility (inverted/non-obvious naming) |
| LiveAuctionDetails | Real-time hall bidding (Pusher-driven) | `/live-online/{id}`, `/get_all_lots`, `/get_winning_lots`, `/get_bid_log`, `/customer/deposit`, `/broadcast_pusher/{itemId}/{auctionId}`, `/place_bid_live` | guest gets basic data; token needed for lots/logs/deposit | **client-side deposit-based bid ceiling**: `depositLimit = balance * percentage_settings.value`, computed and enforced only in the UI — see security note below |
| MyBids | User's placed bids | `/userBids2` | logged-in | sort-by dropdown is dead/commented-out UI |
| MyWishlist | Saved items | `/getWishList2` | logged-in | — |
| SellMyItemsScreen | User's submitted items | via `/inventory` | logged-in | — |
| AddNewItem | Submit item for sale (1,348 lines) | `/sell_item`, `/get_subcategories`, `/get_makes_options`, `/get_model_options`, `/get_item_fields`, `/save_item`, `/save_item_file_images` | logged-in | server-declared "required" field flags are **not enforced client-side** before submit |
| Calendar | Auction calendar (Day/Week/Month) | `/calendar` | guest | live-auction detection via string-match on an `event` field for `"live"` |
| TestCalendar | Alternate calendar (Syncfusion) | `/calendar` (same call) | n/a | **dead code**, see below |
| SearchResults | Search results | `/search` | guest | — |
| FAQs, AboutUs, PrivacyPolicy, TermsAndConditions | Static content screens | `/faqs`, `/contact_us` (x2, keyed by param), `/terms_conditions` | guest | near-identical boilerplate duplicated 5x rather than factored into a shared widget |
| AuctionGuide | HTML guide in WebView | `/auction_guide` | guest | intercepts in-page links to route to native screens (login/inventory) vs. external WebView |
| Payments | Deposit management, bank slip, card, map (1,725 lines) | `/customer/deposit`, `/customer/add_bank_slip`, `/customer/cradit_card` | logged-in | client-side max-deposit check against a **hardcoded `200000`** magic number; no try/catch around `int.parse` (crash risk on non-numeric input); success determined by string-matching `"successfully"` in response text |
| PayTabs | PayTabs checkout wrapper | none directly | logged-in context | wraps `WebViewScreen` with the PayTabs redirect URL |
| WebView | Generic in-app browser | none | n/a | **PayTabs return detection scrapes the loaded page's rendered HTML via `evaluateJavascript` and string-matches `"successfully"`** — no authoritative backend call to confirm payment (see [18-security-review.md SEC-023](18-security-review.md)) |
| displayDetailImage | Full-screen image gallery | none | n/a | **dead code** — only call sites are commented out |

## Dead/unused screens (confirmed by exhaustive call-site search)

- **`TestCalendar.dart`** — never imported/instantiated anywhere. A parallel prototype of `Calendar.dart` built on a different calendar package (`syncfusion_flutter_calendar` vs. the live screen's `calendar` package), whose tap handler only `print()`s with no navigation wired — an abandoned dev experiment left in the tree.
- **`reset_password.dart`** — never imported/instantiated anywhere, and makes zero API calls (pure static UI), unlike the actual working reset flow (`forgot_password_screen.dart` → `PasswordResetOTP.dart`, which does call the API). Looks like an earlier/alternate reset screen superseded but never deleted.
- **`displayDetailImage.dart`** — defined but every call site is commented out in both places that would use it.

All other 28 screens were confirmed reachable from `main.dart` outward.

## Duplicate/redundant logic

- `Calendar.dart` vs. `TestCalendar.dart` — same feature, two calendar packages, one dead.
- `reset_password.dart` vs. `PasswordResetOTP.dart` — same feature, one dead.
- **The "did the API call succeed" check is independently re-implemented ~8 times** (login, register, ChangePassword, forgot-password, PasswordResetOTP, Payments, WebView) as "does the response message contain this hardcoded English OR Arabic string" rather than using a shared status code/boolean from the API — fragile to any backend wording change, and copy-pasted rather than centralized.
- The five static content screens (About/Privacy/Terms/FAQs/AuctionGuide) duplicate ~40 lines of loading/error boilerplate each rather than sharing a widget.

## Hardcoded values

- **`ApiConfig.dart`**: the active `baseURL` is `https://pas3.mindzbase.com`, with the apparent real production domain (`https://pioneerauctions.ae`), a staging domain, and a raw dev LAN IP all commented out in the same file. No build-flavor/environment mechanism exists — switching backends means hand-editing this file and rebuilding. See [18-security-review.md SEC-028](18-security-review.md) for why this matters for interpreting the rest of this review.
- `Payments.dart`: max deposit `200000` hardcoded with no named constant, no currency/unit comment, and (unlike the paired minimum, which is server-supplied) no server config source.
- `ApiServices.dart::getYears()`: a vehicle-year dropdown range generated client-side rather than fetched from the server.
- Hardcoded Arabic success-message strings embedded directly in Dart source in three screens, duplicating the localization system already in use elsewhere.
- `AppConstants.dart` hardcodes business category names (`"Online Vehicle Auction"`, `"Salvage"`) as string constants compared directly against API data, rather than using category IDs.
- Contact email hardcoded in `sidebar_screen.dart` rather than sourced from the `contact_us` content already fetched elsewhere.

No hardcoded API keys/secrets for Pusher, PayTabs, social login, or FCM were found in the Dart source reviewed — those are presumably in native platform config files (`google-services.json`, `Info.plist`, etc.) outside `lib/`, not reviewed in this pass.

## Client-side logic that looks security-sensitive (server-side re-validation unconfirmed from this pass)

- **Deposit/bid ceiling computed client-side** (`depositLimit = balance * percentage`) and the hardcoded `200000` max-deposit check — gate what the UI *offers*, not confirmed whether the backend independently re-enforces the same ceiling.
- **Bid amount/price fields are client-supplied** in every bid-submission call (`current_price`, `bid_amount`, `bid_limit`) — consistent with, and now cross-confirmed by, the increment-trust gap independently found in [06-bidding-engine.md §1/§10](06-bidding-engine.md).
- `placeAutoBid` posts to the **same endpoint** as a normal bid (dispatch is presumably by payload shape — `bid_limit` presence — rather than by route), which is an easy place for client/server logic to silently drift apart.
- **Payment success is determined entirely client-side, twice over**: `Payments.dart` checks the deposit-request response text for `"successfully"` before even opening the PayTabs WebView, then `WebView.dart` separately scrapes the *rendered HTML* of the PayTabs return page for the same substring to decide whether to report success — with no follow-up call to the backend to authoritatively confirm the payment was recorded. This is the single most notable client/server-trust gap in the screens layer, and it directly corroborates the server-side gap independently found in the integrations review ([18-security-review.md SEC-023](18-security-review.md)): neither side of this specific payment flow performs an authoritative check.
- **Auth token + full PII (name, email, phone, address, city/state/country) stored in plain `SharedPreferences`**, not secure/encrypted storage — see [18-security-review.md SEC-027](18-security-review.md).
- **No app-level route guards** — "auth required" is enforced only by the sidebar hiding menu entries and by individual screens sending a Bearer token that the server presumably rejects if invalid; nothing stops a modified client from constructing an authenticated screen directly without a token. This is standard for a JWT+401 architecture, but it means all real enforcement is assumed to live server-side and wasn't independently visible from the mobile codebase alone.
- Registration/OTP/item-submission screens have little to no client-side validation that actually blocks submission (the `register_screen` bug above, and `AddNewItem`'s unenforced "required" flags) — malformed data reaching the server relies entirely on server-side validation actually being present and correct.

## Full API endpoint surface used by the app

```
/api/v1/livehall/getAucStatusById
/api/v1/registerUser  /verifyOtp  /resendOtp  /loginUser
/api/v1/google_login_register  /fb_login_register  /apple_login_register
/api/v1/forgotPassword  /updatePassword  /changePassword
/api/v1/customer/profile  /customer/select_doc_type  /customer/save_profile_image
/api/v1/customer/update_profile  /save_user_documents
/api/v1/token_update
/api/v1/AllFeaturedItems  /all_categories  /search  /AllHomeListing2
/api/v1/online-auction/details  /placebid  /placebidfinal  /userBids2
/api/v1/wishList  /getWishList2  /getAuctionItems
/api/v1/live-online/{auctionId}  /get_current_lot  /get_all_lots  /get_winning_lots
/api/v1/get_bid_log  /broadcast_pusher/{itemId}/{auctionId}  /place_bid_live
/api/v1/terms_conditions  /contact_us  /faqs  /auction_guide
/api/v1/inventory  /sell_item  /get_subcategories  /get_item_fields
/api/v1/get_makes_options  /get_model_options  /save_item  /save_item_file_images
/api/v1/customer/deposit  /customer/add_bank_slip  /customer/cradit_card
/api/v1/notify_me  /calendar  /lang_{code}
```

Note: `/token_update` is used by the app itself, not just a theoretical attack surface — see [18-security-review.md SEC-012](18-security-review.md) for why this endpoint is critical regardless of legitimate client usage. Two endpoints are defined but effectively unused client-side: `get_current_lot` (no call site found) and `AllFeaturedItems` (implemented but its one call site is commented out, superseded by the combined `AllHomeListing2` payload).

## Config files

- **`AppConstants.dart`** (no secrets) — SharedPreferences key names for profile fields; category-name string constants; a set of mutable global boolean/int "flags" (`isSalvage`, `isVehicle`, `autoBidCheck`, etc.) used as ad hoc cross-screen state rather than real feature flags; language-preference helpers.
- **`Constants.dart`** (no secrets) — purely a typography style sheet (Google Fonts `TextStyle` definitions + brand hex colors); not a configuration file despite the similar name to `AppConstants.dart` — screens consistently use the correct one, no bypass found.
