# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements / design authority: `SR-018` / `ARCH-REV-011`
- Implementation / source review: `IR-038` / `CRR-071`
- Current HEAD: `8475924fd28c4091824308b24a716d80f672fb5c`
- Production source commit: `9e05920d226c19259f404de18acc057a0ed747f2`
- Current revision: `API-REV-033`
- Prior completed result: `API-REV-032 Pass / 98%` (durable-test-only correction); API-REV-031 is the preceding real-system Pass.
- Current result: **Pass / 98%**
- Resolved downstream in this round: `CR-F-040` / reachable premise `CR-PREM-036`
- Broader-validation decision: **Required and completed**. IR-038 changes the web-equivalent desktop/mobile Team launch lifecycle, and repository-only evidence could not prove real allocation, canonical promotion, provider response, or responsive UI state.

## Coverage Investigation And Durable Decisions

The canonical investigation was currentized before API-REV-033 durable edits or final execution. It classified two exact stale seams:

1. `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` manually constructed an unregistered draft and therefore bypassed the selected-draft admission owner;
2. `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` faked a Team-run owner without the current `isDraftLaunchPending` contract.

API-REV-033 repository-resident delta:

- Updated: `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- Updated: `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`
- Added: none
- Removed: none

The store coverage now uses a real selected immutable draft and proves exact synchronous admission, mutation/selection rejection while pending, duplicate launch rejection before another allocation, one canonical promotion, allocation-failure preservation/unlock, and successful retry. The component coverage supplies the current pending owner and proves read-only/disabled pending presentation plus inert launch/config/workspace actions.

Cumulative durable package:

- `92` unique paths: `3 added / 83 updated / 6 removed`
- `38 server / 54 web`; `86` active paths
- Inventory: `api-e2e-evidence-sr018/api-rev-033/investigation/cumulative-durable-coverage-inventory.tsv`
- Full patch: `api-e2e-evidence-sr018/api-rev-033/investigation/cumulative-durable-diff.patch`
- API-REV-033 two-file delta: `api-e2e-evidence-sr018/api-rev-033/investigation/api-rev-033-durable-delta.patch`
- Patch integrity: `api-e2e-evidence-sr018/api-rev-033/investigation/cumulative-durable-patch-integrity.log`
- Static audit: `api-e2e-evidence-sr018/api-rev-033/investigation/cumulative-durable-static-audit.log`

The package remains pending proportional test-code review before delivery.

## Repository Execution

All commands ran in the assigned worktree.

| Selection / command | Result | Evidence |
| --- | --- | --- |
| `pnpm test:nuxt --run stores/__tests__/agentTeamRunStore.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts` | **Pass — 2 files / 30 tests** | `repository/launch-owner-and-panel-focused-final.log` |
| IR-038 seven-file store/config/selection/mobile selection | **Pass — 7 files / 83 tests** | `repository/ir038-affected-seven-final.log` |
| Complete active cumulative web selection | **Pass — 49 files / 349 tests** | `repository/web-current-final.log`; `repository/web-current.selection.txt` |
| `pnpm run build` in `autobyteus-web` | **Pass — Nuxt production build; 15 routes prerendered** | `repository/web-production-build.log` |
| `pnpm run build:full` in `autobyteus-server-ts` | **Pass — production TypeScript, build assets, built-in agent and sanitized no-DB bootstrap** | `repository/server-build-full.log` |
| `pnpm exec nuxi typecheck` | **Tooling failure before project diagnostics; not claimed as Pass** — inherited `vue-tsc`/TypeScript `ERR_PACKAGE_PATH_NOT_EXPORTED` | `repository/web-nuxi-typecheck.log` |
| Focused/cumulative static and diff audit | **Pass** — no production delta in API-REV-033, zero missing active files/imports, zero active skip/only/todo, clean focused diff | `repository/api-rev-033-diff-hygiene.log`; `investigation/cumulative-durable-static-audit.log` |

The first focused edit run captured one API/E2E-authored expectation mismatch. It was corrected before final execution; the authoritative final focused and broader selections are green. No implementation/source change was made during API-REV-033.

## Checked Disposable Environment

The live boundary was prepared with the checked repository launcher and fail-closed target validation:

- server/frontend: `127.0.0.1:60233` / `127.0.0.1:31233`;
- disposable database: `autobyteus-server-ts/db/api-rev-033-live-20260812-1.db`;
- disposable runtime/vault: `autobyteus-server-ts/tests/.tmp/api-rev-033-live-20260812-1`;
- ambient `DATABASE_URL` and `DATABASE_URL_TEST` excluded from the child;
- materialized `.env` named the exact absolute disposable SQLite target;
- configuration-only preflight resolved that exact target while the database remained absent;
- Prisma migration ran only on the disposable target;
- interactive `pnpm secrets:import` read `/Users/normy/.autobyteus/server-data/.env` and configured nine identifiers only in the disposable vault, with no secret values logged;
- built server started only through `startBuiltTestServer`; PID `lsof` proved the exact disposable database after listen;
- the frontend's HTTP and WebSocket boundary was bound only to the owned server;
- the private Nested Classroom fixture was imported from a disposable staging copy and remained byte-identical at source.

Evidence: `environment/safe-target-preflight.log`, `environment/prisma-migrate-deploy.log`, `environment/secrets-import-interactive-summary.log`, `environment/safe-server-ready.json`, `environment/server-pid-lsof.log`, `environment/frontend-backend-binding.log`, and `live/source-fixture-final-integrity.log`.

## Real Browser And Provider Execution

Google Chrome exercised the web-equivalent desktop and paired-mobile surfaces. The final authoritative matrix is `live/browser/ir038-browser-matrix-summary.json` and passes all rows.

### AutoByteus — `gpt-5.6-luna` — real first-send, failure, pending, success

- exact selected draft/config/focus/input/workspace were frozen;
- an injected first allocation response failure rejected exactly, allocated no server run, retained the same selected draft and pending input, released launch ownership, and restored edit/retry capability;
- the retry held the real allocation mutation pending and proved the exact admitted snapshot;
- the visible Run control and runtime selector were disabled;
- config, focus, input, workspace, remove, clear, selection replacement, and duplicate launch attempts all rejected;
- the duplicate rejected before another allocation request;
- the one real retry produced one canonical TeamRun promotion, registered/selects the exact root, transferred input, removed the draft, released ownership, and returned the exact provider response in the current raw trace;
- clean termination passed.

Evidence: `live/browser/autobyteus-first-send.json`, three `autobyteus-first-send-*.png` screenshots, and `live/provider-traces/autobyteus-first-send.raw-traces.jsonl`.

### Codex App Server — `gpt-5.6-luna`, reasoning `medium` — desktop Run

Exact frozen configuration, one allocation, one canonical promotion/context selection, draft removal/unlock, exact live provider response, and clean termination pass.

Evidence: `live/browser/codex-desktop.json`, `live/browser/codex-desktop-complete.png`, and `live/provider-traces/codex-desktop.raw-traces.jsonl`.

### Claude Agent SDK — `sonnet` — paired mobile Run

Exact frozen configuration/workspace, one allocation, exact canonical mobile Team context/focus, draft removal/unlock, exact live provider response, and clean termination pass.

Evidence: `live/browser/claude-mobile.json`, two `claude-mobile-*.png` screenshots, and `live/provider-traces/claude-mobile.raw-traces.jsonl`.

All three roots are distinct current canonical TeamRun IDs. Temporary live-probe locator/predicate authoring corrections are not counted as product failures; final rows were rerun fresh and pass without production edits.

## Environment, Database, And Cleanup

- Owned server and frontend processes stopped; ports `60233/31233` are closed.
- Final provider traces were copied into the evidence package before cleanup.
- The disposable runtime/database/vault, key material, and temporary mobile credential were removed.
- The source fixture remained unchanged.
- The operational database `/Users/normy/.autobyteus/server-data/db/production.db` was **not inspected, opened, targeted, copied, migrated, repaired, rolled back, or deleted**.
- The protected `127.0.0.1:60004/31004` stack was not stopped, repointed, or mutated. Its listener state was not asserted after the user's power-off; the recorded action is `NONE`.
- Delivery stash and backup remain untouched.

Evidence: `environment/final-cleanup-verification.log` and `live/provider-traces.sha256`.

Both historical operational-database incident disclosures remain mandatory and preserved:

- `api-e2e-evidence-sr015/api-rev-014/live/server-environment-collision-analysis.md`
- `api-e2e-evidence-sr015/api-rev-018/live/operational-production-db-targeting-incident.md`

## Confidence Scorecard

| Category | Score | Evidence and residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Exact IR-038 admission, pending lock, duplicate rejection, failure preservation/unlock, promotion, and three-runtime rows are directly proven. |
| Changed-boundary execution directness | 99% | Real store owner, mounted component, real GraphQL allocation, browser controls, canonical selection, and provider traces cover the changed boundary. |
| Cross-boundary integration realism and mock gap | 98% | Real Chrome, HTTP/WebSocket, GraphQL, built server, SQLite, vault, and providers were used; failure injection is deliberately at the allocation response seam. |
| Environment, configuration, identity, and fixture fidelity | 99% | Exact absent disposable target, sanitized environment, PID open-file proof, staged fixture integrity, and canonical TeamRun IDs pass. |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Failure preservation/retry, every pending mutation class, duplicate-before-allocation, one success promotion, and cleanup are direct. |
| User-surface, browser, and desktop-shell confidence | 97% | Real desktop-equivalent and paired-mobile browser journeys pass. Electron-shell-specific behavior is unchanged and remains the only negligible uncertainty. |
| Durable regression coverage quality and relevance | 97% | Both stale seams now exercise current owners and the complete 92-path package is internally consistent; proportional review is still required. |

Overall confidence: **98%** (`688 / 7 = 98.3%`, rounded). No category is below `90%`; no critical behavior is missing or failing.

## Outcome And Routing

- Authoritative result: **Pass / 98%**.
- `CR-F-040` / `CR-PREM-036`: **resolved downstream**.
- Current live matrix: **AutoByteus, Codex App Server, and Claude Agent SDK all Pass**.
- Durable delta this round: **0 added / 2 updated / 0 removed**.
- Cumulative durable package: **3 added / 83 updated / 6 removed = 92 paths**.
- Required recipient: `code_reviewer` for proportional review of the complete cumulative durable package.
- Delivery remains blocked until proportional test-code review passes.
