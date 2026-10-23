# Architecture Review Revision Record — task-agent-several-tasks

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Small / High) | SR-003, SR-004 | N/A | Fail (Design Impact) | ARF-001, ARF-002 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete after ARCH-REV-001 | SR-005 | Fail (Design Impact) | Pass | ARF-001, ARF-002 (resolved) |
| ARCH-REV-003 | Round 3 / Revised Architecture Design Complete after CRR-003 (CR-002) | SR-006 | Pass | Pass | None (CR-002 is the code reviewer's) |

## Revision Entries

### ARCH-REV-001 — Initial review of several open Tasks per task agent

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer` (`handoff-architecture-design-complete.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-004); N/A.
- Relevant solution revision IDs: SR-003 (approved requirements), SR-004 (design).
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What baseline was established: the design was checked against the code at `3b09fbe308`. These pass:
  - D-RELEASE (no open entry left), confirmed against the AF-001 probe and `releasableByHostRoot`;
  - the refusal removal;
  - the DS-002 concurrency reasoning (AP-001), with the root's `isClosed` re-check;
  - the `openTaskReferencesOf` port query;
  - reuse of the existing-copy path;
  - `Not Affected` persisted data.

  Two gaps block the pass: the message omits REQ-002's report-key request, and the removal plan misses code the change leaves unused.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - ARF-001: the message text omits REQ-002 / AC-001's request to name the Task key in reports;
  - ARF-002: code left unused by the refusal removal (`newCopyHint`, `namedTask`, the `currentTaskReference` / `currentTaskStatus` inputs, the current-Task reads in `task-assignment-eligibility.ts`, possibly `locationOfTask`) is missing from the removal plan.
- Material classification changes: none (Small / High confirmed).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AP-002: concurrent `delegate_task` calls to one copy (Not Reachable; cosmetic);
  - DEC-007's sub-work tradeoff;
  - tool-text wording.

### ARCH-REV-002 — Recheck of ARF-001 and ARF-002 (SR-005)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/design-review-report.md`
- Review round and trigger: Round 2; revised `Architecture Design Complete` (`handoff-architecture-design-complete.md`, section "Round 2").
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` SR-005; ARF-001, ARF-002.
- Relevant solution revision IDs: SR-005 (on SR-003 / SR-004).
- Prior authoritative decision: `Fail` — `Design Impact` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: both findings were verified against the current `design-spec.md`. The requirements are unchanged (route 1). The other structural verdicts keep their round-1 evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARF-001 | Open (blocking) | Resolved | SR-005 | DS-001 narrative (line 120) and example (line 258) add `; name the Task key in each report.` when other Tasks are open; the text is as today otherwise. REQ-002 / AC-001 / UC-003 are met. |
| ARF-002 | Open (blocking) | Resolved | SR-005 | Removal Plan lines 145–148 list `newCopyHint`, `namedTask`, the two inputs and the `assertCopyAssignable` reads (lines 65–68), with grep evidence. `locationOfTask` is kept for D-OPEN. `task-assignment-eligibility.ts` is mapped (line 234) and holds `openTaskReferencesOf`. |

- New or remaining finding IDs: none.
- Material classification changes: none (Small / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AP-002 (concurrent `delegate_task` to one copy; Not Reachable; cosmetic);
  - DEC-007's sub-work tradeoff;
  - tool-text wording;
  - the user still has to be told about the report clause (SR-005).

### ARCH-REV-003 — Recheck of the SR-006 delta (the app's help line, derived consumers)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/tickets/in-progress/task-agent-several-tasks/design-review-report.md`
- Review round and trigger: Round 3; revised `Architecture Design Complete` (`handoff-architecture-design-complete.md`, section "Round 3"), after the code reviewer's failure-origin review CRR-003 classified API-F-001 as `Design Impact` CR-002.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` SR-006; `code-review-report.md` CRR-003 / CR-002.
- Relevant solution revision IDs: SR-006 (on SR-003 to SR-005).
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The behavior basis is reconfirmed with REQ-008 extended, plus DEC-013 and AC-011: a text correction, user informed, with DEC-003 standing.
  - I redrew the affected display path in call order (Task page → root view → `TaskRootSection.vue:9` → catalog). The new sentence is true for every open/closed combination, and only the catalog strings change.
  - The new Principle 11 derived-consumers verdict is added and passes: twelve consumers, each with a decision verified in code. One unnamed consumer (`settle`) is correct as is and recorded as a non-blocking note.
  - A grep finds no other app string that states the one-Task stop rule.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARF-001 | Resolved (ARCH-REV-002) | Resolved | SR-005 | Unchanged in SR-006 |
| ARF-002 | Resolved (ARCH-REV-002) | Resolved | SR-005 | Unchanged in SR-006 |
| CR-002 (code reviewer's; context only) | Open (CRR-003) | Design resolved | SR-006 | Design Change Scope table row "'Assigned to' help line"; file mapping line 254; sequence step 4. Requirements: REQ-008, DEC-013, AC-011 with exact en / zh-CN strings. The code reviewer confirms the implementation. |

- New or remaining finding IDs: none.
- Material classification changes: none (Small / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - a closed Task's "Assigned to" reads `offline` while the team works on another Task (DEC-003; follow-up territory);
  - DEC-013 and the report clause rest on "user informed";
  - AP-002, DEC-007, tool-text wording as before.
