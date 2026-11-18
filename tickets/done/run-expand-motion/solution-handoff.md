# Solution Handoff — `run-expand-motion`

- Result: **Architecture Design Complete** (SR-002, after CRR-001), `task_size=Small`, `architectural_risk=Low`.
- Origin: Project Task `autobyteus-390` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-06.

## Request Summary

Expanding a run in the left panel's Runs view (the Project Task Manager, with many delegated runs) makes the rows "drop from the sky". Find the cause, explain it, and make expand and collapse calm. Keep content and behavior; no stored data. Tests; finalized on the base branch. Release only on the user's word.

## Cause (proven)

- `RunListRow.vue` hides the delegated rows with `v-show`.
- Their `TransitionGroup` re-renders while hidden, measures every row at the top of the window, and on expand slides each row down to its place over 200 ms.
- The proof is a reproduction and a control (`evidence/`).
- No motion was designed.

## Fix

Mount the delegated rows on expand (`v-if`) instead, as every other tree in the panel does. See `design-spec.md`.

## Approval

The Solution Designer approved within the direction (no open product decision); the user is informed.

## Classification Evidence

Small / Low:
- one template condition in one component, plus tests;
- no data, contract or store change.

## Artifacts (absolute paths)

All in `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/`:
- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `evidence/`: `page.html`, `page-vif.html`, `probe.mjs`, `repro-v-show.json`, `control-v-if.json`. Copy `vue.global.js` 3.5.44 beside the pages to rerun.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion`, branch `codex/run-expand-motion`.
- Base and target: `origin/personal`, base at `4500e7278d`.
- Dependencies are installed. The ticket docs are uncommitted.

## Open Risks

R-01: a stopped run's stored delegated view after fold and unfold is covered by a component test. Losing it is the escalation trigger.

## SR-002 Revision (after CRR-001, 2026-11-06)

- **CR-001:** the late Task lines after SR-001's `v-if` expand slide the rows below (E-08). The root of every slide is the shared move transition `.tree-row-move` (E-09).
- **SR-002:**
  - Remove that rule and restore `v-show`, so the rows keep their Task answers.
  - Without the rule nothing slides (E-10), and a finished Task's row still fades and closes, with the rows below gliding by layout (E-11).
  - This also covers OBS-2 (the Workspaces tree) and the delegated-Team expand. The user said "it's better to be normal" (REQ-004).
- **Tests:**
  - a browser probe with late Task lines as the local check: it must fail on the base and on `c5cc87d89d`;
  - the tests that encode the move rule are updated.
- **The branch:** `codex/run-expand-motion` at `8f0e26e568`, with SR-001's code `c5cc87d89d` / `7cc31409af` and its tests, to be revised.

## SR-002 Narrowed (2026-11-06)

After the reviewer's correction (`47ddf05fb5`, OBS-2 withdrawn, and the user reports that Workspaces and Projects are fine), the move is turned off only in the Runs view. That is one scoped rule on the run list's scroll container in `RunListPanel.vue`. The shared `treeRowLeave.css`, its tests and the other views are unchanged (AC-006). `v-show` is restored, as before.

## Decision On The User's "Small Moving" Feedback (2026-11-06)

The narrowed SR-002 stands: the move is off in the Runs view only, and `v-show` is restored. The Workspaces and Projects views keep their small moves. In the Runs view, a move rule would let late Task lines cascade (about 230 px for the last of 13 rows), and the drop can only be ruled out for certain without it. The implementation (`b7fc37aa75`, the full removal) must be narrowed: restore the shared `treeRowLeave.css`, its spec and the `task-closure-tree` probe to the base, and add the scoped override.

## Next Expected Action

Implementation with self-checks and executable validation, then delivery.

## Route Applied

`get_handoff_rules` (2026-11-06): Small or Medium with Low risk → `/software_engineering_team/implementation_engineer`.
