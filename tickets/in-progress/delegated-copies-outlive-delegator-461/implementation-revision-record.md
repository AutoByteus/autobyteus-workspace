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
