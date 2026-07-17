# Desktop Shell and Standard Workspace Responsive UI/UX Specification

## Status and approval

- Status: **Refined — architecture re-review required before implementation resumes**.
- Approval applicability: **Required**. This document defines intended user-visible behavior.
- Scope: the global desktop shell used by non-immersive routes with `layouts/default.vue`, including `/workspace`, `/agents`, `/agent-teams`, `/applications`, `/media`, `/memory`, `/nodes`, `/skills`, `/tools`, and supported default-layout pages in desktop browser, embedded-browser, and resizable desktop-window contexts.
- Non-scope: the dedicated `/mobile` route and its Android/iOS wrapper experience, `layout:false` routes, and explicitly immersive application presentations.

This specification is the scenario-level authority for the global desktop shell and standard workspace surfaces. It complements `right-tool-tabs-ux-spec.md`; it does not replace the requirements doc, investigation notes, or design spec.

### Global left-shell decision

`layouts/default.vue` owns the left navigation panel for the default-layout
routes. The same owner renders the personal-branch left strip whenever the
panel is non-docked and its drawer is closed, and renders the left navigation
drawer as the sole left surface while open. This applies to `/workspace` and
non-workspace default-layout routes alike. The route page supplies content and
active-route meaning; it does not create a second narrow navigation model.

The black responsive header, hamburger, and breadcrumb navigation trigger are
removed from this desktop shell. A wide fitting user-origin strip re-docks the
panel; a constrained/narrow/responsive strip opens the transient drawer. The
drawer may navigate to the selected destination, and dismissal restores the
strip without mutating panel preference. `/mobile` and immersive application
presentations remain explicit shell boundaries.

### Right-tools simplification decision

The earlier drawer-only/top-`Tools` fallback is superseded. Standard
`/workspace`, while the transient right drawer is closed, retains a visible
right-edge tools strip whenever the right tabs are not docked. The strip may
consume `50px` in the normal flow or become a fixed edge overlay when that
width cannot fit. A responsive strip opens the existing right-tools drawer;
when opened, that drawer is the sole visible right surface and the strip is
hidden until dismissal. A wide user-origin strip re-docks the panel when it
fits. The drawer is a transient interaction surface, not a responsive
presentation that requires a separate top button. `/mobile` is unchanged.

### Symmetric side-surface decision

Standard `/workspace` uses the same ownership model on both sides:

```text
left panel -> left strip -> left drawer
right panel -> right strip -> right drawer
```

The left strip is the sole compact navigation affordance for Agents, Agent
Teams, workspaces, and run history. The right strip is the sole compact tools
affordance for Files and the right-tool catalog. A docked panel replaces its
strip. A wide strip created by an explicit user collapse re-docks its panel
when the current measured capacity permits; a constrained, narrow, or
responsive-yield strip opens that side's transient drawer and leaves the
preference unchanged. Strips consume flow width when possible and use an
edge overlay when necessary. This activation rule is symmetric on both
sides.

The standard workspace does not render a hamburger, breadcrumb navigation
trigger, top `Agents & teams` button, top `Tools` button, or generic
`Work / Runs / Files / Tools` row. This desktop-capability shell is separate
from `/mobile` and `components/mobile/*`, which remain unchanged.

### Personal-branch strip visual continuity

The strip is the compact form of the original personal-branch panel; it is
not a new navigation surface. In every standard `/workspace` strip state
(wide manual collapse, consuming strip, overlay strip, constrained, and
narrow), preserve the personal-branch control inventory, order, iconography,
spacing, and visual weight on both sides. Responsive policy may change only
the action produced by activating that existing control:

| Side | Personal-branch strip content | Fitting wide user-origin state | Constrained/narrow or responsive state |
| --- | --- | --- | --- |
| Left | Existing navigation/workspace/history icons and settings affordance | `redock-panel` | `open-drawer` |
| Right | Existing tool icons and the existing side-panel affordance | `redock-panel` | `open-drawer` |

The renderer must not prepend a new left hamburger/menu button or breadcrumb
control when it is absent from the personal branch. It must not add a visible
`Agents & teams` or `Tools` drawer title, a separate close `X`, or a duplicate
panel-toggle control. The opened drawer starts with the existing navigation or
right-tab content. While the drawer is closed, the existing strip/edge control
is the sole compact affordance: it re-docks in the fitting wide user-origin
case or opens the temporary drawer in constrained/responsive cases. When the
drawer opens, that side's strip is hidden for the duration of the overlay, so
the drawer is the sole visible surface for that side. Backdrop, Escape, focus
restoration, and an accessible non-visual dialog label remain required;
closing restores the same strip without mutating panel preference.

This closes a design-package gap: the earlier package defined the hybrid
activation result but did not explicitly freeze the personal-branch strip
visual/control inventory or forbid generic drawer chrome. Current source
evidence shows the implementation added `workspace-left-strip-open` and
visible drawer headers/close buttons that are absent from `origin/personal`.
Those additions are outside this approved visual contract and must be removed
or made non-visual during implementation rework. `/mobile` and
`components/mobile/*` are excluded.

### Global default-layout route boundary

All non-immersive routes using `layouts/default.vue` consume the shared left
panel/strip/transient-drawer state. `default.vue` does not emit or consume a
`showHeader` compatibility signal and does not render the old responsive
header. `/workspace` additionally consumes the right-tools panel/strip/drawer
state; other pages keep their route content without inheriting a right-tools
surface. `layout:false` routes such as `/mobile` and immersive application
presentations do not pass through this shell boundary.

## Product mental model

The standard workspace has three stable responsibilities:

1. **Left navigation and history**: choose an agent or agent team, start a run, select an existing run, and manage workspaces.
2. **Center work surface**: show the selected agent/team conversation or the run configuration/empty state.
3. **Right tools**: show Files and contextual tools such as Team, Terminal, Activity, Token, Artifacts, Browser, and VNC Viewer.

The center is the Work surface. It is not a peer navigation destination that needs a permanent `Work` button. Files and tools are owned by the right tool surface. A responsive presentation must not create a second, parallel navigation model (`Work / Runs / Files / Tools`) while the original left and right surfaces are still present.

## Governing UX invariants

### UXI-001 — Preserve the wide workspace identity

At a wide desktop size, the default presentation remains the familiar left panel + center work surface + right tool panel. No generic top-level surface bar is shown.

### UXI-002 — Collapse is explicit at wide sizes

The left panel is docked by default when the window is wide enough. It changes to the existing strip only after the user uses the collapse affordance. A full-screen or wide window must not look as if the left panel was automatically collapsed merely because a responsive policy was introduced.

If the user has collapsed the panel, the strip is a compact continuation of the same navigation, not a trigger for a new top navigation bar. The center and right panel keep their original positions and visual hierarchy.

The default responsive policy must also be conservative about automatic collapse. A small reduction from a wide window is not, by itself, evidence that the left selection surface should disappear. The left panel remains docked while it and a practical center can fit; the right tool panel yields first when the full three-pane arrangement no longer fits.

### UXI-003 — Responsive adaptation protects the center without duplicating navigation

At constrained sizes, a side surface may become a consuming or edge-overlay
strip to protect the center. Adaptation is prioritized: preserve the left
navigation/selection panel while the left panel plus a practical center can
fit, and move the right tool panel to a consuming or overlay strip first. The
adaptation must not introduce a permanent `Work / Runs / Files / Tools` bar,
hamburger, breadcrumb trigger, or top button as a replacement for the side
surfaces. A user-origin strip that still fits is a re-dock affordance;
responsive or otherwise constrained strips are temporary-drawer affordances.

### UXI-004 — Selection and run creation are always discoverable

When no run is selected, the center must not present only a vague sentence. It must provide a clear action to open the agent/team selection surface and a clear action to open run history or create/select a run. The user must not need to infer that an unlabeled `Runs` tab opens the left drawer.

### UXI-005 — Right tools remain one owned surface

Files and tools use the existing right tabs in docked mode and the same tab
catalog in the transient drawer opened by a responsive strip. A second top
`Files` or `Tools` navigation is never rendered. In particular, while the
transient drawer is closed, the visible right strip is the sole compact
affordance for non-docked right tools: a wide user-origin strip re-docks when
it fits, while a constrained/responsive strip opens the temporary drawer. Once
opened, the drawer is the sole visible right surface until backdrop/Escape
dismissal restores the strip. It must never be paired with a top `Tools`
button. There is no standard `/workspace` drawer-only policy presentation;
the open drawer is local interaction state.

### UXI-006 — Responsive mode changes do not erase user intent

Automatic strip/overlay presentation is an effective layout state, not a destructive mutation of the user's wide-layout preference. Returning to a wide window restores the user's chosen docked/collapsed state. The policy may adapt only when necessary to protect the center or fit the viewport.

### UXI-007 — `/mobile` remains a separate product surface

The standard workspace may use drawers at narrow browser widths, but it must not reuse the dedicated `/mobile` wrapper or the retired legacy `WorkspaceMobileLayout`. `/mobile` remains the Android/iOS/PWA remote-access owner.

## Layout state contract

The exact pixel thresholds remain owned by the responsive policy. The following states describe observable behavior, not a second breakpoint implementation.

| State | Entry condition | Left surface | Center | Right surface | Top controls | Required user affordances |
|---|---|---|---|---|---|---|
| Wide default workspace | Enough width and height for the canonical split | AppLeftPanel docked | Full work surface | RightSideTabs docked | No black responsive header, generic surface bar, hamburger, or Agents/Tools buttons | Left panel navigation; right panel tabs and fixed toggle |
| Wide default non-workspace route | Default-layout route with sufficient width | AppLeftPanel docked | Route-owned page content | Route-owned content; no workspace right-tools surface | No black responsive header, hamburger, or breadcrumb trigger | Left panel navigation and route content controls |
| Wide with user collapse | User clicked the left-panel collapse affordance | LeftSidebarStrip is the unchanged personal-branch strip; activation restores the full panel while it fits | Same center position and content | RightSideTabs remains docked when it fits | No generic surface bar or header navigation | Left strip has the original navigation controls; right tabs remain directly usable |
| Large-but-constrained desktop workspace | Full three-pane split no longer fits, but left panel + practical center still fit | AppLeftPanel remains docked | Center remains usable | Right tools yield first to a consuming right strip when left + center + strip fit; otherwise the strip becomes an edge overlay | No `Work / Runs / Files` bar, black header, hamburger, breadcrumb, or top `Tools` button | Existing left selection/workspace journey remains directly visible |
| Constrained desktop workspace | Left panel plus practical center no longer fit, or a short/narrow state requires overlay | With the drawer closed, the unchanged personal-branch left strip (consuming or overlay) is visible; activation opens the transient left navigation drawer, which hides the strip until dismissal | Center is prioritized and remains usable | With the drawer closed, the unchanged personal-branch right strip uses a consuming strip where possible and an overlay strip otherwise; activation opens the transient drawer, which hides the strip until dismissal | No `Work / Runs / Files` bar, black header, hamburger, breadcrumb, top `Agents & teams`, or top `Tools` button | Existing strip controls are the only visible compact affordances while drawers are closed; empty state includes selection/run actions |
| Narrow standard workspace | Desktop browser window is below the shell docking threshold | With the drawer closed, the unchanged personal-branch left strip remains visible as an edge overlay; activating it opens AppLeftPanel as the sole left drawer surface until dismissal | Center work surface remains mounted and reachable | With the drawer closed, the unchanged personal-branch right-tools strip remains visible as an edge overlay; activating it opens the full right tab drawer as the sole right surface until dismissal | No generic four-item surface bar or header navigation controls | No added drawer title/close chrome; existing strips have accessible names when closed; empty state includes selection/run actions |
| Narrow default non-workspace route | Default-layout route below the shell docking threshold | With the drawer closed, the unchanged personal-branch left strip remains visible as an edge overlay; activating it opens AppLeftPanel as the sole left drawer surface until dismissal | Route-owned page content remains mounted and scrollable | Route-owned content; no workspace right-tools surface | No black header, hamburger, or breadcrumb trigger | Strip navigation retains active route state and drawer destinations remain usable |
| Short-height window | Height is too small for stable stacked/docked panels | Left strip while its drawer is closed, or left drawer alone while open | Center remains the priority surface | Right strip while its drawer is closed, or right drawer alone while open | No controls that consume a disproportionate vertical band | Both hidden surfaces have a visible recovery path; no clipped-only state |
| `/mobile` route | Phone/PWA route | MobileRemoteAccessShell | Mobile route content | Mobile route content | Owned by mobile product design | No dependency on standard workspace policy |

### Strip activation matrix

The side presentation and the side activation are separate outputs. The same
matrix applies to the left navigation strip and the right tools strip:

| `presentationSource` | Current capacity | `stripActivation` | User-visible result | Preference mutation |
| --- | --- | --- | --- | --- |
| `user` | Fitting docked candidate | `redock-panel` | Strip item re-docks the full side panel | Restore the corresponding visible preference and close that side's temporary drawer |
| `user` | Docked candidate does not fit | `open-drawer` | Strip item opens the temporary side drawer; the strip is hidden until dismissal, then returns | Preserve `hidden-by-user` intent |
| `responsive` | Consuming or overlay strip | `open-drawer` | Strip item opens the temporary side drawer; the strip is hidden until dismissal, then returns | Preserve the existing preference |
| Any | Narrow precedence | `open-drawer` | Edge-overlay strip opens the temporary side drawer as the sole surface for that side until dismissal | Do not auto-dock or rewrite preference |

The renderer must consume `stripActivation`; it must not infer drawer behavior
from `presentation === 'strip'` or from a viewport breakpoint. This is the
explicit wide/manual-collapse versus constrained/narrow decision and is
required for both sides.

### Explicitly forbidden layout

The following is not a valid responsive state at any viewport, including full-screen desktop:

```text
left panel collapsed/hidden + generic Work/Runs/Files/Tools row + unchanged right-side tabs
```

It creates two competing navigation systems, makes `Work` look selectable while it can be empty, and hides the actual agent/team selection path behind an ambiguous `Runs` action.

## User journeys

### UJ-001 — Open the workspace and start an agent/team

1. User opens `/workspace` in a wide window.
2. AppLeftPanel is visible in its familiar docked position with Agents, Agent Teams, and workspace/run history.
3. User selects an agent or team from the existing navigation/selection path.
4. The center changes from the empty state to the selected agent/team workspace or run configuration.
5. Right tools remain available in their existing right-side tab row.

**Failure to prevent:** a top `Work` tab is visible while the left selection surface is missing or hidden.

### UJ-002 — Use the manual collapse affordance on a wide window

1. User clicks the existing left-panel collapse button.
2. The left panel becomes the familiar narrow icon strip.
3. The center work surface and right-side tabs do not move into a new top navigation structure.
4. Clicking a strip item re-docks the full navigation panel while the current wide capacity fits it; the strip remains the compact affordance if the capacity is constrained.
5. In the constrained case, activating the strip opens the temporary navigation drawer and does not rewrite the hidden-by-user preference.
6. Returning to the expanded state restores the docked panel without changing the selected run.

**Failure to prevent:** the collapse action causes `Work / Runs / Files / Tools` to appear above the center on a full-screen window.

### UJ-003 — Resize from wide to constrained desktop

1. User narrows the window until the original three-pane split would make the center unusable.
2. The policy first moves the right tool panel to a consuming or overlay strip if that is sufficient to preserve the left panel and a practical center.
3. Only when the left panel plus center can no longer fit does the policy move the left panel to a consuming or overlay strip; the responsive strip opens the transient navigation drawer.
4. The center remains the primary work surface.
5. While drawers are closed, the user opens navigation from the visible left strip and opens Tools from the visible right strip; activating either strip hides it and opens that side's temporary drawer without changing panel preferences. Dismissing the drawer restores the strip.
6. The app does not introduce a second generic surface bar and does not reset the user's preference permanently.

### UJ-009 — Small resize while the window is still desktop-usable

1. User narrows a large window by a modest amount.
2. The left panel remains docked because it and the center still fit; the user can continue selecting agents, teams, and workspaces without opening a drawer.
3. If the right tools no longer fit beside the center, only the right tool presentation changes first.
4. The user does not see an unexplained vertical icon strip, a header navigation control, or a new generic top surface bar; any visible strip is tied to the side surface it opens.

### UJ-010 — Resize the docked right tool panel

1. User drags the right panel's existing divider toward the center to make the tool panel wider.
2. Because this is an explicit user resize, the divider stops at the measured maximum that preserves the left effective surface, divider width, and the personal-branch compact center floor (`200px`). The automatic responsive target remains `480px`; the explicit user action is allowed to opt into the smaller center geometry.
3. The right tool panel remains docked and visible; the center does not disappear or collapse below `200px`.
4. No top `Tools` trigger or right strip appears merely because the drag reached its bound. The user can explicitly collapse the panel with its existing toggle if a strip/drawer is desired.
5. A genuine viewport/container resize remains distinct: automatic policy uses the `480px` practical center target and may move right tools to a consuming or overlay strip when that target cannot fit, while preserving the user's explicit sizing mode and visibility preference.

### UJ-011 — Right tools yield to the desktop strip

1. User narrows a non-narrow desktop window until the docked right tool panel no longer fits beside the left panel and practical center.
2. If the left panel, `480px` center target, and `50px` right strip fit, the docked right panel is replaced by the vertical right strip while the left panel remains docked.
3. While the drawer is closed, the strip remains at the right edge and exposes the canonical tool icons. A user-origin strip re-docks the right panel when it fits; a responsive strip opens the temporary right-tool drawer and hides the strip until dismissal.
4. No top `Tools` button is added while the strip is visible.
5. If the strip cannot fit in the horizontal flow, it switches to a fixed edge overlay rather than disappearing or introducing a top `Tools` button. While closed, the responsive strip opens the transient drawer as the sole right surface until dismissal.

### UJ-004 — Open a narrow workspace with no selection

1. User opens or resizes standard `/workspace` below the shell docking threshold.
2. While the left drawer is closed, the left edge-overlay strip is visible and its accessible name describes the navigation drawer it opens; no header hamburger or breadcrumb trigger is rendered. Once opened, the drawer is the sole left surface until backdrop/Escape dismissal.
3. The center shows a structured empty state with a primary `Choose an agent or team` action and a secondary run/history action.
4. Choosing the primary action opens the left navigation drawer from the left strip or routes to the existing agent/team selection surface.
5. The user can return to the center without losing the drawer context.

### UJ-005 — Use files and tools in a narrow workspace

1. While the drawer is closed, the user sees the right strip as the visible `Tools`/`Open tools` affordance; it is flow-consuming when possible and an edge overlay when necessary, with no top `Tools` button.
2. Activating the strip opens the existing right tool drawer and hides the strip until dismissal.
3. The drawer uses the same canonical tab catalog and single-row scrolling contract as docked mode.
4. Files, Team, Terminal, Activity, Token, Artifacts, Browser, and VNC remain reachable when available.
5. Closing the drawer returns the user to the same center work state without changing the right preference unexpectedly.

### UJ-006 — Select an existing run from history

1. User opens the left navigation/history surface from the wide panel or left strip. A wide user-origin strip re-docks the panel when it fits; a constrained/responsive strip opens the transient narrow drawer when needed.
2. The workspace/run tree exposes existing workspaces and run history using the existing selection behavior.
3. Selecting a run returns to `/workspace` and renders the selected agent/team surface.
4. The left surface closes only when the presentation requires it; selection is not lost.

### UJ-007 — Resize across responsive states

1. User resizes repeatedly across wide, constrained, narrow, and short-height states.
2. The center never becomes blank because two independent breakpoint systems disagree.
3. The visible presentation changes only as required by the policy; it does not flash between duplicate layouts.
4. When the window is wide again, the user's prior left/right preference is respected.

### UJ-008 — Use the dedicated phone wrapper

1. User opens `/mobile` from an Android/iOS wrapper or PWA context.
2. The existing `MobileRemoteAccessShell` remains the owner of that experience.
3. Changes to standard `/workspace` do not import or visually replace the mobile wrapper.

## State and content requirements

### Empty state

The empty center state must contain:

- a concise explanation that no agent/team run is selected;
- a primary action labelled in user language, such as `Choose an agent or team`;
- a secondary action for `Open runs/history` or equivalent existing run-selection path;
- an optional `Create workspace` action only when the existing workspace workflow supports it.

The empty state must not rely on `Work` being selected, and it must not imply that Files or Tools are unavailable.

## Responsive policy ownership

The executable capacity and priority contract is defined in the design spec's `resolveResponsiveWorkspaceShellState` section. In summary:

1. Narrow width uses left and right edge-overlay strips while their drawers are closed; each responsive strip opens its corresponding temporary drawer, which becomes the sole visible surface for that side until dismissal. No header navigation control is required or rendered.
2. A user-hidden left panel remains a user-controlled strip on desktop; it is not mislabeled as an automatic collapse.
3. At desktop widths, try the full left-docked/right-docked split.
4. If it does not fit, yield the right tools to a consuming/overlay strip while preserving the left panel whenever left navigation plus the center still fit.
5. Only after those options fail may the left panel become an automatic consuming or overlay strip; its strip opens the transient navigation drawer. A user-origin strip follows the same capacity-aware rule as the right side: re-dock when it fits, otherwise open the temporary drawer.
6. Short height yields right tools first and keeps the left panel docked whenever horizontal fit permits.

The state must expose both panel preferences (`visible` or `hidden-by-user`) and
the effective side presentations (`docked` or `strip`) with their source
(`user` or `responsive`), strip behavior (`consuming` or `overlay`), and strip
activation (`redock-panel` or `open-drawer`). The left and right drawers are
transient overlays opened only by an `open-drawer` strip action, not effective
policy presentations. No component may implement a separate `<1280px`
left-collapse rule.

For all standard `/workspace` states, the right presentation priority is
`docked -> consuming strip -> overlay strip`, subject to the composed capacity
formula. The strip is the guaranteed compact right-tools affordance. A wide
user-origin strip re-docks when the docked panel fits; a constrained or
responsive strip opens the transient drawer and is not a competing responsive
presentation.

### Docked right-panel resize contract

The right-panel divider is a bounded resize interaction, not an implicit collapse command. While the right presentation is docked, its maximum width is derived from the current available horizontal capacity after the effective left surface and resize handles. Automatic layout protects the practical `480px` center target. An explicit right-divider drag sets a user-sized override and may reduce the center to the personal-branch `200px` floor, restoring the original manual-resize capability. Dragging farther must stop at that user-sized bound; it must not remove the right panel or introduce a top `Tools` trigger. A genuine viewport/container resize may still reapply the automatic `480px` center target and move right tools to a consuming or overlay strip when necessary, without erasing the user-sized preference.

The effective state must make this distinction observable: retained `rightPanel.resizeIntent = automatic | user-sized` plus effective `rightPanel.centerProtectionMode = automatic | user-override | responsive-yield`, with the effective center floor and right width derived from both. A viewport shrink must retain `user-sized` intent while reporting `responsive-yield`; recovery may return to `user-override` if the compact dock fits. The user-sized override is an intentional compact desktop geometry, not a new phone layout and not a second responsive policy.

### Canonical output and rendering authority

The nested `rightPanel` object is the only output authority for this
lifecycle. The composed state must not also expose top-level
`centerMinWidth` or `rightPanelResizeIntent` aliases. The canonical fields
are:

- `rightPanel.resizeIntent`: retained user intent across transitions;
- `rightPanel.centerProtectionMode`: the current effective policy mode; and
- `rightPanel.effectiveCenterMinWidth`: the current center floor used by the
  renderer (`480px` for automatic/responsive-yield, `200px` for
  user-override).

`WorkspaceAdaptiveLayout` maps its center pane `min-width`, docked-right
feasibility, and any dependent width calculations to
`rightPanel.effectiveCenterMinWidth`. It must not read a top-level alias,
infer the floor from the viewport/presentation, or apply its own 480/200
fallback. The output shape and rendered center style are tested for the
automatic, user-override, and responsive-yield states so the personal-branch
compact drag behavior cannot be lost at the state-to-renderer boundary.

### Selected agent/team state

- The selected agent/team identity and status remain in the center workspace header.
- Existing typography and action priority are preserved unless a component-specific responsive rule is necessary.
- Right-side tool access remains stable and does not migrate into a generic top-level bar.

### Left navigation drawer state

- The drawer contains the existing `AppLeftPanel` content and navigation rather than a second reduced list.
- The drawer has no added visible `Agents & teams` title, separate close `X`, or simultaneously visible strip. Backdrop and Escape close it and restore the same strip; the dialog/drawer label is semantic and non-visual.
- Opening it must not clear the active run or replace the center with an empty `Runs` surface.

### Right tools drawer state

- The drawer starts directly with the existing right-tool tab content; it has no added visible `Tools` title, separate close `X`, or simultaneously visible right strip.
- The tab row remains one horizontal scrolling row and retains its active underline and fixed toggle only where the toggle is meaningful.
- Backdrop and Escape close the transient drawer and return to the previous center state, restoring the same right strip without a second visible panel-toggle control.
- A responsive right strip is the sole reopen trigger for the temporary
  drawer; a wide user-origin strip is the re-dock trigger when the panel fits.
  No standard `/workspace` state renders a separate top `Tools` trigger or a
  drawer-only replacement.

## Accessibility and interaction

- Use landmarks for the left navigation, center work surface, and right tools.
- Give every collapsed/strip/drawer trigger an accessible name describing the
  surface it re-docks or opens.
- Preserve keyboard access to selection, run history, tool tabs, drawer close, and empty-state actions.
- Do not use hover-only labels as the sole way to discover a strip action.
- Keep focus within an opened drawer until the user closes it or activates a destination; return focus to the opening trigger.
- Drawer semantics and focus management must remain available without adding a visible title, close button, or simultaneously visible strip.
- Responsive changes must not reorder controls in a way that changes keyboard meaning without a corresponding visual and accessible label.

## Visual contract

- Wide layout spacing, typography, and panel positions should match the personal branch unless a documented center-protection rule applies.
- The generic top surface bar is not part of the wide layout.
- The left collapse affordance remains in the left panel and is not replaced by an automatic mid-page collapse.
- Right tool tabs retain the separate `right-tool-tabs-ux-spec.md` contract: one row, original typography/spacing, native horizontal scrolling, active-tab auto-scroll, no added edge fade or directional chevron, and stable panel toggle.
- Drawer/strip controls must be visually lightweight and semantically explicit; they must not look like a second application navigation hierarchy.
- Left and right strips must remain visually/control-compatible with `origin/personal`; no leading menu button, breadcrumb, visible drawer title, separate close `X`, duplicate panel toggle, or strip-plus-drawer pair may appear in standard `/workspace`.

## Validation requirements

The implementation and browser validation must cover at least:

- wide default with left docked and right docked;
- wide with manual left collapse;
- full-screen/wide after a manual left collapse (no top surface bar);
- constrained desktop with left consuming/overlay strip and right consuming/overlay strip, each opening its corresponding drawer;
- narrow standard workspace with no selection and with a selected run;
- empty-state selection and run-history actions;
- right tools drawer access and tab reachability;
- right-strip state with no top `Tools` trigger in both consuming and overlay variants;
- standard `/workspace` with no hamburger, breadcrumb navigation trigger, top `Agents & teams` button, or generic surface row;
- right-tools fallback order (`docked -> consuming strip -> overlay strip`) at capacity boundaries;
- bounded right-panel drag at the maximum center-preserving width;
- explicit user-sized right-panel drag that permits the personal-branch `200px` center floor;
- short-height recovery;
- repeated resize across all states;
- modest resize from large desktop where the left panel remains docked and right tools yield first;
- `/mobile` isolation.
- global default-layout shell assertions: `/workspace`, `/agents`, `/agent-teams`,
  and `/tools` use the shared left panel/strip/transient-drawer shell and have
  no black responsive header, hamburger, or breadcrumb trigger; `/workspace`
  additionally owns the right panel/strip/transient-drawer tools surface;
  `/mobile` remains isolated and immersive application presentations bypass
  the default layout.
- personal-branch strip continuity: both strip renderers retain the original
  control inventory in wide, consuming, overlay, constrained, and narrow
  states; source/component/browser assertions reject the added
  `workspace-left-strip-open` control, visible `Agents & teams`/`Tools`
  drawer headers, separate drawer close buttons, and simultaneous strip-plus-
  drawer rendering.

The correctness boundary is not “all controls fit in the first row.” It is “the user can understand and reach the primary work, selection/run, and tools surfaces without duplicate or misleading navigation.”

## Implementation implications

These are design consequences for the reviewed package, not permission to patch before architecture review:

1. Remove the condition that shows generic primary surface controls merely because the left panel is not docked.
2. Remove `WorkspacePrimarySurfaceControls` from standard `/workspace`; the left and right strips are the only compact side triggers, and empty-state actions cover direct selection/history paths.
3. Keep the left panel docked by default through large-but-constrained states where left navigation plus a practical center still fit; let right tools yield first. Only the user collapse action changes it in wide/manual-collapse states, and automatic left strip behavior is limited to genuine center-protection states.
4. Make the left strip the explicit navigation/selection path when the left panel is not docked; do not rely on a hamburger, breadcrumb, top `Agents & teams`, or ambiguous `Runs` label.
5. Provide exactly one explicit right-tools compact affordance: the visible right strip has no top `Tools` companion. In a wide user-collapsed state it re-docks the fitting panel; in consuming/overlay responsive states it opens the transient drawer. Never allow the right affordance to disappear at a narrow width.
6. Bound right-panel drag against measured available capacity and the practical center minimum; do not let a drag itself trigger a docked-to-drawer/strip transition.
7. Distinguish automatic `480px` center protection from the explicit user-sized `200px` divider override in the composed state and resize owner.
8. Order right-tool presentations as docked, then consuming strip, then overlay strip; do not render a top Tools trigger in standard `/workspace`.
9. Make the default layout the sole owner of the shared left shell: remove the
   black responsive header, hamburger, breadcrumb, and ordinary `showHeader`
   compatibility path for every non-immersive route using `layouts/default.vue`.
   Keep `/workspace` right-tool rendering inside the workspace layout; keep
   `/mobile` outside the default layout and preserve the explicit immersive
   application shell boundary.
10. Replace the empty center sentence with a structured empty state and actions.
11. Preserve the existing right-tab work from `right-tool-tabs-ux-spec.md` and restore personal-branch typography/spacing before visual sign-off.
12. Reuse the personal-branch left/right strip markup and control inventory;
    make only the activation result responsive. Keep drawer titles and close
    labels semantic for accessibility, but do not render duplicate visible
    menu, breadcrumb, title, close, or panel-toggle controls.
