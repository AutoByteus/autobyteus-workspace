# Handoff: Architecture Design Complete

- Result: `Architecture Design Complete`
- Task: `autobyteus-469` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("A run's collaboration tree lists only the runs whose Task is open: stop the tree from growing with every delegation"). Prerequisite PRE-001 of `autobyteus-461`.
- Package identifier: `collaboration-tree-open-tasks-only-469`
- Current solution revision: `SR-008` (answers ARCH-REV-004 finding AR-002 on D-3)
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`). Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Date: 2026-11-10

## Original request

The user's decision of 2026-11-10: fix the constantly growing collaboration tree first, as its own Task, then return to `autobyteus-461`. The Task's goal: when a Task is closed, the runs that worked on it leave the delegating run's tree; the Task's record is the lasting record; a reopened Task or a follow-up Task brings the run back. Must keep working: continuing a closed run, a follow-up Task by run ID, the top run's token total, files attached earlier, the Task page's status and locator, the Memory page.

## What changed since SR-003

After the SR-003 handoff the user asked why a top run stores a list at all, since the Task record holds the same relationship, and decided that it does not (DEC-009): "this collaboration tree itself can be built actually in memory from ... the tasks which are still in progress ... then we don't need to keep this on disk". He also decided that the 14 runs without a Task record leave the tree (DEC-008).

## What changed since SR-004 (review round 1: Fail, one finding)

AR-001: the startup package admission scan reads every Team and Org tree before the Task records are loaded. Answer: the reviewer's first route. Admission and the maintenance repair read a run's own parts only (D-11, `readOwnParts`); no startup step is reordered. Notes B-5 trace the startup order of both entry points and place all 19 construction sites before or after the binding. U-004 and U-007 are closed; AC-005 is aligned to DEC-010; Guideline checklist item 2 and Key Tradeoffs are corrected.

## What changed since SR-005 (review round 2: Pass)

The Implementation Engineer's early check U-008 went against D-1's rule: an entry is `starting` from the moment a delegation is recorded until its work is delivered, also for a follow-up Task given to a run already in the tree, and after a crash between the commit and `markStarted`. Leaving out `starting` would drop runs that REQ-001 keeps in the tree. Corrected rule: the run's current entry names this top run and is open, whatever its `start`; a missing own file is silent for `starting` and `failed`, a warning for `started`. Also from the engineer's checks: the view rule takes the form `isMessageOfView(message, ownAgentRunIds, treeAgentRunIds)`; the three attachment readers need no change (notes B-6). No requirement changed.

## What changed since SR-006 (review round 3: Pass)

D-3 dropped every stored local entry at the first save. An existing migration test failed: when the released migration `20261017_task_agent_own_run_v1` was interrupted and the app loads and saves a tree before the next start, a full record whose own file is not written yet exists only in the tree file. Corrected rule: a save leaves out a stored local entry once its run's own file exists (an existence check; the entry is not interpreted) and keeps an entry whose run has no own file unchanged and in place. The reader ignores both. REQ-007 and AC-009 are made precise. Three U-005 findings are recorded (notes B-7): the run-ID admission is each root's `hasAgentExecution`, not the delivery files; the Team adapter uses `commitExecutionTreeMutation` with `requiresWrite: false`; `resolveExistingCopy` covers closed copies so agent texts stay the same.

## What changed since SR-007 (review round 4: Fail, one finding)

AR-002: a full Team record whose own file exists can still hold the only record of a nested run, and SR-007's save looked at the entry's own run only. Answer: the review's route (b), made strict. A save leaves out a stored local entry only when it is a link by an exact key set (`address`, one of `agentRunId` / `teamRunId`, `startedAt`, optionally `delegatorAgentRunId`) and its run's own file exists at the standard place. Every other stored local entry is kept unchanged and not looked into. AC-009 has three more fixtures, the reviewer's among them.

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

1. D-11 and DS-008: admission on own parts, and notes B-5 (one construction site is `Inferred`: the application runtime's; AC-008 covers it with a server start).
2. D-12: a link to a run on another node whose delegator is an agent of a closed local run.
3. U-009: whether a history index row needs delegated runs (the maintenance repair).
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

Design spec "Risks"; notes U-005.

## Next expected action

Architecture review of D-3 as corrected in `SR-008`, round 5 (design spec D-3, Legacy Removal Policy, "Persisted Data / State Transition Decision", Removal Plan, Backward-Compatibility Rejection Log, Guidance; notes B-8).

## Route

`get_handoff_rules` (2026-11-10): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High" matches. Sent to `/software_engineering_team/architecture_reviewer` with this file and the four solution documents attached. The Task was read again before the handoff.
