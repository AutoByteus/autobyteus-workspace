# Design Spec — Calm expand and collapse in the left panel (autobyteus-390)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`, narrowed to the Runs view after the reviewer's correction `47ddf05fb5`. OBS-2 was withdrawn, and the user reports that the Workspaces and Projects views are fine. It replaces SR-001 after code review CRR-001 (CR-001, Design Impact).
- Approved requirements: `requirements-doc.md` SR-002 (REQ-001…REQ-004, AC-001…AC-005), approved by the Solution Designer within the direction; the user is informed.
- Investigation: `investigation-notes.md` (E-01…E-11), with the probes under `evidence/`.
- Authorities: `DESIGN.md` (rules 3, 7, 11); `TESTING.md` (browser probes; a problem a later stage caught); the skill's `ticket-scope.md` and `project-documents.md`.

## SR-002 Revision Summary (CRR-001)

| Finding | Resolution |
| --- | --- |
| CR-001: with SR-001's `v-if`, rows lose their Task answers on collapse. On expand they mount without the Task line, then grow a line when the answers arrive, and the move transition slides the rows below (E-08) | The cause is the move transition itself (E-09), not how the rows are hidden. SR-002 turns the move transition off **inside the Runs view** and restores the base's `v-show`. `v-show` keeps the rows and their Task answers mounted, so expanding shows them complete. Without the move rule, no row can slide, wherever it came from (E-10). A finished Task's row still fades and closes, because its `max-height` closing moves the rows below by layout, not by the move rule (E-11) |
| The reviewer's options (a), (b) and (c) | Not needed. (a) would move ownership of the Task interest, and (b) would change a shared store's freshness rule. (c) is subsumed: instead of suppressing the move until the answers apply, the move is removed. Ownership and stores are unchanged |
| OBS-2: the Workspaces tree likely shows the same late-Task-line slide | Withdrawn by API/E2E (`98dc9d47a4`): it was not run, and the user reports that the Workspaces and Projects views are fine. Those views stay unchanged: the shared `treeRowLeave.css` is not touched. The Runs view overrides it |
| A local check for the problem the later stage caught | The browser probe now uses rows with Task lines that arrive late (AC-001, AC-005). It must fail on the base and on SR-001's code (`c5cc87d89d`) |
| Revisit Small/Low | Still `Small` / `Low`: one scoped CSS rule in the Runs view, one template line restored, tests |

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

1. `autobyteus-web/components/runList/RunListPanel.vue`: one scoped rule on the run list's scroll container, `data-test="run-list-scroll"`, for example `:deep(.tree-row-move) { transition: none; }` under the container's class. Its comment says: the Runs view's trees never slide rows (autobyteus-390), and a finished Task's row still fades and closes by its own leave rules.
   - Vue decides whether a group moves by cloning a row into the group with the move class and checking for a transform transition (`hasCSSTransform`). The clone sits inside this container, so the override turns the move off for every tree in the Runs view (Agent task rows, Team and Org members).
   - `treeRowLeave.css` and its users in the Workspaces and Projects views are unchanged.
2. `autobyteus-web/components/runList/RunListRow.vue`: restore the base's `v-show="state.isRunExpanded(entry.runId)"` on `AgentRunTaskRows`, under `v-if="entry.kind === 'agent'"`. This reverts SR-001's change, so the rows and their Task answers stay mounted while collapsed.
3. No change to `treeRowLeave.css`, `useLeavingTreeRows.ts` or their tests.

## Change Scope

- In scope:
  - `RunListPanel.vue` (the scoped override) and `RunListRow.vue` (`v-show` restored);
  - SR-001's tests: `RunListRow.agent.spec.ts` changes from "absent from the DOM" to "hidden and kept";
  - the run-expand-motion probe and fixture.
- Left alone:
  - `AgentRunTaskRows.vue` and `useTaskWorkerTasks`;
  - `taskWorkerTaskStore`;
  - the fold state;
  - the leave rules;
  - `treeRowLeave.css`, and the Workspaces and Projects views with their tests and probes (AC-006).
- Follow-ups: none. API/E2E's OBS-1 (the fold resets on a view switch) is today's per-session design (runs start expanded), not a defect.

## Spine

`disclosure click → toggleRun → v-show shows the mounted rows, with their Task answers → no move rule, so no translation → rows are at their place in the first frame`. A late Task line or an inserted row changes the layout at once, with no slide.

## Tests (DESIGN.md rule 11, TESTING.md)

**Component tests:**
- `RunListRow.agent.spec.ts`: folded rows stay mounted and hidden (`display: none`), and unfold shows the same rows. A Task answer present before folding is still present after unfolding, with no new Task read. A stopped run's stored rows are unchanged.
- `RunListPanel`: the scroll container carries the override. A text check of the component's style is enough here; the browser probe proves the effect.

**Browser probe** `test:e2e:run-expand-motion` (fixture), as the local check for CR-001. The rows have Task lines (a non-empty `taskWorkerTasks` answer), and the probe covers:
- (a) collapse, then expand: in every one of the first 4 frames, all rows have `transform: none` and their final `top`;
- (b) Task answers that arrive after the rows are shown (a delayed answer): the rows below shift with no transform in any frame;
- (c) expanding a delegated Team row: the rows below have no transform;
- (d) a DONE row leaves: it fades (`opacity` decreasing), and the next row's `top` decreases over several frames, so it glides and does not jump.

It must fail (a) on the base `4500e7278d` and (a) or (b) on SR-001's `c5cc87d89d`. Record both.

**Existing probes:** `task-closure-tree` and the Workspaces and Projects probes run unchanged and pass (AC-006).

## Risks

- **The Runs view and the other views now differ.** Rows pushed by other rows snap in the Runs view and slide in the trees. The user finds both fine (REQ-004, AC-006).
- **The override depends on Vue's `hasCSSTransform` check**, which looks for a transform transition on the move class. The browser probe guards it.
