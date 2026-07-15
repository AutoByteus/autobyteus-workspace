# Design Rework Note

## Date
2026-07-04

## Reason
After the initial architecture review handoff, the user clarified and approved the stronger UX target: preserve one terminal session per canonical workspace path / terminal target key, not only preserve the currently mounted Terminal tab instance.

## Superseded Design
The previous design/review round focused on a single cached `Terminal.vue` instance in `RightSideTabs.vue` using the Files-tab lazy mount + `v-show` pattern. That design remains correct for same-tab switching but is no longer sufficient for workspace/root path A -> B -> A restoration.

The existing `tickets/done/persist-terminal-session-tabs/design-review-report.md` is therefore stale for the current refined requirements and should not be treated as approving the new design.

## New Direction
Introduce a terminal host/cache owner, e.g. `TerminalPanel.vue`, between `RightSideTabs.vue` and individual `Terminal.vue` instances:

`RightSideTabs.vue -> TerminalPanel.vue -> Terminal.vue per canonical target key`

The canonical key includes backend/node scope and either normalized root path or server-home mode.

## Implementation State Caution
The task worktree currently contains uncommitted source edits that appear aligned with the earlier single-Terminal-cache design:

- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`
- `autobyteus-web/components/workspace/tools/Terminal.vue`

Those edits should be treated as partial/stale relative to the refined design. The implementation stage should either adapt them into the new `TerminalPanel.vue` design or replace them, rather than finishing the older one-terminal-only approach.

## Round 3 Design Impact Update

Architecture review round 2 produced blocking finding `AR-D2-001`: node/backend rebinding behavior was left as an implementation choice. The design is now updated with a single scoped policy:

- `TerminalPanel.vue` clears all cached terminal entries when `windowNodeContextStore.bindingRevision` or the normalized terminal endpoint scope changes.
- Clearing the cache unmounts all child `Terminal.vue` instances, closes their WebSockets, and lets old backend PTYs clean up through existing backend close semantics.
- Old-node terminal preservation is explicitly out of scope for this change because current `useTerminalSession.ts` resolves the active global node endpoint at connect time and does not pin endpoint identity per child.
- The canonical key still includes node/backend scope for collision prevention and test clarity, but the cache reset policy prevents hidden old-node sessions from surviving a rebind.
