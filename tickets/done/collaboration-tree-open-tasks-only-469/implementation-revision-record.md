# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 … ARCH-REV-005 | N/A (two Design Impacts raised during this round, both decided: SR-006, SR-007/SR-008) | `Initial Baseline` | SR-005 … SR-008, ARCH-REV-002 … ARCH-REV-005 | Implemented; ready for code review |
| IR-002 | Code Reviewer failure-origin review CRR-002 of API/E2E round 1 (API-REV-001); design SR-009, architecture review ARCH-REV-006 | CR-003 (F-3), CR-002 (F-2) | `Design Impact` (CR-003, resolved by SR-009) and `Local Fix` (CR-002) | SR-009, ARCH-REV-006, CRR-001, CRR-002, API-REV-001 | Implemented; to targeted code review |

## Revision Entries

### IR-001 — No stored list of local delegated runs; the tree is composed from the Task records

- Triggering role, report path, and round: Architecture Reviewer pass of SR-005 (ARCH-REV-002), `tickets/in-progress/collaboration-tree-open-tasks-only-469/design-review-report.md`; continued on SR-006 (ARCH-REV-003) and SR-008 (ARCH-REV-005) after the two Design Impacts below.
- Triggering finding IDs: N/A (baseline).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete for design steps 1 … 8; server unit suite, server and web type checks, contracts tests and the focused web specs pass (see the handoff's Checks Run).
- Related solution revision IDs: SR-005 (implemented basis), SR-006 (Design Impact 1: D-1's candidate rule, U-008), SR-007 and SR-008 (Design Impact 2: D-3's save rule; AR-002).
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-005 (all Pass).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the package.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-008; AC-001 … AC-012 (server and web parts in scope of implementation checks).
- Implementation delta (by design step):
  1. Task side: `OpenDelegatedRunSource` (`run-history/store/open-delegated-run-source.ts`) bound by the composition after `load()`; `TaskExecutionResourceService` keeps an open index per host root beside the closed one, answers `openDelegatedRunsOf` (every open current entry, whatever its start: SR-006) and `closedTaskExecutionOf`; the port and `ProjectTaskService` expose `closedTaskExecutionOf`.
  2. Store side: `task-execution-tree-split.ts` composes the open runs from their own files into the root list (by start, then run ID), ignores every local entry of the file, and saves own files plus links to runs on another node; a stored local entry is left out only when it is an exact-key link and its run's own file exists (SR-008, `isTaskExecutionLinkEntry`, `TaskAgentOwnFiles.exists`). `readOwnParts` (Team, Org) for the startup validator and the history-index repair (D-11); `readTaskExecution` for the add. D-12: a remote link with an absent delegator is logged at debug level.
  3. Roots: `remove…TaskExecutions` in the three mutators; `dropTaskExecutions` / `addTaskExecution` in the three adapters (standalone and Org through `commitTreeMutation`; Team through `commitExecutionTreeMutation` with `requiresWrite: false`); `retainMessages` on `RootCommunicationEngine`; `readTaskExecution` on the three persistence coordinators.
  4. Lifecycle: `TaskExecutionTreeMembership` (drop after a confirmed stop in the release step; add at the head of the reopen step with undo); `knowsRunId`, `isDelegatedRun` and `teamCoordinatorOf` answer for closed copies; `refuseCopyOutsideTree` removed; `resolveExistingCopy` covers closed copies; the run-ID guard is each root's `hasAgentExecution` (U-005).
  5. View rule: `isMessageOfView(message, own, tree)`, `messageViewOfTree`, the three message stores; the validators' endpoint loop removed.
  6. Readers: `ClosedDelegatedRunReader` (bound port), `collaborationParticipantMessages` returns `pastParticipants`, the standalone token total counts closed runs; `CoordinatingRunPresence` replaces `TaskAgentLinkChecker` (removed).
  7. Contracts and web: `pastParticipants` in the DTO (dist rebuilt); the participant store keeps them; identity kind `past`; an unknown "reopened" reference reloads the view in the three contexts.
  8. Documents: `collaboration_model.md` §1, CM-6, CM-8, §3, §5; module docs of the standalone root, Team, Org, Projects, communication and memory.
- Changed files or areas: see `implementation-handoff.md`, "Key Files Or Areas".
- Local validation and result: see `implementation-handoff.md`, "Checks Run".
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: see `implementation-handoff.md`, "Known Risks".

### IR-002 — A Team view gets a reopened run's record; Team-tab names stay current after a rebuild

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` "Round 2" (CRR-002, failure-origin review of API/E2E round 1, API-REV-001); Solution Designer SR-009 (design commit `6e1f3cb23e`); Architecture Reviewer ARCH-REV-006 (Pass).
- Triggering finding IDs: CR-003 (F-3: a Team view that never held a reopened run needed a manual recovery), CR-002 (F-2: a Team tab's past-participant names went stale after a view rebuild that kept the loaded lists). F-1 is API/E2E-owned (DEC-011) and not changed here.
- Classification: CR-003 `Design Impact` resolved in the design (SR-009); CR-002 `Local Fix` (implementation, web).
- Prior authoritative result: IR-001, code review Pass (CRR-001); API/E2E round 1 Fail (API-REV-001).
- Current authoritative result: CR-003 and CR-002 implemented. Contracts tests, server and web type checks, the full server unit suite and the full web unit suite pass (see the handoff's Checks Run, IMP-08 … IMP-11).
- Related solution revision IDs: SR-009. Related architecture-review revision IDs: ARCH-REV-006. Related code-review revision IDs: CRR-001, CRR-002. Related API/E2E revision IDs: API-REV-001. Related delivery revision IDs: N/A.
- Why recorded: rework after API/E2E round 1 and its failure-origin review.
- Approved behavior or requirement IDs affected: BEH-004, BEH-005; AC-002, AC-003, AC-011.
- Implementation delta:
  - CR-003, contract: `autobyteus-team-stream-contracts` `teamTaskExecutionsReopenedPayloadSchema` is its own schema, `{ change_sequence, executions: [{ parent_team_run_id, execution }] }` (at least one). "Closed" keeps its references. `dist/` is rebuilt.
  - CR-003, server: the Team event `TASK_EXECUTIONS_REOPENED` carries `executions` (each a record with its host Team run). The adapter builds them from the loaded tree after the add-back (`taskExecutionsReopenedEvent(tree, references)`), and the view projector maps them as it maps "started". The tree lookup has one home: `agent-team-execution/domain/team-task-execution-lookup.ts` (`findTeamTaskExecution`), used by the projector and the factory.
  - CR-003, web: the Team view handles "started" and "reopened" in one branch. It inserts every record it does not hold (`insertTaskExecution`, with the same context and navigation effects), keeps a record it holds, then removes every reopened execution from the closed list. The branch to `team_stream_recovery_required` is removed. The Agent-run and Org contexts are unchanged.
  - CR-002, web: `reloadRoot` takes `holdsAgent`. In the keep path, a loaded list that names an agent the rebuilt view does not hold, and that its past participants do not name, loads again. Its rows stay while it loads, and live messages are buffered and merged by ID, so no message is missed or doubled. `holdsAgent` comes from each caller: the Agent-run and Org contexts (new `holdsAgent`), and the Team view (`getMemberAddress`) in `TeamStreamingService` and the hydration commit.
  - Docs: `agent_websocket_streaming_protocol.md`, `agent_communication.md`, web `settings.md` and `agent_execution_architecture.md`.
  - Tests:
    - contracts reopened test;
    - server projector test (the reopened record equals the "started" record; a run not in the tree throws);
    - the server E2E helpers in `task-existing-copy-assignment.e2e.test.ts` and `task-reactivation-root-visibility.e2e.test.ts` read references from the Team reopened records;
    - web Team spec (a view that never held the run inserts it, with no recovery effect);
    - participant store spec (CR-002);
    - existing `reloadRoot` test calls pass `() => true`.
- Local validation and result: see `implementation-handoff.md`, Checks Run, IMP-08 … IMP-11.
- Next recipient or routing: Code Reviewer (targeted source review), then API/E2E again.
- Remaining limitations or risks: the browser runs of AC-002 and AC-003 for each root kind, with and without a restart, are API/E2E's. The server E2E helpers were adapted to the new payload but not run here.

