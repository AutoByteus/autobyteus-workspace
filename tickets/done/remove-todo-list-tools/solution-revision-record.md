# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Initial solution baseline from solution designer | N/A | `Initial Baseline` | Design-ready requirements and implementation-ready design for clean native ToDo tool/runtime removal with server/Codex TODO preservation |

## Revision Entries

### SR-001 — Native ToDo capability removal baseline

- Triggering role, report path, and round: Solution designer initial investigation; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-todo-list-tools/tickets/done/remove-todo-list-tools/investigation-notes.md`; round 1.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready requirements and design spec.
- Why this baseline or revision entry is recorded: Establish the initial approved-scope candidate and preserve the distinction between native `autobyteus-ts` ToDo tools and server/Codex `TODO_LIST_UPDATE` events.
- Resolution: Remove the four native tools, their in-memory model/schema/runtime state, native notifier/event/stream path, and the AutoByteus converter mapping; preserve generic file/skill tooling, `ToolCategory.TASK_MANAGEMENT`, and server/Codex/web TODO delivery.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-005; REQ-001 through REQ-006; AC-001 through AC-007.
- Canonical artifacts and sections updated: `requirements-doc.md` (all sections); `investigation-notes.md` (source log, behavior map, findings, transition evidence); `design-spec.md` (current state, spines, ownership, removal plan, change sequence).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer must validate the native-vs-server TODO boundary, clean-cut public-surface removal, and retained server task-management category before implementation.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: External consumers of removed native imports/stream enum values may break intentionally; no user approval or architecture-review result is recorded yet.
