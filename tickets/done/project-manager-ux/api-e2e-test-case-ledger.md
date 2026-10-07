# API/E2E Test-Case Ledger — `project-manager-ux`

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`
- Coverage investigation: `…/tickets/in-progress/project-manager-ux/api-e2e-coverage-investigation.md`
- Execution coverage report: `…/tickets/in-progress/project-manager-ux/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `…/tickets/in-progress/project-manager-ux/api-e2e-revision-record.md`
- Scope: API-REV-001. The run is multi-case and includes long browser and desktop cases.
- Last updated: 2026-10-07

## Planned Cases

| Case ID | Case | AC | Surface | Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| REPO-UNIT | Server unit + architecture | logic | Vitest | investigation order 2 | 1 |
| REPO-WEB | Web specs | logic | Vitest Nuxt | order 3 | 2 |
| REPO-CONTRACT | Collab contracts (shared fold) | — | node:test | order 4 | 3 |
| REPO-E2E-BASE | Gated `tests/e2e/projects` | AC-015 basis | Real server | order 5 | 4 |
| FEED-* | New server E2E (7 cases) | AC-001..008, 019..021, 023; QR-001/002 | Real HTTP/WS/MCP | `project-change-feed.e2e.test.ts` | 5 |
| PMU-BASE | Implementer probe PMU-001..007 | — | Browser | probe | 6 |
| PMU-008..012 | Extended probe cases | AC-007, 012, 013, 020, 021, 023; RU-2, RU-4 | Browser | probe | 7 |
| PMU-ALL | Full probe PMU-001..012 | all browser | Browser | `pnpm -C autobyteus-web test:e2e:project-manager-ux` | 8 |
| PT-E2E | `projects-feature-probe.mjs` PT-E2E-001..016 | AC-015 | Browser, 2 nodes | `test:e2e:projects` | 9 |
| USER-JOURNEY | Real model as Project Task Manager in an isolated desktop build | SCN-002..006 | Desktop | isolated-app + UI | 10 |

## Execution Events

| Seq | Case ID | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-UNIT | Completed | order 2 | Pass | 153 files / 1140 tests | Pass | `api-e2e-evidence/unit.log` | — |
| 2 | REPO-WEB | Completed | order 3 | Pass, except known failures | 1143 pass, 1 fail (`workspaceSelectionComposition`, also fails on base) | Pass (pre-existing failure recorded) | `web.log` | — |
| 3 | REPO-CONTRACT | Completed | order 4 | New test passes | 15 pass / 7 pre-existing `schema_version` | Pass | `collab.log` | — |
| 4 | REPO-E2E-BASE | Completed | order 5 | Pass | 31 + 1 skipped | Pass | `e2e-projects-baseline.log` | — |
| 5 | (scratch) | Checkpoint | Temporary start-failure experiment, deleted afterwards | A real `start: failed` | Missing workspace → ENOENT; unknown model → `AGY_MODEL_UNAVAILABLE`; both `failed` + startError. Chose unknown model | — | ledger only | write FEED |
| 6 | FEED-* | Completed | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/projects/project-change-feed.e2e.test.ts` | 7/7 | 7/7 on the first run. Evidence checked: 252 frames all valid; 4401 parity; running → idle after delegation and after reactivation; DONE views closed-then-DONE; volume 20 frames; UI write 61 ms | Pass | `server-e2e/` | — |
| 7 | PMU-BASE | Completed | implementer probe, unmodified | 7/7 | **PMU-002 failed once**: the root showed Idle and openable (›), the click did not open the worker (stayed on the board). PMU-001..007 otherwise Pass | Fail (intermittent) | `/tmp/pmux-api/pmu-baseline/` (copied to `api-e2e-evidence/pmu-baseline/`) | investigate |
| 8 | PMU-002 repro | Checkpoint | PMU-001,002 ×2; temp diagnostic (8 move-then-click loops); instrumented PMU-001,002 ×4 | Reproduce | 0 failures in 2 + 8 + 4 attempts (1 in 15 overall). The diagnostic showed the click lands on the root button (`project-task-root-name` span inside it). No console errors | Not reproduced | `/tmp/pmux-api/diag*` | Durable console capture added to the probe; track as intermittent |
| 9 | PMU-ALL (1st) | Checkpoint | extended probe | 12/12 | PMU-007 failed on my new error assertion (restart-window 500 / websocket errors: test defect). PMU-009 failed: my helper query lacked `root.ingressAgentRunId`, so the message had no target (test defect; the product kept the root Offline correctly). Others Pass, including PMU-008, 010, 011, 012 | — | `/tmp/pmux-api/pmu-ext1/` | fix + rerun |
| 10 | PMU-003, 007, 009 | Completed | after fixes | Pass | All Pass. PMU-009: Done → reopened (Offline, div) → reactivated (Idle, button) → chat deleted from the left panel: both rows left live, pill "2 open" → hidden | Pass | `/tmp/pmux-api/pmu-ext2/` | full run |

| 11 | PMU-ALL | Completed | `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir …/pmu-full` | 12/12 | 12/12 Pass; feed 119 messages; cleanup complete | Pass | `api-e2e-evidence/pmu-full/` | — |
| 12 | PMU-008 | Completed | after tightening the Team/Org member check (selected + conversation shown) | Pass | Pass | Pass | `api-e2e-evidence/pmu-008-rerun/` | — |
| 13 | PT-E2E | Completed | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=…` (two real nodes) | 16/16 | 16/16 Pass; cleanup complete | Pass | `api-e2e-evidence/projects-feature-probe/` | — |
| 14 | USER-JOURNEY | Checkpoint | `pnpm -C autobyteus-web build:electron:mac` (needed for the isolated desktop instance) | Packaged app | **Build fails** at `audit:localization-literals`: `M-015 components/projects/ProjectTaskWorkers.vue projects.root.status.{{expr}} unresolved` and `M-015 components/projects/TempTaskBoard.vue projects.temp.lane.{{expr}} unresolved`. Both lines come from `4d469b0c5`. The same audit passed today on the reactivate-done-task-runs build ("zero unresolved findings") | **Fail** (product defect: release build blocked) | `api-e2e-evidence/electron-build.log`, `l10n-audit.log` | Reroute (failure-origin review) |
| 15 | USER-JOURNEY | Completed | — | — | Not run: no packaged build can be produced from this commit. Deferred to the rerun after the fix (the journey must use the fixed build anyway) | Blocked (by event 14) | — | Rerun after fix |

### Round 2 (API-REV-002, commit `8ef467696`, after CRR-003)

| Seq | Case ID | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | RELEASE-BUILD (F-001 recheck) | Completed | `node scripts/audit-localization-literals.mjs`; `pnpm -C autobyteus-web build:electron:mac` | Pass + package | Audit "zero unresolved findings" (exit 0); build exit 0; dmg/zip/`mac-arm64` produced | Pass (F-001 resolved) | `r2/r2-l10n-audit.log`, `r2/r2-electron-build.log` | — |
| 17 | REPO-E2E + FEED-* | Completed | gated `vitest run tests/e2e/projects` (server rebuilt) | Pass | 8 files: 38 pass + 1 skipped | Pass | `r2/server-e2e/` | — |
| 18 | REPO-WEB | Completed | Projects/web suites | Pass, except known failures | 1132 pass, 1 pre-existing `workspaceSelectionComposition` | Pass | `r2/web.log` | — |
| 19 | USER-JOURNEY | Completed | isolated `iso-53469-f4cb`, test package, Claude `claude-opus-5-5`, UI only | Real product journey | 14 steps as in the receipt. AC-001/002/003/005/008..013/016..019/021/023 shown with a real model; Running held ~8 s then Idle. Cleanup: not forced, data removed, ports released | Pass | `user-journey/journey-receipt.md`, `shots/`, `final-state/` | — |
| 20 | PMU-ALL | Checkpoint | full probe (1st, cold dev server after the web source change) | 12/12 | PMU-001 (browser error "Failed to fetch all workspace metadata"), PMU-002 (root Idle but not openable: host not in run history), PMU-003 (coordinator not opened) and PMU-007 (dependent) failed. `frontend.log`: 4 × "optimized dependencies changed. reloading" | — | `r2/pmu-full-attempt1-cold/` | diagnose |
| 21 | PMU-ALL | Completed | full probe, warm cache | 12/12 | 12/12; 0 reloads in `frontend.log`. Round-1 baseline (O-1) `frontend.log` also had 4 reloads; all warm runs had 0 → O-1 and attempt 1 are a dev-server cold-optimization harness effect, not product behavior (the packaged app passed AC-010/011 in USER-JOURNEY) | Pass | `r2/pmu-full/` | Harden the probe |
| 22 | PMU-ALL | Completed | full probe with the new warm-up step, **forced cold** (moved `node_modules/.cache/vite` aside; regenerated, backup removed) | 12/12 from cold | warm-up absorbed 1 reload; 12/12 Pass | Pass | `r2/pmu-full-cold-warmup/` | — |
| 23 | PT-E2E | Completed | `test:e2e:projects --skip-server-build` | 16/16 | 16/16 Pass; cleanup complete | Pass | `r2/projects-feature-probe/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 23 (round 2 complete; everything Pass)
- Round 1 final: F-001 Fail, USER-JOURNEY blocked. Round 2: F-001 resolved; all cases Pass.
- Reconciled into the execution report (round 2): Yes
