# Design Spec — Calm expand and collapse in the Runs view (autobyteus-390)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`.
- Approved requirements: `requirements-doc.md` (REQ-001…REQ-003, AC-001…AC-004), approved by the Solution Designer within the direction.
- Investigation: `investigation-notes.md` (E-01…E-07, with the reproduction and the control under `evidence/`).
- Authorities: `DESIGN.md` (rules 3, 7, 11); `TESTING.md` (browser probes); the skill's `ticket-scope.md`.

## Root Cause

`RunListRow` hides an Agent run's delegated rows with `v-show` (E-01). The rows sit in a `TransitionGroup` with a 200 ms move transition (E-02). The `v-show` directive forces that group to re-render on the expand click (E-04), while its container is still hidden. So every row's "old" position measures as the top of the window. Right after the container is shown, the group slides each row from there to its real place (E-03, E-05). With `v-if` the effect is gone (E-06).

Classification: a design problem the 385 change introduced, in the functionality this ticket changes (`ticket-scope.md`: this ticket).

## Task Size And Architectural Risk

- Task size: `Small`. One template line plus tests.
- Architectural risk: `Low`. No data, contract, store or shared-component change.
- Escalation trigger: the stored delegated view of a stopped run no longer shows after fold and unfold (R-01). That would need its load moved out of the component, which is a design change.

## Intended Change

In `autobyteus-web/components/runList/RunListRow.vue` (lines 98–107), mount `AgentRunTaskRows` only while the run is expanded:

```vue
<AgentRunTaskRows
  v-if="entry.kind === 'agent' && state.isRunExpanded(entry.runId)"
  ...
/>
```

Then drop the `v-show`. The Team branch (`v-else-if="entry.kind === 'team' && expanded"`) and the Org branch keep their conditions; the `v-else-if` chain stays correct, because a folded Agent row no longer falls through to them. Check this in a test.

This is the same pattern every other tree in the panel uses (E-01). A freshly mounted TransitionGroup has nothing to move from, and it has no `appear`, so rows show at once. Collapse unmounts the group, so the rows disappear at once.

## Change Scope

- In scope: `RunListRow.vue`; its tests; one browser regression probe.
- Left alone:
  - `AgentRunTaskRows.vue` and `treeRowLeave.css` (the DONE-row leave and move motion is designed);
  - `useRunListDisclosure` (the fold state);
  - the Workspaces and Projects trees;
  - the delegated Team rows' own expand inside the group.
- Follow-ups: none.

## Spine

`disclosure click → useRunListDisclosure.toggleRun(runId) → foldedRuns → RunListRow re-renders → AgentRunTaskRows mounted (expand) or unmounted (collapse) → rows at their place at once`.

## Ownership And Dependencies

Unchanged. `RunListRow` owns whether the delegated work is shown. `agentRunCollaborationStore` keeps the delegated view across mount and unmount (R-01). `AgentRunTaskRows` keeps loading a stopped run's stored view on mount (`:61-66`). That is a no-op when the context is already in the store.

## Removal

The `v-show` on `AgentRunTaskRows`. No dead code is left: the TransitionGroup is still used for DONE-row leaves.

## Tests (DESIGN.md rule 11, TESTING.md)

**Component test** (`components/runList/__tests__/`, a new `RunListRow.agent.spec.ts` beside `RunListRow.org.spec.ts`), for an Agent run with delegated rows in the store:
- expanded, `workspace-agent-run-task-tree` is rendered;
- after `toggleRun`, it is absent from the DOM, not just hidden;
- after another `toggleRun`, it is rendered again with the same rows;
- the disclosure stays and shows the right `aria-expanded`;
- a stopped run's stored rows (`hasCollaboration`) are still shown after fold and unfold, without a second `inspect` when the context is in the store;
- a folded Agent row renders no Team or Org tree.

**Browser regression** (`TESTING.md`, browser probes): a fixture probe `autobyteus-web/tests/e2e/run-expand-motion-probe.mjs` with `fixtures/run-expand-motion.page.vue`.
- It renders a `RunListRow` for an Agent run with about 12 delegated rows (fake store data, as the other fixture probes do), with run rows above it, so the list is not at the top of the page.
- Collapse, then expand. For the first 4 animation frames, assert that every delegated row has `transform: none` and the same `getBoundingClientRect().top` as after settling.
- The probe must be shown to fail on today's code: run it against the base and record the failing frame values (as in E-05).
- Add the package script `test:e2e:run-expand-motion`.

**Suites:** the web unit suite and the guards, per `TESTING.md`.

## Risks

- R-01: covered by the component test above and the escalation trigger.
- Unmounting on collapse drops a DONE row's leave motion while collapsed. That is invisible anyway, because the rows were hidden.
