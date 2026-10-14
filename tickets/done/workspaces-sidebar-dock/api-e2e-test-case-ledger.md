# API/E2E Test-Case Ledger — workspaces-sidebar-dock

Round 1, initialized before execution. Worktree `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock`. Authorities: api-e2e-coverage-investigation.md; future api-e2e-execution-coverage-report.md and api-e2e-revision-record.md in this directory. Required for multi-case browser and long-running packaged desktop work.

## Planned Cases
| ID | Journey | AC | Initial result |
| --- | --- | --- | --- |
| REP-001 | Focused policy/provider/default | AC-001–005 | Not Tested |
| REP-002 | Adjacent geometry/drag/drawer/tools + guard | AC-001–006 | Not Tested |
| SET-001 | Server + packaged current Electron build/setup | AC-007 | Not Tested |
| BR-001 | Team/Activity intermediate/max 1000/1280/1440; three cycles/hit/click | AC-001,003,006 | Not Tested |
| BR-002 | Default/nondefault exact capacity, open drag and observer recovery | AC-002,003 | Not Tested |
| BR-003 | Narrow/short/focus/Escape/backdrop/wide recovery | AC-004,005 | Not Tested |
| BR-004 | Automatic center-floor capacity (real selection is DT-001) | AC-002,006 | Not Tested |
| DT-001 | Current isolated Electron workspace/run and retained work/worker journey | AC-006,007 | Not Tested |

## Execution Events
Events are appended immediately; nonterminal checkpoints never imply Pass.

## Reconciliation
Completed and reconciled into api-e2e-execution-coverage-report.md, API-REV-001. REP-001/002, SET-001, BR-001–004 and DT-001 final Pass. Authoring failures retained below; original-source negative is expectedFail, not final current failure. No case running/interrupted/unstarted.

- REP-001 Started: independent focused command; expected approved layout invariants.

- REP-001 Completed: exit=0; see evidence/api-e2e/repository-focused.log.

- REP-002 Started: adjacent suite and web guard.

- REP-002 Completed: adjacent exit=0; boundary exit=0. evidence/api-e2e/repository-adjacent.log, boundary.log.

- SET-001 Started: server prebuild/build then current Electron Linux build; uid0 builder only, runtime will be unprivileged.

- SET-001 build checkpoint: exit=0; evidence/api-e2e/build.log. Launch and UI journey not inferred.

- DT-001 Started: unprivileged current packaged Electron with owned Xvfb/private HOME and scripted runtime.

- DT-001 execution checkpoint: exit=1; evidence/api-e2e/desktop-01/evidence.json; check observed cause/cleanup before terminal classification.

- SET-001 Completed Pass: current server + Electron Linux build exit0; no release. evidence/api-e2e/build.log.
- Harness checkpoint: browser-01 profile permissions prevented cases; desktop-01 CDP window method absent before selection. Both cleanup receipts confirmed. Not product failures; locally corrected; BR/DT terminal proof pending fresh reruns.

- DT-001 execution checkpoint desktop-02: exit=1; evidence/api-e2e/desktop-02/evidence.json.

- 2026-10-13T14:05:17.117Z BR-001 Started: Wide Team/Activity actual pointer drag, three cycles and meaningful controls; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-02/evidence.json

- DT-001 retry setup note: desktop-02 loaded before the local driver edit completed; repeated original CDP harness failure, cleaned. desktop-03 uses inspected corrected xdotool/Released driver.

- DT-001 desktop-03 checkpoint: exit=1; evidence/api-e2e/desktop-03/evidence.json.

- 2026-10-13T14:05:47.500Z BR-001 Completed Fail: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[role="tab"][data-tab-name="teamMembers"]')
; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-02/evidence.json

- 2026-10-13T14:06:49.582Z BR-001 Started: Wide Team/Activity actual pointer drag, three cycles and meaningful controls; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- 2026-10-13T14:07:37.721Z BR-001 Completed Pass: Wide Team/Activity actual pointer drag, three cycles and meaningful controls; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- 2026-10-13T14:07:37.722Z BR-002 Started: Exact capacity neighbors, actual navigation resize and drag while open; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- DT-001 desktop-04 checkpoint: exit=1; evidence/api-e2e/desktop-04/evidence.json.

- 2026-10-13T14:07:49.421Z BR-002 Completed Pass: Exact capacity neighbors, actual navigation resize and drag while open; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- 2026-10-13T14:07:49.422Z BR-003 Started: Constrained modal keyboard/backdrop and wide recovery cleanup; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- DT-001 desktop-05 checkpoint: exit=1; evidence/api-e2e/desktop-05/evidence.json.

- 2026-10-13T14:07:58.434Z BR-003 Completed Pass: Constrained modal keyboard/backdrop and wide recovery cleanup; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- 2026-10-13T14:07:58.435Z BR-004 Started: Automatic allocation keeps 480 center floor at1210 capacity; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- 2026-10-13T14:08:01.052Z BR-004 Completed Pass: Automatic allocation keeps 480 center floor at1210 capacity; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-03/evidence.json

- DT-001 desktop-06 Completed attempt: exit=0; evidence/api-e2e/desktop-06/evidence.json.

- DT-001 Completed Pass: desktop-06 full current-build journey; three active runtimes scoped by owned data root, conversations/Tasks/documents unchanged; zero browser errors and canonical stop/list/ports/data cleanup. Prior authoring attempts resolved, not product passes.
- BR-001 old-source discrimination: expected Fail at1000 Team intermediate dock; base d9bccf255 policy/provider restored byte-for-byte; see regression-restoration.json and browser-old-source/evidence.json.

- REP-002 Restored-current rerun: exit=0; evidence/api-e2e/restored-repository.log.

- 2026-10-13T14:11:00.206Z BR-001 Started: Wide Team/Activity actual pointer drag, three cycles and meaningful controls; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:11:48.680Z BR-001 Completed Pass: Wide Team/Activity actual pointer drag, three cycles and meaningful controls; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:11:48.682Z BR-002 Started: Exact capacity neighbors, actual navigation resize and drag while open; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:12:00.573Z BR-002 Completed Pass: Exact capacity neighbors, actual navigation resize and drag while open; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:12:00.576Z BR-003 Started: Constrained modal keyboard/backdrop and wide recovery cleanup; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:12:09.754Z BR-003 Completed Pass: Constrained modal keyboard/backdrop and wide recovery cleanup; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:12:09.756Z BR-004 Started: Automatic allocation keeps 480 center floor at1210 capacity; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- 2026-10-13T14:12:12.397Z BR-004 Completed Pass: Automatic allocation keeps 480 center floor at1210 capacity; /home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/evidence/api-e2e/browser-final/evidence.json

- Final reconciliation: browser-final4/4Pass;85records/59screenshots,52hit checks,26focus+tab effects; desktop-06Pass; repository146Pass; current build/guardPass. Source restoration confirmed. All owned temporary resources cleaned (environment-cleanup.json); no prior authoritative API round. API-REV-001 Pass/95%, direct Medium/Low route, no production changes.
