# API and real-time contracts

Status: version 1 draft for implementation. Product/legal decisions marked **OPEN** must be closed before production, but clients may scaffold against the proposed shapes.

## 1. Contract rules

- REST base path: `/api/v1`.
- Socket.IO namespace: `/auctions/v1`.
- JSON field names use `camelCase`.
- IDs are opaque UUID strings. Clients never parse business meaning from IDs.
- Money is `{ "currency": "AED", "amountFils": 5200000 }`. `amountFils` is a safe JSON integer and never a float.
- Timestamps are UTC ISO 8601 with milliseconds, for example `2026-07-14T16:30:00.000Z`.
- Durations are integer milliseconds with an `Ms` suffix.
- Every response/event includes `contractVersion: 1` where shown.
- REST mutations accept `Idempotency-Key: <uuid>` and return the original semantic result on replay.
- Socket commands include a UUID `commandId`; acknowledgements are replay-safe for the authenticated user.
- Lot events are ordered by an integer `sequence` that increases monotonically within one lot.
- The server is authoritative. Client clocks/countdowns are display aids only.

The executable source is the Zod schema package at `packages/contracts`. It exports inferred TypeScript types and typed Socket.IO maps for API, web, and admin. Generated artifacts are checked in at:

- `packages/contracts/openapi/v1.json` — OpenAPI 3.1 inventory for every REST path below; contracted endpoints have full request/response schemas and planned endpoints are explicitly marked with `x-implementation-status: planned`.
- `packages/contracts/schemas/v1/golden-fixtures.schema.json` — JSON Schema used for cross-language generation.
- `packages/contracts/dart/lib/pioneer_contracts.dart` — generated Dart models; do not hand-edit.
- `packages/contracts/fixtures/v1` — valid, invalid, and cross-language golden payloads.

The API exposes the same checked-in document at `GET /api/v1/openapi.json`. Run `pnpm --filter @pioneer/contracts generate` after an intentional schema change. Tests fail when generated files, examples, fixtures, or the documented REST inventory drift.

## 2. Common types

```ts
type ContractVersion = 1;
type Currency = "AED";
type IsoDateTime = string;
type Uuid = string;

interface Money {
  currency: Currency;
  amountFils: number;
}

interface PageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
}

interface ApiError {
  contractVersion: ContractVersion;
  error: {
    code: ErrorCode;
    message: string; // localized for display when safe
    correlationId: string;
    fieldErrors?: Array<{ field: string; code: string; message: string }>;
    retryable: boolean;
    retryAfterMs?: number;
  };
}
```

`message` is not a programmatic contract; clients branch on `code`.

### Stable error codes

```text
AUTH_REQUIRED
AUTH_FORBIDDEN
ACCOUNT_RESTRICTED
KYC_REQUIRED
KYC_PENDING
DEPOSIT_REQUIRED
DEPOSIT_INSUFFICIENT
TERMS_ACCEPTANCE_REQUIRED
AUCTION_NOT_LIVE
AUCTION_PAUSED
AUCTION_CLOSED
LOT_NOT_FOUND
LOT_NOT_BIDDABLE
BID_TOO_LOW
BID_AMOUNT_INVALID
PROXY_MAX_TOO_LOW
OFFER_NOT_ALLOWED
COMMAND_CONFLICT
RATE_LIMITED
PROVIDER_UNAVAILABLE
VALIDATION_FAILED
INTERNAL_ERROR
```

## 3. Public domain model

### Auction lifecycle

```text
DRAFT → SCHEDULED → LIVE ↔ PAUSED → CLOSING → CLOSED → PENDING_APPROVAL
                                                      ├→ APPROVED
                                                      └→ REJECTED

Any pre-close state may transition to CANCELLED through an authorized, audited command.
```

`CLOSING` is an internal guard while the close worker serializes against bids. Public clients normally see `LIVE`, `PAUSED`, `CLOSED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, or `CANCELLED`.

### Reserve status

```ts
type ReserveStatus = "NOT_APPLICABLE" | "NOT_MET" | "MET";
```

The reserve amount is never returned by public endpoints/events.

### User-relative bid status

```ts
type MyBidStatus =
  | "NOT_BIDDING"
  | "WINNING"
  | "OUTBID"
  | "WON_PENDING_APPROVAL"
  | "WON"
  | "LOST";
```

Public snapshots may be cached and omit `myBidState`. Authenticated/user-scoped snapshots include it.

## 4. REST endpoints

This is the MVP surface. Additive response fields are allowed within v1; removals or semantic changes require v2.

### Identity and profile

| Method | Path                       | Purpose                                                        |
| ------ | -------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/uae-pass/start`     | Create authorization request with PKCE/state                   |
| GET    | `/auth/uae-pass/callback`  | Provider callback; establishes client redirect result          |
| POST   | `/auth/otp/request`        | Request fallback phone/email OTP                               |
| POST   | `/auth/otp/verify`         | Verify OTP and issue session                                   |
| POST   | `/auth/refresh`            | Rotate refresh session                                         |
| POST   | `/auth/logout`             | Revoke current refresh session                                 |
| GET    | `/me`                      | Profile, locale, KYC, bidding eligibility summary              |
| GET    | `/me/preferences`          | Get profile preferences                                        |
| PATCH  | `/me/preferences`          | Locale, timezone, theme, numeral and notifications preferences |
| POST   | `/me/device-tokens`        | Register device push token                                     |
| DELETE | `/me/device-tokens/:token` | Unregister device push token                                   |
| GET    | `/me/kyc`                  | KYC state and next permitted action                            |
| POST   | `/me/kyc/sessions`         | Start fallback KYC provider session                            |
| POST   | `/me/kyc/submit`           | Submit Emirates ID KYC verification                            |

### Catalog and auctions

| Method | Path                             | Purpose                                                        |
| ------ | -------------------------------- | -------------------------------------------------------------- |
| GET    | `/categories`                    | Localized category tree and filter definitions                 |
| GET    | `/auctions`                      | Cursor list filtered by lifecycle/date/category                |
| GET    | `/auctions/:auctionId`           | Auction metadata, terms version, timing, soft-close disclosure |
| GET    | `/auctions/:auctionId/lots`      | Cursor list of lots                                            |
| GET    | `/lots`                          | Search/filter/sort lots                                        |
| GET    | `/lots/:lotId`                   | Full public lot details and bid snapshot                       |
| GET    | `/lots/:lotId/bids`              | Pseudonymized public bid history                               |
| GET    | `/lots/:lotId/snapshot`          | Authoritative reconnect snapshot; supports `?afterSequence=N`  |
| POST   | `/lots/:lotId/watch`             | Watch lot                                                      |
| DELETE | `/lots/:lotId/watch`             | Unwatch lot                                                    |
| POST   | `/lots/:lotId/terms-acceptances` | Accept immutable terms version before bidding                  |

Initial implementation note: `GET /lots` currently supports the homepage lot-card slice and returns `{ contractVersion: 1, items: PublicLotCard[] }`. `PublicLotCard` includes `lotId`, `auctionId`, localized titles, `lotNumber`, `lifecycle`, `closesAt`, public `currentBid`, public `nextMinimumBid`, and `reserveStatus`. It intentionally omits reserve price, proxy maxima, bidder identity, KYC data, admin notes, and increment-policy internals. Cursor pagination/filter fields remain planned for the full buyer-loop task.

### Eligibility, deposits, and payments

| Method | Path                           | Purpose                             |
| ------ | ------------------------------ | ----------------------------------- |
| GET    | `/me/eligibility?lotId=...`    | Explain current bidding eligibility |
| GET    | `/me/deposits`                 | Deposit balances/holds and rules    |
| GET    | `/me/transactions`             | Cursor ledger view                  |
| POST   | `/deposit-payment-intents`     | Create hosted payment intent        |
| GET    | `/deposit-payment-intents/:id` | Poll after hosted-return flow       |
| POST   | `/deposit-refund-requests`     | Request permitted refund/withdrawal |
| GET    | `/me/invoices`                 | VAT-compliant invoices/receipts     |

Provider webhooks live under authenticated provider-specific paths and are not client contracts.

### Bids, proxy bids, offers, and activity

Socket commands are preferred while connected. Equivalent REST commands support accessibility, recovery, and clients without a healthy socket.

| Method | Path                         | Purpose                                      |
| ------ | ---------------------------- | -------------------------------------------- |
| POST   | `/lots/:lotId/bids`          | Place manual/custom bid                      |
| PUT    | `/lots/:lotId/proxy-bid`     | Create/raise proxy maximum                   |
| GET    | `/lots/:lotId/my-proxy-bid`  | Private active proxy status/max              |
| DELETE | `/lots/:lotId/proxy-bid`     | MVP endpoint exists and rejects cancellation |
| POST   | `/lots/:lotId/offers`        | Submit an eligible make-an-offer             |
| GET    | `/me/bids`                   | Active/won/lost activity                     |
| GET    | `/me/offers`                 | Pending/accepted/rejected offers             |
| GET    | `/me/watchlist`              | Watched lots                                 |
| GET    | `/me/notifications`          | In-app notification feed                     |
| POST   | `/me/notifications/:id/read` | Mark notification read                       |
| POST   | `/me/notifications/read-all` | Mark all notifications read                  |

### Seller MVP/v1 boundary

| Method | Path                          | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| POST   | `/seller/listings`            | Create draft                     |
| PATCH  | `/seller/listings/:id`        | Autosave allowed draft fields    |
| POST   | `/seller/listings/:id/media`  | Create presigned upload          |
| POST   | `/seller/listings/:id/submit` | Submit immutable review revision |
| GET    | `/seller/listings`            | Seller listing statuses          |
| GET    | `/seller/sales`               | Sold/unsold and payout status    |

### Admin

Admin paths require RBAC and audit metadata. Destructive/financial actions may require step-up authentication.

| Method | Path                                     | Purpose                                        |
| ------ | ---------------------------------------- | ---------------------------------------------- |
| GET    | `/admin/dashboard`                       | Operations dashboard metrics and queue counts  |
| GET    | `/admin/lots`                            | List lots for operations                       |
| POST   | `/admin/lots`                            | Create lot                                     |
| PATCH  | `/admin/lots/:id`                        | Update lot, media/docs, feature flags          |
| GET    | `/admin/auctions`                        | List auctions for operations                   |
| POST   | `/admin/auctions`                        | Create auction schedule/configuration          |
| PATCH  | `/admin/auctions/:id`                    | Update auction schedule/configuration          |
| POST   | `/admin/auctions/:id/pause`              | Audited pause with reason                      |
| POST   | `/admin/auctions/:id/resume`             | Audited resume with timing decision            |
| POST   | `/admin/auctions/:id/cancel`             | Audited cancel                                 |
| GET    | `/admin/final-bid-approvals`             | Approval queue with SLA                        |
| POST   | `/admin/final-bid-approvals/:id/approve` | Confirm hammer and generate obligations        |
| POST   | `/admin/final-bid-approvals/:id/reject`  | Reject with structured reason; price unchanged |
| GET    | `/admin/offer-decisions`                 | Offer queue                                    |
| POST   | `/admin/offer-decisions/:id`             | Record offer decision                          |
| GET    | `/admin/consignment-reviews`             | Listing moderation queue                       |
| POST   | `/admin/consignment-reviews/:id`         | Record listing moderation decision             |
| GET    | `/admin/deposit-actions`                 | Deposit operations queue                       |
| POST   | `/admin/deposit-actions/:id`             | Record hold/application/permitted refund       |
| GET    | `/admin/audit-events`                    | Filtered immutable audit view                  |

## 5. REST bid example

Request:

```http
POST /api/v1/lots/5ed…/bids
Authorization: Bearer <access-token>
Idempotency-Key: 835cb208-e936-4e0c-9863-c85a96f2ff60
Content-Type: application/json
```

```json
{
  "amount": { "currency": "AED", "amountFils": 5200000 },
  "expectedSequence": 41,
  "termsVersionId": "5d51a5fd-e2b4-4fe8-a5e0-58d075cc122d"
}
```

Accepted (`201`):

```json
{
  "contractVersion": 1,
  "commandId": "835cb208-e936-4e0c-9863-c85a96f2ff60",
  "status": "ACCEPTED",
  "correlationId": "corr-rest-bid",
  "serverTime": "2026-07-14T17:00:00.000Z",
  "result": {
    "lotId": "11111111-1111-4111-8111-111111111111",
    "sequence": 42,
    "currentBid": { "currency": "AED", "amountFils": 5200000 },
    "nextMinimumBid": { "currency": "AED", "amountFils": 5300000 },
    "myBidStatus": "WINNING",
    "reserveStatus": "MET",
    "closesAt": "2026-07-14T17:02:00.000Z",
    "extended": true
  }
}
```

Rejected bid commands return a semantic result rather than using transport failure for expected auction races:

```json
{
  "contractVersion": 1,
  "commandId": "835cb208-e936-4e0c-9863-c85a96f2ff60",
  "status": "REJECTED",
  "correlationId": "corr-rest-bid",
  "serverTime": "2026-07-14T17:00:00.000Z",
  "error": {
    "code": "BID_TOO_LOW",
    "message": "The current bid changed. The next bid is AED 53,000.",
    "retryable": true
  },
  "latest": {
    "lotId": "11111111-1111-4111-8111-111111111111",
    "sequence": 42,
    "currentBid": { "currency": "AED", "amountFils": 5200000 },
    "nextMinimumBid": { "currency": "AED", "amountFils": 5300000 },
    "closesAt": "2026-07-14T17:02:00.000Z"
  }
}
```

Authentication/authorization and malformed payloads still use appropriate HTTP 4xx responses.

## 5b. Authenticated KYC REST endpoints

Base path: `/api/v1/me/kyc`

All KYC endpoints require authentication (`x-pioneer-test-account-id` header or Bearer session token). Missing, invalid, or unresolvable account context returns 401 Unauthorized. Database or provider outages fail closed, returning 503 `PROVIDER_UNAVAILABLE` with `retryable: true`, and never report `VERIFIED`.

### `GET /api/v1/me/kyc`

Returns the authenticated account's current KYC status.

Response (`200 OK`):

```json
{
  "contractVersion": 1,
  "status": "UNVERIFIED",
  "bidderNumber": "Paddle #192f"
}
```

- Status enum: `UNVERIFIED` | `PENDING` | `VERIFIED` | `REJECTED`.
- `bidderNumber` is present only when status is `VERIFIED`.

### `POST /api/v1/me/kyc/sessions`

Initializes a provider KYC session for the authenticated account.

Response (`201 Created`):

```json
{
  "contractVersion": 1,
  "sessionId": "session-12345",
  "status": "PENDING"
}
```

### `POST /api/v1/me/kyc/submit`

Submits Emirates ID verification details and document references. All date fields strictly use ISO-8601 calendar date strings (`YYYY-MM-DD`).

Request (`POST /api/v1/me/kyc/submit`):

```json
{
  "emiratesIdNumber": "784-1992-1234567-1",
  "fullNameEn": "Ahmed Al Mansoori",
  "dateOfBirth": "1992-05-15",
  "expiryDate": "2028-05-14",
  "nationality": "United Arab Emirates",
  "cardFrontRef": "doc-front-001",
  "cardBackRef": "doc-back-002"
}
```

Response (`200 OK`):

```json
{
  "contractVersion": 1,
  "status": "PENDING"
}
```

Validation rules:

- `emiratesIdNumber`: strictly formatted as `784-YYYY-XXXXXXX-Z`.
- `dateOfBirth`: must be an ISO calendar date (`YYYY-MM-DD`) in the past.
- `expiryDate`: must be an ISO calendar date (`YYYY-MM-DD`) in the future.
- `cardFrontRef`, `cardBackRef`: uploaded document object references.

## 5c. Security deposits, payment intents, and refund REST endpoints

Base paths:

- `/api/v1/me/deposits`
- `/api/v1/deposit-payment-intents`
- `/api/v1/deposit-refund-requests`
- `/api/v1/admin/deposit-actions`

All buyer-facing deposit and payment endpoints require authentication (`x-pioneer-test-account-id` header or Bearer session token). Admin endpoints require administrative credentials. Webhook endpoints (`/api/v1/webhooks/payments/:provider`) require valid HMAC-SHA256 signatures from the configured provider and operate behind server-to-server security boundaries.

### `GET /api/v1/me/deposits`

Returns the authenticated account's current deposit balance, ledger transaction history, and active refund requests.

Response (`200 OK`):

```json
{
  "contractVersion": 1,
  "balance": {
    "availableFils": 500000,
    "currency": "AED",
    "heldFils": 0,
    "totalDepositedFils": 500000
  },
  "entries": [
    {
      "amountFils": 500000,
      "createdAt": "2026-07-14T17:00:00.000Z",
      "currency": "AED",
      "direction": "CREDIT",
      "id": "22222222-2222-4222-8222-222222222222",
      "reasonCode": "TOPUP_GATEWAY"
    }
  ],
  "refundRequests": []
}
```

### `POST /api/v1/deposit-payment-intents`

Creates a hosted checkout session intent for security deposit top-up. Card processing is strictly hosted off-platform.

Request (`POST /api/v1/deposit-payment-intents`):

```json
{
  "amount": {
    "currency": "AED",
    "amountFils": 500000
  },
  "returnUrl": "https://pioneerauctions.ae/account/deposits"
}
```

Response (`201 Created`):

```json
{
  "contractVersion": 1,
  "id": "pi_11111111-1111-4111-8111-111111111111",
  "provider": "dummy_payment",
  "redirectUrl": "https://checkout.dummy-pay.com/pay/pi_11111111-1111-4111-8111-111111111111",
  "status": "REQUIRES_ACTION",
  "amount": {
    "currency": "AED",
    "amountFils": 500000
  }
}
```

### `POST /api/v1/deposit-refund-requests`

Submits a request to withdraw unheld security deposit funds back to the original funding source. Follows a 3–5 business day settlement SLA.

Request (`POST /api/v1/deposit-refund-requests`):

```json
{
  "amount": {
    "currency": "AED",
    "amountFils": 200000
  },
  "reason": "Unused deposit refund"
}
```

Response (`201 Created`):

```json
{
  "contractVersion": 1,
  "refundRequest": {
    "amountFils": 200000,
    "currency": "AED",
    "estimatedSettlementDays": 5,
    "id": "33333333-3333-4333-8333-333333333333",
    "reason": "Unused deposit refund",
    "requestedAt": "2026-07-14T17:00:00.000Z",
    "status": "REQUESTED"
  }
}
```

## 5d. Transactional notifications and preferences REST endpoints

Base paths:

- `/api/v1/me/notifications`
- `/api/v1/me/preferences`
- `/api/v1/me/device-tokens`

All notification and preference endpoints require authenticated account context (`x-pioneer-test-account-id` header or Bearer session token).

### `GET /api/v1/me/notifications`

Returns the authenticated user's in-app notification feed with bilingual titles, localized bodies, deep links, read status, and unread count.

Response (`200 OK`):

```json
{
  "contractVersion": 1,
  "items": [
    {
      "bodyAr": "قام مزايد آخر بتقديم عرض أعلى على اللوت #101.",
      "bodyEn": "Another bidder placed a higher bid on Lot #101.",
      "createdAt": "2026-07-14T17:00:00.000Z",
      "deepLink": "/lot/11111111-1111-4111-8111-111111111111",
      "id": "44444444-4444-4444-8444-444444444444",
      "isRead": false,
      "titleAr": "تمت المزايدة عليك!",
      "titleEn": "You've been outbid!",
      "type": "OUTBID"
    }
  ],
  "unreadCount": 1
}
```

### `GET /api/v1/me/preferences`

Returns the authenticated user's channel toggles, notification category preferences, and quiet hours configuration.

Response (`200 OK`):

```json
{
  "contractVersion": 1,
  "emailEnabled": true,
  "notifyDeposits": true,
  "notifyEndingSoon": true,
  "notifyMarketing": false,
  "notifyOutbid": true,
  "pushEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursEnd": "07:00",
  "quietHoursStart": "22:00",
  "smsEnabled": false
}
```

### `POST /api/v1/me/device-tokens`

Registers a push notification device token (FCM for Android, APNs for iOS, or Web Push).

Request (`POST /api/v1/me/device-tokens`):

```json
{
  "platform": "ANDROID",
  "token": "fcm-registration-token-sample-value"
}
```

Response (`201 Created`):

```json
{
  "contractVersion": 1,
  "registered": true
}
```

## 6. Socket.IO connection and rooms

Namespace: `/auctions/v1`

Authentication is supplied in the Socket.IO handshake `auth.accessToken`. Anonymous users may subscribe to public lot state with stricter rate limits; bid commands require authentication.

After connect, the server emits:

```ts
interface ServerHello {
  contractVersion: 1;
  connectionId: string;
  serverTime: IsoDateTime;
  heartbeatIntervalMs: number;
  maxCommandSkewSequence: number;
}
```

Rooms are server-controlled:

- `lot:{lotId}` for sanitized lot state.
- `auction:{auctionId}` for auction lifecycle announcements.
- `user:{userId}` for private bid/eligibility/offer/payment events.
- privileged admin rooms are role-checked and never client-selected by raw name.

## 7. Client commands

Socket commands use acknowledgements. Command payloads share:

```ts
interface CommandMeta {
  contractVersion: 1;
  commandId: Uuid;
  sentAt: IsoDateTime; // diagnostic only; never acceptance time
}
```

### `lot:subscribe`

```ts
interface LotSubscribeCommand extends CommandMeta {
  lotId: Uuid;
  afterSequence?: number;
}
```

Acknowledgement contains `lot:snapshot`. Subscription is idempotent.

### `lot:unsubscribe`

```ts
interface LotUnsubscribeCommand extends CommandMeta {
  lotId: Uuid;
}
```

### `lot:sync`

```ts
interface LotSyncCommand extends CommandMeta {
  lotId: Uuid;
  afterSequence: number;
}
```

Server may return missing events if retained and contiguous, otherwise a full snapshot.

### `bid:place`

```ts
interface PlaceBidCommand extends CommandMeta {
  lotId: Uuid;
  amount: Money;
  expectedSequence: number;
  termsVersionId: Uuid;
}
```

`expectedSequence` detects stale UI but does not itself force rejection: the server evaluates the submitted amount against current state. If invalid, the acknowledgement includes `latest`.

### `proxy-bid:set`

```ts
interface SetProxyBidCommand extends CommandMeta {
  lotId: Uuid;
  maximum: Money;
  expectedSequence: number;
  termsVersionId: Uuid;
}
```

Only the authenticated bidder receives their maximum in the acknowledgement/personal event. Public events expose resulting visible bids, never proxy maxima or whether a bidder still has unused headroom.

### `presence:update`

```ts
interface PresenceUpdateCommand extends CommandMeta {
  lotId: Uuid;
  state: "VIEWING" | "BACKGROUND";
}
```

Presence/watch counts are approximate, rate-limited, and never part of bid correctness.

## 8. Command acknowledgement

```ts
type CommandAck<T> =
  | {
      contractVersion: 1;
      commandId: Uuid;
      status: "ACCEPTED";
      correlationId: string;
      serverTime: IsoDateTime;
      result: T;
    }
  | {
      contractVersion: 1;
      commandId: Uuid;
      status: "REJECTED";
      correlationId: string;
      serverTime: IsoDateTime;
      error: {
        code: ErrorCode;
        message: string;
        retryable: boolean;
        retryAfterMs?: number;
      };
      latest?: BidLatestState;
    };
```

For bid/proxy commands, `BidLatestState` is the minimum authoritative recovery shape: `lotId`, `sequence`, `currentBid`, `nextMinimumBid`, and `closesAt`. A client may receive additive fields and should tolerate them.

Transport timeout means “unknown,” not “rejected.” The client retries the same `commandId` or syncs; it must never create a new command blindly.

## 9. Server events

All lot-scoped events emitted to `lot:{lotId}` are flat payloads containing domain data and sequence identifiers directly on the event object (unlike personal events in §10 which nest domain state under `data`).

Common lot event fields:

- `event`: event name (e.g. `"bid:accepted"`, `"auction:state-changed"`)
- `auctionId`: Uuid
- `lotId`: Uuid
- `sequence`: monotonic per-lot sequence integer
- `contractVersion`: optional contract version (default 1)
- `occurredAt`: optional ISO timestamp
- `correlationId`: optional correlation ID
- `eventId`: optional unique event ID

Clients apply only an event whose sequence is exactly the current sequence + 1. Equal/older events are duplicates. A larger gap triggers `lot:sync`.

### `lot:snapshot`

Sent on subscribe/sync, not part of incremental numbering.

```ts
interface LotSnapshot {
  contractVersion: 1;
  event: "lot:snapshot";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  generatedAt: IsoDateTime;
  state: LotPublicState;
  myBidState?: MyBidState;
}

interface LotPublicState {
  lifecycle:
    | "SCHEDULED"
    | "LIVE"
    | "PAUSED"
    | "CLOSED"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";
  currentBid: Money | null;
  nextMinimumBid: Money;
  bidCount: number;
  reserveStatus: ReserveStatus;
  startsAt: IsoDateTime;
  closesAt: IsoDateTime;
  softClose: {
    enabled: boolean;
    windowMs: number;
    extensionMs: number;
    extensionCount: number;
  };
  approximateViewerCount?: number;
}

interface MyBidState {
  status: MyBidStatus;
  myHighestVisibleBid: Money | null;
  activeProxyMaximum: Money | null; // personal scope only
  eligibility: BidEligibility;
}
```

### `bid:accepted`

```ts
interface BidAcceptedEvent {
  event: "bid:accepted";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  amount: Money;
  currentBid: Money;
  nextMinimumBid: Money;
  bidKind: "MANUAL" | "PROXY";
  reserveStatus: ReserveStatus;
  extended: boolean;
  bidId?: Uuid;
  bidderAlias?: string;
  bidCount?: number;
}
```

One command may produce multiple ordered `bid:accepted` events while resolving proxies. The command acknowledgement points to the final resulting sequence/state.

### `auction:extended`

```ts
interface AuctionExtendedEvent {
  event: "auction:extended";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  closesAt: IsoDateTime;
  extensionCount: number;
  previousClosesAt?: IsoDateTime;
  extensionMs?: number;
  reason?: "QUALIFYING_BID_IN_SOFT_CLOSE_WINDOW";
}
```

Soft-close extension is surfaced either directly via `extended: true` on `bid:accepted` or via `auction:extended`.

### `auction:state-changed`

```ts
interface AuctionStateChangedEvent {
  event: "auction:state-changed";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  previousLifecycle: LotPublicState["lifecycle"];
  lifecycle: LotPublicState["lifecycle"];
  closesAt?: IsoDateTime;
  startsAt?: IsoDateTime;
  reasonCode?: string;
  approvalSlaDueAt?: IsoDateTime;
}
```

### `reserve:status-changed`

```ts
interface ReserveStatusChangedEvent {
  event: "reserve:status-changed";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  reserveStatus: "MET";
}
```

Only the one-way public transition to `MET` is normally emitted. Reserve amount remains private.

### `lot:presence-changed`

```ts
interface LotPresenceChangedEvent {
  event: "lot:presence-changed";
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  approximateViewerCount: number;
}
```

This event may be sampled and coalesced. Clients must not infer bid demand or guaranteed exact people counts.

## 10. Personal server events

Personal events use authenticated user rooms and do not participate in the public lot sequence unless they embed a resulting `lotSequence`.

### `bid:status-changed`

```ts
interface MyBidStatusChangedEvent {
  contractVersion: 1;
  eventId: Uuid;
  event: "bid:status-changed";
  occurredAt: IsoDateTime;
  correlationId: string;
  data: {
    lotId: Uuid;
    auctionId: Uuid;
    lotSequence: number;
    status: MyBidStatus;
    currentBid: Money | null;
    nextMinimumBid: Money;
    activeProxyMaximum: Money | null;
    closesAt: IsoDateTime;
  };
}
```

### `eligibility:changed`

```ts
interface BidEligibility {
  eligible: boolean;
  reasonCodes: Array<
    | "KYC_REQUIRED"
    | "KYC_PENDING"
    | "DEPOSIT_REQUIRED"
    | "DEPOSIT_INSUFFICIENT"
    | "TERMS_ACCEPTANCE_REQUIRED"
    | "ACCOUNT_RESTRICTED"
  >;
  requiredDeposit?: Money;
  eligibleDeposit?: Money;
  termsVersionId?: Uuid;
}
```

### `proxy-bid:changed`

Includes `lotId`, `lotSequence`, private `activeProxyMaximum`, status (`ACTIVE`, `EXCEEDED`, `CANCELLED`, `ENDED`), and current/next bid.

### `approval:changed`

Includes lot, outcome (`PENDING`, `APPROVED`, `REJECTED`), hammer price, SLA due time, structured reason when rejected, payment due time when approved, and deep-link target.

### `deposit:changed`, `payment:changed`, `offer:changed`, `notification:created`

These carry the relevant entity ID, state, display amount, timestamp, and deep-link target. They never contain raw provider tokens, card data, internal risk notes, or another user's information.

## 11. Bid and proxy resolution semantics

### Manual bid

- Must be at least `nextMinimumBid` at evaluation time.
- Higher custom bids are accepted only when aligned to the configured increment steps.
- A leader may bid again only when it raises their committed visible amount or proxy maximum according to policy.

### Proxy bid

- `maximum` must be at least the current `nextMinimumBid`.
- The maximum is secret to its owner and authorized staff; it is never included in public history/events.
- The engine exposes only the minimum visible amount needed for the highest-priority maximum to lead, bounded by that maximum.
- Tie rule: earlier registered equal maximum has priority.
- For MVP, an active proxy maximum may be created or raised only. Lowering or cancelling an active proxy maximum while the lot is live is not supported.
- `GET /lots/:lotId/my-proxy-bid` returns only the authenticated bidder's active proxy maximum, if one exists, plus latest public lot state needed to render the status. It never exposes another bidder's proxy maximum.
- `DELETE /lots/:lotId/proxy-bid` exists so clients receive an explicit versioned command rejection instead of a 404. For MVP it always rejects with non-retryable `VALIDATION_FAILED` because live proxy cancellation is not supported.
- A user receives immediate `OUTBID` if a higher/equal-priority proxy already defeats their maximum.
- Public history may label system-generated visible bids as `PROXY` without identifying remaining headroom.

Illustrative result, assuming AED 1,000 increment:

```text
Current AED 50,000; A has hidden max AED 55,000.
B manually bids AED 52,000.
Record B AED 52,000, then proxy A AED 53,000. A remains winning.
B sets max AED 60,000.
Resolve visible price to AED 56,000 with B winning; A is notified max exceeded.
```

Every visible ledger bid is recorded. Internal proxy-registration records are separately auditable and private.

## 12. Soft-close semantics

Configuration per auction/lot:

```ts
interface SoftClosePolicy {
  enabled: boolean;
  windowMs: number;
  extensionMs: number;
  maximumExtensions: number | null;
}
```

For an accepted qualifying bid at authoritative `acceptedAt`:

```text
if enabled
and acceptedAt < closesAt
and closesAt - acceptedAt <= windowMs
and extension limit is not exhausted:
    previousClosesAt = closesAt
    closesAt = previousClosesAt + extensionMs
```

The bid decision and updated close time are atomic. The close worker must fence against the same lot decision boundary and re-check `closesAt` after acquiring it. Client receipt time never changes eligibility.

MVP defaults are a 2-minute soft-close window and a 2-minute extension. Admin may override the extension policy per lot where a lot needs a different closing behavior.

## 13. Closing and approval semantics

- At `serverTime >= closesAt`, the close worker serializes with bids, transitions the lot out of `LIVE`, and publishes final public state.
- No later bid can be inserted, including delayed commands sent before close but evaluated after close.
- If reserve/approval rules require review, user status becomes `WON_PENDING_APPROVAL`; an explicit SLA due time is shown.
- Approval confirms the existing hammer price and creates payment obligations.
- Rejection cannot counteroffer or mutate hammer price in-place. A subsequent negotiated offer/relist is a distinct, fully disclosed workflow.
- Every admin decision stores actor, timestamp, reason code, optional note classification, before/after state, correlation ID, and step-up-auth context.

## 14. Reconnect algorithm for clients

1. Keep the last applied `sequence` per visible lot.
2. On reconnect, resubscribe with `afterSequence`.
3. Apply contiguous replay events or replace derived state with the returned snapshot.
4. If any event jumps beyond `sequence + 1`, stop applying that lot's incrementals and issue `lot:sync`.
5. Reconcile an unacknowledged command by retrying the same `commandId`; never infer acceptance from a public event alone.
6. Recompute countdown from `closesAt` plus server-time offset from the hello/snapshot; resync periodically and on foreground.

## 15. Rate limiting and abuse

- Rate limits are keyed by account, session/device, IP risk bucket, command type, and lot where appropriate.
- `RATE_LIMITED` includes `retryAfterMs`.
- Bid throttling must not silently queue commands past close; reject explicitly.
- Presence and analytics traffic have separate limits and cannot starve bid commands.
- Admin manual controls, failed auth, KYC, deposits, bids, and payments emit security/audit telemetry.

## 16. Versioning checklist

Before changing this contract:

- classify the change as additive or breaking;
- update this document and runtime schemas;
- add examples and compatibility tests;
- update web, admin, and Flutter consumer fixtures;
- record semantics in `docs/decisions-log.md`;
- define rollout order and minimum supported client version for breaking behavior.

Additive changes include optional object fields and new independent endpoints. V1 object decoders must ignore fields they do not use. Unknown event names and unknown required enum values are not silently coerced: clients log the contract mismatch, stop applying that message, and recover with a supported snapshot or upgrade path.

Breaking changes include removing or renaming a field, changing units or meaning, making an optional field required, changing command/event semantics, or introducing a required enum value without an agreed fallback. A breaking change requires a new `/api/vN` base path and `/auctions/vN` namespace. The rollout order is server dual-read/dual-publish support, compatible client releases, minimum-version enforcement after the documented adoption window, then old-version retirement. Mobile store review latency must be included in that window.

## 17. Dart generation and golden proof

Quicktype consumes the generated JSON Schema and emits Dart without semantic field renaming. Flutter should import or vendor the generated `pioneer_contracts.dart` file through its contracts package; application-specific view models may wrap it but must not redefine transport DTOs.

The shared proof decodes `Money`, `LotSnapshot`, `PlaceBidCommand`, and `CommandAck`, then performs a round trip:

```bash
dart analyze packages/contracts/dart
dart run packages/contracts/dart/test/golden_decode_test.dart
```

CI runs both commands with the pinned Dart SDK. Regeneration and the TypeScript contract tests must be committed together so a Dart diff is reviewable alongside the schema change.
