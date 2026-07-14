# Task packets

Each file is a bounded, reviewable work package. Claim one in `docs/current-state.md`, work on a dedicated branch, satisfy every acceptance criterion, and update the handoff before requesting review.

## Suggested agent ownership

This is guidance, not a hard dependency:

- Claude Code: Task 004 bidding engine and correctness wall; optionally own Flutter end-to-end to avoid Dart style drift.
- Antigravity: Tasks 005 and 007, using browser-in-the-loop checks for responsive and Arabic/RTL behavior.
- Codex: Tasks 001–003, 010–011, contract coverage, components, CRUD, and parallelizable test work.
- Human/product owner: merge gate, open-decision rulings, vendor onboarding, legal/compliance approval, and test-auction signoff.

## Dependency order

```text
001 Foundation
 ├─ 002 Contracts ─┬─ 004 Bidding ─┬─ 005 Web ───────┐
 │                 │               └─ 006 Mobile ────┤
 │                 ├─ 007 Admin ─────────────────────┤
 │                 ├─ 008 Identity/KYC ──────────────┤
 │                 ├─ 009 Deposits/payments ─────────┤
 │                 └─ 010 Notifications ─────────────┤
 └─ 003 Design ──────── 005/006/007                  │
004 + integrations ───── 011 Observability/load ─────┤
                                                      └─ 012 MVP hardening
```

Tasks with satisfied prerequisites may run in parallel, but contract changes merge before dependent client work.

## Pull request checklist

- [ ] Task ID and acceptance criteria linked.
- [ ] Scope is limited to the packet or deviations are documented.
- [ ] Contract and decision log updated where semantics changed.
- [ ] English/Arabic and LTR/RTL fixtures included for user-facing work.
- [ ] Tests cover authorization, failure, replay, and concurrency where relevant.
- [ ] Validation commands/results recorded in `docs/current-state.md`.
- [ ] Migration, rollback/forward-fix, observability, and security effects considered.
