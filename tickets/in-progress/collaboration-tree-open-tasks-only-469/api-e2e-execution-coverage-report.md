# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident I am, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/`; evidence files are in the ticket's `evidence/` folder.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/collaboration-tree-open-tasks-only-469/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001 (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-E01's first full run failed in 17 files. I classified every failure (table "API-E01 triage" below), updated the stale durable tests, and reran each affected file. The investigation's inventory is updated with these decisions.
  - Three released-data startup suites now get Task records from a new fixture helper. Their released fixture had none, and DEC-008 takes a run without a Task record out of every tree.
  - API-E02 needed corrections to my own test before it passed (the expected token total; where a link to another node is stored; a positive control for the read check). None changed a product expectation.
  - API-B01: my first probe extension waited for a Team-tab row that a delegation never adds. I fixed the wait and reran BR-001…BR-005.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/tickets/in-progress/collaboration-tree-open-tasks-only-469/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on Pass); this round's result is `Fail`, so failure-origin review is requested first

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Product source `42652879b3` (HEAD `7ec463393b` + this round's test-only changes) | macOS darwin 25.5 (arm64) | Node v22.21.1; server `dist/` built in this worktree (`pnpm -C autobyteus-server-ts build`, EXIT 0); in-process and built (`dist/app.js`) servers | `env -i PATH HOME=<resolved temp> TMPDIR USER`; `RUN_AGY_FAILURE_E2E=1`; `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; test-owned temp data roots only |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built `dist/app.js`, Nuxt dev server, headless Google Chrome (Playwright) | Free ports, private data root, launch credential; scripted AGY `linked_skills` |
| ENV-3 | `431de4c9d1` | macOS darwin 25.5 arm64 | Fresh clone, `pnpm install --frozen-lockfile` (pnpm 10.28.2), desktop release build command | TESTING.md "Fresh-start build" |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-004, AC-005, AC-009, AC-010 (unit parts) | Server unit | Reused IMP-01 | — | Pass | (IMP-01) | (IMP-01) | Ran on `832f0a4572`; no product file changed since |
| API-R02 | — | Typecheck, contracts | Reused IMP-02, IMP-03, IMP-04 | — | Pass | (IMP-02..04) | (IMP-02..04) | Same commit. Server typecheck rerun after this round's test changes: `API-typecheck-server.txt` |
| API-R03 | AC-002 (web reload), AC-011 (web logic) | Web specs | Reused IMP-05, IMP-07 | — | Pass | (IMP-05, IMP-07) | (IMP-05, IMP-07) | No web source changed; the probe file is not part of those suites |
| API-R04 | AC-001, AC-007, AC-011 (in-process) | Server integration | Reused IMP-06 | — | Pass | (IMP-06) | (IMP-06) | Ran on `42652879b3` |
| API-E01 | AC-001 … AC-005, AC-007, AC-008, AC-011, AC-012; D-9, D-12; regressions | Real Studio server HTTP/WS/GraphQL/scoped MCP; built server starts | First run: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` (ENV-1). Then every failing file rerun after its classification (commands in each evidence header) | ENV-1 | Fail (1 case) | `API-E01-server-e2e-first-run-summary.txt`, `API-E01-server-e2e-first-run-failures.txt`, `API-E01-rerun-*.txt`, `API-E01-EXC-E2E-007-fail.txt` | First run: `Test Files  17 failed \| 164 passed \| 71 skipped (252)`. Reruns: every file `✓` except `× EXC-E2E-007` | Triage below. Remaining failure: EXC-E2E-007, agent-facing text |
| API-E02 | AC-005, AC-006, AC-008, AC-009, AC-010, AC-011, AC-012 | Built server (`dist/app.js`) on an upgraded test-owned data root; restarts; GraphQL; files on disk | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-E02-open-task-tree-upgrade-startup.txt` | `Tests  3 passed (3)`: OT-1, OT-2, OT-3 | New durable test |
| API-B01 | AC-001, AC-002, AC-003, AC-004, AC-005, AC-011 | Rendered tree, Team tab, reactivation and follow-up Tasks, real backend restarts | Run 1: `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir /tmp/api469/probe-B01` (all 16 cases). Run 2 after fixing my probe's wait: `… --output-dir /tmp/api469/probe-B01-r2 --cases BR-001,BR-002,BR-003,BR-004,BR-005,BR-007`. Diagnostics (temporary probe edits, reverted): `--cases BR-008,BR-009,BR-010,BR-011` twice, `--cases BR-001` | ENV-2 | **Fail** | `API-B01-probe-run1-evidence.json`, `API-B01-probe-run2-BR001-005-evidence.json`, `API-B01-diag-BR-011-evidence.json`, `API-B01-diag-BR-001-evidence.json`, `API-B01-diag-BR-011-team-no-row.png`, `API-B01-diag-BR-011-team-after-manual-reload.png`, `API-B01-diag-BR-001-agent-team-tab-empty.png`, `API-B01-diag-BR-001-agent-team-tab-after-reload.png`, `API-B01-BR-001-agent-team-tab-after-closure.png`, `API-B01-BR-002-team-team-tab-after-closure.png`, `API-B01-BR-009-team-reactivated-live.png` | Run 1: `"BR-008": "Pass"`, `"BR-009": "Pass"`, `"BR-010": "Pass"`, `"BR-012"`…`"BR-014": "Pass"`, `"BR-016": "Pass"`, `"BR-011": "Fail"`, `"BR-015": "Fail"`. Run 2: `"BR-002": "Pass"`, `"BR-001": "Fail"`, `"BR-003": "Fail"`. Diagnostics: `"team": {"serverTree": [<worker>, …], "rowAfterManualReload": 1}`, `"agent": "row shown live"`, `"org": "row shown live"`; BR-001 `"rowsNow": []` with `serverTab.messages` holding `Status of the release notes?` and `pastParticipants` naming the worker, `"rowsAfterReload"` holding the row | Two web failures, F-2 and F-3 (below). BR-005 (rendered after restart, AC-011) and BR-007 did not run: they need BR-001…BR-003 in the same run |
| API-F01 | Release build of the changed build inputs (contract `dist/`, `typecheck-baseline.json`) | Fresh clone and release build job | `git clone --no-local` at `431de4c9d1`; `pnpm install --frozen-lockfile`; `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's Prisma and packaged-terminal verify steps | ENV-3 | Pass | `API-F01-fresh-start-build.txt` | `INSTALL EXIT 0`, `BUILD EXIT 0`, `[typecheck] PASS`, `Build completed`, `schema-engine-darwin-arm64 OK`, `VERIFY3 EXIT 0` | Signing, notarization, Intel and Linux jobs need the runner: not tested. Product source is unchanged since this build; a fix touching a build input needs it again |

### API-E01 triage (first run: 17 files, 47 tests)

| File (cases) | Cause found | Classification | Action and result |
| --- | --- | --- | --- |
| `remote-collaboration/remote-delegation-two-server` (RC-04, RC-17); `projects/delegated-launch-config-defaults` (2) | The model-unavailable wording was changed by base commit `40b9d79e1e` (autobyteus-9, `run-model-selection-refusal.ts`); these E2Es still expected the old text | Baseline test fix (TESTING.md Rule 9), not this ticket | Expectations updated to `'<model>' is not offered by <runtime> now. Refresh the model list and choose again.`; reruns 42/42 and 3/3 |
| `projects/collaboration-model-contract` (CM-E2E-2) | Base commit `432d1c3af2` (435) gave self-delegation its own words; the E2E expected `send_message_to` for the own address too | Baseline test fix | The own-address case expects `you can't delegate to yourself`; 3/3 |
| `projects/task-closure-root-visibility` (3) | Asserted that closed runs stay hidden in the loaded tree, appear in the snapshot's and stored reads' closed lists, and that a repeated DONE lists them again | Stale under D-4 and D-2 (a stopped run leaves the tree; a stored tree holds no closed run) | Now asserts that the runs left the tree once stopped, the closed lists are empty, the Manager's messages with them are kept, the tree file holds no local run (AC-001), and a closure while the root is stopped leaves the tree file byte-identical (AC-001 alternate); 3/3 |
| `projects/task-reactivation-root-visibility` (5) | Same closed-list assertions. The closed worker's conversation was read through its top run, which no longer lists it. The repeated-closure re-publish no longer applies to stopped runs. A member of a closed Team copy got the Task-closed hint | Stale under D-4, DEC-006 (`No running agent has the run id …` for a member of a Team that left the tree) | Closed runs are read through the Memory page view (`getAgentRunMemoryView`); left-tree waits; DEC-006 refusal. The AC-002 journeys now run to the end: 7 cases, all pass |
| `projects/task-existing-copy-assignment` EXC-E2E-001…003 | Closed-list assertions; member run ID of a Team copy closed at Task A DONE | Stale under D-4, DEC-006 | Updated; all three AC-003 journeys pass |
| `projects/task-existing-copy-assignment` EXC-E2E-007 | When the closed copy's folder (with its own file) is gone, the follow-up Task is refused with `The task agent can't continue: its saved run could not be read (… its own file is missing.).`. Before: `… cannot be restored: it has no saved conversation to continue. Start a new delegation …`. The run is no longer held in the loaded tree, so the add-back from its own file (D-4, `addTaskExecution`) fails first and its error becomes the text. Every other outcome of the case holds (refused before any change, Task files unchanged, no reopen, process not started), shown by a temporary diagnostic run | **Fail** (the text an agent reads changed; requirements Non-Goals "No change to what an agent reads", BEH-004 "The texts and results the agents get") | Test left unchanged. Preliminary classification below |
| `projects/ad-hoc-task-delegation` (3) | Closed copy's conversation read through the root; repeated-DONE re-publish; closed lists | Stale under D-4 | Memory-view read, left-tree waits; 3/3 |
| `projects/teammate-delivery-task-closure-race` (3) | Closed Team copy members' conversations read through the root | Stale under D-4 | `getTeamMemberRunMemoryView`; 3/3 |
| `projects/get-project-task-worker-scope` SCP-E2E-006 | Input to a copy whose Task record is unreadable is refused `INVALID_TARGET` (`AgentRun '…' is not in root '…'`) instead of `TASK_AGENT_RESOURCES_UNAVAILABLE`; still fail-closed with no model request | Stale under DEC-010 (the run is in no tree while its record cannot be read) | Expects the not-in-root refusal; 6/6 |
| `memory/memory-collaboration-graphql` (8), `memory/imported-team-memory-graphql` (1), `run-history/recent-run-projection-graphql` (4), `workspaces/archive-run-history-graphql` (5) | `A collaboration tree was read before the Task records were loaded.` These tests build the GraphQL schema in their own process, with no server composition, so no source is bound | Test harness (the production start binds the source before any composed read; API-E02 and the built-server suites prove it) | `openEveryOwnFileUnder(<memory root>)`, the implementer's test stand-in; 24/24 |
| `app-data-migrations/collaborators-to-delegated-runs-startup` (1) | The test process read trees with the stores (no binding); converted collaborators have no Task record ("no Task's root", `projects.md`) | Test harness + DEC-008 | The in-test reads use the stand-in; through the server, the converted runs are in no tree and their roots open; 1/1 |
| `app-data-migrations/task-agent-own-run-startup` (TAU-1, TAU-2), `append-only-message-logs-startup` (AOML-1) | Their released fixture has no Task records, so every task agent left its tree (DEC-008). The real installs this fixture stands for keep a Task record per delegated run (investigation notes A-7: 181 of 195 with records) | Fixture gap made visible by DEC-008 | New `writeOpenTaskRecordsOfReleasedData` (one open ad-hoc Task per task agent, current shape) used by both suites; 5/5. TAU-2 also proves the interrupted released migration (MP-002) completes after a start in between |
| `app-data-migrations/team-run-v1-production-upgrade` (1) | The Team v1 (August) shape predates Task records; its task reviewer is in no tree | Stale under DEC-008 | Expects it in no tree; 4/4 |

I checked one escalation trigger directly: the released migration `20261017_task_agent_own_run_v1` reads its reduced tree back at startup, before the Task records load. It imports frozen copies of the stores (`app-data-migrations/frozen/server/…`), so no composed read happens there. A diagnostic TAU-1 run showed `status SUCCEEDED, failed 0`.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E01 (task-closure, three kinds: left the tree once stopped, the tree file holds no local run, a closure while the root is stopped writes no file), API-E02 OT-1, API-B01 BR-001…BR-003 run 2 (rendered rows leave; tree file checked after the closure before the failing step), API-R01 | Proven | — |
| AC-002 | Yes | API-E01 (task-reactivation: three root journeys, CANCELLED ×2, QR-001), API-B01 BR-008…BR-010 (rendered, live), BR-011 | **Not Proven (Fail F-3)**: the server side is proven for all three kinds; the web lists the run without a manual reload for Agent and Org, and also for Team while the view already knew the run (BR-009). After a restart, the Team root's view needs a manual reload | — |
| AC-003 | Yes | API-E01 (task-existing-copy EXC-E2E-001…005), API-B01 BR-012…BR-014 (rendered, live), BR-015 | **Not Proven (Fail F-3)** for the Team root's rendered row after a restart; server side and Agent root proven | — |
| AC-004 | No | API-R01 (unit), API-E01 (EXC-E2E-001…003: E DONE keeps the copy, A DONE closes it) | Proven | — |
| AC-005 | Yes | API-E02 OT-1/OT-2 (temporary Task left open stays across restarts; no-Task run in no tree, folder byte-identical, on the Memory page), OT-3 (unreadable record: warning names the Task, run absent; back after restore), API-E01 SCP-E2E-006 | Proven | — |
| AC-006 | Yes | API-E02 OT-1 (total = Manager + three runs, closed run counted) and OT-2 (after restart; DEC-008 run no longer counted) | Proven | — |
| AC-007 | Yes | API-R04 (context-file integration tests), API-E01 TAU-1 (context file served through the hub for a migrated run with an open Task), AOML-1/2 (message references resolve) | Proven for open runs and message references | A closed run's attachments are reached through the Team tab's message references (proven); the closed run itself is not openable (REQ-005) |
| AC-008 | Yes | API-E02 OT-2 (built server start: Team and Org runs whose tree files list local runs are admitted, load and work), API-E01 TAU-1/2, AOML-1/2, team-run-v1, collaborators | Proven | — |
| AC-009 | Yes | API-R01 (every shape per kind), API-E02 OT-2 (read writes nothing; first save keeps the link without own file, the full record and the remote link unchanged and in place; older Org entry left out; own files byte-identical), TAU-2 (interrupted released migration completes) | Proven | — |
| AC-010 | Yes | API-R01 (read counts ×3 kinds), API-E02 OT-2 (closed runs' own files unreadable while the roots load and work: no read reported; positive control shows a read would be) | Proven | — |
| AC-011 | Yes | API-E02 OT-1/OT-2 (server: message kept, closed run named from its own file, also after a restart), API-E01 task-closure (Manager's messages kept), API-B01 BR-001…BR-003 (rendered rows and names identical before and after the closure of Task A, three kinds) | **Not Proven (Fail F-2)**: in a live session, after the closure and a later delegation, the Agent and Org Manager's Team tab shows no messages until a page reload. The rendered after-restart check (BR-005) did not run | — |
| AC-012 | Yes | API-E02 OT-1/OT-2 (Memory page lists the closed run and the no-Task run, after restart) | Proven | — |
| Preserved agent texts (Non-Goals; BEH-004) | Yes | API-E01 EXC-E2E-007 | **Not Proven (Fail)** | — |

## Failures Found

| ID | Case / Criteria | Expected | Observed | Reproduction | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-1 | API-E01 EXC-E2E-007; preserved agent texts (requirements Non-Goals "No change to what an agent reads"; BEH-004) | A follow-up Task for a stopped copy whose saved folder is gone is refused with today's text: `… cannot be restored: it has no saved conversation to continue. Start a new delegation …` | `The task agent can't continue: its saved run could not be read (Task agent '<id>' of agent_org run '<id>' is not available: its own file is missing.).` Everything else is unchanged: refused before any change, Task files byte-identical, no reopen, no process | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-007 --no-watch` (ENV-1); 2 of 2 runs | `API-E01-EXC-E2E-007-fail.txt` |
| F-2 | API-B01 BR-001 (Agent root), BR-003 (Org root); AC-011 | In the open session, the Manager's Team tab keeps its message to the closed worker, named, through later work in the run | After Task A closed, the rows matched exactly (`to release notes writer … \| Status of the release notes?`). After the Manager reopened Task A and delegated it to a fresh run, the tab showed `0 Messages` / `No team messages yet` for over 20 s. The server's `collaborationParticipantMessages` for the Manager still returned the message and `pastParticipants: [{ agentRunId: <worker>, address: "/release_notes_writer_…" }]`; after a page reload the row was back. The Team root (BR-002) kept its rows | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh> --cases BR-001` (also BR-003); 2 of 2 runs each | `API-B01-diag-BR-001-evidence.json`, `API-B01-diag-BR-001-agent-team-tab-empty.png`, `API-B01-diag-BR-001-agent-team-tab-after-reload.png`, `API-B01-probe-run2-BR001-005-evidence.json` |
| F-3 | API-B01 BR-011, BR-015; AC-002 ("the web client lists it without a manual reload"), AC-003 | After a real backend restart, the open Team root view lists the worker when the Manager reopens its Task and messages its run ID (BR-011), and the Task Team when it gets a follow-up Task (BR-015), without a manual reload | The server reactivated the run: its process launched (`backend-3.log`), and the Team root's tree from GraphQL holds it. The view showed `Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.`, and the tree row appeared only after a manual reload (`rowAfterManualReload: 1`). In the same run the Agent and Org roots showed the row live (`"row shown live"`) | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh> --cases BR-008,BR-009,BR-010,BR-011`; 3 of 3 runs at the Team root. BR-015 failed at the same step for the Team root in run 1 | `API-B01-diag-BR-011-evidence.json`, `API-B01-diag-BR-011-team-no-row.png`, `API-B01-diag-BR-011-team-after-manual-reload.png`, `API-B01-probe-run1-evidence.json` |

Notes for failure-origin review:
- F-1: the run is no longer held in the loaded tree after its confirmed stop (D-4), so the reopen step adds it back from its own file first. `addTaskExecution` rejects `TASK_EXECUTION_CONTEXT_UNAVAILABLE` when the own file is missing, and that text reaches the agent before today's restore check would run.
- F-2: code review recorded this path as residual risk C-06 (`autobyteus-web/services/collaborationMessages/participantMessageRows.ts:56-58`, `agentRunCollaborationStore.ts:84-87`): a view rebuild re-fetches the participant list. Observed here, the rows do not come back without a page reload. The re-delegation's tree change is the trigger in the journey.
- F-3: D-8 chose "reload the view" for an unknown "reopened" reference: Team through stream recovery, Agent and Org through `checkpoint_required`. Here the Team stream recovery shows the out-of-sync notice and waits for the user. In BR-009 (no restart) the Team view still held the closed run, so the known-reference path ran and passed.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 70% | API-E01, API-E02 prove AC-001, AC-004 … AC-010, AC-012 and the server side of AC-002, AC-003, AC-011 | F-1, F-2, F-3 fail critical criteria; BR-005 not run | Fixes, then rerun EXC-E2E-007, BR-001…BR-005, BR-007, BR-011, BR-015 |
| Changed-boundary execution directness | 90% | 90% | Built server starts on upgraded data, real tool calls, real restarts, rendered views | Desktop shell not exercised (unchanged) | — |
| Cross-boundary integration realism and mock gap | 90% | 90% | Only the AGY CLI is scripted; real Task records, stores, GraphQL, WebSockets, Nuxt, Chrome | In-process GraphQL suites use the test stand-in source | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Test-owned data roots; old tree entries hand-built from the released key set and the inventory; released-data suites given the Task records real installs keep | Imported (Memory Sync) sources with delegated runs: no fixture exists (residual risk below) | A fixture of an imported source with delegated runs |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 85% | Unreadable Task record, unreadable tree, interrupted released migration (TAU-2), stopped-root closure, restarts | F-3 is a restart path; BR-005 rendered restart not run | Rerun after fixes |
| User-surface, browser, and desktop-shell confidence | 70% | 60% | 11 of 16 probe cases pass; diagnostics pin the two web failures | F-2, F-3 | Fixes, then rerun the probe |
| Durable regression coverage quality and relevance | 90% | 90% | New API-E02; 17 E2E files updated to the approved behavior; probe extended with AC-001 and AC-011 checks that caught F-2 | — | — |

- Overall post-repository confidence: 86%
- Overall final confidence: 82%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-002, AC-003, AC-011 and the preserved agent text fail)
- Any final applicable category below `90%`: `Yes`: requirement proof 70%, failure/lifecycle 85%, user surface 60%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2, F-3; BR-005 (rendered Team tab after a restart) not run

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack) and `Lifecycle` (built-server starts on upgraded data, real restarts)
- Confidence gap or residual risk it addresses, and the expected gain: the rendered tree and Team tab (AC-002, AC-003, AC-011), restarts and the upgrade start (AC-008, AC-009). It found F-2 and F-3, which no repository test covered.
- Browser validation needed, and why: yes. The Team tab and the live "reopened" handling are renderer behavior over a real event sequence, covered only by component logic tests before this round.
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: probe-owned real stack (built server, Nuxt dev server, headless Chrome) with the scripted AGY CLI, as planned. The isolated desktop instance was not used: its embedded server cannot receive the scripted CLI, and no shell code changed.
- Cases proving web-equivalent behavior: API-B01. Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (separate ports, data roots and processes; the user's AutoByteus and `~/.autobyteus` untouched)
- Behavior not directly proven and its confidence consequence: the Electron shell around these renderer journeys (low; unchanged code).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: the tree files of real Agent/Team/Org runs made by this build, with an older build's entries hand-built in (links of closed, open and no-Task runs; a link and a full record whose runs have no own file; an older Org link in a configured Team's list; a link to a run on another node), plus the released-layout fixtures (`released-task-agent-layout-fixtures.ts`, Team v1, collaborators)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-E02 OT-2 (admitted, a read writes nothing, the first save keeps exactly the link without own file, the full record and the remote link, in place); API-E01 TAU-1/2, AOML-1/2, team-run-v1, collaborators (released data starts, migrates and opens)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the user's own data (volume only; never loaded by tests, TESTING.md)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commits `009f707955` baseline fix, `431de4c9d1` ticket tests)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` | Added | API-E02 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_REPLY_USAGE`) | Updated | API-E02 | — |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts` (`writeOpenTaskRecordsOfReleasedData`) | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/projects/{task-closure-root-visibility,task-reactivation-root-visibility,task-existing-copy-assignment,ad-hoc-task-delegation,teammate-delivery-task-closure-race,get-project-task-worker-scope}.e2e.test.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/{task-agent-own-run-startup,append-only-message-logs-startup,team-run-v1-production-upgrade,collaborators-to-delegated-runs-startup}.e2e.test.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/{memory/memory-collaboration-graphql,memory/imported-team-memory-graphql,run-history/recent-run-projection-graphql,workspaces/archive-run-history-graphql}.e2e.test.ts` | Updated | API-E01 | — |
| `autobyteus-server-ts/tests/e2e/{remote-collaboration/remote-delegation-two-server,projects/delegated-launch-config-defaults,projects/collaboration-model-contract}.e2e.test.ts` | Updated (baseline fix) | API-E01 | — |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated | API-B01 | — |

- Added or updated paths attached for proportional test-code review: `No` (the result is `Fail`; test-code review follows a passing round)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model provider | Scripted CLI (`agy-failure-cli.mjs`, `linked_skills`, `AGY_FAKE_REPLY_USAGE`) | Deterministic real tool calls with no paid inference (TESTING.md) | Real model behavior is not this change's subject |
| Task side in four in-process GraphQL suites and one in-test read | `openEveryOwnFileUnder` (implementer's stand-in) | These processes compose no Task side; their subject is not tree membership | Tree membership there is proven by API-E01 projects suites and API-E02 instead |
| Peer node of the hand-built remote link (API-E02) | A link to a node that does not exist | Only the stored link's survival and listing are in scope; real node-to-node delegation is covered by the two-server suite (42/42) | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temporary diagnostics in `task-agent-own-run-startup` (TAU-1), `task-existing-copy-assignment` (EXC-E2E-007), `open-task-tree-upgrade-startup`, `imported-team-memory`, `memory-collaboration`, `task-closure-tree-probe.mjs` (×3) | Yes | Each restored from its backup copy right after its run | `cmp`/`git diff` confirmed; nothing committed |
| Test data roots, spawned servers, probe stacks (ports, Nuxt, Chrome, backend) | Yes | Removed by the tests and probe | Probe receipts: `"dataRootRemoved": true`, backend/frontend terminated, browser closed |
| Fresh clone `/tmp/api469/fresh` | Yes | Removed after API-F01 | Removed |

## Not Tested / Residual Risks

- BR-005 (rendered Team tab and closed rows after a reload and a real restart) and BR-007 did not run, because they need BR-001…BR-003 in the same run. The after-restart Team tab is proven at the server boundary (API-E02 OT-2).
- Memory Sync imported sources: a composed read of an imported team or org tree asks this node's Task records, which never name an imported root, so its delegated runs would not be listed under their imported team run. No test fixture holds an imported source with delegated runs; code reading only. They should stay listed through own-file presence (D-6). Not tested.
- Inactive closed-set digest (C-02): not observed as a problem in the journeys.

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix`, implementation. Keep today's refusal text when the stopped copy's saved run is gone; the outcome itself is correct.
- F-2: `Local Fix`, implementation (web). The Agent and Org Manager's Team tab loses its past-participant rows after a view rebuild and does not recover; the server answer is correct.
- F-3: `Unclear` (`Local Fix` or `Design Impact`). The Team root's handling of an unknown "reopened" reference (D-8, "Team: stream recovery") does not list the run without a manual reload. Failure-origin review decides whether the Team recovery has a bug or the design's choice cannot meet AC-002.
- Recommended owner: failure-origin review by the Code Reviewer.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-002 (Team root after a restart, F-3), AC-003 (Team root after a restart, F-3), AC-011 (Agent and Org live session, F-2; rendered after restart not run), preserved agent text (F-1). Nothing is left for the user to check.
- Preliminary classification and recommended owner: above; failure-origin review requested
- Next recipient from `get_handoff_rules`: (see handoff)
- Notes: task size `Large`, architectural risk `High` preserved. Fresh-start build (API-F01) passed on `431de4c9d1`. Follow-up recorded: FU-004 (Collaboration Model §3 wording on where a remote link is stored).
