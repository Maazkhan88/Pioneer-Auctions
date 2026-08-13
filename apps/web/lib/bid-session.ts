/**
 * Buyer bid session/test-account adapter.
 *
 * There is no production identity/session flow wired into `apps/web` yet
 * (Task 008 owns UAE PASS/KYC). Until then, the API's only authentication
 * mechanism is the preview `x-pioneer-test-account-id` header handled by
 * `SessionService.requireTestHeaderAccount` in `apps/api`, the same
 * mechanism `apps/admin/lib/admin-data.ts` already relies on.
 *
 * `termsVersionId` has no dynamic source either: `POST
 * /lots/:lotId/terms-acceptances` is documented in `docs/api-contracts.md`
 * but not implemented in `apps/api` yet (confirmed against every
 * `@Controller` in `apps/api/src`). Until that lands, the buyer preview
 * accepts a single, operator-configured terms version id so the bid
 * command shape stays contract-accurate; the UI still requires an explicit
 * terms checkbox before submitting (see `bid-panel-shell.tsx`).
 *
 * This module must only run on the server (Next.js server components /
 * server-only lib code): it reads process.env directly and is never
 * imported from a "use client" file. Callers resolve a config once per
 * request and pass the plain object down as a prop.
 */
export interface BuyerBidSessionConfig {
  readonly apiBaseUrl: string;
  readonly termsVersionId: string;
  readonly testAccountId: string;
}

export function getBuyerBidSessionConfig(): BuyerBidSessionConfig | null {
  const apiBaseUrl = normalize(process.env.PIONEER_PUBLIC_API_BASE_URL);
  const testAccountId = normalize(process.env.PIONEER_PUBLIC_TEST_ACCOUNT_ID);
  const termsVersionId = normalize(process.env.PIONEER_PUBLIC_TERMS_VERSION_ID);

  if (
    apiBaseUrl === null ||
    testAccountId === null ||
    termsVersionId === null
  ) {
    return null;
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    termsVersionId,
    testAccountId,
  };
}

function normalize(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
