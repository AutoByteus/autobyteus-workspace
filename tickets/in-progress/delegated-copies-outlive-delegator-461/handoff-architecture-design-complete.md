# Handoff: Architecture Design Complete

- Result: `Architecture Design Complete`
- Task: `autobyteus-461` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("Stopping an agent (e.g. the Project Task Manager) must not stop the task agents and task agent teams it delegated to")
- Package identifier: `delegated-copies-outlive-delegator-461`
- Current solution revision: `SR-020` (answers ARCH-REV-003: AR-005 narrowed; see the design's table "Round 2", last rows)
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`). Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Date: 2026-11-11
- Classification: `task_size = Large`, `architectural_risk = High`

## Status and approval

- Requirements `Approved` with `target-collaboration-contract.md` revision 5. The user took every decision on 2026-11-11 (TC-4 revised, TC-7, TC-8, TC-9, TC-10, DEC-011) and approved the package for review after the Solution Designer's own validation (quotes in `solution-revision-record.md` SR-014 … SR-018).
- Design `Ready`, self-validated (design spec "Self-Validation").

## History you need

- The earlier round, ARCH-REV-001 (on SR-010, contract revision 2), failed with AR-001 … AR-010. Its report and revision record are in this folder.
- The prerequisite `autobyteus-469` has since been delivered (`827f1e68dc`). It removed the stored list of delegated runs and made the Task record the index.
- The branch is rebased onto that base. The contract was re-validated on the latest code and data and rewritten as revision 5.
- The design is new. Its table "Earlier Review Findings" answers AR-001 … AR-010.

## The design in short

**Data model**
- The delegation is stored once on each node, as `delegatedFrom { delegatingRun, delegatorAgentRunId }`, one hop.
- On this node it is in the run's Task entry, replacing `hostRoot` and `assignedBy`. A peer-started run carries it in its own file, because its Task is on the other node.
- `taskAgent` goes. The standalone `collaboration_tree.json` goes: the address moves to `run_metadata.json`, and peer runs' node and members move into their Task entries.
- `subWork` replaces `delegated`.

**Runtime**
- Every run is its own root and owns its life. A run's life is bound to its Task, never to the run that delegated it.
- No hosting remains, for standalone, team and org runs alike.

**Messages**
- Centered on the Task: two runs may talk when they share an open Task, or when one is the run that assigned the other's Task.
- By address: the sender's team, then the standing agents of the run that assigned its Task.
- Validated on every stored message: 1,540 of 1,604 allowed as today; the 64 others all involve legacy runs; none newly allowed.

**Owners**
- The Task side answers the delegation questions from memory, through its port.
- `TaskMessageScope`, `TaskDelegation` and `DelegatedRunStarter` (extracted from the peer path).
- Each run's own gate orders its transitions.

## Round 2 answers (SR-019)

AR-004 (restart notice), AR-005 (migration: prerequisites, preserved partial states, retry recognition, checklist, fixtures), AR-008 (the stream connect no longer starts the host), AR-011 (`DelegatedRunCommands`: message, interrupt, tool approval and Stop to the child's own root), AR-012 (token totals cover the runs delegated from a run, recursively; results unchanged), AR-013 (each root writes its own log, receiver first, as the peer path), AR-014 (the index maps every agent of every delegating run), AR-015 (requirements corrected), and the residuals are answered in the design spec.

## Points for the reviewer

1. "Ordering Without A Shared Queue": each race that today's per-root queue resolved, with its new owner.
2. "Readers Of Removed Or Renamed Fields": decided by area, verified file by file in implementation.
3. DS-11 and migration step 8 (added by the self-validation): every delegated run gets a history row; the list decides from the Task side where it shows.
4. The size: three root kinds and the whole hosting machinery in one change (the user's decision TC-4, against in-between states). The change sequence lands as separate commits with tests.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Branch: `codex/delegated-copies-outlive-delegator-461` (not pushed)
- Base: `origin/personal` `827f1e68dc`
- Finalization target: `personal` (a release only on the user's word)

## Documents

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/`

- `requirements-doc.md`
- `target-collaboration-contract.md` (revision 5)
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `evidence/data-model-validation/` (read-only scripts and their counts)
- `follow-ups.md` (FU-002 open; FU-003 … FU-005 withdrawn)
- The earlier round's `design-review-report.md` and `architecture-review-revision-record.md`

## Constraints

- `DESIGN.md`, `TESTING.md`, `RELEASE.md`; the Data Migration Guideline; the Collaboration Model, which this change rewrites.
- Never run a migration or startup on the user's data.

## Route

`get_handoff_rules` (2026-11-11): "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
