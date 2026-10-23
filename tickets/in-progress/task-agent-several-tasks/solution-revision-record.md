# Solution Revision Record — task-agent-several-tasks

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task `autobyteus-275` and the user's option-B decision (2026-10-23) | N/A | N/A | Ready for Approval | All | DEC-001–DEC-004 put to the user |
| SR-002 | Requirements | The user's clarification: Agents and Teams; the delegator manages it (2026-10-23) | N/A | Ready for Approval | Ready for Approval | Desired outcome | Confirmed; no behavior change to the draft |
| SR-003 | Requirements | The user's answer on reports, order and freeing (2026-10-23) | N/A | Ready for Approval | Approved | DEC-001–DEC-004 | Approved; design starts |
| SR-004 | Design | Architecture design over SR-003 | AF-001 (probe) | No design | Design Ready (Small / High) | All REQ / AC; DS-001, DS-002 | `design-spec.md`; to architecture review |
| SR-005 | Design | ARCH-REV-001 Fail (Design Impact) | ARF-001, ARF-002 | Design Ready | Design Ready | REQ-002 (unchanged); design DS-001 text, Removal Plan, file mapping | Report clause added; dead code listed; back to review |

## Revision Entries

### SR-001 — Initial baseline

- Trigger: Project Task `autobyteus-275` (its comment holds the user's decision, option B) and the Project Task Manager's message, 2026-10-23.
- Status: `Ready for Approval`; no design.
- Approval impact: the direction is the user's; DEC-001 to DEC-004 need the user; DEC-005 to DEC-012 are the Solution Designer's, the user informed with the questions.
- Next action: the user's answers.

### SR-002 — The user's clarification

- Trigger: the user, 2026-10-23: "not just a team … when you dedicate a task to a Agent or agent team … the dedicate can basically dedicate another task to the same team … it's completely managed by the dedicator itself … currently the dedicated has to close the original task of first … it's not so convenient."
- Change: the Desired outcome states Agent and Team copies and delegator control. This was already the draft's behavior (REQ-001); no requirement changed.
- Next action: the user's go on DEC-001 to DEC-004.

### SR-003 — Approved

- Trigger: the user, 2026-10-23: "we don't add the task ID to send message … the dedicator … just supply this agent team ID … we want to let the agent do their work … the reference is decreased … when there are no more tasks on the active team … the team resources are just cleaned."
- Decisions: DEC-001 and DEC-002 are the user's. DEC-003 and DEC-004 are the Solution Designer's within the direction, the user informed.
- Approval: `User`, baseline SR-003.
- Next action: architecture design.

### SR-004 — Architecture design

- Probe (Reproduced, AF-001): with two open Tasks, the last close fences the copy without requesting a stop. The release rule becomes "no open entry left" (D-RELEASE).
- The user confirmed in conversation (2026-10-23) that the given Task arrives as today's message, with only the false sentence changed ("Your Task <key> is still open."). This matches REQ-002; no requirement changed.
- Task size / risk: `Small` / `High` (lifecycle invariant and release rule; `delegate_task` contract; CM-6).
- Handoff: `/software_engineering_team/architecture_reviewer`.

### SR-005 — ARCH-REV-001 findings

- ARF-001: the given-Task message keeps the approved report request (REQ-002, DEC-001 (a)): "`…is still open; name the Task key in each report.`". Route 1 (Design Impact); requirements unchanged. The user had been shown the sentence without the clause; the Solution Designer tells the user about the clause.
- ARF-002: dead code from the removed refusal added to the Removal Plan with grep evidence (`newCopyHint`, `namedTask`, the `currentTaskReference` / `currentTaskStatus` inputs, the reads in `assertCopyAssignable` lines 65–68). `locationOfTask` is kept (D-OPEN uses it). `task-assignment-eligibility.ts` is added to the mapping and holds `openTaskReferencesOf` (the service is at 486 lines).
- Reviewer notes adopted: the "already has Task" check applies only to a closed current Task; the corrected line count.
- Classification unchanged (Small / High). Handoff: back to `/software_engineering_team/architecture_reviewer`.

### Review notifications (informational, no new solution round)

- 2026-10-23, ARCH-REV-001: Fail (ARF-001, ARF-002). Resolved in SR-005.
- 2026-10-23, ARCH-REV-002: **Pass** on SR-005. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`. The reviewer routed the package to `/software_engineering_team/implementation_engineer`; no repeat handoff.
- The user was told about the added report clause in the Solution Designer's conversation on 2026-10-23, after the SR-005 fix, with the exact text and the offer to drop it. No objection so far.
