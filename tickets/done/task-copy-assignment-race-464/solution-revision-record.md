# Solution Revision Record — task-copy-assignment-race-464

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task autobyteus-464 (FU-005 of autobyteus-447) | EXC-E2E-004 refusal under load | N/A | Requirements Approved; Design Ready | BEH-001…BEH-003; REQ-001…REQ-005; AC-001…AC-006; D1–D5 | Architecture Design Complete, Small / High → architecture review |
| SR-002 | Evidence | ARCH-REV-001 Pass with non-blocking AR-001, AR-002 | AR-001, AR-002 | Design Ready (SR-001) | Design Ready (spec accuracy) | Design spec Change Scope, Risks, escalation; RSK-002 | Accuracy only; no design or requirement change |

## Revision Entries

### SR-001 — Closure release and reopening commits serialized in the root's lifecycle queue

- Phase and classification: `Initial Baseline`.
- Trigger: Project Task autobyteus-464 from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's comment says design first; choices within the direction are the team's; keep it simple.
- Evidence:
  - REPRO-01 reproduced the refusal on base `c8f303af70` with a logged sequence.
  - PROTO-01: the fix, prototyped, passed twice under load with both orders exercised.
  - Both were reverted.
- Status: requirements `Approved`; design `Ready`.
- Intended behavior changed: the assignment is now delivered where it was refused; nothing else.
- Approval: the Solution Designer within the Task's direction (no `Needs user` decision; DEC-001 deliver rather than refuse; DEC-002 include reactivation). The user was informed in the Solution Designer's conversation on 2026-11-10.
- Classification: `task_size=Small`, `architectural_risk=High`. It is a concurrency-ordering change in the shared lifecycle of all three root kinds; uncertainty is low.
- Route: Architecture Design Complete, High → `/software_engineering_team/architecture_reviewer`; handoff file `handoff-SR-001.md`.
- Also changed: `docs/design-cases.md` Case 1 ("Again in autobyteus-464"); uncommitted, to be committed with the ticket documents.
- Remaining gaps: None.
- Next action: independent architecture review.

### SR-002 — Architecture review accuracy fixes (ARCH-REV-001)

- Classification: evidence-only clarification. ARCH-REV-001 passed (`design-review-report.md`); the reviewer sent the package to implementation, and this revision does not repeat that handoff.
- AR-001: Change Scope now says that a release overtaken by a reopening commit publishes no `closed`; the published order still matches the committed order.
- AR-002: the dispatch reference is labelled a runtime commit (shape only). The safety argument for a Task-side write in a queue step is the lock order (queue head, then `serializeCopyInTask`; no reverse edge), and a reverse edge is an escalation trigger. RSK-002 is updated to match.
- Intended behavior changed: No. Approval: unchanged (SR-001 basis). Classification: unchanged (Small / High).
- Next action: implementation continues; it is told about the added escalation trigger.
