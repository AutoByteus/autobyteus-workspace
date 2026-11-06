# Solution Handoff — `run-expand-motion`

- Result: **Architecture Design Complete** (SR-001), `task_size=Small`, `architectural_risk=Low`.
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

## Next Expected Action

Implementation with self-checks and executable validation, then delivery.

## Route Applied

`get_handoff_rules` (2026-11-06): Small or Medium with Low risk → `/software_engineering_team/implementation_engineer`.
