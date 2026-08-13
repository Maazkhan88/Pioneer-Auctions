/**
 * Admin session/test-account adapter.
 *
 * Mirrors `apps/web/lib/bid-session.ts`: there is no production admin
 * identity flow wired into `apps/admin` yet, so the API's only
 * authentication mechanism is the preview `x-pioneer-test-account-id`
 * header handled by `SessionService.requireTestHeaderAccount` in
 * `apps/api`. Authorization is still real: `AdminPermissionGuard` looks up
 * the account's seeded role/permission grants, so this header only picks
 * *which* account acts -- an account without `admin.auctions.write` still
 * gets a 403 from every write endpoint.
 *
 * This module must only run on the server (Next.js server components):
 * it reads `process.env` directly. `apps/admin` is deployed as a Cloudflare
 * static export, so a resolved config is only ever fresh at build time --
 * callers resolve it once per render and pass the plain object down as a
 * prop to client components, which must import only its *type*, never this
 * module's value export (a raw `process.env` read has no meaning once
 * bundled into client JS).
 */
export interface AdminSessionConfig {
  readonly apiBaseUrl: string;
  readonly testAccountId: string;
}

const DEFAULT_TEST_ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";

export function getAdminSessionConfig(): AdminSessionConfig | null {
  const apiBaseUrl = normalize(process.env.PIONEER_ADMIN_API_BASE_URL);
  if (apiBaseUrl === null) {
    return null;
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    testAccountId:
      normalize(process.env.PIONEER_ADMIN_TEST_ACCOUNT_ID) ??
      DEFAULT_TEST_ACCOUNT_ID,
  };
}

function normalize(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
