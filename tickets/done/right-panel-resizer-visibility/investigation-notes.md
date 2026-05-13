# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The bug is confined to the desktop workspace shell and the shared right-panel resize state. It should require small frontend layout/composable changes plus focused unit/component tests, not backend or data-model changes.
- Investigation Goal: Determine why the right workspace splitter can become hidden when the left shell panel is widened, and identify the smallest robust ownership boundary for constraining the right panel.
- Primary Questions To Resolve:
  - Which component owns the splitter between the center workspace area and the right tabs/tool panel?
  - Which state owner controls right panel width and drag behavior?
  - Are panel widths clamped against the available workspace width when the left sidebar changes size?
  - What validation can prove the right splitter remains visible under edge widths?

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 | Command | `git fetch origin personal --prune` | Required Stage 0 bootstrap freshness | Fetched `origin/personal` successfully before creating ticket worktree. | No |
| 2026-05-13 | Command | `git worktree add -b codex/right-panel-resizer-visibility /Users/normy/autobyteus_org/autobyteus-worktrees/right-panel-resizer-visibility origin/personal` | Required dedicated worktree setup | Worktree and ticket branch created from latest `origin/personal`. | No |
| 2026-05-13 | Command | `rg -n "resiz|splitter|divider|pane|panel|Resize|split" autobyteus-web/...` | Find frontend resizer implementations | Found workspace right panel owner in `components/layout/WorkspaceDesktopLayout.vue` and state owner in `composables/useRightPanel.ts`; other splitters are unrelated inner splitters. | No |
| 2026-05-13 | Code | `autobyteus-web/layouts/default.vue` | Inspect outer left sidebar shell and left drag handle | The left panel width is applied to the `<aside>`, a left drag handle sits after it, and main content is `flex-1 overflow-hidden w-full` without `min-w-0`. | Yes: include outer flex shrink guard in design. |
| 2026-05-13 | Code | `autobyteus-web/composables/useLeftPanel.ts` | Inspect left-panel drag limits | Left sidebar width is clamped from `260px` to `520px`. Widening the left panel reduces the remaining workspace main width. | No |
| 2026-05-13 | Code | `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Identify center/right splitter and panel layout | The center panel is `flex-1 min-w-[200px]`; the right splitter is `.drag-handle`; the right panel receives fixed inline width from `rightPanelWidth`. The root does not explicitly hide overflow and the right panel lacks `flex-none/min-w-0` guards. | Yes: design clamped right-panel display width against root container width. |
| 2026-05-13 | Code | `autobyteus-web/composables/useRightPanel.ts` | Inspect right-panel width owner | `rightPanelWidth` starts at `450`, direct right-panel drag enforces only a `400px` minimum, and no maximum/available-width clamp exists. It also does not observe workspace-container width changes caused by left-panel resize. | Yes: modify this owner rather than adding one-off layout hacks. |
| 2026-05-13 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` and `components/tabs/TabList.vue` | Check whether tab labels require a large minimum width | `TabList` is `overflow-x-auto` and receives `min-w-0`, so the right panel can be made narrower if the outer right-panel flex item also allows shrinking/clipping. | No |
| 2026-05-13 | Code | `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Check downstream dependency on `rightPanelWidth` | Browser host bounds resync watches `rightPanelWidth.value`. If CSS alone clamps the visual width while the composable still reports the requested width, browser bounds can become stale/wrong. | Yes: expose actual clamped width from the composable. |
| 2026-05-13 | Command | `pnpm -C autobyteus-web exec vitest run components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --reporter=dot` | Check local test readiness | Failed before running tests because this fresh worktree has no `node_modules` (`Command "vitest" not found`). | Yes: install or otherwise make dependencies available before Stage 7 validation. |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary UI entrypoints:
  - Left sidebar drag: `autobyteus-web/layouts/default.vue` -> `useLeftPanel().initDragLeftPanel`.
  - Right workspace splitter drag: `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` -> `useRightPanel().initDragRightPanel`.
  - Right-panel render width: `WorkspaceDesktopLayout.vue` reads `rightPanelWidth` and writes an inline `width` style.
- Execution boundaries:
  - Browser/Electron window shell -> default layout flex row -> workspace desktop layout flex row -> right tabs/tool panel.
  - No backend/API boundary is involved.
- Owning subsystems / capability areas:
  - `autobyteus-web/layouts/default.vue`: application shell layout and left sidebar placement.
  - `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue`: desktop workspace center/right split.
  - `autobyteus-web/composables/useRightPanel.ts`: shared right panel visibility and width state.
- Folder / file placement observations:
  - The right-panel width constraint belongs in `useRightPanel.ts` because multiple consumers read the width, especially `BrowserPanel.vue`.
  - The DOM container measurement belongs in `WorkspaceDesktopLayout.vue` because it owns the actual center/right flex container.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useRightPanel.ts` | `rightPanelWidth`, `initDragRightPanel` | Global right panel visibility and drag width state | Enforces only minimum width and allows unbounded growth; has no knowledge of available container width. | Extend this composable to expose actual clamped panel width and container-width registration. |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | `.drag-handle`, right panel inline style | Owns center/right splitter and right panel DOM | Uses fixed `rightPanelWidth` directly and does not report its container width to the state owner. Right panel lacks explicit non-shrinking/clipping flex guards. | Add root ref/ResizeObserver and use clamped width. Add `flex-none`, `min-w-0`, and `overflow-hidden` layout guards. |
| `autobyteus-web/layouts/default.vue` | `mainContentClasses` | Owns app shell main flex item next to the left sidebar | The main flex item lacks `min-w-0`, a common cause of flex children pushing past available width. | Add `min-w-0` so the workspace can shrink when the left panel widens. |
| `autobyteus-web/composables/useLeftPanel.ts` | `leftPanelWidth`, `initDragLeftPanel` | Owns left sidebar width | Correctly clamps left width between `260` and `520`; no direct bug here. | No source change expected. |
| `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | watcher on `rightPanelWidth.value` | Syncs embedded browser host bounds with right panel geometry | Needs actual clamped right-panel width signal, not only requested width. | Keep the public `rightPanelWidth` return as actual display width. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-13 | Static trace from screenshots + code | Compare screenshots with `WorkspaceDesktopLayout.vue` flex order | The disappearing boundary is the `.drag-handle` between center and right panel; the problem occurs as the outer left panel consumes more horizontal space. | The fix must couple right-panel display width to the center/right container width, not just direct right-panel drags. |
| 2026-05-13 | Test setup probe | `pnpm -C autobyteus-web exec vitest ...` | Fresh ticket worktree has no installed dependencies, so focused tests cannot run yet. | Stage 7 must include dependency setup or another valid validation path before claiming executable evidence. |

## Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - For unit/component validation, Nuxt/Vitest with happy-dom is sufficient.
  - Full app reproduction may require backend data to select a workspace run, but the layout bug can be tested at component/composable level.
- Required config, feature flags, or env vars:
  - `NUXT_TEST=true` is used by `pnpm test:nuxt`.
- Required fixtures, seed data, or accounts:
  - None for composable/layout tests.
- Setup commands that materially affected investigation:
  - Worktree bootstrap commands recorded above.
  - A focused Vitest command was attempted and failed due missing `node_modules` in the new worktree.
- Cleanup notes:
  - No temporary source probes were added during investigation.

## Constraints

- The right panel has a preferred usability minimum of `400px`, but this cannot be an absolute hard minimum when the desktop workspace container becomes narrower than `centerMin + handle + 400`; otherwise the splitter/right panel can overflow and be clipped.
- The center area has an existing minimum width of `200px` (`min-w-[200px]`) and should remain usable.
- The Browser tab depends on accurate right-panel width for host-bounds synchronization.
- The right panel should restore its preferred width when space becomes available again, instead of permanently losing user-resized width merely because the left panel temporarily widened.

## Unknowns / Open Questions

- Unknown: Whether a full Electron-window manual repro can be exercised in this environment without backend seed state.
  - Why it matters: Visual/manual confirmation would complement component tests.
  - Planned follow-up: Prefer unit/component coverage first; if dev app can be started cheaply after dependencies are available, use Browser plugin to inspect local layout.

## Implications

### Requirements Implications

- Requirements must distinguish preferred right-panel width from actual displayed width under constrained container space.
- Acceptance criteria should include left-sidebar resize as a trigger, not only direct right-panel drag.
- Acceptance criteria should require restoring preferred width when available space returns.

### Design Implications

- The right-panel composable should own the width clamp because it is the shared state boundary.
- The workspace desktop layout should only provide measured container width and render the actual clamped width.
- CSS flex guards (`min-w-0`, `flex-none`, `overflow-hidden`) should be explicit so browser flexbox min-content behavior cannot hide the splitter.

### Implementation / Placement Implications

- Modify `autobyteus-web/composables/useRightPanel.ts` to maintain preferred width separately from actual clamped display width, expose `rightPanelWidth` as actual display width, and expose a container width registration method.
- Modify `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` to register its container width via `ResizeObserver` and render/test explicit splitter/right-panel data hooks and flex guards.
- Modify `autobyteus-web/layouts/default.vue` to allow the app main flex item to shrink (`min-w-0`) beside the left sidebar.
- Add focused tests for `useRightPanel.ts`, `WorkspaceDesktopLayout.vue`, and the default layout source class if practical.

## Re-Entry Additions

None yet.
