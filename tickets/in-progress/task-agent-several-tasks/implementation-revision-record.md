# Implementation Revision Record — task-agent-several-tasks

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002 | Implemented; to Code Review |

## Revision Entries

### IR-001 — A task agent may hold several Tasks given by delegate_task

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 2 (Pass, ARCH-REV-002)
- Triggering finding IDs: N/A (the four implementation notes are applied; see the handoff)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete at `a18fe714cd`; implementation-scoped checks IMP-01–IMP-05
- Related solution revision IDs: SR-005 (requirements SR-003)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff (Small / High → Code Review)
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-009; AC-001–AC-009 (AC-010 left to API/E2E)
- Implementation delta:
  - Started from the Solution Designer's probe, as a unit test that failed before the fix (IMP-01).
  - `releasableByHostRoot`: copies with an entry in the Task and no open entry left. `deriveCurrent`: no conflict log for several open entries. New `openTaskIdsOf`.
  - `assertTaskExecutionAssignable`: removed the "still works on" refusal, its helpers and inputs. The same-Task guidance now applies only to a closed current Task.
  - New `openTaskReferencesOf`, on the port and in `TaskAssignmentEligibility`. The lifecycle reads it before any change, and the given-Task message names the other open Tasks.
  - `delegate_task` / `update_task` texts; CM-6, `projects.md`, `agent_team_execution.md`.
  - Tests: the port fake follows the new rule; the result catalogue's M-43 is withdrawn.
- Changed files or areas: see the handoff's "Key Files Or Areas"
- Local validation and result: see the handoff's Checks Run (IMP-01–IMP-05)
- Next recipient or routing: Code Review (per `get_handoff_rules`)
- Remaining limitations or risks: existing E2E assertions on the removed refusal and the old `update_task` text need updating (listed in the handoff); a Task deleted while open keeps its open entry (see Known Risks).
