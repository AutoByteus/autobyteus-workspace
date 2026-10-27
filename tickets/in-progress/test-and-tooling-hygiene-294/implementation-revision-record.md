# Implementation Revision Record — test-and-tooling-hygiene-294 (autobyteus-294)

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-002, SR-004, SR-005; ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Implementation complete for H-01..H-32 (groups A–F); ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, round 1 (CRR-001, Fail) | CR-001 | `Local Fix` | SR-005; ARCH-REV-002; CRR-001; API-REV N/A; DR N/A | Dead Apollo compatibility slots removed; back to code review (Targeted Delta Review) |

## Revision Entries

### IR-001 — Initial implementation of the hygiene ticket (groups A–F)

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/test-and-tooling-hygiene-294/design-review-report.md`, round 2 (ARCH-REV-002, Pass).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: every work item of the design implemented in its own commit(s) on `codex/test-and-tooling-hygiene-294` (base `origin/personal` `2f48d85d4d`); the web type gate passes (0 production errors, 298 baselined test-file errors in 139 files); web `test:nuxt`, `test:electron`, server `typecheck` and `test:unit` (now with `tests/architecture` and `tests/agent-work-journal`) pass; the changed gated E2E files pass with the scripted AGY CLI. Details and evidence: `implementation-handoff.md`.
- Related solution revision IDs: SR-002, SR-004, SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..007, 009..012, 014, 016, 018..020, 022..028, 030..032; REQ-001..007, 009..012, 014, 016..019, 021..027, 029, 031, 032.
- Implementation delta: as designed, plus the deviations recorded in the handoff's "Deviations and additions" (two hidden architecture-list lags, typed Apollo client as the root fix of the implicit-any rows, extra dead code removed in touched files, two pre-existing web test-runner failures fixed under TESTING.md Rule 9, the gated Codex integration test and the gated Claude live test moved off removed APIs).
- Changed files or areas: `autobyteus-server-ts` (architecture test, `test:unit`, removed agent-management tools and 55 `.js` twins, Claude client, Fastify compositions, E2E files, docs), `test-support/live-e2e`, `autobyteus-web` (type gate, dependency declarations, Nuxt config, type fixes, BEH-032 fixes, dead code, icons, probes, specs), `autobyteus-message-gateway` (scripts removed), `TESTING.md` (four `docs(testing)` commits), `pnpm-lock.yaml`.
- Local validation and result: see the handoff's Checks Run (IMP-01..IMP-20).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: browser probes, the packaged isolation probe, the live Codex runs (RUN_CODEX_E2E) and a clean-clone run are left to API/E2E; see the handoff.

### IR-002 — CR-001: the Apollo client is bound under one key

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/test-and-tooling-hygiene-294/code-review-report.md`, round 1 (CRR-001, Fail).
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 — `getApolloClient(clientId = 'default')` read the bound key, then the `_apolloClients` / `$apollo.clients` / `$apollo.defaultClient` slots; `registerBoundApolloClient` wrote all of them (with a `$apollo` try/catch fallback); the `#app` NuxtApp augmentation typed all three.
- Current authoritative result: `getApolloClient()` (no parameter) returns `nuxtApp[BOUND_APOLLO_CLIENT_KEY]` or throws "No Apollo client is bound: …"; `registerBoundApolloClient` writes only the bound key; `NuxtAppLike` and the augmentation declare only it; `apollo.client.spec.ts` asserts the Nuxt app holds exactly the bound key.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the reviewer's Local Fix (Principles 7, 8, 15): the other slots and the `clientId` parameter were unreachable once the bound key is written first by the only writer, and typing them made the app-wide NuxtApp offer one client under four names.
- Approved behavior or requirement IDs affected: BEH-007 / REQ-007 (no behaviour change: every caller already received the bound client).
- Implementation delta: commit `256cee925e` — `autobyteus-web/utils/apolloClient.ts`, `plugins/30.apollo.client.ts`, `plugins/__tests__/apollo.client.spec.ts` (10 insertions, 51 deletions).
- Changed files or areas: the three files above.
- Local validation and result: `pnpm -C autobyteus-web typecheck` PASS (0 production errors, baseline unchanged 298/139); `apollo.client.spec.ts` 2/2; `test:nuxt` 666 files passed; `git grep` finds no `_apolloClients` / `$apollo` left (IMP-19).
- Next recipient or routing: Code Reviewer (Targeted Delta Review on CR-001).
- Remaining limitations or risks: the unused `@nuxtjs/apollo` dev dependency stays (FU-010, the reviewer's).
