# Implementation Revision Record — autobyteus-461

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `design-spec.md` (DS-1 … DS-11), contract revision 8; initial implementation | N/A | `Initial Baseline` | SR-018 … SR-039, ARCH-REV-005 … ARCH-REV-014 | Implemented; handed to Code Review |
| IR-002 | Code Reviewer CRR-002/003 (`code-review-report.md`), Solution Designer SR-040 … SR-044; round 2 | CR-461-001, CR-461-002 (as SR-040), CR-461-003, CR-461-004, CR-461-005 | `Local Fix` (001, 003, 004, 005); `Design Impact` answered by SR-040 … SR-044 (002) | SR-040 … SR-044, ARCH-REV-015 … ARCH-REV-019, CRR-002 … CRR-004 | Implemented; targeted re-review by Code Review |
| IR-003 | Code Reviewer CRR-005 (`code-review-report.md`, round 2 Full Re-Audit), Solution Designer SR-045 … SR-053; round 3 | CR-461-001 (residual), CR-461-005 (residual), CR-461-006 (as SR-045/046/048), CR-461-007; FU-011 narrowed into this ticket (SR-047) | `Local Fix` (001 residual, 005 residual, 007); `Design Impact` answered by SR-045 … SR-053 (006, Principle 16) | SR-045 … SR-053 (SR-050/051 replaced by SR-052), ARCH-REV-020 … ARCH-REV-028, CRR-005 | Implemented; targeted re-review by Code Review |
| IR-004 | Code Reviewer CRR-006 (`code-review-report.md` "Round 3", Full Re-Audit of IR-003); round 4 | CR-461-008 | `Local Fix` | CRR-006 | Implemented; targeted re-review by Code Review |
| IR-005 | Code Reviewer CRR-008 (failure-origin review of API/E2E round 1), Solution Designer SR-054; round 5 | CR-461-009, CR-461-010, CR-461-011 | `Local Fix` (CR-461-012/013 were Requirement Gaps, answered by SR-054 with no code change) | SR-054, CRR-008 | Implemented; targeted re-review by Code Review, then API/E2E |
| IR-006 | Code Reviewer CRR-009 (`code-review-report.md` "Round 5", Full Re-Audit of IR-005); round 6 | CR-461-014, CR-461-015 | `Local Fix` | CRR-009 | Implemented; targeted re-review by Code Review, then API/E2E |
| IR-007 | Code Reviewer CRR-010 (`code-review-report.md` "Round 6", Targeted Delta Review of IR-006); round 7 | CR-461-016 | `Local Fix` | CRR-010 | Implemented; targeted re-review by Code Review, then API/E2E |
| IR-008 | Code Reviewer CRR-012 (failure-origin review of API/E2E round 2, `d7f8b02773`), routed by the Solution Designer with SR-055, SR-056; round 8 | CR-461-017, CR-461-018, CR-461-019, CR-461-020; CR-461-021 (as SR-055/056) | `Local Fix` (017 … 020); `Design Impact` answered by SR-055, SR-056 (021) | SR-055, SR-056, ARCH-REV-030, ARCH-REV-031, CRR-011, CRR-012 | Implemented; targeted re-review by Code Review, then API/E2E |
| IR-009 | Code Reviewer CRR-013 (`code-review-report.md` "Round 8", Full Review of the whole change at IR-008), routed by the Solution Designer with SR-057; round 9 | CR-461-022, CR-461-023, CR-461-024, CR-461-025, CR-461-026; CR-461-027 (as SR-057) | `Local Fix` (022 … 026); `Design Impact` answered by SR-057 (027) | SR-057, ARCH-REV-032, CRR-013 | Implemented; targeted re-review by Code Review, then API/E2E |
| IR-010 | Code Reviewer CRR-014 (`code-review-report.md` "Round 9", Full Re-Audit of IR-009); round 10; with the user's request to merge the remote base | CR-461-028, CR-461-029 | `Local Fix` | CRR-014, CRR-015 | Implemented; merged with `origin/personal`; Code Review Pass (CRR-015), then API/E2E |

## Revision Entries

### IR-001 — Delegated runs are runs of their own; hosting removed; one migration

- Triggering role, report path, and round: Solution Designer, `design-spec.md` with `target-collaboration-contract.md` revision 8 and `evidence/collaboration-model/model.py`; ARCH-REV-014 pass on SR-039. Round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented on `codex/delegated-copies-outlive-delegator-461` (commits from `f7bc67d248`, step 1d, through the final commit named in the handoff).
- Related solution revision IDs: SR-018 … SR-039 (notably SR-036 old-address correction, SR-037 own-definition refusal, SR-038 peer launches read from the peer, SR-039 child rows' Settings go to each child's own save)
- Related architecture-review revision IDs: ARCH-REV-005 … ARCH-REV-014
- Related code-review / API-E2E / delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-012; DS-1 … DS-11; contract P1 … P8, TC-1 … TC-13, E1 … E12.
- Implementation delta (by design step):
  1. Data model and the Task side: `delegatedFrom` on Task entries and on runs, `subWork`, `recipientAddress` on every entry, peer `nodeId`/`members`; `DelegationTree` (+ `subscribe` for views); migration `20261111_delegated_runs_own_runs_v1` (DS-10).
  2. `DelegatedRunStarter` (from the peer path); the two idle shutdowns generalized to every delegated run (DS-7).
  3. `TaskDelegation` for all three root kinds (`toNewRun`, `toPeerRun`, `toExistingRun`) (DS-1, DS-6).
  4. `CrossRunMessageDelivery`, the router's cross-run path, address step 2 and the old-address correction (DS-2, DS-3).
  5. Task closure, reopen and deletion by the run's own identity (`TaskRunControl`) (DS-5).
  6. Stop of each root kind: own parts only (DS-4).
  7. Views: child rows from the Task entries (`delegated-children-dtos.ts`), child commands to the child's own run (`DelegatedRunCommands`), connect never starts the host, Settings/Stop on child rows through each child's own save (SR-039), and this round the live part: `LocalChildObservation` (new rows, closed rows, statuses and output while viewed) (DS-8); web: `TaskRoot.delegatingRun`.
  8. Restart resume bottom-up along `delegatedFrom`; places `host`/`member` only (DS-9).
  9. Removal of the hosting machinery (63 source files deleted; see below) and of the removed fields' code; this round also the unused `taskExecutionIdentity` capability.
  10. Documents: `collaboration_model.md`, `GLOSSARY.md`, ten module docs.
  - Also: DS-11 run-list rule (`top-level-run-rule.ts`), REQ-007 archive/delete guard (`delegated-work-guard.ts`), the Task worker status notice (`task-worker-status-notice.ts`, restoring live worker status on the Projects page).
- Changed files or areas: see the handoff's Key Files. Deleted source (hosting only): copy registries (`task-agent-execution-registry`, `task-team-execution-registry`, `task-team-execution-factory`), the shared root task lifecycle and its queue, scope, adapters and publication helpers, closure fence and leases, `task-execution-tree-split`, `coordinating-tree-shapes`, `remote-task-execution-links`, `open-delegated-run-source`, `task-agent-own-*`, `task-agent-message-logs`, `task-agent-team-tree*`, launch-selection command and stop set, `task-team-root-memory-source`, `standalone-root-tree*`, `standalone-root-location-service`, `task-execution-identity-capabilities`, `task-team-run-identity-factory`, and others listed by `git diff --name-status 827f1e68dc HEAD -- autobyteus-server-ts/src | grep ^D`.
- Deleted tests (60 files), with the reason: each tested hosting-only behavior that no longer exists — a root hosting, idling, waking, fencing, re-leasing, publishing or stopping its copies; copy records, copy launch selection and copy sources; hosted-copy memory placements and own-file stores; the closed-set projection; the standalone tree's containment and location service; the native compaction root tests that drove a hosted stopped copy through its root (`native-compaction-root*`, `native-root-*`; native recovery stays covered by `tests/unit/agent-execution/agent-run-compaction-recovery.test.ts` and `root-recovery-command.test.ts`); the identity-capability test. Behavior that is preserved was re-tested at its new owner (for example `task-delegation.test.ts` CM-6 folder case, `delegated-child-launches.test.ts`, `local-child-observation.test.ts`, `task-worker-status-notice.test.ts`, `delegated-run-listing-and-guard.test.ts`, the restart-resume tests).
- Test adaptations this round: released migrations' tests read their results through the frozen readers and seed the pre-461 shape (`tests/fixtures/before-461-tree-fixtures.ts`, `tests/fixtures/app-data-migrations/released-message-log-views.ts`); registry-order tests include `20261111`; full-registry upgrade tests assert the 461 final state; integration fixtures write delegated runs as runs of their own.
- Local validation and result: see the handoff's Checks Run (IMP-01 … IMP-08).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: FU-008 (hosting-only contract fields kept for the unchanged web), FU-009 (history poll statuses of children), FU-010 (names); `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` needs the API/E2E rewrite; the live child view is not browser-checked; the migration is fixture-tested only.

### IR-002 — Code review Local Fixes; the history poll from the view's projection; live child rows; hosting-only fields removed

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-002, corrected by CRR-003: CR-461-002 is a Design Impact); Solution Designer, `solution-revision-record.md` SR-040 … SR-044 (ARCH-REV-019 pass). Round 2.
- Triggering finding IDs: CR-461-001, CR-461-002, CR-461-003, CR-461-004, CR-461-005.
- Classification: `Local Fix` for CR-461-001, -003, -004, -005; CR-461-002 was routed as `Design Impact` and came back as SR-040 … SR-044.
- Prior authoritative result: IR-001 at `3c95473e1c` (+ IMP-09/10 test-only commits).
- Current authoritative result: commits `96921d79f0` (CR-461-001), `c29ad8b104` (CR-461-003, -004), `f01c75e686` (CR-461-005), `ddf2a9e922` and `29fe973974` (SR-040/041 poll), `fc2be1fc89` (SR-041 … SR-044 server and contracts), `7a32bb8832` (web and docs), and the handoff commit.
- Related solution revision IDs: SR-040 (poll from the view's projection), SR-041 (no digest; every hosting-only field and event removed; the tree keeps each run's agents with addresses), SR-042 (live child rows), SR-043 (the payload carries the rows; Team applies in place), SR-044 (unsequenced, idempotent, ordered by the stream session).
- Related architecture-review revision IDs: ARCH-REV-015 … ARCH-REV-019.
- Related code-review revision IDs: CRR-002, CRR-003, CRR-004.
- Approved behavior or requirement IDs affected: DS-1, DS-5, DS-6, DS-8; REQ-002, REQ-004, REQ-005, REQ-009 (token totals, preserved poll).
- Implementation delta:
  - **CR-461-001 (closure stop vs reopen/assignment).** `TaskRunControl.stopForTaskClosure` passes `stillClosed = () => !tasks.isOpen(run)` to the run's own service; the root checks it synchronously right before its gate closes (standalone `stopForTaskClosure` → `stop()`, team `terminateTeamRunForTaskClosure` → `terminate()`, both close the gate before their first await). Outcomes `stopped | kept_open | not_stopped`; `kept_open` logs `TASK_AGENT_RESOURCE_NOT_CLOSED` and records no `terminatedAt`. Files: `task-run-control.ts`, `standalone-run-ports.ts`, `standalone-agent-run-root.ts`, root manager, `agent-run-service.ts`, `team-run-service.ts`, `agent-team-run-manager.ts`, `task-execution-resource-release.ts`.
  - **CR-461-003 (closure during a new run's start).** `WorkPacket.assertAllowed()` and `acceptWorkPacketIfAllowed` run at the head of the new run's gate (standalone operation gate; team materialization gate). A refusal makes `TaskDelegation` discard the run: "The Task was marked DONE or CANCELLED; its new work was not started." Files: `task-delegation.ts`, standalone root delivery, `root-team-run.ts`.
  - **CR-461-004 (team and org totals).** `TokenUsageRunStore.getTeamRunSummary(rootTeamRunId, delegatedAgentRunIds)` and `buildTeamRunTokenUsageSummaryFromRecords`; the resolver asks `DelegatedRunAgentsReader` (renamed from `ClosedDelegatedRunReader`) for the runs delegated from the team or org, recursively. `docs/modules/token_usage.md` updated.
  - **CR-461-005 (dead exports).** Removed the listed exports and `resetProjectTaskServiceForTests` (tests use the public release; 8 tests the first commit missed were fixed in the SR-042 commit); the org stop comment fixed.
  - **SR-040/041 (the history poll).** Server: every listed run answers `{ runId, isActive, statuses }`, statuses for every agent of its open local children from each child's own run, else `offline`; addresses from `DelegationTree.agentsOf` (kept per run, read once from the run's own file; a peer's run from its entry). Web: one rule for every hub: re-read the view when the active state or the local children (ID and address) differ, once per distinct answer; otherwise, and for an answer already re-read for, apply the statuses.
  - **SR-042 … SR-044 (live child rows).** `DelegationTree.entriesChanged` reports, after updating itself, each run whose open children changed (`subscribeChildRows`). `ChildRowsFeed` (`agent-collaboration/delegation/child-rows-feed.ts`) builds the added rows with the views' projection (bound by `composeTaskDelegation`: a local run's own file; a peer's run from its link) and publishes in reported order to the run's open stream sessions only. `ChildRowsStreamSession` (`services/agent-streaming/child-rows-stream-session.ts`) opens on the feed before the snapshot reads the tree, holds events published meanwhile and flushes them after the snapshot in order. Contracts: `CHILD_RUNS_CHANGED` (team stream, `{run_id, added, removed}`) and `CHILD_RUNS_CHANGED` on the collaboration stream carrying `{kind: "child_runs_changed", run_id, added, removed}` — a message type of its own because a `ROOT_EXECUTION_EVENT` requires a `change_sequence`. Web: Team applies in place by membership (`teamChildRunsChange.ts`; focus hand-back; no recovery); Agent-run and Org contexts answer `checkpoint_required` unless the change is already in the view. `LocalChildObservation` keeps only children's output and statuses (addresses from the tree); `RemoteRunObservation.linkCommitted` no longer announces rows.
  - **SR-041 removals.** Contracts, server and web: `closedTaskExecutionsDigest`, `closed_task_executions` / `closedTaskExecutions`, `task_execution_started` / `TASK_EXECUTION_STARTED`, `task_executions_closed` / `TASK_EXECUTIONS_CLOSED`, `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED`, `remote_task_execution_started` / `REMOTE_TASK_EXECUTION_STARTED`, `delegated_launch_selections_changed` / `DELEGATED_LAUNCH_SELECTIONS_CHANGED`; the Memory explorer's `isTaskTeam`, `startedByAgentName`, `TASK_AGENT`, `TASK_TEAM_MEMBER` (and the web's task-team tag and task-agent label). Web code that only served them went too: `utils/collaboration/taskExecutionClosure.ts`, `recordDelegatedLaunchSelections`, `isTaskExecutionRowListed`, `getClosedTaskExecutions`, the Org `isListed` filter, `addContextsForNewAgents`, `isRemoteExecutionKnown`, `teamTreeWalk` / `teamTreeRunKeys`.
- Tests added or rewritten: `task-run-control.test.ts` (both race orders, follow-up assignment), `standalone-agent-run-root.test.ts`, `agent-team-run-manager-lifecycle.test.ts`, `task-delegation.test.ts` (agent and team interleaved), `token-usage-store.integration.test.ts`, `team-run-token-usage-rollup.test.ts`, `delegation-tree-agents.test.ts`, `delegation-tree-child-rows.test.ts`, `child-rows-feed.test.ts` (FIFO hold, each once), the three stream handler tests (per view kind, racing snapshot, stopped host/team), `agent-run-collaboration-statuses.test.ts`; contracts `child-runs-changed.test.mjs`, `team-child-runs-changed.test.mjs`; web `agentRunCollaborationListedStatuses.spec.ts`, `agentRunCollaborationChildRuns.spec.ts`, `teamExecutionViewState.spec.ts` (SR-043/044 block), the streaming services' reload tests.
- Deleted tests, with the reason: the closed-set specs (`agentRunCollaborationClosure`, `agentOrgClosure`, `runHistoryTeamExecutionRowsClosure`, `agentRunCollaborationStoreClosure`, `taskExecutionClosure`, contracts `closed-task-executions-digest`), whose behavior no longer exists; their surviving cases (rows listed, a selected child leaving, focus hand-back) are re-tested in the child-row specs.
- Local validation and result: see the handoff's Checks Run (IMP-11 …).
- Next recipient or routing: Code Reviewer (Large / High), targeted re-review.
- Remaining limitations or risks: FU-012 (the recorded copy choice `userLaunchSelection` still in the contracts and Settings rows); the agent-run web client closes its stream for a stopped host (pre-existing), so a stopped standalone delegator's rows follow the poll (SR-040), not the live event; e2e suites not rewritten (API/E2E).

### IR-003 — Code review Local Fixes; a view's stream lives with the open view; owners passed in from one composition root; roots don't delegate; the application host composes the same steps

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` round 2 (CRR-005, Full Re-Audit of IR-002); Solution Designer, `solution-revision-record.md` SR-045 … SR-053 (ARCH-REV-020 … ARCH-REV-028). Round 3.
- Triggering finding IDs: CR-461-001 (residual), CR-461-005 (residual), CR-461-006 (answered by SR-045, SR-046, SR-048), CR-461-007; FU-011's seven bindings this ticket added (SR-047, Principle 16 as amended).
- Classification: `Local Fix` for CR-461-001 residual, CR-461-005 residual and CR-461-007; CR-461-006 came back as SR-045/046/048 (`Design Impact`); SR-047 … SR-053 are design revisions, three of them answering cycles and a question I raised (SR-049, SR-053; SR-050 → SR-051 → SR-052).
- Prior authoritative result: IR-002 at `7a32bb8832` (+ handoff commit `85dc7572d7`).
- Current authoritative result: commits `3636b9e2dc` (CR-461-007, CR-461-005), `812ff29b54` (CR-461-001 residual), `e77d4f2faf` (SR-046 server), `54858f3134` (SR-045 agent-run and Org web), `ebff30f833` (SR-045 Team web, SR-048 server order), `5df490f7d9` (ARCH-REV-022: a Task change with no entries listener fails before it writes), `dc4f73f5d5` (SR-047, SR-049, SR-052, SR-053), `4a3f221c72` (SR-048 web test, stale comments, web doc), `296ad69b43` (a web test's typing, found by the web type gate), and the handoff commit.
- Related solution revision IDs: SR-045 (stream lives with the open view), SR-046 (stored and live view sessions), SR-047 (owners passed in from one composition root), SR-048 (restore → live → post), SR-049 (roots don't delegate; the tool path runs `TaskDelegation`), SR-052 (the application host composes the same steps 1–8; replaces SR-050/051), SR-053 (narrow `RunTaskRecords` port).
- Related architecture-review revision IDs: ARCH-REV-020 … ARCH-REV-028 (ARCH-REV-022's two corrections and ARCH-REV-027's note applied).
- Related code-review revision IDs: CRR-005.
- Approved behavior or requirement IDs affected: DS-1, DS-5, DS-8; REQ-002, REQ-004, REQ-005, REQ-006; SCN-005 / AC-007; contract §2.3, §2.4.
- Implementation delta:
  - **CR-461-007.** The recorded copy choice is gone: `userLaunchSelection` / `userTeamLaunchSelection` and their schemas from both stream contracts (src and the tracked dist), and their web readers (`agentOrgRunConfigAdoption.ts`, Settings rows); a child row's launch is its own run's. FU-012 withdrawn.
  - **CR-461-005 residual.** `getRuntimeMemberContexts` and `mergePricingSummariesForRecords` removed.
  - **CR-461-001 residual.** A delivery that meets a run in a closure stop waits for that stop, then restores the run (`collaboration-root-resolver.ts`; the standalone root manager waits for a stop in progress); tests for agent and team (`closure-stop-during-delivery*.test.ts`).
  - **SR-046 (server).** `TeamViewSession` / `OrgViewSession`: stored mode (snapshot from the stored file through the same projection, lifecycle stopped, children's output numbered by the session) and live mode; the session follows the run's registration and sends one in-band snapshot per switch. Opening a view never restores the run. An interrupt or tool approval for a member of a stopped run is refused; a message to its own member restores it.
  - **SR-048.** The team handler restores the run, `await view.showCurrentMode()` (the switch to live, in the session's order), then posts the message, so its `MEMBER_INPUT_MESSAGE` echo is a live event after the snapshot.
  - **SR-045 (web).** Agent-run, Org and Team views keep their stream while the run is selected, active or stopped; a snapshot of a stopped run does not end the stream; a stopped run's message, interrupt and approval go over the stream (the restore mutations `RestoreAgentOrgRun`, `RestoreAgentTeamRun` and the client restore/hydrate paths removed); Stop keeps the stream and stops only the run's own members. The phone shell uses the same composable and stores (`useAgentRunCollaborationSync`).
  - **ARCH-REV-022.** `TaskExecutionResourceService.requireEntriesListener()` throws `TASK_ENTRIES_LISTENER_UNSET` before a Task write when no listener is set; the stream session registry (`ChildRowsStreams`) is its own owner, created before `ChildRowsFeed` and the three stream handlers.
  - **SR-047 / SR-052 (composition root).** `compositions/collaboration-composition.ts`: `composeTaskSide` (steps 1–2) and `composeCollaboration` (steps 4–8, released in reverse order), called by the studio (`build-studio-server.ts`) and the standalone application host (`start-standalone-application-host.ts`, which passes `remoteChannel: () => null`, its real equivalent, ARCH-REV-027). Removed: `delegation-tree-binding.ts`, `task-delegation-binding.ts`, `project-task-execution-resource-composition.ts`, `task-delegation-composition.ts`, `child-rows-feed-composition.ts`, the cross-run bind/find exports, `TaskRunControl.statusChanged` and its binding, `task-delegation-tool-run-router.ts`. Owners receive the tree, the Task records and their collaborators through constructors (roots, managers, history and projection services, `DelegatedChildLocations`, `createDelegatedChildLaunches`, location services, `RunLastActivityReader`, `top-level-run-rule`, REST context files, restart resume, the application runtime and scope kernel). New owners: `ChildRowsStreams`, `LocalChildFollowers` (follow a live root's children, ref-counted per root; follow a stopped run's children for one view; statuses), `RunViewChildren` (a view's rows, peer rows, statuses), `DelegatedWorkGuard` (class), `createRunTaskRecords`.
  - **SR-049.** A root answers `delegationSource(caller)` in its gate (its own refusals, the sender, the delegator address, placement, the peer-link record); `TaskDelegationToolService({delegation, remote})` runs `TaskDelegation.toNewRun` / `toExistingRun` or `RemoteDelegation.delegate`. `MemberTaskCapability` carries `delegationSource`; the three capability builders follow.
  - **SR-053.** The run services take `RunTaskRecords` = `{isOpen, statusChanged}` (from step 1's records and the Task change marks); `TaskWorkerStatusNotice(run, taskRecords)`; `ProjectTaskService` is created at step 5 with `TaskRunControl` passed in. No root uses the full port beyond these two calls.
  - **Docs.** `docs/modules/projects.md` (composition, `RunTaskRecords`), `docs/design/agent_websocket_streaming_protocol.md` (child-row source; "A view's stream lives with the open view"), web `docs/agent_execution_architecture.md` (Team/Org stream lifetime; continuation over the stream).
- Departures and choices made during implementation (each also in the handoff):
  1. `LocalChildFollowers` was moved out of the roots: the roots needed the followers' ports and the ports needed the roots (a real cycle). A live root now only publishes `publishLocalChildEvent(event)` to its viewers; the followers are composed at step 7 and passed to the view sessions.
  2. Older singletons that this ticket's owners are read through (tool service, router, dispatcher, history and projection services) keep a getter for their older callers, set by the composition (`setProcess…`) and throwing when unset; their callers are FU-011's remainder. The MCP providers and the `send_message_to` tool read the getter at use, not at construction.
  3. The application-host lifecycle test mocks steps 4–8 (its run services are mocks); a new test runs the host start with the real steps 1–8 over fake run services.
  4. The token capturer's dead agent-root branch was removed (no agent root reaches it since IR-001), not recorded as a follow-up.
  5. Result catalogue M-30 (`delegateThrough`'s text) withdrawn with `delegateThrough`.
- Tests added or rewritten: `team-view-session` / `org-view-session` behavior in the team and org handler tests (stored mode, refusals, one in-band snapshot, SR-048 order); `closure-stop-during-delivery*.test.ts`; `task-execution-resource-service` "a Task change with no entries listener set fails before it writes"; SR-052 `application-owned-member-delegation.test.ts` (base texts) and `standalone-application-host-delegation.test.ts`; web `TeamStreamingService.spec.ts` SR-048 residual, the stores' SR-045 tests (`agentRunCollaborationStore`, `agentTeamRunStore`, Org composer and recovery specs). Test helpers: `tests/helpers/no-delegations.ts`, `task-run-resources.ts`, `studio-reads.ts`, `task-side-binding.ts` (`testTaskSide`), `child-rows-feed.ts`; about 50 constructions now receive their owners.
- Deleted tests, with the reason: `task-delegation-tool-run-router.test.ts` (the router is gone; the tool service's path is tested through `testTaskSide` and the SR-052 tests); the client restore specs whose mutations were removed (their surviving cases restated over the stream).
- Local validation and result: see the handoff's Checks Run (IMP-18 …).
- Next recipient or routing: Code Reviewer (Large / High), targeted re-review.
- Remaining limitations or risks: FU-011's remainder (older getters listed in the handoff); the views' stream lifetime and live child rows are not checked in a real browser; e2e suites not rewritten (API/E2E).

### IR-004 — Code this change replaced removed (CR-461-008)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` "Round 3" (CRR-006, Full Re-Audit of IR-003 at `e5e0884e45`). Round 4.
- Triggering finding IDs: CR-461-008.
- Classification: `Local Fix`; Large / High unchanged, so it returns to Code Review.
- Prior authoritative result: IR-003 at `e5e0884e45`.
- Current authoritative result: commit `a54e78ccb7`, and the handoff commit.
- Related solution / architecture-review revision IDs: N/A (no design change).
- Related code-review revision IDs: CRR-006.
- Approved behavior or requirement IDs affected: none changed; SR-045/046 (a stopped run is restored by a message on its view's stream) is now the only restore path for a team or org run.
- Implementation delta:
  - `agent-communication/services/global-agent-run-message-router.ts`: `static instance`, `setProcessInstance`, `getInstance` and `getGlobalAgentRunMessageRouter` removed (never read).
  - `compositions/collaboration-composition.ts`: the router is created for the dispatcher (`SendMessageToDispatcher({ globalRouter: new GlobalAgentRunMessageRouter({ crossRun }), … })`); its process slot is no longer set.
  - `api/graphql/types/agent-team-run.ts`: `restoreAgentTeamRun` and `RestoreAgentTeamRunResult` removed; `api/graphql/types/agent-org-run.ts`: `restoreAgentOrgRun` removed (`AgentOrgRunMutationResult` stays: create and terminate use it).
  - `tests/unit/api/graphql/types/agent-team-run.test.ts`: the restore test and its mock removed.
  - `autobyteus-web/generated/graphql.ts` regenerated (19 lines removed); `docs/modules/agent_orgs.md` says how a stopped Org is restored.
  - `follow-ups.md`: FU-014 withdrawn.
- Local validation and result: IMP-26 (server and web type gates, generated types match the schema, no remaining references outside the e2e suites, the server unit suite).
- Next recipient or routing: Code Reviewer, targeted re-review of CR-461-008.
- Remaining limitations or risks: 32 server E2E files (105 references) restore a run with the removed mutations; they need the stream-message path (API/E2E, with the e2e rewrite already listed).

### IR-005 — A delegated team keeps an outside handoff; a child is read by its own identity; an active Org's inspection lists child statuses (CR-461-009 … -011)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-008, failure-origin review of API/E2E round 1, evidence under `evidence/api-e2e/`); Solution Designer, SR-054 (commit `5a84b71feb`: the contract follows today's delivery texts, peer delegation by description only, refusal shape; the walkthrough regenerated). Round 5.
- Triggering finding IDs: CR-461-009, CR-461-010, CR-461-011.
- Classification: `Local Fix` for all three; Large / High unchanged, so it returns to Code Review, then API/E2E.
- Prior authoritative result: IR-004 at `a54e78ccb7` (+ `bc223a8ae0`).
- Current authoritative result: commits `d82ef48509` (CR-461-009), `341173b50e` (CR-461-011), `4209ea3989` (CR-461-010), `d188941869` (CR-461-010: two Org specs restated; the run stored-state read keeps its timing), and the handoff commit.
- Related solution revision IDs: SR-054. Related architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-008.
- Approved behavior or requirement IDs affected: contract §2.1 (a delegated team's handoff `to` outside the team), §5.3 O5–O7; SCN-005 / AC-007; DS-8 (`statuses`; commands to a child row); REQ-002, REQ-004.
- Implementation delta:
  - **CR-461-009.** `CollaborationHandoffCompiler.compileTeam(team, compilation)` with `TeamHandoffCompilation` = `own_team` (today's check: every `to` in the team) or `delegated_team` (a `to` outside the team kept as written, as an external target; `from` still must be one of the team's agents; optional `handoffs` = the rules its members have in the delegating run). `DelegatedRunStarter.startTeam` passes the source's handoffs rebased into the team's own space (`from` and an in-team `to` lose the delegation address; an outside `to` as written); `CreateTeamRunInput.handoffs` is accepted only with `delegatedFrom`, and `createTeamRun` plans a delegated team with the delegated rule (a peer-started team too, over its definition's rules). A catalog team copy (`collaborator-entry-builder.ts`) compiles with the delegated rule. The team's load keeps stored handoffs as they are (the schema already allowed an outside `to`). Base used `source.handoffs` for a team copy; after IR-001 the starter re-planned from the definition and dropped them, which lost the org's outside handoff.
  - **CR-461-011.** `AgentOrgRunService.getInspection` passes `childStatuses: await children.statuses(run)` (the `Pick` includes `statuses`), as the Org view session does; `projectAgentOrgExecutionSnapshot`'s `delegated` and `childStatuses` are required, so no read can leave them out (the stopped-mode session passes none explicitly). Checked the others: the agent-run inspection and the Team resume config carry no child statuses in their payloads (the history poll reads them), so nothing is omitted there.
  - **CR-461-010.** `services/runHydration/delegatedChildReads.ts`: a delegated child's own read subject (an agent child → `{ kind: 'run' }`; a member of a team child → `{ kind: 'teamMember' }` of that team run, its address in the team's own space) and its stored-state reads. Used by every read of a focused agent in the Team and Org views: the member loader (`teamMemberProjectionHydrationService`, `orgMemberLoadTarget`), the focused agent at open (`teamRunContextHydrationService`, `stageAgentOrgExecutionContext`) and the browse subject (`activeContextStore`, `AgentTeamEventMonitor.vue`, `agentOrgExecutionContext.selectedTarget`: trace pages, file changes, file content). `runStoredStateLoader.fetchRunProjection` shares the run-projection query and payload check with `readRunStoredState`, which starts its query in the same turn as before (the agent-run re-sync spec observes that timing). The selection then focuses the child in the view; the composer sends with `agent_run_id` = the child on the view's stream; the server's `children.execute` takes it and the stopped run stays stopped.
- Departure from the finding's wording (CR-461-010), with the reason: the finding says to select a child row "not through `onSelectTeamMember` / `selectTreeRun`". The selection actions are kept: what they do for a mounted view is focus the agent in that view (`inspectMountedTeamMember`), which is exactly what makes the composer target the child on the view's stream, and they are the one path the desktop list, the history tree and the phone share. What read the child as a team member were the reads underneath (projection, file changes, browse subject); those now use the child's own identity, so the server's refusal no longer fails the selection. A separate child-selection action would duplicate the focus and recovery handling of the existing one.
- Tests added or rewritten: `delegated-team-outside-handoff.test.ts` (kept and named by `get_handoff_rules`; definition rules with the delegated rule; `from` must be in the team; a user-started team and the validator refuse); `delegated-run-starter.test.ts` (rebase); `agent-org-inspection-child-statuses.test.ts` (an active Org with a child inspects and lists its status; without it the contract refuses, as observed); web `teamDelegatedChildSelection.spec.ts` (a stopped Team's child row selected through `selectTreeRun`, read by its own run, browsed by its own identity, messaged on the Team's stream, the Team stays stopped; fails before the fix with the server's refusal). Restated (they read children as members): `teamMemberProjectionHydrationService.spec.ts`, `teamTaskApprovalHydration.spec.ts`, `teamRunContextHydrationService.spec.ts` (delegated focus at open), `agentOrgContextHydration.spec.ts` (an agent child by its run; a team child's member through its team run), `agentOrgComposerSubmission.spec.ts` (invalid staged projection now from the child team's read), `agentOrgInspection.spec.ts`, `agentOrgInspectionApollo.spec.ts` (the task-team member read through `team-task`).
- Local validation and result: IMP-27 (server type gate, unit suite), IMP-28 (web type gate, localization guards, full spec suite), IMP-29 (server integration suite), all Pass on `d188941869`.
- Next recipient or routing: Code Reviewer, targeted re-review of CR-461-009 … -011; then API/E2E reruns the stories against the regenerated walkthrough.
- Remaining limitations or risks: FU-015 (the server's team member queries still answer a child for the projection and trace page, used by E2E suites; not by the product); the views are not checked in a real browser by me (API/E2E's SDV cases cover them).

### IR-006 — The team member reads answer only the team's members; one owner of the subject that reads an agent (CR-461-014, CR-461-015)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` "Round 5" (CRR-009, Full Re-Audit of IR-005 at `d188941869`). Round 6.
- Triggering finding IDs: CR-461-014, CR-461-015.
- Classification: `Local Fix` for both; Large / High unchanged, so it returns to Code Review, then API/E2E.
- Prior authoritative result: IR-005 at `d188941869` (+ `2721259169`).
- Current authoritative result: commits `504ff32691` (CR-461-014), `d3c57a8569` (CR-461-015), and the handoff commit.
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-009.
- Approved behavior or requirement IDs affected: none changed; DS-8 (a child row read by its own identity) now has one owner per view kind.
- Implementation delta:
  - **CR-461-014.** `team-member-run-view-projection-service.ts`: `delegatedChildRun` and its two uses in `getProjection` and `getActiveTracePage` are removed; the team member reads answer only the team's own members, as the Org's do. The service takes only `Pick<DelegationTree, "peerChildrenOf">` (its peer children). FU-015 withdrawn. No unit or integration test used the branch; a test now shows every member read (projection, trace page, files) refusing a run the team delegated to.
  - **CR-461-015.** `services/runHydration/agentReads.ts` replaces `delegatedChildReads.ts`: `teamAgentReadSubject({ teamRunId, tree, memberAddress }, agentRunId)` and `orgAgentReadSubject(orgRunId, index, agentRunId)` are the one owner per view kind of the subject that reads agent X (a run the view's run delegated to by its own identity, else the view's member); `readsOf(subject)` turns any subject into its stored-state and file reads. The team-member projection read (`fetchExactTeamMemberProjection`, from `teamRunContextHydrationService`) and the Org-member projection read (from `agentOrgContextHydration`) move into it. The seven sites consume them: the Team member loader, the Team focused agent at open, the store's and the Team event monitor's browse subjects, the Org focused agent at open, the Org member loader, the Org browse subject (local and remote). A child team's member address is used as the server sends it (the team's own space); the address stripping is gone.
- Tests: `team-member-run-view-projection-service.test.ts` (a run the team delegated to is refused by every member read); web `agentReads.spec.ts` (the Team owner: own member, agent child, team child's member; the Org owner: own agent, configured team member, agent child, team child's member; `readsOf` for `run`, `teamMember`, `agentOrgMember`); `teamMemberProjectionHydrationService.spec.ts` drops a mock of the moved read.
- Local validation and result: IMP-30 (web), IMP-31 (server) on `d3c57a8569`.
- Next recipient or routing: Code Reviewer, targeted re-review of CR-461-014 and -015; then API/E2E.
- Remaining limitations or risks: server E2E suites that read a delegated child through `getTeamMemberRunProjection` now get the member refusal; they go to API/E2E (CRR-009).

### IR-007 — An agent an Org view does not index is refused loudly (CR-461-016)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` "Round 6" (CRR-010, Targeted Delta Review of IR-006 at `d3c57a8569`). Round 7.
- Triggering finding IDs: CR-461-016. Classification: `Local Fix`; Large / High unchanged.
- Prior authoritative result: IR-006 at `d3c57a8569` (+ `76e864ec60`). Current authoritative result: commit `9f4709571b`, and the handoff commit.
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-010.
- Approved behavior or requirement IDs affected: none.
- Implementation delta: `orgAgentReadSubject` (`autobyteus-web/services/runHydration/agentReads.ts`) throws `AgentRun '<id>' is not an agent of AgentOrg run '<org>'.` for an agent the view indexes neither as its own agent nor as a remote one, instead of returning an Org member read with the address `''` (Principles 13 and 16: a missing owner fails loudly). A child team's member uses its indexed `address` directly (the index already holds the address as sent, in the team's own space); the second lookup is gone. Every caller passes an indexed agent (the member loader checks first; the focused agent at open is a seed of the view; the browse subject is the selected indexed or remote agent).
- Tests: `agentReads.spec.ts` asserts the child team member's exact subject and that an unknown agent throws.
- Local validation and result: IMP-32 (web) on `9f4709571b`. No server code changed.
- Next recipient or routing: Code Reviewer, targeted re-review of CR-461-016; then API/E2E.
- Remaining limitations or risks: unchanged from IR-006.

### IR-008 — Four Local Fixes; one listed-runs poll for every kind (CR-461-017 … CR-461-020; SR-055, SR-056)

- Triggering role, report path, and round: Code Reviewer CRR-012 (failure-origin review of API/E2E round 2, `d7f8b02773`), routed by the Solution Designer with SR-055 (ARCH-REV-030) and SR-056 (ARCH-REV-031, option (a)). Round 8.
- Triggering finding IDs: CR-461-017, CR-461-018, CR-461-019, CR-461-020 (`Local Fix`); CR-461-021 (`Design Impact`, designed as SR-055/056). Large / High unchanged.
- Prior authoritative result: IR-007 at `9f4709571b` (+ `f75cf6b96b`).
- Current authoritative result: `b6ea7d241c` (017), `e208080b3c` (018), `e423b15cff` (020), `438d64a85c` (019), `f580a3153a` (SR-055/056 server and contract), `dfc583e1c2` (two identity additions, below), `a9f34ce3e6` (SR-055 web), `40927e92ea` (a server test restated for the agents' definition IDs, found by IMP-33), and the handoff commit.
- Related solution / architecture-review revision IDs: SR-055, SR-056; ARCH-REV-030, ARCH-REV-031. Related code-review revision IDs: CRR-011 (Pass, informational), CRR-012.
- Approved behavior or requirement IDs affected: REQ-009 (the history poll, preserved and extended to every kind), DS-8 (child rows), SCN-005 / AC-007 (a message to a selected child).
- Implementation delta:
  - **CR-461-017.** `cross-run-message-delivery.ts`: a run-ID message returns `MESSAGE_DELIVERED_TEXT` ("Message delivered.", `agent-execution/domain/agent-operation-result.ts`), an address message `Delivered message to <address>.`; the tool contract's default uses the same constant.
  - **CR-461-018.** `agent-org-run-message-delivery.ts` `presentCommittedCommunication` requires only the receiver to be the Org's; a sender from another run is presented without failing the Org's persistence.
  - **CR-461-019.** `teamMemberInspectionCoordinator.ts`: a delegated child (its subject is not a `teamMember` of this team) is focused and committed from the click, then read; the team's own members still load first.
  - **CR-461-020.** `participantMessageRows.ts` gives each view's Team tab the key and reference path of the run that holds the participant's messages (`participantMessagesKeyOf`); the Team, Org and agent-run views use it, so a delegated child's Team tab reads its own run's log. `collaborationParticipantMessages.append(message)` adds to every loaded list of its participants, whatever root.
  - **SR-055/056 server and contract.** `runCollaborationStatuses(runs: [{kind, runId}])` (at most 100) replaces `agentRunCollaborationStatuses`: per listed run `isActive` and `children[]`, each `{ row: identity, delegatorAddress, statuses }`. The identity (`childRunIdentityDtoSchema`) comes from one builder, `services/agent-streaming/child-run-identity.ts`, from the Task entry and the `DelegationTree`'s per-run agents (read once per run); the view's row adds the launch details read fresh (`delegatedChildDto`). `RunViewChildren.listed(run)` answers local children only.
  - **Two additions to the identity the run list needs** (`dfc583e1c2`), both fixed for the run's life and from in-memory data: a team child's `coordinatorAgentRunId` (its Task entry's entry agent, the member the delegation went to: a team row opens its coordinator), and each child's `delegatorAddress` (the delegating agent's address from the listed run's per-run agents, or null: the row's "started by"). The view's row is unchanged.
  - **SR-055 web.** `runHistoryStore.listedRuns` (agent, team and org runs); `useRunHistorySectionLoad` reads their children after the first load, each quiet read, a window change and a resumed poll (`listedRunChildrenStore.refresh`, one read per 100 runs); a changed answer rebuilds the run list. A listed run that is not open draws its delegated rows from its answer, desktop and phone through the same builders: agent runs `listedAgentRunTaskRows` (`agentRunCollaborationStore.taskRows`), team runs `withListedChildRows` (`buildRunHistoryTeamExecutionRows`, placed as the team view places them), org runs `projectAgentOrgHistoryRows` (`listed`). A row's click selects the child (a team's coordinator from the answer) and opens the run; the published view keeps the selection only if it lists the child. A delegated row's Stop shows from the answer's statuses when the run has no view (`delegatedCopyLiveness`). Removed: `refreshListedStatuses` and its re-read rule, `ensureStoredView` (and the `hasCollaboration` prop it served), the old query and `readAgentRunCollaborationStatuses`. The tree-line decoration is one helper (`utils/treeLines.ts`) used by the view's rows, the listed rows and the Org rows; the team naming rule takes member addresses (`teamMemberNameAmong`).
- Tests: server `cross-run-message-delivery.test.ts` (017), `agent-org-communication-presentation.test.ts` (018), `run-collaboration-statuses.test.ts` (every kind, identity and delegator read once across polls, a closed child leaves, the 100-run limit); contract `run-collaboration-statuses.test.mjs`; web `teamDelegatedChildSelection.spec.ts` (019, fails before the fix), `childParticipantMessages.spec.ts` (020, one per view kind), `listedRunChildRows.spec.ts` (team and org, desktop and phone: within one poll, leave and return, equal to the view's rows, open run unchanged, 100 per read), `agentRunListedTaskRows.spec.ts` (agent run: no view read per poll, click opens then selects, open run unchanged, phone), `delegatedCopyListedLiveness.spec.ts`; restated: `useRunHistorySectionLoad.spec`, `runHistoryListedRuns.spec`, `agentRunCollaborationDisclosure.spec`, `agentRunCollaborationStatuses.spec`, `AgentRunTaskRowsDisclosure.spec` (on an open run), `RunListRow.agent.spec` (rows from the answer, no view read), the projection and Org row specs (new inputs); removed: `agentRunCollaborationListedStatuses.spec.ts` (the withdrawn re-read rule), server `agent-run-collaboration-statuses.test.ts`; server `run-own-agents-reader.test.ts` restated (agents carry their definition IDs).
- Local validation and result: IMP-33 (server, on `a9f34ce3e6`, two failed files rerun on `40927e92ea`), IMP-34 (web, on `40927e92ea`), IMP-35 (contracts, on `a9f34ce3e6`).
- Next recipient or routing: Code Reviewer, targeted re-review; then API/E2E.
- Remaining limitations or risks: a listed agent run that is not open no longer lists its children on a peer: the answer carries local children only ("peer children keep their own state source", SR-055), and that source (the remote runs store) is filled from a published view, which such a run no longer reads; before, the stored view read showed them. The Projects list keeps its team rows (members only, as before). The browser probes still query the removed `agentRunCollaborationStatuses` (API/E2E).

### IR-009 — The full review's Local Fixes; a listed run's peer children (CR-461-022 … CR-461-026; SR-057)

- Triggering role, report path, and round: Code Reviewer CRR-013 (`code-review-report.md` "Round 8", a full review of the whole change at IR-008), routed by the Solution Designer with SR-057 (ARCH-REV-032: Pass). Round 9.
- Triggering finding IDs: CR-461-022 … CR-461-026 (`Local Fix`); CR-461-027 (`Design Impact`, designed as SR-057). Large / High unchanged.
- Prior authoritative result: IR-008 at `40927e92ea` (+ `095b45b087`).
- Current authoritative result: `07bcc118e4` (023, 024), `77c64ed011` (022), `e2a45770a7` (SR-057 server and contract), `2d31871bc0` (025 and SR-057 web), `d9e124f844` (026), and the handoff commit.
- Related solution / architecture-review revision IDs: SR-057, ARCH-REV-032. Related code-review revision IDs: CRR-013.
- Approved behavior or requirement IDs affected: REQ-002 and REQ-009 (a listed run's peer children, SR-057), DS-8 (child rows and reads), SCN-013 … SCN-015.
- Implementation delta:
  - **CR-461-023.** Required collaborators are required: `DelegationTree`'s reader (no `() => null` default, not lazy); `TaskDelegation`'s `tree().runOfAgent`, `deliverToRun`, `recordCollaborating` and `channel` (no process fallback); `CrossRunMessageDelivery`'s `senderAddress`. Tests pass fakes (`NO_RUN_PARTS`, `readerOfAgents`, `readerOfAgentRunIds`; the Task-side test helper passes the process channel when a test gives none, as before). A run whose own file is absent or unreadable is left out with a warning naming it and the reason (the tree's one read; the peer summary's launches).
  - **CR-461-024.** The tree is the one owner of a run's agents: `RunPartsReader.partsOf(run)` returns a run's parts once (its agents, a team's coordinator address, an org's mounted teams with their coordinators); the tree keeps them per node (an agent run once its address is stored, so a later stored address is seen; an org run read again on a miss) and derives `agentsOf` (a delegated agent run without a stored address shows the address it was delegated to: the one answer) and `standingOf` (contract §2.3). `DelegatedRunAgentsReader` and `CrossRunAddressResolution` read the tree; their own `RunOwnAgentsReader` instances, the `"/"` fallback and `childRunIdentity`'s address fallback are gone. A cross-run message reads no file once its runs are kept (test). An agent run with no metadata file is now left out with a warning (it was given its own ID with no address).
  - **CR-461-022.** Web: `agentRunAgentReadSubject` (`agentReads.ts`) is the agent-run view's owner: its own agent as its run; a child here by its own identity (its run, or its team run's member); a child on a peer node through the run (`standaloneMember`). The child load (`hubChildLoadTarget`), the browse subject and the Team tab's key consume it; `readsOf` reads a peer child's stored state through the run, and a peer's files and trace stay on its node (none listed, none asked). Server: `StandaloneRootMemberViewProjectionService` answers the run's peer children only; its trace page, file list and file content reads, the GraphQL queries `agentRunCollaborationMemberEventMonitorActiveTracePage` and `agentRunCollaborationMemberFileChanges`, and the REST route `/agent-collaborations/:host/agent-runs/:id/file-change-content` are removed. `DelegatedChildLocations` stays: the context-file owners of a message's attachments to a child still use it (FU-020).
  - **SR-057.** Server: `RunViewChildren.listed` adds each open peer child: its identity from its Task entry (`peerChildRunIdentity`), its node named from this node's own peer registry (`peerNodeNames`, shared with the view's peer rows), no statuses; every listed child carries `node` (`null` here). Web: the peer row shows under the run, marked with its node, without a live status; an open view keeps the live observation.
  - **CR-461-025.** One builder per view kind from one child shape (`DelegatedChildRun`, `services/delegatedChildren/delegatedChildRuns.ts`, with adapters from each view's rows, the team tree, every view's peer executions and the poll's answer): `agentRunTaskRows`, `teamRunHistoryRows`, `agentOrgChildRows`. The view's `listTaskRows`, `buildRunHistoryTeamExecutionRows` (with or without a view; no longer from the team's navigation rows) and `projectAgentOrgHistoryRows` call them, as the listed rows do; the per-path builders are gone. The team view exposes `listRemoteExecutions()`. One hop: a child team's own children are its own view's (the server never nests them), so the builders do not nest.
  - **CR-461-026.** Removed: the public `hasCollaboration` field and its web queries, types, projections and equality check (the server's index flag stays, for last activity); `getTeamRunService` and the process slot it read, with its boundary-test special case and assertion; `TaskExecutionReferenceDto`, `ChildRunAgentStatusDto`, `standaloneNavigationTarget`, `GetTeamMemberRunProjectionQueryData`, `GetTeamRunResumeConfigQueryData`; and, made dead by this round, `remoteRowsOf`, `projectAgentOrgTaskTeamStatus`, `isAgentOrgTaskAgentNode` with its types, `readsAsDisplayName`. Docs: `workspace_layout.md` (the current poll), the docs naming the removed reads, and a Run History section on `runCollaborationStatuses`. FU-017 withdrawn (the reviewer's update).
- Tests: server `delegation-tree-agents.test.ts` (one answer for an agent run without a stored address; absent and unreadable runs warned; an org's standing with its mounted teams; a team's coordinator), `cross-run-address-resolution.test.ts` (through the tree; no file read once kept), `run-own-agents-reader.test.ts` (`partsOf`), `run-collaboration-statuses.test.ts` (peer children; a channel that fails on any request to a peer); the TaskDelegation, delivery and reader tests restated for required fakes. Web: `agentReads.spec` (the agent-run owner), `childParticipantMessages.spec` (a peer child's Team tab), `agentRunTaskRows.spec` and `listedRunChildRows.spec` (per kind: the same children give the same rows open or listed, with peers; peer rows marked with their node, no status, no request), `delegatedCopyListedLiveness.spec`; restated: child hydration, lazy children, compaction, browse, file, trace, team and org row specs (nested trees dropped), the boundary test, the supervisor ownership test, the history service test.
- Local validation and result: IMP-36 (server), IMP-37 (web), IMP-38 (contracts) on `d9e124f844`.
- Next recipient or routing: Code Reviewer, targeted re-review; then API/E2E.
- Remaining limitations or risks: the listed child's `node` carries the node's name as well as its ID (the row is "marked with its node"; the name is read from this node's registry, not from the peer). Server E2E suites and web probes that use the removed member reads: `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts`, `tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts`, `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` (API/E2E).

### IR-010 — No guessed coordinator or member team; dead exports; the remote base merged (CR-461-028, CR-461-029)

- Triggering role, report path, and round: Code Reviewer CRR-014 (`code-review-report.md` "Round 9", Full Re-Audit of IR-009: Fail, two Local Fixes; CR-461-022 … -027 resolved). Round 10. The user asked to merge the remote base, which had moved on.
- Triggering finding IDs: CR-461-028, CR-461-029 (`Local Fix`). Large / High unchanged.
- Prior authoritative result: IR-009 at `d9e124f844` (+ `1bdb9135c6`).
- Current authoritative result: `994ae84850` (CR-461-028, -029), `8a47481617` (merge of `origin/personal` at `3228eff74b`), and the handoff commit.
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-014.
- Approved behavior or requirement IDs affected: none changed.
- Implementation delta:
  - **CR-461-028.** A team child's coordinator is never guessed: the adapters of `DelegatedChildRun` take it from the member at the team's coordinator address (the views) or the member the Task entry names (the poll) and refuse a team without it, as do the org's peer rows and the agent-run view index's `coordinatorOf` / `coordinatorRunIdOf` (the same `members[0]` fallback, in a file this round touches). `DelegatedChildRun` is a tight union (a team child always has its coordinator, an agent child none). `AgentRootChildAgent` is a tight union (a `task_team_member` always has its team run, a `task_agent` never), so `agentRunAgentReadSubject` reads a team child's member through its team run with no fallthrough.
  - **CR-461-029.** Removed `ChildRunNodeDto`, `ListedRunChild`, `isRemoteExecutionKnown` and `RunHistoryIndexFile` (with the import only it used); contracts dist rebuilt.
  - **Merge.** `origin/personal` (95 commits: autobyteus-452, -472, -473, -479, -480, -486; version 1.5.13-beta.6) merged at `8a47481617`. One conflict, the phone probe's case imports and runners: both sides kept. This ticket's stopped-delegator phone cases are renumbered MSP-37 … MSP-39 → MSP-50 … MSP-52 (the merged state has MSP-37 autobyteus-471, MSP-38 autobyteus-9, MSP-39 … MSP-49 the merged tickets); the probe's case IDs are unique again.
- Tests: `delegatedChildRuns.spec.ts` (a team child's coordinator from every source; refused when no member is it); `agentReads.spec` (every team child's member read through its team run, every direct child as its own run).
- Local validation and result: IMP-39 (server), IMP-40 (web), IMP-41 (contracts) on the merged state `8a47481617`.
- Next recipient or routing: Code Reviewer, targeted re-review of CR-461-028, -029 and the merge: Pass (CRR-015, `code-review-report.md` round 10; the merged watcher test's load-only failure recorded as FU-021); the reviewer routes to API/E2E.
- Remaining limitations or risks: API/E2E's earlier evidence names this ticket's phone cases MSP-37 … MSP-39; they are MSP-50 … MSP-52 now.


### IR-011 — The task header's address, a child's mentions and sends, a delegated run's collaboration context, a run's in-run set (CR-461-030 … -032, -034; SR-058's CR-461-030; SR-059) — complete

- Triggering role, report path, and round: Code Reviewer CRR-016 (failure-origin review of API/E2E round 3: three Local Fixes, two Design Impacts), through the Solution Designer. Round 11. My Design Impact on the `@` note during this round, answered by SR-059 (ARCH-REV-034).
- Triggering finding IDs: CR-461-031, -032, -034 (`Local Fix`); CR-461-030, -033 (Design Impact, designed in SR-058, ARCH-REV-033). Large / High unchanged.
- Prior authoritative result: IR-010 at `994ae84850` + `8a47481617`.
- Current authoritative result: `d5e059eb27` (CR-461-031), `2653b6db2e` (CR-461-032, -034), `305f2a8987` (CR-461-030), `ef31136ad1` (SR-059).
- Related solution / architecture-review revision IDs: SR-058 (ARCH-REV-033), SR-059 (ARCH-REV-034). Related code-review revision IDs: CRR-016.
- Approved behavior or requirement IDs affected: none changed (REQ-009 non-goal "no change to what an agent reads" restored for delegated runs).
- Implementation delta:
  - **CR-461-031.** `TaskDelegation` takes the task header's sender address from one owner, `reachingAddress`; `DelegationSource.delegatorAddress` and the team delivery's `delegatorAddressOf` are removed.
  - **CR-461-032.** `DelegatedRunCommands.postUserMessage`: a child row's message, with its `@` mentions, goes to the child's own root. A team child's team root resolves them for that member and posts the composed note; an agent child's standalone gate admits them. The agent, team and org views route a child's message there; the delegating root resolves only its own agents' mentions. `childRunOf` no longer takes a run on a peer node for a local child (a latent misroute). `isChildAgent` is removed (no callers).
  - **CR-461-034.** The team stream has an accepted `SEND_MESSAGE` acknowledgement (`teamCommandAckPayloadSchema`, renamed from the interrupt-only schema), sent for a child's accepted message. The web's `TeamSendAdmissions.acknowledge` settles the send by identity.
  - **CR-461-030 (SR-058).** `RunCollaborationContext` (created in `composeTaskSide`): a delegated agent run's agent is a task agent; a copy of an org's configured agent keeps that address's handoff rules (`get_handoff_rules`, `teamScoped`) and the org's instruction, read at use; `MemberExecutionContext.inOrganization` (required) gives a team run whose Task an org assigned the organization line. `DelegationTree.assignersOfTasksOf` is step 2's order.
  - **SR-059.** `ReachableAgents`: step 2's one enumeration. `CrossRunAddressResolution` resolves step 2 by it. `CollaboratorRootPort.inRunPlacementsByDefinition` and `addressesInUse` are async and include step 2's placements (`InRunPlacement.step`, preferred by §2.3's order). A configured placement step 2 reaches is a `delegate_task` placement, from its snapshot in the assigner's own file (`RunOwnAgentsReader.configuredPlacementOf`).
- Tests:
  - `delegated-run-commands.test.ts` (peer child not local; mentions per child kind);
  - the three view handlers' tests (a child's mentions on its own root; two acknowledged sends to a stopped team's child; a refused mention names the collaborator);
  - `TeamStreamingService.spec.ts` (two sends to a stopped team's child settle; an acknowledgement settles only its own send);
  - `run-collaboration-context.test.ts`, `collaboration-prompt-sections.test.ts` (organization line);
  - `reachable-agents.test.ts`;
  - CPW e2e: rows 1–10 read base's text; CPW-M2 and CPW-M5 read base's notes; CPW-M6 asserts base's `delegate_task` answers;
  - the base characterization at `827f1e68dc` (IMP-43).
- Local validation and result:
  - IMP-42 (CPW before SR-059: M2 and M5 fail; the Design Impact's evidence);
  - IMP-44 (CPW full run: 12 of 13, the failure was CPW-M6's `list_available_agents` check, which is opt-in for those agents and was moved to `reachable-agents.test.ts`);
  - IMP-44b (CPW-M6 alone: pass);
  - IMP-45 (focused server unit areas: 139 files, 957 tests).
  - The server type gate and the web type gate pass at their baselines (1013, 93).
- Next recipient or routing: none yet. CR-461-033 (rows at every depth) is built on SR-060's `RunCollaborationMap` (ARCH-REV-035), which replaces `ReachableAgents`, `RunCollaborationContext` and `CrossRunAddressResolution`. One handoff to the Code Reviewer follows IR-012 (told to the Solution Designer).
- Remaining limitations or risks:
  - A standalone copy's `get_handoff_rules` is offered only when it inherits rules (an org copy). At base a task agent in a team or org root had it with no rules.
  - A restored org member got no instruction at base (`mode === "fresh"`); a delegated org copy reads it at every activation.
  - The full server unit and integration suites, and the web specs, are not yet rerun for this round.

### IR-012 — Each run's collaboration map, from the forest (SR-060); CR-461-033 held for SR-061 — folded into IR-013

- Triggering role, report path, and round: Solution Designer, SR-060 (commit `4e43b030ae`, on the user's direction), ARCH-REV-035 Pass with three notes. Then SR-061 announced: the web side of CR-461-033 and further work on the child-command and child-observation owners are held until it arrives.
- Triggering finding IDs: SR-060; CR-461-033 (carried from IR-011). Large / High unchanged.
- Prior authoritative result: IR-011 at `ef31136ad1` + `518a3aac8a`.
- Current authoritative result: `5531101a87` (SR-060 server fold).
- Related solution / architecture-review revision IDs: SR-060 (ARCH-REV-035); SR-061 pending.
- Implementation delta (`5531101a87`):
  - **The forest.** `DelegationTree` is a forest:
    - `topOf` is derived by walking up the parents, so a run whose own entries go with their Task tops its own tree with its subtree;
    - `nodeOf` is `byRunId`, and `agentOf` is `byAgentRunId` (run, address, top);
    - one `RunFilesReader` reads a run's parts, an org's placements and a configured placement.
  - **`RunCollaborationMap`** (`delegationTree.mapOf(run)`, derived, never stored) answers:
    - `assigners`, step 2's order;
    - `stepTwo`, the one enumeration;
    - `resolve`, step 2 plus the old-address correction;
    - `ownReceiverOf`, steps 1 and 3 from the run's own file;
    - `reachingAddressOf`;
    - `delegationPlacementAt`;
    - `agentCollaboration` (role, plus an org copy's rules and org definition);
    - `inOrganization`;
    - `rows`, the open subtree with each row's parent;
    - `canMessage` and `subtree`.
  - **Folded:**
    - `CrossRunAddressResolution` is removed; the `send_message_to` dispatcher resolves through `mapOf(sender)`, and `CrossRunMessageDelivery` and `TaskDelegation` take the sender address from `mapOf(receiver)`.
    - `ReachableAgents` and `RunCollaborationContext` are removed; the roots' collaborator ports, the standalone, team and org member context builders and the in-run delegation placements read the map. The standalone root manager takes `orgInstruction` (the supervisor's org definitions).
    - `composeTaskSide` and the hosts no longer carry the old owners.
- Tests:
  - `delegation-tree-forest.test.ts`: the derived top, `byRunId` and `byAgentRunId`, nested rows, and a deleted Task's run topping its own tree;
  - `run-collaboration-map-own-step.test.ts`: for a team run and an org run, the map's own step equals the loaded index's `getMessagePlacement` / `memberOfInstance` for every address;
  - the reach, context and in-run tests moved onto the map (`run-collaboration-map-reach`, `-context`, `-in-run`).
- **The old index callers, against the design's inventory** (`827f1e68dc` methods; callers in the branch at `5531101a87`):

  | Old methods | Callers now | Answer used |
  | --- | --- | --- |
  | `getAgent`, `requireAgent`, `getTeam`, `requireTeam`, `agentAddressOf` | `root-team-run.ts`, `agent-org-run.ts`, `team-run-message-delivery.ts`, `agent-org-run-message-delivery.ts`, `team-run-resolver.ts`, `*-state-package-validator.ts`, `collaboration-participant-messages.ts` (`isAgentOfTree`), `catalog-delegation.ts`, `mention-viewer.ts`, `standalone-root-message-delivery.ts`, the location services | the run's own index (its own parts) |
  | `getTaskExecution`, `listTaskExecutions`, `listChildAgents`, `listTaskExecutionChainForAgent` | none | removed; the rows are `mapOf(run).rows()` |
  | `listAgents`, `listDirect…`, `listTeamAncestorsDeepestFirst`, `listContainingTeamAncestorsForAgent` | `root-team-run.ts`, `agent-org-agent-status-snapshot-projector.ts`, `agent-org-run-manager.ts`, the two location services | the run's own index |
  | `getMessagePlacement`, `getConfiguredPlacement`, `teamInstancesOf`, `memberOfInstance`, `isOwnTeamAddress`, `instanceDefinitionsOf` | `message-recipient-resolution.ts`, `mention-viewer.ts`, `catalog-delegation.ts`, `team-recipient-resolver.ts`, `agent-org-recipient-resolver.ts`, the two location services | steps 1 and 3 and CM-1: the run's own index; step 2, the addresses in use and the sender address: `mapOf(run)` |
  | `getPhysicalScopeForAgent`, `getMemoryPlacementForAgent` | `agent-org-execution-tree-location-service.ts`, `team-run-execution-tree-location-service.ts` | the run's own root and folder |

  **Escalated, no answer in the table:**
  - The member trace pages' sender addresses (`team-member-run-view-projection-service.ts:79, 100`; `agent-org-member-run-view-projection-service.ts:87, 108`) look up each sender in the run's own index only. A sender from another run, such as a delegator, is shown with no address.
  - The table's row 1 ("an agent of another run: `byAgentRunId`") would show that run's own-space address, but §2.5 shows an address only where the receiver's reach resolves it.
- **Held for SR-061** (not on the branch): CR-461-033's rows at every depth.
  - Server: the tree's reports to ancestors, `RunViewChildren` / `LocalChildObservation` / `DelegatedRunCommands` / the feed over `mapOf(run).rows()`.
  - Contract: the team DTO's `task_executions` removed.
  - Web: nesting by delegator in the three builders and the team tree selector.
  - Kept as `stash@{0}` and as `evidence/implementation/HELD-CR-461-033-rows-at-every-depth.patch`. Its focused runs passed: server unit 468 files with one expectation updated; contracts 21; the web nesting spec 5. The web specs that construct team rows with `task_executions` still needed updating.
- Local validation and result:
  - server type gate PASS (1013);
  - focused server unit areas at `5531101a87`: 468 files and 3866 tests pass, after the vocabulary test's file list moved to the map.
- Next recipient or routing: none at the time; SR-061 … SR-063 arrived and the held work went into IR-013.

### IR-013 — The frontend contract (SR-061 … SR-063), a peer child by its own identity (SR-064 … SR-066), archive and delete (SR-067), base's list reads (SR-068)

- Triggering role, report path, and round: Solution Designer, SR-061 (the user's direction of 2026-11-12) … SR-068; architecture reviews ARCH-REV-036 … ARCH-REV-042, all passed. The Implementation Engineer's Unclear questions, answered as SR-064 (an agent stream follows its run; the Settings save composed in the editor), SR-065 (each child's own options), SR-066 (peer runs as handles, the user's decision), SR-068 (`hasCollaboration` from the stored flag).
- Triggering finding IDs: SR-060 … SR-068; CR-461-033 (held since IR-011). Large / High unchanged.
- Prior authoritative result: IR-011 at `518a3aac8a`; IR-012 at `5531101a87`.
- Current authoritative result: `c46e5c330b` (code), `16815d43a9` (one guard list), `782a9294f8` (web type baseline), `c5142b111b` (view event delivery; integration fakes).
- Related solution / architecture-review revision IDs: SR-060 … SR-068; ARCH-REV-035 … ARCH-REV-042.
- Implementation delta (commits `909e471587` … `c46e5c330b`):
  - **Names and owners (SR-060, SR-061):** `DelegationIndex` and `CollaborationTree` (`collaborationTreeOf(run)`); the trace pages' sender addresses by `reachingAddressOf` (`received-sender-addresses.ts`).
  - **`RunViewStream` (SR-062, SR-063):** base's `RootEventPublisher` moved out of the root, one per run from the composition root's registry for the life of the process. A snapshot reads its base, the tree's rows and the cached statuses in one synchronous step, then the run's own parts. A mode switch is an in-band snapshot at the current sequence under the same `liveSequenceId`. A stopped run's checkpoint is its view's sequence with no open work.
  - **Rule 1 (base's shapes):**
    - the stream contracts are back at `3228eff74b` (minus the launch selections, plus SR-038's peer launches);
    - `ChildRowsFeed` publishes base's `task_execution_started` / `task_executions_closed` / `task_executions_reopened` into each affected run's stream, with the closed set from the tree (`CollaborationTree.closedRows`);
    - the views read rows nested by placement (`run-view-rows.ts`); rows show at every depth (the held CR-461-033 server part);
    - `agentRunCollaborationStatuses`, an Org history's rows and `closed_task_executions`, and `hasCollaboration` (from the row's stored flag) return;
    - `LocalChildObservation` follows statuses only.
  - **Rule 2 (each run reached as itself):**
    - `DelegatedRunCommands`, the child `@` handling, the team child ack and SR-039's launch routing are removed;
    - web: `delegatedRunSubjects.ts` and `delegatedRunsStore` bind a selected local delegated row to its own run's context, stream, reads and commands in the agent-run, Team and Org views;
    - the Settings save is composed per run (SR-064), the options come per run (SR-065), and Stop is the run's own terminate;
    - the agent stream session follows its run by run ID (`agent-run-follower.ts`, SR-064).
  - **Peer runs (SR-066):**
    - `PeerAgentRun` / `PeerTeamRun` handles and `peerRunOf`;
    - `PeerChildObservation` is shared per peer run and numbered by each view;
    - the views' peer commands and the member projections go through the handle;
    - the run services forward a peer run's terminate;
    - removed: the roots' remote command branches, `remoteChildren`, `stopDelegatedExecution`, `DelegatedLaunchSelectionService`, `DelegatedChildLaunches` and the delegated save and options queries.
  - **DS-13 (SR-067):** `DelegatedWorkGuard.guard` asks open peer runs (`status()`); a node that does not answer is named as not asked. Delete tells `DelegationIndex.runDeleted` first. The startup build skips runs with no stored directory. A message to a run with no files is R-11.
  - **Web:**
    - back at `3228eff74b` (`12ea5a05d6`), plus SR-045 re-applied (`6e23a13f3b`) and rule 2;
    - the documents follow the branch server: `TaskRoot.delegatingRun`; no Memory explorer task fields; no host-scoped member file or trace queries;
    - `hubChildLoadTarget` serves only a peer child.
  - **Rule 3:**
    - base's agent-run view, started and closed events and list poll are recorded at `827f1e68dc` (`IMP-46-*`) and asserted by `agent-view-base-shapes.test.ts`;
    - found by it and fixed: an Org's row delegated by a mounted team's member sits in that team, as at base.
- Deviations from the design, for review:
  - a peer row's `@` mentions are refused (`REMOTE_RUN_MENTIONS_UNSUPPORTED`), because resolving them would need the delegator's root and would restore a stopped team;
  - an in-band mode-switch snapshot is sent at the current sequence (the designer's 27d6f014b9 wording);
  - rows nest by placement (team), as base did, not by delegator agent.
- Local validation and result:
  - server: type gate PASS (baseline 1012); full unit suite at `c46e5c330b` (IMP-47): 7940 passed, 1 failed (an architecture guard's list still named a default getter `305f2a8987` removed; updated in `16815d43a9`, then 20 of 20);
  - web (IMP-48): `codegen:check` current; type gate PASS at 90 (baseline shrunk from 93 in `782a9294f8`); guards and audit pass; full suite 762 of 762 files, 5737 tests;
  - contracts (IMP-49): collaboration 47 of 47, team 19 of 19, presentation 21 of 22 (FU-022, pre-existing); dist clean.
  - server integration (IMP-50): the first run on `782a9294f8` failed 15 tests in 3 files. Fixed in `c5142b111b`:
    - the view sessions delivered every event a microtask late (content cadence AC-003), now `inOrderViewDelivery`;
    - stale fakes and service names;
    - the team root's dead `openPackageSnapshotConnection` removed.
  - server unit on `c5142b111b` (IMP-51): 7933 passed. The 5 failures ran 500–1000 s each under the machine's load, and their six files pass alone (67 of 67).
  - Not run this round: the CPW E2E, the browser probes, and the rendered check (see the handoff).
- Next recipient or routing: Code Reviewer.

### IR-014 — CRR-017's Local Fixes (CR-461-036, CR-461-037); SR-069's tests; an Org's rows back in its root

- Triggering role, report path, and round: Code Reviewer CRR-017 (`code-review-report.md`, "Round 13"), through the Solution Designer, who released the Local Fixes and answered CR-461-035 as SR-069 (no code change; tests). Round 14.
- Triggering finding IDs: CR-461-036, CR-461-037 (`Local Fix`); CR-461-035 (Design Impact → SR-069). Large / High unchanged.
- Prior authoritative result: IR-013 at `c5142b111b` (docs `ee9d33664e`).
- Current authoritative result: `1c8264e4f6` (CR-461-037), `49f3db1047` (CR-461-036, the placement revert, SR-069 tests).
- Related solution / architecture-review revision IDs: SR-069 (with the architecture reviewer, narrow); ARCH-REV `N/A` for the Local Fixes. Related code-review revision IDs: CRR-017.
- Implementation delta:
  - **CR-461-037 (C13-03).** `agentRunDelegatedRunSubject` refuses a `task_team_member` without its Team run (throws, naming it); no fallthrough to an agent run. Its doc says a peer run is reached by its own identity (SR-066). New spec `delegatedRunSubjects.spec.ts`.
  - **CR-461-037 (C13-04).** `readRowEvent` takes the view's run and warns on an unreadable row, naming the row's run, the view's run and the reason, through the same `readRow` as `readViewRows`.
  - **CR-461-037 (C13-05).**
    - `run-collaboration-statuses-dtos.ts` is removed from the contracts' src and dist (it had no user and was not exported). The contracts rebuilt with no other dist change.
    - The server's identity type, the one with users, is renamed `DelegatedRunIdentity`.
    - `rowRunOf` is removed.
  - **Suggestion (taken for three of four).**
    - The standalone, Team and Org member projection services take the composition's `peerRunOf` as a required input instead of building one over the process channel.
    - The general process run supervisor still builds its own: it is created before step 7, where the channel arrives. Moving it would put the channel in the task side.
  - **CR-461-036.**
    - Characterizations at `827f1e68dc` (IMP-52):
      - story 5.2: a Team member delegates an agent run, which delegates further, and a Team run; then a Task closes;
      - story 5.3: an Org agent delegates a copy of its mounted team, and the mounted team's member delegates an agent run; then that Task closes.
    - Each captures the view snapshot, the row events, and the run list's row: `rootTeam` for a Team; `org` and `closed_task_executions` for an Org.
    - `team-org-view-base-shapes.test.ts` asserts the branch by key paths. Rule 2's parts (a row's own conversation and commands) are not part of a delegator's view.
  - **Found by CR-461-036 and fixed: the Org's row placement.**
    - Base hosts every new Org copy at the root (`agent-org-task-execution-adapter.ts:115`), including one delegated by a mounted team's member.
    - IR-013's `c46e5c330b` had placed such a row in the mounted team. That came from reading base, not from a recording.
    - Removed: `orgTeamOfDelegator`, `placeInMountedTeam` and the history read's team placement. The two tests now assert base's root placement.
  - **Found by CR-461-036 and fixed: the Team's list row.**
    - Base's Team history row carried its delegated rows in `rootTeam.task_executions`; the branch sent none. Base's web reads only `rootTeam.members` (`runHistoryTeamRows.ts:56`), but rule 3 asks for the same shapes.
    - `withTeamRows` (`api/graphql/types/listed-team-rows.ts`) fills them from the view's rows in `listWorkspaceRunHistory`, `workspaceRunHistory` and `projectRunHistory`, as the Org's history read does. Test in `listed-run-reads.test.ts`.
  - **SR-069.**
    - Characterization at `827f1e68dc` (IMP-53): base's composer gives a peer row no mention scope (`null`). The same spec runs on the branch (`peerComposerMentionScope.spec.ts`; `useComposerTarget.ts` is unchanged from base).
    - The Team and Org view handlers now have the server refusal test (`REMOTE_RUN_MENTIONS_UNSUPPORTED`, nothing posted), as the agent-run view's handler already had.
  - **Follow-ups.** My FU-024 is renumbered FU-025, because CRR-017's new follow-up took FU-024.
- Local validation and result (all on `49f3db1047`):
  - IMP-52: the Team and Org characterizations; branch 6 of 6.
  - IMP-53: base's peer composer scope is `null`; branch spec and handler refusals pass.
  - IMP-54: server type gate PASS (1012); unit 7949 passed, with 1 watcher timing test that passes alone.
  - IMP-55: web codegen current; type gate PASS (90); 764 of 764 spec files.
  - IMP-56: integration 483 passed.
  - IMP-57: contracts 47 of 47; dist clean.
- Next recipient or routing: Code Reviewer (Local Fix done; Large / High).
- Review result: `Pass`, CRR-018 (round 14; `code-review-report.md`). CR-461-035 is resolved by SR-069, CR-461-036 and -037 are resolved, and the Org placement revert is confirmed. C14-01 (the per-poll cost of the list's row reads) is held for API/E2E to measure. The Code Reviewer routes to API/E2E.
- Remaining limitations or risks:
  - The characterization covers one representative scenario per story (S1/S6/S10 and their Team and Org equivalents), not every step of `stories.py`. Steps that only send messages do not change a view's rows.
  - The peer rows of each story (5.1's peer node) are covered by the contracts and the peer tests, not by a two-node capture.

### IR-015 — The closed-Task input fence (SR-070, DS-15, G-4)

- Triggering role, report path, and round: Solution Designer, SR-070 (DS-15, G-4), passed by ARCH-REV-044 with one note (check before the root is resolved or restored). Round 15.
- My Unclear question, the refusal text, was answered the same day: user, application and resume input get base's input-fence text, and DS-15 now says so.
- Triggering finding IDs: SR-070 (G-4). Large / High unchanged.
- Prior authoritative result: IR-014 at `49f3db1047` (docs `709cf5dd99`, `f6df9f824b`; CRR-018 Pass).
- Current authoritative result: `07a3a5890e`.
- Related solution / architecture-review revision IDs: SR-070, ARCH-REV-044. Code review: `N/A` for this round so far.
- Base characterization (IMP-58, at `827f1e68dc`): the user's message to a delegated copy, through the root's `executeAgentCommand` as the view's stream handler called it:
  - Task closed and the copy released: `RUN_NOT_FOUND` (the copy had left its root);
  - Task closed, not yet released: `TASK_AGENT_RESOURCE_CLOSED`, "Your Task is DONE or CANCELLED, so you can't start new work." (`root-task-execution-resource-scope.ts:68, 164`, the input fence).
  - The second case is the nearest match on the branch, where a closed delegated run stays reachable as its own run.
- Implementation delta:
  - **`ClosedTaskFence`** (`agent-collaboration/execution/task/closed-task-fence.ts`):
    - A run that a Task names (`DelegationIndex.tasksOf`) and whose entry is closed (`RunTaskRecords.isOpen`, the Task side, the authority) is refused with `TASK_AGENT_RESOURCE_CLOSED` and base's text (`CLOSED_TASK_INPUT_MESSAGE`).
    - A run that no Task names is not fenced.
    - The task side creates one fence for the composition's consumers. The root builders and the manager, which already receive the tree and the Task records, build their own from them.
  - **Agent run, before resolve or restore:**
    - `StandaloneRunCommandPort.inputRefusal(runId)` is checked by `AgentRunCommandCoordinator.postUserMessage` before the `initializing` overlay or anything else is published. The ack is `rejected` with the code and text.
    - `StandaloneAgentRunRootManager.postUserMessage` checks again before `resolveRoot`.
    - New outcome kind `refused`; the coordinator clears its overlay if the refusal comes from the gate head.
  - **Agent run, at the gate head:** `StandaloneAgentRunRoot.postHostUserMessage` checks the fence in its gate before `postToHost`, so it never calls `readyHost`. This covers a loaded root and a peer owner's message.
  - **Team and Org, before restore:**
    - `AgentTeamStreamHandler.memberCommand` and `postToMember` check before `getActiveTeamRun` / `resolveManagedTeamRun` (and before a mention resolution, which restores). An interrupt is not fenced.
    - `AgentOrgStreamHandler` checks before restore, for uniformity; an Org run is never delegated.
    - The fence reaches both through the view sources (`RunViewSources.closedTasks`, from the composition).
  - **Team, at the gate head:**
    - `RootTeamRun.executeAgentCommand` refuses a post or an approval.
    - The materializer's member input check (`assertExecutionInputAllowed`, base's location) also asserts the fence. That covers application input and a teammate's message to a member of a closed delegated team.
  - **Restart resume:** `RestartResumer.resumeOne` skips a run whose Task is closed before `resolveOrRestore`, as "its Task is closed".
  - **Acknowledgement code:** `TASK_AGENT_RESOURCE_CLOSED` is added to the agent stream's SEND_MESSAGE ack code set, on the server (`AgentRunCommandErrorCode`) and the web (`agentCommandTypes.ts`). The shape is unchanged.
  - **Agent-to-agent delivery** keeps `ASSIGNER_ONLY_REACTIVATION_MESSAGE` (`CrossRunMessageDelivery`), unchanged.
- Tests:
  - `closed-task-fence.test.ts`, over the real tree and Task records: an open run takes input; a closed agent or team run is refused with base's text; after the assigner reopens, input is taken; a run no Task names, or whose Task was deleted, is not fenced.
  - `standalone-agent-run-root/closed-task-input-fence.test.ts`:
    - a closed run's message registers no root, loads none, activates nothing, binds nothing, posts nothing;
    - a loaded root refuses at its gate head without making its agent ready;
    - after the assigner reopens it, the message is posted; a deleted Task's run takes it.
  - `agent-run-command-coordinator.test.ts`: refused with the code and text; nothing resolved; no frame published on the run's stream.
  - `agent-team-stream-handler.test.ts`:
    - stopped team: a message (and a message with mentions) is refused before restore, with no snapshot or status after it;
    - live team: refused, while an interrupt still passes;
    - reopened: the message is posted.
  - `team-root-closed-task-fence.test.ts`, a real `RootTeamRun` over the real tree: the gate head refuses a message and an approval and starts no member; the members' input check refuses; open and deleted-Task runs take the message.
  - `agent-org-stream-handler.test.ts`: the fence is asked before restore.
  - `restart-resumer.test.ts`: closed runs are neither resolved nor posted to.
- Local validation and result:
  - IMP-58: base characterization.
  - IMP-59 (`07a3a5890e`): server type gate PASS (1012); unit 7966 passed, none failed.
  - IMP-60: integration 476 passed; the 3 failures (file watcher timing, and team communication at file level under load) pass alone, 18 of 18.
  - IMP-61: web type gate PASS (90); agent stream, store and composer specs, 149 files.
- Next recipient or routing: Code Reviewer.
- Remaining limitations or risks:
  - "No status frame in the delegator's view or the list" is shown by the fact that nothing activates or registers: the child's statuses come from its own run's activation. No end-to-end two-view test covers it.
  - A peer-started run here has no local Task entry, so its fence is its node's (SR-066), as at base.

### IR-016 — CR-461-038: the Org view's closed-Task fence removed

- Triggering role, report path, and round: Code Reviewer CRR-019 (`code-review-report.md`, "Round 15"): Fail, one `Local Fix`, no design impact. Round 16.
- Triggering finding IDs: CR-461-038. Large / High unchanged.
- Prior authoritative result: IR-015 at `07a3a5890e` (docs `5eebc80691`).
- Current authoritative result: `262afbd6bb`.
- Related solution / architecture-review revision IDs: SR-070, ARCH-REV-044 (unchanged). Related code-review revision IDs: CRR-019.
- Implementation delta:
  - Removed the Org stream handler's closed-Task check, `OrgViewSources.closedTasks`, its wiring in `api/websocket/index.ts`, and the Org handler test that asserted it. That branch could never refuse: `runReferenceOf` has no reference for an Org run, so `ClosedTaskFence.refusal` answers `null`.
  - The Team, standalone, resumer and materializer checks stay.
  - `RunViewSources.closedTasks` stays (the Team handler uses it); its doc now names the Team.
- Local validation and result: IMP-62 at `262afbd6bb`: server type gate PASS (1012); stream handler, Org, root-recovery and architecture tests, 53 files, 324 tests.
- Next recipient or routing: Code Reviewer (Local Fix done; Large / High).
- Remaining limitations or risks: C15-03 (a rendered two-view check that a refused input shows no status change) is held for API/E2E.
- Review result: `Pass`, CRR-020 (round 16; `code-review-report.md`). CR-461-038 is resolved. The Code Reviewer routes to API/E2E.


### IR-017 — CRR-021's Local Fixes (CR-461-039 … -044); SR-071 (CR-461-045, -046); two defects the SDV probe found

- Triggering role, report path, and round: Code Reviewer CRR-021 (`code-review-report.md`, failure-origin review of API/E2E round 4, API-REV-004): six `Local Fix` findings for implementation, two `Requirement Gap` findings for the Solution Designer. The designer answered those as SR-071, passed by ARCH-REV-045. Round 17.
- Triggering finding IDs: CR-461-039 … CR-461-044; CR-461-045 (F-18) and CR-461-046 (F-19) as SR-071. Large / High unchanged.
- Prior authoritative result: IR-016 at `262afbd6bb` (docs `9e0df63de6`, `a2dd7c8586`; CRR-020 Pass).
- Current authoritative result: `b87be2de33` (code `c8166c2685`; `b87be2de33` restates one web spec).
- Related solution / architecture-review revision IDs: SR-071, ARCH-REV-045. Related code-review revision IDs: CRR-021.
- Implementation delta, one commit per finding:
  - **CR-461-039 (`204ccbb5bd`), every listed agent gets a status in the snapshot.**
    - Before: the rows' statuses came only from the followers' cache. The cache is filled asynchronously and holds a status only from a live frame, so a stopped child or a newly listed row had none, and a live Org's snapshot failed its contract ("has no status record").
    - Now `readViewSnapshot` (`run-view-rows.ts`) gives each agent of each listed local row, in the same synchronous step:
      - the status read at the base;
      - else its run's current status from its own root (`LocalChildFollowers.currentStatuses`, `pairedAgentStatuses`);
      - else `offline`, with the row's own address.
    - A stopped Org's stored-mode snapshot (`org-view-session.ts`) carries no statuses, as its contract requires. Its rows' statuses follow as frames.
    - Tests: the Org handler (a live Org's snapshot gives every listed agent a status: a stopped delegated team's members, a newly listed run and a running one, and parses; the existing stopped-Org snapshot test still parses, with none) and the feed helper's followers.
  - **CR-461-042 (`297c9c8754`), a reactivated row is reopened, not started.**
    - Before: the feed told "reopened" by a closed Task entry still being present. The assigner's reactivation reopens that same entry, so the row came back as `TASK_EXECUTION_STARTED`.
    - Now `ChildRowsFeed` remembers, per run, the rows it reported closed in that run's stream (`reportedClosed`). One that comes back is `task_executions_reopened`, as at base.
    - Tests: the feed, and the agent-run, Team and Org view handlers.
  - **CR-461-043 (`e56d68f70a`), a follow-up to a run that cannot be restored is refused first.**
    - Before: `TaskDelegation.toExistingRun` assigned the follow-up Task, then failed at delivery with a raw `ENOENT` naming an internal path.
    - Now `createRunConversationAvailability` (`execution/task/run-conversation-availability.ts`, read-only, the conversation inspector) is asked after `assertAssignable` and before anything changes. The run can continue when its entry agent is live, or when its saved conversation is readable. A team run's entry is its coordinator, found in the team's saved tree.
    - Otherwise it refuses with base's text (`taskExecutionConversationUnavailable`, `TASK_EXECUTION_CONTEXT_UNAVAILABLE`, from base's `task-execution-conversation-availability.ts`): "The delegated Team at '…' cannot be restored: … Start a new delegation for this work." No path is named.
    - Tests: `run-conversation-availability.test.ts` (a live entry agent, nothing read; a stopped agent run's conversation inspected; a stopped team's coordinator found in its saved tree); task delegation (refused with base's text before anything changes, no path shown).
  - **CR-461-041 (`8cf765990d`), a delegated run's member gets its delegator's catalog copy.**
    - Before: a delegated team's lead delegating to a catalog address whose definition is one of its own run's members was refused. That definition is in its run, so its catalog offers nothing there, while its Manager gets the catalog copy.
    - Base answered such a hosted copy from its host's catalog. `DelegatorCatalog` (`execution/task/delegator-catalog.ts`) now gives the catalog copy its delegator's agent would get at that address, with the delegator's launch base and notes. It goes one hop, from the Task entry's delegator, and never offers the run's own definition (U7). `TaskDelegation.toNewRun` asks it when the sender's root answers "not found".
    - `collaboratorPortOf` (`run-history/services/run-collaborator-port.ts`) is the GraphQL resolver's port read, with the live roots passed in. The composition passes the run services; the resolver wraps it with the process ones.
    - Tests: `delegator-catalog.test.ts` (the delegator's catalog copy from its launch base; the delegator of each root kind asked through its port; never the run's own definition; nothing for a run no Task names) and the task delegation fallback (with no copy, the refusal stands).
  - **CR-461-044 (`85e99c74a0`, web), a delegated run opened from its delegator's view is listed once.**
    - Before: selecting a delegated row opens the run's own context (rule 2). The run list took every open agent context as a top-level run, so the worker was listed at the top of its workspace as well as under its delegator. The list's poll also tore that run's stream down, since it is not a listed run.
    - Now `delegatedRunsStore` records the runs it opened (`ownsAgentRun`, `ownsTeamRun`). The navigation projection (`runHistoryNavigationStoreActions.ts`) leaves their contexts out unless the list itself has the run. The poll (`reconcileDiscoveredActiveRuns`, `runHistoryLoadActions.ts`) leaves their streams alone.
    - A run the user opened as itself is listed and polled as before.
    - Spec: `delegatedRunsNotListed.spec.ts`.
  - **CR-461-040 (pinned in `85e99c74a0`), the Team view's row two hops down.**
    - SDV-02 passes from `8cf765990d` on: the helper's row is live in the stopped Team's view. CR-461-039's missing statuses were the likely cause.
    - Pinned on both sides:
      - the server's rows and live event for a row two hops down, over the real tree (`child-rows-feed.test.ts`);
      - the Team view state's listing of it in a stopped Team (`teamExecutionViewState.spec.ts`).
  - **SR-071 (`f6a427818c`), refusals in base's order, codes and texts.**
    - F-18 (R-8 before R-7): `CrossRunMessageDelivery.admit` answers in this order:
      - the assigner's continuation (R-6);
      - then a receiver whose Tasks are all closed: `TASK_AGENT_RESOURCE_CLOSED`, "Only the agent that assigned…", whoever sends (R-8);
      - only then runs of different open Tasks: CONFLICT (R-7).
    - F-19 (R-12): a team run's ID as `target_agent_run_id` is answered `TARGET_IS_TEAM_RUN` with its coordinator's run ID, whether the team runs or not. The coordinator comes from `GlobalAgentRunMessageRouter.teamCoordinatorOf`, from the composition: the live root, else the Task entry's entry agent, else the team's standing from its own file.
    - `delegate_task` with a team member's run ID gets base's "<id> is not one of your task agents. …" (M-34). The member-specific text (M-37) is withdrawn.
    - Tests: S20 (cross-run), R-12 with nothing live (router), the member's text (task delegation), the result catalogue.
  - **Found by the SDV-03 probe (Org), two defects:**
    - `eb5e9df040`: `AgentOrgRunService.getInspection` passed its rows' statuses for a stopped Org too. An inactive Org's snapshot may carry none, so the read failed ("AgentOrg status identity mismatch"). It now carries none, as in CR-461-039's stored-mode session. Test: `agent-org-inspection-child-statuses.test.ts`.
    - `c8166c2685` (web): the Org reopen staged the focused delegated row through `GetAgentOrgMemberRunProjection`, which the server refuses, so the reopen retried every few seconds and the rows never appeared.
      - `stageAgentOrgExecutionContext` now stages no delegated row (`orgDelegatedRunSubject`): it is read as its own run (rule 2).
      - The base-era specs that staged a delegated row now focus configured agents.
      - A new spec checks that a focused delegated row makes no member read. It fails without the fix.
      - One more base-era spec, `agentOrgInspectionApollo.spec.ts`, staged a delegated row's artifacts through the Org; restated on the mounted team's configured lead (`b87be2de33`).
- The SDV probe (API/E2E's `stopped-delegator-views-probe.mjs`, run here as the reproduction):
  - Before these fixes, SDV-03 failed twice. The cause was the two defects above, found in the backend log and the Org reopen's retried requests.
  - SDV-01 failed once at "the Manager started" and once at "worker reply live" in full runs before `eb5e9df040`. It passed alone at `eb5e9df040`, and in the full run at `c8166c2685`. No cause was found in the code. A timing flake in the probe under load stays possible.
  - SDV-02 passes from `8cf765990d` on.
- Local validation and result:
  - IMP-63 (`c8166c2685`): the probe, all cases, Pass (SDV-01 … SDV-03).
  - IMP-64: server type gate PASS (1012); unit 7978 passed. The one failure is the package folder watcher's timing test, which passes alone.
  - IMP-65: integration 477 passed. The six failures are file-watcher timing tests; they fail the same way at base back to back, with `fseventsd` saturated.
  - IMP-66: web codegen current, type gate PASS (90), guards pass, 5745 specs pass after one base-era spec was restated.
- Next recipient or routing: Code Reviewer (Local Fixes done; Large / High).
- Remaining limitations or risks:
  - SDV-01's two earlier failures in full runs have no cause found.
  - CR-461-042's reopened row is pinned by handler tests, not rendered.
  - CR-461-041 goes one hop: a run two hops down asks only its own delegator's catalog, as base's host did.
- Review result: `Fail`, CRR-022 (round 17), one `Local Fix` (CR-461-047). CR-461-039 … -046 and the two SDV-03 fixes are resolved.

### IR-018 — CR-461-047: one owner of a team run's coordinator; a dead export removed

- Triggering role, report path, and round: Code Reviewer CRR-022 (`code-review-report.md`, "Round 17"): Fail, one `Local Fix`, no design impact. Round 18.
- Triggering finding IDs: CR-461-047 (C17-01, C17-03). Large / High unchanged.
- Prior authoritative result: IR-017 at `b87be2de33` (docs `17fe4dfbbb`).
- Current authoritative result: `56e4ce773b`.
- Related solution / architecture-review revision IDs: SR-071, ARCH-REV-045 (unchanged). Related code-review revision IDs: CRR-022.
- Implementation delta:
  - **C17-01, `DelegationIndex.teamCoordinatorOf(teamRunId)`, the one owner of R-12's coordinator when the team does not run.**
    - It answers its standing's coordinator, from its own file, whether the team runs or not.
    - The Task entry's entry agent stays as the answer where the standing cannot answer, as SR-071's design names it ("the run's entry agent, else the team's own file"):
      - a peer team run, whose file is on its node (no file is read for it);
      - a local delegated team whose own file is unreadable.
    - A team run no Task names gets `null` and reads no file. A live one is answered by the live directory, as before. So an arbitrary ID in `send_message_to` never reads a file.
    - `GlobalAgentRunMessageRouter` asks the live directory, else `coordinators.teamCoordinatorOf` (a `Pick<DelegationIndex, "teamCoordinatorOf">`). The composition passes the index; its inline rule is gone.
    - `delegation-index.ts` is at 499 effective lines.
  - **C17-03:** removed `standaloneNavigationTarget` (`runHistoryNavigationStoreActions.ts`, unused) and its now-unused `AgentStatus` import.
- Tests: `delegation-index-agents.test.ts` "DelegationIndex.teamCoordinatorOf":
  - a stopped delegated team, and a top team run that delegated, answer from their own files;
  - a peer team run answers from its entry, with no file read;
  - a team run that is not a node, an agent run's ID and an unknown ID give `null`, with no file read;
  - an unreadable file falls back to the entry.
  - The router and backend-factory tests pass the owner.
- Local validation and result: IMP-67 at `56e4ce773b`:
  - server type gate PASS (1012); delegation, communication, backend factory and architecture tests, 78 files, 663 tests;
  - web type gate PASS (90); store specs, 119 files, 1165 tests.
- Next recipient or routing: Code Reviewer (Local Fix done; Large / High).
- Remaining limitations or risks: C17-02 (a run two hops down at an address only the top run's catalog offers) is held for API/E2E, as CRR-022 says.

- Review result: `Pass`, CRR-023 (round 18; `code-review-report.md`). CR-461-047 is resolved. The Code Reviewer routes to API/E2E. Its note: `delegation-index.ts` is at 499 effective lines, so a further owner there goes into its own file.

### IR-019 — CRR-024's Local Fixes (CR-461-048 … -053) and SR-072 (F-23, F-24, F-26, F-30)

- Triggering role, report path, and round: Code Reviewer CRR-024 (`code-review-report.md`, the failure-origin review of API/E2E round 5, API-REV-005): six `Local Fix` findings, CR-461-048 (data loss, first) … -053. The Solution Designer's SR-072 answers CR-461-054 (Design Impact, F-26) and CR-461-055 (Requirement Gap: F-23, F-24, F-27, F-30, F-31, F-36, K-13). ARCH-REV-047 passed it, with one wording fix (deliver every queued frame). SR-073 answers my F-32 question. Round 19.
- Triggering finding IDs: CR-461-048 … -053; SR-072 (CR-461-054, -055); SR-073. Large / High unchanged.
- Prior authoritative result: IR-018 at `56e4ce773b` (CRR-023 Pass).
- Current authoritative result: `a0c3a691dc`.
- Related solution / architecture-review revision IDs: SR-072, SR-073; ARCH-REV-047. Related code-review revision IDs: CRR-024.
- Implementation delta:
  - **CR-461-048 (`f0d03a4cda`), data loss.**
    - 461's migration was registered ahead of the released `20261020_remove_skill_improvement_data`. On data that had not run 20261020, it made the improver's delegated copy a run of its own, and 20261020 then deleted that folder as a helper run (F-25).
    - It is now registered last, after every migration released in v1.5.13-beta.6 (`3228eff74b`). No dependency runs the other way: 461's migration reads none of the four it now follows.
    - New `app-data-migration-registry-order.test.ts` pins two rules: the released migrations come first, in their released order; every later one follows them in date order, none dated before the newest released one. It fails on the old registry.
    - Five placement tests that pinned positions against the registry's end are restated relative to their own place: collaborators, delegated-copy, Skill Improvement removal, Memory Sync names, raw-trace manifest names.
    - API/E2E's `remove-skill-improvement-data-startup.e2e` on a rebuilt `dist`:
      - The copy's folder is kept.
      - The one remaining difference is its `run_metadata.json`, which 461's migration rewrites, as it converts every delegated copy.
      - SID-2's "every other file byte-identical" predates 461 (autobyteus-205) and needs restating by API/E2E.
  - **CR-461-049 (`bffd55fb01`).**
    - `toExistingRun` compares the two runs' tree tops before the Task side's assigner check.
    - A sender in another tree gets base's "<id> is not one of your task agents. …". At base the run was hosted in another root.
    - In the same tree, an agent other than the last assigner keeps the Task side's text.
  - **CR-461-050 (`10e916b96c`).**
    - Before any placement, `toNewRun` refuses the sender run's own name (its Task entry's `recipientAddress`), or an address inside it, with COLLABORATION_SELF_TARGET_REJECTED. At base the copy was an instance at that address, so CM-1 caught it.
    - A team run gets the own-team text, an agent run the self text.
  - **CR-461-051 (`dbfd2d4707`).**
    - `ClosedTaskFence.refusal(run, delegated)`: while any Task record cannot be read, a delegated run that no readable Task names is refused with the Task side's message, TASK_AGENT_RESOURCES_UNAVAILABLE. A run is delegated when its own file has `delegatedFrom`. This is 469 DEC-010: such a run could not be told apart from an unreadable Task's work.
    - Only the run's own root knows it was delegated, so it is asked at the standalone and Team gate heads and in a Team member's input check, before the agent is made ready. No model request follows.
    - The before-restore check cannot know this, so a refused run's root is loaded, but its agent is not made ready.
    - `RunTaskRecords.unreadable()` was added. The code joins the SEND_MESSAGE ack codes on the server and the web.
  - **CR-461-052 (`7a3c12b4e4`):** both new-run paths, local and peer, record any failed dispatch as base's TASK_DISPATCH_FAILED with its message.
  - **CR-461-053 (`dbc26d1466`, web).**
    - F-33: `topLevelRunSources` is now the one owner of the top-level runs for both the desktop's navigation and the phone's run list. It drops retired runs, and a delegated run opened from its delegator's view unless the list has it.
    - F-34: an Org's delegated row on the phone commits its open only once the run's own context is open (`delegatedRunsStore.whenOpen`), and fails when that open fails. Before, it committed at once, found no target and went back to the list.
    - F-32: SR-073, no web change: a listed Team's or Org's delegated rows show once its view is open, as at base. MSP-51 is to open the Team first (API/E2E).
  - **SR-072 F-30 (`c41d6ac2dc`):** `DelegatedWorkGuard` counts an idle run as working (running, initializing or idle), local and peer.
  - **SR-072 F-23 (`3b7e6a99d7`, test only).**
    - While the Task is DONE, the assigner's message to a team's member is refused as for the run (R-8, S10), with base's Task-side text (`1160bb4f33` aligns the contract).
    - After the Task reopens, it continues the run whichever agent it names (R-6, S11, the model's `_admit`).
    - The e2e expectation at `task-reactivation-root-visibility` step 11 (a member after IN_PROGRESS) changes: API/E2E.
  - **SR-072 F-24 (`fcf42b916d`):** a run whose Tasks were all deleted takes a new Task from the delegator its own file names (U11).
    - `RunOwnAgentsReader.delegationOf` reads the run's own `delegatedFrom`, stored address, definition and entry agent.
    - `RunOwnDelegations` completes a team run's address, which its file does not keep, from its delegator's catalog (`CollaboratorAdmission.catalogAddressOf`).
    - The Task side accepts the assignment from that delegator (`ownDelegatorAgentRunId`) and writes the run's own address.
  - **SR-072 F-26 (`a0c3a691dc`), the Team tab's messages.**
    - Snapshot: `collaborationParticipantMessages` composes X's log with every local run below it, open or closed, at every depth, with base's `composeMessageLogs` and in-view rule (`run-view-messages.ts`).
      - Its tree is X's agents and those of its open rows.
      - Past participants come from the whole subtree.
      - This read has no paging, at base or now.
    - Live: `RunMessagesFeed`, held by `RunViewStreams` as `messages`.
      - A message is published once: inside a run at its commit; between runs at the receiver's commit. The sender's commit and the peer paths do not publish it, as at base.
      - Each open stream of either run, or of a run above either (`chainOf`), numbers it as its kind's message event.
      - The port's `publishToRootView` became `publishMessage(message, senderRun)`.
- Tests: one per finding, each confirmed to fail without its fix where the fix changes code:
  - the registry order;
  - the CM-1 own name;
  - the cross-tree refusal;
  - the fence and both gate heads with damaged data;
  - the dispatch code (local, the peer's refusal, an unreachable peer);
  - the phone's list and the Org open;
  - the guard's idle run;
  - F-23's member;
  - F-24 at the delegation, the Task side, the reader, the owner and the catalog;
  - F-26's composition (a two-hop message in the Manager's tab, each once), the feed (each view once, a closed run still below, an unopened view gets nothing) and the engine's publication (inside, at the receiver, not at the sender's commit).
- Local validation and result:
  - IMP-68: CR-461-048's registry order, the startup e2e on a rebuilt `dist`, and every migration test (625).
  - IMP-69 (`a0c3a691dc`): server type gate PASS (1012); unit 8006 passed.
  - IMP-70 (`dbc26d1466`): web codegen current, type gate PASS (90), guards pass, 5749 specs.
  - IMP-71: integration 479 passed. `team-communication-api` needed the Studio services the participant read now always uses (test fix `a5b80f3d7a`). The watcher's timing failures fail the same way at base.
  - IMP-72: the views probe. SDV-02, -03 and -04 pass. SDV-01 failed at "the Manager started" in the full run (the worker was still running; the send never reached the server), as in round 17, and passes alone.
- Next recipient or routing: Code Reviewer (Local Fixes and SR-072 done; Large / High).
- Remaining limitations or risks:
  - F-26 live: a message between a run in X's subtree and a run outside it (X's own delegator) is numbered in X's stream, as the design says ("either run"). Base's in-view rule keeps it out of X's composed read, so a Team tab could show it live but not after a reload.
  - CR-461-051: for damaged Task data, the refusal comes at the gate head, after the run's root is loaded, not before. Only the root knows the run was delegated.
  - SDV-01's flake at "the Manager started" stays: no cause in the code was found. The worker is still running when the probe clicks.
  - Expectations API/E2E restates, no code change: SID-2 (byte-identical), `task-reactivation-root-visibility` step 11, MSP-51 (open the Team first), F-31, F-36, K-13, and `teammate-delivery-task-closure-race` (a refused message is never shown).


### IR-020 — SR-074: one in-view rule for the Team tab's read and live; the unreadable-record check before the root loads

- Triggering role, report path, and round: Solution Designer SR-074, answering my round-19 point (CR-461-056) and the code reviewer's suggestion on CR-461-051. ARCH-REV-048 passed it, with one detail: bind the read's set and filter to `own(X)` / `tree(X)` taken at one moment. Round 20, before CRR-024's re-review.
- Triggering finding IDs: CR-461-056; CR-461-051 (placement). Large / High unchanged.
- Prior authoritative result: IR-019 at `a5b80f3d7a` (docs `750f180ef5`), not yet reviewed.
- Current authoritative result: `958cb22462`.
- Related solution / architecture-review revision IDs: SR-074; ARCH-REV-048.
- Implementation delta:
  - **One rule:** base's `isMessageOfView(message, own(X), tree(X))`, where `tree(X)` is X's agents and those of its open subtree's local runs (`collaborationTreeOf(X).rows`), for both the read and live.
    - The read (`composeRunViewMessages`) composes the logs of X and its open subtree only. That set is taken once, at the read's start (`DelegatedRunAgentsReader.openRunsBelow`, which replaces `runsBelow(…, "all" | "open")`), and the tree is that set's agents.
    - `RunMessagesFeed` numbers a message in a view only when the rule holds for its X at that moment, by the runs of the message's two agents: both in X's tree (X and its open local rows), or one of them is X.
    - Results: a message between a run below X and X's own delegator is shown neither live nor on reload; a two-hop message is shown in both; a closed run's messages with X's own agents stay, because they are in X's own log.
    - Past participants still come from the whole subtree, to name a closed run's agents in X's own log.
  - **CR-461-051, before the root loads:** `ClosedTaskEntryFence`, next to `ClosedTaskFence`, answers asynchronously where input enters.
    - It reads the run's own file (`RunOwnAgentsReader.delegationOf`) only while a Task record is unreadable.
    - The standalone manager (`inputRefusal` is now asynchronous, and the coordinator awaits it), the Team stream handler and the restart resumer use it. The resumer names an unreadable record as such.
    - A loaded root's gate head and a member's input check keep the synchronous check with their own `delegatedFrom`.
- Tests:
  - the feed: a message between a run below X and X's delegator is not in X's stream but is in the others'; after closure, messages between closed runs leave the Manager's view while its own agents' stay; a message inside the Manager reaches only its view;
  - the read: on reload, X's view leaves out the message with its delegator and keeps the two-hop one; the reader's `openRunsBelow`;
  - the entry fence: no file read without damage; a delegated run refused, a user's run not;
  - the standalone manager: refused before the root loads, nothing registers or runs; a loaded root still refuses at its gate head;
  - the fakes now asynchronous: coordinator, resumer, Team handler, lifecycle.
- Local validation and result: IMP-73 (`958cb22462`): server type gate PASS (1012); unit 8010 passed; integration 481 passed. The two failures are the file watcher's timing tests, which fail the same way at base.
- Next recipient or routing: Code Reviewer, with IR-019 (Large / High).
- Remaining limitations or risks: the web and the views probe were not rerun; the web did not change, and the server change narrows what a view is sent. SDV-01's flake (IR-019) stays.

- Review result: `Pass`, CRR-026 (round 20, with IR-019; `code-review-report.md`). CR-461-056 is resolved, and the CR-461-051 check now runs before the root loads. The Code Reviewer routes to API/E2E.

### IR-021 — CRR-027's Local Fixes (CR-461-057 … -063); SR-075, SR-076

- Triggering role, report path, and round: Code Reviewer CRR-027 (`code-review-report.md`, the failure-origin review of API/E2E round 6, API-REV-006): seven `Local Fix` findings, CR-461-057 first (a lost message, a regression). The Solution Designer's SR-075 answers CR-461-064 (F-39, F-40, F-41, K-14) and SR-076 answers my TDR-001 question. Round 21.
- Triggering finding IDs: CR-461-057 … -063; SR-075; SR-076 and its follow-up decision (`acfebaa23a`). Large / High unchanged.
- Prior authoritative result: IR-020 at `958cb22462` (CRR-026 Pass).
- Current authoritative result: `d2396dd545`.
- Related solution / architecture-review revision IDs: SR-075, SR-076. Related code-review revision IDs: CRR-027.
- Implementation delta:
  - **CR-461-057 (`573e6a7d07`, web), the lost message.**
    - Bisected with the probe held fixed: the web was unchanged, and SR-074's server change (`958cb22462`) only shifted the timing.
    - Browser logging (temporary, reverted) showed the cause. Selecting a delegated row in an agent run's view opens the row's own run (rule 2). Until that run was open, `childTargetFor` answered null and the active target fell back to the delegator's own context.
    - The probe's typing therefore went to the Manager's draft. When the worker's run opened, the composer switched to the worker's empty draft, and Enter sent nothing. A user could likewise send text meant for the worker to the delegator.
    - Now the agent-run view answers no target while the selected delegated run opens (`agentRunCollaborationStore.isSelectedChildOpening`), as the Team and Org views already did. The text the user types stays in the run it was typed for.
    - SDV-01 passes 3 of 3 alone (it failed 4 of 4). The "Manager started" flake does not recur.
  - **CR-461-062 (same commit), the phone.**
    - `useMobileRunOpening` is the one owner for every view's delegated rows: an agent run's view, a Team and an Org.
    - A row its shared action selected commits once its own run is open (`delegatedRunsStore.whenOpen`), and fails when that open fails. Before, only the Org path did this (F-34).
  - **CR-461-058 (`5560546763`):** the delegator's message to a delegated agent run that no Task names (its Task deleted) gets base's `TASK_NOT_FOUND`, "The Task was deleted, so its task agent cannot continue."
    - The check reads the run's own file for its delegator.
    - Anyone else's message falls through as before.
    - A team member's agent ID does not name its run, so a deleted Task's team run is not covered.
  - **CR-461-059 (`374f1da5e7`):** `asRefusal` turns only delegation refusals and the Task side's rejections into `{ delegated: false }`, as base did. An unknown Task key reaches the tool as `{ error: { code: "TASK_DELEGATION_ERROR", message } }`.
  - **CR-461-060.**
    - TDR-002 (`8d23b7ff7a`): `RootMessageAppend.prepare` checks the Task scope before the root's admission. A closure while the message waits for the log is now answered `TASK_AGENT_RESOURCE_CLOSED`, not a commit conflict, in all three root kinds.
    - TDR-001 is SR-076, base's behavior. A closure during the durable write keeps the record and answers the refusal.
  - **SR-076 follow-up (`d2396dd545`).** With the record only in the receiver's log, a reload of the sender's view lost what the live view showed (SR-074). The designer chose option (1).
    - The receiver's engine marks a refusal of a message from another run that it answered after its durable write (`RecordedRunRefusal`, `recordedByReceiver: true`). Both cases are marked: the Task closing, and the recipient stopping. `RootMessageAppendControl.recorded()` tells it.
    - `CrossRunMessageDelivery` then commits the message to the sender's log too (`commitSentToRun`, which does not publish it again). The agent gets the receiver's refusal without the mark.
    - A refusal before the write is not marked, and nothing is recorded. A message inside one root, or from a peer node, answers as before.
  - **CR-461-061 (`a7c04bf9ab`).**
    - Cause: a member whose start failed in a way that is not retry-safe keeps its rejected readiness attempt, and `tryPrepareTerminationIfQuiescent` took it as work in flight. The member's team was never quiet.
    - Fix: a settled attempt is no longer in flight; the run and activation checks after it still guard anything left behind.
    - It isn't Org-specific: only the e2e's Org variant has a broken member.
  - **CR-461-063, no product change (raised with the designer).** The delegated run's Stop records `terminatedAt`. S27 then has the same agent call `send_message_to`, which restores the run, and any restore clears `terminatedAt` (base). The model's `send_by_run_id` doesn't reactivate the sender: a model or expectation gap.
  - **SR-075 F-41, no product change (raised with the designer).** The card is a live ERROR event on the delegated run's own stream (base's mechanism). All three views bind a selected delegated row through `delegatedRunsStore`. The e2e reads it from the Org's view stream, which carries statuses only; only its Org variant has a broken member.
- Tests: each fix's test fails without it and passes with it.
  - web: the active target while a child opens; the collaboration store's opening state; the phone's agent-view and Team delegated rows;
  - server: the deleted-Task refusal; the unknown key's error shape; TDR-002 in the append; the settled failed start, quiet, and a quarantined cleanup, not; the recorded refusal (the engine marks it after the write and not before; the delivery records it on the sender's side, and a plain refusal writes nothing there).
- Validation: IMP-74, CR-461-057's bisect and SDV-01 (3 of 3), and the web suite. IMP-75, the server type gate and unit and integration suites at `d2396dd545`.
- Remaining risks:
  - A deleted Task's team run is not covered by CR-461-058 (no file names a member's run by its agent ID).
  - SDV-01's readiness wait also matches the Manager's own conversation. It could wait for the worker's name instead.

### IR-022 — A delegated team run's deleted Task (CR-461-065); the remote base merged

- Triggering role, report path, and round: Code Reviewer CRR-028 (`code-review-report.md` "Round 21": Fail, one `Local Fix`; CR-461-057 … -064 resolved, CR-461-058 for agent runs only). The reviewer also suggested merging the remote base (28 commits behind), so API/E2E round 7 tests the merged state. Round 22.
- Triggering finding IDs: CR-461-065. Large / High unchanged.
- Prior authoritative result: IR-021 at `d2396dd545`.
- Current authoritative result: `5c7d2a9240` (CR-461-065 `7c8f2db955`; merge `152ae2cbb8`; the phone cases renumbered `3e9b61af1c`; the baseline fix `5c7d2a9240`).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-028.
- Implementation delta:
  - **CR-461-065 (`7c8f2db955`).** `RunOwnAgentsReader.delegationOfAgent(agentRunId)` reads the delegation of the run an agent is in, from the runs' own files. It returns the agent run's own delegation, else that of the stored team run the agent is a member of (any member at any depth).
    - The team run is found by reading each stored team run's own file. That happens only on this path: a target the tree does not know whose ID names no delegated agent run. A file that cannot be read is skipped, with a warning naming it.
    - `CrossRunMessageDelivery.deletedTaskRefusal` uses it. After the Task is deleted, the delegator's message to the team run's coordinator, or to any other member, gets base's `TASK_NOT_FOUND`, as for an agent run. Anyone else's message is not this route's, as before.
  - **Merge (`152ae2cbb8`).** `origin/personal` at `3d738de6e6`: 28 commits (autobyteus-460, -23, -24, and the beta.6 delivery record). No conflicts and no dependency changes. Both composition roots gained only the base's `integrationRunAccess` argument, next to this ticket's changes.
  - **Phone case IDs (`3e9b61af1c`).** autobyteus-23 took MSP-50 … MSP-52 for its code-wrap cases. This ticket's stopped-delegator phone cases are now MSP-53 … MSP-55 (agent, team, org), so the probe's IDs are unique again. Earlier evidence keeps the old numbers.
- Tests:
  - the reader's `delegationOfAgent`: an agent run, a delegated team run's coordinator and its other member, a user-started team's member and an unknown ID (none), and no team runs stored at all;
  - the delivery: the team case, for the coordinator and for another member, from the delegator and from someone else.
  - The new tests fail without the fix.
  - **Baseline fix (`5c7d2a9240`).** The merged state failed the web type gate on one cross-package test: `codex-turn-lifecycle-native-to-live-projection.integration.test.ts` did not pass `workspaceSkills`, which autobyteus-460 made required in `CodexAgentRunContext`. Neither side changed the test, so `origin/personal` fails the same way. The test now passes `workspaceSkills: null`, and it passes.
- Validation: IMP-76 on the merged state. Server: type gate PASS, unit 8045 passed, integration 492 passed with 3 failed (only the file watcher's timing; alone it passes 14/14 twice, and once 13/14 at load 37 on a different test). Web: 5757 passed; the type gate passes after the baseline fix.
- Remaining risks: SDV-01's readiness wait also matches the Manager's own conversation (round 21). The ticket's earlier evidence names the phone cases MSP-50 … MSP-52.
- Next recipient or routing: Code Reviewer, review of CR-461-065 and the merge: **Pass (CRR-029**, `code-review-report.md` round 22). The reviewer routes to API/E2E. Its non-blocking note: on the unknown-ID refusal path, `teamRunOfMember` reads every stored team run's file. If that cost ever matters, the run's delegation could be recorded in memory when its Task is deleted. No action taken.

### IR-023 — CRR-030's reopened Local Fixes: CR-461-061 (F-43) on the real path, CR-461-059 (F-47) restricted; SR-077

- Triggering role, report path, and round: Code Reviewer CRR-030 (`code-review-report.md`, the failure-origin review of API/E2E round 7 on `a529abcbdd`), released by the Solution Designer. Two reopened Local Fixes, CR-461-061 and CR-461-059. CR-461-066, the Requirement Gap, was answered by SR-077 with no product change. Round 23.
- Triggering finding IDs: CR-461-061 (F-43), CR-461-059 (F-47); SR-077 (CR-461-066: K-15, Q-1). Large / High unchanged.
- Prior authoritative result: IR-022 at `a529abcbdd` (CRR-029 Pass).
- Current authoritative result: `a18c16f5d8` (F-47 `0e1bb399e2`; CR-461-061 `a18c16f5d8`).
- Related solution revision IDs: SR-077. Related code-review revision IDs: CRR-030.
- Implementation delta:
  - **CR-461-059 (F-47, `0e1bb399e2`).** Round 21 over-reached. Base gave the `{ error: { code: "TASK_DELEGATION_ERROR" } }` shape only on the `recipient_address` path. Its run-ID path (`assignToExistingCopy`) refused any coded error as `{ delegated: false, message }` (`refusalCode`). `toExistingRun` now uses that rule (`asRunIdRefusal`), and the new-run path keeps `asRefusal`. An uncoded failure is thrown on both paths, as at base.
  - **CR-461-061 (F-43, `a18c16f5d8`), found on the real path.** I started from DTL-005 failing (IMP-77). Temporary logging, reverted, showed the Org's squad answering "open work" at the grace's fire; every other team was quiet.
    - **Cause 1.** `RootTeamRun.shutDownIfQuiet` checked `hasOpenExecutionWork()`, which counts a member in `error` (base's rule as well). A member whose start failed therefore held its Team forever.
      - At base, only a peer-started Team (DS-004) had that check. A delegated task Team (`tryShutDownRootTaskTeamIfQuiet`) ended on its all-or-nothing quiescent preparation alone, which DTL-005 expects. DS-7 gives every delegated Team one rule.
      - With no hosted children left, the check only added the failed member, so it is removed. A member starting or running still makes the preparation refuse. Round 21's `a7c04bf9ab` (a settled failed start is not in flight) stays: the preparation needs it.
    - **Cause 2.** After the copy shut down and was restored, the Org's fresh view still showed the writer `error`. The views' child-status cache (`LocalChildObservation`) keeps each agent's last event, and the writer has no runtime to report `offline` when its Team ends. Base's fresh view read the hosted copy's live statuses.
      - `TeamPairedAgentAccess`, the owner that follows a Team across its roots, now reports each member `offline` when the followed Team ends quietly (lifecycle `ending: "idle_shutdown"`). A remote delegator's view gets the same.
      - The status frame moved to the paired-agent contract (`pairedAgentStatusFrame`), shared with `LocalChildObservation`.
    - DTL-005 now passes in every root.
- Tests (each new one fails without its fix):
  - F-47: by `target_team_run_id` and by `target_agent_run_id`, an unknown key is `{ delegated: false, message }`; an uncoded failure is thrown. The recipient path's test is unchanged.
  - CR-461-061: a peer-started or delegated Team with a member in `error` (the run's open work counts it) idles out. The harness's fake runs now keep the status their last event set.
  - The Team access reports `offline` for each member on a quiet shutdown.
- Validation:
  - IMP-77: DTL-005 through the real path, before and after each fix.
  - IMP-78 at `a18c16f5d8`:
    - server type gate PASS; unit 8048 passed;
    - integration 491 passed, 4 failed. All four are the file watcher; alone it passes 14/14 twice;
    - DTL-005 passes again.
  - The web is unchanged this round (IMP-76).
- Remaining risks:
  - A peer-started Team with a member in `error` now also idles out. Before, the extra check kept it running; base's delegated task Team behaved this way. DS-7 gives every delegated Team one rule.
  - SDV-01's readiness wait also matches the Manager's own conversation (round 21).
- Next recipient: Code Reviewer, a full review of the whole change.

### IR-024 — A delegator's open view follows a stopped and restored delegated run (CR-461-067); C23-03

- Triggering role, report path, and round: Code Reviewer CRR-031 (`code-review-report.md`, the full review of the whole change at `2ae95ff56a`): Fail, one `Local Fix`, CR-461-067. CR-461-061, -059 and -066 were resolved. Round 24.
- Triggering finding IDs: CR-461-067; C23-03 (cleanup); C23-02 (not a finding, noted for API/E2E). Large / High unchanged.
- Prior authoritative result: IR-023 at `2ae95ff56a`.
- Current authoritative result: `7569c83a4c` (CR-461-067 `f9c2c351a4`; C23-03 `7569c83a4c`).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-031.
- Implementation delta:
  - **CR-461-067 (`f9c2c351a4`).** A Stop of a local delegated run ends the access's observation, by both accesses (DS-006, the peer owner's rule). `LocalChildObservation` only cleared its entry, so a delegator's open view stopped following that row. After the run's restore, the row kept `offline` or `error` while the run worked, and so did the snapshot that reads the cache.
    - The follower now follows a view's open row on (`observe`): when the access ends the observation, the row's agents read `offline` and the run is observed again.
    - `offline` is what a read of the stopped run gives, including a member whose start failed.
    - After the new observation, the restore is followed by the access's own means: the agent run's host-ready hook on the root it loads, which never starts its agent; the Team's lifecycle.
    - A row that is no longer open (its run deleted, its Task closed) is not followed again.
    - The accesses are unchanged: ending on a Stop stays the peer owner's rule.
  - **C23-03 (`7569c83a4c`):**
    - `DelegatedTeamIdleShutdown` no longer names a live lease (461 removed it), and `arm()` is private;
    - `CollaborationTree`'s class comment reads as one sentence again.
- Tests (each new one fails without the fix):
  - through the real `StandalonePairedAgentAccess` and `TeamPairedAgentAccess`: a delegator's open view with an agent row, and with a team row, is stopped and then restored. The row reads `offline` at the Stop (the team's failed member too), and the restored run's statuses reach the view.
  - A row that left the view is not followed after its run ends.
- Validation (IMP-79 at `7569c83a4c`):
  - server type gate PASS;
  - unit 8050 passed, 1 failed: `skill-folder-watcher.test.ts`, a filesystem watcher test merged from autobyteus-460. Alone it passes 7/7 twice;
  - integration 492 passed, 3 failed, all in the file watcher. Alone it passes 14/14 twice;
  - DTL-005 passes.
  - The web is unchanged (IMP-76).
- Remaining risks: re-observing a stopped agent row loads its root again (never its agent), as a view that opens on a stopped row already does. History counts a run active only while its agent runs, and a history delete ends a lingering root.
- Next recipient: Code Reviewer, a targeted delta on the follower and its accesses.
- Result: Code Review **Pass (CRR-032**, `code-review-report.md` round 24): CR-461-067 and C23-03 resolved. The reviewer routes to API/E2E.

### IR-025 — CRR-033's Local Fixes (CR-461-070, CR-461-071); SR-078 (CR-461-068, CR-461-069)

- Triggering role, report path, and round: Code Reviewer CRR-033 (`code-review-report.md`, the failure-origin review of API-REV-008 on `fdf5ad8380`), released by the Solution Designer. Two Local Fixes, CR-461-070 and CR-461-071. Two Design Impacts, CR-461-068 and CR-461-069, answered by SR-078 as revised after ARCH-REV-049 and ARCH-REV-050 (Pass): one follow-up migration per predecessor. Round 25.
- Triggering finding IDs: CR-461-068 … CR-461-071. Large / High unchanged.
- Prior authoritative result: IR-024 at `fdf5ad8380` (CRR-032 Pass).
- Current authoritative result: `e0af2eed44` (the follow-ups' boundary fix after `4d8ff85d28`).
- Related solution / architecture-review revision IDs: SR-078; ARCH-REV-049, ARCH-REV-050. Related code-review revision IDs: CRR-033.
- Implementation delta:
  - **CR-461-071 (F-52, `c7ea90a895`).** `RunViewChildren.read` serves the agent run's collaboration read, the Org inspection and the Team history.
    - Before: it read the rows fresh (an unreadable row left out) but built the statuses from `DelegationIndex.agentsOf`, the parts read earlier. A run whose own file became unreadable while the server ran was still named by a status, and the contract rejected the whole view.
    - Now it uses the views' one builder, `readViewSnapshot`: a status for every agent of the rows read, from each run's own root, else `offline`. The streams already did.
  - **CR-461-070 (F-50, `2a029f2af8`).** `DelegatedRunRestorability` (new) asks base's builder, `taskExecutionConversationUnavailable`, before input restores a delegated run. It finds the run's entry from its last Task entry, else its own file. A live entry agent passes without a read; a run the user started is not asked. It is asked:
    - at the agent stream's entry: the root manager's `inputRefusal`, after the closed-Task fence; the ack carries `TASK_EXECUTION_CONTEXT_UNAVAILABLE` and base's text; the code is added to both sides' ack code types;
    - for a stopped team run's message on its own stream: sent as `TEAM_SEND_MESSAGE_REJECTED`;
    - for the delegator's `send_message_to`: `CrossRunMessageDelivery`, before the receiver's root is restored.
    - The manager builds its own instance for agent runs, with its own liveness. Step 6 builds one for the team stream and the delivery.
  - **CR-461-069 (SR-078 a, `d374ced87b`).** Each run service has `restoreRefusal`, one helper (`rootRestoreRefusal`): the token-usage restore check, then the package catalog, with base's codes and texts.
    - The stopped team and Org views ask it before they read the stored file. Refused, the connect answers `TEAM_NOT_FOUND` or `AGENT_ORG_NOT_FOUND`.
    - The first message (`restoreForInput`) answers the admission's own code and text.
    - A stored file that passes admission but cannot be parsed, at connect or at restore, is answered `TEAM_RUN_NOT_RESTORABLE` or `AGENT_ORG_RUN_NOT_RESTORABLE`, "… cannot be restored: its saved state cannot be read. Its files were left unchanged." The detail goes to the log only.
    - A stopped team's failed restore was answered `RUN_NOT_FOUND` before, and an Org's with the raw error.
  - **CR-461-068 (SR-078 b and c).**
    - **(b)** Before the predecessor finishes, a preserved copy's Settings save answers base's `INTERNAL_ERROR` "Run ownership could not be verified". This is unchanged behavior (`studio-run-model-config-service.ts`), and API/E2E's TAU-2 states it.
    - **(c), `4d8ff85d28`.** The main migration is now a plan of steps; its own plan is every step. Three follow-ups apply our steps with our builders:
      - `20261114_preserved_items_after_task_agent_own_run_v1` (after 20261017): steps 4, 5b and 8;
      - `20261114_preserved_items_after_own_file_complete_v1` (after 20261019): steps 4 and 8;
      - `20261114_preserved_items_after_append_only_logs_v1` (after 20261018): step 5b.
    - Each is `requiredOnStartup`, with no hold, and registered after our migration. Its only prerequisites are our migration and its own predecessor. Each is idempotent by structure and terminal after its run.
    - `ensureRunHistoryRow` was not built (withdrawn).
- Tests (each new one fails without its fix where a fix applies):
  - CR-461-071: the read with a row truncated after its parts were read leaves the row and its agents out, warns, and the real contract projection accepts it.
  - CR-461-070: the owner (team and agent runs, the own-file fallback, a run the user started, a peer, an Org, a live entry agent); the agent stream's entry with a damaged saved conversation (refused before anything registers); the ack's code; the team stream (refused before restore; a live run not asked); the delegator's message.
  - CR-461-069: both handlers' connect (refused gives not-found and nothing read; a parse failure gives not-restorable with no schema text) and the first message's code; both services' admission and `restoreForInput`, including a restore failing after admission and a concurrent restore.
  - SR-078 c: the registration and prerequisites; each follow-up converting its predecessor's finished item (own file, history row, log), with a later start changing nothing; and through the real runner, with 20261018 `FAILED`, a copy whose 20261017 item finished is converted and listed while 20261018's follow-up waits.
  - The follow-ups first imported their predecessors' ID constants from those migrations' folders, and the sealed area's boundary test refused that. They name the IDs locally (`e0af2eed44`), as the other migrations do.
- Validation (IMP-80):
  - server type gate PASS;
  - unit 8075 passed, 1 failed (the boundary test, fixed; then 116 architecture and migration tests pass);
  - integration 491 passed, 4 failed (the file watcher's timing: alone it failed under another workload's load and passed 14/14 twice on a quiet machine);
  - web type gate PASS and 5757 passed.
- Remaining risks:
  - CR-461-068 (b) has no new test here: the save's answer before the predecessor finishes is unchanged base behavior, and API/E2E's TAU-2 states it.
  - The new codes `TEAM_RUN_NOT_RESTORABLE` and `AGENT_ORG_RUN_NOT_RESTORABLE` are this ticket's.
  - `delegate_task` by run ID (CR-461-043) still asks the conversation check through its own path. It uses the same builder.
- Next recipient: Code Reviewer.

### IR-026 — The assigner's message checks that a closed run can continue before reopening it (CR-461-072); the connect answers the admission's reason (CR-461-073)

- Triggering role, report path, and round: Code Reviewer CRR-034 (`code-review-report.md` round 25): Fail, one `Local Fix` (CR-461-072). The Design Impact CR-461-073 was decided by the Solution Designer and passed ARCH-REV-051 unchanged. Round 26.
- Triggering finding IDs: CR-461-072, CR-461-073. Large / High unchanged.
- Prior authoritative result: IR-025 at `726666cad2`.
- Current authoritative result: `2b48f995c9` (CR-461-072 `43f567b5d2`; CR-461-073 `2b48f995c9`).
- Related solution / architecture-review revision IDs: SR-078 as revised for CR-461-073; ARCH-REV-051. Related code-review revision IDs: CRR-034.
- Implementation delta:
  - **CR-461-072 (`43f567b5d2`).** `CrossRunMessageDelivery.admit` committed `reopenAssignment` and only then asked `restorability.refusal`. A refused run kept its Task reopened, its row returned, and the text said it continued.
    - Now, as base's reopen step (`assertRestorableChain`, before the commit): first the Task side's eligibility (`assertReopenable`), then whether the run can continue, then `reopenAssignment`.
    - A refusal changes nothing and carries base's text without the "open again" note.
    - A run this call reopened is not checked again before its root is restored.
  - **CR-461-073 (`2b48f995c9`).** When the restore admission refuses a stopped team or org root, the view connect now answers the admission's own code and text and closes. Before, it answered `TEAM_NOT_FOUND` / `AGENT_ORG_NOT_FOUND`.
    - The codes: `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED`, `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, or the org's counterparts, with base's texts.
    - Both stopped views raise their "not restorable" error with the admission's refusal; the handlers already answer its code and text and close with 4004.
    - The first message of a run that passed admission keeps answering the reason (round 25).
- Tests (each fails without its fix):
  - CR-461-072: the assigner's message to its closed run whose saved conversation cannot be read gets base's refusal; the Task stays closed, no reopen is asked, and nothing is logged. A DONE Task is refused by its eligibility first, and the run is not asked.
  - R-8's test is restated: the DONE attempt no longer reaches `reopenAssignment`.
  - CR-461-073: the team connect for both admission codes, and the org connect, answer the code and text and close.
- Validation (IMP-81 at `2b48f995c9`):
  - server type gate PASS; unit 8078 passed;
  - integration 492 passed, 3 failed, all in the file watcher. Alone it passed 14/14, then 13/14 on a different test (FU-021);
  - the web is unchanged since IMP-80.
- Next recipient: Code Reviewer.
- Result: Code Review **Pass (CRR-035**, `code-review-report.md` round 26, head `f92881dd13`): CR-461-072 and -073 resolved. The reviewer routes to API/E2E.

### IR-027 — Every late predecessor classified; one PreservedItemsFollowUp (SR-079, CR-461-074)

- Triggering role, report path, and round: Code Reviewer CRR-036 (CR-461-074, F-53), answered by the Solution Designer as SR-079 and passed by ARCH-REV-052 with a note on address and path shapes. Round 27.
- Triggering finding IDs: CR-461-074. Large / High unchanged.
- Prior authoritative result: IR-026 at `f92881dd13` (CRR-035 Pass).
- Current authoritative result: `f20353ecc3`.
- Related solution / architecture-review revision IDs: SR-079; ARCH-REV-052. Related code-review revision IDs: CRR-036.
- **Classification, checked against the code before the test (reported to the designer, adopted):**
  - **One class differed from the design's first table.** `20260521_team_run_history_index_v2` builds rows only from `team_run_metadata.json`. `team-run-execution-tree-v1` renames that file away. The rebuild drops every other row as stale, so a late run removes the delegated team runs' rows. It is a writer, with a step-8 follow-up. Its loss of user-started teams' rows is base's (FU-029).
  - **The agent index v2 is a true rebuilder:** it makes a row from every `run_metadata.json`.
  - **The three address and path migrations are none** (ARCH-REV-052 note 1):
    - team-agent-memory-layout touches only v1-shaped roots;
    - the context-file locators are written and resolved by run ID and directory (`team-context-file-locator-transition.ts:71`, `context-file-owner-resolver.ts:71-97`), so step 4 needs no locator rebase;
    - team-communication-projection-address writes JSON message logs, 20261018's input.
  - The project migrations never write Task run resources: none.
- **Implementation delta (`f20353ecc3`):**
  - **`PreservedItemsFollowUp(predecessor, steps)`** is the one definition of every follow-up, built from a table, `PRESERVED_ITEMS_FOLLOW_UPS`.
    - Its prerequisites are its predecessor and our migration, so it waits while that predecessor is `FAILED` or `NOT_RUN`. It is `requiredOnStartup`, with no hold, idempotent and terminal.
    - The three of SR-078 are instances of it.
  - **New writer follow-ups:**
    - team-run-execution-tree v1 and v2, the org flat families and 20261015: steps 4, 6 and 8;
    - the team history index v2: step 8.
  - **The reader, 20261020.** The main migration takes a `ledger` (as other migrations do). While 20261020 is not terminal, every plan preserves the improver's delegated copies, in steps 4 and 5b: 20261020 would select a converted copy as a helper run and delete it (F-25). Its follow-up converts those that remain (steps 4, 5b and 8).
  - The main migration's constructor takes an options object (`plan`, `ledger`).
- Tests (`delegated-runs-late-predecessors.test.ts`):
  - the classification: every earlier migration has exactly one class, and the evidence for "rebuilder" and "none" cites both searches;
  - F-53 through the real runner: token usage FAILED; flat families NOT_RUN, then late; no stored list remains after its follow-up;
  - 20261020 FAILED, then finishing: the improver's copy is kept, then converted and listed. This test fails without the reader rule;
  - late index rebuilds: the agent index keeps the delegated runs' rows; the team index drops the delegated team runs' rows, and its follow-up restores them.
  - SR-078's tests and the three registry-order lists are updated.
- Validation (IMP-82 at `f20353ecc3`):
  - server type gate PASS; unit 8082 passed; 754 migration, architecture and startup tests pass;
  - integration 491 passed, 4 failed, all in the file watcher. Alone it failed 13/14 twice, on a different test each time. Nothing it uses changed since IMP-79's 14/14 (FU-021);
  - the web is unchanged since IMP-80.
- Remaining risks: the classification rests on the two searches and on reading the flagged migrations, as the test records. A new migration must be classified to pass the test.
- Next recipient: Code Reviewer.

### IR-028 — The migration ledger is required (CR-461-075)

- Triggering role, report path, and round: Code Reviewer CRR-037 (`code-review-report.md` round 27): Fail, one `Local Fix`, CR-461-075. CR-461-074 resolved. Round 28.
- Triggering finding IDs: CR-461-075; C27-02 (a suggestion). Large / High unchanged.
- Prior authoritative result: IR-027 at `9c8679c1fb`.
- Current authoritative result: `1eb945e5f7`.
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-037.
- Implementation delta (`1eb945e5f7`):
  - The ledger is now required on the main migration (its `options.ledger`), `PreservedItemsFollowUp` and `createDelegatedRunsPreservedItemsMigrations`, as the released predecessors take it. The defaults are gone, and nothing is decided by its absence: before, a missing ledger took the reader, 20261020, as terminal (Principles 13 and 16).
  - `catalogs` is now an explicit argument as well (`null` where none).
  - Tests pass a ledger: a stub answering `SUCCEEDED` where the reader is not the subject; the real runner's records where it is.
- C27-02 (ten scans on the first start after the upgrade) is not acted on: the reviewer suggested measuring first, and it is not measured here. Each follow-up's pass is the main migration's scan with a subset of its steps, and most find nothing to convert.
- Validation (IMP-83 at `1eb945e5f7`): type gate PASS; 754 migration family, architecture and startup tests pass; unit 8082 passed.
- Next recipient: Code Reviewer, a targeted delta.
- Result: Code Review **Pass (CRR-038**, `code-review-report.md` round 28, head `15c41ad242`): CR-461-075 resolved. The reviewer routes to API/E2E.

### IR-029 — The Task card opens its worker where its row lives (CR-461-076, F-54; SR-080)

- Triggering role, report path, and round: Code Reviewer CRR-039 (the failure-origin review of API-REV-010): one web `Local Fix`, CR-461-076 (F-54). It needed a field the web can't derive, approved by the Solution Designer as SR-080 within the Local Fix. Round 29.
- Triggering finding IDs: CR-461-076; SR-080. Large / High unchanged.
- Prior authoritative result: IR-028 at `15c41ad242` (CRR-038 Pass).
- Current authoritative result: `0b6da706b9` (`f15a328251`, `2818701556`, `0b6da706b9`).
- Related solution / architecture-review revision IDs: SR-080 (no architecture review). Related code-review revision IDs: CRR-039.
- **PMU-003's exact break, pinned through the project-manager probe and the browser console (IMP-84).** The rule-2 open of a delegated Team (`delegatedRunsStore.ensureOpen` → `openTeamRun`) passed no workspace ensurer. A running Team's open therefore threw "Active Team '…' requires workspace activation" (`teamRunContextHydrationService.ts:275`). Its binding never came, the agent view's target stayed null while "opening" (CR-461-057), and the center stayed empty. This hit any running delegated Team row, the card's or a click's.
- Implementation delta:
  - **`f15a328251` (web):** the rule-2 Team open activates the Team's workspaces as the Team's own open does (`ensureRunHistoryWorkspaceByRootPath`).
  - **`2818701556` (server, SR-080):** `TaskRootView.topRun` names the run at the top of the worker's tree.
    - It is derived, never stored, by a resolver beside the status resolver: `DelegationIndex.topOf`, composition-bound.
    - It is carried on the GraphQL type and the change message. `delegatingRun` stays, for display.
    - Without the resolver, `topRun` is null and no card opens. This fails closed, following the service's optional-collaborator convention.
  - **`0b6da706b9` (web):** the card opens `topRun` and selects the worker's row there with that view's own selection:
    - an Agent view expands the task Teams above the row (`taskTeamPathOf`) and selects it with `selectTaskRow`;
    - a Team view opens on the worker's coordinator, as its row does (`inspectTeamMember` / `openTeamMemberRun`);
    - an Org view goes through its inspect action;
    - a worker that is its own top opens as its own run.
    - `openable` = started, not closed, and `topRun` listed (`isTaskRootTopRunListed`). The GraphQL types are regenerated.
- Tests (each fails without its fix):
  - the store spec checks that the Team open passes the ensurer;
  - the server's root view names `topRun`, from the resolver, and none without one;
  - the card specs: a worker two hops down (its Team expands and its row is selected), PMU-003's Team worker under an Agent top, a Team top and an Org top, a worker that is its own top, and no top.
  - The probe: PMU-003 and PMU-018 now pass.
- **PMU-019** fails before the card, at finding the nested member's row. The probe looks for `data-member-address="${recipientAddress}/editor"`, base's hosted address. Under TC-12 and P8, a delegated team's member rows carry their own run's address, `/editor`; the row is there. This is the probe's selector, not the product.
- Validation:
  - IMP-84, the probe: PMU-003 and PMU-018 pass;
  - IMP-85: `codegen:check` is current; web type gate PASS and 5763 passed; server type gate PASS and unit 8080 passed, with 3 failed in two folder watcher files (alone 27/27 twice).
- Remaining risks: PMU-019's probe selector (above); the server's integration suite is not rerun (the server change is the Task view's field and its resolver).
- Next recipient: Code Reviewer, a targeted delta on the card's open path.
- Result: Code Review **Pass (CRR-040**, `code-review-report.md` round 29, head `a4641a0985`): CR-461-076 resolved. The reviewer routes to API/E2E.

### IR-030 — A saved delegated row shows what its run now has (CR-461-077, F-57); the Task card from the Workspace page (F-59)

- Triggering role, report path, and round: Code Reviewer CRR-041 (the failure-origin review of API-REV-011, `code-review-report.md`): one web `Local Fix`, CR-461-077 (F-57), and F-59 held as a lead for the implementer to reproduce. Round 30.
- Triggering finding IDs: CR-461-077; F-59. Large / High unchanged.
- Prior authoritative result: IR-029 at `a4641a0985` (CRR-040 Pass).
- Current authoritative result: `a047a56127` (`fbe817ff6c`, `a047a56127`).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-041.
- **CR-461-077's cause.** After the copies' own saves, the editor reconciles only the delegator's own settings. Its delegated rows come from the delegator's row records:
  - the live view's row records, which a Save doesn't change; the collaboration store's `read` is skipped for a live view (`services.has(host)`);
  - or the stopped delegator's `delegatedSnapshot`, read when Settings opened.
  - So nothing showed what the saved runs now have until Settings were reopened.
- Implementation delta:
  - **`fbe817ff6c` (web, CR-461-077):** each saved run's own save answer is what its row shows.
    - `saveDelegatedRuns` returns `saved`, per row key:
      - for an agent run, its `canonicalSelection`;
      - for a team run, each saved member's selection in its `canonicalExecutionTree` (`savedOfTeam`, by the member's address).
      - A partial save returns the runs saved before the refusal.
    - `delegatedLaunchDraftStore.saved` collects them. `bind` clears it when Settings open another run.
    - The row builders lay a row's saved selection over its record (`DelegatedRowControl.savedOf`, `withSaved`). This is one overlay for Agent and Org rows (`collaborationDelegatedLaunchNodes`) and Team rows (`teamDelegatedLaunchNodes`), live or stopped.
    - What is kept is the run's own read, as its save returns it, not the user's edit. CR-002's rule "no client copy of the edit" holds; its store test now states this.
  - **`a047a56127` (web, F-59, reproduced):** a Task card opened from the Workspace page now selects its worker's row.
    - Opening the Agent top run selects it. `pages/workspace.vue` then moves to the run's chat, and the Workspace page's leave guard (`useWorkspaceRouteSelection`) ends every selection intent, the card's own too.
    - So `openInAgentRun` returned before selecting the row.
    - Now, once at the chat, the reveal goes on under a new intent while the opened run is still the selected one. A run the user selects meanwhile wins.
- Tests (each fails without its fix):
  - `ExistingRunConfigEditor.savedCopyRow.spec.ts`: a stopped Agent delegator's copy row shows the saved model after Save, while its record still holds the old one.
  - `delegatedRunSaves.spec.ts`: `saved` from agent and team answers, and from a partial save.
  - `delegatedCopyChoices.spec.ts`: a Team's saved row shows the saved model and its original.
  - `delegatedLaunchDraftStore.spec.ts`: `saved` set by Save and cleared on another binding.
  - `useTaskRootNavigationTopRun.spec.ts`:
    - the selection mock now issues real intent tokens, and opening an Agent run ends them, as the Workspace page's leave does;
    - F-59, and "a run selected meanwhile wins".
    - The old code fails 4 of its tests under this model.
- Validation:
  - IMP-87, the probes:
    - SDV-06: Fail before, 6 of 6 opened after;
    - PMU 25/25;
    - RSM-04 and RSM-06 Pass; RSM-04's `savedSummary` is now the saved model;
    - AFS-001's F-57 step passes; the case then fails at a stale storage check (below).
  - IMP-86: web `codegen:check`, type gate and full suite.
- Remaining risks:
  - AFS-001's "Save stored exactly A" reads `userLaunchSelection` from the delegator's tree record (base's storage). Under SR-064 the save is on the copy's own run, so that check is stale. It goes on API/E2E's rewrite list.
  - DCP-001 was not run.
- Next recipient: Code Reviewer, a targeted delta.
- Result: Code Review **Pass (CRR-042**, `code-review-report.md` round 30, head `5b455a9ec7`): CR-461-077 and F-59 resolved. The reviewer routes to API/E2E.

### IR-031 — CRR-043's fixes, SR-081, and statuses by run ID with rows that carry their open target (SR-082 as narrowed by SR-083)

- Triggering role, report path, and round: Code Reviewer CRR-043 (the failure-origin review of API-REV-012), released by the Solution Designer with SR-081 (CR-461-081) and SR-082 / SR-083 (the user's decision to fix the architecture in this ticket, FU-026 into 461; FU-034 stays a follow-up). Round 31.
- Triggering finding IDs: CR-461-078 … CR-461-084; SR-081; SR-082, SR-083 (REQ-014 / AC-017). Large / High unchanged.
- Prior authoritative result: IR-030 at `5b455a9ec7` (CRR-042 Pass).
- Related solution / architecture-review revision IDs: SR-081 (ARCH-REV-053), SR-082 (ARCH-REV-054, -055), SR-083 (ARCH-REV-056), and the designer's answers on "settings" (V-11) and CR-461-083's reason. Related code-review revision IDs: CRR-043.
- Implementation delta (in order):
  - **SR-081, `1a3f562704` (+ `8e3d474565`):** `CollaborationTree.resolve` checks the old-name correction before address step 2 (team runs working on a Task; the run's own delegated name, or it plus one of its own members). Contract state O9.
  - **CR-461-078, `f1671cb523`, then `4d3b13cbed`:** a changing Settings save records `{ origin: "settings" }` on an agent run, a team member and a team default (V-11); a save of the same selection keeps the source. The web shows `settings` with no origin text; a member's own source wins over the team fallback, which stays for followers and configured placements.
  - **CR-461-083, `b9ac3cdd24`:** pinned with LRL-004 (IMP-88): the refusal did reach the composer, without the reason. A damaged message log line throws `StoredFileDamagedError` (file, line, the reader's detail); `unrestorableRoot` answers "its message log (…) is damaged at line N. Its files were left unchanged; start a new run, or repair or remove that file." Parser text stays in the log.
  - **SR-083 step 1, `5c160af16f`:** `RunStatusService` and `/ws/run-status` (contract `run-status-dtos`): runs held by count, a local run's agents from its own root (observed, then read; offline when not running; observed again on restore), a peer run's from its handle; SUBSCRIBE reads and registers in one synchronous step; `RUN_TREE_CHANGED` from `ChildRowsFeed` for the run and every ancestor.
  - **Step 2, `4d3b13cbed`:** `openTargetOf` (collaboration-tree.ts) on every row the server builds (local rows, the team stream's and listed team rows, peer rows with their node); a team's target is its coordinator, else a logged row error with no target. A peer row carries its launches from its node's answer (CR-461-084).
  - **Step 3 (web):** `d5613c9813` the run-status client (feed + store); `beb956ef6b` Settings' rows from the run's view and liveness from each run (CR-461-079, -080); `900cf74fd8` a stopped Team opens with one load of its focused member (CR-461-082, IMP-89: the stream's first snapshot rebuilt the view the open had just read); `877a08a4cb`, `966e5f9b4f`, `03e25a6f50`, `6854423f35` every view (Agent, Team, Org, phone) opens a row through the server's target (`useRunOpening.ts`), so a delegated Team row opens its coordinator in every view (F-56, FU-031) and no client picks a member (FU-024).
  - **Step 4:** `4a8ce5e80c` the Agent store reads its views' delegated runs' statuses by run ID and re-reads a not-open view on `RUN_TREE_CHANGED` (newest read wins); the list poll and its query are removed. `f52837e292` Team and Org views and the stop icon do the same (plugin `31.runStatus`). `b5d8bf82f0` a Team snapshot requires its own members' statuses only. `445f1ed947` (server) the relay (`LocalChildFollowers`, `LocalChildObservation`), the views' child status frames, the peer frames, the Org's child status correlation and `agentRunCollaborationStatuses` are removed.
- Deviations to review:
  - `/ws/run-status` subscribes by run (`{ kind, runId }`), not by bare agent ID: the server then finds a run's root without scanning team folders; answers are per agent.
  - The design's single `openRunTarget` is `rowOpenAgentRunId` / `teamRowFocusOf` in `composables/useRunOpening.ts` plus `selectTaskRow` reading the target: each view keeps its own selection mechanics (the Agent view selects a child, the Team and Org views focus a member), all from the server's target.
  - `openTarget` is optional in the three row schemas (the server sets it on every row; test fixtures and older producers need not).
- Validation: see IMP-86 … IMP-90 in the handoff's Checks Run.
- Result: Code Review **Fail (CRR-044**, `code-review-report.md` round 31): one Local Fix, CR-461-085 (the peer status path). Everything else held, the deviations included.

### IR-032 — A peer run's status after its link ends; one source for statuses (CR-461-085)

- Triggering role, report path, and round: Code Reviewer CRR-044, `code-review-report.md` round 31. Round 32.
- Triggering finding IDs: CR-461-085. Large / High unchanged.
- Prior authoritative result: IR-031 at `74076b0ef4` (CRR-044 Fail).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-044.
- Implementation delta, `b5163d71d1`:
  - **Server:**
    - `RunStatusEntry.startPeer` keeps its observation re-openable. An end nobody asked for sets the run's agents offline and calls `peerEnded`, so the views showing it get one summary (`PeerChildObservation.ended`, AR-403).
    - `RunStatusService.retryPeers` observes an ended peer run again. `PeerChildObservation.refresh` (Retry) calls it with the view's peer runs, then fetches fresh summaries (DEC-807 Phase 1). A live observation is never opened twice, and a frame of an ended link changes nothing.
    - The composition wires the two to each other.
  - **Web:** `applyRemoteSummaryStatuses` becomes `applyRemoteSummary`: a summary sets title, reachability and launches only. A peer agent's status has one writer, `/ws/run-status`.
  - **Small items:**
    - `ChildRowsFeed.rowsChanged` is required;
    - `resetRunStatusFeedForTests` is removed;
    - `run-view-stream.ts`'s two comments name `PeerChildObservation`.
- Not taken: C31-05 (`openTarget` required-nullable in the schemas), a suggestion for when the fixtures are next touched.
- Tests:
  - `run-status-service.test.ts`: a peer run's link ends (offline, `peerEnded`), then Retry, and its live status follows again; no second observation while live. This fails on the prior code, which has no `retryPeers`.
  - `peer-child-observation.test.ts`: Retry re-observes the view's peer runs and fetches their summaries; an unasked end fetches one summary for the views showing it.
  - Web: a summary does not change a status (`agentRunCollaborationRemoteChildren.spec.ts`, `teamExecutionRemoteRuns.spec.ts`).
- Validation, IMP-92:
  - server: type gate PASS, `Tests  7245 passed`;
  - web: type gate PASS, `Test Files  771 passed`, `Tests  5760 passed | 2 skipped`.
- Next recipient: Code Reviewer, a targeted delta on the peer status path.
- Result: Code Review **Pass (CRR-045**, `code-review-report.md` round 32, head `58cc542572`): CR-461-085 resolved. The reviewer routes to API/E2E.

### IR-033 — CRR-046's Local Fixes, the addendum and the held items (CR-461-086 … CR-461-093)

- Triggering role, report path, and round: Code Reviewer CRR-046 (failure-origin review of API-REV-013) and its addendum (`e89df890fa`), `code-review-report.md`. Round 33.
- Triggering finding IDs: CR-461-086 … CR-461-092 (`Local Fix`); CR-461-093 (F-72, held); the held items (the extended runtime-switch suite, AFS-002's later step, BR-011, LE-O1's later step). Large / High unchanged.
- Prior authoritative result: IR-032 at `58cc542572` (CRR-045 Pass; API-REV-013 Fail).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-046.
- Implementation delta, `ae38f8e421` … `9e62ffd137`:
  - **CR-461-090 (F-70), `ae38f8e421`, server.** Pinned with the real two-node suite and a temporary trace: beta's observation stream carries changes only, so a peer run already idle when alpha subscribed read offline until its next change. `RemoteRunViewProvider.observe` now opens the stream with each running agent's current status, read after the listener is attached (no change falls between). A run that is not running sends none.
  - **CR-461-091 (F-71), `ae38f8e421`, server.** `PeerChildObservation` observes each shown peer run's live output again (one observation per peer run, shared by every view showing it, closed with the last). It publishes `remote_agent_presentation` at the agent's address under its delegator (AR-402). The Agent, Org and Team projectors present it as before. Status frames stay off the views (SR-083); an ended observation waits for Retry, and the status side asks for its summary (AR-403). The web's handling was unchanged and still in place.
  - **CR-461-089 (F-69), `c7ab96c83c`, `6a30ddf41e`.**
    - The web's team save target carries the team run only. A team row's choice is one `CONFIGURED_TEAM` patch, and a member row shows its own choice only.
    - Both view contracts and both server projections drop `follows_team` / `followsTeam` (dist rebuilt). The stored record keeps it as the launch resolver's start-time fact.
    - The team mutator: when the Team's default changes, a member with no source of its own keeps the Team's earlier source as its own (found by SSR-002: its origin text otherwise followed the Team's new `settings`).
  - **CR-461-087 (F-67), `97974a91e2`, web.** The per-run archive cores return the server's refusal message. "Archive older" and the sidebar's group archive show it after the counts (`runGroupArchiveSummary`); when every run was refused, the reasons are the message. A listed agent group archives through the same path.
  - **CR-461-086 (F-60), `88234df375`.**
    - Server: `runLaunch(kind, runId)` answers a run's launch as its own file has it now: the same `source` its row shows, from projections now shared with the row projection.
    - Web: Settings reads each delegated row's run with it when the row appears and after a Save or Stop. The store's `stored` replaces the session-only `saved` overlay. Rows take their launch and origin from it (a member's own source, else its Team's); a run not yet read keeps its record's.
  - **CR-461-088 (F-68), `89950fec6e`, `f15ed58643`, web.**
    - Pinned for the Org: under rule 2 the Org's configuration read carries no delegated runs, but its view does. Both the in-place adoption (`applyRunConfig`) and the contexts store's pre-check refused every stopped Org with delegated runs: "Org configuration changed topology…". That was F-68's Org symptom, and AFS-002's held step.
    - Both now check and adopt the Org's own configuration with the view's rows (`withViewRows`).
    - The Agent's "Couldn't terminate" did not reproduce: SSR-002's delegator Stop with two working copies ended stopped in 2 of 2 runs.
  - **CR-461-092 (F-73).**
    - At `88234df375` the phone's rows and Team screens pass: MSP-02, -03, -05, -06, -08, -11, -14, -16, -33, -43.
    - MSP-03 needed a probe fix (`fc1da7d71f`): it read the delegated task agent through its delegator's member projection, and now reads it by its own run ID.
    - MSP-17 and MSP-20's "running" step are probe reads, not the phone: MSP-17 looks for the delegated row in the Org's configuration read; in MSP-20 the scripted turn ends before the probe's sampling.
  - **Probes:** AFS-002 stops the Org's working copy before editing it (REQ-001), as AFS-001 does (`0feffb0a06`).
- Tests (each fails on the code before its fix):
  - server: `remote-run-view-provider.test.ts` (the opening statuses, observe before read); `peer-child-observation.test.ts` (the shared output observation, AR-402 frames without status, Retry re-observes, rows come and go); `remote-child-output-projection.test.ts` (the three projectors); `standalone-remote-delegation.test.ts` (in-process two nodes through the real gateway; its fake socket now follows the route's frame order, N-401: the opening status and an output frame); `run-launch-read.test.ts`; `team-run-selection-mutator.test.ts`; contracts refuse a member with the follower flag;
  - web: `delegatedRunSaves.spec.ts` (team saves; the launch reads), `delegatedCopyChoices.spec.ts` (drafts; stored launch and origin), `delegatedLaunchDraftStore.spec.ts` (reads on open, after a Save, after a reopen), `runHistoryStore.spec.ts`, `useRunListArchiveOlder.spec.ts`, `useWorkspaceHistoryGroupArchive.spec.ts` (refusal reasons), `agentOrgRunConfigAdoption.spec.ts`, `agentOrgRunConfigRead.spec.ts` (an Org's read without rows).
- Held items (`IMP-97`):
  - **The extended runtime switch:** not reproduced, 3/3 pass.
  - **AFS-002's later step:** reproduced and fixed (above).
  - **LE-O1's later step:** reproduced once (the same step as API/E2E); further live runs failed at other model-driven steps, and no product defect was found.
  - **BR-011:** intermittent, 1 of 3 runs; not pinned.
- **CR-461-093 (F-72):** not reproduced at the new head. RRT-05 passes 3/3; a temporary trace showed no Team row built without its stored title. Not pinned to one change.
- Open: in AFS-002, focusing the running Org's copy row closed Settings once (D-IMP-1; `IMP-95`). The Org view closes Settings when its focused target is momentarily empty (`AgentOrgWorkspaceView.vue`, unchanged since autobyteus-366). Not fixed this round.
- Validation: `IMP-93` … `IMP-98` in the handoff's Checks Run:
  - server: type gate PASS, `Tests  7251 passed`, plus the watcher's timing test (alone 7/7);
  - web: type gate PASS, `codegen:check` current, `Tests  5762 passed | 2 skipped`, plus one stale JSON fixture fixed in `9e62ffd137` (59/59).
- Next recipient: Code Reviewer.
- Result: Code Review **Pass (CRR-047**, `code-review-report.md` round 33, head `4062c809d2`): CR-461-086, -087, -089 … -092 resolved, and CR-461-088's Org part. CR-461-093 and CR-461-088's Agent part are held for API/E2E's rerun. The reviewer routes to API/E2E.

### IR-034 — CRR-048's Local Fixes and its addendum (CR-461-094 … CR-461-098)

- Triggering role, report path, and round: Code Reviewer CRR-048 (failure-origin review of API-REV-014) and its addendum (BR-011 → CR-461-098), `code-review-report.md`. Round 34.
- Triggering finding IDs: CR-461-094 … CR-461-098. Large / High unchanged.
- Prior authoritative result: IR-033 at `4062c809d2` (CRR-047 Pass; API-REV-014 Fail).
- Related solution / architecture-review revision IDs: N/A. Related code-review revision IDs: CRR-048.
- Implementation delta, `4be99b1dca` … `eced354f65` (`eced354f65`: a test's typing for the type gate):
  - **CR-461-096, CR-461-097 (F-74, F-75), `4be99b1dca`, web.** `RunStatusFeed` follows the window's one live-stream lifecycle:
    - the shared `LiveStreamReconnectScheduler` (capped waits while visible, held while hidden, an attempt on resume, a resync after a long hide);
    - it stops on a credential-ending close (`isCredentialRefusalClose`) until bound again, and `closeAllLiveStreams` suspends it;
    - `RUN_TREE_CHANGED` is held while hidden (one per run) and delivered on resume;
    - a reconnect after a loss gives each held run one rows notice.
  - **CR-461-095 (D-IMP-1), `59b077f1c7`, web.** The Org view closes Settings only when the Org has nothing selected. A copy it delegated is selected while its own run's binding comes, so that moment no longer closes them.
  - **CR-461-094 (F-70 in the window), `b8e2d0f527`.** Pinned with `remote-runs-in-tree-probe` and server traces:
    - **The churn (web).** The window's deep watchers released and re-held every run on any read of its views, such as a status. The node closed and reopened each run's statuses (a peer run's observation on beta) about 33,000 times per run, so statuses never settled.
      - `watchHeldRuns` (Agent store, Team/Org bridge, Settings) holds again only when the set of runs changes.
      - The feed applies a release after the current step, so a same-step re-hold keeps the subscription.
    - **The outage (server).** Retry re-observed only the asking view's runs; a run no open view retries stayed offline while it worked again.
      - A Retry, or a view's summary its node answers, observes again every ended status observation on that node (`retryPeers` with node IDs), and reopens an ended output observation of a shown run.
      - An unasked end's summary never re-observes, so a refusing node can't loop.
  - **CR-461-098 (BR-011), `7986b3e3a2`, web.**
    - **Cause:** a delegated agent run opened from its delegator's view (rule 2) read its stored conversation, then connected a stream that sends no snapshot. A message delivered before the node bound the stream, and its turn, were in neither. The failing record showed the reply without the message; a catch-up before connecting still lost a whole turn once.
    - **Fix:** the delegated path connects with a catch-up after binding. On the node's `CONNECTED` (a new `bound` connection event), once the run isn't mid-turn, the stored state is read again and committed only if no live event changed the conversation during the read; otherwise it reads again (bounded).
- Tests (each fails on the code before it):
  - web: `runStatusFeed.spec.ts` (refusal codes; background hold and resume; reconnect catch-up; suspend; same-step re-hold), `closeAllLiveStreams.spec.ts`, `heldRuns.spec.ts`, `viewRunStatusBridge.spec.ts`, `AgentOrgWorkspaceView.spec.ts` (Settings stay open while a copy binds), `agentRunStreamReconnection.spec.ts` (catch-up after `CONNECTED`; a live event during the read), `delegatedRunsStore.spec.ts`;
  - server: `run-status-service.test.ts` (node-wide Retry), `peer-child-observation.test.ts` (a reachable answer re-observes; an unasked end doesn't), `standalone-remote-delegation.test.ts`; RC-45 in the real two-node suite.
- Validation (`IMP-99` … `IMP-103`; gates: server type gate PASS, `Tests  7254 passed`; web type gate PASS, `Tests  5777 passed | 2 skipped`):
  - remote-runs-in-tree RTP-01 … RTP-08 all pass (RTP-05 and RTP-08 failed before);
  - the two-server suite 45/45 with RC-45 (RC-45 failed before);
  - BR-008 … BR-011 pass 3/3 (BR-011 failed 1 of 2 and 1 of 3 before);
  - AFS-002 passes with `settingsClosedBy` empty;
  - phone MSP-13, MSP-25 and MSP-32 pass: no refusal after the revoke; no history, status or view read in the background.
- Open, for the reviewer: MSP-25 still records two `GetTaskWorkerTasks` reads while hidden. They follow the Task close the case makes while hidden (`/ws/projects` `task_upserted` in `taskWorkerTaskStore`, unchanged since base) and are outside AC-006's history, status and view reads.
- Shared `dist` folders: the server's was rebuilt for this round (after API/E2E confirmed nothing was running); the temporary traces were reverted before the final build. The phone bundle (`autobyteus-web/dist`) was rebuilt for MSP-13/-25/-32. `autobyteus-ts/dist` was not rebuilt.
- Next recipient: Code Reviewer.
- Result: Code Review **Pass (CRR-049**, `code-review-report.md` round 34, head `77f24482a8`): CR-461-094 … -098 resolved; API/E2E runs a targeted check. The reviewer's note for the tree work: the delegated agent stream's catch-up after binding (CR-461-098) is a heuristic; a sequenced connect (a snapshot or sequence on the agent stream, as the views have) would close that gap structurally.

### IR-035 — Run trees from the server, views with their own parts only, the agent stream's snapshot, peer runs by their own identity (SR-084 … SR-089)

- Triggering role, report path, and round: Solution Designer SR-082 … SR-089 (`solution-revision-record.md`, `design-spec.md` 3a … 3c, step 4), each passed by Architecture Review (ARCH-REV-054 … ARCH-REV-065, `design-review-report.md` up to round 65). The IMP-3b and IMP-G-D1 Design Impacts were answered as SR-087 and SR-088; ARCH-REV-064's finding was answered as SR-089. Round 35.
- Triggering finding IDs: SR-084 (steps 1 … 4), SR-085 as revised by SR-087, SR-086 (G-A1, G-A4, G-B1, G-B2, G-C1, G-D1, G-F1, G-G1), SR-088, SR-089; IMP-3b, IMP-G-D1; ARCH-REV-063 and -065 notes. Large / High unchanged.
- Prior authoritative result: IR-034 at `77f24482a8` (CRR-049 Pass), then API-REV-015 Pass (`8ab0c6c420`).
- Related solution / architecture-review revision IDs: SR-082 … SR-089; ARCH-REV-054 … ARCH-REV-065. Code-review IDs: N/A (this is new work for review).
- Implementation delta, `4778dd20d8` … `8c21b75dad`, in the design's order:
  1. **SR-084 steps 1 and 2** (`4778dd20d8`, `d986c59d0a`, `9835366d0d`, `99a4eef71e`, `829c46cb22`, `ba0101c672`, `b6d7158f1f`, `431823213c`, `877cbb7adc`):
     - `RunTreeView` builds a run's tree once on the server, sent on the view stream (`RUN_TREE_SNAPSHOT`, then `run_tree_changed`) and through `runTree(run)`;
     - the window's `runTreeStore` holds the trees;
     - the desktop agent, team and org trees, the phone, the Task card (G-F1) and Settings (step 2f, `runLaunch` folded into the rows) render the rows and open through `openRunTarget`;
     - run-level statuses (G-A4) and the status reconnect (G-A1) are in place.
  2. **Step 4, stage A** (server `6964b684a4`; peer frames `c17a11f2ef`; web `5595493885`, `15aa25ed84`):
     - the views carry only their own parts: no delegated child, closed or remote rows, and no `TASK_*` or `REMOTE_*` events;
     - delegated runs are tree rows only, selected through `selectTreeRow` and opened as their own runs (rule 2).
  3. **3b, as revised by SR-087** (`1fec92414f`):
     - `AgentStreamSequence`: per active `AgentRun`, attached after the memory recorder;
     - `whenPersisted`: confirmation at `TURN_COMPLETED` once written;
     - the predating turns, read synchronously at activation;
     - the snapshot connection by exclusion, through the shared `SnapshotBarrier`, which `RunViewStream` now uses too (ARCH-REV-063's recommendation);
     - `AGENT_STREAM_SNAPSHOT`, and numbered `/ws/agent` frames on the sequenced egress (content as `SEGMENT_CONTENT_BATCH` ranges; an exact repeated status is not numbered);
     - server-side `turnId` on projection entries;
     - on the web: the snapshot is applied, the turn frames replayed, a frame at or below the base skipped, and a gap reopens the stream. CR-461-098's catch-up and the pre-connect read are removed.
  4. **Stage C** (`7c41658785`; `ff350c974c`, the Solution Designer's docs commit, carried three deletions staged at the time):
     - `RunTreeView` reads its rows' records from the runs' own files (`run-tree-records.ts`);
     - the child DTO projections and the collaboration contracts' task-execution DTOs are removed.
  5. **G-D1 with SR-088 and SR-089** (`6182755a29`, `8c21b75dad`):
     - every `AgentRun` has a sequence (asserted for a lazily started team member, its restore, and a lazily started org agent);
     - node B serves `agentStreamSnapshot` and `observeAgentStream` behind the back-link check;
     - node A's `/ws/peer-run` relays node B's stream one for one (a gap or a new `liveSequenceId` means a new snapshot; a frame without a sequence is dropped and logged);
     - the web opens a peer row through the same `AgentStreamingService`.
- Tests:
  - server: `agent-stream-sequence.test.ts` (the 3b cases: closed but unwritten; written during the read; reasoning flushed at a tool boundary; confirmed during the read; confirmed at the base; restored; earlier interrupted turn; written before its first frame; entries with no turn; repeated status; stopped run; unreadable stored turns), `conversation-turn-ids.test.ts`, `run-tree-records.test.ts`, `peer-agent-stream.test.ts`, `peer-run-stream-session.test.ts`, `remote-run-view-provider.test.ts` (SR-088 case), the handler, follow and websocket integration tests rewritten to the snapshot model;
  - web: `agentRunStreamReconnection.spec.ts` (snapshot, turn frames, batch ranges, skip, gap, restore in-band, stopped run), `peerRunStreams.spec.ts`, the store and view specs.
- Validation: server type gate PASS (production 0; tests at baseline 1012); web type gate PASS (production 0; tests 87, baseline lowered from 89). Server suites green in directory batches (unit 2707 + 1436 + 1227; integration agent 171; architecture 71); web suites green in directory batches (about 5,000 specs). The `/ws/peer-run` path has no two-node run yet (API/E2E).
- Open, for the reviewer:
  - **The old peer-run web client** (`remoteRunsStore`, `services/remoteRuns`, `composables/remoteRuns`, and their uses in `RightSideTabs`, `AgentEventMonitor`, the file preview, the composer target, `UserMessage`, the phone's files and artifacts) has received no registrations since stage A.
    - Its affordances for a remote agent (its node's label, its files, the mention scope) are not yet bound to the new `peer` subject.
    - A peer row's binding reads its trace as a run of this node (`browse: run`), so its earlier events and its files are not shown.
    - Re-binding these to the peer subject, or removing them, remains.
  - The `generated/graphql.ts` drift from stage A was regenerated in `1fec92414f`.
  - A projections boundary violation from `b6d7158f1f` (Projects importing `collaboration-tree`) was fixed in `1fec92414f`.
- Shared `dist` folders: the server's was rebuilt by `codegen:local` (no API/E2E run was announced). The phone bundle and `autobyteus-ts/dist` were not rebuilt. No temporary traces are in the tree.
- Next recipient: Code Reviewer.

### IR-036 — CRR-051's Local Fixes (CR-461-099, CR-461-100), with SR-090's Retry

- Triggering role, report path, and round: Code Reviewer CRR-051 (`code-review-report.md`, round 35), two Local Fixes. During CR-461-099, IMP-RETRY (Unclear) went to the Solution Designer and was answered as SR-090 (option A, `design-spec.md` 3c under G-A3). ARCH-REV-066 passed it, adding two details: a retry re-opens an ended observation, and concurrent retries are coalesced. Round 36.
- Triggering finding IDs: CR-461-099 (with C35-03 and C35-08 folded in), CR-461-100; SR-090; CRR-051 suggestions C35-04 (measure the predating read) and C35-06 (one stage per commit). Large / High unchanged.
- Prior authoritative result: IR-035 at `b2675ec918` (CRR-051 Fail, two Local Fixes).
- Related solution / architecture-review revision IDs: SR-090; ARCH-REV-066. Code-review IDs: CRR-051.
- Implementation delta, one stage per commit (C35-06):
  1. **CR-461-100** (`28b3b956fd`):
     - `AgentStreamSequence` confirms a turn at every turn end once its writes are durable, and drops its buffer. The ends are `TURN_COMPLETED`, `TURN_INTERRUPTED`, and an `ERROR` with turn-terminal evidence (`endsTurn`).
     - Tests: an interrupted turn, and a turn ended by a turn-terminal error, are each confirmed and dropped; a later snapshot reads each from the stored part, once.
  2. **SR-090, Retry over `/ws/run-status`** (`57aaa0ca53`):
     - contract `RETRY_PEERS { runIds }`;
     - `RunStatusConnection.retry` asks only the peer runs this connection holds;
     - `RunStatusEntry.retry` keeps one Retry in flight per peer run (a later one joins its answer), re-opens an ended observation, asks the node, and once answered tells its state again, changed or not.
     - The view streams' `REFRESH_REMOTE_TASK_EXECUTIONS` is removed: both contracts, the three handlers, `run-view-rows.retryPeers` and the composition's walk.
     - Web: `RunStatusFeed.retry`, and the store's `checking` set, cleared by the run's next `RUN_STATE_CHANGED` or snapshot.
  3. **C35-08** (`c7ad1ba54b`):
     - removed `utils/runOpenTarget.ts`, the dead org guard and its types, and the unused `RunTreeChangedEventDto`;
     - `RunTreeDto` now types the tree that `runTreeStore` parses.
  4. **CR-461-099** (`6acf35eb4a`):
     - The read subject `peerRun { nodeId, runId, agentRunId }` replaces `standaloneMember`. A peer binding browses as it. Its earlier events are refused ("kept there"), it has no file changes, and it has no content URL. This is base's behaviour; base's `agent-collaborations` route no longer exists.
     - `runTreeStore.peerRunOf(agentRunId)` finds the peer rows in the shown trees.
     - Rebased on it: `useRemoteRun` (with `checking`), `useRemoteRunView` (Retry → `retryPeers`), `remoteRunFileNode` (files "on {node}"), `useComposerTarget` (no mention scope, SR-069), `WorkspaceTransientExecutionRow` (the display row's `remote` gains `reachable` and `title` from the row's `peer`).
     - Removed: `remoteRunsStore`, `services/remoteRuns/remoteChildren.ts` (with C35-08's four dead helpers), `test-support/remoteRunRetryAdapter.ts`, and their spec. `createRemoteAgentContext` is now `services/peerRuns/peerAgentContext.ts`.
  5. **C35-03, the two-node run** (`84f4f96e4f`, `4dec092f80`): `RC-46` in `remote-delegation-two-server.e2e.test.ts`.
     - RC-20's audit now lists G-D1's snapshot route.
     - RC-46 runs after RC-45, because its beta restart would stop the Team that RC-12 expects to be running.
- Tests:
  - contracts: `RETRY_PEERS` parses; the view streams refuse `REFRESH_REMOTE_TASK_EXECUTIONS`.
  - server: `run-status-service.test.ts`, three SR-090 cases:
    - a node that stays down: two clients retry at once and make one call, and each is told the unchanged state;
    - a node that comes back: the ended observation is re-opened and the state is told as answered;
    - a run the client does not hold is not asked.
  - web:
    - `WorkspaceTransientExecutionRowRemote.spec.ts`: the title from the row; Retry checks, then settles while the node stays down and once it is back; nothing checks when it could not send.
    - `AgentWorkspaceSurfaceRemote.spec.ts`, `RemoteRunViewAffordances.spec.ts`: the four families, seeded from tree peer rows; Retry over the feed.
    - `peerComposerMentionScope.spec.ts`: a peer agent, a peer team's coordinator and a member have no scope; a local run has one.
    - `runTreeStore.spec.ts` (`peerRunOf`), `delegatedRunsStore.spec.ts` (a peer member's binding browses `peerRun`), `ArtifactContentViewer.spec.ts` (no request for a peer run), `runStatusFeed.spec.ts` (`RETRY_PEERS` only while open).
    - The file, trace and right-panel specs now read the tree.
- Validation:
  - contracts 36/0 and 13/0;
  - server type gate PASS (production 0; tests at baseline 1012); web type gate PASS (production 0; tests at baseline 87);
  - focused server and web suites green;
  - two-node `RC-46` Pass (IMP-106);
  - full two-node suite (IMP-107): 11 fail and 35 pass. No product defect: RC-31 … 34, 36, 37, 43 and 45 read the view summaries removed in stage A; RC-35 and RC-12 are cascades; RC-20 was this round's, and its test is now fixed;
  - without the stale cases (IMP-109): `Tests  37 passed | 9 skipped`;
  - whole web suite: 5496 passed, 2 skipped;
  - server `pnpm test:unit`: 8113 passed, 9 skipped;
  - C35-04's predating read measured (IMP-108).
- Shared `dist` folders: the two contracts' (rebuilt by their tests, committed) and the server's (`pnpm build`, for the e2e). The phone bundle and `autobyteus-ts/dist` were not rebuilt.
- Next recipient: Code Reviewer.
- Review result: **Pass**, CRR-052 (Code Reviewer, round 36, head `53f0ae2d4e`; `code-review-report.md`): CR-461-099 and CR-461-100 resolved; SR-090, C35-08 and C35-03 done. Next: API/E2E's full rerun (the reviewer's handoff). Informational; no implementation action.

### IR-037 — CRR-053's Local Fixes (CR-461-101 … CR-461-104), and the Team-tab re-read found while verifying them

- Triggering role, report path, and round: Code Reviewer CRR-053, the failure-origin review of API-REV-016 (`code-review-report.md`, top section). Four Local Fixes. Round 37.
- Triggering finding IDs: CR-461-101 (F-76), CR-461-102 (F-77), CR-461-103 (F-78), CR-461-104 (F-79). Also, found while verifying CR-461-104: BR-001/002's next step (autobyteus-469 AC-011). Large / High unchanged.
- Prior authoritative result: IR-036 at `53f0ae2d4e` (CRR-052 Pass), then API-REV-016 Fail (`b7a77b8279`).
- Related solution / architecture-review revision IDs: N/A. Code-review IDs: CRR-053.
- Implementation delta, one stage per commit:
  1. **CR-461-101** (`5e7f627d49`, server):
     - the Team and Org view sessions take an `announce` on their first `show()`; the handlers send `CONNECTED` through it, right before the snapshot, after every read (base's order), so `connect` resolves in the same step;
     - a refused or missing run sends its error with no `CONNECTED`, as at base;
     - the agent-collaboration and `/ws/agent` handlers already resolved at `CONNECTED`.
  2. **CR-461-102** (`4979fcee52`, web):
     - Org: `selectRouteAgent` in `agentOrgContextsStore`. The route's agent is one of the Org's own (selected in it) or a run the Org delegated, on this node or a peer node (selected by its tree row). `AgentOrgWorkspaceView` uses it, again when the Org's tree arrives. It used to re-select a delegated run as one of the Org's own agents, which cleared the row.
     - Task card with a Team top: a member of the Team is focused in it; a run the Team delegated opens the Team, then the worker's own row (`openWorkerRow`, shared with the Agent top).
  3. **CR-461-103** (`e999b4cbaa`, server and web), pinned with a temporary trace (IMP-111):
     - `unbindStoppedRun` waits until the run's own sequence ends (`AgentStreamSequences.follow`), so the run's final `offline` reaches the session; a run restored meanwhile stays bound;
     - the shared delegated row carries `data-status`, as base's Org rows did. TS-004/007 and BR-010 read an Org tree's rows by it, and the Team dot itself was right.
  4. **CR-461-104** (`f78c3e28cd`, web), pinned from the probe's per-frame samples (IMP-112): a click, Enter or Space folds a Team row only; an agent row folds with its disclosure button. Opening the worker had folded its helper rows before its Task closed, so they did not leave with it.
  5. **The Team-tab re-read** (`8f91060e61`, web): `reloadNamingUnknown` (the rule `reloadRoot` applied to a kept list). The Agent, Org and Team roots call it when a tree change removes rows, so the Team tab names an agent whose Task closed from the server's `pastParticipants` (autobyteus-469 D-5, AC-011). Since SR-084 a closure no longer rebuilds the view.
- Tests:
  - server: one test per kind, a command on `CONNECTED` finds the session (both fail on the old order); the stop in the runtime's order shows `offline` (it fails on the old unbind);
  - web: the Org route agent (own, delegated agent, delegated Team, peer row, a tree arriving later), the Org view's route watch, the Task card (Team top × agent worker, Team worker, member), the row's `data-status`, its folding rule, the Team-tab re-read (store and Agent root).
- Validation:
  - focused suites green;
  - server `test:unit`: 8115 passed, 1 failed (API/E2E's untracked helper);
  - server type gate: production 0; IR-037's tests at the baseline; two above-baseline files are API/E2E's in-progress e2e files;
  - web type gate PASS; the whole web suite green;
  - the failing probe cases re-run (IMP-113): SDV-01/03/06/07 Pass, BR-001/002 Pass. TS-004 and TS-007 now stop at probe assertions written for base's Org-only rows (for API/E2E).
- Not changed: SDV-01's later step ("the Manager started") failed 2 of 4 runs, before and after the fix. A capture shows the probe sending while the Manager's view still read "Loading" (IMP-111).
- Shared `dist` folders: the server's was rebuilt several times for the probes; its final build is from this tree, with no traces. Contracts, the phone bundle and `autobyteus-ts/dist` were not rebuilt. API/E2E's uncommitted e2e rework was in the worktree throughout; it is not part of IR-037 and was not touched.
- Next recipient: Code Reviewer.
