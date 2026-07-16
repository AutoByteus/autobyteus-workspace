# Standard Workspace Responsive UI/UX Specification

## Status and approval

- Status: **Refined — architecture re-review required before implementation resumes**.
- Approval applicability: **Required**. This document defines intended user-visible behavior.
- Scope: the standard `/workspace` route in desktop browser, embedded-browser, and resizable desktop-window contexts.
- Non-scope: the dedicated `/mobile` route and its Android/iOS wrapper experience.

This specification is the scenario-level authority for the workspace shell. It complements `right-tool-tabs-ux-spec.md`; it does not replace the requirements doc, investigation notes, or design spec.

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

At constrained sizes, a side surface may become a strip or drawer to protect the center. Adaptation is prioritized: preserve the left navigation/selection panel while the left panel plus a practical center can fit, and move the right tool panel to a strip/drawer first. The adaptation must not introduce a permanent `Work / Runs / Files / Tools` bar as a replacement for the side surfaces. A drawer or strip must have a clear semantic affordance, such as `Agents & teams`, `Runs & workspaces`, or `Tools`.

### UXI-004 — Selection and run creation are always discoverable

When no run is selected, the center must not present only a vague sentence. It must provide a clear action to open the agent/team selection surface and a clear action to open run history or create/select a run. The user must not need to infer that an unlabeled `Runs` tab opens the left drawer.

### UXI-005 — Right tools remain one owned surface

Files and tools use the existing right tabs in docked mode and the same tab catalog in strip/drawer mode. A second top `Files` or `Tools` navigation is not rendered when the right surface already has a visible tab/header affordance. In particular, a visible right strip is the reopen affordance for the right tools; it must not be paired with a second top `Tools` button. A top semantic `Tools` trigger is reserved for a drawer-only state in which no right strip is visible.

### UXI-006 — Responsive mode changes do not erase user intent

Automatic strip/drawer presentation is an effective layout state, not a destructive mutation of the user's wide-layout preference. Returning to a wide window restores the user's chosen docked/collapsed state. The policy may adapt only when necessary to protect the center or fit the viewport.

### UXI-007 — `/mobile` remains a separate product surface

The standard workspace may use drawers at narrow browser widths, but it must not reuse the dedicated `/mobile` wrapper or the retired legacy `WorkspaceMobileLayout`. `/mobile` remains the Android/iOS/PWA remote-access owner.

## Layout state contract

The exact pixel thresholds remain owned by the responsive policy. The following states describe observable behavior, not a second breakpoint implementation.

| State | Entry condition | Left surface | Center | Right surface | Top controls | Required user affordances |
|---|---|---|---|---|---|---|
| Wide default | Enough width and height for the canonical split | AppLeftPanel docked | Full work surface | RightSideTabs docked | No generic surface bar; normal application header remains hidden as in the personal branch | Left panel navigation; right panel tabs and fixed toggle |
| Wide with user collapse | User clicked the left-panel collapse affordance | LeftSidebarStrip | Same center position and content | RightSideTabs remains docked when it fits | No generic surface bar | Strip has a clear navigation/expand affordance; right tabs remain directly usable |
| Large-but-constrained desktop | Full three-pane split no longer fits, but left panel + practical center still fit | AppLeftPanel remains docked | Center remains usable | Right tools yield first to strip/drawer; strip is the sole reopen affordance when used | No `Work / Runs / Files / Tools` bar and no duplicate top `Tools` button beside a strip | Existing left selection/workspace journey remains directly visible |
| Constrained desktop | Left panel plus practical center no longer fit, or a short/narrow state requires overlay | Left strip or explicit left navigation drawer, depending on available shell space | Center is prioritized and remains usable | Right tabs docked only if they fit; otherwise right strip/drawer | No `Work / Runs / Files / Tools` bar | Clear `Agents & teams`/navigation affordance; right strip itself is the Tools affordance, while drawer-only state gets one semantic `Tools` trigger |
| Narrow standard workspace | Desktop browser window is below the shell docking threshold | Header hamburger opens AppLeftPanel as a drawer | Center work surface remains mounted | Tools drawer opened by one visible, labeled workspace action; drawer contains the full right tab catalog | No generic four-item surface bar | Hamburger has an accessible navigation name; empty state includes selection/run actions; exactly one Tools trigger is visible |
| Short-height window | Height is too small for stable stacked/docked panels | Strip/drawer as needed | Center remains the priority surface | Strip/drawer as needed | No controls that consume a disproportionate vertical band | All hidden surfaces have a visible recovery path; no clipped-only state |
| `/mobile` route | Phone/PWA route | MobileRemoteAccessShell | Mobile route content | Mobile route content | Owned by mobile product design | No dependency on standard workspace policy |

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
4. The strip provides a clear way to reopen/expand navigation and retains access to Agents, Agent Teams, and other shell destinations.
5. Returning to the expand state restores the docked panel without changing the selected run.

**Failure to prevent:** the collapse action causes `Work / Runs / Files / Tools` to appear above the center on a full-screen window.

### UJ-003 — Resize from wide to constrained desktop

1. User narrows the window until the original three-pane split would make the center unusable.
2. The policy first moves the right tool panel to a strip/drawer if that is sufficient to preserve the left panel and a practical center.
3. Only when the left panel plus center can no longer fit does the policy move the left panel to a strip/drawer.
4. The center remains the primary work surface.
5. The user can open `Agents & teams`/navigation and `Tools` through explicit affordances.
6. The app does not introduce a second generic surface bar and does not reset the user's preference permanently.

### UJ-009 — Small resize while the window is still desktop-usable

1. User narrows a large window by a modest amount.
2. The left panel remains docked because it and the center still fit; the user can continue selecting agents, teams, and workspaces without opening a drawer.
3. If the right tools no longer fit beside the center, only the right tool presentation changes first.
4. The user does not see an unexplained vertical icon strip or a new generic top surface bar.

### UJ-010 — Resize the docked right tool panel

1. User drags the right panel's existing divider toward the center to make the tool panel wider.
2. The divider stops at the measured maximum that preserves the left effective surface, divider width, and the practical center minimum.
3. The right tool panel remains docked and visible; the center does not disappear or collapse into an unusable remainder.
4. No top `Tools` trigger or right strip appears merely because the drag reached its bound. The user can explicitly collapse the panel with its existing toggle if a strip/drawer is desired.
5. A genuine viewport/container resize remains distinct: the composed policy may move right tools to strip/drawer when the available capacity changes, without mutating the user's width/visibility preference.

### UJ-004 — Open a narrow workspace with no selection

1. User opens or resizes standard `/workspace` below the shell docking threshold.
2. The header hamburger is visible and its accessible name describes navigation, not merely an unlabeled menu.
3. The center shows a structured empty state with a primary `Choose an agent or team` action and a secondary run/history action.
4. Choosing the primary action opens the left navigation drawer or routes to the existing agent/team selection surface.
5. The user can return to the center without losing the drawer context.

### UJ-005 — Use files and tools in a narrow workspace

1. In a drawer-only state, the user sees one visible `Tools`/`Open tools` affordance associated with the center workspace; in a strip state, the right strip is the visible reopen affordance and no top `Tools` button is added.
2. Activating the available affordance opens the existing right tool drawer.
3. The drawer uses the same canonical tab catalog and single-row scrolling contract as docked mode.
4. Files, Team, Terminal, Activity, Token, Artifacts, Browser, and VNC remain reachable when available.
5. Closing the drawer returns the user to the same center work state without changing the right preference unexpectedly.

### UJ-006 — Select an existing run from history

1. User opens the left navigation/history surface from the wide panel, strip, or narrow drawer.
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

1. Narrow width uses header plus left/right drawers.
2. A user-hidden left panel remains a user-controlled strip on desktop; it is not mislabeled as an automatic collapse.
3. At desktop widths, try the full left-docked/right-docked split.
4. If it does not fit, yield the right tools to a drawer/strip while preserving the left panel whenever left navigation plus the center still fit.
5. Only after those options fail may the left panel become an automatic strip/drawer.
6. Short height yields right tools first and keeps the left panel docked whenever horizontal fit permits.

The state must expose both the panel preference (`visible` or `hidden-by-user`) and the effective presentation (`docked`, `strip`, or `drawer`) with its source (`user` or `responsive`). No component may implement a separate `<1280px` left-collapse rule.

### Docked right-panel resize contract

The right-panel divider is a bounded resize interaction, not an implicit collapse command. While the right presentation is docked, its maximum width is derived from the current available horizontal capacity after the effective left surface, resize handles, and `centerMinWidth` are accounted for. The resize owner clamps the preferred/actual width at that bound. Dragging farther must not cause the composed policy to reinterpret the drag as a viewport transition, remove the right panel, or introduce a top `Tools` trigger. Only an explicit right-panel toggle or a genuine viewport/container resize may change the effective right presentation.

### Selected agent/team state

- The selected agent/team identity and status remain in the center workspace header.
- Existing typography and action priority are preserved unless a component-specific responsive rule is necessary.
- Right-side tool access remains stable and does not migrate into a generic top-level bar.

### Left navigation drawer state

- The drawer contains the existing `AppLeftPanel` content and navigation rather than a second reduced list.
- The drawer has a visible close/back affordance and an accessible dialog/drawer label.
- Opening it must not clear the active run or replace the center with an empty `Runs` surface.

### Right tools drawer state

- The drawer title identifies the current tool group (`Files` or `Tools`).
- The tab row remains one horizontal scrolling row and retains its active underline and fixed toggle only where the toggle is meaningful.
- The drawer close action returns to the previous center state.
- A right strip state does not render a second top `Tools` trigger; the strip opens this drawer. A drawer-only state renders exactly one semantic `Tools` trigger.

## Accessibility and interaction

- Use landmarks for the left navigation, center work surface, and right tools.
- Give every collapsed/strip/drawer trigger an accessible name describing the surface it opens.
- Preserve keyboard access to selection, run history, tool tabs, drawer close, and empty-state actions.
- Do not use hover-only labels as the sole way to discover a strip action.
- Keep focus within an opened drawer until the user closes it or activates a destination; return focus to the opening trigger.
- Responsive changes must not reorder controls in a way that changes keyboard meaning without a corresponding visual and accessible label.

## Visual contract

- Wide layout spacing, typography, and panel positions should match the personal branch unless a documented center-protection rule applies.
- The generic top surface bar is not part of the wide layout.
- The left collapse affordance remains in the left panel and is not replaced by an automatic mid-page collapse.
- Right tool tabs retain the separate `right-tool-tabs-ux-spec.md` contract: one row, original typography/spacing, native horizontal scrolling, active-tab auto-scroll, conditional edge fades, directional chevron, and stable panel toggle.
- Drawer/strip controls must be visually lightweight and semantically explicit; they must not look like a second application navigation hierarchy.

## Validation requirements

The implementation and browser validation must cover at least:

- wide default with left docked and right docked;
- wide with manual left collapse;
- full-screen/wide after a manual left collapse (no top surface bar);
- constrained desktop with left strip/drawer and right strip/drawer;
- narrow standard workspace with no selection and with a selected run;
- empty-state selection and run-history actions;
- right tools drawer access and tab reachability;
- right-strip state with no top `Tools` trigger and drawer-only state with exactly one semantic `Tools` trigger;
- bounded right-panel drag at the maximum center-preserving width;
- short-height recovery;
- repeated resize across all states;
- modest resize from large desktop where the left panel remains docked and right tools yield first;
- `/mobile` isolation.

The correctness boundary is not “all controls fit in the first row.” It is “the user can understand and reach the primary work, selection/run, and tools surfaces without duplicate or misleading navigation.”

## Implementation implications

These are design consequences for the reviewed package, not permission to patch before architecture review:

1. Remove the condition that shows generic primary surface controls merely because the left panel is not docked.
2. Do not render `WorkspacePrimarySurfaceControls` in wide or manual-left-collapse states. It may be replaced by explicit semantic drawer triggers for narrow states, or decommissioned if the shell/empty-state triggers cover all paths.
3. Keep the left panel docked by default through large-but-constrained states where left navigation plus a practical center still fit; let right tools yield first. Only the user collapse action changes it in wide/manual-collapse states, and automatic left strip/drawer behavior is limited to genuine center-protection states.
4. Provide an explicit navigation/selection path when the left panel is in a strip/drawer state; do not rely on the ambiguous `Runs` label.
5. Provide exactly one explicit right-tools reopen affordance: the visible right strip opens the drawer in strip state; render a semantic `Tools` trigger only for drawer-only state with no strip. Never render both for one effective state and never depend on an invisible right edge.
6. Bound right-panel drag against measured available capacity and the practical center minimum; do not let a drag itself trigger a docked-to-drawer/strip transition.
7. Replace the empty center sentence with a structured empty state and actions.
8. Preserve the existing right-tab work from `right-tool-tabs-ux-spec.md` and restore personal-branch typography/spacing before visual sign-off.
