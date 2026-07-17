# Workspace Layout and Responsive Shell

The standard `/workspace` route is a desktop-capability workspace that adapts to constrained browser, embedded-browser, and narrow-window sizes. It is not the phone/PWA remote-access product surface.

## Route Ownership

- `pages/workspace.vue` mounts `components/layout/WorkspaceAdaptiveLayout.vue` for every standard workspace size.
- The route no longer switches between separate desktop and mobile workspace layout components. Avoid reintroducing route-level desktop/mobile branches for `/workspace`; responsive behavior belongs in the shared shell/layout policy.
- The true phone/PWA route remains `/mobile`, which renders `MobileRemoteAccessShell` through `pages/mobile.vue` with its own phone-first journey and feature gates.

## App Shell Left Navigation

`layouts/default.vue` owns the outer app shell. It provides the shared `useResponsiveWorkspaceShell()` state, which composes viewport capacity, left/right panel preferences, preferred widths, effective presentations, and presentation sources through the single `resolveResponsiveWorkspaceShellState()` policy boundary:

- **Docked**: wide desktop space keeps the full left panel visible and resizable.
- **Strip**: constrained desktop or narrow windows keep the center workspace usable with a visible edge affordance; the strip may consume flow width or become a fixed overlay.
- **Drawer**: left/right drawers are transient interaction surfaces opened from their visible strip or shell navigation; they are not competing responsive policy presentations.

Transient left and right drawers are independent modal side surfaces. Their shared
drawer-layer owner assigns matching backdrop and drawer z-indexes from open order,
so both surfaces can remain open without their visual stacking and keyboard
ownership drifting apart. Only the topmost drawer owns `Escape` and `Tab` handling
and exposes `aria-modal="true"`; closing or unmounting it returns focus to the
remaining drawer or to the strip/navigation trigger that opened it.

The left surface is a full-height flex column in both docked and drawer presentations. Its bounded content wrapper owns the `AppLeftPanel` scroll region, including the vertically scrollable run-history surface; do not replace that owner with a second shell-level history scroller.

Application-immersive routes still bypass the normal left navigation surfaces.

## Workspace Center and Right Tools

`WorkspaceAdaptiveLayout.vue` consumes the shared composed shell state and presents the right tools according to measured space, user visibility preference, and the center-width preservation policy.

- Wide/enough space: right tools remain docked and resizable.
- Constrained desktop/tablet space: right tools collapse to a consuming strip or fixed edge-overlay strip before the center pane falls below its practical minimum.
- Narrow or short-height space: right tools remain discoverable as an edge-overlay strip; clicking it opens the transient right-tool drawer while the center workspace remains mounted.
- While a transient drawer is open, its corresponding strip is conditionally unmounted so the drawer is the sole active surface for that side; dismissal remounts the strip and restores focus through the drawer lifecycle.
- The center pane minimum target is defined by `WORKSPACE_CENTER_MIN_WIDTH_PX` in `utils/layout/responsiveLayoutPolicy.ts`.

The docked right panel uses the measured center-plus-right flow width as its
capacity boundary. `useRightPanel()` keeps the user's preferred width while
clamping the effective width so the center pane and right resize handle retain
their practical minimum; the responsive shell then transitions to strip or
drawer presentation when docked capacity is no longer viable. A user drag
records a `user-sized` resize intent and lowers the protected center minimum
to the approved user-sized threshold rather than silently discarding that
intent. If even that capacity no longer fits, the right surface yields
responsively while the preferred width remains available for a later docked
state. The flow width is observed by `WorkspaceAdaptiveLayout.vue`, including
the logical resize handle geometry, so resize stops remain stable as the left
surface changes.

The responsive contract also covers the post-user-sized fallback: when a
200px-protected user-sized dock no longer fits at a constrained viewport such
as 900x700, the right strip remains visible and opens the transient drawer,
the left strip ownership is retained, and no duplicate top `Tools` trigger is
introduced.

When constrained presentation hides a side surface, the workspace exposes semantic navigation actions rather than a generic top-level surface bar. The navigation trigger is labelled `Agents & teams`, and the structured empty state provides `Choose an agent or team` plus `Open runs/history` actions. These actions open the existing left navigation/history surface and preserve the selected-run state. The visible right strip is always the sole right-tools reopen affordance; clicking it opens the existing transient drawer, and standard `/workspace` must not add a top `Tools` trigger.

Do not reintroduce a positive `Work -> Runs -> Files -> Tools` row. The old generic row is retained only as a negative regression guard in the durable browser probe; Files remains part of the right-tool catalog.

Right-tool order is also centralized there and should remain:

1. Files
2. Team members, when applicable
3. Terminal
4. Activity
5. Token, when applicable
6. Artifacts
7. Browser, when applicable
8. VNC, when applicable

`RightSideTabs` uses the approved single-row native horizontal-scroll
presentation for the right-tool catalog in the docked panel and transient
drawer. The right strip exposes the same catalog as an accessible icon affordance
and opens that drawer. The tab row may overflow horizontally but must not wrap
into a second row. Native mouse, touchpad, touch, and keyboard scrolling remain
the only overflow interaction; active and focused tabs auto-scroll into view,
and the fixed panel toggle stays outside the scrolling region. No edge fades,
directional chevrons, floating scroll buttons, or equivalent custom overflow
indicator chrome is rendered at any scroll position.

Historical delivery note: an earlier delivery iteration described an opt-in
wrapped multi-row `TabList` presentation. That language is superseded by the
approved `right-tool-tabs-ux-spec.md` contract and the current implementation;
do not reintroduce wrapping into this right-tool header.

## Transient Drawer Ownership and Accessibility

`useAccessibleDrawer()` is the shared lifecycle owner for the standard workspace
left-navigation and right-tools drawers. It maintains a small ordered registry of
open drawers rather than coupling the two panel stores. Each drawer owns its
backdrop and side surface, traps `Tab` focus within itself while topmost, closes
on `Escape`, and receives initial focus when opened. A lower drawer remains
available in the registry when an independent drawer opens above it, and regains
keyboard/focus ownership when the topmost drawer closes.

The left drawer is rendered by `layouts/default.vue`; the right-tools drawer is
rendered by `WorkspaceAdaptiveLayout.vue` and `WorkspaceRightToolDrawer.vue`.
Both use dialog semantics only while transient, keep the center workspace mounted,
and must not leave an interactive strip underneath an open drawer. Preserve the
side-specific focus resolver because a strip may be remounted during dismissal.

## `/mobile` Boundary

Do not use `/mobile` or `components/mobile/*` as a fallback implementation for standard `/workspace`. `/mobile` is the paired phone/PWA remote-access shell and intentionally omits desktop-only tool surfaces such as Terminal and VNC in the current mobile contract. Standard `/workspace` must keep those capabilities reachable through the adaptive workspace shell instead.

## Coverage Expectations

Durable unit/component coverage for this policy lives near the relevant sources:

- `utils/layout/__tests__/responsiveLayoutPolicy.spec.ts`
- `utils/layout/__tests__/workspaceSurfaceOrder.spec.ts`
- `components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts`
- `components/layout/__tests__/WorkspacePrimarySurfaceControls.spec.ts`
- `components/layout/__tests__/WorkspaceRightToolDrawer.spec.ts`
- `components/layout/__tests__/RightSideTabs.spec.ts`
- `utils/layout/__tests__/responsiveStripActivation.spec.ts`
- `components/tabs/__tests__/TabList.spec.ts`
- `layouts/__tests__/default-drawer.spec.ts`
- `composables/__tests__/useAccessibleDrawer.spec.ts`
- `tests/e2e/workspace-responsive-probe.mjs`
- `components/layout/LeftSidebarStrip.vue`
- `components/layout/RightSidebarStrip.vue`
- `layouts/__tests__/default.spec.ts`

Browser-level responsive validation is available through:

```bash
pnpm -C autobyteus-web test:e2e:workspace-responsive -- --base-url http://127.0.0.1:3000 --output-dir ../tickets/<ticket-name>/probes/api-e2e
```

The E2E probe expects a running frontend/backend target and a Chrome/Chromium executable. Use `--browser-executable <path>` or `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>` when the default browser discovery is not sufficient.
