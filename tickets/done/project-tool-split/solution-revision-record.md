# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Project Task from `/project_task_manager`, 2026-10-17 | N/A | N/A | Approved | BEH-001..004; REQ-001..006; AC-001..007; DEC-001..006 | Approved (Solution Designer within the direction, user informed) |
| SR-002 | Design | Architecture design | N/A | Requirements Approved; design N/A | Design Ready; Medium / High | all | Architecture Design Complete |

## Revision Entries

### SR-001 — Requirements baseline: two project tools, old tool kept for the transition

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task "Split create_or_update_project into create_project and update_project" (user go-ahead 2026-10-17), promoted from FU-2 of `task-tool-split`.
- Prior status: N/A. Current status: `Approved` by the Solution Designer within the direction; the user is informed in the Solution Designer's conversation (2026-10-17).
- Content: `create_project` / `update_project` with today's semantics; nothing automatic; `create_or_update_project` unchanged during the transition (DEC-002, differs from the Task-split precedent by the user's direction); old+new lists work in the current and new release (REQ-005); docs and release notes (DEC-004, DEC-005).
- User decision outstanding, outside this ticket: DEC-006 removal timing (proposed: the first release after the PTM package has dropped the old name).
- Supplements: none; precedent `tickets/done/task-tool-split/` read-only.
- Next action: architecture design.

### SR-002 — Architecture design: split parsers, old tool as a dispatcher

- Phase and classification: Design (`Initial Baseline` of the design).
- Requirements unchanged (SR-001 approval applies).
- Design: two parsers sharing private validators replace `parseProjectMutation`; manifest maps each tool to today's service call; `create_or_update_project` keeps name/description/schema and dispatches by `project_id` presence to the new paths. Exposure, MCP catalog, service and data unchanged (`Not Affected`).
- Conflict recorded: general "no backward compatibility" principle vs the user-directed transition; bounded by the dispatcher and FU-2.
- Classification: `task_size=Medium`, `architectural_risk=High` (new public agent tool contracts and protected names; two-version transition contract).
- Follow-ups: FU-1 (PTM package, PM creates after release), FU-2 (remove old tool, user decides timing).
- Handoff: `handoff-architecture-design.md`.
- Review outcome (informational): ARCH-REV-001 **Pass** on SR-002 (2026-10-17), no findings, Medium/High confirmed (`design-review-report.md`, `architecture-review-revision-record.md`). Non-blocking guidance R-1..R-4 is for implementation and validation. The reviewer handed the package to `/software_engineering_team/implementation_engineer`. No design revision needed.
