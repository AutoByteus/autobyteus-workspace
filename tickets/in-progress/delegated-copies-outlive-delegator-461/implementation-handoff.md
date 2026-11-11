# Implementation Handoff — autobyteus-461 (delegated runs are runs of their own)

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
Branch: `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` `827f1e68dc`.
Ticket folder: `tickets/in-progress/delegated-copies-outlive-delegator-461/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review was selected (passed ARCH-REV-014 on SR-039); this handoff goes to Code Review.
- Requirements doc: `requirements-doc.md`
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (through SR-039)
- Design spec: `design-spec.md` (DS-1 … DS-11; implementation order steps 1 … 10)
- Supplemental task artifacts: `target-collaboration-contract.md` (revision 8, the authority with its executable model), `evidence/collaboration-model/` (`model.py`, `stories.py`, `walkthrough.py`), `collaboration-walkthrough.md`, `evidence/data-model-validation/`
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: `N/A` (initial implementation handoff)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-018 … SR-039 (contract revisions 5 … 8; SR-037 own-definition refusal, SR-038 peer launches, SR-039 child rows' Settings)
- Related architecture-review revision IDs: ARCH-REV-005 … ARCH-REV-014
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

A delegated run (agent or team, local or on a peer) is now an ordinary run with its own root, idle shutdown, Stop and restart resume. Nothing hosts it. The delegation is stored once per side, under one name `delegatedFrom` (contract P2): on the Task entry (`agent_run_resources.json`, with `recipientAddress`, and `nodeId`/`members` for a peer's run) and on the delegated run's own file. The delegating run stores nothing about it; the in-memory `DelegationTree` (built from the Task entries) relates runs for messaging, views, token totals, restart and the run list. All hosting machinery was removed (registries of hosted copies, the shared root task lifecycle, closure fences and leases, launch editing on copy records, the standalone `collaboration_tree.json`, tree `taskExecutions`/`remoteTaskExecutions`, `taskAgent` readers, copy memory placements). One startup migration converts existing data.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: persistence (one migration over Task records, run files, trees, logs, busy-run record, history rows), ownership boundaries (no hosting anywhere), ordering (each run's own gate), shared contracts (Task entry, view DTOs of three run kinds, one GraphQL field). Net change about +9,300 / −29,900 lines across ~520 files.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (SR-039 was the last design question; answered and passed ARCH-REV-014)

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
| DS-8 (REQ-002, REQ-004, REQ-006) | A run's view: child rows from the Task entries with status and live output; child commands to the child's own run; connect never starts the host; a child's Settings change goes to the child's own save (SR-039) | `services/agent-streaming/delegated-children-dtos.ts`, `execution/delegation/delegated-run-commands.ts`, `execution/delegation/local-child-observation.ts` (new rows, closed rows, statuses and output while viewed), `run-history/services/delegated-launch-selection-service.ts` + `delegated-child-launches.ts` | Implemented. Live child output reuses the remote child's projection path (N-402). Gap: the history poll's statuses (FU-009) |
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

- New owners: `agent-collaboration/delegation/delegation-tree.ts` (+ `subscribe`), `execution/task/task-delegation.ts`, `execution/task/task-run-control.ts`, `execution/task/task-worker-status-notice.ts`, `execution/delegation/{delegated-run-starter,delegated-run-commands,delegated-child-locations,local-child-observation}.ts`, `communication/{cross-run-message-delivery,cross-run-address-resolution}.ts`, `run-history/services/{delegated-child-launches,top-level-run-rule,delegated-work-guard,closed-delegated-run-reader}.ts`, `run-history/store/{raw-tree-file,message-log-owners}.ts`.
- Migration: `app-data-migrations/migrations/delegated-runs-own-runs-v1/`; frozen released readers under `app-data-migrations/frozen/server/`.
- Roots: `standalone-agent-run-root/`, `agent-team-execution/domain/root-team-run.ts`, `agent-org-execution/domain/agent-org-run.ts`.
- Web: `autobyteus-web/{graphql/queries/projectTaskQueries.ts,types/project.ts,composables/projects/useTaskRootNavigation.ts,utils/projects/taskRootPresentation.ts,components/projects/ProjectTaskWorkers.vue,generated/graphql.ts}` and their specs.
- Docs: `autobyteus-server-ts/docs/design/collaboration_model.md`, `GLOSSARY.md`, `docs/modules/{standalone_agent_run_root,agent_team_execution,agent_orgs,agent_communication,projects,agent_memory,restart_resume,remote_collaboration,run_history,token_usage}.md`.

## Important Assumptions

- The contract (revision 8) and `model.py` are the authority; `walkthrough.py --check` is green on the final commit.
- The web stays unchanged except the Task root field the server renamed in step 1 (`hostRoot` → `delegatingRun`, design table at "`hostRoot` (Task entry)").
- A child row's live output uses the remote child's projection path (design DS-8 "through the path a remote child uses today (N-402)"); the local events are their own kinds (`local_child_*`) mapped in the three projectors.

## Known Risks

- **Migration on real data**: tested only on hand-built fixtures (never on user data, per `TESTING.md`). A delegated run whose stored `workspaceRootPath` is empty is preserved and reported, because the ordinary run reader requires a workspace.
- **Timing of the live child view**: `LocalChildObservation` re-reads a run's children on every `DelegationTree` change (deferred to a microtask, never inside the Task's ordered change). Not exercised in a real browser this round.
- **The memory-collaboration GraphQL E2E** (`tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`) still expects hosted `TASK_AGENT` rows in team/org trees; it was made type-correct only and needs the API/E2E round's rewrite.
- **History poll statuses** for runs that are not open are empty (FU-009).
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
- Dead code found elsewhere, added to `follow-ups.md`: FU-008 (hosting-only contract fields kept for the unchanged web), FU-010 (names).
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

Final results are filled in from the final run on the commit named in each row; evidence files are in `evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit` (server src) | see IMP-02 | macOS, Node 22 | all server src | all | Pass | `IMP-02-server-typecheck.log` | `server src (tsconfig.build.json): 0 errors` |
| IMP-02 | `node scripts/typecheck.mjs` (server gate, after `--update-baseline`) | FINAL | macOS, Node 22 | src + tests | all | FINAL | `IMP-02-server-typecheck.log` | `[typecheck] PASS` |
| IMP-03 | `pnpm test:unit` (server) | FINAL | macOS, Node 22 | `tests/unit`, `tests/app-data-migrations`, `tests/architecture`, `tests/agent-work-journal` | all | FINAL | `IMP-03-server-unit.log` (excerpt) | `Tests  … passed` |
| IMP-04 | `pnpm test:integration` (server, after `test:integration:prepare`) | FINAL | macOS, Node 22 | `tests/integration`, `*.integration.test.ts` | all | FINAL | `IMP-04-server-integration.log` (excerpt) | `Tests  … passed` |
| IMP-05 | `pnpm -C autobyteus-web codegen:local` then `git diff --stat generated/graphql.ts` | `dbb688161e` | macOS | server schema → web types | REQ-009 Task page | Pass | `IMP-05-web-codegen.txt` | only `hostRoot` → `delegatingRun` changed |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `dbb688161e` | macOS | web app, Electron main, cross-package tests | REQ-009 | Pass | `IMP-06-web-typecheck.log` | `[typecheck] PASS` |
| IMP-07 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run composables/projects stores/__tests__/{projectRunsStore,projectLiveChanges,taskWorkerTaskStore}.spec.ts utils/projects components/projects` | `dbb688161e` | macOS | Task root readers | REQ-009 | Pass | `IMP-07-web-specs.log` | `Tests  225 passed (225)` |
| IMP-08 | `python3 -I walkthrough.py --check ../../target-collaboration-contract.md` (in `evidence/collaboration-model/`) | FINAL | macOS, Python 3 | the contract and its model | REQ-011, REQ-012 | Pass | `IMP-08-contract-model-check.txt` | `collaboration-walkthrough.md matches the model` |

- Not run, and why: server E2E suites (`pnpm test:e2e`, gated runtime suites), browser probes, the isolated desktop instance, and the contract's stories run against two server instances (design "Validation", the acceptance test) — owned by API/E2E. `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` needs a rewrite for the new model (Known Risks).

## Frontend Rendered-Result Check

- `Not run` this round. The web's components are unchanged; the only web change is the Task root field rename (types, query, one composable, one util, one component binding) covered by IMP-05 … IMP-07. The live child rows (DS-8) produce the existing stream events the web already handles (`task_execution_started`, `task_executions_closed`, `agent_presentation`); their rendering in a real browser is not verified here and is listed for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- A standalone run delegates (local agent, local team, peer agent): the child row appears live in the open view, shows its status and live output, stops on its own Stop; the delegator's Stop leaves it running; its report wakes the stopped delegator.
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
- Rewrite `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` for the new model (delegated runs listed as their own runs).
- Browser check of the live child rows in the three views and of the Task page navigation.
