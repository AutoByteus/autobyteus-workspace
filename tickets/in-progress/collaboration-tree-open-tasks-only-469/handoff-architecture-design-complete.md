# Handoff: Architecture Design Complete

- Result: `Architecture Design Complete`
- Task: `autobyteus-469` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("A run's collaboration tree lists only the runs whose Task is open: stop the tree from growing with every delegation"). It is prerequisite PRE-001 of `autobyteus-461`.
- Package identifier: `collaboration-tree-open-tasks-only-469`
- Current solution revision: `SR-003`
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`). Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Date: 2026-11-10

## Original request

The user's decision of 2026-11-10: fix the constantly growing collaboration tree first, as its own Task, then return to `autobyteus-461`. The Task's rules: an entry exists while a Task its run works on is open; reopening plus the assigner's message, or a follow-up Task by run ID, puts it back; a run with several Tasks stays until the last closes; sub-work runs leave with their Task; a temporary Task keeps its entry until closed; a run of no Task keeps its entry; all three kinds of top run; today's closed entries are removed. Must keep working: continuing a closed run, a follow-up Task by run ID, the top run's token total, files attached earlier, the Task page's status and locator, the Memory page.

## Goals and status

- Requirements: `Approved` at `SR-003`. The user decided DEC-001 (no visible change: "I don't think under UI there will be any difference"); the Solution Designer decided the rest within the direction and informed the user.
- Design: `Ready`. No user approval of the design is required by the direction.
- Classification: `task_size = Large`, `architectural_risk = High` (design spec, "Task Size And Architectural Risk").

## What the design does, in short

- The root removes a local delegated run's link from its tree when the Task side says the run is closed and the run is stopped: as the last part of the closure's release step, and when a root is loaded (before its tree is read). The second covers Tasks closed while the root was not loaded and the closed links that exist today.
- The root puts the link back from the run's own file inside the existing "reopen" queue step, for the assigner's message after a reopen and for a follow-up Task by run ID.
- No stored shape changes and no migration (DEC-005; the design spec answers the Data Migration Guideline checklist).
- Links to runs on another node are never removed (DEC-003; follow-up FU-001).
- The closed-run filter stays; each surface that showed something of a closed run through the tree gets its own source (Team tab names, attachments, Memory page, standalone token total).

## Points for the reviewer

1. The decision against a startup migration, although the Task's text names one (DEC-005; design spec "Persisted Data / State Transition Decision").
2. Keeping the closed-run filter beside the unlink (design spec "Key Tradeoffs").
3. The Team and Org mechanics were mapped by name and through their shared functions; only the standalone path was read line by line (notes U-005).
4. Open premises for implementation: notes U-003 … U-006.
5. Two decided derived effects: DEC-006 (refusal text for a non-coordinator member of an unlinked team) and DEC-007 (a run's last activity counts the listed runs).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469`
- Branch: `codex/collaboration-tree-open-tasks-only-469` (not pushed)
- Base: `origin/personal` at `bff4faa6f664d073ae8e1ccdcb044c91747d8179`
- Finalization target: `personal` (a release only on the user's word)

## Documents (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/tickets/in-progress/collaboration-tree-open-tasks-only-469/requirements-doc.md`
- `…/investigation-notes.md` (same folder)
- `…/design-spec.md`
- `…/solution-revision-record.md`
- `…/follow-ups.md` (FU-001, FU-002; not sent yet)
- `…/evidence/` (three read-only measurement scripts and their outputs)

## Constraints

- `DESIGN.md`, `TESTING.md`, `RELEASE.md` of the repository; the Data Migration Guideline; the Collaboration Model, which this change updates.
- Temporary diagnostics only in isolated worktrees; never run a load, startup or conversion on the user's data (the evidence scripts only count, read-only).

## Open risks

Design spec "Risks"; notes U-003 … U-006.

## Next expected action

Independent architecture review of `SR-003` (Large, High).

## Route

`get_handoff_rules` (2026-11-10): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High" matches. Sent to `/software_engineering_team/architecture_reviewer` with this file and the four solution documents attached. The Task was read again before the handoff: no comment was added since it was assigned.
