# Implementation Revision Record — test-and-tooling-hygiene-294 (autobyteus-294)

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-002, SR-004, SR-005; ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | Implementation complete for H-01..H-32 (groups A–F); ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, round 1 (CRR-001, Fail) | CR-001 | `Local Fix` | SR-005; ARCH-REV-002; CRR-001; API-REV N/A; DR N/A | Dead Apollo compatibility slots removed; back to code review (Targeted Delta Review) |
| IR-003 | Delivery Engineer, `release-deployment-report.md` (DR-001, Desktop Release run 40640209395 failed) | packaging Local Fix (type gate on a fresh runner) | `Local Fix` | SR-005; ARCH-REV-002; CRR-003; API-REV-001; DR-001 | The type gate builds the contract types it reads; passes on a fresh clone standalone and in `build:electron:mac` |
| IR-004 | Code Reviewer, `code-review-report.md` round 4 (CRR-005, failure-origin review of API-REV-002) | CR-002, CR-003 | `Local Fix` | SR-005; ARCH-REV-002; CRR-005; API-REV-002; DR-001 | Build outputs excluded from the Nuxt type project; the Nuxt compiler gets an explicit 4 GB heap; macOS-runner proof pending a push |

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
- Local validation and result: see the handoff's Checks Run (IMP-01..IMP-18).
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

### IR-003 — Packaging: the type gate builds the shared contract types it reads

- Triggering role, report path, and round: Delivery Engineer, `tickets/done/test-and-tooling-hygiene-294/release-deployment-report.md` (DR-001; Desktop Release run 40640209395 for `v1.5.9-beta.14` failed in all 5 build jobs at `pnpm typecheck`).
- Triggering finding IDs: the delivery's packaging `Local Fix` (no finding ID assigned).
- Classification: `Local Fix`
- Prior authoritative result: IR-002 — `typecheck` = `nuxt prepare && node ./scripts/typecheck.mjs`, placed before `prepare-server` in every `build:electron*` chain. It needed `@autobyteus/application-sdk-contracts`'s untracked `dist/` (its `types`), which only the server's `prepare:shared` builds (inside `prepare-server`). Every local and clean-clone run already had that `dist/` (TESTING.md's install order runs the server prebuild first).
- Current authoritative result: `typecheck` and `typecheck:update-baseline` first run `prepare:shared-types` (`pnpm -C .. --filter @autobyteus/application-sdk-contracts build`; the only `@autobyteus/*` package web code imports whose `dist/` is not committed). The gate keeps its place in the chains (before `prepare-server`, failing fast) and gives the same result standalone right after `pnpm install`.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: DR-001
- Why this baseline or implementation revision is recorded: delivery's packaging Local Fix; REQ-007 / DEC-004 require the desktop build to run the gate, and the gate must not depend on an earlier build.
- Approved behavior or requirement IDs affected: BEH-007 / REQ-007, AC-009 (no product behaviour change).
- Implementation delta: `75e9f323f0` — `autobyteus-web/package.json` (`prepare:shared-types`, the two typecheck scripts), `scripts/typecheck.mjs` header comment, `docs/electron_packaging.md` step list (order unchanged; says the gate builds the contract types first). `340cee3763` — `docs(testing)`: the Web typecheck row says it runs right after `pnpm install`.
- Changed files or areas: the four files above.
- Local validation and result (IMP-20, fresh clone `/tmp/h294/fresh` from the branch, `pnpm install --frozen-lockfile`, no `dist/` but the three committed contract ones):
  - at `4c34e5b71d` (beta.14): `pnpm -C autobyteus-web typecheck` → FAIL, `production errors: 23; test-file errors: 296 in 141 files`, `TS2307 … '@autobyteus/application-sdk-contracts'` — the CI failure reproduced;
  - at `340cee3763`: `pnpm -C autobyteus-web typecheck` → `[typecheck] PASS`, production errors 0, 298 in 139 files;
  - after `git clean -fdx -e node_modules`: `pnpm -C autobyteus-web build:electron:mac` (the release job's order) → guards pass, the gate `[typecheck] PASS` (production errors 0), then prepare-server, generate:electron, transpile-electron and the build tsc pass. `build/dist/build.js --mac` then needs the updater repository: CI provides `GITHUB_REPOSITORY`, but the clone's origin is a local path. Rerun with `GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace` (unsigned, publish never): the first attempt failed only at `hdiutil resize` (errno 35, resource temporarily unavailable, a host error) after producing the app and zip; the retry `exit 0` produced the `.dmg` and `.zip`.
- Next recipient or routing: per the handoff rules (Large / High → Code Reviewer).
- Remaining limitations or risks: proven on macOS; the Linux and Windows jobs run the same script (`pnpm -C ..` and `--filter` are platform-neutral). The beta.15 release run is delivery's.

### IR-004 — CR-002 and CR-003: the gate's Nuxt compiler memory

- Triggering role, report path, and round: Code Reviewer, `tickets/done/test-and-tooling-hygiene-294/code-review-report.md`, round 4 (CRR-005, failure-origin review of API/E2E's IR-003 rerun API-REV-002).
- Triggering finding IDs: CR-002 (F-1), CR-003 (F-2)
- Classification: `Local Fix`
- Prior authoritative result: IR-003. Correction to IR-003: its handoff (and DR-001) attributed all five failed jobs of run 40640209395 to TS2307. Only Linux and Windows showed TS2307; both macOS jobs ended with `the compiler ended by signal SIGABRT` (API-31), the default heap on the 7 GB runners. IR-003's fresh-clone proof ran on a 64 GB Mac (default heap 4144 MB), so it could not show this.
- Current authoritative result:
  - CR-003: `nuxt.config.ts` `typescript.tsConfig.exclude` also leaves out `../resources/**`, `../electron-dist/**`, `../dist-mobile/**` and `../.output/**`, the build outputs inside the package (allowJs pulled them in). In a worktree with `resources/server` and `electron-dist/` present the project shrinks from 19,872 to 4,359 files, and the gate gives the fresh-clone result.
  - CR-002: `scripts/typecheck.mjs` spawns the Nuxt app's vue-tsc with `--max-old-space-size=4096` (`NUXT_APP_HEAP_MB`). That is independent of the machine default and of the caller's `NODE_OPTIONS`; a command-line flag takes precedence, and a run under `NODE_OPTIONS=--max-old-space-size=1792` passes. A compiler ended by a signal now quotes its FATAL ERROR line.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: DR-001
- Why this baseline or implementation revision is recorded: the reviewer's Local Fixes; REQ-007 / DEC-004 (the desktop build runs the gate) require it to pass on every release runner and after a previous build.
- Approved behavior or requirement IDs affected: BEH-007 / REQ-007, AC-009 (no product behaviour change).
- Implementation delta: `65a7955726` (CR-003, `autobyteus-web/nuxt.config.ts`), `2846b2abd2` (CR-002, `autobyteus-web/scripts/typecheck.mjs`).
- Changed files or areas: the two files above.
- Local validation and result:
  - IMP-21: excludes listed in `.nuxt/tsconfig.json`; the gate with both trees present passes (0 production errors, 298 in 139 files).
  - IMP-22: measured on the developer Mac (macOS arm64, Node 22), the project's heap peaks at about 3.0 GB. It runs out of memory at limits of 1792, 2304 and 2560 MB, and completes at 3072 MB (RSS 3132 MB) and 4096 MB (RSS 3250 MB). The gate passes under NODE_OPTIONS 1792. A temporary 1024 MB limit fails with "(FATAL ERROR: Reached heap limit …)".
  - The gate spec passes 19/19.
- Next recipient or routing: Code Reviewer (targeted review of CR-002 and CR-003), then API/E2E with the build-only release run on all five runners.
- Remaining limitations or risks: the measurement is from a 64 GB developer Mac, so the proof on a real `macos-14` runner (7 GB) is still open. It needs the branch pushed and `release-desktop.yml` dispatched with `publish_release: false`, which is the user's or delivery's decision; it is requested in the handoff. If 4096 MB does not fit there (RSS 3.3 GB measured, 7 GB available), the next step is a Design Impact on DS-001 to the Solution Designer.
