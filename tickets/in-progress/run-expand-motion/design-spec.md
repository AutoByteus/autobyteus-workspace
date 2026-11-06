# Design Spec — Calm expand and collapse in the left panel (autobyteus-390)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`. It replaces SR-001 after code review CRR-001 (CR-001, Design Impact).
- Approved requirements: `requirements-doc.md` SR-002 (REQ-001…REQ-004, AC-001…AC-005), approved by the Solution Designer within the direction; the user is informed.
- Investigation: `investigation-notes.md` (E-01…E-11), with the probes under `evidence/`.
- Authorities: `DESIGN.md` (rules 3, 7, 11); `TESTING.md` (browser probes; a problem a later stage caught); the skill's `ticket-scope.md` and `project-documents.md`.

## SR-002 Revision Summary (CRR-001)

| Finding | Resolution |
| --- | --- |
| CR-001: with SR-001's `v-if`, rows lose their Task answers on collapse. On expand they mount without the Task line, then grow a line when the answers arrive, and the move transition slides the rows below (E-08) | The cause is the move transition itself (E-09), not how the rows are hidden. SR-002 removes the move transition (`.tree-row-move`) and restores the base's `v-show`. `v-show` keeps the rows and their Task answers mounted, so expanding shows them complete. Without the move rule, no row can slide, wherever it came from (E-10). A finished Task's row still fades and closes, because its `max-height` closing moves the rows below by layout, not by the move rule (E-11) |
| The reviewer's options (a), (b) and (c) | Not needed. (a) would move ownership of the Task interest, and (b) would change a shared store's freshness rule. (c) is subsumed: instead of suppressing the move until the answers apply, the move is removed. Ownership and stores are unchanged |
| OBS-2: the Workspaces tree likely shows the same late-Task-line slide | Covered. The move rule is shared by every `tree-row` group (`AgentRunTaskRows`, `WorkspaceTeamExecutionTree`, `AgentOrgRunMemberTree`, `WorkspaceAgentOrgHistoryCollection`), so REQ-004 covers every view |
| A local check for the problem the later stage caught | The browser probe now uses rows with Task lines that arrive late (AC-001, AC-005). It must fail on the base and on SR-001's code (`c5cc87d89d`) |
| Revisit Small/Low | Still `Small` / `Low`: one CSS rule removed, one template line restored, tests. The shared CSS change is visual only (Change Scope) |

## Root Cause (complete)

The left panel's tree rows are rendered in `TransitionGroup`s named `tree-row`, with a 200 ms move transition (`.tree-row-move`, `treeRowLeave.css`). Vue then slides every row whose position changed between a render and its update, from its old position to its new one (E-03, E-09). That produces three slides:
1. **Expanding an Agent run in the Runs view:** the rows were measured while hidden (`v-show`), so their "old" position is the top of the window. This is the user's "drop from the sky" (E-05).
2. **A Task line arriving after the rows are shown:** each row below slides by the growth (E-08). SR-001's `v-if` made this happen on every expand.
3. **A delegated Team row expanding:** the rows below slide by the inserted height.

The rule was meant to help a finished Task's row leave. A leaving row closes by its own `max-height` while staying in place, so it never needed the move rule (E-11).

## Task Size And Architectural Risk

- Task size: `Small`.
- Architectural risk: `Low`. A visual rule and one template line. No data, contract, store or ownership change.
- Escalation trigger: a finished Task's row no longer fades and closes smoothly, or the rows below jump during it.

## Intended Change

1. `autobyteus-web/components/workspace/history/treeRowLeave.css`:
   - remove the `.tree-row-move` rule;
   - remove `.tree-row-move` from the reduced-motion rule;
   - update the file comment: a leaving row fades and closes in 200 ms, the rows below follow it by layout, and rows never slide;
   - remove the comment about a row carrying the move class.
   - Keep the `.tree-row-leave-*` rules unchanged.
2. `autobyteus-web/components/runList/RunListRow.vue`: restore the base's `v-show="state.isRunExpanded(entry.runId)"` on `AgentRunTaskRows`, under `v-if="entry.kind === 'agent'"`. This reverts SR-001's change, so the rows and their Task answers stay mounted while collapsed.
3. `useLeavingTreeRows.ts`: update any comment that mentions the move.

## Change Scope

- In scope:
  - `treeRowLeave.css` and `RunListRow.vue`;
  - the tests that encode the move rule: `useLeavingTreeRows.spec.ts:60-61,71,77` and `task-closure-tree-probe.mjs:337` (`moveClassAtLeaveStart`), updated per DESIGN.md rule 11;
  - SR-001's tests: `RunListRow.agent.spec.ts` changes from "absent from the DOM" to "hidden and kept";
  - the run-expand-motion probe and fixture.
- Left alone:
  - `AgentRunTaskRows.vue` and `useTaskWorkerTasks`;
  - `taskWorkerTaskStore`;
  - the fold state;
  - the leave rules.
- Follow-ups: none. API/E2E's OBS-1 (the fold resets on a view switch) is today's per-session design (runs start expanded), not a defect.

## Spine

`disclosure click → toggleRun → v-show shows the mounted rows, with their Task answers → no move rule, so no translation → rows are at their place in the first frame`. A late Task line or an inserted row changes the layout at once, with no slide.

## Tests (DESIGN.md rule 11, TESTING.md)

**Component tests:**
- `RunListRow.agent.spec.ts`: folded rows stay mounted and hidden (`display: none`), and unfold shows the same rows. A Task answer present before folding is still present after unfolding, with no new Task read. A stopped run's stored rows are unchanged.
- `useLeavingTreeRows.spec.ts`: the CSS has the leave rules and no `.tree-row-move`. Reduced motion still disables the leave transition.

**Browser probe** `test:e2e:run-expand-motion` (fixture), as the local check for CR-001. The rows have Task lines (a non-empty `taskWorkerTasks` answer), and the probe covers:
- (a) collapse, then expand: in every one of the first 4 frames, all rows have `transform: none` and their final `top`;
- (b) Task answers that arrive after the rows are shown (a delayed answer): the rows below shift with no transform in any frame;
- (c) expanding a delegated Team row: the rows below have no transform;
- (d) a DONE row leaves: it fades (`opacity` decreasing), and the next row's `top` decreases over several frames, so it glides and does not jump.

It must fail (a) on the base `4500e7278d` and (a) or (b) on SR-001's `c5cc87d89d`. Record both.

**Existing probes:** `task-closure-tree` updated to the new rule. Every other existing suite and probe the change touches must pass.

## Risks

- **The shared rule changes all trees.** Rows that used to slide when pushed now move at once. That is the user's stated preference ("better to be normal"), and the user is informed.
- **Reorders now snap.** No designed reorder motion exists.
