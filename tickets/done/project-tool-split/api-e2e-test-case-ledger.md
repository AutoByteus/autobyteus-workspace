# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split`
- Coverage investigation: `tickets/in-progress/project-tool-split/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/project-tool-split/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/project-tool-split/api-e2e-revision-record.md`
- Ledger scope and reason it is required: there are many independent cases, including long gated suites and real-app sessions on two app builds, and the run may be interrupted
- Last updated: 2026-10-17

Evidence paths are relative to `tickets/in-progress/project-tool-split/evidence/api-e2e/`.

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BUILD | server build, nuxt prepare | — | build | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web exec nuxt prepare` | 0 | |
| UNIT-CHG | changed unit files + MCP unit folder | AC-001..AC-004, AC-007 | vitest | `vitest run <2 files> tests/unit/agent-tools/mcp` | 1 | |
| TYPECHECK | production src | — | tsc | `pnpm -C autobyteus-server-ts typecheck` | 2 | |
| UNIT-ALL | server unit suite | regression | vitest | `pnpm -C autobyteus-server-ts test:unit` | 3 | |
| E2E-UNGATED | projects e2e without gate | AC-001..AC-004 | real HTTP MCP, built nodes | clean env `vitest run tests/e2e/projects` | 4 | |
| E2E-AGY | projects e2e, scripted AGY | AC-001, regression | scoped MCP, real server | same + `RUN_AGY_FAILURE_E2E=1` | 5 | includes the 5 edited files |
| WEB-PMU | project-manager-ux probe | regression | browser + real backend | `pnpm -C autobyteus-web test:e2e:project-manager-ux` | 6 | |
| WEB-TCT | task-closure-tree probe | regression | browser + real backend | `pnpm -C autobyteus-web test:e2e:task-closure-tree` | 7 | |
| AC5-PROBE-REL | module probe on exact v1.5.5-beta.2 | AC-005 | release server resources | `node evidence/ac-005-tool-resolution-probe.mjs <beta.2 server>` | 8 | |
| AC5-PROBE-NEW | module probe on worktree | AC-005 | worktree server | same, worktree | 8 | |
| APP-NEW | new-tools agent creates and updates a Project | AC-006, AC-001, AC-002 | isolated worktree build, AGY (MCP) | `app-journey.mjs` | 9 | |
| APP-OLD | old-only agent creates and updates | AC-006, AC-004 | same | same | 9 | |
| APP-MIX | transition agent: all three listed and callable | AC-005 (new) | same | same | 9 | |
| APP-NONE | no-project-tool agent refused | AC-003 | same | same | 9 | |
| APP-NATIVE | native runtime (LM Studio) new tools and old tool | AC-006, DS-001 native | isolated worktree build, AutoByteus runtime | same | 10 | real local inference |
| REL-MIX / REL-OLD / REL-NEW | release app: transition list launches with old tool only; old works; new-only has none | AC-005 (release) | isolated v1.5.5-beta.2, AGY (MCP) + native launch | same | 11 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BUILD | 08:12 | Completed | server build; nuxt prepare | exit 0 | both exit 0; bootstrap smoke passed | Pass | server-build.log, nuxt-prepare.log | — |
| 2 | UNIT-CHG | 08:18 | Completed | vitest 9 files | all pass | 9 files / 167 tests passed | Pass | unit-changed.log | — |
| 3 | TYPECHECK | 08:18 | Completed | tsc build policy | exit 0 | exit 0 | Pass | server-typecheck.log | — |
| 4 | UNIT-ALL | 08:19 | Started | `test:unit` | all pass | running | — | server-unit-full.log | — |
| 5 | AC5-PROBE-REL | 08:24 | Completed | probe on `/tmp/pts-release-beta2.*/app/AutoByteus.app/Contents/Resources/server` (v1.5.5-beta.2 arm64 zip, sha512 matches `latest-mac.yml`), throwaway HOME | transition list: old tool only, new names skipped with warning, 0 errors | as expected on native and MCP; 0 errors | Pass | ac005-probe-release-v1.5.5-beta.2.txt | — |
| 6 | AC5-PROBE-NEW | 08:24 | Completed | same probe, worktree server (fresh build) | all three for the transition list; old-only → old; new-only → both new | as expected; 0 warnings | Pass | ac005-probe-new-build.txt | — |
| 7 | UNIT-ALL | 08:26 | Completed | `test:unit` | all pass | 709 files / 5744 tests passed; 4 files / 7 tests skipped (gates) | Pass | server-unit-full.log | — |
| 8 | E2E-UNGATED + E2E-AGY | 08:27 | Started | one clean-env run of `tests/e2e/projects` with `RUN_AGY_FAILURE_E2E=1` (ungated files run too) | all pass | running | — | server-e2e-projects-agy.log | — |
| 9 | E2E-UNGATED + E2E-AGY | 08:37 | Completed | as 8 (637 s) | all pass | 16/17 files pass, 80 tests pass, 4 skipped. `task-closure-root-visibility` fails 2/3 (Agent and Org roots) at line 282: `expected 1 to be ≥ 2` messages touching Task A before DONE. All 4 other edited AGY files, `project-change-feed` (`create_project` call), boundaries (13) and node-locality pass | Fail (1 file, 2 cases) | server-e2e-projects-agy.log | classify: rerun alone, compare with base |
| 10 | E2E-TCRV-RERUN | 08:45 | Completed | `task-closure-root-visibility` alone ×5, branch, clean env | 3/3 each | 3/3 passed in each of 5 runs | Pass | tcrv-branch-rerun-1..5.log | the failure appears only under full-folder load; base comparison next |
| 11 | E2E-BASE | 08:46 | Started | base worktree `../project-tool-split-api-base` at `8a970f214c`: install, prebuild, build | — | setting up | — | base-setup.log | then the full projects folder on base |
| 12 | E2E-BASE | 08:49 | Completed | full projects folder on base, same gate/env | — | 16/17 files; `task-closure-root-visibility` passed; `task-copy-idle-lifetime` failed ("Antigravity model discovery timed out", the precedent's known baseline signature) | Info | base-setup.log, base-server-e2e-projects-agy-1.log | host load avg ≈ 61 on 10 cores |
| 13 | TCRV-BASE-INJECT | 08:53 | Completed | base, `task-closure-root-visibility` with the 2nd `send_message_to` delayed 4 s (temp edit, `tcrv-timing-injection.diff`) | if the wait is too weak: same failure | 3/3 roots fail with the identical `expected 1 to be ≥ 2` at line 282 | Reproduced on base | tcrv-base-timing-injection.log | pre-existing test race → Rule 9 baseline fix |
| 14 | TCRV-BASE-INJECT-FIX | 08:55 | Completed | base, same injection + fixed wait (`tcrv-timing-injection-with-fix.diff`); base reverted after | 3/3 pass | 3/3 pass | Pass | tcrv-base-timing-injection-with-fix.log | — |
| 15 | TCRV-BRANCH-FIXED | 08:58 | Completed | branch with the fix, file alone ×3 | 3/3 each | 3/3 ×3 | Pass | tcrv-branch-fixed-1..3.log | committed `0205b9ed79` (baseline fix) |
| 16 | E2E-AGY (round 2) | 09:00 | Started | full projects folder on branch with the fix | all pass | running | — | server-e2e-projects-agy-2.log | — |
| 17 | E2E-AGY (round 2) | 09:11 | Completed | as 16 | all pass | 17/17 files, 82 passed, 4 skipped | Pass | server-e2e-projects-agy-2.log | — |
| 18 | WEB-PMU | 09:25 | Completed | `test:e2e:project-manager-ux --output-dir probe-pmu` | 25/25 | 23/25; PMU-008 (waits for Team member `/worker`), PMU-021 (Enter/Space center check) fail; cleanup complete | Fail | probe-pmu/, probe-pmu.log | diagnose both |
| 19 | WEB-PMU 008/021 alone | 09:32 | Completed | `--cases PMU-008,PMU-021` | — | PMU-008 fails again (deterministic); PMU-021 passes alone | Info | probe-pmu-rerun-008-021/ | — |
| 20 | (user direction) | 09:35 | Checkpoint | user: diagnose and fix every failure on the worktree, no base comparison; update TESTING.md | — | TESTING.md Rule 9 rewritten (`1c7eb70151`); "Green server baseline" wording and "Known baseline exception" removed (`7af116e8de`) after tracing that exception's cause | — | integration-agent-status-websocket.log, followup-agent-input-state-flushes-content-cadence.md | product defect sent to `/project_task_manager` (tracked as PB-001) |
| 21 | PMU-008 fix | 09:50 | Completed | cause: `938933d8e2` removed Team members `worker`/`helper`; PMU-008 still waited for `/worker`. Probe now uses the Team's member `/manager` | Pass | PMU-008 Pass alone | Pass | probe-pmu-008-fixed/ | uncommitted probe edit |
| 22 | PMU-021 diagnosis | 10:00–10:30 | Checkpoint | full runs probe-pmu-2, probe-pmu-3: baseline `centerBefore` read before the host conversation settled; after settling (wait for `CALLED:` + 1 s stable) the first check passes; the keyboard check still differs in the center header | — | selection identical before/after; tail of center identical | — | probe-pmu-2/, probe-pmu-3/ | probe-pmu-4 records the exact text diff |
| 23 | (user direction) | 10:05 | Checkpoint | user: real-model testing uses Claude Agent SDK with Haiku 5.5 (no ChatGPT/Codex quota) | — | journey script REAL-* cases switched from LM Studio native to `claude_agent_sdk` | — | app-journey.mjs | — |
| 24 | WEB-PMU (run 4) | 10:55 | Completed | full probe with text diff details | — | 25/25 (PMU-021 intermittent; the diff was not captured) | Info | probe-pmu-4/ | fix the stale keyboard baseline anyway (logic fault) |
| 25 | WEB-PMU (run 5) | 11:20 | Completed | full probe; PMU-021 settled baselines read just before each action | 25/25 | 25/25; cleanup complete | Pass | probe-pmu-5/ | committed `50f228811f`, `dec87a3915` |
| 26 | WEB-TCT | 11:40 | Completed | `test:e2e:task-closure-tree` | 16/16 | 16/16; cleanup complete | Pass | probe-tct/ | — |
| 27 | AC5-PROBE-PACKAGED | 10:08 (instance clock) | Completed | module probe on the packaged worktree build's `Resources/server` | all three registered and served | as expected; 0 errors | Pass | ac005-probe-packaged-worktree-build.txt | — |
| 28 | APP-NEW/OLD/MIX/NONE | 10:09 | Completed | `iso-54116-770a` (worktree packaged build), scripted AGY via `updateServerSetting` + restart, package import | per investigation | all pass; unlisted calls refused `Tool is not enabled for this session` | Pass | app-new/journey/ | — |
| 29 | REAL-NEW/OLD/NONE | 10:09 | Completed | same instance, `claude_agent_sdk`, model `haiku` (Haiku 5.5) | model uses listed tools; no-tool agent refuses | `create_project`+`update_project`; `create_or_update_project`; refusal, nothing created | Pass | app-new/journey/REAL-*.json | — |
| 30 | UI-NEW | 10:11 | Completed | browser automation on the instance window | picker lists new tools; Projects page shows results | yes | Pass | app-new/ui-*.png | instance stopped, data root removed |
| 31 | REL-MIX/OLD/NEW/REAL-MIX | 10:13 | Completed | `iso-54883-ce19` (downloaded v1.5.5-beta.2), same setup | transition list: old tool only, no launch error; new-only: none | as expected; `create_project` → `Unknown MCP tool`; Haiku uses the old tool | Pass | app-release/journey/ | instance stopped, data root and download removed |
| 32 | AC4-OLD-TOOL-XVER | 10:14 | Completed | compare the old tool's MCP description and schema, new build vs release | identical | identical | Pass | ac004-old-tool-release-vs-new-build.json | — |

## Re-entry And Reconciliation

- Last durably recorded event: 32
- Last completed case and result: AC4-OLD-TOOL-XVER Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption or rerun note: a base probe run (PMU-008/021 on base) was stopped by the user; it is not evidence and was deleted, together with its leftover temp data root.
- Reconciled into execution coverage report: `Yes`. See `api-e2e-execution-coverage-report.md` §Test-Case Ledger Reconciliation.
- Reconciliation note for any case missing a terminal result: none. Clock note: event times before 10:00 are approximate wall-clock times; app-journey logs are in UTC.
