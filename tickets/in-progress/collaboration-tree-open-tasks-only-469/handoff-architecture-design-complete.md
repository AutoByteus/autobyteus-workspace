# Handoff: Architecture Design Complete

- Result: `Architecture Design Complete`
- Task: `autobyteus-469` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("A run's collaboration tree lists only the runs whose Task is open: stop the tree from growing with every delegation"). Prerequisite PRE-001 of `autobyteus-461`.
- Package identifier: `collaboration-tree-open-tasks-only-469`
- Current solution revision: `SR-004` (replaces `SR-003`, whose review was stopped without a report)
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`). Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Date: 2026-11-10

## Original request

The user's decision of 2026-11-10: fix the constantly growing collaboration tree first, as its own Task, then return to `autobyteus-461`. The Task's goal: when a Task is closed, the runs that worked on it leave the delegating run's tree; the Task's record is the lasting record; a reopened Task or a follow-up Task brings the run back. Must keep working: continuing a closed run, a follow-up Task by run ID, the top run's token total, files attached earlier, the Task page's status and locator, the Memory page.

## What changed since SR-003

After the SR-003 handoff the user asked why a top run stores a list at all, since the Task record holds the same relationship, and decided that it does not (DEC-009): "this collaboration tree itself can be built actually in memory from ... the tasks which are still in progress ... then we don't need to keep this on disk". He also decided that the 14 runs without a Task record leave the tree (DEC-008).

## Goals and status

- Requirements: `Approved` at `SR-004` (DEC-001, DEC-008, DEC-009 by the user; the rest by the Solution Designer within that direction, the user informed).
- Design: `Ready`. The model is the user's; no further user approval of the design is required.
- Classification: `task_size = Large`, `architectural_risk = High`.

## The design in short

- No top run stores a list of local delegated runs. A tree store composes a tree from the file's own parts and links to other nodes, plus the top run's runs of open Tasks, which it asks of the Task side through one interface, plus those runs' own files.
- A save writes own files and links to other nodes only. Existing local links are ignored on read and dropped at the file's next save. No migration.
- A loaded root drops a run from its in-memory tree when its Task is closed and the run is stopped, and adds it back from its own file inside the existing "reopen" queue step. Neither writes a file.
- The Team tab's names, message attachments, the Memory page and the standalone token total get their own source for closed runs.

## Points for the reviewer

1. Run storage now depends on the Task records being loaded (`OpenDelegatedRunSource`, bound at composition). Startup order is open premise U-007.
2. The candidate rule for "in the tree" (design spec D-1 and Guidance; U-008).
3. Every local record is composed into the root list, also for an Org tree (U-004, FU-003).
4. Only the standalone path was read line by line (U-005).
5. The note for `autobyteus-461` on the shared lookup key (`hostRoot`), from your observation (design spec "Relationship to autobyteus-461").
6. Your observations of 2026-11-10 are recorded in the notes (B-4) with what each led to.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469`
- Branch: `codex/collaboration-tree-open-tasks-only-469` (not pushed)
- Base: `origin/personal` at `bff4faa6f664d073ae8e1ccdcb044c91747d8179`
- Finalization target: `personal` (a release only on the user's word)

## Documents (absolute paths)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/tickets/in-progress/collaboration-tree-open-tasks-only-469/`

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`
- `follow-ups.md` (FU-001 … FU-003; not sent yet)
- `evidence/` (four read-only measurement scripts and their outputs)

## Constraints

`DESIGN.md`, `TESTING.md`, `RELEASE.md`; the Data Migration Guideline; the Collaboration Model, which this change updates. Temporary diagnostics only in isolated worktrees; never run a load, startup or conversion on the user's data (the evidence scripts only count, read-only).

## Open risks

Design spec "Risks"; notes U-003 … U-008.

## Next expected action

Independent architecture review of `SR-004` (Large, High), as round ARCH-REV-001.

## Route

`get_handoff_rules` (2026-11-10): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High" matches. Sent to `/software_engineering_team/architecture_reviewer` with this file and the four solution documents attached. The Task was read again before the handoff.
