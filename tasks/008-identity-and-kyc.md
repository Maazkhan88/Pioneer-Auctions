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
