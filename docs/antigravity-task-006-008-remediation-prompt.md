# Antigravity remediation prompt — Mobile buyer loop, KYC, bidding authority, and M3 navigation

Copy everything below this line into Antigravity as the next implementation assignment.

---

## Mission

Continue Pioneer Auctions on the existing mobile branch and remediate every blocking issue found in the review of `bba6e1f..01ec557`. The current UI and tests are not sufficient for merge: bidding can still be simulated, KYC fails open, mobile screens overwrite authoritative prices, financial totals lose fils, and the new navigation is not fully localized or accessible.

Treat this as a correctness and safety pass, not a visual redesign. Preserve the approved Material 3 Expressive visual direction unless a change is required for accessibility, RTL, reduced motion, safe areas, or truthful user communication.

Do not mark Task 006 or Task 008 complete merely because tests pass. Completion requires the behavior and evidence listed in this prompt.

## Repository and branch

- Repository: `E:\Pioneer Dev\pioneer-auctions-product-ux-technical-rebuild`
- Remote: `https://github.com/Maazkhan88/Pioneer-Auctions`
- Branch: `agent/task-006-mobile-buyer-loop`
- Reviewed base: `bba6e1f`
- Reviewed HEAD: `01ec557`
- Review range: `bba6e1f..01ec557`

Remain on this branch unless the user explicitly requests another branch. Before editing, verify the current branch, HEAD, and working-tree status. Do not overwrite unexplained local changes.

## Required reading — read completely before editing

1. `AGENTS.md`
2. `docs/current-state.md`
3. `docs/api-contracts.md`
4. `docs/architecture.md`
5. `docs/quality-gates.md`
6. `docs/decisions-log.md`
7. `tasks/006-mobile-buyer-loop.md`
8. `tasks/008-identity-and-kyc.md`
9. `packages/contracts/src/core.ts`
10. `packages/contracts/src/commands.ts`
11. `packages/contracts/src/events.ts`
12. `packages/contracts/src/auction.ts`
13. `packages/contracts/src/rest.ts`
14. `apps/api/migrations/0001_week1_foundation.sql`
15. The complete current implementations of:
    - `apps/mobile/lib/core/bidding/bid_state_machine.dart`
    - `apps/mobile/lib/core/network/api_client.dart`
    - `apps/mobile/lib/core/network/api_repository.dart`
    - `apps/mobile/lib/core/network/socket_events.dart`
    - `apps/mobile/lib/core/network/socket_service.dart`
    - `apps/mobile/lib/core/session/session_service.dart`
    - `apps/mobile/lib/features/lot_detail/lot_detail_screen.dart`
    - `apps/mobile/lib/features/live_auction/live_auction_room_screen.dart`
    - `apps/mobile/lib/features/lot_detail/components/bid_confirmation_sheet.dart`
    - `apps/mobile/lib/features/kyc/emirates_id_verification_screen.dart`
    - `apps/mobile/lib/design_system/components/pioneer_bottom_nav.dart`
    - `apps/mobile/lib/app/router.dart`
    - `apps/api/src/identity/kyc.controller.ts`
    - `apps/api/src/identity/kyc.service.ts`
    - `apps/api/src/identity/session.service.ts`

Do not implement against the summary alone. Verify every referenced behavior in source.

## Non-negotiable product distinction: live auctions versus online auctions

Pioneer has two different auction experiences. Do not combine them into one lifecycle or invent shared behavior.

### Online timed auction

- Each lot has a published start time and close time.
- Buyers place manual/custom bids and proxy maximums online.
- The server controls bid acceptance, price, reserve status, close time, and soft-close extensions.
- Default soft-close window and extension are two minutes, with admin overrides per lot.
- The online client uses sequence-based Socket.IO recovery and server-time countdowns.

### Live hall/auctioneer auction

- Lots proceed under an auctioneer, normally sequentially, potentially with a hall audience and live stream.
- State may eventually include auctioneer controls, current lot, hall bids, online bids, going once/going twice, passed, sold, and the transition to the next lot.
- Those states are not currently defined in the v1 contracts.
- Do not fabricate live-hall events or reuse online soft-close semantics as if they were auctioneer calls.

For this remediation, keep the existing `LiveAuctionRoomScreen` safe as an online realtime presentation if that is what the current contract supports. Rename user-visible wording if necessary to avoid claiming auctioneer/hall behavior. If a true live-hall workflow is required, document it as a separate future task and contract decision instead of inventing it in Task 006.

## Review blockers that must all be resolved

### Blocker A — Server KYC is unauthenticated and fails open

Current problems:

- `KycController` is mounted at `me/kyc`, not `/api/v1/me/kyc`.
- Missing account context silently falls back to a fixed test account.
- `KycService.getKycStatus()` reads `accounts.status` instead of `accounts.kyc_status`.
- Database failure returns `VERIFIED`.
- Submission changes the general account status to `ACTIVE`, swallows persistence failures, and still returns `VERIFIED`.
- The controller uses a plain class with no runtime schema validation.
- Invalid Zod input can become an internal error instead of a structured validation response.

Required implementation:

1. Mount all client KYC endpoints under `/api/v1/me/kyc`.
2. Resolve the account through the existing API `SessionService`; do not accept a fixed fallback account.
3. Missing, invalid, or unknown account context must return the existing structured authentication error.
4. Read and write `accounts.kyc_status`; never infer KYC from general account status.
5. Fail closed:
   - database/provider failure must never return `VERIFIED`;
   - use `PROVIDER_UNAVAILABLE` or a safe pending/retry response;
   - do not swallow persistence errors and report success.
6. A document submission should normally transition to `PENDING`, not `VERIFIED`.
7. Only an authoritative provider result or a deliberately configured development fake provider may transition to `VERIFIED`.
8. A fake provider must be injected behind an interface and explicitly enabled through development/test configuration. It must not activate implicitly after a provider/database error and must be impossible to enable accidentally in production.
9. Do not log full Emirates ID numbers, full names, images, selfies, access tokens, or raw provider payloads. Use account ID, correlation ID, provider session ID, and redacted status only.
10. Do not use an account-ID suffix as the permanent bidder/paddle-number design. If a temporary development value is retained, label it as development-only and keep generation server-side.

Recommended provider boundary:

```ts
interface KycProvider {
  startSession(input: StartKycSessionInput): Promise<StartKycSessionResult>;
  submit(input: SubmitKycInput): Promise<SubmitKycResult>;
  getStatus(providerSessionId: string): Promise<KycProviderStatus>;
}
```

Keep provider payloads outside auction eligibility rules. Map provider states into the canonical KYC lifecycle.

### Blocker B — Mobile KYC is a production-visible simulation

Current problems:

- `SessionService` starts with a hardcoded verified identity and full Emirates ID.
- `submitKycVerification()` waits locally and marks any input verified.
- The screen contains production-visible test shortcuts.
- Gallery images are accepted as liveness.
- The UI claims hologram verification, MRZ checksum validation, and a 98.4% face match without performing them.
- Captured files are never uploaded or submitted to an API/provider.
- The success dialog claims universal bidding eligibility based only on local state.

Required implementation:

1. Default mobile KYC state to `unverified` or load it from `GET /api/v1/me/kyc`; never default to verified.
2. Remove all hardcoded personal identity data from runtime source.
3. Replace the local-delay verification method with a typed KYC repository/client calling the versioned API.
4. Server state is authoritative. The mobile app may show `PENDING`, `REJECTED`, `VERIFIED`, or retry states only from a validated server response.
5. Remove production-visible test shortcuts. Widget tests must use injected fake camera/KYC adapters rather than buttons embedded in the release UI.
6. Do not call a normal selfie photo “liveness.” Until a real liveness provider is connected, use truthful language such as “Take a selfie for verification” and return `PENDING`.
7. Gallery selection must not satisfy a liveness requirement. If gallery selection remains for document images in development, clearly separate it from selfie/liveness behavior.
8. Remove fabricated MRZ, hologram, biometric-score, and verification-success statements.
9. Upload documents through a provider/object-storage abstraction using short-lived references. Do not submit local filesystem paths to the API.
10. Clear temporary sensitive files after upload, cancellation, or failed submission where platform behavior permits.
11. Do not retain a full Emirates ID in the global session singleton. Keep only the minimum status/display data required by the UI.
12. Add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to iOS `Info.plist` with user-facing EN text. Confirm whether localized permission strings are required for Arabic before production.
13. Preserve Android camera permission and verify current image-picker platform requirements.

### Blocker C — Bid commands are still simulated

Current problem:

`PioneerRepository.placeBid()` converts offline state or an `ApiUnknown` timeout into an artificial `ACCEPTED/WINNING` acknowledgement.

Required implementation:

1. Delete every path that fabricates an accepted bid, winning status, sequence, current price, next price, reserve status, or close time.
2. A timeout remains `ApiUnknown` with the identical `commandId` and original payload.
3. Offline/demo browsing may continue, but bidding must be explicitly disabled or return a safe unavailable/unknown result.
4. Never fall back from a live bid request to a mock acceptance.
5. Add a repository test proving that an API timeout cannot become `ApiSuccess`.
6. Search the entire mobile codebase for simulated bids, fake winning states, hardcoded increments, fabricated bid-history entries, and optimistic haptics.

Suggested audit command:

```powershell
rg -n "CommandAckStatus\.ACCEPTED|MyBidStatus\.WINNING|_currentBid\s*=|_nextBid\s*=|nextBid\s*\+|Bidder #2456|HapticFeedback|simulate|simulation|demo" apps/mobile/lib
```

Every remaining occurrence must be justified by authoritative input or clearly isolated preview-only data that cannot execute a bid.

### Blocker D — Screens overwrite authoritative acknowledgements

Current problems:

- Lot detail and realtime room mutate current bid to the submitted amount.
- They calculate the next bid using a hardcoded AED 1,000 increment.
- They fabricate a current-user bid-history row.
- A successfully registered proxy may legitimately return `OUTBID`, but the UI still presents winning state.
- Success/failure/unknown haptics are fired directly by screens.

Required implementation:

1. Render acknowledgement fields exactly:
   - `result.currentBid.amountFils`
   - `result.nextMinimumBid.amountFils`
   - `result.sequence`
   - `result.myBidStatus`
   - `result.closesAt`
   - `result.extended`
   - `result.reserveStatus`
2. Never derive the next valid bid in the client.
3. Never insert a bid-history row without an authoritative public bid event or authoritative history response.
4. Use `BidStateMachine.onAuthoritativeSuccess` and `onAuthoritativeFailure` for intentional haptics. Unknown timeouts must not feel like rejections.
5. Add widget/integration tests for:
   - accepted and winning;
   - accepted but immediately outbid by proxy;
   - rejected with latest state;
   - unknown timeout;
   - soft-close extension;
   - variable per-lot increments;
   - duplicate acknowledgement;
   - socket event arriving before REST acknowledgement;
   - REST acknowledgement arriving before socket/personal event.

### Blocker E — Bid state-machine race and correlation handling

Required corrections:

1. `handleCommandAck()` must require a real active pending command. Do not manufacture one from the acknowledgement.
2. Validate all of the following before applying an acknowledgement:
   - `ack.commandId == activeCommand.commandId`;
   - accepted result `lotId == activeCommand.lotId`;
   - contract version is supported;
   - authoritative sequence does not regress already-applied state.
3. An optional method parameter must not bypass comparison with `_activeCommand`.
4. Store completed command IDs independently of the current visual state so duplicates stay ignored after a personal status change.
5. Preserve the complete `PendingBidCommand` across unknown retry: command ID, lot ID, amount, expected sequence, terms version, contract version, and original sent time/payload semantics.
6. A late acknowledgement must not overwrite a newer personal `OUTBID`, closed, gated, or resynced state.
7. Public `bid:accepted` events may update public price and sequence only. They must never infer the current user's winning/outbid state.
8. Personal `bid:status-changed` determines user-relative state.
9. Wire `eligibility:changed` into the active bidding UI. Do not add a parser and leave it unused.
10. When reason codes are empty or unknown, fail safely without pretending a specific restriction. Preserve observability for contract mismatches.
11. Ensure snapshots supersede older incrementals and command results only according to documented sequence rules.

Add deterministic unit tests for every ordering above. Tests must use the actual generated command ID from `startSubmitting()` and assert that a different command ID, lot ID, or stale sequence is ignored.

### Blocker F — Terms acceptance is local-only

Current screens pass `termsAccepted: true` or store acceptance only in memory.

Required implementation:

1. Do not pre-accept terms in either bid entry point.
2. Read the applicable immutable `termsVersionId` from authoritative lot/auction state.
3. Acceptance must call the versioned terms-acceptance endpoint and succeed before bid submission.
4. A local checkbox records user intent but is not proof of server acceptance.
5. Unchecking may clear local UI intent; it cannot erase an immutable server acceptance record.
6. On `TERMS_ACCEPTANCE_REQUIRED`, refresh the authoritative terms version and guide the user back through the gate.
7. Add tests for accepted terms, new terms version, failed acceptance, and retry.

If the required endpoint or lot terms version is not implemented, update contracts first and implement the minimum server path rather than inventing a client-only bypass.

### Blocker G — Financial arithmetic and display

The code now avoids floating point, but it floors intermediate calculations and then discards fils in its AED getters. For example, AED 85,000 should display AED 212.50 VAT and AED 89,462.50 total under the current example schedule, not AED 212 and AED 89,462.

Required implementation:

1. Keep every amount as integer fils through calculation, state, contracts, and rendering.
2. Remove integer-AED getters that use `~/ 100` for display.
3. Add a formatter that accepts `amountFils` and displays zero or two decimal places without losing value.
4. Define rounding explicitly. Recommended temporary rule: round to the nearest fil using integer round-half-up, but only if it is recorded in `docs/decisions-log.md` and accepted as the platform rule. Do not describe this as a UAE legal standard without counsel/accounting confirmation.
5. Do not hardcode 5% premium, AED 500 minimum, or VAT as a universal production rule. Fees must come from authoritative auction/lot configuration or a clearly labeled development fixture.
6. If the current API cannot provide an authoritative fee schedule/quote, make the contract-first change before presenting a total as final.
7. Add boundary tests covering:
   - AED 1,000;
   - minimum-premium threshold minus one fil, exactly at threshold, and plus one fil;
   - values producing fractional-fil intermediate results;
   - AED 85,000 with AED 212.50 VAT;
   - AED 5,000,000;
   - maximum JSON-safe supported amount;
   - Arabic and English display with LRI/PDI isolation.

### Blocker H — KYC contract and route drift

Make KYC contract-first and runtime validated.

Required contract work:

1. Add the real submission endpoint to `docs/api-contracts.md` and `packages/contracts/src/rest.ts`.
2. Add full OpenAPI request/response/error schemas for:
   - `GET /api/v1/me/kyc`;
   - `POST /api/v1/me/kyc/sessions`;
   - `POST /api/v1/me/kyc/submit` if this remains the chosen route;
   - provider webhook/callback only as an internal/provider contract, not a public mobile endpoint.
3. Separate REST request schemas from socket `CommandMeta` schemas. REST idempotency uses `Idempotency-Key`; do not require socket command metadata accidentally in the REST body.
4. Introduce an ISO calendar-date schema for DOB and document expiry if the wire format is `YYYY-MM-DD`. Do not use a millisecond timestamp schema for date-only values.
5. Validate request bodies at the controller boundary with the executable schema.
6. Normalize Emirates ID formatting safely, but treat regex as formatting validation only.
7. Do not invent a checksum algorithm. Add checksum validation only when confirmed against authoritative provider/documentation.
8. Validate sensible date relationships: parseable DOB, non-future DOB, plausible age policy if product/legal approves one, and non-expired document at submission time.
9. Use structured field errors and the stable error vocabulary.
10. Regenerate and commit all generated artifacts:
    - OpenAPI;
    - JSON schema/golden fixtures as applicable;
    - Dart contracts;
    - valid and invalid fixtures.
11. Update mobile to consume generated transport models rather than redefining duplicate DTOs where practical.

### Blocker I — KYC persistence, privacy, and audit

Use the existing database and architecture instead of overloading `accounts.status`.

Minimum requirements:

1. Use `accounts.kyc_status` for the canonical eligibility-facing state.
2. Add a migration/read model only if needed for provider session ID, submission ID, timestamps, document-reference tokens, failure reason codes, and audit linkage.
3. Never store raw image bytes, local file paths, or raw provider payloads in the accounts table.
4. Store the minimum identity data. Sensitive identifiers must be encrypted/tokenized before production.
5. Do not commit real Emirates IDs, names, document images, or selfies in fixtures.
6. Add immutable audit/security events for KYC state changes without sensitive payloads.
7. Document retention/deletion as pending counsel approval; do not hardcode a five-year policy.
8. Tests must assert that logs and events exclude the full Emirates ID, full name, images, and selfie references where those references are sensitive.

### Blocker J — Material 3 Expressive navigation localization and accessibility

Preserve the floating capsule design, blur, shadows, and safe-area treatment while fixing behavior.

Required implementation:

1. Move all five labels into `PioneerLocalizations`; no English literals in the component.
2. Decide whether tab 3 is “Browse” or “Watchlist.” The label and destination must match. Recommended: label it “Browse” until a real watchlist screen/repository exists.
3. Wrap each destination in explicit semantics including:
   - localized label;
   - button/tab role as supported by Flutter semantics;
   - selected state;
   - appropriate sort order in LTR and RTL.
4. Verify RTL visually and with widget assertions. Directional order should mirror intentionally; icons themselves should remain non-mirrored where non-directional.
5. Respect `MediaQuery.disableAnimations` or the project’s reduced-motion mechanism. Use zero/near-zero duration when motion is disabled.
6. Test text scale factors at least 1.0, 1.3, and 2.0 without clipping or inaccessible labels.
7. Maintain a minimum 48-by-48 logical-pixel interactive target.
8. Ensure the floating overlay does not hide the last focusable/scrollable content with gesture navigation, three-button navigation, keyboard display, or large bottom safe-area insets.
9. Add semantics, RTL, large-text, safe-area, and reduced-motion tests. Existing structure-only tests are insufficient.

## Socket event parsing cleanup

While addressing the state machine, tighten the mobile event boundary:

1. Required public event fields must not silently default to empty IDs, sequence zero, or fabricated enum values.
2. `lot:presence-changed` requires `auctionId`, `lotId`, `sequence`, and `approximateViewerCount`; malformed events must be rejected safely.
3. Validate personal event envelope metadata where required by the shared contract.
4. Keep `currentBid` nullable only where the canonical contract allows it.
5. Unknown event names/required enum values must fail safely and trigger observable recovery, not silent coercion.
6. Prefer generated contract decoding or a thin validated adapter rather than independently evolving mobile DTO definitions.

## Tests that must be added or strengthened

### API/KYC

- E2E/Nest route test proving the endpoint is `/api/v1/me/kyc`, not `/me/kyc`.
- Missing account context returns 401; no fixed fallback account.
- Unknown account returns 401/appropriate structured error.
- `ACTIVE + NOT_STARTED` is not reported as KYC verified.
- `ACTIVE + VERIFIED` is reported verified.
- Database failure never reports verified.
- Submission records pending state and does not alter general account status.
- Invalid Emirates ID/date fields return structured 400 errors.
- Provider unavailable is retryable and fail-closed.
- Idempotent submission replay returns the same semantic result.
- Sensitive values are absent from logs/audit events.
- Development fake provider cannot be enabled under production configuration.

Do not test controllers only by direct method calls. Include application-level route, authentication, validation, and response-shape coverage.

### Mobile KYC

- Initial state is unverified until server status loads.
- Camera/provider interfaces are injected in tests.
- No release-visible skip/test button exists.
- Selfie capture alone results in pending, not verified.
- Gallery image cannot satisfy liveness.
- Failed upload/provider/API leaves bidding gated.
- Pending/rejected/provider-unavailable/retry states render correctly in EN and AR.
- Temporary files are cleaned up through the abstraction.
- No hardcoded Emirates ID or real-looking identity remains in runtime code.

### Bidding

- API timeout stays unknown and retains the identical command and payload.
- Offline mode cannot return accepted/winning.
- Mismatched command ID is ignored.
- Mismatched lot ID is ignored.
- Duplicate accepted/rejected acknowledgement is ignored even after later state changes.
- Stale acknowledgement cannot overwrite a newer personal outbid event.
- Public accepted event updates public price only.
- Personal event updates user-relative status.
- Snapshot/gap recovery supersedes older state.
- Variable increments are rendered from the server.
- No haptic on tap or timeout; haptic only on authoritative accepted/rejected/personal status.
- Lot detail and realtime-room widget tests prove they display exact ack/event values rather than submitted values.

### Financial

- Exact fils preserved at every boundary.
- Two-decimal totals display when non-zero fils exist.
- English and Arabic/BiDi fixtures.
- Explicit rounding boundary tests.
- Configurable fee schedule/quote behavior.

### Navigation

- English and Arabic labels.
- RTL order and semantics.
- Selected semantic state.
- Text scaling through 2.0.
- Reduced motion.
- Bottom safe-area/keyboard overlap.

## Documentation updates required in the same work

1. Update `docs/api-contracts.md` with the final KYC paths and schemas.
2. Update `packages/contracts` and generated artifacts in the same commit as contract changes.
3. Record decisions in `docs/decisions-log.md`, including:
   - canonical KYC lifecycle/provider boundary;
   - development fake-provider safety;
   - date-only wire format;
   - financial rounding rule;
   - authoritative fee-source decision;
   - online versus live-hall auction boundary if not already recorded.
4. Update `tasks/006-mobile-buyer-loop.md` honestly. Keep it in progress until iOS runtime validation is performed on macOS/Xcode.
5. Update `tasks/008-identity-and-kyc.md` honestly. A camera form is not completion of Task 008; UAE PASS, session security, provider verification, privacy, replay protection, and lifecycle tests remain relevant.
6. Update `docs/current-state.md` with exact changes, exact commands run, results, remaining risks, and the next action.
7. Remove stale claims such as “zero simulated bids,” “verified liveness,” or “Task 008 implemented” unless the final source and tests genuinely prove them.

## Quality gates

Run from the repository root unless otherwise stated.

```powershell
# Contracts
corepack pnpm --filter @pioneer/contracts test
corepack pnpm --filter @pioneer/contracts check:generated
corepack pnpm --filter @pioneer/contracts build

# API
corepack pnpm --filter @pioneer/api lint
corepack pnpm --filter @pioneer/api typecheck
corepack pnpm --filter @pioneer/api test
corepack pnpm --filter @pioneer/api build

# Real PostgreSQL tests where available
$env:PIONEER_RUN_DB_TESTS = "1"
corepack pnpm --filter @pioneer/api test
Remove-Item Env:PIONEER_RUN_DB_TESTS -ErrorAction SilentlyContinue

# Mobile
$env:PATH = "E:\flutter\bin;" + $env:PATH
$env:TEMP = "E:\temp"
$env:TMP = "E:\temp"
$env:GRADLE_USER_HOME = "E:\.gradle"
Set-Location apps/mobile
flutter analyze
flutter test
flutter build apk --debug
Set-Location ../..

# Repository checks
corepack pnpm lint
corepack pnpm typecheck
git diff --check
```

The repository-wide Prettier baseline currently reports unrelated historical formatting drift. Do not rewrite hundreds of unrelated files. Format every touched file with the correct formatter, run targeted checks on touched files, report the existing baseline separately, and ensure `git diff --check` is clean.

Native iOS validation must be performed on macOS/Xcode before Task 006 is complete. On Windows, verify configuration statically and report iOS runtime validation as pending.

## Implementation sequence

Use small, reviewable commits in this order:

1. `fix(identity): make KYC authenticated and fail closed`
2. `feat(contracts): align versioned KYC REST schemas and generated clients`
3. `fix(mobile): replace simulated KYC with authoritative pending flow`
4. `fix(mobile): remove simulated bid acceptance and optimistic price mutation`
5. `fix(mobile): harden bid command correlation and event ordering`
6. `fix(mobile): preserve fils and use authoritative fee configuration`
7. `fix(mobile): localize and make floating navigation accessible`
8. `test(mobile,api): cover KYC, bidding races, fees, RTL, and semantics`
9. `docs(tasks): record remediation evidence and remaining external gates`

If a safe contract change requires combining commits, explain why. Do not mix unrelated refactors or generated spreadsheet/output artifacts into these commits.

## Stop conditions

Stop and report instead of guessing if:

- a fee/premium/VAT policy cannot be derived from an approved backend configuration;
- implementing true live-hall auctioneer behavior would require new lifecycle/events;
- no approved KYC provider behavior exists for a production verification decision;
- a migration would store sensitive identity data without an approved encryption/tokenization design;
- unexplained local changes overlap the files above;
- generated contract changes imply a breaking v1 change rather than an additive correction.

Use the recommended safe behavior while blocked: keep bids disabled/unknown, keep KYC unverified or pending, keep fees labeled unavailable/estimated rather than inventing authoritative totals, and document the exact dependency.

## Definition of done

This remediation is ready for review only when all of the following are true:

- No mobile or API path fabricates bid acceptance or KYC verification.
- KYC endpoints are authenticated, versioned, runtime validated, and fail closed.
- General account status and KYC status are handled independently.
- Mobile document/selfie UI makes only truthful claims.
- Bid acknowledgements are correlated to an active command and cannot regress newer state.
- Public events do not determine personal winning/outbid status.
- Screens render authoritative current bid, next bid, increment, sequence, close time, and status.
- Timeout retry preserves the identical command payload and ID.
- Terms acceptance is authoritative, versioned, and not pre-checked.
- Fee calculations and displays preserve all fils, use an explicit rounding rule, and consume authoritative configuration.
- Floating navigation is localized, semantically selected, RTL-tested, large-text safe, and reduced-motion aware.
- Android gates pass; iOS permission keys are present; native iOS validation remains explicitly pending until run on macOS.
- Contracts, generated artifacts, decision log, current state, and both task packets are synchronized.
- All touched-file lint/typecheck/analyze/tests pass, and `git diff --check` is clean.

## Required final report to the user

Return a concise but evidence-backed report containing:

1. Commit hashes and summaries.
2. Files and subsystems changed.
3. Exact behavior removed or corrected.
4. Contract/API changes and whether they are additive or breaking.
5. Exact commands run and their results.
6. Test counts, including skipped opt-in suites.
7. Native Android/iOS validation status.
8. Remaining external/provider/product decisions.
9. A clear statement whether Task 006 and Task 008 remain in progress or are genuinely complete.

Do not claim completion based only on analyzer/unit-test success. Verify the critical source paths and, where possible, exercise the authenticated API and mobile flows against a real local backend.

