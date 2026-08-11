# 01 — System Map

Status: DRAFT — high-level view. See [02-repository-inventory.md](02-repository-inventory.md) for full detail behind every claim here.

## Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PIONEER AUCTIONS WEB & PORTAL CODE                   │
│                  (flat folder, NOT under git version control)           │
└─────────────────────────────────────────────────────────────────────────┘

 ┌───────────────────────────────────────────────────────────────────┐
 │  pioneer-web-main  —  CodeIgniter 3.1.10 (PHP, HMVC modules)        │
 │  ONE monolith serving FOUR faces from ~30 application/modules/*:    │
 │                                                                      │
 │   • Public website        (home, visitor, search, cms, template)   │
 │   • Customer account area (customer, users partial, files)         │
 │   • REST API — "getapi"   (mounted at /api/v1/*, mobile+web client) │
 │   • Admin / back office    (admin, user, users, acl, crm, sales,    │
 │     / auctioneer console     accounts, transaction, reports,        │
 │                               jobcard, live_auction_controller,     │
 │                               livehall, cronjob)                    │
 │                                                                      │
 │  Core domain modules: auction, items, cars, valuation               │
 │  Suspected dead code: auction_____, api, apis (see doc 02 §6)       │
 │  Deploy target (inferred): AWS EC2 + CodeDeploy (appspec.yml)       │
 └───────────────────────────────────────────────────────────────────┘
              ▲                    ▲                     ▲
       REST (/api/v1/*)     REST (/api/v1/*)      Pusher Channels
       + browser HTTP                                (realtime bids)
              │                    │                     │
 ┌────────────┴───────┐  ┌─────────┴──────────┐  ┌───────┴────────────┐
 │  Public website      │  │ pioneer-mobile-app │  │  Browsers in the   │
 │  (browser, server-   │  │  -main — Flutter,   │  │  live auction hall │
 │  rendered CI views)  │  │  v1.5.0+1            │  │  (Pusher client)   │
 └───────────────────────┘  │  "Vehicle Auction"  │  └────────────────────┘
                             │  provider state mgmt│
                             └──────────────────────┘

 ┌───────────────────────────┐      ┌──────────────────────────────────┐
 │ pa-chatbot-admin-samin      │◄────►│ pioneer-chatbot-webhook-webhook   │
 │ React (CRA) admin console   │ (rel │ Node.js WhatsApp Business API     │
 │ for chat agents              │  -n │ webhook (relationship to main     │
 │ Jenkins + Docker + nginx    │  ship│ platform: UNCONFIRMED)            │
 │ deploy tooling               │ TBD)│                                    │
 └───────────────────────────┘      └──────────────────────────────────┘

 Credential bundle (not an app): Revoked Key.zip — APNs auth key,
 Android upload keystore + debug keystore, upload certificate.
 Inspected read-only; contents not reproduced in these docs.
```

## Inferred integration points (to be confirmed phase-by-phase)

| Integration | Evidence so far | Confirmed in |
|---|---|---|
| Pusher Channels (realtime bidding) | `pusher_channels_flutter` dependency in mobile app; `getapi/Getapi/broadcast_pusher` route | Phase 10 |
| PayTabs (payment gateway) | `Screens/PayTabs.dart` in mobile app; `getapi/Getapi/paytabsReturnURL`, `cradit_card` routes | Phase 12 |
| Firebase Cloud Messaging (push) | `firebase-messaging-sw.js` at web root; `getapi/Fcm` controller; `update_fcm`/`fcm_to_email` routes | Phase 12 |
| Instagram | dedicated `application/config/instagram_api.php` | Phase 12 |
| WhatsApp Business API | dedicated `pioneer-chatbot-webhook-webhook` service | Phase 12 |
| Social login (Google/Facebook/Apple) | mobile deps (`google_sign_in`, `flutter_facebook_auth`, `sign_in_with_apple`) + matching `getapi` routes (`fb_login_register`, `google_login_register`, `apple_login_register`) | Phase 3/12 |
| JWT-based API auth | `jwt_decoder` in mobile app | Phase 3/13 |
| Memcached | `application/config/memcached.php` present | Phase 12 (confirm still in use) |
| AWS (EC2 + CodeDeploy) | `appspec.yml`, `deploy.php` at web root | Phase 12/DevOps |

## What Phase 1 has NOT yet established (deferred to later phases)

- Exact production database engine/version (no `database.php` in the export)
- Whether `api`/`apis`/`auction_____` modules are truly unreachable dead code or latent attack surface
- The live auction "authority" question: which of `getapi` (bidder-facing), `live_auction_controller` (operator console), and `livehall` is the actual source of truth for lot/bid state, and how they reconcile
- Full role/permission model (owned by `acl` module — Phase 3)
- Whether the two chatbot services are still active parts of the business or a parked side project
