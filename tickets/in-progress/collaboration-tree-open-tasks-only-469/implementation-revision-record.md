# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 … ARCH-REV-005 | N/A (two Design Impacts raised during this round, both decided: SR-006, SR-007/SR-008) | `Initial Baseline` | SR-005 … SR-008, ARCH-REV-002 … ARCH-REV-005 | Implemented; ready for code review |

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
