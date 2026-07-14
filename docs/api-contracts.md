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

Machine-consumable types begin in `packages/contracts`. Task 002 adds runtime schemas, generated OpenAPI, examples, and compatibility tests.

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

| Method | Path                      | Purpose                                                        |
| ------ | ------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/uae-pass/start`    | Create authorization request with PKCE/state                   |
| GET    | `/auth/uae-pass/callback` | Provider callback; establishes client redirect result          |
| POST   | `/auth/otp/request`       | Request fallback phone/email OTP                               |
| POST   | `/auth/otp/verify`        | Verify OTP and issue session                                   |
| POST   | `/auth/refresh`           | Rotate refresh session                                         |
| POST   | `/auth/logout`            | Revoke current refresh session                                 |
| GET    | `/me`                     | Profile, locale, KYC, bidding eligibility summary              |
| PATCH  | `/me/preferences`         | Locale, timezone, theme, numeral and notifications preferences |
| GET    | `/me/kyc`                 | KYC state and next permitted action                            |
| POST   | `/me/kyc/sessions`        | Start fallback KYC provider session                            |

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

| Method | Path                        | Purpose                                |
| ------ | --------------------------- | -------------------------------------- |
| POST   | `/lots/:lotId/bids`         | Place manual/custom bid                |
| PUT    | `/lots/:lotId/proxy-bid`    | Create/raise proxy maximum             |
| GET    | `/lots/:lotId/my-proxy-bid` | Private active proxy status/max        |
| DELETE | `/lots/:lotId/proxy-bid`    | **OPEN:** cancel only if policy allows |
| POST   | `/lots/:lotId/offers`       | Submit an eligible make-an-offer       |
| GET    | `/me/bids`                  | Active/won/lost activity               |
| GET    | `/me/offers`                | Pending/accepted/rejected offers       |
| GET    | `/me/watchlist`             | Watched lots                           |
| GET    | `/me/notifications`         | In-app notification feed               |

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

| Method         | Path                                     | Purpose                                        |
| -------------- | ---------------------------------------- | ---------------------------------------------- |
| GET/POST/PATCH | `/admin/lots...`                         | Lot CRUD, media/docs, feature flags            |
| GET/POST/PATCH | `/admin/auctions...`                     | Auction scheduling/configuration               |
| POST           | `/admin/auctions/:id/pause`              | Audited pause with reason                      |
| POST           | `/admin/auctions/:id/resume`             | Audited resume with timing decision            |
| POST           | `/admin/auctions/:id/cancel`             | Audited cancel                                 |
| GET            | `/admin/final-bid-approvals`             | Approval queue with SLA                        |
| POST           | `/admin/final-bid-approvals/:id/approve` | Confirm hammer and generate obligations        |
| POST           | `/admin/final-bid-approvals/:id/reject`  | Reject with structured reason; price unchanged |
| GET/POST       | `/admin/offer-decisions...`              | Offer queue and decisions                      |
| GET/POST       | `/admin/consignment-reviews...`          | Listing moderation                             |
| GET/POST       | `/admin/deposit-actions...`              | Holds, applications, permitted refunds         |
| GET            | `/admin/audit-events`                    | Filtered immutable audit view                  |

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
  "correlationId": "01J2…",
  "result": {
    "lotId": "5ed…",
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
  "correlationId": "01J2…",
  "error": {
    "code": "BID_TOO_LOW",
    "message": "The current bid changed. The next bid is AED 53,000.",
    "retryable": true
  },
  "latest": {
    "lotId": "5ed…",
    "sequence": 42,
    "currentBid": { "currency": "AED", "amountFils": 5200000 },
    "nextMinimumBid": { "currency": "AED", "amountFils": 5300000 },
    "closesAt": "2026-07-14T17:02:00.000Z"
  }
}
```

Authentication/authorization and malformed payloads still use appropriate HTTP 4xx responses.

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
      latest?: LotPublicState;
    };
```

Transport timeout means “unknown,” not “rejected.” The client retries the same `commandId` or syncs; it must never create a new command blindly.

## 9. Server events

All lot-scoped events include this envelope:

```ts
interface LotEventEnvelope<TName extends string, TData> {
  contractVersion: 1;
  eventId: Uuid;
  event: TName;
  lotId: Uuid;
  auctionId: Uuid;
  sequence: number;
  occurredAt: IsoDateTime;
  correlationId: string;
  data: TData;
}
```

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
type BidAcceptedEvent = LotEventEnvelope<
  "bid:accepted",
  {
    bidId: Uuid;
    amount: Money;
    bidderAlias: string;
    bidKind: "MANUAL" | "PROXY";
    currentBid: Money;
    nextMinimumBid: Money;
    bidCount: number;
    reserveStatus: ReserveStatus;
  }
>;
```

One command may produce multiple ordered `bid:accepted` events while resolving proxies. The command acknowledgement points to the final resulting sequence/state.

### `auction:extended`

```ts
type AuctionExtendedEvent = LotEventEnvelope<
  "auction:extended",
  {
    previousClosesAt: IsoDateTime;
    closesAt: IsoDateTime;
    extensionMs: number;
    extensionCount: number;
    reason: "QUALIFYING_BID_IN_SOFT_CLOSE_WINDOW";
  }
>;
```

Extension is emitted as its own sequence after the bid event that caused it.

### `auction:state-changed`

```ts
type AuctionStateChangedEvent = LotEventEnvelope<
  "auction:state-changed",
  {
    previousLifecycle: LotPublicState["lifecycle"];
    lifecycle: LotPublicState["lifecycle"];
    closesAt: IsoDateTime;
    reasonCode?: string;
    approvalSlaDueAt?: IsoDateTime;
  }
>;
```

### `reserve:status-changed`

```ts
type ReserveStatusChangedEvent = LotEventEnvelope<
  "reserve:status-changed",
  { reserveStatus: "MET" }
>;
```

Only the one-way public transition to `MET` is normally emitted. Reserve amount remains private.

### `lot:presence-changed`

```ts
type LotPresenceChangedEvent = LotEventEnvelope<
  "lot:presence-changed",
  { approximateViewerCount: number }
>;
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
    currentBid: Money;
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
- Higher custom bids are accepted if aligned with configured policy. **OPEN:** decide whether any amount above minimum is valid or must align to increment steps.
- A leader may bid again only when it raises their committed visible amount or proxy maximum according to policy.

### Proxy bid

- `maximum` must be at least the current `nextMinimumBid`.
- The maximum is secret to its owner and authorized staff; it is never included in public history/events.
- The engine exposes only the minimum visible amount needed for the highest-priority maximum to lead, bounded by that maximum.
- Proposed tie rule: earlier registered equal maximum has priority.
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
    closesAt = max(closesAt, acceptedAt) + extensionMs
```

The bid decision and updated close time are atomic. The close worker must fence against the same lot decision boundary and re-check `closesAt` after acquiring it. Client receipt time never changes eligibility.

**OPEN:** Confirm whether the new close is `previousClosesAt + extensionMs` or `acceptedAt + extensionMs`. The proposed formula above effectively uses `previousClosesAt + extensionMs` for on-time bids and avoids shortening time.

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

- classify additive vs breaking;
- update this document and runtime schemas;
- add examples and compatibility tests;
- update web, admin, and Flutter consumer fixtures;
- record semantics in `docs/decisions-log.md`;
- define rollout order and minimum supported client version for breaking behavior.
