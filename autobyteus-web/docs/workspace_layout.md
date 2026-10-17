# Workspace Layout and Responsive Shell

The non-immersive default-layout routes share one desktop-capability shell that adapts to constrained browser, embedded-browser, and narrow-window sizes. `/workspace` adds the right-tools surface; it is not the phone/PWA remote-access product surface.

## Route Ownership

- `pages/workspace.vue` mounts `components/layout/WorkspaceAdaptiveLayout.vue` for every standard workspace size. `pages/chat.vue` mounts the same layout for `/chat?id=<runId>`, the standalone agent run view (see `chat.md`).
- The route no longer switches between separate desktop and mobile workspace layout components. Avoid reintroducing route-level desktop/mobile branches for `/workspace`; responsive behavior belongs in the shared shell/layout policy.
- `layouts/default.vue` renders the shared left panel/strip/transient-drawer shell for every non-immersive default-layout route, including `/agents`, `/agent-teams`, and `/tools`. Its strip keeps route-aware active state and existing navigation meaning; only `/workspace` and a `/chat?id=<runId>` run view render the right panel/strip/transient-drawer tools surface. Both mount `WorkspaceAdaptiveLayout` and its `components/layout/WorkspaceToolShell.vue`. `useRightPanel()` keeps one shared visibility preference (open by default) and width.
- The default layout has no black responsive header, hamburger, breadcrumb trigger, or ordinary `showHeader` compatibility path. Route-owned page headers remain page concerns, not shell navigation fallbacks.
- The true phone/PWA route remains `/mobile`, which renders `MobileRemoteAccessShell` through `pages/mobile.vue` with its own phone-first journey and feature gates.

## App Shell Left Navigation

The first left-panel item is **Chat** (`/chat`), with a pencil action that starts a New chat. `/` redirects to `/chat`. Kept New chats with typed text are listed as Draft rows directly under the Chat row; while a Draft row is selected the Chat row is not active (see [Chat — Draft rows](./chat.md#draft-rows)).

### Collapsed strip: pages and Workspaces

The collapsed left strip (`LeftSidebarStrip.vue`) shows the page icons (Chat … Nodes), then a light divider and a **Workspaces** icon (`ph:tree-view`, `data-nav-key="workspaces"`), with Settings pinned at the bottom. On windows up to 540 px tall the divider is hidden and the icons sit 4 px apart so Settings still fits.

- A page icon docks the panel (or opens the drawer when there is no room) and goes to its page.
- **Workspaces** only shows the panel, docked or as the drawer. It never changes the route, the selected run, the center, an open draft or the right panel. After docking, focus moves to the panel's Workspaces section and then onto the open run's row; closing the drawer returns focus to Workspaces.
- The docked panel's collapse button collapses it and moves focus to the strip's Workspaces icon.

**The lit icon is where you are.** `useShellPrimaryNavigation` owns every strip and panel highlight:

- Chat (strip icon and docked Chat row) is lit only on New chat: `/chat` with no run id.
- Workspaces (`isWorkspacesActive`, `aria-current="location"`) is lit while the center shows a run: a registered Agent run on `/chat?id=…`, an Org run on `/workspace` (`isAgentOrgRunRoute`), or a selected Team run on `/workspace`. It is not lit on New chat, the Org launch page, an empty `/workspace`, or while a run is still opening.
- Other pages light their own icon.

The route predicates (`chatRouteRunId`, `isAgentOrgRunRoute`, `isAgentOrgLaunchRoute`) live in `services/workspace/workspaceNavigationService.ts`, so the center and the highlight read the same route meaning.

**Revealing the open run when the panel appears.** Each time the tree panel mounts (docked expand, drawer open, app start), `useWorkspaceHistoryTreeState` expands the selected run's ancestry, including a Team's focused member inside delegated task-Team rows. The Team reveal stays pending until that member's row exists. `components/workspace/history/useRevealSelectedTreeRow.ts` then watches the tree for up to 3 s: once the selected row (the last `[aria-current="true"], [aria-selected="true"]`) renders, it is centred if it is not fully visible; a visible row does not move. The first wheel, press or key in the tree ends the window. It acts only while a run is shown: `AppLeftPanel` passes `isWorkspacesActive` to the tree as `runShown`, so on New chat or another page a row still marked by an earlier selection is neither scrolled to nor focused, and focus stays on the Workspaces section. The reveal only scrolls and focuses; it never selects or expands anything. Opening a run while the panel is already docked does not scroll the tree.

`layouts/default.vue` owns the outer app shell. It provides the shared `useResponsiveWorkspaceShell()` state, which composes viewport capacity, left/right panel preferences, preferred widths, effective presentations, and presentation sources through the single `resolveResponsiveWorkspaceShellState()` policy boundary:

- **Docked**: wide desktop space keeps the full left panel visible and resizable.
- **Strip**: constrained desktop or narrow windows keep the center workspace usable with a visible 50px edge affordance that remains a normal `flex-none` flow item.
- **Drawer**: left/right drawers are transient interaction surfaces opened from their visible strip or shell navigation; they are not competing responsive policy presentations.

Transient left and right drawers are independent modal side surfaces. Both use a
consistent lighter approximately 30% black scrim so the underlying workspace
remains recognizable while the drawer stays dominant. Their shared
drawer-layer owner assigns matching backdrop and drawer z-indexes from open order,
so both surfaces can remain open without their visual stacking and keyboard
ownership drifting apart. Only the topmost drawer owns `Escape` and `Tab` handling
and exposes `aria-modal="true"`; closing or unmounting it returns focus to the
remaining drawer or to the strip/navigation trigger that opened it.

The left surface is a full-height flex column in both docked and drawer presentations. Its bounded content wrapper owns the `AppLeftPanel` scroll region, including the vertically scrollable run-history surface; do not replace that owner with a second shell-level history scroller.

Application-immersive routes still bypass the normal left navigation surfaces through `appLayoutStore.hostShellPresentation`; `layout:false` routes such as `/mobile` bypass the default layout entirely.

## Workspace Center and Right Tools

`WorkspaceAdaptiveLayout.vue` consumes the shared composed shell state and presents the right tools according to measured space, user visibility preference, and the center-width preservation policy.

- Wide/enough space: right tools remain docked and resizable.
- Constrained desktop/tablet space: right tools collapse to a consuming 50px strip before the center pane falls below its practical minimum; left navigation yields to a second consuming strip only when that candidate is required.
- Narrow or short-height space: right tools remain discoverable as a consuming flow strip; clicking it opens the transient right-tool drawer while the center workspace remains mounted. Only the drawer may overlay content, and below 300px the dual-strip terminal state may use a zero center floor without removing either 50px strip reservation.
- While a transient drawer is open, its corresponding strip is conditionally unmounted so the drawer is the sole active surface for that side; dismissal remounts the strip and restores focus through the drawer lifecycle.
- The center pane minimum target is defined by `WORKSPACE_CENTER_MIN_WIDTH_PX` in `utils/layout/responsiveLayoutPolicy.ts`.

`useRightPanel()` retains the raw `preferredRightPanelWidth` and resize intent.
`useResponsiveWorkspaceShell()` passes that raw preference, not the previous
DOM-measured/clamped width, to `resolveResponsiveWorkspaceShellState()`. The
policy is the capacity and rendered-width authority: it allocates an effective
right width for each prospective left/right candidate, using the same
calculation for candidate fit, strip redock eligibility and resolved output.
For a right dock, that width is bounded by the raw preference and the space
remaining after the candidate's left surface, logical resize handles and center
minimum, with a 400px right minimum. Insufficient capacity rejects the dock
rather than shrinking tools below that minimum. The resolved
`rightPanel.preferredWidth` field is the effective rendered width, not the raw
retained preference.

Opening **Workspaces** therefore reclaims width from the right dock when both
docks can fit, instead of treating the previous divider position as immutable
and opening a modal drawer. Docked navigation pushes the center/tools and has
no scrim or modal ownership. Temporary allocation does not overwrite the raw
preference or intent; collapsing navigation or restoring space recovers the
preferred width up to the new capacity.

A divider drag records `user-sized` intent and protects the existing 200px
center minimum; automatic allocation protects 480px. With default 320px
navigation, both docks need at least **930px after a drag**
(`320 + 6 + 400 + 4 + 200`) or **1210px automatically**
(`320 + 6 + 400 + 4 + 480`). These are capacity bounds, not new universal
breakpoints: a 520px navigation preference moves them to 1130px and 1410px.
Existing narrow-window (<768px), short-height (<=480px), visibility preferences
and fallback priorities still apply.

`WorkspaceAdaptiveLayout.vue` still observes the center-plus-right flow width.
The measured `useRightPanel().rightPanelWidth` remains available for drag start
and clamping and BrowserPanel resize consumers; it does not feed back into
prospective shell fit. Preserve logical handle accounting and the existing
measurement/drag path when changing layout policy.

When actual capacity requires the right strip, it remains the sole right-tools
reopen affordance and opens the transient drawer; no duplicate top `Tools`
trigger is introduced. A manually collapsed left side retains its strip and
may keep right tools docked even when both full docks cannot coexist.

When constrained presentation hides a side surface, the workspace exposes actions through the existing side-surface owners rather than a generic top-level surface bar. The structured empty state provides `Choose an agent or team` plus `Open runs/history` actions. These actions open or route through the existing left navigation/history surface and preserve selected-run state. The visible right strip is always the sole right-tools reopen affordance; clicking it opens the existing transient drawer, and standard `/workspace` must not add a top `Tools` trigger.

Do not reintroduce a positive `Work -> Runs -> Files -> Tools` row. The old generic row is retained only as a negative regression guard in the durable browser probe; Files remains part of the right-tool catalog.

Right-tool order is also centralized there and should remain:

1. Projects, on desktop (not in the mobile runtime)
2. Files
3. Team members, when applicable
4. Terminal
5. Activity
6. Token, when applicable
7. Artifacts
8. Browser, when applicable
9. VNC, when applicable

Projects is never a contextual default (Team members / Activity stay the
defaults), and a scope change keeps it selected: opening a worker from the
Projects tab changes the conversation in the center while the tab stays. See
[Projects › Projects tab in the right panel](projects.md#projects-tab-in-the-right-panel).

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
- `composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts`
- `layouts/__tests__/default-docking.spec.ts`
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
- `tests/e2e/workspaces-sidebar-dock-probe.mjs`
- `components/layout/LeftSidebarStrip.vue`
- `components/layout/RightSidebarStrip.vue`
- `layouts/__tests__/default.spec.ts`

Browser-level responsive validation is available through:

```bash
pnpm -C autobyteus-web test:e2e:workspace-responsive -- --base-url http://127.0.0.1:3000 --output-dir ../tickets/<ticket-name>/probes/api-e2e
```

The E2E probe expects a running frontend/backend target and a Chrome/Chromium executable. Use `--browser-executable <path>` or `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>` when the default browser discovery is not sufficient.

The self-owned docking regression probe starts its own fixture-backed Nuxt
server and browser, exercises real pointer drags, capacity neighbors,
repeated redocking, focus/modality and wide recovery, and cleans up its stack:

```bash
pnpm -C autobyteus-web test:e2e:workspaces-sidebar-dock --output-dir <fresh-evidence-directory>
```

Its prerequisites and non-root browser option are in the probe header. Fixture
I/O proves shared-renderer behavior, not backend persistence or native desktop
delivery; real-product selection/data/worker journeys require a current
isolated desktop instance under [TESTING.md](../../TESTING.md).
