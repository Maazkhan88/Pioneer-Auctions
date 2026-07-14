# Pioneer Auctions agent instructions

These instructions apply to Claude Code, Codex, Antigravity, and human contributors. If a nested `AGENTS.md` exists, follow both; the nearest file may add constraints but may not weaken these rules.

## Required reading

Before editing, read:

1. `docs/current-state.md`
2. `docs/api-contracts.md`
3. `docs/architecture.md`
4. Your assigned `tasks/*.md` packet

After editing, update `docs/current-state.md` and the task packet. Record architectural or product choices in `docs/decisions-log.md`.

## Scope and ownership

- Work on one task packet at a time. Do not opportunistically refactor unrelated code.
- Preserve user changes and stop if a task overlaps unexplained local edits.
- A task is complete only when its acceptance criteria and validation commands pass.
- Prefer small, reviewable commits in Conventional Commit format: `type(scope): summary`.
- Never commit credentials, production data, Emirates ID values, access tokens, card data, or unredacted KYC documents.

## Contract-first rule

- `docs/api-contracts.md` defines behavior; `packages/contracts` is its machine-consumable representation.
- Change both in the same pull request whenever an endpoint, event, enum, error, money field, timestamp, or state transition changes.
- Breaking changes require a new API/event version and a decision-log entry.
- Never touch the bid ledger schema or auction close semantics without updating `docs/api-contracts.md`, concurrency tests, and `docs/decisions-log.md`.
- Clients may render predicted values for responsiveness, but the server is authoritative for bid acceptance, current price, leader, reserve state, and close time.

## Bidding safety invariants

1. Money is represented as integer fils (`amountFils`) in code and JSON. Never use floating point for money.
2. PostgreSQL is the durable ledger. Redis accelerates atomic decisions but is never the sole durable record.
3. Every bid command has a client-generated UUID `commandId` and is idempotent per authenticated bidder.
4. The server validates identity/KYC, deposit eligibility, terms acceptance, auction state, close time, increment, and command replay inside the atomic acceptance boundary.
5. An accepted bid and every proxy-bid consequence receive monotonically increasing per-lot `sequence` values.
6. Timestamps are UTC ISO 8601 on the wire. User-facing times use the selected timezone; default `Asia/Dubai`.
7. Soft-close uses server time only. A valid bid inside the configured window extends the published close time atomically.
8. Never expose bidder identity, proxy maximums, KYC data, internal risk flags, or admin notes in public events.
9. Final-bid approval cannot alter the hammer price. Rejection requires a structured reason and immutable audit entry.
10. Financial and bid ledgers are append-only. Corrections use compensating entries.

## TypeScript standards

- TypeScript strict mode; no unbounded `any`.
- Validate all external input at process boundaries. Generated/static types are not runtime validation.
- Prefer explicit domain names (`LotId`, `amountFils`, `closesAt`) over ambiguous primitives.
- Keep controllers/gateways thin; domain services own rules; repositories own persistence.
- Use structured logs with correlation IDs. Never log secrets or regulated personal data.
- Unit tests live beside code; integration and contract tests live in each app's `test` directory.

## Flutter standards

- One state-management approach will be selected in Task 003 and recorded in the decision log.
- Use `Directionality`, logical alignment, and locale-aware formatters; never hardcode left/right for layout.
- Keep Western numerals as the default for financial values while allowing numeral preference later.
- Socket state must tolerate reconnects, duplicate events, gaps, and server snapshots.

## Web and admin standards

- Next.js App Router, TypeScript strict mode, accessible server-rendered lot pages where possible.
- Use CSS logical properties for RTL. Directional icons mirror; logos, photos, media controls, and financial numerals do not.
- Bid actions must remain keyboard accessible and expose status changes through an ARIA live region.
- Never rely on color alone for winning, outbid, reserve, error, or pending states.

## Product language and formatting

- English and Arabic ship together for MVP. No user-visible string literals in components.
- AED formatting is locale-aware, but calculations always use integer fils.
- Arabic copy requires native review before production; machine translation is a draft only.
- Use `Lot #`, `Auction #`, VIN, IBAN, phone numbers, and financial numerals in LTR isolates inside RTL content.
- Orange means action/urgency, green means winning/success, red means outbid/danger, purple means brand/navigation.

## Quality gates

Before handing off:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

For bidding-engine work also run integration, race, idempotency, reconnect, and soft-close tests described in `docs/quality-gates.md`. Report commands and results in `docs/current-state.md`; never claim a check you did not run.

## External integrations

- Build UAE PASS, payment gateways, push, email, SMS, and object storage behind provider interfaces.
- Use sandbox credentials only in local/development environments.
- Verify signatures on inbound webhooks and make handlers replay-safe before updating state.
- Do not invent undocumented provider behavior. Mark assumptions and link official provider documentation in the integration decision record.

## Definition of done

- Acceptance criteria pass.
- Tests cover success, failure, authorization, idempotency, and relevant concurrency paths.
- Contracts, migrations, observability, documentation, and Arabic/RTL behavior are updated as applicable.
- No new high-severity security or accessibility issue is knowingly introduced.
- `docs/current-state.md` tells the next agent exactly what changed, what was verified, and what remains.
