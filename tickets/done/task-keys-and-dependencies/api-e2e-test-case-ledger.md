# API/E2E Test-Case Ledger — task-keys-and-dependencies

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`
- Coverage investigation: `…/api-e2e-coverage-investigation.md`
- Execution coverage report: `…/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `…/api-e2e-revision-record.md`
- Ledger scope: round 1 (API-REV-001); many independent server, runtime, browser and desktop cases; the desktop session is long and interruption-prone.
- Last updated: 2026-10-17

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Server build | — | build | `pnpm -C autobyteus-server-ts prebuild && build` | 1 | |
| R2 | Server typecheck | — | src types | `pnpm -C autobyteus-server-ts typecheck` | 2 | |
| R3 | Server unit (full) | AC-001–027 (unit parts) | backend | `pnpm -C autobyteus-server-ts test:unit` | 3 | |
| R4a | `projects-graphql.e2e` | AC-001–004, 008–010, 018 | GraphQL HTTP | vitest, clean env | 4 | |
| R4b | `projects-startup-migration.e2e` | AC-006 | real startup | vitest, clean env | 4 | |
| TKD-API-001 / R4c | `project-task-boundaries.e2e` incl. new case | AC-020, 022, 024, 025, 027 | MCP HTTP tools | vitest, clean env | 5 | new durable |
| R5a | gated `project-change-feed` | AC-011, 020, 022 | scripted AGY | vitest, gate | 6 | |
| R5b | gated `project-task-context-files-delegation` | AC-020 | scripted AGY | vitest, gate | 6 | |
| TKD-AGY-001 / R5c | gated `task-existing-copy-assignment` incl. new case | AC-022, 023, 027, 019 | scripted AGY | vitest, gate | 7 | new durable |
| R5d | gated `task-reactivation-root-visibility` | AC-020 | scripted AGY | vitest, gate | 6 | |
| R6 | Web unit (full) | AC-007, 012–017, 026 | web | `pnpm -C autobyteus-web test:nuxt --run` | 3 | |
| R7 | Web guards | AC-015 | web | guard scripts | 3 | |
| PT-E2E-001..016 | Existing Projects browser journeys (006 updated) | preserved, AC-026 | browser probe | `test:e2e:projects` | 8 | |
| PT-E2E-017 | Keys and dependencies browser journey | AC-011–015, 017, 018, 026 | browser probe | `test:e2e:projects` | 8 | new durable |
| PMU-* | Panel link, tree summary title | AC-016, 026 | browser probe, scripted AGY | `project-manager-ux-probe.mjs --cases …` | 9 | updated |
| DSK-001 | Released app writes released-shape data on owned root | AC-006 precondition | installed 1.5.5-beta.1 isolated | ticket script | 10 | temporary |
| DSK-002 | First start of worktree build upgrades: keys in creation order, only added fields | AC-006, AC-021 | isolated worktree desktop | ticket script | 11 | temporary |
| DSK-003 | Desktop journeys 1440×900 / 760×900 (board, Task page, copy, picker, new Task with dependency, key URLs, long keys) | AC-012–015, 017, 021, 026 | isolated worktree desktop | ticket script | 12 | temporary |
| DSK-004 | Right-panel Projects tab | AC-012, 013, 021 | isolated worktree desktop | ticket script | 13 | temporary |
| DSK-005 | Tree summary with a delegated copy | AC-016, 021 | isolated worktree desktop (scripted AGY if reachable) | ticket script | 14 | temporary |
| DSK-006 | Restart: second start changes nothing; numbering continues | AC-006 | isolated worktree desktop | ticket script | 15 | temporary |
| R10 | Pre-existing failures: root cause | Rule 9 | — | investigation | 16 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R1 | 2026-10-17 | Completed | `pnpm -C autobyteus-server-ts prebuild && build` | exit 0, dist newer than src | exit 0 | Pass | `evidence/logs/server-build.log` | — |
| 2 | DSK-001 | 2026-10-17 | Completed | installed 1.5.5-beta.1 `isolated-app start --app … --data-root <owned>` (iso-51714-eb1e); `scripts/dsk-001-seed-release.mjs` (release GraphQL); `scripts/dsk-001-release-tool.mjs` (release native tools: statuses, context file); stop | Released-shape data written by a released build | 5 Projects (1 deleted), 12 Tasks, TODO/IN_PROGRESS/DONE/CANCELLED, 1 context file; 16 files snapshotted | Pass | `evidence/desktop/dsk-001-*`, `evidence/logs/dsk-001-*` | — |
| 3 | DSK-002 | 2026-10-17 | Completed | worktree `build:electron:mac`, `isolated-app start --from-worktree --data-root <same>` (iso-52802-e5b4); `scripts/dsk-upgrade-check.mjs` | Keys in creation order, prefixes in Project order (`autobyteus-2` for "AutoByteus!"), only key fields added, ledger SUCCEEDED once | Exactly as expected; no new or removed files; context file bytes unchanged | Pass | `evidence/desktop/dsk-002-upgrade-check.json`, `dsk-002-after-first-start-projects.tar.gz` (snapshot archived at delivery for path-length hygiene) | — |
| 4 | DSK-003 | 2026-10-17 | Completed | `scripts/dsk-ui.mjs` over CDP (attach-only), 1440×900 and 760×900 | VIS-001/003–009/013–015 journeys, key URLs | 9/9 steps Pass, 0 page errors; clipboard read in Electron returned the key | Pass | `evidence/desktop/dsk-003-ui.json`, `dsk-003*.png` | — |
| 5 | DSK-005 | 2026-10-17 | Completed | `scripts/dsk-agent.mjs`: scripted AGY CLI set only in the owned root's `server-data/.env`; Manager run; `delegate_task task_id="AUTOBYTEUS-5"` + a description-only Temp task | Tree copy row "<key> <summary>", key weight 500, title/aria "Show Task in Projects: autobyteus-5 Write the API reference"; Temp row without key; `taskWorkerTasks.taskKey` null for Temp | As expected; locate from the summary works | Pass | `evidence/desktop/dsk-004-005-agent.json`, `dsk-005b-*.png`, `dsk-005c-*.png` | — |
| 6 | DSK-004 | 2026-10-17 | Completed | same run; right-panel Projects tab | Keys + badges on the tab board; tab Task view chip + Dependencies; dependency row opens in the tab; "Open in Projects" key URL; agent `update_task autobyteus-3 DONE` clears autobyteus-5's badge live | 004b/c Pass. 004a first read Fail → harness bug (indexed the Promise of `evaluateAll`); fixed; rechecked: badges present with the rows on remount (3 rounds) and on the first load after restart (26 ms) | Pass (after harness fix) | `dsk-004a-first-load-after-restart.json`, `dsk-004a-right-panel-board-first-load-1440x900.png`, `dsk-004b-*.png`, `dsk-004c-*.png`, `scripts/dsk-004a-panel-*.mjs` | — |
| 7 | DSK-006 | 2026-10-17 | Completed | snapshot before restart; `isolated-app restart iso-52802-e5b4`; `dsk-upgrade-check.mjs` compare mode | No file changes across restart; key migration still 1 attempt | `changedSinceFirstStart: []`, attempts 1 | Pass | `evidence/desktop/dsk-006-restart-check.json` | — |
| 8 | R2 | 2026-10-17 | Completed | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | exit 0 | Pass | `evidence/logs/server-typecheck.log` | — |
| 9 | R3 | 2026-10-17 | Completed | `pnpm -C autobyteus-server-ts test:unit` | all pass | 710 files pass, 4 skipped (gated) | Pass | `evidence/logs/server-unit.log` | — |
| 10 | R6 | 2026-10-17 | Completed | `pnpm -C autobyteus-web test:nuxt --run` | all pass except known base failure | 4448 pass; 1 fail `RightSideTabs.workspaceTarget` (pre-existing; cause: `a3f65bfe6e` removed `FileExplorerTabs` `fileContent`, spec still reads it) | Pass (in scope) | `evidence/logs/web-unit.log` | Follow-up FU-API-001 |
| 11 | R7 | 2026-10-17 | Completed | web guards | exit 0 | exit 0 | Pass | `evidence/logs/web-guards.log` | — |
| 12 | R4a | 2026-10-17 | Completed | clean env `vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` | pass | pass | Pass | `evidence/logs/server-e2e-projects-graphql.log` | — |
| 13 | R4b | 2026-10-17 | Completed | clean env `…/projects-startup-migration.e2e.test.ts` | pass | pass | Pass | `evidence/logs/server-e2e-projects-startup-migration.log` | — |
| 14 | TKD-API-001 / R4c | 2026-10-17 | Completed | clean env `…/project-task-boundaries.e2e.test.ts` | pass incl. new case | pass incl. TKD-API-001 | Pass | `evidence/logs/server-e2e-project-task-boundaries.log` | — |
| 15 | PT-E2E-001..017 (run 1) | 2026-10-17 | Completed | `test:e2e:projects --skip-server-build` | all pass | 14 Pass; 007, 009 Fail (probe used the tool-returned `taskId`, now the key, as the board row id — outdated test assumption, REQ-018); 017 Fail (asserted the active option before any arrow key; spec covers arrow moves only) | Fail (test-side) | `evidence/browser/projects-feature-run1/`, `evidence/logs/probe-projects-feature-run1.log` | Probe updated: `storedIdOf` for 007/009; 017 keyboard assertion per spec |
| 16 | PT-E2E-001..017 (run 2) | 2026-10-17 | Completed | same, after the probe fixes | all pass | 17/17 Pass; cleanup receipt complete | Pass | `evidence/browser/projects-feature/`, `evidence/logs/probe-projects-feature.log` | — |
| 17 | R10a | 2026-10-17 | Completed | clean env `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | known pre-existing | 3/4 fail: ENOENT `team_run_execution_tree.json`; ledger rows 25 vs hardcoded `beforeRows+4`=19 (1 row is this ticket's migration); a run start `success:false` | Out of scope (pre-existing) | `evidence/logs/server-e2e-team-run-v1-production-upgrade.log` | Follow-up FU-API-002 |
| 18 | R5 (gated folder, run 1) / TKD-AGY-001 | 2026-10-17 | Completed | clean env, `RUN_AGY_FAILURE_E2E=1`, scripted `agy-failure-cli.mjs`, `vitest run tests/e2e/projects` (17 files; ran in parallel with the PM-UX probe; host load average 150–245 on 10 cores) | all pass | 11 files pass; 9 tests fail in 6 files: `ad-hoc-task-delegation` ×3 (expects long ID in `update_task` result: outdated by REQ-018), `collaboration-prompt-wording` CPW-R3 (fake `task_id` now refused first: outdated by design REC-005), TKD-AGY-001 (my assertion expected the agent-visible code `TASK_NOT_FOUND`; base and ticket both report `TASK_DELEGATION_ERROR` "found 0"), and timing failures in `task-closure-root-visibility`, `task-copy-idle-lifetime`, `delegated-team-lazy-member-activation` | Fail (test-side + load) | `evidence/logs/server-e2e-projects-gated.log` | Tests updated; reruns below |
| 19 | R5 rerun | 2026-10-17 | Completed | same gate; the 6 files alone | fixed files pass | `task-existing-copy-assignment` 7/7 (TKD-AGY-001 Pass), `ad-hoc-task-delegation` 3/3, `collaboration-prompt-wording` 11/11; the three timing suites failed again under load | Pass (fixed) / load | `evidence/logs/server-e2e-projects-gated-rerun.log` | base comparison |
| 20 | R5 base comparison | 2026-10-17 | Completed | temporary base worktree `c600028072` (deps symlinked; no dependency/schema diff), same gate, each file alone, base then ticket | equal results | `task-closure-root-visibility` 3/3 base, 3/3 ticket; `task-copy-idle-lifetime` 1/1 base, 1/1 ticket; `delegated-team-lazy-member-activation` 2/2 base, 2/2 ticket | Pass | `evidence/logs/compare-*.log` | Earlier failures: load-related |
| 21 | PMU-001..025 (run 1) | 2026-10-17 | Completed | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (scripted AGY), parallel with the gated folder and another worktree's probe | all pass | 21 Pass; 002, 008, 020, 021 Fail | Fail (mixed) | `evidence/browser/project-manager-ux-run1/`, `evidence/logs/probe-project-manager-ux-run1.log` | PMU-020: outdated team-host summary assertion (fixed) |
| 22 | PMU-002/008/020/021 rerun | 2026-10-17 | Completed | `--cases PMU-002,PMU-008,PMU-020,PMU-021` alone | pass | 002, 020, 021 Pass; 008 Fail: waits for a `/worker` member row in "Delivery Team", whose fixture has only `manager` since `938933d8e2` (stale probe step, unrelated to this ticket) | Pass / out of scope | `evidence/browser/project-manager-ux-rerun/` | Follow-up FU-API-003 |
| 23 | LIVE-001 | 2026-10-17 | Completed | `scripts/live-001-claude-haiku.mjs`: probe-owned built server, Claude Agent SDK runtime, model `haiku` = Haiku 5.5 in the SDK catalog (user's signed-in `claude`; no Codex) | A real model follows plain-language instructions using keys | list → `update_task live-keys-1 IN_PROGRESS` → `depends_on ["live-keys-1"]` → `create_task depends_on ["live-keys-2"]` → `live-keys-4` → `delegate_task task_id "live-keys-2"` (blocked) delegated; no long Task ID seen | Pass | `evidence/live/live-001-*.json`, `live-001-conversation.json` | — |

## Round 2 (API-REV-002) — Rerun-by-Impact Plan

- Validated commit of round 1: `d3686fd072` (checkpoint of the API-REV-001 state). Current HEAD: `c95e0138e8` (merged up to `origin/personal@66429d6f31`; IR-004).
- `git diff --name-only d3686fd072 c95e0138e8` (excluding `tickets/`): 263 files. Shared foundations changed (TESTING.md "Rerun by impact" step 4):
  - the contract packages (`autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`);
  - `autobyteus-ts` (agent loop, memory);
  - the E2E harness and fixtures (`tests/e2e/helpers/collaboration-root-harness.ts`, `tests/fixtures/agy-failure-cli.mjs` and others);
  - the agent-tool contract (conflict-resolved).
- Decision: **every round-1 case is Rerun**, including DSK-001..006 (the packaged app bundles the changed server and web) and LIVE-001 (agent runtime and tool contract changed). Plus new or changed cases: `team-run-v1-production-upgrade` (baseline fix `fa49138794`), `tests/architecture` (`9eeb58fb9d`), the probe layout wait (`361eea070d`), and the combined Project + Task tool set.
- Real-model runs: Claude Agent SDK with Claude Haiku 5.5 only (user instruction); no Codex.

| Case | Round-1 commit | Round-2 decision | Reason |
| --- | --- | --- | --- |
| R1–R7 (builds, typecheck, unit, web unit, guards) | d3686fd072 | Rerun | foundations changed |
| R4a/b, TKD-API-001 | d3686fd072 | Rerun | tool contract merged; harness changed |
| R5 gated `tests/e2e/projects` (17 files), TKD-AGY-001 | d3686fd072 | Rerun | harness and fixtures changed |
| R10a `team-run-v1-production-upgrade` | d3686fd072 | Rerun | baseline fix; cause of the remaining failures to be confirmed |
| `tests/architecture` | — | New | baseline fix `9eeb58fb9d` |
| PT-E2E-001..017, PMU-001..025 | d3686fd072 | Rerun | web and server changed; probe fix |
| DSK-001..006 | d3686fd072 | Rerun | packaged build changed |
| LIVE-001 | d3686fd072 | Rerun | runtime and tool contract changed |

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | R1 / build | 2026-10-17 | Completed | `pnpm -C autobyteus-server-ts prebuild`; `pnpm -C autobyteus-web build:electron:mac` at `c95e0138e8` | fresh dist and packaged app | exit 0; dist holds the merged contract (`create_project`/`update_project` + `depends_on`); app 1.5.5-beta.2 | Pass | `evidence/logs/r2-electron-build.log` | — |
| R2-2 | DSK-001 | 2026-10-17 | Completed | installed 1.5.5-beta.1 isolated (iso-54666-daa7), same seed scripts; release tools for statuses/context (first attempt passed a `//` path from `$TMPDIR`, rejected by the release as not normalized; rerun with `/tmp/…`) | released data written by the release | 16 files, same shapes as round 1 | Pass | `evidence/desktop-r2/dsk-001-*` | — |
| R2-3 | DSK-002 | 2026-10-17 | Completed | merged worktree app `--from-worktree` (iso-54787-85d6) | same keys; only key fields; migration once | identical result to round 1 | Pass | `evidence/desktop-r2/dsk-002-upgrade-check.json` | — |
| R2-4 | DSK-003 | 2026-10-17 | Completed | `scripts/dsk-ui.mjs` | 9 journeys | 9/9 Pass, 0 page errors | Pass | `evidence/desktop-r2/dsk-003-ui.json`, `*.png` | — |
| R2-5 | DSK-004/005 | 2026-10-17 | Completed | `scripts/dsk-agent.mjs` (scripted AGY in the owned `.env`) | tab, tree, live clear, locate | 6/6 Pass | Pass | `evidence/desktop-r2/dsk-004-005-agent.json`, `*.png` | — |
| R2-6 | DSK-006 | 2026-10-17 | Completed | restart; compare mode | no change | `changedSinceFirstStart: []`, attempts 1 | Pass | `evidence/desktop-r2/dsk-006-restart-check.json` | instance stopped, root removed, snapshots archived `.tar.gz` |
| R2-7 | LIVE-001 (extended) | 2026-10-17 | Completed | `scripts/live-001-claude-haiku.mjs`; Claude Agent SDK, `haiku` = Haiku 5.5; Manager also has `create_project`/`update_project` | keys in every call; rename keeps prefix | 7 tool calls by key; `update_project` rename; `live-keys-5` after rename; 10/10 checks | Pass | `evidence/live-r2/` | — |
| R2-8 | R2/R3/R6/R7 + architecture | 2026-10-17 | Completed | typecheck; `test:unit`; `vitest run tests/architecture`; `test:nuxt --run`; guards | all pass | server 5811 pass (7 gated skips); architecture 44 pass (fix `9eeb58fb9d`); web 4473 pass, 0 fail (RightSideTabs fixed on base `66c61595d2`); guards pass | Pass | `evidence/logs/r2-server-*.log`, `r2-web-*.log` | — |
| R2-9 | R4a/b, TKD-API-001 | 2026-10-17 | Completed | clean env core Projects E2E | pass | projects-graphql 11/11, startup-migration 6/6, project-task-boundaries 14/14 (incl. TKD-API-001 and the merged Project tools) | Pass | `evidence/logs/r2-server-e2e-*.log` | — |
| R2-10 | R5 gated folder + TKD-AGY-001 | 2026-10-17 | Completed | `RUN_AGY_FAILURE_E2E=1`, scripted CLI, `vitest run tests/e2e/projects` (18 files; load avg reached 141 at start) | all pass | 17/18 files pass (88 tests, TKD-AGY-001 Pass); `task-copy-idle-lifetime` failed (Org wake refused) | Pass except idle-lifetime | `evidence/logs/r2-server-e2e-projects-gated.log` | cause analysis R2-11 |
| R2-11 | `task-copy-idle-lifetime` cause | 2026-10-17 | Completed | solo reruns on ticket (×4 + 3 in the series) and base `66429d6f31` (×5) in a temporary base worktree; suite, fixture, `runtime-management`, `agent-execution`, e2e helpers byte-identical to base | cause found | Ticket 4/7: failures (2 × "Antigravity model discovery timed out", 1 × worker idle wait timed out) all within ~30 min after the heavy gated run. Alternating series: base 3/3, ticket 3/3. Base 5/5 overall. Cause: the suite's timing limits under host or in-test CPU contention (the 3 s `agy --help` probe in `SHORT_PROBE_TIMEOUT_MS`, idle/stop deadlines), as documented on the base in `45291d105f`; it answers in 0.03 s when idle. The failing steps (description-only delegations, idle waits) do not run this ticket's code. | Out of scope, cause reported | `evidence/logs/r2-*-task-copy-idle-lifetime-*.log` | FU-API-005 (owners already reported per `45291d105f`) |
| R2-12 | `team-run-v1-production-upgrade` (fix `fa49138794`) | 2026-10-17 | Completed | clean env run (1/4); temporary local edit of case 1 (reverted; `git status` clean) to log the converted memory layout and run the fixed ledger check past the ENOENT | ledger check passes; cause of the other failures confirmed | Ledger check passes: 12 new rows incl. `20261017_project_task_keys_v1`. Converted layout is `memory/agent_orgs/team-v1-supported-root/agent_org_run_execution_tree.json` (by `20260901_agent_org_flat_team_families_v1`), while the test expects `agent_teams/…/team_run_execution_tree.json` | Fix verified; remaining 3/4 out of scope with cause | `evidence/logs/r2-server-e2e-team-run-v1-production-upgrade.log` | FU-API-002 (owner of the flat-team-families migration) |
| R2-13 | PT-E2E-001..017 | 2026-10-17 | Completed | `test:e2e:projects --skip-server-build` | all pass incl. layout wait | 17/17 Pass; cleanup receipt complete | Pass | `evidence/browser/projects-feature-r2/` | — |
| R2-14 | PMU-001..025 | 2026-10-17 | Completed | full probe, then PMU-020/021 alone ×2 | all pass | 24/25 (PMU-008 now passes on the merged base); PMU-021 failed on one console error `[FileExplorerStreaming] WebSocket error` raised when its `page.reload()` aborted the file-explorer socket (file-explorer code identical to base); PMU-020/021 alone: Pass ×2 | Pass (in scope) | `evidence/browser/project-manager-ux-r2*/` | FU-API-004 |

## Re-entry And Reconciliation

- Last durably recorded event: R2-14 (round 2)
- Last completed case and result: PMU-020/021 rerun Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption or rerun note: the user interrupted once to require Claude Agent SDK Haiku 5.5 for real-model testing (no ChatGPT/Codex credit); LIVE-001 follows that. No run of this round used Codex.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
- Reconciliation note: every case has a terminal result.
