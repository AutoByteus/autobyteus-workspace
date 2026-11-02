# Requirements — A delegated copy runs in its Task's Project folder (autobyteus-97)

## Document Status

- Status: `Ready for Approval` (one decision needs the user: DEC-005)
- Current solution revision ID: SR-001
- Package: `delegated-copy-project-workspace`; Project Task `autobyteus-97`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the rule is the user's (2026-11-02, Task comments)
- Requirements owner: Solution Designer; date 2026-11-02
- Approved by: pending DEC-005

## Problem And Desired Outcome

- Problem: a delegated copy always gets the top-level run's folder (E-001), so an Agent Package Creator doing AutoByteus Agents work runs in the superrepo, with Files and Terminal on the wrong folder.
- Outcome: a new copy of a Task whose Project has a linked folder runs in that Project's first linked folder; otherwise as today.

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | The folder rule | Task's Project has a link: its first link. No link, or no Project: inherit as today. No `delegate_task` parameter. | User | Decided by the user (Task) |
| DEC-002 | Sub-work (a worker delegating without `task_id`) | Same rule: it belongs to the same Task. Today it would take the top-level run's folder (E-001), which would split a Task's work across folders. | Solution Designer | Decided |
| DEC-003 | Team copy | One folder for the whole copy: the Team's default and every member; also a configured placement's snapshot (Org or Team root). | Solution Designer | Decided (the Task asks for one workspace) |
| DEC-004 | Linked folder missing on this node | Refuse the delegation (`delegated: false`) with a message naming the Project and the folder, before any Task link; never fall back silently. Remote copies are unchanged (peer's temp workspace, E-007). | Solution Designer | Decided (the Task asks for a clear error) |
| DEC-005 | Where does the copy show in the left tree? | See the question to the user. Recommended: it stays nested under the run that delegated it, in Workspaces and Projects modes, with a small folder chip when its folder differs from that run's; Files and Terminal open its own folder. | User | Needs user |
| DEC-006 | Existing copies and runs | Keep their folder, including an existing copy given a follow-up Task of another Project (E-010). To work in another Project's folder, delegate to a new copy. | Solution Designer | Decided |
