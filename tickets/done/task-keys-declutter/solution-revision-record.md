# Solution Revision Record — task-keys-declutter

## Revision Index

| Revision | Phase | Trigger | Findings | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Project Task `autobyteus-132` (user feedback on v1.5.5-beta.3) | N/A | N/A | Requirements Approved; Design Ready | BEH-001–004; REQ-001–004; AC-001–005 | Architecture Design Complete (Small / Low) |

## Revision Entries

### SR-001 — Keys only where they link or refer

- Classification: `Initial Baseline`.
- Trigger: the user's feedback and screenshot, via `/project_task_manager`, 2026-10-17.
- Requirements: Approved within the direction (the user's own direction; DEC-001–004 by the Solution Designer, user informed 2026-10-17).
- Supplements: the predecessor `ui-ux-spec.md` is superseded for DEC-001 / DEC-008 and the affected VIS. Its update is Product-owned and requested through `/project_task_manager`.
- Intended behavior changed: `Yes`, relative to the predecessor ticket, by the user's direction.
- Classification: `Small` / `Low` (display removal plus a dead API field).
- Handoff: `handoff-architecture-design-complete.md`.
- Follow-ups: the design-record request; the optional badge-tooltip summaries.

## External Dependencies

- 2026-10-17: `/project_task_manager` routed the Product design record update as Task `autobyteus-133` (depends on `autobyteus-113`) to the Product Team copy that made the original design. The scope is the design record only: keys removed from cards and the tree summary, kept elsewhere. This package's Terminal waits for that update to be integrated; `/project_task_manager` will report it. Requirements and design are unaffected.
