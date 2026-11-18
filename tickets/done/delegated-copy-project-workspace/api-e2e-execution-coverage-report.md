# API/E2E Execution Coverage Report — delegated-copy-project-workspace (autobyteus-97)

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 pass (code `8959bc507a`; HEAD was `e4d88b05ad`, docs only after the code).
- Prior round reviewed: none.
- Deviations from the investigation's plan:
  - The live cases moved from the scripted suite into their own file. A second harness in one test file cannot start (the app data folder is set once per process).
  - One existing gated test needed an update for this ticket's approved refusal (API-03).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/evidence/api-e2e/`

## Routing Classification

- Task size `Medium`; architectural risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Proportional test-code review decision: `Required` (the new suites and the updated feed test).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `8959bc507a` code; server `prebuild` + `build` from this tree | macOS 26 arm64, Node 22 | in-process Studio server and built `dist/app.js` processes; scripted AGY CLI | `env -i PATH HOME=<temp> TMPDIR`; `RUN_AGY_FAILURE_E2E=1`; `AGY_FAKE_ARGV_LOG` |
| ENV-2 | same | macOS arm64 | in-process server; scripted AGY manager; real worker runtimes: codex-cli 0.166.0 (`gpt-6.1-terra`, medium), Claude Code 2.1.316 (`claude-haiku-4-5-20251001`) | real `HOME`, `USER`, `LOGNAME` (signed-in CLIs); throwaway `CODEX_HOME` with a symlink to the login's `auth.json` (removed after) |
| ENV-3 | same | macOS arm64 | isolated desktop instance of the packaged worktree build; scripted AGY through `server-data/.env` | own data root; AGY catalog must read `Gemini test` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001…008 (units, Team-root integration), typecheck, sizes | repository | Reused IMP-01, IMP-02, IMP-03, IMP-06 | — | Pass | (implementation evidence) | IMP-01 `Tests  7758 passed`; IMP-03 `Tests  89 passed (89)` | `git diff --name-only 8959bc507a HEAD` outside `tickets/` is empty |
| API-R02 | AC-001…006, AC-009 Agent root (dev browser), native real `pwd` | proof on a dev stack | Reused IMP-05 | — | Pass | — | `pwdWrittenByTheCopy` ends `project-first` | Same code |
| API-01 | AC-001…007; REQ-003 (Agent, Team, Org roots; catalog copies and a configured placement); RU-01 real restart | real HTTP/WS/GraphQL, scoped MCP, Projects files, AGY launch inputs, two built server processes | `env -i … RUN_AGY_FAILURE_E2E=1 … DELEGATED_COPY_FOLDER_E2E_EVIDENCE_DIR=<ev>/API-01 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-server-e2e.log`, `API-01/delegated-copy-project-folder.json` | `Tests  8 passed \| 2 skipped`; JSON `dcf01.copy` recorded, capsule and `addDirs` all `…/folder-F`, `manager` `…/workspace`; `dcf06` `{"error":{"code":"TASK_PROJECT_FOLDER_UNAVAILABLE","message":"Project \"DCF moved …\" has the linked folder \"…/folder-moved-away\", which is not an existing folder on this node. … Nothing was started."}}`; `dcf08` `pids` two different processes, `launchesAfterRestart` `{"copyG":[".../G"],"copyF":[".../F"],"manager":[".../G"]}` | DCF-01…08 (titles in the log). The 2 skipped were the live cases, since moved to their own file. The scripted cases ran again inside API-03 in the final file layout |
| API-02 | AC-001 "actual working directory"; the design's escalation trigger | real Codex and Claude copies | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_AGY_FAILURE_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-project-folder-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-02-live-runtimes.log`, `API-02/delegated-copy-project-folder-live.json` | `✓ DCF-L1: a real codex_app_server copy writes pwd …`, `✓ DCF-L2: a real claude_agent_sdk copy writes pwd …`; JSON `pwdWrittenByTheCopy` equals `F` for both, `inG: false` | Each worker ran `pwd > copy-cwd.txt` itself. The file landed in F and holds F. Only the worker's turn used provider credits (one small turn each). The Claude run added its conversation to the user's Claude history (signed-in CLI with the real `HOME`) |
| API-03 | Preserved delegation, closure, restore, follow-up Tasks, Team, Org, Agent, history, remote | gated folders | `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/projects tests/e2e/agent-team-runs tests/e2e/agent-org-runs tests/e2e/agent tests/e2e/run-history tests/e2e/remote-collaboration --no-watch`; then the 2 files again | ENV-1 | Pass (after a test update and a prerequisite) | `API-03-server-e2e-regression.log`, `.full.log.gz` | first run `Tests  1 failed \| 245 passed \| 47 skipped (293)`; rerun of both files `Tests  48 passed (48)` | `project-change-feed`'s agent-made Project links a deliberately missing folder and then delegated a Task of it. Under REQ-005 that is now refused, so the test was updated: it asserts the refusal and the unassigned Task, creates the folder, and delegates again. `remote-delegation-two-server` needed `test:integration:prepare`, as the test names. `EXC-E2E-004` (FU-001) passed this run |
| API-04 | AC-009 packaged; Team member focus | isolated desktop instance of the worktree build | `isolated-app start --build --data-root /tmp/97-iso-root` → stop → AGY lines added to `server-data/.env` → `start --from-worktree` → `node API-04-desktop-journey.mjs 62104 http://127.0.0.1:62105 /private/tmp/97-iso-root <out>` → `isolated-app stop iso-62104-c635` | ENV-3 | Pass | `API-04-desktop-journey.mjs`, `API-04-desktop/API-04-desktop-journey.log`, `API-04-desktop/API-04-0[1-6]-*.png`, `API-04-instance-{start,stop}.json`; attempt 1 in `API-04-desktop-attempt1/` | `manager: {…"managerFolder":"/private/tmp/97-iso-root/manager-folder"}`; `agent copy terminal: "…/project-folder$pwd/private/tmp/97-iso-root/project-folder…"`; `team member terminal: "…/project-folder$pwd/private/tmp/97-iso-root/project-folder…"`; `manager terminal: "…/manager-folder$pwd/private/tmp/97-iso-root/manager-folder…"`; `P (the Task's Project): {"runRows":0,"hint":"No runs yet. …"}`; `newRowForProjectFolder":true`; `page errors: []`; `result: "Pass"` | A user's journey: the manager was started under Project O through the app's "+"; both delegations were typed in its composer. Files showed F's sentinel and not G's for the Agent copy (Projects and Workspaces modes) and for a Team member. The manager focus is the control (G). Four driver-only fixes before the pass (log header): Send button instead of Enter, the collapsed right side opened from its strip, the manager control, the overlay terminal read page-wide |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 DCF-01, DCF-07; API-02 (real Codex and Claude `pwd`); API-R02 (native `pwd`) | Proven | — |
| AC-002 | Yes | API-01 DCF-02 (default and both members' launches) | Proven | — |
| AC-003 | Yes | API-01 DCF-03 | Proven | — |
| AC-004 | Yes | API-01 DCF-04 | Proven | — |
| AC-005 | No | API-01 DCF-05 | Proven | — |
| AC-006 | Yes | API-01 DCF-06; API-03 (`project-change-feed` refusal step) | Proven | — |
| AC-007 | Yes | API-01 DCF-08 (real process restart; old-rule and new-rule copies; their relaunches) | Proven | — |
| AC-008 | No | API-R01 (`collaborator-admission` AC-008 case) | Proven at unit level | A folder-scoped catalog on a configured placement is not exercised (investigation, Not Tested) |
| AC-009 | Yes | API-04 (packaged app: Agent copy and Team member, both modes, manager control), API-R02 (dev browser) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | API-01…04 | AC-008's folder-scoped catalog (by design, unchanged) | — |
| Changed-boundary execution directness | 90% | 97% | real tool path on all roots; real runtimes' `pwd`; packaged app | — | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | real Codex and Claude; native (IMP-05); real restart | AGY's real CLI not run (its cwd is the capsule by design; launch inputs asserted) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | owned roots; test-owned Codex home; isolated packaged build | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 96% | missing and file links refused; restart with both folders; prerequisite and feed test found and resolved | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | packaged journey incl. Team member and manager control | narrow layout (unchanged code) | — |
| Durable regression coverage quality and relevance | 90% | 95% | two new suites; feed test updated to the new rule | — | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 95.9% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default target met: `Yes`
- Residual risks:
  - C-07: a folder-scoped Codex catalog on a configured placement was not exercised. Only Codex reads its catalog per folder (`model-catalog-service.ts` 172).
  - FU-001 (existing race; passed in this round's run).
  - The new Workspaces row for a not-yet-registered Project folder (accepted by design; for the user at delivery).

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: Live API (gated server E2E), live external runtimes, Project Desktop Validation.
- Gap addressed: the escalation trigger on real runtimes; a real restart; Team and Org roots through the real tool; the packaged app.

## Persisted-Data Transition Checks

`Not Affected`. DCF-08 reads the stored tree of an old-rule copy (G) and a new-rule copy (F) through a real restart; both restore in their own folder. AGY's restore refuses a changed folder, and it didn't refuse.

## Compatibility / Legacy Scope Check

None introduced or observed.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` | Added (gated `RUN_AGY_FAILURE_E2E`) | API-01, API-03 | DCF-01…08 |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-project-folder-live.e2e.test.ts` | Added (gated `RUN_CODEX_E2E` / `RUN_CLAUDE_E2E`) | API-02 | DCF-L1, DCF-L2 |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Updated | API-03 | Its delegation into a Project whose link is missing is now refused (REQ-005); the test asserts that, then creates the folder and continues |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The manager's runtime, most copies | Scripted AGY CLI | TESTING.md; no inference needed to call the real tool | AGY's process cwd is its capsule by design; its folder is proven from the launch inputs |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Suite data roots, HOMEs, argv logs, built-server processes | Yes | suites' cleanup | removed; servers stopped |
| Throwaway `CODEX_HOME` (symlink to `auth.json`) | Yes | removed after each live run | removed; the user's `~/.codex` untouched |
| Claude conversation from DCF-L2 | Created in the user's Claude history (signed-in CLI) | none possible without editing user data | stated here |
| Isolated instances `iso-62004-fb37`, `iso-62104-c635`; data root `/tmp/97-iso-root` | Yes | `isolated-app stop`; data root removed | ports released; neither in `list` (another agent's `iso-62354-f8ab` left alone) |
| `applications/brief-studio/dist` (from `test:integration:prepare`) | Yes | left (untracked build output) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none.
- Next recipient from `get_handoff_rules`: the code reviewer (High: proportional test-code review).
- Notes for delivery (via the reviewer):
  - The design's escalation trigger is closed: real Codex and Claude copies work in F.
  - The new Workspaces row for the Project folder appears after the first delegation (accepted by design; the user should hear it).
