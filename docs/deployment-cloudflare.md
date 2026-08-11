# Cloudflare deployment

Status: prepared, not yet deployed from this Codex session because no Cloudflare auth token/session is available in the environment.

## Buyer web static preview

The buyer web app can be exported as a static Cloudflare-compatible build:

```bash
$env:CLOUDFLARE_PAGES = "true"
corepack pnpm --filter @pioneer/web build:cloudflare
```

Output directory:

```text
apps/web/out
```

Deploy with Wrangler after Cloudflare authentication:

```bash
cd apps/web
npx wrangler deploy
```

Or deploy the output directory to Cloudflare Pages:

```bash
npx wrangler pages deploy apps/web/out --project-name pioneer-auctions-web
```

For Cloudflare dashboard/Git builds, set the build environment variable:

```text
CLOUDFLARE_PAGES=true
```

## Required Cloudflare auth

Use one of:

- `npx wrangler login` in the dev machine/browser session; or
- set `CLOUDFLARE_API_TOKEN` with permission to deploy Workers/Pages for the target account.

Do not commit Cloudflare tokens.
