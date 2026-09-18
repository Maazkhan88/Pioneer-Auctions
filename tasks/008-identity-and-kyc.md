# Task 008 — Identity, UAE PASS, and fallback KYC

Recommended owner: backend/integration specialist

## Goal

Provide secure, provider-abstracted authentication and a clear eligibility-oriented KYC lifecycle without coupling auction rules to provider payloads.

## Prerequisites

- Tasks 001–002 complete.
- UAE PASS staging onboarding initiated; official current attributes/assurance tiers confirmed when access is available.

## Scope

- Account/session model, short-lived access tokens, rotating refresh sessions, revocation, device/session view.
- OIDC authorization-code + PKCE adapter for UAE PASS with state/nonce validation and account-linking protection.
- OTP fallback abstraction and development fake provider.
- KYC provider abstraction/state machine for non-UAE-PASS users; development fake and webhook contract.
- Canonical verified identity mapping with field-level classification/encryption and minimal storage.
- RBAC/permissions and step-up authentication hooks for admin.
- Audit/security events, rate limits, lockout/risk hooks, and user-safe failure/recovery states.
- Data retention/deletion/export technical hooks pending counsel-approved policy.

## Acceptance criteria

- Callback forgery, replay, state/nonce mismatch, expired code, account collision, refresh replay, and session revocation are tested.
- Provider outages do not corrupt account/KYC state and return actionable retry behavior.
- SOP/assurance limitations cannot accidentally mark an unverified identity as bid-eligible.
- Logs/events exclude access tokens, full Emirates ID, document images, selfies, and raw provider payloads.
- Web/mobile can browse while unverified and receive exact next eligibility steps at bid intent.
- No claim about five-year retention or returned UAE PASS attributes is hardcoded without approved policy/provider evidence.

## Validation

Run security-focused unit/integration tests, OIDC sandbox or standards-compliant fake-provider flow, session-replay tests, and eligibility contract tests.

## External handoff

Record provider application owner, staging status, redirect URIs, requested scopes/attributes, unresolved commercial terms, and go-live checklist outside secrets.

## Current Status: In Progress
- **Why In Progress**: Remediation pass resolved the fail-closed server architecture, versioned REST endpoints, session authentication, calendar date validation, provider interface boundary, and mobile camera capture flow. Full completion of Task 008 requires external provider selection (e.g. Onfido/Jumio), live UAE PASS integration, webhook/callback processing, and legal counsel-approved data retention policy.

### Remediation Completed — 2026-09-18 (docs/antigravity-task-006-008-remediation-prompt.md)

1. **Server Authentication & Fail-Closed Architecture (Blockers A & I / DEC-026)**:
   - Mounted all KYC endpoints under `@Controller("/api/v1/me/kyc")`.
   - Injected `SessionService` to authenticate requests via session header/token; missing or unknown accounts return 401.
   - Database/provider failures return 503 `PROVIDER_UNAVAILABLE` with `retryable: true`, never fake `VERIFIED`.
   - Decoupled `accounts.kyc_status` from `accounts.status`; KYC submissions update `kyc_status = PENDING` without altering general account status.
   - Defined `KycProvider` interface (`startSession`, `submit`, `getStatus`) and bound `DevelopmentFakeKycProvider` via DI token `KYC_PROVIDER`, strictly prohibiting production instantiation.
   - Redacted all sensitive PII (full Emirates IDs, names, document references) from server application logs and events.
2. **Contract Alignment & Date Wire Format (Blocker H)**:
   - Added `IsoDateSchema` (`YYYY-MM-DD`) for date of birth and document expiry, replacing epoch timestamps.
   - Defined typed Zod schemas `SubmitKycRestRequestSchema`, `KycStatusResponseSchema`, `KycSessionResponseSchema` in `@pioneer/contracts`.
   - Regenerated Dart contracts, OpenAPI schemas, and golden fixtures with zero drift.
3. **Mobile Truthful Capture & State (Blocker B)**:
   - `SessionService` defaults to `unverified` and masks Emirates ID (`784-****-*******-1`).
   - Removed all runtime bypasses, fake test shortcuts, and fabricated biometric claims (hologram, MRZ, 98.4% match).
   - Enforced camera-only capture for selfies (gallery selection strictly disabled for selfie/liveness).
   - Document upload abstraction submits short-lived references and cleans up temporary local files.
   - Successful submission transitions mobile UI to authoritative `PENDING` dialog, keeping bidding safely gated until verified.
   - Added `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to iOS `Info.plist`.
