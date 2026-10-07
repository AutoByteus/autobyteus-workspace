# Implementation Revision Record — `reactivate-done-task-runs`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer` / `design-review-report.md` / round 2 (Pass) | N/A (AR-002, AR-003, AR-004 applied as guidance) | `Initial Baseline` | SR-002, ARCH-REV-002 | Implementation complete; routed to Code Review |

## Revision Entries

### IR-001 — Assigner reactivation of a closed assignment, `target_kind`, and non-final DONE texts

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-review-report.md`, round 2 (ARCH-REV-002, Pass)
- Triggering finding IDs: N/A. The non-blocking guidance applied:
  - AR-002: queue-head `isOpen` skip, plus a deterministic test.
  - AR-003: `prompt_engineering.md` mirror updated.
  - AR-004: no status write; AC-015 covered in tests.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete for SR-002 (REQ-001..011, AC-001..015 implementation paths). Local checks pass, except failures that also fail on the base.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the first implementation handoff for the approved SR-002 package.
- Approved behavior or requirement IDs affected: BEH-001..008; REQ-001..011; QR-001, QR-002.
- Implementation delta:
  - **Task side.** The pure `reopenTaskAgentResource` transition (one `assigned` entry, assigner only, started only). `TaskAgentResourceService.locationOf`, `assertReopenable` and `reopenAssignment` (one `store.update`; nothing is written when the entry is already open). `ProjectTaskService.assertReopenable` / `reopenAssignment`: the Task must exist and not be DONE, re-checked under `serialize`; the status is never written. New `TASK_REACTIVATION_UNAVAILABLE`.
  - **Port.** `assertReopenable`, `reopenAssignment` and `TASK_REACTIVATION_REJECTION_CODES`.
  - **Lifecycle.** `deliverToExactTarget` (DS-L1) with queue kind `reopen` and the AR-002 skip. The result message notes the reactivation, or the failure after commit.
  - **Scope.** `discardReleasedExecution`; the shared `settleExactRelease` is extracted from `releaseTaskAgentResources` with identical behavior.
  - **Adapters (×3).** `taskExecutionWithIngress`, a synchronous `discardReleasedExecution` and `publishTaskExecutionsReopened`.
  - **Backends.** Root agent registry `discardReleasedTask`; root team directory `discardReleasedTask`; `TeamRun.discardReleasedDirectTaskExecution` → flat backend → manager → task agent / task team registry `discardReleased`; `TeamRunResolver.retireTerminated`.
  - **Facades (×3).** Route the run-ID message through `deliverToExactTarget`.
  - **Events, projectors and contracts.** `TASK_EXECUTIONS_REOPENED` / `task_executions_reopened`, reusing the closed reference shapes. Both contract `dist/` folders are rebuilt.
  - **Web.** `removeReopenedTaskExecutions`, applied in the Team, Agent and Org consumers.
  - **`delegate_task`.** `target_kind` is required on success.
  - **Texts and docs.** REQ-011 texts in the tool contracts and prompt docs; docs updated (server Projects › Reactivation, Team execution, communication, standalone root; web projects, Teams, chat; TESTING.md wording).
- Changed files or areas: see implementation-handoff.md › Key Files Or Areas.
- Local validation and result (details in the handoff):
  - Server source `tsc` is clean and `build` passes.
  - Focused server suites: 144 files / 1080 tests pass.
  - Full unit: the 60 pre-existing base failures plus 1 load-timing flake.
  - Integration: the same 24 failures as the base.
  - Contracts: team 8/8; collaboration has the same 7 pre-existing failures, and the new test passes.
  - Web: focused specs pass; 1 pre-existing failure.
  - `vue-tsc`: no new errors.
  - Mutation checks for the AR-002 guard and the backend discards.
  - Temporary browser self-check: reactivated rows reappear live and after reload in the Agent, Team and Org roots; helpers stay hidden.
- Next recipient or routing: `get_handoff_rules` → Code Review (Large/High).
- Remaining limitations or risks:
  - Deliberate structural deviation: the release settlement sits in the scope owner, not in each adapter (same behavior, no duplication).
  - Not browser-verified: real backend restart, and real-runtime AC-001..015 (API/E2E).
  - Agent-repository skill text follow-up (outside this repository).
