# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); passed at ARCH-REV-002 (SR-005), ARCH-REV-003 (SR-006) and ARCH-REV-005 (SR-008). Handoff rule: Large or High → Code Reviewer.
- Requirements doc: `tickets/in-progress/collaboration-tree-open-tasks-only-469/requirements-doc.md` (REQ-007 / AC-009 restated at SR-008)
- Investigation notes: `.../investigation-notes.md` (A-1 … A-8, B-1 … B-7)
- Solution revision record: `.../solution-revision-record.md` (SR-001 … SR-008)
- Design spec: `.../design-spec.md` (SR-008, commit `ebe9646c12`)
- Supplemental task artifacts: `evidence/links-without-task-2026-11-10.txt`, `evidence/unlink-cases-2026-11-10.txt`, `evidence/team-tab-messages-2026-11-10.txt`; `follow-ups.md`
- Design review report: `.../design-review-report.md` (ARCH-REV-005, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/`.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `tickets/in-progress/collaboration-tree-open-tasks-only-469/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 initial; IR-002: CR-003 per SR-009 and CR-002)
- Related solution revision IDs: SR-005 … SR-009 (two Design Impacts raised by this implementation and decided: SR-006 for D-1, U-008; SR-007 and SR-008 for D-3, AR-002)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006
- Related code-review revision IDs: CRR-001 (Pass; non-blocking CR-001 on `knowsRunId` naming, no action required), CRR-002 (failure-origin review of API/E2E round 1: CR-002, CR-003), CRR-003 (Pass of IR-002: CR-002 and CR-003 resolved; CR-001 non-blocking)
- Related API/E2E revision IDs: API-REV-001 (Fail: F-1 … F-3). Delivery: N/A
- Triggering finding IDs: CR-003 (F-3; Design Impact resolved by SR-009), CR-002 (F-2; Local Fix). F-1 is API/E2E-owned (DEC-011) and unchanged here.
- Code commits: `832f0a4572` (implementation and unit tests), `42652879b3` (integration-test updates), `fa48d74a3e` (IR-002: CR-003 and CR-002); documents and evidence are in the commit that carries this handoff

No top run stores a list of its local delegated runs. A tree read asks the Task side, through `OpenDelegatedRunSource` (bound by the composition after the Task records load), for the runs whose current Task entry names the top run and is open, whatever their start (SR-006). It composes each run from its own file into the root list, by start time then run ID. A save writes changed own files and a tree file that keeps its links to runs on another node. It leaves out a stored local entry only when the entry is an exact-key link and its run's own file exists; every other entry is kept unchanged and in place (SR-008). The startup validator and the history-index repair read a Team or Org run's own parts only (D-11).

In a loaded root, the release step drops a closed run once its stop is confirmed, and the reopen step adds it back from its own file, undone if the step fails (`TaskExecutionTreeMembership`). The Team tab, the Memory page and a standalone run's token total read closed runs through `ClosedDelegatedRunReader` and `CoordinatingRunPresence`. The web reloads a view for a "reopened" run it does not hold, and names a past participant from its address.

IR-002 (SR-009, D-8 for the Team root; CR-002):
- The Team stream's `TASK_EXECUTIONS_REOPENED` carries `executions: [{ parent_team_run_id, execution }]`. The Team adapter builds them from the loaded tree after the add-back (`taskExecutionsReopenedEvent(tree, references)`; the lookup is `agent-team-execution/domain/team-task-execution-lookup.ts`), and the projector maps them as for "started".
- The Team view inserts a record it does not hold (`insertTaskExecution`, with the effects "started" has), keeps one it holds, and removes every reopened execution from its closed list. The branch to `team_stream_recovery_required` is gone. The Agent-run and Org views keep reloading through their checkpoint.
- CR-002: `reloadRoot(kind, id, rebuild, holdsAgent)`. When a rebuild keeps a root's lists, a loaded list that names an agent the rebuilt view does not hold, and that its past participants do not name, loads again (its rows stay meanwhile; no message is missed or doubled).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation: the change crosses run storage, Projects, the task lifecycle, all three roots, GraphQL, a contract package and the web, and changes what tree files hold (persistence) as well as ordering inside the root's queue and persistence lock (concurrency).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: none open. The two that arose (U-008; data loss for entries an interrupted migration still needs) were decided at SR-006 and SR-008.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | A delegation writes the own file only; the Task entry exists before | `splitTaskExecutions` writes own files and remote links only (`run-history/store/task-execution-tree-split.ts`); activation unchanged | Done. Test: own-run store tests ("splits … into own files"), AC-009 store cases |
| BEH-002 | A closed run is stopped, then dropped from a loaded tree; a tree built later does not hold it | `RootTaskExecutionLifecycle.releaseTaskExecutions` → `TaskExecutionTreeMembership.dropStopped` → adapter `dropTaskExecutions` (three adapters) → `remove…TaskExecutions` (three mutators) → `RootCommunicationEngine.retainMessages`; compose from `openDelegatedRunsOf` | Done. Unconfirmed stop: kept, hidden. Release while the root no longer admits commands: no drop. Tests: membership, standalone root (AC-001), reactivation backends (three kinds) |
| BEH-003 | A load reads only the runs of open Tasks | `composeTreeFile(…, openRuns, …)`; message stores read the open runs' logs only | Done. Test: AC-010 read counts (three kinds) |
| BEH-004 (IR-002) | A run in the tree again reaches every client without a manual step (D-8) | Team: `taskExecutionsReopenedEvent(tree, refs)` → projector → `TASK_EXECUTIONS_REOPENED { executions }` → `teamExecutionViewState` inserts a record it does not hold; Agent run and Org: checkpoint reload | Done. Tests: contracts, projector (record equals "started"), web Team spec (a never-held run is inserted with no recovery effect) |
| BEH-004 | A reopen or a follow-up Task by run ID continues the run; it is in the tree again | `reactivateClosedTarget` / `assignToExistingCopy` → `inTreeAtHead` → `addAtHead` → adapter `addTaskExecution` (`readTaskExecution` from the own file); `knowsRunId` in each root's `hasAgentExecution`; `isDelegatedRun`, `teamCoordinatorOf` answer for closed copies; `resolveExistingCopy` covers closed copies | Done. Tests: reactivation backends (Agent and Team copy; three kinds), standalone existing-copy assignment, Team follow-up Task |
| BEH-005 (IR-002) | Team-tab names stay current after a view rebuild (CR-002) | `collaborationParticipantMessages.reloadRoot(…, holdsAgent)`; callers in `agentRunCollaborationStore.ts`, `agentOrgContextsStore.ts`, `TeamStreamingService.ts`, `teamRunHydrationCommit.ts`; `holdsAgent` on the Agent-run and Org contexts | Done. Test: participant store spec (re-fetch when the view drops a named agent; kept otherwise) |
| BEH-005 | Team tab: same rows and names | `isMessageOfView` / `messageViewOfTree` in the three message stores and the loaded roots; GraphQL `collaborationParticipantMessages` adds `pastParticipants` (`ClosedDelegatedRunReader`); web identity kind `past` | Done. Validators keep only the "one agent of this run" check. Tests: view-rule store case, reader test, contracts test, web store/rows spec, team-communication API integration |
| BEH-006 | Memory page lists a closed run while its coordinating run exists | `CoordinatingRunPresence` in `agent-memory-explorer-service.ts`, `task-team-root-memory-source.ts`; `TaskAgentLinkChecker` removed | Done. Tests: explorer task-agent cases (closed listed, detached not), memory discovery |
| BEH-007 | Token total, attachments, Team/Org load unchanged | Standalone total: tree agents + `ClosedDelegatedRunReader.agentRunIds`; attachments: view rule (U-006: readers do not filter); admission: `readOwnParts` | Done. Tests: reader test, admission test (AC-008 at admission level), context-file integration tests |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- New: `run-history/store/open-delegated-run-source.ts`, `run-history/store/coordinating-run-presence.ts`, `run-history/services/closed-delegated-run-reader.ts`, `agent-collaboration/execution/task/task-execution-tree-membership.ts`.
- Removed: `run-history/store/task-agent-link-check.ts`.
- Stores and compose/split: `run-history/store/task-execution-tree-split.ts`, `task-agent-own-records.ts` (compose from the own file alone; `isTaskExecutionLinkEntry` is now the exact-key test), `task-agent-own-files.ts` (`exists`), `remote-task-execution-links.ts` (D-12 debug), `run-execution-tree-shared-record-schemas.ts` (link parser removed), `team-run-execution-tree-store.ts`, `agent-org-run-execution-tree-store.ts`, `standalone-agent-run-root/persistence/standalone-root-package-store.ts`, `task-agent-message-logs.ts` (`isMessageOfView`).
- Task side: `projects/services/task-execution-resource-service.ts`, `projects/services/project-task-service.ts`, `agent-collaboration/execution/task/task-execution-resource-port.ts`, `compositions/project-task-execution-resource-composition.ts` (binds both the source and the closed-run reader's port).
- Lifecycle and roots: `root-task-execution-lifecycle.ts`, `root-task-execution-adapter.ts`, `existing-copy-target.ts`; the three adapters, mutators and persistence coordinators; `team-task-execution-service(.ts, -contract.ts)`; `root-communication-engine.ts`; `hasAgentExecution` in the three root files (in place).
- Admission and repair: `run-history/services/root-run-package-current-validator.ts`, `run-history/maintenance/collaboration-run-history-index-repair.ts`; validators: `team-run-state-package-validator.ts`, `agent-org-state-package-validator.ts`.
- Readers: `api/graphql/types/collaboration-participant-messages.ts`, `api/graphql/types/token-usage-stats.ts`, `agent-memory/services/agent-memory-explorer-service.ts`, `task-team-root-memory-source.ts`, message stores of Team and Org.
- Docs: `docs/design/collaboration_model.md`; `docs/modules/standalone_agent_run_root.md`, `agent_team_execution.md`, `agent_orgs.md`, `projects.md`, `agent_communication.md`, `agent_memory.md`.

Contracts: `autobyteus-collaboration-stream-contracts/src/collaboration-participant-messages-dtos.ts` and its rebuilt `dist/`.

Web (`autobyteus-web/`): `services/collaborationMessages/{collaborationParticipantMessages,participantMessagesQuery,participantMessageRows}.ts`, `types/workspace/collaborationMessagesContextView.ts`, the three contexts' "reopened" handlers (`agentRunCollaborationContext.ts`, `agentOrgExecutionContext.ts`, `teamExecutionViewState.ts`).

Tests: test sources in `tests/fixtures/open-delegated-run-sources.ts`. Root harnesses bind their Task-side double, the product's source. Fixture-only tests register their memory root with `openEveryOwnFileUnder`, which counts every run whose own file names the coordinating run as open. New test files: `tests/unit/projects/task-execution-open-delegated-runs.test.ts`, `tests/unit/run-history/store/open-delegated-run-trees.test.ts`, `tests/unit/agent-collaboration/task-execution-tree-membership.test.ts`, `tests/unit/run-history/services/closed-delegated-run-reader.test.ts`, `tests/unit/run-history/services/root-run-package-admission-own-parts.test.ts`.

## Important Assumptions

- **D-4, drop.** The release step drops a run only when its release result is `stopped` and the Task side still reports it closed. The drop goes through the root's tree commit, so it is ordered with saves.
  - Standalone and Org: `commitTreeMutation`. The store's save writes nothing unless the old tree file still holds links to drop, the first-save exception of REQ-001.
  - Team: `commitExecutionTreeMutation` with `requiresWrite: false`, which changes memory only.
- **Released authority.** It is discarded after the tree commit, not before, so a failed drop leaves the run with its authority.
- **View rule (3-argument form).** A message is in view when both its agents are in the tree, or one is an own agent of the top run. Over the logs that are read, this equals the design's 4-argument form (B-6).
- **Test source.** Fixture-only tests use "every own file open". The product source is the Task records, used by the root harnesses and by the Task-side tests.

## Known Risks

- **Messages from a stopped run.** A delegated run that left the tree is no longer an agent of the root. A message it sends is refused at identity authorization (`COLLABORATION_CONTEXT_REQUIRED`) instead of the Task-closed refusal. Only a run already stopped can be in that position (test: `task-delegation-tool-lifecycle.integration.test.ts`).
- **Repeated DONE.** After a confirmed stop, a repeated DONE invokes no release for runs that left the tree. The runs hold no authority; their result is `stopped`.
- **Inactive closed-set digest (autobyteus-435/446).** For an inactive run it is still computed from the Task index, while the stored view's closed list is now empty. The client re-reads a stopped run's view once per digest value (`agentRunCollaborationStore.ts:230-235`), so it drops the closed row once, as wanted. The digest and that view's closed list no longer match by design.
- **Wrong-kind run ID for a closed copy.** It now gets the field guidance (for example "use target_agent_run_id"), as a copy in the tree does. Before, a copy that never reached the tree got the generic "not one of your task agents".
- **Older build.** It cannot be used on the same data afterwards; the release notes must say so (design guidance).
- **Release-build gate.** `typecheck-baseline.json` and a contract package's `dist/` changed, so the fresh-start build (TESTING.md) applies before release. Not run here.
- **AC-008 full server start.** Not run here. Admission is covered at the readiness-index level with no source bound; the full start belongs to API/E2E.
- **IR-002:** the Team "reopened" payload is a changed shared contract (the team-stream contracts `dist/` is rebuilt; a build input). The server E2E helpers `task-existing-copy-assignment.e2e.test.ts` and `task-reactivation-root-visibility.e2e.test.ts` now read references from the records but were not run here.
- **Org configured-team lists.** Every local run of an Org now composes into the root list, so the per-configured-Team list is always empty in memory (FU-003).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor of a stored structure with a behavior change and a performance outcome
- Reviewed root-cause classification: Shared Structure Looseness
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes`, twice (U-008 → SR-006; D-3 data loss → SR-007/SR-008), both decided before continuing.
- Evidence / notes: the stored copy of the relationship is gone; the Task records are the one source.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The reader ignores every local entry. The save keeps entries that are not exact links with an own file without reading them, which is the approved D-3 rule, not a dual read.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed: `taskExecutionLinkOf`, the link types, `parseTaskExecutionLink`, `listTaskAgentRunIds`, `readOwnFileStates`, `withoutRemoteEntries`, `TaskAgentLinkChecker` (file), `refuseCopyOutsideTree`, the validators' endpoint loop, and the unused test helper `storedLocalLink`. `agentRunIdsOfTree` stays; `messageViewOfTree` uses it.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. `OpenDelegatedRun` is `{ run, started }`; `ClosedTaskExecution` is `{ execution, ingressAgentRunId }`; the past-participant DTO is `{ agentRunId, address }`.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`.
  - No changed source file is over 500 effective lines.
  - The files already over the limit did not grow: `root-team-run.ts` 500 → 500, `standalone-agent-run-root.ts` 495 → 495, `root-task-execution-lifecycle.ts` 494 → 492, web `teamExecutionViewState.ts` 499 → 499 (effective lines).
- Notes: lines were merged in place to keep those files from growing (FU-002).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"; D-3 (SR-008)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - An older tree file's local entries are ignored on read; the read writes nothing (AC-009, three kinds).
  - The first save leaves out exact-key links whose run has an own file and keeps full records and links without an own file unchanged and in place (three kinds).
  - An interrupted `20261017` migration still completes after a load and save in between: the existing F-RERUN-MSG test, and the AR-002 nested case.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, `pnpm -C autobyteus-server-ts test:integration:prepare` were run in this worktree.
- No user data was read, loaded, started or converted. All fixtures are small and hand-built in temp directories, or come from the existing released-shape fixtures.

## Checks Run

Evidence files are in `tickets/in-progress/collaboration-tree-open-tasks-only-469/evidence/`. All checks ran on macOS (darwin 25.5) with the workspace Node and pnpm, on 2026-11-10.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal --exclude "**/*.integration.test.ts"` (the `test:unit` set) | `832f0a4572` | All server source and unit/migration/architecture tests | BEH-001 … BEH-007; AC-001 … AC-012 (unit parts) | Pass | `IMP-01-server-unit-suite.txt` | `files: 988  tests: 8414  passed: 8405  failed: 0  skipped: 9` |
| IMP-02 | `node ./scripts/typecheck.mjs` (server gate) after `--update-baseline` | `832f0a4572` | Server `src` and tests | — | Pass | `IMP-02-server-typecheck.txt` | `[typecheck] PASS` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` | `832f0a4572` | Web app, Electron main, cross-package tests | — | Pass | `IMP-03-web-typecheck.txt` | `[typecheck] PASS` |
| IMP-04 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `832f0a4572` | DTO with `pastParticipants`; `dist/` rebuilt | BEH-005 | Pass | `IMP-04-contracts-tests.txt` | `# pass 50` / `# fail 0` |
| IMP-05 | `pnpm -C autobyteus-web exec vitest run services/collaborationMessages …Closure.spec.ts runHistoryTeamExecutionRowsClosure.spec.ts` | `832f0a4572` | Participant store, rows, three "reopened" handlers | BEH-004 (DS-R1), BEH-005 | Pass | `IMP-05-web-changed-specs.txt` | `Tests  33 passed (33)` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration .integration.test.ts` (after `test:integration:prepare`) | `42652879b3` | Server integration incl. Team manager, delegation lifecycle, context files, Team-tab API | BEH-002, BEH-004, BEH-005, BEH-007 | Pass | `IMP-06-server-integration.txt` | `files: 110  tests: 593  passed: 524  failed: 0  skipped: 69` |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt` | `42652879b3` | All web unit and component tests | BEH-005, DS-R1 | Pass | `IMP-07-web-nuxt.txt` | `Tests  5660 passed \| 2 skipped (5662)` |

| IMP-08 | `pnpm -C autobyteus-team-stream-contracts test` | `fa48d74a3e` | Team reopened payload with records; `dist/` rebuilt | BEH-004 | Pass | `IMP-08-team-stream-contracts.txt` | `# pass 22` / `# fail 0` |
| IMP-09 | Server unit suite (the `test:unit` set), then the three files fixed after it rerun | full run: IR-002 tree before two test fixes; rerun `fa48d74a3e` | All server code; Team event, projector, baseline normalization | BEH-004 | Pass | `IMP-09-server-unit-suite-ir002.txt` | full run `failed: 2` (both explained in the file), rerun `Tests  23 passed (23)` |
| IMP-10 | `pnpm -C autobyteus-web test:nuxt`, then the failed spec and the changed specs rerun | full run: before one spec fix; rerun `fa48d74a3e` | Team view handler, participant store, callers | BEH-004, BEH-005 | Pass | `IMP-10-web-ir002.txt` | full run `1 failed \| 5661 passed`, rerun `Tests  55 passed (55)` |
| IMP-11 | Server and web type-check gates | `fa48d74a3e` | All | — | Pass | `IMP-11-typechecks-ir002.txt` | `[typecheck] PASS` (both) |

- IMP-01 … IMP-07 ran on IR-001 (`832f0a4572` / `42652879b3`). IR-002 changes the Team event, its projector and adapter, the Team web view and the participant store. IMP-06 (server integration) was not rerun: none of its tests asserts the Team reopened payload, and the two server E2E helpers that read it were adapted but not run (API/E2E).
- Not run, and why:
  - Server E2E (`pnpm test:e2e`), browser probes and the isolated desktop instance (AC-001 … AC-012 on an isolated instance; AC-008 full server start; AC-011 rendered Team tab): left to API/E2E.
  - Fresh-start build: a build input changed (`typecheck-baseline.json`, contract `dist/`); it needs a release-runner-like clean clone. Left to delivery.
  - Gated live suites: not needed; no provider behavior changed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - The Team tab names a message's counterpart from a run that left the tree. The label rule is unchanged (`memberDisplayName` of the address), and the details panel shows its address and run ID.
  - A view reloads when a "reopened" event names a run it does not hold.
- Approved references: requirements "UI, Interaction, And Experience Requirements": no visible change (DEC-001).
- Existing design system and adjacent surfaces reviewed: `CollaborationMessagesPanel.vue` (`counterpart.kind === 'delegated'` adds host and execution lines; a `past` counterpart shows address and run ID only), `participantMessageRows.ts`, the three contexts.
- Rendered surface used: none. Rendering the Team tab for a closed run needs a running server with a delegated run whose Task closed (an isolated instance). No web fixture page covers it.
- States inspected: by component logic tests only (IMP-05): a row for a past participant has label `solution designer` from `/solution_designer`; reopened-unknown returns `checkpoint_required` or team stream recovery.
- Visual or interaction issues found and corrected: none found.
- Limitations: rendered verification not done here. The label is produced by the same function as before and no markup changed, but AC-011's rendered check remains for the isolated instance in API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001 / AC-002 / AC-003 on an isolated instance, for each root kind.** Delegate, close the Task, confirm the run is gone from the tree and from the top run's tree file (once saved). Reopen, message the run by its run ID, and see it listed again in the web without a manual reload (D-8). Give a follow-up Task by run ID.
- **AC-005.** A temporary Task left open; a run with no Task record in a hand-built tree file; a damaged `agent_run_resources.json` (the warning names the Task; the run is absent until the record is readable and the server restarts).
- **AC-008.** A server start on a test-owned data root with a Team run and an Org run whose tree files list local runs: both are admitted, load and work.
- **AC-010.** A file-read count on load with closed and open runs.
- **AC-011.** The Team tab of a top run's own agent before and after a closure and after a restart: the same rows and names, and attachments open.
- **AC-012.** The Memory page after a closure: the closed run is listed and opens.
- **AC-009 (upgrade).** A tree file of an older build with every inventory shape; after a load and save only remote links, full records and links without an own file remain.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Everything listed under "Not run, and why", in particular the isolated-instance journeys for AC-001 … AC-012 and the AC-008 server start.
