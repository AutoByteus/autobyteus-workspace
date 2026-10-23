# Implementation Revision Record — task-agent-several-tasks

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002 | Implemented; to Code Review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (Fail, Local Fix) | CR-001 | `Local Fix` | IR-001, CRR-001 | Fixed; to Code Review (targeted delta) |

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

### IR-002 — CR-001: the update_task text follows the new release rule

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 (implementation review round 1)
- Triggering finding IDs: CR-001 (and the optional C-06 widening)
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `a18fe714cd`. The `update_task` text said a parent's close sets its open parts the same way "(stopping their task agents)". This is false for a part's task agent that holds another open Task.
- Current authoritative result: `cd8c289b67`. The parenthetical now reads "(ending their work for their task agents, as above)". The delegate_task pointer now reads "To give a task agent another Task, also while its other Tasks are open, use delegate_task …".
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Approved behavior or requirement IDs affected: REQ-008
- Implementation delta: one tool-text string (two sentences). Two unit text pins: `project-task-parts-tools.test.ts:95` and the `project-task-tools.test.ts` regex. No logic change.
- Changed files or areas: `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts`; `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-parts-tools.test.ts`; `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`
- Local validation and result: IMP-06 (the project-task tool unit tests, 137 passed) and IMP-07 (typecheck plus the full server unit suite), on `cd8c289b67`. Integration was not rerun, because a text change cannot affect it; IMP-05 still stands.
- Next recipient or routing: Code Review, targeted delta (per `get_handoff_rules`: a Local Fix on a High-risk package)
- Remaining limitations or risks: `project-task-boundaries.e2e.test.ts:846` pins the old parenthetical (API/E2E-owned, listed in the handoff). FU-001 is recorded by the code reviewer.
