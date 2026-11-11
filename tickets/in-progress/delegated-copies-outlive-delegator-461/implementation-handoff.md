# Implementation Handoff — autobyteus-461 (delegated runs are runs of their own)

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
Branch: `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` `827f1e68dc`.
Ticket folder: `tickets/in-progress/delegated-copies-outlive-delegator-461/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review was selected (passed ARCH-REV-014 on SR-039, ARCH-REV-019 on SR-044); this handoff goes to Code Review (targeted re-review, round 2).
- Requirements doc: `requirements-doc.md`
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (through SR-044)
- Design spec: `design-spec.md` (DS-1 … DS-11; implementation order steps 1 … 10)
- Supplemental task artifacts: `target-collaboration-contract.md` (revision 8, the authority with its executable model), `evidence/collaboration-model/` (`model.py`, `stories.py`, `walkthrough.py`), `collaboration-walkthrough.md`, `evidence/data-model-validation/`
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: `code-review-report.md` (CRR-002, corrected by CRR-003; CRR-004 adds FU-011), with SR-040 … SR-044 answering CR-461-002

## Current Implementation Summary

- Implementation cycle: `Rework` (round 2)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001: the initial implementation)
- Related solution revision IDs: SR-018 … SR-044 (this round: SR-040 poll from the view's projection, SR-041 no digest and every hosting-only field removed, SR-042 … SR-044 live child rows)
- Related architecture-review revision IDs: ARCH-REV-005 … ARCH-REV-019
- Related code-review revision IDs: CRR-002, CRR-003, CRR-004; API-E2E / delivery: `N/A`
- Triggering finding IDs: CR-461-001, CR-461-002 (as SR-040 … SR-044), CR-461-003, CR-461-004, CR-461-005

**Round 2 (IR-002) in short:**
- CR-461-001: a closure stop re-checks "still closed" at the head of the run's own gate (agent and team); an entry open again keeps the run, logs `TASK_AGENT_RESOURCE_NOT_CLOSED` and records no `terminatedAt`.
- CR-461-003: the work packet of a new run is admitted at the head of that run's gate only while its Task entry is open; otherwise the run is discarded and the delegator is told the work was not started.
- CR-461-004: team and org token totals include every run delegated from them, recursively (`getTeamRunSummary(root, delegatedAgentRunIds)`).
- CR-461-005: the listed dead exports and `resetProjectTaskServiceForTests` removed; `ClosedDelegatedRunReader` → `DelegatedRunAgentsReader`; the org stop comment fixed.
- SR-040/041: the history poll answers every listed run from the view's projection (statuses from each child's own run, addresses from `DelegationTree.agentsOf`); no digest; the web re-reads on an active-state or children difference, once per distinct answer.
- SR-042 … SR-044: `DelegationTree` reports child-row changes; `ChildRowsFeed` publishes the unsequenced `CHILD_RUNS_CHANGED` with the rows to every open view stream; each stream session holds events during its snapshot and flushes them after it (FIFO); the Team view applies them in place by membership, Agent-run and Org views re-read.
- SR-041 removals: every hosting-only contract field and event (listed in `implementation-revision-record.md` IR-002) and the web code that only served them.

A delegated run (agent or team, local or on a peer) is now an ordinary run with its own root, idle shutdown, Stop and restart resume. Nothing hosts it. The delegation is stored once per side, under one name `delegatedFrom` (contract P2): on the Task entry (`agent_run_resources.json`, with `recipientAddress`, and `nodeId`/`members` for a peer's run) and on the delegated run's own file. The delegating run stores nothing about it; the in-memory `DelegationTree` (built from the Task entries) relates runs for messaging, views, token totals, restart and the run list. All hosting machinery was removed (registries of hosted copies, the shared root task lifecycle, closure fences and leases, launch editing on copy records, the standalone `collaboration_tree.json`, tree `taskExecutions`/`remoteTaskExecutions`, `taskAgent` readers, copy memory placements). One startup migration converts existing data.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: persistence (one migration over Task records, run files, trees, logs, busy-run record, history rows), ownership boundaries (no hosting anywhere), ordering (each run's own gate), shared contracts (Task entry, view DTOs of three run kinds, one GraphQL field). Net change about +9,300 / −29,900 lines across ~520 files.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. One item for placement (not blocking): FU-012, the recorded copy choice `userLaunchSelection` still in the contracts and the Settings rows (see Known Risks)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-1 (REQ-002, REQ-009) | `delegate_task` from any run starts an ordinary run and writes its Task entry first | `agent-collaboration/execution/task/task-delegation.ts` (`toNewRun`, `toPeerRun`, `toExistingRun`), `execution/delegation/delegated-run-starter.ts`, `remote/remote-delegation.ts`; roots call `delegateThrough` | Implemented; refusals and result texts unchanged (SR-037 own-definition refusal) |
| DS-2 (REQ-003) | Message by run ID between runs related by a Task; the receiver woken | `agent-collaboration/communication/cross-run-message-delivery.ts`, `agent-communication/services/global-agent-run-message-router.ts` | Implemented: sender prepares, receiver root accepts in its gate (re-checks the Task side), both logs, one message ID |
| DS-3 | Address beyond the sender's run: contract §2.3 step 2, then the old-address correction | `communication/cross-run-address-resolution.ts` | Implemented (SR-036, ARCH-REV-011 order) |
| DS-4 (REQ-001) | Stop stops that run only | `standalone-agent-run-root-manager.ts` `stopRoot`, `root-team-run.ts` `terminate`, `agent-org-run.ts` | Implemented: own parts only |
| DS-5 (REQ-005) | Task closure stops its runs with no other open Task, by each run's identity; peer runs fenced | `execution/task/task-run-control.ts`, `projects/runtime/task-execution-resource-release.ts`, `compositions/project-task-execution-resource-composition.ts` | Implemented |
| DS-6 (REQ-005) | Reopen + the assigner's message continues; follow-up Task to an existing run | `cross-run-message-delivery.ts` (`_admit` continuation), `task-delegation.ts` `toExistingRun` | Implemented |
| DS-7 | A quiet delegated run shuts down; the next message restores it | `standalone-agent-run-root/services/delegated-run-idle-shutdown.ts`, `agent-team-execution/services/delegated-team-idle-shutdown.ts` | Implemented for every delegated run (local and peer) |
| DS-8 (REQ-002, REQ-004, REQ-006) | A run's view: child rows from the Task entries with status and live output; child commands to the child's own run; connect never starts the host; a child's Settings change goes to the child's own save (SR-039) | `services/agent-streaming/delegated-children-dtos.ts`, `execution/delegation/delegated-run-commands.ts`, `execution/delegation/local-child-observation.ts` (statuses and output while viewed), `run-history/services/delegated-launch-selection-service.ts` + `delegated-child-launches.ts` | Implemented. Live child output reuses the remote child's projection path (N-402) |
| DS-8 live child rows (SR-042 … SR-044; REQ-002, REQ-005 AC-005/007) | An open view of each kind learns a new, reopened, peer, closed or deleted child row without a reload; unsequenced and idempotent; held during a snapshot and sent after it, FIFO, each once; never starts X | Server: `delegation-tree.ts` (`subscribeChildRows`, reported inside `entriesChanged` after the update), `delegation/child-rows-feed.ts`, `services/agent-streaming/child-rows-stream-session.ts`, the three stream handlers, `team-execution-view-projector.ts` (`projectTeamChildRunsChanged`), `compositions/task-delegation-composition.ts` (projection), `project-task-execution-resource-composition.ts` (follow). Contracts: `CHILD_RUNS_CHANGED` (team `{run_id, added, removed}`; collaboration `{root_subject_kind, root_run_id, event: {kind: "child_runs_changed", …}}`). Web: `teamChildRunsChange.ts` + `teamExecutionViewState.ts` (in place), `agentRunCollaborationContext.ts` / `agentOrgExecutionContext.ts` `applyChildRunsChanged` + their streaming services (re-read) | Implemented. Deviation in naming only: on the collaboration stream the event is its own message type `CHILD_RUNS_CHANGED` carrying `kind: "child_runs_changed"`, because `ROOT_EXECUTION_EVENT` requires a `change_sequence` (SR-044 says none) |
| DS-8 history poll (SR-040/041; REQ-009 preserved) | Every listed run answers `{runId, isActive, statuses}`, statuses from each child's own run, else offline; web: one rule, re-read once per distinct answer | `standalone-agent-run-root-manager.ts` `getAgentStatuses`, `local-child-observation.ts` `localChildStatuses`, `delegation-tree.ts` `agentsOf`, `run-own-agents-reader.ts`; web `agentRunCollaborationStore.ts` `refreshListedStatuses` | Implemented; FU-009 withdrawn |
| DS-5 closure stop (CR-461-001) | A stop after a reopen or follow-up assignment is not applied | `task-run-control.ts`, `standalone-agent-run-root.ts` `stopForTaskClosure`, `agent-team-run-manager.ts` `terminateTeamRunForTaskClosure`, `task-execution-resource-release.ts` | Implemented; tested in both orders for agent and team |
| DS-1 start vs closure (CR-461-003) | A packet admitted at the new run's gate head only while its Task entry is open | `task-delegation.ts` (`WorkPacket.assertAllowed`, `acceptWorkPacketIfAllowed`), standalone root delivery, `root-team-run.ts` | Implemented; interleaved tests for agent and team |
| REQ-009 token totals (CR-461-004) | Team and org totals include the runs delegated from them | `token-usage-run-store.ts`, `token-usage-run-aggregate.ts`, `token-usage-stats.ts`, `delegated-run-agents-reader.ts` | Implemented |
| DS-9 (REQ-008) | Busy runs resumed after an update restart, bottom-up along `delegatedFrom`; each notice lists the resumed runs it delegated to | `restart-resume/restart-resumer.ts`, `restart-notice.ts`, `busy-run-record.ts` (places `host`/`member`) | Implemented |
| DS-10 (REQ-011) | One startup migration converts every stored shape (contract §6 E1 … E12) | `app-data-migrations/migrations/delegated-runs-own-runs-v1/` (`20261111_delegated_runs_own_runs_v1`) | Implemented; a run it cannot convert is preserved and reported (P7) |
| DS-11 (REQ-002, REQ-007) | Run list: a run delegated from a stored run is not a top-level row | `run-history/services/top-level-run-rule.ts`, used by `workspace-run-history-service.ts` | Implemented |
| REQ-007 (AR-007, TC-2) | Archive/delete refused, naming the working runs, while a run it delegated to works on an open Task | `run-history/services/delegated-work-guard.ts`, used by `agent-run-history-service.ts`, `team-run-history-service.ts`, `agent-org-run-service.ts` | Implemented |
| REQ-009 (preserve) | Task worker status on the Projects page stays live | `execution/task/task-worker-status-notice.ts` → `TaskRunControl.statusChanged` | Regression found and fixed this round (the root task lifecycle used to forward it) |
| REQ-009 (preserve) | The Task page opens the worker in its delegating run's view | web `useTaskRootNavigation.ts`, `types/project.ts`, `utils/projects/taskRootPresentation.ts`, GraphQL `TaskRoot.delegatingRun` | Implemented (design table "hostRoot readers") |
| TC-13 | An agent run's message log is in its own folder | `run-history/store/message-log-owners.ts`, standalone root persistence | Implemented |
| REQ-012 | `collaboration_model.md`, `GLOSSARY.md`, module docs | see Key Files | Updated |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Round 2 new owners: `agent-collaboration/delegation/child-rows-feed.ts`, `services/agent-streaming/child-rows-stream-session.ts`, web `services/teamExecution/teamChildRunsChange.ts`; renamed `run-history/services/delegated-run-agents-reader.ts`.
- New owners: `agent-collaboration/delegation/delegation-tree.ts` (+ `subscribe`, `subscribeChildRows`, `agentsOf`), `execution/task/task-delegation.ts`, `execution/task/task-run-control.ts`, `execution/task/task-worker-status-notice.ts`, `execution/delegation/{delegated-run-starter,delegated-run-commands,delegated-child-locations,local-child-observation}.ts`, `communication/{cross-run-message-delivery,cross-run-address-resolution}.ts`, `run-history/services/{delegated-child-launches,top-level-run-rule,delegated-work-guard,closed-delegated-run-reader}.ts`, `run-history/store/{raw-tree-file,message-log-owners}.ts`.
- Migration: `app-data-migrations/migrations/delegated-runs-own-runs-v1/`; frozen released readers under `app-data-migrations/frozen/server/`.
- Roots: `standalone-agent-run-root/`, `agent-team-execution/domain/root-team-run.ts`, `agent-org-execution/domain/agent-org-run.ts`.
- Web: `autobyteus-web/{graphql/queries/projectTaskQueries.ts,types/project.ts,composables/projects/useTaskRootNavigation.ts,utils/projects/taskRootPresentation.ts,components/projects/ProjectTaskWorkers.vue,generated/graphql.ts}` and their specs.
- Docs: `autobyteus-server-ts/docs/design/collaboration_model.md`, `GLOSSARY.md`, `docs/modules/{standalone_agent_run_root,agent_team_execution,agent_orgs,agent_communication,projects,agent_memory,restart_resume,remote_collaboration,run_history,token_usage}.md`.

## Important Assumptions

- The contract (revision 8) and `model.py` are the authority; `walkthrough.py --check` is green on the final commit.
- The web changes this round follow SR-040 … SR-044 (poll rule, child-row events, removed fields); the rows, selection and buttons are unchanged.
- A child row's live output uses the remote child's projection path (design DS-8 "through the path a remote child uses today (N-402)"); the local event is `local_child_presentation`, mapped in the three projectors.
- The agent-run web client closes its stream when the snapshot says the host is not live (unchanged); a stopped standalone delegator's open view therefore follows its rows through the history poll (SR-040), while the server publishes `CHILD_RUNS_CHANGED` to any open session, active or not (tested at the handler).

## Known Risks

- **Migration on real data**: tested only on hand-built fixtures (never on user data, per `TESTING.md`). A delegated run whose stored `workspaceRootPath` is empty is preserved and reported, because the ordinary run reader requires a workspace.
- **Live child rows in a browser**: covered by unit and handler tests per view kind; not exercised in a real browser this round.
- **Server E2E suites** still name the removed events and fields (`tests/e2e/projects/*`, `tests/e2e/runtime/*`, `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`, `autobyteus-web/tests/e2e/*.mjs` probes); they are owned by API/E2E and need the round's rewrite.
- **FU-012**: `userLaunchSelection` / `userTeamLaunchSelection` (contracts) and the Settings rows' "recorded choice" reading remain; the server never sets them. The same copy-launch rule applies unsaved Settings edits, so removing it reshapes the Settings choice model that SR-039 kept unchanged. For the reviewer and the Solution Designer to place.
- **FU-011** (reviewer): `ChildRowsFeed` is one more process-wide owner (`getChildRowsFeed`); the composition follows the tree and binds the projection explicitly.
- **Designer commit `394bb81719`** (SR-039) also swept in some of my staged deletions at the time; the content is correct, the attribution is mixed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: structural replacement (no hosting anywhere), with one migration.
- Reviewed root-cause classification: hosting tied a delegated run's life to its top run (P6 violated).
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A` (the one open question, child rows' Settings, went to the designer as Unclear and came back as SR-039).
- Evidence: hosting files deleted (list in `implementation-revision-record.md`); production typecheck 0 errors.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (older tree files' `taskExecutions` are read as an unknown field and never written, contract E9; this is the tolerant-reader rule, not a dual path).
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes` (this round also removed the `taskExecutionIdentity` capability, `task-execution-identity-capabilities.ts`, `task-team-run-identity-factory.ts`, which had no consumer left).
- Dead code found elsewhere, added to `follow-ups.md`: FU-010 (names), FU-012 (recorded copy choice). FU-008 and FU-009 are withdrawn (done in this ticket, SR-041 / SR-040).
- Shared structures remain tight: `Yes`.
- Canonical shared design guidance reapplied: `Yes`.
- Size guardrails: `Yes` — no changed source file is over 500 non-empty lines; `agent-run-history-catalog-service.ts` (532 at base) was not grown (the archive/delete guard went into `agent-run-history-service.ts`). FU-002's two files are now 302 and 363 lines.

## Persisted Data Transition Check

- Approved decision: `Migration Required` (design DS-10).
- Design-spec reference: DS-10 steps 1 … 8, contract §6 E1 … E12.
- Implementation follows it without version-specific runtime fallback: `Yes`. Current services read the target shape only; historical shapes live in the migration and the frozen readers.
- Migration checks: `tests/app-data-migrations/delegated-runs-own-runs-v1/` plus the full-registry upgrade tests (`upgrade-paths/`), which now end in the 461 shape. The released migrations' own tests read their results through the frozen readers (`tests/fixtures/before-461-tree-fixtures.ts`, `tests/fixtures/app-data-migrations/released-message-log-views.ts`).

## Environment Or Dependency Notes

macOS (Darwin 25.5), Node 22, pnpm; server tests with vitest 4.1; no provider keys used; no user data touched (all fixtures in temp folders; the full-registry tests mock the app config to temp roots).

## Checks Run

Evidence files are in `evidence/implementation/`. Round 1 (IMP-01 … IMP-10) ran on `3c95473e1c`. Round 2 (IMP-11 … IMP-17) ran on `7a32bb8832`; the handoff commit adds the ticket documents and one integration fixture fix (IMP-16).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit` (server src) | `3c95473e1c` | macOS, Node 22 | all server src | all | Pass | `IMP-02-server-typecheck.log` | `server src (tsconfig.build.json): 0 errors` |
| IMP-02 | `node scripts/typecheck.mjs --update-baseline`, then `node scripts/typecheck.mjs` | `3c95473e1c` | macOS, Node 22 | src + tests | all | Pass | `IMP-02-server-typecheck.log` | `[typecheck] PASS`; baseline 1180 → 1016 over the ticket |
| IMP-03 | `pnpm test:unit` (server) | `3c95473e1c` | macOS, Node 22 | `tests/unit`, `tests/app-data-migrations`, `tests/architecture`, `tests/agent-work-journal` | all | Pass after IMP-10 | `IMP-03-server-unit.log` | `Tests  3 failed \| 7856 passed`: 2 in `root-recovery-command.test.ts` (fakes lacked `localChildren`, fixed in IMP-10), 1 folder-watcher timing flake (passes on rerun; module untouched) |
| IMP-04 | `pnpm test:integration` (server, after `test:integration:prepare`) | `3c95473e1c` | macOS, Node 22 | `tests/integration`, `*.integration.test.ts` | all | Pass apart from flakes | `IMP-04-server-integration.log` | `Tests  3 failed \| 479 passed`: all three are file-watcher timing tests (`file-explorer`, `agent-package-definitions`; no diff vs base); a different case fails on each rerun |
| IMP-05 | `pnpm -C autobyteus-web codegen:local`; `git diff --stat generated/graphql.ts` | `dbb688161e` | macOS | server schema → web types | REQ-009 Task page | Pass | `IMP-05-web-codegen.txt` | only `hostRoot` → `delegatingRun` changed |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `dbb688161e` | macOS | web app, Electron main, cross-package tests | REQ-009 | Pass | `IMP-06-web-typecheck.log` | `[typecheck] PASS` |
| IMP-07 | web specs: `composables/projects`, `projectRunsStore`, `projectLiveChanges`, `taskWorkerTaskStore`, `utils/projects`, `components/projects` | `dbb688161e` | macOS | Task root readers | REQ-009 | Pass | `IMP-07-web-specs.log` | `Tests  225 passed (225)` |
| IMP-08 | `python3 -I walkthrough.py --check ../../target-collaboration-contract.md` | `3c95473e1c` | macOS, Python 3 | the contract and its model | REQ-011, REQ-012 | Pass | `IMP-08-contract-model-check.txt` | `collaboration-walkthrough.md matches the model` |
| IMP-09 | `vitest run tests/unit/agent-collaboration/delegation/task-delegation.test.ts` (CM-6 folder case added) | `053dea1002` | macOS, Node 22 | `task-delegation.ts` | REQ-009 (CM-6) | Pass | (this row) | `Tests  12 passed (12)` |
| IMP-10 | `vitest run tests/unit/agent-execution/root-recovery-command.test.ts` | `2a5a15d27f` | macOS, Node 22 | team/org stream handlers with `localChildren` | DS-8 | Pass | `IMP-03-server-unit.log` (follow-up line) | `Tests  22 passed (22)` (with the watcher test) |
| IMP-11 | `node scripts/typecheck.mjs` (server src + tests, baseline gate) | `7a32bb8832` | macOS, Node 22 | all server src and tests | all | Pass | `IMP-11-server-typecheck.log` | `production errors: 0`; `[typecheck] PASS` at the baseline 1016 |
| IMP-12 | `pnpm test:unit` (server) | `7a32bb8832` | macOS, Node 22 | `tests/unit`, migrations, architecture, work journal | CR-461-001/003/004/005, SR-040 … SR-044 | Pass after rerun | `IMP-12-server-unit.log` | `Tests  3 failed \| 7882 passed`: all three `Test timed out in 5000ms` (two architecture scans, one released-migration test; none touched this round, the run overlapped the web checks); the three files alone: `Tests  35 passed (35)` |
| IMP-13 | `pnpm test` in `autobyteus-collaboration-stream-contracts` and `autobyteus-team-stream-contracts` | `7a32bb8832` | macOS, Node 22 | the two stream contracts (`CHILD_RUNS_CHANGED`, removed fields) | SR-041 … SR-044 | Pass | `IMP-13-contract-tests.log` | `# pass 41 / # fail 0`; `# pass 21 / # fail 0` |
| IMP-14 | `pnpm -C autobyteus-web codegen:local`; `pnpm -C autobyteus-web typecheck`; `guard:localization-boundary`; `audit:localization-literals` | `7a32bb8832` | macOS | web app, types from the server schema | SR-040 … SR-044 | Pass | `IMP-14-web-checks.log` | `0` type errors; `Passed.`; `Passed with zero unresolved findings.` |
| IMP-15 | web full spec suite `npx vitest run --no-watch`, then the failing files again | `7a32bb8832` (run started on the tree before the last spec fixes) | macOS | all web specs | SR-040 … SR-044 | Pass after rerun | `IMP-15-web-specs.log` | full run `7 failed \| 5631 passed` in 5 files, all five pass on rerun; one Org performance-bound test (5 s budget) timed out once while the server suite was loading the machine, and passes alone (778 ms) |
| IMP-16 | `pnpm test:integration` (server, after `test:integration:prepare`) | `7a32bb8832`; fix in the handoff commit | macOS, Node 22 | `tests/integration` | CR-461-004 (token store), stream handlers | Pass after a fixture fix | `IMP-16-server-integration.log` | `Tests  6 failed \| 477 passed`, all in `chat-socket-content-cadence.integration.test.ts` (delegated-agents stream): its fake standalone root had no `rootIdentity`, which `ChildRowsStreamSession` opens on (a real root always has one). Fixture given the identity; the file then `Tests  18 passed (18)` |
| IMP-17 | `python3 -I walkthrough.py --check ../../target-collaboration-contract.md` | `7a32bb8832` | macOS, Python 3 | the contract and its model | REQ-011, REQ-012 | Pass | `IMP-17-contract-model-check.txt` | `collaboration-walkthrough.md matches the model` |

- Not run, and why: server E2E suites (`pnpm test:e2e`, gated runtime suites), browser probes, the isolated desktop instance, and the contract's stories run against two server instances (design "Validation", the acceptance test) — owned by API/E2E. `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` needs a rewrite for the new model (Known Risks).

## Frontend Rendered-Result Check

- `Not run` in a browser this round. Round 2 changed web state and stream handling (the poll rule, `CHILD_RUNS_CHANGED`, removed closed-set handling) and two Memory templates (the task-team tag and the task-agent label are gone; a member chip keeps its standard border). Rows, selection and buttons keep their components and styles. Covered by specs (IMP-14, IMP-15); rendering in a real browser of the three views' live child rows is listed for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- A standalone run delegates (local agent, local team, peer agent): the child row appears live in the open view, shows its status and live output, stops on its own Stop; the delegator's Stop leaves it running; its report wakes the stopped delegator.
- Live child rows (SR-042 … SR-044) in each view kind with no reload: a new delegation, a closure (a child with another open Task stays), a reopen-and-continue, a Task deletion, a peer delegation; in the Team view a pending send and a pending tool approval survive; an open view of a stopped team run gets the change and the team stays stopped; a change racing a snapshot (connect while delegating).
- A closure racing a reopen or a follow-up assignment (CR-461-001), and a closure racing a new run's start (CR-461-003): the run stays / is not started.
- The history poll (SR-040): a stopped Project Task Manager whose delegated team works shows the team's live status within one poll, no view re-read per poll; a closed child leaves with one re-read.
- Team and org token totals include their delegated runs (CR-461-004).
- Task DONE: a run with no other open Task stops and leaves the view; reopen + the assigner's message continues it; a follow-up Task by run ID.
- Team and org delegators: same, plus a delegated team member reaching the assigning org's agents by address (§2.3 step 2) and the old-prefix correction.
- Settings on a child row (SR-039): agent child, team child's team row and member row; a running child → `COPY_RUNNING`; a partial failure → `PERSISTENCE_FAILED` naming the saved runs.
- Archive/delete while a child works → refused with the child named; afterwards succeeds and the child becomes a top-level row.
- Run list: a delegated run appears only under its delegator (or its Task's page), not twice.
- Projects page: the worker's live status updates; "open" lands in the delegating run's view with the worker selected.
- Update restart with busy delegated runs: bottom-up resume and the "runs you delegated were resumed" notice.
- Migration: a data root built from the contract's §6 shapes (never user data).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The contract's stories run against the server (design "Validation": the acceptance test), every case of contract §5 one test per case ID, TC-13 log location, the closure/reopen interleavings (AR-017).
- Rewrite `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` for the new model (delegated runs listed as their own runs), and the server E2E and web probe suites that still use the removed events and fields (`task_execution_started`, `TASK_EXECUTIONS_CLOSED`, `closed_task_executions`, `closedTaskExecutionsDigest`, …) for `CHILD_RUNS_CHANGED`.
- Browser check of the live child rows in the three views and of the Task page navigation.
