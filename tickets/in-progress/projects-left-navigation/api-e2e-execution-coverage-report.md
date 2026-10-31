# API/E2E Execution Coverage Report — projects-left-navigation

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-002 pass (HEAD `e1d9a58a13`, code commit `467cff24c0`).
- Prior round reviewed: none.
- Deviations from the investigation's plan, and why:
  - API-04 (browser probe) picks the AGY model in each draft's model menu. A target switch keeps the draft's earlier model (existing CR-004 behavior), so the definitions' default launch config is not applied to a "+" draft.
  - API-04 runs under `env -i` and strips provider credentials from its child processes. The first run inherited the shell's `*_API_KEY` variables; no provider call was made (no Anthropic key was present), and the probe was corrected.
  - API-05 uses `isolated-app start --from-worktree` on the build that `--build` produced. Only its DMG step failed, on `hdiutil resize` (exit 35, "resource temporarily unavailable"), an environment condition. The unpacked `AutoByteus.app` came from that same build (14:13 local).
  - AC-011's reconnect proof is limited to what Projects mode owns (DS-004). The run's own stream after a backend restart is existing behavior, shared with Workspaces mode (FU-008).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (on Pass); this round is a `Fail` and goes to failure-origin review.
- Proportional test-code review decision: `Required` (Large / High). Requested together with the failure-origin review, for the added durable tests below.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `467cff24c0` code (HEAD `172068d4ed`, docs only after it) + this round's tests | macOS 26 (Darwin 25.5), arm64, Node 22 | In-process Studio server (Vitest, server E2E); scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | `env -i PATH HOME=<temp> TMPDIR`; temp data dir per suite; `RUN_AGY_FAILURE_E2E=1` |
| ENV-2 | same | macOS, arm64 | Vitest + happy-dom (web component) | — |
| ENV-3 | same; server `dist` built from this tree | macOS, arm64 | Probe-owned stack: built `autobyteus-server-ts/dist/app.js` (dev data root, free ports) + Nuxt dev + headless Chrome 156.0.8078.74; scripted AGY | `env -i PATH HOME TMPDIR USER LOGNAME`; no provider keys; en-US 1440×900, zh-CN, 600×800 |
| ENV-4 | same; packaged worktree build (`electron-dist/mac-arm64/AutoByteus.app`, 1.5.11-beta.7) | macOS, arm64 | Isolated desktop instance `iso-61565-aa80` (own data root `/tmp/pln-iso-root`, own ports), scripted AGY through the data root's `server-data/.env` (`ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE`) | The AGY catalog read `[{"modelIdentifier":"gemini-3.8-flash-low","name":"Gemini test"}]` (the scripted CLI, not the real `agy`) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | server unit | Reused IMP-01, IMP-01b | — | Pass | (implementation evidence) | IMP-01 `Tests  7558 passed` | Ran at `467cff24c0`; `git diff --name-only 467cff24c0 HEAD` outside `tickets/` is empty |
| API-R02 | — | server typecheck | Reused IMP-02 | — | Pass | — | `exit=0` | Same commit |
| API-R03 | all web; REQ-015 | web suite, typecheck, guards, new web tests | Reused IMP-03, IMP-04, IMP-05, IMP-07 | — | Pass | — | IMP-04 `Tests  4914 passed` | Ran at `dacdceed36`; the only web change since is a moved doc comment in `utils/runTreeProjection.ts` (diff in the progress log) |
| API-R04 | AC-002/003/007/009 units; rollback | server new tests, rollback shape | Reused IMP-06, IMP-10 | — | Pass | — | IMP-06 `Tests  132 passed (132)`; IMP-10 empty diff | Same commit |
| API-01 | AC-002, AC-003 (record, prompt, Team members), AC-004 (server), AC-005 (server), AC-006/007 (scopes), AC-008 (server), AC-009 (server), AC-012 (archive, delete); RU-02 | Real GraphQL/WS, scoped MCP `delegate_task` / `update_task` / `send_message_to`, `project_runs.json`, AGY capsule prompt | `env -i PATH HOME=<tmp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs PROJECT_RUN_HISTORY_E2E_EVIDENCE_DIR=<ev>/API-01 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-run-history.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-server-e2e.log`, `API-01-server-e2e.full.log.gz`, `API-01/project-run-history.json` | `Tests  10 passed (10)`; JSON `prh01.prompt` starts `"## Project\n\nYou work in the Project Prototype Launch … (Project ID project_…)."`; `prh01.runRecordKeys` contains no key with "project"; `prh02.team` `"success":false,"message":"ProjectError: Project '…' was not found."` | PRH-01…PRH-10 (titles in the log). The first run failed PRH-02 and PRH-09 on the test's own expectation: the code `PROJECT_NOT_FOUND` is not in run creation's message, which is the existing `{success:false, message}` start result (design § Risks). The test was corrected, then 10/10. Also passed again inside API-02 |
| API-02 | Preserved: prompt views, closure, reactivation, follow-up Tasks, Temp tasks, history, Team creation | Existing gated server E2E | as API-01 but `vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs --no-watch`; then `-t "EXC-E2E-004"` alone | ENV-1 | Pass (in scope) | `API-02-server-e2e-regression.log`, `.full.log.gz` | `Test Files  1 failed \| 38 passed (39)`, `Tests  1 failed \| 179 passed \| 4 skipped (184)`; the failure `EXC-E2E-004 … assignment refused (offset 9): … is fenced for root shutdown`; alone `Tests  1 passed \| 8 skipped (9)` | `collaboration-prompt-wording` (11), closure, reactivation, `task-agent-several-tasks`, `projects-graphql`, `project-change-feed` and the run-history suites all pass. The one failure is a race in unchanged code (cause below), recorded as FU-007 |
| API-03 | AC-007 (Org rows), REQ-008 | Web component: `WorkspaceAgentOrgHistoryCollection` with a scope | `pnpm -C autobyteus-web exec vitest run components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` | ENV-2 | Pass | `API-03-web-org-scope.log` | `Tests  3 passed (3)` | In scope: only that copy and its subtree; configured members stay; an unscoped top-level copy is reported once; no scope shows everything |
| API-04 | AC-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 015, 016, 017 | Browser on a real stack (real delegation) | `env -i PATH HOME TMPDIR USER LOGNAME pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <ev>/API-04-browser-probe` | ENV-3 | **Fail** (PLN-09); PLN-01…08 and PLN-10 Pass | `API-04-browser-probe.log`, `API-04-browser-probe/evidence.json`, `API-04-browser-probe/PLN-*.png`, backend/frontend logs (`.gz`) | `PLN-09: Fail — Projects mode still shows Stop on a run the user stopped there, while Workspaces mode shows it stopped (until the next re-read)`; evidence.json `PLN-09.details.stopDiag` = `{"serverActiveAfterStop":[false],"projectsStopButtonsAfter5s":1,"workspacesStopButtons":[],"projectsStopButtonsAfterModeSwitch":0}`; screenshot `PLN-09-after-stop-projects.png` (A green with the red Stop) vs `PLN-09-after-stop-workspaces.png` | Per-case results and details below. The same PLN-09 observation reproduced in two earlier runs (runs 6 and 7) |
| API-05 | AC-014 (and AC-003 folder and prompt, AC-006, AC-008, AC-001 in the packaged app) | Isolated desktop instance of the worktree build | `isolated-app start --build --data-root /tmp/pln-iso-root` (built; DMG step env failure) → `start --from-worktree --data-root …` → stop → AGY lines added to `server-data/.env` → start → `node API-05-desktop-journey.mjs <controlPort> <backendUrl> <dataRoot> <out>` → `isolated-app stop iso-61565-aa80` | ENV-4 | Pass | `API-05-desktop-journey.mjs`, `API-05-desktop/API-05-desktop-journey.log`, `API-05-desktop/API-05-0[1-8]-*.png`, `API-05-instance-start.json`, `API-05-instance-stop.json`, `API-05-build-dmg-step.log` | `start surface chip: "Prototype Launch dd58"`; `run folder and runtime: {"workspaceRootPath":"/private/tmp/pln-iso-root/launch-repo","runtimeKind":"antigravity_cli"}`; `Team row with Task line: "Review the launch checklist"`; `Workspaces mode: run marked open: "true"`; `page errors: []`; `result: "Pass"` | The first attempt failed only on the driver's member-row selector (wrong transient kind; that attempt's output was replaced by the rerun) |
| API-06 | AC-017 | Rendered screenshots vs references | Side-by-side reading of VIS-003 vs `PLN-05-p-team-with-task-line.png`, VIS-009 vs `PLN-02-start-surface-under-p.png`, VIS-012 vs `PLN-10-chip-menu-projects-tab.png`, VIS-015 vs `PLN-02-listed-under-p.png`, VIS-014 vs `PLN-03-chip-folder-kept.png` (chip text), VIS-016 vs `PLN-03-chip-r.png`, VIS-019 vs `PLN-10-keyboard-focus.png`, VIS-022 vs `PLN-10-zh-CN.png`, VIS-024/025 vs `PLN-10-narrow-*.png`, VIS-001/002 vs `API-05-01/02`; with IMP-09's VIS-002, VIS-012, VIS-025 comparisons | ENV-3, ENV-4 | Pass | the screenshots named | Same structure: flat switch with "+"; briefcase Project rows with no selected mark; groups with count and "+"; nested delegated rows with Task lines; TEAMS group; chip "Project" / "Project · folder"; chip menu tabs, "No project", folders under Projects | Differences are content the spec marks illustrative (names, counts, times, model labels). VIS-004…008 (empty, loading, error states) were not re-rendered: they are covered by component tests (IMP-07) and IMP-09 |

### API-04 per-case results (evidence.json `cases`)

| Probe case | Result | What it showed |
| --- | --- | --- |
| PLN-01 AC-002/AC-001 | Pass | A Workspaces run that dispatched Tasks of 3 Projects is listed once under each (`perProject` P/Q/R = same id); the archived run is absent. Opened from Q, its tree shows only its Q copy (`qCopies` length 1). Switching to Workspaces keeps the same open run (URL id) and marks it. Projects mode is remembered after reload (`remembered: "true"`) |
| PLN-02 AC-003 | Pass | "+" on P → manager → AGY → send. The chip showed `"Prototype Launch …"`, aria `"Project: Prototype Launch …"`. It was listed under P at once (`listedMs: 204`) and in `project_runs.json`, with folder = P's folder and the prompt's `## Project` section. After the send the run view has no Project chip. It is also listed under its folder in Workspaces mode |
| PLN-03 AC-015/AC-004 | Pass | Plain New chat: R (two folders) → first folder `r-first`; Q (none) → `temp_workspace`, and no folder linked to Q; a folder picked first is kept (`chipPicked: "Website … · picked-folder"`); "No project" → a plain run, in no Project file and without a `## Project` section. All runs are on `antigravity_cli`. Note: after P then "No project", P's folder stays chosen (`chipNone: "p-folder"`) |
| PLN-04 AC-005 | Pass | A Team started under P: recorded in 183 ms, row under P in 510 ms (after its re-read, as designed), on AGY, with P's folder. "+" on P's agent group → a second run under P in P's folder |
| PLN-05 AC-006/007/010 | Pass | Typed `delegate_task` P1 → Team: the Team row appeared under the run in P without refresh (801 ms) with Task line "Review the launch checklist" and members; the coordinator opened (`You have a new task from …`). Q work only under Q; Temp-task work under P; the P Team not under Q. The copy holding P2 and Q2 was under both; after P2 DONE, only under Q. Selecting P set the board to `project:<P>`; a Task line located its Task on the board. **Observation**: under P that copy's Task line read `"Follow-up docs work"` (Q's Task), as code review anticipated (its current Task, shown as in Workspaces) |
| PLN-06 AC-008 | Pass | P1 DONE: the Team rows left Projects mode live; the host run stayed; the closed member's conversation was kept. Reopen + the assigner's message to the coordinator: the Team row returned |
| PLN-07 AC-009 | Pass | With 6 newer runs under P, Workspaces lists 6 (A beyond the cap); P lists 8 (6 newer + A and the earlier run hosting open P work). A opens, and so does its delegated member |
| PLN-08 AC-011 | Pass | Real backend restart (new PID): the last good tree was kept. A Project created after the restart appeared live (feed reconnected → re-read). A's post-restart dispatch is in P's scope on the server, and the tree shows it after a reload. Observation FU-008: in the same page, without a reload, the new copy did not appear (`liveInSamePage: false`); Workspaces mode behaves the same |
| PLN-09 AC-012/REQ-014 | **Fail** | Passed: a running run offers Stop, not Archive (`aButtons: ["terminate-agent-run"]`); a stopped run archived from Projects mode is gone from both modes; "Archive all" is blocked while a listed run runs (toast "Stop running runs first."); after the runs stopped it archived P's 8 listed runs, and the outsider in the same folder stayed; deleting R removed it from Projects mode live while its runs stayed in Workspaces. **Failed**: after Stop on a run (with no live context in this window) in Projects mode, the server reports it inactive at once and Workspaces mode shows it stopped, but Projects mode keeps showing it running with Stop (and "Archive all" blocked) until the next re-read (here a mode switch) |
| PLN-10 AC-013/016/017 | Pass | Keyboard: ArrowRight + Enter switches to Projects; Enter on a Project name opens it. zh-CN tabs `["工作区","项目"]`. In the 600×800 strip, the drawer shows the run section. Briefcase on Project rows and in the chip menu. Reference screenshots taken |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 PLN-01, API-05, API-R03 | Proven | — |
| AC-002 | Yes | API-01 PRH-08, API-04 PLN-01, API-R04 | Proven | — |
| AC-003 | Yes | API-01 PRH-01/PRH-03 (record, prompt at first activation through the lifecycle `buildConfig` that restore also uses, Team coordinator and member), API-04 PLN-02, API-05 | Proven | Restore on a runtime that recomposes its prompt (Codex, Claude, native) is unit-tested only (IMP-06). AGY restores its start-time snapshot, which contains the section |
| AC-004 | Yes | API-04 PLN-03, API-R03 | Proven | — |
| AC-005 | Yes | API-01 PRH-03, API-04 PLN-04 | Proven | — |
| AC-006 | Yes | API-04 PLN-05, API-05, API-01 PRH-04 | Proven | — |
| AC-007 | Yes | API-01 PRH-04/05/06/10, API-04 PLN-05, API-03 | Proven | Observation: under P, the multi-Project copy's Task line shows its current (Q) Task |
| AC-008 | Yes | API-04 PLN-06, API-05, API-01 PRH-06 | Proven | — |
| AC-009 | Yes | API-01 PRH-07, API-04 PLN-07 | Proven | — |
| AC-010 | No | API-04 PLN-05 | Proven | — |
| AC-011 | Yes | API-04 PLN-08, API-R03 (failure and Retry states, IMP-07) | Proven for Projects mode's own state | Run streams after a restart without a reload: FU-008 (existing, both modes) |
| AC-012 | Yes | API-04 PLN-09, API-01 PRH-08/09 | **Not Proven — failing** | Stop in Projects mode leaves the row running until a re-read (PLN-09) |
| AC-013 | No | API-04 PLN-10, API-R03 (IMP-05, IMP-09) | Proven | — |
| AC-014 | Yes | API-05 | Proven (scripted runtime, labeled) | Paid-provider inference is not covered (AC-014 note) |
| AC-015 | Yes | API-04 PLN-03 | Proven | — |
| AC-016 | No | API-04 PLN-10, API-06, API-R03 (IMP-09) | Proven | — |
| AC-017 | No | API-06, API-R03 (IMP-09) | Proven for the compared references | VIS-004…008 states: component tests and IMP-09 |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 85% | API-01, API-04, API-05 | AC-012 fails (Stop staleness) | Fix and rerun PLN-09 |
| Changed-boundary execution directness | 90% | 95% | Real GraphQL/MCP/files (API-01); real UI on a real stack (API-04); packaged app (API-05) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Real delegation with the scripted CLI, no mocks of our code | Scripted runtime, not paid inference | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | Owned stacks; isolated instance of the worktree build | The DMG step was skipped (env); five runtimes besides AGY not run live | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 85% | Unknown or deleted Project, closure/reopen, cap, restart | Stop staleness (fail); FU-008 | Rerun after the fix |
| User-surface, browser, and desktop-shell confidence | 80% | 85% | API-04, API-05, API-06 | The PLN-09 defect is user-visible | Rerun after the fix |
| Durable regression coverage quality and relevance | 90% | 92% | API-01 and API-04 as durable suites; API-03 | — | Test-code review |

- Overall post-repository confidence: 85%
- Overall final confidence: 90% (simple average, rounded down)
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven: `No`: AC-012 fails.
- Any final applicable category below `90%`: `Yes`: requirement proof (85%), failure/lifecycle (85%), user surface (85%), all because of the AC-012 failure.
- Default final confidence target of `95%` met: `No`.
- Confidence-limiting residual risks: the PLN-09 defect; FU-008 (existing, not this ticket).

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: Browser (API-04), Project Desktop Validation (API-05), Live API (API-01/API-02).
- Confidence gap or residual risk it addresses: real delegation, closure, cap, UI journeys, and the packaged app.
- Browser validation needed: yes. Projects mode is renderer behavior over live feeds and run streams; the repository tests mock them.
- If `Blocked`: N/A.

## Desktop Application Validation

- Approach executed: an isolated instance of the worktree build (unpacked app from `--build`; the DMG step failed on `hdiutil resize` exit 35, an environment condition), with scripted AGY through the data root's own `.env`. Driven over the CDP control port with `playwright-core` `connectOverCDP`.
- Cases: API-04 for web-equivalent behavior; API-05 for the packaged renderer and server together. No shell-specific code changed.
- Effect on any already-running desktop application: `None`. The user's `/Applications/AutoByteus.app` (PID 80546) was not touched.
- Not directly proven: nothing material.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected` (new additive `project_runs.json`).
- Representative existing data: runs started in Workspaces that dispatched Tasks of 3 Projects, with no `project_runs.json` (API-01 PRH-08, API-04 PLN-01).
- Approved transition followed: `Yes`. API-01 PRH-01 asserts the exact file shape `{projectId, runs:[{root:{kind,runId}, linkedAt}]}`, and that metadata, index rows and trees carry no Project key. PRH-09: Project Delete keeps the file, and the deleted Project's run stays in Workspaces.
- Version-specific branch or dual read/write observed: `No`.
- Residual risk: none beyond IMP-10.

## Compatibility / Legacy Scope Check

- Upstream backward compatibility in scope: `No`.
- Compatibility-only behavior in the implementation: `No`.
- Durable coverage for compatibility-only behavior: `No`.
- Reroute classification: N/A. Upstream recipient notified: N/A.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` | Added (gated `RUN_AGY_FAILURE_E2E`) | API-01 | — |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Updated: `startRoot(kind, ids, extra = {})` adds fields to the Agent/Team creation input (used for `projectId`); existing callers unchanged | API-01, API-02 | — |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` + `autobyteus-web/package.json` script `test:e2e:projects-left-navigation` | Added | API-04 | — |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` | Added | API-03 | — |

- Added or updated paths attached for proportional test-code review: `Yes`.
- Removed paths: none.
- Ticket-owned temporary automation (not durable): `evidence/api-e2e/API-05-desktop-journey.mjs` (the isolated-instance driver; kept as evidence, like IMP-09's drivers).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model provider / AGY CLI | Repository's scripted AGY CLI (`agy-failure-cli.mjs`, `linked_skills`) | TESTING.md: drives real delegation without provider calls | Proves transport and tools, not paid inference |
| Other runtimes (Codex, Claude, ACP/Grok, native) live | Not run | Need a paid or local model; the composer is shared and unit-tested on all five paths | A recomposing runtime's restore is proven by unit tests only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server E2E temp data dirs and HOMEs | Yes | Suite `afterAll` | Removed |
| Probe stacks (7 diagnostic runs + the final run): data roots, backend and Nuxt process groups, Chrome | Yes | Probe `finally`; diagnostic data roots removed by hand | `evidence.json` `cleanup`: `dataRootRemoved: true`, processes terminated; no `projects-left-navigation-*` temp folders left |
| Isolated instances `iso-61465-47d2`, `iso-61565-aa80`; data root `/tmp/pln-iso-root` | Yes | `isolated-app stop`; data root removed | `list` → `"instances":[]`; ports released |
| `autobyteus-web/electron-dist/` (build output) | Yes | Left in place (untracked build output, as TESTING.md allows) | — |

## Root Cause Notes

- **PLN-09 (in scope).** `agentRunStore.terminateRun` marks the run inactive with `runHistoryStore.markRunAsInactive(runId)` (`stores/agentRunStore.ts` 456/485). That updates the Workspaces rows. `projectRunsStore` re-reads only after the history store's removal actions (`RUN_REMOVALS` in `stores/projectRunsStore.ts` 28: archive/delete). `projectRunsProjection` overlays only live agent and team contexts, and a run without a context in this window has none. So the Projects snapshot keeps `isActive: true` until the next read. By the same code, Team Stop (`markTeamAsInactive`, `agentTeamRunStore.ts` 246) has the same gap; this was not observed, only read in the code. Design DS-004 says status in Projects mode follows "exactly as Workspaces does".
- **API-02 EXC-E2E-004 (out of scope, FU-007).** `RootTaskExecutionLifecycle.prepareClosedCopyForResume` (`root-task-execution-lifecycle.ts` ~304) returns early when the copy is already open, so a follow-up assignment committed a few ms after the DONE's release has fenced the copy skips `discardReleasedExecution`. The restore then rejects in `ConfiguredAgentExecutionHandle.ensureReady` ("fenced for root shutdown"). This ticket changed none of those lines; task copies never get `projectRunRoot`, so the ticket's one added line in that handle does not run for them. The same message is in `tickets/done/task-agent-several-tasks/evidence/API-00-baseline-folder.log` (commit `e421b2896d`).
- **FU-008 (out of scope).** After a real backend restart without a reload, the open page's run view stays "Offline" and its new work is not shown, in both modes. The stream code is unchanged by this ticket (web diff list in `git diff --stat 8faae96899 467cff24c0 -- autobyteus-web`).

## Preliminary Classification (On `Fail`)

- `Local Fix`, owner the implementation engineer. Projects mode must reflect a run's Stop as Workspaces does (REQ-011 "status changes", REQ-014 parity, DS-004 "exactly as Workspaces does"). For example, `projectRunsStore` could observe `markRunAsInactive` / `markTeamAsInactive` (or the terminate actions) and update or re-read the Projects listing the run, or the projection could read the history store's inactive marks. No requirement or design change is needed.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-012 (failing: PLN-09). Parts only the user can check: none.
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer; failure-origin review by the code reviewer.
- Next recipient from `get_handoff_rules`: see the handoff.
- Notes:
  - Rerun plan after the fix: PLN-09 and any probe case touching the changed store (likely the whole probe, about 10 minutes); IMP-04/IMP-07 for the web suite; API-05 if the fix touches what the journey exercises.
  - API-01/02/03 stay valid unless the fix touches the server.
  - Follow-ups FU-007 and FU-008 were added to `follow-ups.md`.
