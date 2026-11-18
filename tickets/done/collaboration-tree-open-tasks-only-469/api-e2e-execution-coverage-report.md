# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident I am, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/`; evidence files are in the ticket's `evidence/` folder.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/collaboration-tree-open-tasks-only-469/api-e2e-coverage-investigation.md` (round-2 plan at its end)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3, delivery re-entry DR-002 (`/software_engineering_team/delivery_engineer`). AC-007 was recorded `Proven` by cases that do not reach a run that left the tree. Round 2 is complete and unchanged; round 3 adds API-E03 and corrects the AC-007 row. Code under test: `origin/personal` `1ee1ea61cf` (the merged change), worktree `collaboration-tree-open-tasks-only-469-ac007`.
- Prior round reviewed: round 1 (API-REV-001, Fail F-1…F-3); each prior failure was checked first (table "Round 1 failures and their resolution")
- Deviations from the investigation's plan, and why: none in rounds 2 and 3. Round 1's deviations are recorded in the revision record.
- Round 3 correction: my round-2 AC-007 row cited API-I01, TAU-1 and AOML-1/2. Those reach attachments only of runs that are in the tree: TAU and AOML give their runs open Tasks, and API-I01 reads a reference with no past participant. The row overclaimed. It now cites API-E03, which closes the run's Task first.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469-ac007/tickets/done/collaboration-tree-open-tasks-only-469/evidence/` (the ticket is archived; the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Product source `fa48d74a3e` (HEAD `c7eb0d8626`: test-only after it) | macOS darwin 25.5 (arm64) | Node v22.21.1; server `dist/` rebuilt from `fa48d74a3e` (EXIT 0), `test:integration:prepare` (EXIT 0); in-process and built (`dist/app.js`) servers | `env -i PATH HOME=<resolved temp> TMPDIR USER LANG`; `RUN_AGY_FAILURE_E2E=1`; `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; test-owned temp data roots only |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built `dist/app.js`, Nuxt dev server, headless Google Chrome (Playwright) | Free ports, private data root, launch credential; scripted AGY `linked_skills` |
| ENV-4 | `1ee1ea61cf` (merged; worktree `collaboration-tree-open-tasks-only-469-ac007`) + round-3 test files | macOS darwin 25.5 arm64 | Node v22.21.1; fresh `pnpm install --frozen-lockfile`, `prebuild`, server `build` in that worktree (EXIT 0); built `dist/app.js` | as ENV-1 |
| ENV-3 | `c7eb0d8626` | macOS darwin 25.5 arm64 | Fresh clone, `pnpm install --frozen-lockfile` (pnpm 10.28.2), desktop release build command | TESTING.md "Fresh-start build" |

## Cases

Round 2 (current). Every case was rerun because a contract package changed (TESTING.md "Rerun by impact" item 4).

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-004, AC-005, AC-009, AC-010 (unit parts) | Server unit | Reused IMP-09 | — | Pass | (IMP-09) | (IMP-09) | Ran on `fa48d74a3e` (after two test fixes, explained in its file) |
| API-R02 | — | Typecheck, contracts | Reused IMP-08 (team-stream contracts), IMP-11 (server and web typechecks), IMP-04 | — | Pass | (IMP-08, IMP-11) | (IMP-08, IMP-11) | Same product commit; my test changes since are E2E only |
| API-R03 | AC-002 (web), AC-011 (web logic) | Web unit and component | Reused IMP-10 | — | Pass | (IMP-10) | (IMP-10) | On `fa48d74a3e` |
| API-I01 | AC-001, AC-007, AC-011 (in-process) | Server integration | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | ENV-1 | Pass | `API-I01-round2-server-integration.txt` | `Test Files  90 passed \| 20 skipped (110)`, `Tests  524 passed \| 69 skipped (593)` | Not rerun by IR-002; run here |
| API-E01 | AC-001 … AC-005, AC-007, AC-008, AC-011, AC-012; D-9, D-12; regressions | Real Studio server HTTP/WS/GraphQL/scoped MCP; built-server starts | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` | ENV-1 | Pass | `API-E01-round2-server-e2e.txt` | `Test Files  182 passed \| 71 skipped (253)`; `✓ EXC-E2E-007`; reactivation, follow-up-Task and closure journeys for three kinds `✓` | Includes API-E02 and the two helpers IR-002 adapted |
| API-E02 | AC-005, AC-006, AC-008, AC-009, AC-010, AC-011, AC-012 | Built server on an upgraded test-owned data root; restarts | Within API-E01 (`tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts`) | ENV-1 | Pass | `API-E01-round2-server-e2e.txt` | `✓ tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts (3 tests)`, `✓ OT-1`, `✓ OT-2`, `✓ OT-3` | |
| API-B01 | AC-001, AC-002, AC-003, AC-004, AC-005, AC-011 | Rendered tree, Team tab, reactivation and follow-up Tasks, real backend restarts | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir /tmp/api469/r2-probe-B01` (all 16 cases, one run) | ENV-2 | Pass | `API-B01-round2-probe-evidence.json`, `API-B01-round2-agent-team-tab-after.png`, `API-B01-round2-team-team-tab-after.png`, `API-B01-round2-org-team-tab-after.png`, `API-B01-round2-agent-restart-reload-team-tab.png`, `API-B01-round2-team-reactivated-after-second-restart.png`, `API-B01-round2-team-existing-copy-after-restart.png` | `"result": "Pass"`; every `BR-0xx` `"Pass"`; BR-001…003 `storedLocalEntriesAfterA: 0`, `teamTab.beforeA` = `afterA`, `beforeB` = `afterB`, `duringB: {"framesDiffering": 0, "unknownTeammateFrames": 0}`; BR-005 `afterRestart.<kind>.teamTabRows: 1` with `seen: []`; cleanup `"dataRootRemoved": true` | |
| API-F01 | Release build of changed build inputs (team-stream contract `dist/`) | Fresh clone and the release build job | `git clone --no-local` at `c7eb0d8626`; `pnpm install --frozen-lockfile`; `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's Prisma and packaged-terminal verify steps | ENV-3 | Pass | `API-F01-round2-fresh-start-build.txt` | `INSTALL EXIT 0`, `BUILD EXIT 0`, `[typecheck] PASS`, `Build completed`, `schema-engine-darwin-arm64 OK`, `VERIFY3 EXIT 0` | Signing, notarization, Intel and Linux jobs need the runner: not tested |
| API-E03 (round 3) | AC-007 | Built server; the top run's message-reference route and member context-file route; a real restart | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/closed-run-attachments.e2e.test.ts --no-watch` | ENV-4 | Pass | `API-E03-closed-run-attachments.txt` | `✓ CRA-1 …`, `Tests  1 passed (1)`; observed only: `{"agentContextFileWhileClosed":404,"orgContextFileWhileClosed":404}` | New durable test. Agent and Org roots |
| API-E02 (round 3 rerun) | AC-005, AC-006, AC-008 … AC-012 | as API-E02 | `… vitest run tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts --no-watch`; `pnpm -C autobyteus-server-ts typecheck` | ENV-4 | Pass | `API-E02-round3-rerun-and-typecheck.txt` | `Tests  3 passed (3)`, `[typecheck] PASS` | Rerun because its built-server helpers moved to `tests/e2e/helpers/built-studio-roots.ts` (shared with API-E03); no assertion changed |

### Round 1 cases (history; results on `42652879b3`)

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
| AC-001 | Yes | API-E01 (task-closure, three kinds: the runs left the tree once stopped, the tree file holds no local run, a closure while the root is stopped writes no file), API-E02 OT-1, API-B01 BR-001…BR-003 (rendered rows leave; `storedLocalEntriesAfterA: 0`), API-R01 | Proven | — |
| AC-002 | Yes | API-E01 (task-reactivation: three root journeys, CANCELLED ×2, QR-001), API-B01 BR-008…BR-010 (live) and BR-011 (after real restarts, three kinds) | Proven | — |
| AC-003 | Yes | API-E01 (EXC-E2E-001…005), API-B01 BR-012…BR-014 (live) and BR-015 (after real restarts) | Proven | — |
| AC-004 | No | API-R01, API-E01 (EXC-E2E-001…003: E DONE keeps the copy; A DONE closes it) | Proven | — |
| AC-005 | Yes | API-E02 OT-1/OT-2/OT-3, API-E01 SCP-E2E-006, API-B01 BR-016 (damaged Task data refused, accepted after restore) | Proven | — |
| AC-006 | Yes | API-E02 OT-1/OT-2 | Proven | — |
| AC-007 | Yes | API-E03 CRA-1 (Agent and Org roots). (1) A file referenced by a message between the Manager and its worker opens through the top run's route with its exact bytes after the worker's Task closed and it left the tree, after a real restart from the stopped root, and after the root's restore. (2) Once the Task is reopened and the Manager continues the worker by run ID, the worker's context file opens again. Supporting only, attachments of runs in the tree: API-I01, TAU-1, AOML-1/2 | Proven (round 3; the round-2 citation did not prove it) | — The Team root is not covered: the context file of a Team root's delegated run is uploaded through a Team draft owner this journey cannot address from an existing run. The reference route of the Team root is the Team records' route, unchanged by this ticket. Observed, not asserted (FU-006): the context-file route answers 404 for both roots while the Task is closed |
| AC-008 | Yes | API-E02 OT-2 (built-server start with Team and Org trees listing local runs), API-E01 TAU-1/2, AOML-1/2, team-run-v1, collaborators | Proven | — |
| AC-009 | Yes | API-R01, API-E02 OT-2, API-E01 TAU-2 (interrupted released migration completes) | Proven | — |
| AC-010 | Yes | API-R01, API-E02 OT-2 (with positive control) | Proven | — |
| AC-011 | Yes | API-E02 OT-1/OT-2 (server, also after a restart), API-I01, API-B01 BR-001…BR-003 (rendered, per frame during a closure) and BR-005 (after a reload and a real restart) | Proven | — |
| AC-012 | Yes | API-E02 OT-1/OT-2 | Proven | — |
| Preserved agent texts (Non-Goals; BEH-004; DEC-011) | Yes | API-E01 EXC-E2E-007 | Proven | — |

### Round 1 failures and their resolution

| ID | Case / Criteria | Expected | Observed | Reproduction | Evidence |
| --- | --- | --- | --- | --- | --- |
| F-1 | API-E01 EXC-E2E-007; preserved agent texts (requirements Non-Goals "No change to what an agent reads"; BEH-004) | A follow-up Task for a stopped copy whose saved folder is gone is refused with today's text: `… cannot be restored: it has no saved conversation to continue. Start a new delegation …` | `The task agent can't continue: its saved run could not be read (Task agent '<id>' of agent_org run '<id>' is not available: its own file is missing.).` Everything else is unchanged: refused before any change, Task files byte-identical, no reopen, no process | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-007 --no-watch` (ENV-1); 2 of 2 runs | `API-E01-EXC-E2E-007-fail.txt` |
| F-2 | API-B01 BR-001 (Agent root), BR-003 (Org root); AC-011 | In the open session, the Manager's Team tab keeps its message to the closed worker, named, through later work in the run | After Task A closed, the rows matched exactly (`to release notes writer … \| Status of the release notes?`). After the Manager reopened Task A and delegated it to a fresh run, the tab showed `0 Messages` / `No team messages yet` for over 20 s. The server's `collaborationParticipantMessages` for the Manager still returned the message and `pastParticipants: [{ agentRunId: <worker>, address: "/release_notes_writer_…" }]`; after a page reload the row was back. The Team root (BR-002) kept its rows | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh> --cases BR-001` (also BR-003); 2 of 2 runs each | `API-B01-diag-BR-001-evidence.json`, `API-B01-diag-BR-001-agent-team-tab-empty.png`, `API-B01-diag-BR-001-agent-team-tab-after-reload.png`, `API-B01-probe-run2-BR001-005-evidence.json` |
| F-3 | API-B01 BR-011, BR-015; AC-002 ("the web client lists it without a manual reload"), AC-003 | After a real backend restart, the open Team root view lists the worker when the Manager reopens its Task and messages its run ID (BR-011), and the Task Team when it gets a follow-up Task (BR-015), without a manual reload | The server reactivated the run: its process launched (`backend-3.log`), and the Team root's tree from GraphQL holds it. The view showed `Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.`, and the tree row appeared only after a manual reload (`rowAfterManualReload: 1`). In the same run the Agent and Org roots showed the row live (`"row shown live"`) | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh> --cases BR-008,BR-009,BR-010,BR-011`; 3 of 3 runs at the Team root. BR-015 failed at the same step for the Team root in run 1 | `API-B01-diag-BR-011-evidence.json`, `API-B01-diag-BR-011-team-no-row.png`, `API-B01-diag-BR-011-team-after-manual-reload.png`, `API-B01-probe-run1-evidence.json` |

Notes for failure-origin review:
- F-1: the run is no longer held in the loaded tree after its confirmed stop (D-4), so the reopen step adds it back from its own file first. `addTaskExecution` rejects `TASK_EXECUTION_CONTEXT_UNAVAILABLE` when the own file is missing, and that text reaches the agent before today's restore check would run.
- F-2: code review recorded this path as residual risk C-06 (`autobyteus-web/services/collaborationMessages/participantMessageRows.ts:56-58`, `agentRunCollaborationStore.ts:84-87`): a view rebuild re-fetches the participant list. Observed here, the rows do not come back without a page reload. The re-delegation's tree change is the trigger in the journey.
- F-3: D-8 chose "reload the view" for an unknown "reopened" reference: Team through stream recovery, Agent and Org through `checkpoint_required`. Here the Team stream recovery shows the out-of-sync notice and waits for the user. In BR-009 (no restart) the Team view still held the closed run, so the known-reference path ran and passed.

| Round-1 failure | Resolution in round 2 | Now proven by |
| --- | --- | --- |
| F-1 (EXC-E2E-007 text) | DEC-011 (Solution Designer): a copy whose own file is gone is outside the supported states. The test now removes only the stopped copy's conversation and keeps today's text (`c7eb0d8626`) | API-E01 round 2: `✓ EXC-E2E-007` |
| F-2 (Team tab loses past-participant rows after a view rebuild, Agent/Org) | IR-002 (CR-002): a loaded Team-tab list re-fetches when a rebuilt view no longer holds an agent it names | API-B01 round 2: BR-001…BR-003 pass; `duringB.framesDiffering: 0` over about 284 frames; BR-005 after reload and restart |
| F-3 (Team view does not list a run reopened after a restart) | IR-002 (CR-003, SR-009): the Team `TASK_EXECUTIONS_REOPENED` event carries the run's record; the view inserts it | API-B01 round 2: BR-011, BR-015 pass |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | Every AC proven at its real boundary: API-E01, API-E02, API-B01 | Imported Memory Sync sources with delegated runs untested | A fixture for that shape |
| Changed-boundary execution directness | 95% | 95% | Built-server starts on upgraded data, real tool calls, real restarts, rendered views | Desktop shell not exercised (unchanged) | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | Only the AGY CLI is scripted; real Task records, stores, GraphQL, WebSockets, Nuxt, Chrome | In-process suites use the test stand-in source | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | Test-owned data roots; old entries hand-built from released key sets; released-data suites with the Task records real installs keep | User's own data volume never loaded (by rule) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Unreadable Task record and tree, interrupted migration, stopped-root closure, restarts (BR-005, BR-011, BR-015, OT-2/3) | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | API-B01 16/16 in one run, with per-frame sampling of the Team tab | Electron shell not exercised (no shell change) | — |
| Durable regression coverage quality and relevance | 95% | 95% | New API-E02; 18 E2E files updated; probe checks AC-001 and AC-011 (they caught F-2) | — | — |

- Overall post-repository confidence: 94%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories (rounded)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: imported Memory Sync sources with delegated runs (not tested); signing and non-macOS release jobs need the runner

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack) and `Lifecycle` (built-server starts on upgraded data, real restarts)
- Confidence gap or residual risk it addresses, and the expected gain: the rendered tree and Team tab (AC-002, AC-003, AC-011), restarts and the upgrade start (AC-008, AC-009). In round 1 it found F-2 and F-3; in round 2 it proves their fixes.
- Browser validation needed, and why: yes. The Team tab and live "reopened" handling are renderer behavior over a real event sequence.
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

- Round 3: added `autobyteus-server-ts/tests/e2e/projects/closed-run-attachments.e2e.test.ts` (API-E03) and `tests/e2e/helpers/built-studio-roots.ts` (built-server helpers moved out of `open-task-tree-upgrade-startup.e2e.test.ts`, which now imports them). Commit in the handoff.
- Repository-resident durable coverage added, updated, or removed: `Yes` (commits `009f707955` baseline fix, `431de4c9d1` ticket tests, `c7eb0d8626` EXC-E2E-007 per DEC-011). IR-002 also adapted `task-existing-copy-assignment` and `task-reactivation-root-visibility` helpers (`fa48d74a3e`); both ran green here.

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

- Added or updated paths attached for proportional test-code review: `Yes`
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
| Temporary diagnostics (round 1, six files) | Yes | Each restored from its backup right after its run | `cmp`/`git diff` confirmed; nothing committed |
| Test data roots, spawned servers, probe stacks | Yes | Removed by the tests and probe | Round-2 probe receipt: `"dataRootRemoved": true`, backend/frontend terminated, browser closed |
| Fresh clones `/tmp/api469/fresh` (round 1), `/tmp/api469/fresh2` (round 2) | Yes | Removed after API-F01 | Removed |

## Not Tested / Residual Risks

- Memory Sync imported sources: a composed read of an imported team or org tree asks this node's Task records, which never name an imported root, so its delegated runs would not be listed under their imported team run. They should stay listed through own-file presence (D-6). No fixture holds an imported source with delegated runs; code reading only. Not tested.
- Signing, notarization and the Intel and Linux release jobs need the release runner: not tested.
- Inactive closed-set digest (C-02): one extra view read per digest value; not observed as a problem in the journeys.
- The user's own data (145-entry hub) is never loaded by tests (TESTING.md); shapes are covered by the inventory-based fixtures.

## Preliminary Classification (On `Fail`)

- N/A (round 2 result is `Pass`)

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Notes: round 3 (DR-002): AC-007 now proven by API-E03 and the row corrected; result stays `Pass`. Task size `Large`, architectural risk `High` preserved. Follow-up FU-004 recorded in round 1.
