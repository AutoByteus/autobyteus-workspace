# Investigation Notes

## Investigation Meta

- Package identifier: `run-expand-motion` (Project Task `autobyteus-390`).
- Request: expanding a run in the left panel's Runs view, for example the Project Task Manager with many delegated runs, makes its delegated rows "drop from the sky". Make expand and collapse calm.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion`. Branch `codex/run-expand-motion`.
- Resolved base: `origin/personal` @ `4500e7278d` (fetched 2026-11-06; v1.5.12-beta.2). Finalization target: `origin/personal`.
- Bootstrap: worktree created; `pnpm install --frozen-lockfile` done. Project documents `DESIGN.md`, `TESTING.md` and `RELEASE.md` are present.
- Current solution revision ID: `SR-001`.
- Authorities read: the skill's `ticket-scope.md` and `project-documents.md` (updated 2026-11-06); `TESTING.md` (setup, browser probes).
- Investigation status: complete. The cause is proven by a reproduction and a control.

## Initial Request

The user (2026-11-06, condensed by the PM): "After I click collapse and then click expand from the Project Task Manager, it gives me a feeling that the internal things drop from the sky … It makes people's eyes feel a little bit uncomfortable … It feels like some kind of animation effect." The screenshot shows the Runs view with the Project Task Manager expanded and about 13 delegated rows under it.

## Source Log

| Type | Source | Finding | ID |
| --- | --- | --- | --- |
| Code | `autobyteus-web/components/runList/RunListRow.vue:98-107` | The Agent run's delegated rows (`AgentRunTaskRows`) are always mounted and hidden with `v-show="state.isRunExpanded(entry.runId)"` when the run is folded. It is the only `v-show` in the run list and the history trees. Every other tree (Team, Org, the Workspaces tree's `RunDefinitionGroups.vue:139`) mounts with `v-if`. It was added in autobyteus-385 (`0d3c31c4ae`), ported from 378, with no recorded reason | E-01 |
| Code | `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue:3-15`; `treeRowLeave.css:1-6` | The rows are a `<TransitionGroup name="tree-row">`, and `.tree-row-move` animates `transform` over 200 ms. That motion is meant for rows moving when a DONE Task's rows leave. The CSS says "New rows appear at once" | E-02 |
| Code | Vue 3.5.44 `runtime-dom.esm-bundler.js` `TransitionGroupImpl` (render: `positionMap.set(child, getPosition(child.el))`; `onUpdated`: `recordPosition`, then `applyTranslation`) | On each update, a TransitionGroup records every row's position at render time and again after the update. It slides any row whose position changed from the old position to the new one. Vue skips rows that are themselves `v-show`-hidden, but not rows inside a hidden container: these measure as `top: 0` | E-03 |
| Code | Vue `shouldUpdateComponent`: a component vnode with directives is always updated | The `v-show` directive on `AgentRunTaskRows` forces it, and its TransitionGroup, to re-render whenever `RunListRow` re-renders, including on the expand click | E-04 |
| Probe | `evidence/page.html` + `evidence/probe.mjs` (copy `vue.global.js` 3.5.44 from `node_modules/.pnpm/vue@3.5.44*/node_modules/vue/dist/` beside the page), output `evidence/repro-v-show.json` | Same structure as the product: a run header, then 12 rows in a `tree-row` TransitionGroup under `v-show`, with the product's move CSS. Collapse, then expand. In the first frame the last row sits at `top: 0`, the top of the window, with `translate(0, -792px)`. It slides down over the next frames (107, 207, 300 … px) to its place at 792 px. **This is the "dropping out".** Every row does it at once, each from the top of the window | E-05 |
| Probe | `evidence/page-vif.html`, output `evidence/control-v-if.json` | The control: the same page with the rows mounted by `v-if` instead of `v-show`. In every frame each row is at its final place (`top: 792`) with no transform | E-06 |
| Docs | Product spec for the Runs list (design repo `9db2c8ec`, `tickets/done/left-panel-super-agents/ui-ux-spec.md`, UXJ-004 step 3; the chevron rotates −90° when folded); `workspace-tree-vs-chooser` spec (`7712ec14`), "Motion: the chooser's X fades in over 150ms; no other new motion" | No expand or collapse motion was designed. The effect is an accident, not a design | E-07 |

## The Cause, In Plain Words

The delegated rows under a run are kept on the page while the run is collapsed, only hidden. A hidden row has no place on the screen, so it measures as being at the very top of the window. When you expand, the list's built-in "slide rows to their new place" animation compares that false starting point with each row's real place. It then slides every row down from the top of the window to where it belongs, in 0.2 seconds. That animation exists only to close the gap smoothly when a finished Task's rows leave the list. The Workspaces and Projects trees build the rows fresh on expand, so they don't show it.

## Scope Facts

- Only the Agent run's delegated rows in the Runs view are affected. The Team and Org trees in the Runs view, and every row in the Workspaces and Projects views, mount on expand (E-01).
- Expanding a delegated Team row inside the list adds its member rows at once. The rows below it in the same list slide down by the inserted height (200 ms). That is the designed move for rows changing place, and the distance is short, not from the top of the window. It is left as is and named to the user.
- No stored data is involved.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| R-01 | Risk | Mounting on expand: `AgentRunTaskRows` loads a stopped run's stored delegated view in `onMounted` (`:61-66`), and the disclosure appears only when rows exist (`RunListRow.vue:186`, which reads the store) | Runs start expanded each session (`useRunListDisclosure.ts:49`), so the view is loaded at first mount and stays in `agentRunCollaborationStore` after unmount. Nothing in `AgentRunTaskRows` clears it. The tests confirm that the disclosure and the rows survive fold and unfold |
