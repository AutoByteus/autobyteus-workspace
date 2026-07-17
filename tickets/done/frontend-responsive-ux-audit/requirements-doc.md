# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — architecture re-review required for the strip-flow no-occlusion design impact.

## Supplemental Artifacts

- right-tool-tabs-ux-spec.md — intended right-tool tab-row interaction and visual contract for the personal-branch single-row header, native horizontal scrolling, active-tab reachability, accessibility, and the unchanged 50px consuming right strip with no overlay-strip variant. It explicitly excludes added edge fades and directional chevrons. Status: Refined for architecture re-review. Approval applicability: Required because it defines user-visible behavior.
- workspace-responsive-ui-ux-spec.md — scenario-level responsive shell/workspace UX contract covering the wide personal-branch layout, global default-layout left panel/strip/drawer behavior, workspace right panel/strip/drawer behavior, wide manual re-docking versus constrained/narrow transient drawers, flow-consuming strip geometry with no strip/content occlusion, strip visual continuity, no duplicate drawer chrome/header navigation controls, route/immersive boundaries, empty-state selection, tool access, accessibility, and `/mobile` separation. Status: Refined for architecture re-review. Approval applicability: Required because it defines user-visible behavior.
- comprehensive-responsive-ui-test-report.md — historical/live evidence for the responsive failure matrix and the durable browser-validation scope. Early generic-row, blanket-collapse, and drawer-only/top-Tools recommendations are explicitly superseded in the report; the refined guaranteed-strip requirements/design remain authoritative. Status: Evidence supplement, coherence-reconciled for architecture re-review. Approval applicability: N/A.

## Right-Tool Tab Design-Impact Follow-Up

The current CR-003 implementation wraps the right-tool tabs to keep the expanded catalog visible, and the later scrolling implementation adds edge fades and directional chevrons. The user-confirmed target is instead the original personal-branch single-row header with native horizontal scrolling but no added fade or chevron layer. The wrapping implementation, added visual affordances, and initial-fit browser assertion are not authoritative target behavior and must be revised only after this requirements/design update. Active-tab auto-scroll remains required so removing the added indicators does not reduce reachability.

The tab-row contract is defined in right-tool-tabs-ux-spec.md and is part of the intended-behavior requirements basis for architecture re-review.

## Workspace Shell Design-Impact Follow-Up

The user identified a broader regression than tab density or overflow: the current adaptive implementation shows a generic `Work / Runs / Files / Tools` row even on a full-screen workspace after the left panel is collapsed, while the original personal-branch layout keeps the center work surface and right-side tabs in place. The `Work` control can be empty, and `Runs` is an ambiguous proxy for the actual Agents/Agent Teams/run-history selection surface. This creates duplicate navigation and makes the primary user journey unclear. The user has now extended the same consistency requirement to other desktop routes that use the global default layout: the left panel must collapse to the same left strip and drawer instead of reverting to a separate black responsive header.

The target is therefore not merely “make the four buttons fit.” The target is to preserve the personal-branch desktop shell mental model across the global default-layout routes: the left navigation/history panel owns global navigation, the center route content owns the current page, and `/workspace` right-side tabs own Files and tools. Responsive states use the same left strip and transient left drawer everywhere in the default shell; `/workspace` additionally uses the symmetric right strip/drawer. At a wide viewport, a strip created by explicit user collapse re-docks its full panel when activated; when capacity is constrained or narrow, the strip opens a transient drawer instead. No default-layout route introduces a black responsive header, hamburger, breadcrumb navigation trigger, or duplicate top navigation bar. The scenario-level contract is defined in `workspace-responsive-ui-ux-spec.md` and requires architecture re-review before implementation resumes.

The user further clarified that the original desktop journey must remain intact through ordinary small-to-moderate window resizing. A broad fixed threshold must not immediately turn the important left selection/workspace panel into a vertical icon strip while the window still has ample desktop space. Responsive adaptation must be measured and prioritized: preserve the left selection surface, let the less-critical right tool panel yield first, and only move the left surface to a strip/drawer when the center plus left navigation can no longer remain usable.

### Strip-flow no-occlusion design-impact follow-up (2026-07-17)

Live validation found a remaining shell-level geometry defect on both default-layout
pages and `/workspace`: at constrained widths, the visible left and/or right
strip paints over the page or center content instead of reserving its width. The
supplied evidence is:

- `.../ctx_e384adcd0ede__image.png` — constrained workspace with both strips
  obscuring the center edges;
- `.../ctx_2ba42ba53ae4__image.png` and `.../ctx_013210eb513d__image.png` —
  `/agents` content clipped beneath the left strip;
- `.../ctx_f5f6cfbc8969__image.png` — constrained workspace shell evidence.

The source cause is precise. `responsiveLayoutPolicy.ts` currently permits a
`stripBehavior = 'overlay'` candidate with `consumedWidth = 0`, and its narrow
branch forces that candidate; the fallback candidate list can also choose it
when a 50px strip does not fit the old 480px center floor. `default.vue`,
`LeftSidebarStrip.vue`, `WorkspaceAdaptiveLayout.vue`, and
`RightSidebarStrip.vue` then render that state using fixed edge positioning and
`z-[60]`. Because the fixed strip is removed from flex flow while the default
main or workspace center starts at the row edge, the strip is painted above
content. This is why the same defect appears on `/agents`, `/agent-teams`, and
`/workspace`.

The corrected design removes overlay strips as an effective responsive state.
Every closed strip is a 50px consuming flex item on its side, including narrow
and constrained states. The policy uses a 200px compact center floor while
selecting consuming-strip candidates; only a terminal state below the 300px
minimum needed for two strips may lower the center floor to 0px. The center is
allowed to become very small, but the strips never occupy its pixels. A
transient drawer may remain fixed/overlayed only while open, and its matching
strip is hidden so the drawer is the sole side surface. `/mobile` and
`components/mobile/*` are unchanged. FR-046/FR-047 and AC-046/AC-047 are the
authoritative additions and require architecture re-review before source
rework.

## Goal / Problem Statement

Improve the standard AutoByteus `/workspace` frontend responsive experience. The normal wide desktop workspace is acceptable, but shrinking the browser width or height currently produces severe usability failures: a blank gray workspace at intermediate widths, a legacy mobile-tab workspace at smaller widths, and cramped desktop split panes at tablet/narrow desktop widths.

The current responsive refactor also introduced a product-level layout regression: it can replace the original wide workspace hierarchy with a top `Work / Runs / Files / Tools` row while the left selection surface is collapsed and the right tool tabs remain visible. This is confusing even in full-screen mode and obscures where users select or start an agent/team. The target must preserve the original wide layout and define narrow/constrained journeys explicitly rather than treating a generic surface bar as the universal fallback.

The target behavior is not a phone/PWA redesign. The existing `/mobile` route already owns true phone remote access. The standard `/workspace` route must remain a desktop-capability workspace that adapts gracefully in constrained browser, embedded-browser, and narrow-window contexts without losing access to the main conversation/team surface, run history, files, terminal, activity, artifacts, browser, or VNC tools.

## Investigation Findings

- Live backend/frontend startup was completed from the dedicated task worktree using an isolated backend data directory and frontend dev server.
- Current `/workspace` has duplicated and inconsistent responsive policy:
  - `pages/workspace.vue` decides desktop/mobile with `window.matchMedia('(min-width: 640px)')`.
  - `WorkspaceDesktopLayout.vue` hides itself with Tailwind `hidden md:flex` (`md` = 768px).
  - `WorkspaceMobileLayout.vue` hides itself with `md:hidden`.
  - `layouts/default.vue` independently switches the outer app shell at `md`.
- At viewport widths `640px <= width < 768px`, the route mounts `WorkspaceDesktopLayout`, but CSS hides that mounted layout and the mobile layout is not mounted. Live probes at `700x700` and `760x700` reproduced the user screenshot: black mobile app header with blank gray workspace body.
- At `width < 640px`, the route mounts `WorkspaceMobileLayout`. That component is a legacy, limited tab UI (`Running`, optional `Files`, optional `Content`, `Agent`) and does not preserve the standard workspace's right-side tool surface (Terminal/Activity/Artifacts/Browser/VNC) or the desktop-capability shell semantics.
- At `md+` constrained widths, current docked panes over-consume horizontal space. Live probes showed:
  - `1024x768`: left panel `320px`, right panel `450px`, center shell only `247px`.
  - `800x700`: left panel `320px`, right panel clamped to `273px`, center shell only `200px`.
- `useRightPanel.ts` currently clamps only enough to preserve a `200px` center minimum and does not auto-collapse or switch to a drawer/strip presentation when the workspace container cannot support docked right tools.
- `layouts/default.vue` keeps the full `320px` left panel docked at `md+` even when viewport width is only `768-1024px`, leaving insufficient width for the workspace.
- Short-height probes (`800x420`, `1024x480`) keep panes technically mounted but visibly cramped; the left-panel primary navigation/workspace-history split and the center/right split need height-aware responsive behavior.
- Operational note from live startup: `autobyteus-web/README.md` still documents `NUXT_PUBLIC_*` endpoint variables, but `nuxt.config.ts` actually uses `BACKEND_*` variables and the dev proxy in development. Using only the README variables produced connection-refused tool panels until corrected. This is a documentation sync issue for delivery.
- Expanded comprehensive responsive UI probing is recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md` with raw JSON/screenshots under `tickets/frontend-responsive-ux-audit/probes/comprehensive/`.
- The expanded viewport matrix covered `390x844`, `390x640`, `500x700`, `500x420`, `639x700`, `640x700`, `700x700`, `767x700`, `768x700`, `800x700`, `800x420`, `900x700`, `1024x768`, `1024x480`, `1180x800`, `1280x800`, `1440x900`, plus `/mobile` at `390x844`.
- Comprehensive results sharpen the severity model: `640-767px` is P0 blank; `<640px` is P1 legacy limited mobile-tab fallback; `768-1024px` is P1 center/right/left docking failure; `<=480px` height is P2 short-window recovery failure; button/control ordering is P2 product-level UX drift.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Responsive Layout Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Live screenshots/probe JSON under `tickets/frontend-responsive-ux-audit/probes/`; current code in `pages/workspace.vue`, `layouts/default.vue`, `components/layout/WorkspaceDesktopLayout.vue`, `components/layout/WorkspaceMobileLayout.vue`, `composables/useRightPanel.ts`, and `composables/useLeftPanel.ts`.
- Requirement or scope impact: Fixing only one breakpoint would remove the blank band but would preserve the bad legacy mobile layout and cramped narrow-desktop layout. The change needs a single responsive policy owner and adaptive shell/workspace presentations.

## Recommendations

1. Make standard `/workspace` an adaptive desktop-capability workspace; do not route constrained standard workspace windows into the legacy `WorkspaceMobileLayout`.
2. Introduce a single responsive policy owner for workspace/shell surface presentation and remove duplicated breakpoint decisions from route/component CSS.
3. Replace hard binary desktop/mobile layout switching with adaptive surface modes:
   - wide: existing docked left panel + center + docked right tools;
   - constrained: left and/or right panels change to 50px consuming strips, and each responsive strip opens its corresponding temporary drawer while the center shrinks in the same flow row;
   - narrow: left and right consuming strips remain in flow as the compact affordances for temporary drawers, all standard workspace capabilities remain reachable, and no header navigation controls or blank body are introduced. A wide user-origin strip instead re-docks its fitting panel when activated.
4. Raise the practical center-pane preservation requirement above the current `200px` minimum and auto-collapse side surfaces before the center becomes unusable.
5. Keep `/mobile` route and `components/mobile/*` as the phone/PWA remote-access owner; do not mix it into the default-layout shell or standard `/workspace` route.
6. Update developer startup docs to reflect actual `BACKEND_*` frontend endpoint configuration.
7. Treat button/control order as a product-level responsive requirement: the narrow layout must not inherit arbitrary legacy `Running / Agent` ordering, and tool buttons must keep a stable canonical order across docked tabs, strips, and drawers.
8. Preserve the original wide workspace mental model and use a consistent desktop shell: no generic top-level `Work / Runs / Files / Tools` bar, black responsive header, hamburger, breadcrumb trigger, top `Agents & teams`, or top `Tools` control; at wide manual collapse, strip activation re-docks the corresponding panel, while constrained/narrow strip activation opens a temporary drawer. The left panel/strip/drawer applies to every non-immersive route using `layouts/default.vue`; the right panel/strip/drawer remains a `/workspace` capability.
9. Define and validate scenario-level UX states for wide default, wide manual collapse and re-docking, constrained left/right strips and temporary drawers, narrow empty workspace, selected run, short-height recovery, and `/mobile` isolation. The detailed contract is in `workspace-responsive-ui-ux-spec.md`.
10. Treat the comprehensive responsive viewport matrix as a durable validation requirement, not a one-off manual audit; implementation should include policy/component coverage and a browser probe/E2E equivalent for the tested failure bands and layout-preservation journeys.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

Rationale: The defect starts as a breakpoint bug but the required product-quality fix crosses the app shell, workspace layout, left-panel presentation, right-panel presentation, and responsive coverage. It does not require backend domain changes.

## In-Scope Use Cases

- UC-001: Wide desktop workspace preserves the current good desktop UX.
- UC-002: Intermediate widths (`640-767px`) render usable workspace content rather than a blank body.
- UC-003: Constrained desktop/tablet widths (`768-1024px`) keep the center conversation/team/config surface usable by collapsing or re-presenting side surfaces.
- UC-004: Very narrow standard `/workspace` windows (`<640px`) retain access to standard workspace capabilities through drawers/strips/sheets instead of falling into the legacy limited mobile layout.
- UC-005: Short windows (`420-480px` height) keep navigation, center content, and tool access operable without forcing key controls permanently off-screen.
- UC-006: True phone/PWA remote access continues through `/mobile` and remains unaffected.
- UC-007: Local developer startup documentation accurately starts frontend against backend for manual responsive testing.
- UC-008: Responsive control/button ordering remains intentional, stable, and task-priority driven across wide, constrained, and narrow workspace modes.
- UC-009: Responsive fixes are validated against a comprehensive viewport/interaction matrix rather than a single screenshot or breakpoint.
- UC-010: The standard workspace preserves the original wide layout and gives users an explicit, understandable path to select/start an agent or team when side surfaces move into strips or drawers.
- UC-011: Resizing the docked right tool panel keeps the right panel present and protects a practical center width; reaching the resize limit does not unexpectedly replace the panel with a drawer.
- UC-012: Non-immersive routes using the global default layout (`/agents`, `/agent-teams`, `/applications`, `/media`, `/memory`, `/nodes`, `/skills`, `/tools`, and other default-layout pages) use the same left panel/strip/transient-drawer shell at wide, constrained, and narrow widths without the black responsive header.
- UC-013: Constrained/narrow default-layout routes keep the left strip in normal flex flow so route content begins beside it rather than underneath it; the strip remains visible and usable while the page center shrinks.
- UC-014: Constrained/narrow `/workspace` keeps every closed side strip in normal flex flow, reserves 50px for each visible strip, and shrinks the center to the resolved compact floor without strip/center overlap.

## Out of Scope

- Native Android/iOS UI changes.
- Redesign of the mature `/mobile` remote-access shell.
- Backend feature behavior changes unrelated to serving the UI during local reproduction.
- Full redesign of individual tool panel internals such as Terminal, Browser, or VNC beyond ensuring the panels are reachable in adaptive presentations.
- Visual restyling of the wide desktop workspace beyond preserving existing layout quality.

## Functional Requirements

- FR-016: Right-tool tabs in docked and drawer presentations must remain a single horizontal row with the original spacing, typography, active underline, and fixed panel-toggle affordance; the row must not wrap.
- FR-017: When the right-tool tab catalog exceeds the available header width, the tab row must remain horizontally scrollable through native mouse, touchpad, touch, and keyboard interactions.
- FR-018: The standard right-tool tab header must not add edge fades, directional chevrons, or another overflow-indicator layer. Native horizontal scrolling and active/focused-tab auto-scroll remain the reachability mechanisms when tabs exceed the visible width.
- FR-019: Selecting or keyboard-focusing an offscreen right-tool tab must automatically scroll that tab into view without changing canonical tab order or panel preference state.
- FR-020: An optional More menu may provide secondary direct tab selection, but it must not replace the visible scrollable tab row or become the only path to any tool.

- FR-021: At wide desktop sizes, the standard workspace must preserve the personal-branch hierarchy—left navigation/history, center Work surface, and right tool tabs—and must not show a generic top-level `Work / Runs / Files / Tools` bar.
- FR-022: At wide sizes, the left panel must remain docked by default and may become the existing strip only after the user activates its collapse affordance. A manual collapse must not cause a new top navigation bar to appear.
- FR-023: When the left surface is represented by a strip, the strip is the sole compact navigation affordance and must provide explicit semantic access to Agents, Agent Teams, workspaces, and run history. If the strip represents an explicit user collapse and the full panel fits at the current wide capacity, activation re-docks the full left panel; if capacity is constrained or narrow, activation opens a temporary left navigation drawer. An unlabeled or ambiguous `Runs` surface is insufficient.
- FR-024: When responsive policy moves the right tools out of a docked panel, standard `/workspace` must keep exactly one visible, accessible right-edge affordance while the transient right drawer is closed: the vertical right-tools strip. If the strip represents an explicit user collapse and the full panel fits at the current wide capacity, activation re-docks the full right panel; if capacity is constrained or narrow, activation opens a temporary right-tools drawer and hides the strip until dismissal. The strip must never be accompanied by a top `Tools` button. Files and tools remain owned by the right tool surface and must not be duplicated as generic top-level controls.
- FR-025: When no agent/team run is selected, the center empty state must provide a clear action to choose an agent/team and a clear action to open/select run history; the user must not need to infer the path from the word `Work`.
- FR-026: Responsive mode changes must preserve the selected run and must not permanently overwrite the user's wide-layout panel preference merely because a strip/drawer threshold was crossed.
- FR-027: The standard workspace must not use a generic surface-control row, hamburger, breadcrumb navigation control, or top `Agents & teams`/`Tools` button as a universal responsive fallback. Compact access must be provided by the left and right strips; activation re-docks a user-collapsed panel when the current wide capacity permits, otherwise it opens that side's temporary drawer without duplicating visible side navigation.
- FR-028: Wide-layout typography, spacing, panel positions, and right-tab presentation must remain materially consistent with the personal branch unless a documented center-protection state is active; narrow typography must not be used as an unrequested global density reduction.
- FR-029: The responsive policy must not blanket-collapse the left navigation panel at a broad desktop breakpoint (for example, every viewport below `1280px`). It must use measured layout capacity and surface priority so the original left selection/workspace panel remains docked while the left panel plus a usable center can fit.
- FR-030: When all surfaces cannot remain docked, the policy must yield the right tool panel before collapsing the left selection/workspace panel, unless the user has explicitly collapsed the left panel or a short-height/narrow state requires a different presentation.
- FR-031: A single composed responsive-policy boundary must resolve viewport capacity, left/right preferences, effective presentations, presentation sources, strip activation actions, mode, and drawer/strip affordances for both the app shell and workspace; shell and workspace components must not independently resolve competing responsive states.
- FR-032: The standard `/workspace` right surface has one responsive affordance contract: docked means the panel's existing fixed toggle remains available; a wide user-collapsed strip re-docks the panel when the current capacity permits; a constrained/narrow strip opens the temporary right-tools drawer. No standard `/workspace` state renders a separate top `Tools` button or a drawer-only right presentation.
- FR-033: While the right tools are docked, dragging their resize handle must be bounded by the measured available horizontal capacity. Automatic responsive layout uses the practical `480px` center target, but an explicit user resize may intentionally use the personal-branch compact center floor of `200px`. Reaching the applicable bound clamps the width and keeps the docked right panel visible; the drag must not silently switch the right panel to a strip/drawer or create a top `Tools` trigger. Responsive presentation changes remain owned by genuine viewport/container transitions or explicit panel-toggle actions.
- FR-034: The composed responsive state must distinguish retained right-panel resize intent from effective center-protection mode. The retained intent starts `automatic` and becomes `user-sized` after an explicit divider drag. While the user-sized dock fits, the effective center floor is `200px`; when a viewport/container shrink makes that geometry infeasible, the resolver temporarily applies responsive protection with the `480px` target and yields right tools without erasing the retained intent. On viewport recovery, the user-sized dock may return. This lifecycle must not affect `/mobile`.
- FR-035: When docked right tools no longer fit, the responsive policy must choose the right strip before adapting the left surface. A closed right strip is always a 50px consuming flex item; it never becomes a fixed edge strip and never paints over the center. The policy lowers the center floor to the compact strip floor when needed, and uses a terminal `0px` floor only below the minimum width needed to place both strips in flow. The strip is the only compact right-tools affordance for standard `/workspace`; no top `Tools` trigger or drawer-only policy state is introduced at narrow or constrained widths.
- FR-036: The composed responsive output must expose one authoritative representation of resize intent and effective center protection: `rightPanel.resizeIntent`, `rightPanel.centerProtectionMode`, and `rightPanel.effectiveCenterMinWidth`. It must not emit redundant top-level `centerMinWidth` or `rightPanelResizeIntent` fields. `WorkspaceAdaptiveLayout` must consume the nested effective floor for center sizing and dependent dock-width calculations, with automatic, user-override, and responsive-yield values asserted separately.
- FR-037: Every standard `/workspace` state must preserve a visible right-tools strip whenever the right tools are not docked and the transient right drawer is closed. The closed strip always consumes `50px` in the layout flow; when opened, the drawer is the sole visible right surface until dismissal. The center work surface remains mounted and shrinks to the canonical effective floor, including the terminal `0px` floor only when both strips cannot otherwise fit. No separate top `Tools` control may be used as a replacement.
- FR-038: Standard `/workspace` must use a symmetric side-surface model: left panel/left strip/left drawer for navigation and history, and right panel/right strip/right drawer for tools. When a panel is docked it replaces its strip; when it is not docked, its strip is the sole visible compact affordance. A wide user-collapsed strip re-docks its panel when activated and the panel fits; a constrained/narrow strip opens a temporary drawer. Standard `/workspace` must not render a hamburger, breadcrumb navigation trigger, or duplicate `Agents & teams` button; `/mobile` is the only phone-specific navigation surface.
- FR-039: The desktop shell rule is route-scoped by layout ownership. Every non-immersive route using `layouts/default.vue` (including `/workspace`, `/agents`, `/agent-teams`, `/applications`, `/media`, `/memory`, `/nodes`, `/skills`, and `/tools`) uses the shared left panel/strip/transient-drawer navigation model and does not render the black responsive header, hamburger, or breadcrumb navigation trigger. `/workspace` additionally owns the symmetric right panel/strip/transient-drawer tools model and has no top `Agents & teams`, top `Tools`, or generic surface row. `/mobile` remains `layout:false`, and immersive application presentations remain outside the shared navigation shell.
- FR-040: Strip activation semantics must be symmetric and capacity-aware: `presentationSource = 'user'` plus a currently fitting dock yields `redock-panel`, while any constrained/narrow or responsive strip yields `open-drawer`; the redock action restores the corresponding visible preference and closes any temporary drawer, while `open-drawer` does not mutate the user's panel preference.
- FR-041: Standard `/workspace` left and right strips must preserve the original personal-branch strip visual/control inventory in every closed strip state (wide manual, constrained, and narrow). Every closed strip is a consuming flow item; responsive behavior may change only the activation result (`redock-panel` versus `open-drawer`), never the strip controls or geometry contract. The renderer must not add a leading menu/breadcrumb button, visible `Agents & teams`/`Tools` drawer title, separate close X, or duplicate panel-toggle control. When a strip opens its transient drawer, that side's strip is hidden for the duration of the drawer so the drawer is the sole visible surface for that side; closing by backdrop or Escape returns to the same strip without mutating panel preference. Non-visual dialog labelling and focus management remain required for accessibility.
- FR-043: The global default-layout shell must render the left panel when docked, the unchanged personal-branch left strip when non-docked and its drawer is closed, and the left navigation drawer as the sole left surface while open. This behavior is shared across default-layout routes; it must not be duplicated in individual pages or replaced by a black header/hamburger at narrow widths.
- FR-044: On non-workspace default-layout routes, activating a left-strip item must preserve the item's existing route-navigation meaning and active-route state. A wide fitting user-origin strip re-docks the panel; a constrained/narrow/responsive strip opens the transient drawer, and the drawer's navigation actions may route normally. Closing the drawer restores the strip without mutating the stored panel preference.
- FR-045: The global shell must not emit a `showHeader`/header-visibility compatibility field for ordinary default-layout presentation. Header suppression is the direct shell invariant; only `layout:false` routes and explicitly immersive application presentations bypass the shell. `/mobile` must not import or depend on the global left panel/strip/drawer.
- FR-046: Every closed non-docked left or right strip in the supported desktop/default-layout shell is a normal flex-flow item with `consumedWidth = 50px`; no strip is fixed to a viewport edge and no strip may overlap route content or the workspace center. Only a transient drawer may be fixed/overlayed, and its corresponding strip is hidden while open.
- FR-047: The composed output and renderers use nested `rightPanel.effectiveCenterMinWidth` as the canonical center floor. Docked automatic protection remains `480px`, docked user override remains `200px`, consuming-strip states use a `200px` compact floor, and a terminal below-`300px` flow state may use `0px` solely to preserve both 50px strips in flow. Retained user intent and `/mobile` isolation remain unchanged.

- FR-001: `/workspace` must not have any viewport-width band where the route mounts one workspace layout while CSS hides that same mounted layout and no alternative layout is visible.
- FR-002: `/workspace` must use one authoritative responsive policy for shell/workspace surface presentation instead of independent breakpoint decisions in `pages/workspace.vue`, `WorkspaceDesktopLayout`, `WorkspaceMobileLayout`, and `layouts/default.vue`.
- FR-003: Wide desktop behavior must preserve the current primary layout: left navigation/history panel, center workspace surface, and right-side tools panel are docked when enough space exists.
- FR-004: At constrained widths, the app must preserve a usable center workspace surface by automatically collapsing or re-presenting the left and/or right side surfaces before the center is squeezed below the target minimum usable width.
- FR-005: At narrow standard `/workspace` widths, the UI must retain discoverable access to run history/navigation, files, terminal, activity/progress, artifacts, browser, and VNC through strips, drawers, sheets, or equivalent standard-workspace surfaces.
- FR-006: The legacy `WorkspaceMobileLayout` must not remain the standard `/workspace` fallback if it cannot provide the standard workspace capability set.
- FR-007: The `/mobile` route and `components/mobile/*` remote-access shell must remain the owner for phone/PWA experiences and must not be regressed by the `/workspace` responsive refactor.
- FR-008: Responsive behavior must account for both width and height so short windows do not permanently hide required controls or create unusable split panes.
- FR-009: The right-panel width policy must preserve a practical center width and switch presentation mode rather than merely clamping the right panel while leaving a `200px` center.
- FR-010: The left-panel policy must distinguish user preference from responsive effective presentation so constrained widths can auto-collapse without permanently overwriting the user's wide-desktop preference.
- FR-011: Developer documentation for local frontend/backend startup must match the actual Nuxt configuration variables used by `nuxt.config.ts`.
- FR-012: Standard `/workspace` must use a canonical surface-ownership model rather than per-layout ad hoc navigation: the center owns the current Work surface, the left surface owns agent/team selection plus run/history/config access, and the right surface owns Files and tools. A generic top-level surface row must not duplicate those owners.
- FR-013: Right-tool controls must keep a stable order across docked desktop tabs, constrained strips, and narrow drawers/sheets: Files first where present, contextual Team overview when relevant, then Terminal, Activity, Artifacts, Browser, and VNC.
- FR-014: Header/action buttons inside the center work surface must keep stable priority under constrained width: identity/status first, primary run/work actions next, secondary actions in overflow; controls must not wrap into unusable or misleading order.
- FR-015: The implementation must provide durable responsive validation for the known failure classes: blank `640-767px` band, legacy `<640px` `/workspace` fallback, cramped `768-1024px` docked panes, short-height recovery, canonical control/tool ordering, wide desktop non-regression, and `/mobile` route isolation.

## Acceptance Criteria

- AC-016: In docked and drawer right-tool presentations, the tabs render in one horizontal row with no multi-row wrapping; the original spacing, typography, active underline, and fixed panel-toggle affordance remain present.
- AC-017: When the tab row overflows, a browser/component test can scroll it horizontally through mouse/touchpad-equivalent, touch, and keyboard paths; the test does not require all tabs to fit initially.
- AC-018: No edge fade, directional chevron, or overflow-indicator layer is rendered in the standard right-tool tab header, including at the initial, middle, and terminal scroll positions; the single row remains natively scrollable and offscreen active/focused tabs remain reachable.
- AC-019: Activating or focusing an offscreen tab automatically brings it into the visible tab-list bounds in both docked and drawer presentations.
- AC-020: The current expanded catalog, including Usage/Token and VNC Viewer when available, remains reachable and in canonical order through scrolling without changing the active underline or panel-toggle placement.
- AC-021: If a More menu is implemented, it is a secondary shortcut and the visible scrollable tab row remains available as the primary interaction.

- AC-022: At wide desktop size with the left panel docked, no generic `Work / Runs / Files / Tools` row is rendered; the personal-branch left/center/right hierarchy is visible.
- AC-023: After manually collapsing the left panel at a wide/full-screen size, the left strip, center work surface, and right-side tabs remain in the original hierarchy and no generic surface row appears.
- AC-024: In every constrained/narrow state where the left panel is not docked, a clearly named navigation/selection affordance opens or reaches Agents, Agent Teams, workspaces, and run history without clearing the selected run.
- AC-025: In every state where right tools are not docked and the transient right drawer is closed, a visible right-edge strip is present and has an accessible name. In a wide user-collapsed state whose right panel fits, activating it re-docks the full right panel; in constrained/narrow or responsive-yield states, activating it opens the temporary right-tools drawer, hides the strip until dismissal, preserves the selected run, and exposes the full available catalog. No standard `/workspace` state renders a separate top `Tools` trigger or a drawer-only responsive policy replacement for the strip.
- AC-026: With no selected run, the center empty state renders a primary agent/team selection action and a secondary run/history action; clicking each action reaches the existing selection/run path.
- AC-027: Repeated resizing across wide, constrained, narrow, and short-height states does not introduce a duplicate surface bar, blank center, lost selection, or permanent preference mutation.
- AC-028: The standard `/workspace` layout does not show a top-level `Work / Runs / Files / Tools` bar merely because the left panel is collapsed or presented as a strip; any compact narrow controls are semantic drawer/tool actions only.
- AC-029: At wide sizes, text sizing and spacing for the workspace shell and right tabs remain materially aligned with the personal branch; a compact responsive state cannot silently apply `text-sm`/reduced padding to the wide layout.
- AC-030: At a large-but-constrained desktop viewport where the left panel plus the compact center width can still fit, the default left panel remains docked and usable; the right tools adapt first from docked to a 50px consuming strip. The strip opens the transient right-tools drawer and no top `Tools` trigger is rendered. A small reduction from a wide viewport must not immediately replace the left panel with only a vertical icon strip.
- AC-031: The responsive policy tests and browser matrix demonstrate that left-panel collapse is driven by measured center/left feasibility and surface priority, not a blanket `<1280px` rule; the original desktop selection journey remains available until the layout genuinely requires a drawer/strip.
- AC-032: Pure policy boundary tests cover the exact fit formula and phase order for wide, large-but-constrained, constrained, narrow, short-height, manual-left-hidden, and repeated-resize inputs, including preference preservation and `presentationSource` distinction.
- AC-033: Browser/component coverage proves right-tool affordance exclusivity: wide/right-docked has no top `Tools` trigger; full-screen/manual right collapse renders the right vertical strip with no top `Tools` row and activation re-docks the panel; constrained/narrow and automatic right yielding render the same strip with no top row and activation opens the temporary right-tool drawer without changing the selected run. There is no standard `/workspace` drawer-only state.
- AC-034: A resize interaction test drags the docked right handle toward the center beyond the available bound and proves the right panel remains rendered, the center remains at least the applicable floor (`480px` automatic or `200px` after explicit user resize), the width stops at the bound, and no strip/drawer/top `Tools` transition occurs merely because the bound was reached. A separate viewport/container-resize test may verify genuine responsive transition from docked to a consuming strip while preserving preference state.
- AC-035: Policy/component tests cover the full resize lifecycle: initial automatic state uses a `480px` floor; post-drag user-sized state may remain docked with a `200px` floor; viewport shrink retains `user-sized` intent but returns effective protection to `480px` and re-presents tools when needed; viewport recovery re-evaluates the retained user-sized intent and may restore the docked compact geometry. Selected run, visibility preference, resize intent, and effective protection are asserted separately.
- AC-036: Boundary tests prove the right-tools fallback order is docked -> consuming strip while the transient drawer is closed. The strip always consumes 50px in flow; the resolver lowers the canonical center floor to 200px for strip candidates and may use 0px only in a terminal state below 300px. Opening the drawer hides the strip until dismissal. All states have no top `Tools` trigger; a user-origin strip that can re-dock activates `redock-panel`, while a constrained/responsive strip activates `open-drawer`.
- AC-038: At representative desktop, embedded, and narrow `/workspace` widths, the right strip remains discoverable as a flow item and the center remains mounted between the left and right surfaces; geometry assertions prove the strip never intersects the center and never creates a blank center, duplicate controls, or a lost selected run.
- AC-037: Policy and component tests prove the output/renderer authority contract: no top-level center-floor or resize-intent duplicates are emitted; automatic docked output uses nested `rightPanel.effectiveCenterMinWidth = 480`, user-override docked output uses `200`, consuming-strip output uses `200`, terminal dual-strip output may use `0`, and responsive-yield retains `rightPanel.resizeIntent = 'user-sized'`. `WorkspaceAdaptiveLayout` center styling and dependent dock feasibility read that nested field in all cases.
- AC-039: Policy, component, and browser coverage prove the symmetric side-surface contract: docked left/right panels replace their strips; every non-docked side exposes its own 50px consuming flow strip while its transient drawer is closed; wide user-origin strips re-dock fitting panels on activation, while constrained/responsive strips open only their corresponding temporary drawer and hide that strip until dismissal; standard `/workspace` has no hamburger, breadcrumb navigation trigger, duplicate `Agents & teams` button, top `Tools` button, or generic surface row; `/mobile` remains unchanged.
- AC-041: Policy, component, and browser tests assert the symmetric activation matrix: left/right wide manual collapse -> strip with `redock-panel` and visible preference restoration; left/right constrained or narrow responsive yield -> strip with `open-drawer` and unchanged preference; shrinking a user-collapsed panel changes activation to `open-drawer` without erasing intent, and recovery restores `redock-panel` when the panel fits again.
- AC-042: Source, component, and browser coverage prove strip visual continuity against `origin/personal`: no additional left hamburger/menu or breadcrumb control is inserted, no visible drawer title (`Agents & teams`/`Tools`) or separate close X is rendered, and each closed strip remains the sole compact affordance for its side. Activating an `open-drawer` strip hides that strip while the transient drawer is open; backdrop/Escape closes the drawer and restores the same strip without duplicate side effects or preference mutation. `/mobile` remains outside this assertion.
- AC-040: Global default-layout shell coverage proves representative non-immersive `/workspace`, `/agents`, and `/tools` routes use the shared left panel/strip/transient-drawer shell without a black responsive header, hamburger, or breadcrumb trigger; `/workspace` additionally owns the right tools surfaces, immersive presentations bypass the shell, and `/mobile` remains `layout:false`/`MobileRemoteAccessShell` without importing the standard shell.

- AC-001: At `700x700` and `760x700`, `/workspace` shows visible workspace controls/content; it does not show only the black app header plus blank gray body.
- AC-002: At `1440x900`, the current wide desktop layout remains materially unchanged: left panel docked, center workspace visible, and right tools docked by default.
- AC-003: At `1024x768`, the center workspace surface is not squeezed to approximately `247px`; side surfaces collapse or change presentation so the center is meaningfully usable.
- AC-004: At `800x700`, the center workspace surface is not squeezed to approximately `200px`; the UI chooses constrained presentation rather than maintaining three cramped docked panes.
- AC-005: At `<640px` standard `/workspace` widths, the old limited `Running/Files/Content/Agent` mobile-tab layout is not the only available experience; standard workspace tools remain reachable.
- AC-006: At `800x420` and `1024x480`, required controls remain operable through scrolling/drawers/strips; no key panel is clipped with no recovery path.
- AC-007: `/mobile` still renders `MobileRemoteAccessShell` and does not import or depend on the standard workspace adaptive shell.
- AC-008: Unit/component coverage verifies the responsive-policy boundary at least around `639`, `640`, `767`, `768`, `800`, `1024`, and a wide desktop size.
- AC-009: A live browser responsive probe or equivalent E2E coverage confirms no blank workspace body at `640-767px` and validates constrained-width behavior.
- AC-010: `autobyteus-web/README.md` or equivalent local-development docs no longer instruct developers to use endpoint environment variables ignored by the current Nuxt config.
- AC-011: At narrow standard `/workspace` widths, the center work surface remains primary, the left strip is the sole compact navigation affordance and opens the left navigation/selection drawer, and the right strip is the sole compact tools affordance and opens the right tools drawer. No hamburger, breadcrumb navigation trigger, top `Agents & teams`/`Tools` button, or generic `Work / Runs / Files / Tools` row is rendered; the legacy `Running / Agent` pair is not reused.
- AC-012: In every right-tool presentation mode, the tool order is stable and matches the canonical sequence: Files, Team when applicable, Terminal, Activity, Artifacts, Browser, VNC.
- AC-013: Agent/team center header controls remain discoverable and ordered by priority under constrained width; secondary actions collapse into overflow instead of displacing the title/status or primary work action.
- AC-014: A browser-level responsive probe or equivalent E2E coverage runs the comprehensive viewport family used in investigation (`390x844`, `390x640`, `500x700`, `500x420`, `639x700`, `640x700`, `700x700`, `767x700`, `768x700`, `800x700`, `800x420`, `900x700`, `1024x768`, `1024x480`, `1180x800`, `1280x800`, `1440x900`) and records screenshots/traces for failures.
- AC-015: In the target state, the comprehensive probe no longer reports the current failure classes for standard `/workspace`: `desktop_layout_mounted_but_hidden`, `visible_main_has_no_workspace_content`, `legacy_mobile_running_agent_button_model`, center widths around `200-247px` at `768-1024px`, cramped right tool panels at `768-800px`, or unrecoverable full docked side panels in short-height windows.

## Constraints / Dependencies

- Preserve wide desktop behavior and existing route `/workspace` semantics.
- Use one global left panel/strip/transient-drawer shell for all non-immersive routes using `layouts/default.vue`; route content and active-navigation semantics must remain intact.
- Do not regress `/mobile` remote-access route.
- Do not apply the default-layout left shell to `layout:false` routes or immersive application presentations.
- Tailwind's default `md` breakpoint is `768px`; any JS thresholds must not conflict with CSS-only visibility thresholds.
- Existing global state in `useLeftPanel` and `useRightPanel` must avoid SSR/browser lifecycle hazards.
- Implementation should avoid backward-compatible dual desktop/mobile behavior paths for standard `/workspace` after the adaptive layout is introduced.

## Assumptions

- The referenced screenshot represents the `640-767px` blank-band failure caused by the `640px` JS breakpoint versus `768px` CSS breakpoint mismatch.
- Standard `/workspace` should remain useful in embedded browser panes and resizable desktop windows even when the surface is narrower than a typical desktop monitor.
- True phone usage should prefer `/mobile`, not the legacy `WorkspaceMobileLayout` embedded in `/workspace`.
- The user-confirmed wide-layout preference is the personal-branch hierarchy without a generic top surface bar; the scenario-level behavior is recorded in `workspace-responsive-ui-ux-spec.md`.

## Risks / Open Questions

- Exact visual thresholds for automatic left/right collapse need implementation tuning, but the minimum outcome must satisfy the acceptance criteria above.
- The exact narrow trigger treatment (text label versus icon-plus-label) can be tuned during implementation, but it must remain semantically explicit and must not recreate the generic four-surface bar.
- Some right-side tools may need additional internal responsive polish after being moved into drawer/sheet presentations; this task requires reachability and shell-level usability, not complete tool-internal redesign.
- Existing user preference persistence for panel visibility/width is minimal; adding responsive effective modes must not create surprising permanent state changes.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-001 | UC-002 |
| FR-002 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-003 | UC-001 |
| FR-004 | UC-003 |
| FR-005 | UC-004 |
| FR-006 | UC-002, UC-004 |
| FR-007 | UC-006 |
| FR-008 | UC-005 |
| FR-009 | UC-003, UC-005 |
| FR-010 | UC-001, UC-003, UC-005 |
| FR-011 | UC-007 |
| FR-012 | UC-008 |
| FR-013 | UC-008 |
| FR-014 | UC-003, UC-004, UC-005, UC-008 |
| FR-015 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-008, UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Regression guard for the exact blank responsive band reproduced live. |
| AC-002 | Wide desktop non-regression. |
| AC-003 | Narrow desktop/tablet width usability. |
| AC-004 | Severe constrained-width usability. |
| AC-005 | Legacy mobile fallback removal/replacement for standard workspace. |
| AC-006 | Short-window usability. |
| AC-007 | `/mobile` ownership boundary preservation. |
| AC-008 | Durable unit/component coverage of policy decisions. |
| AC-009 | Browser-level confidence for responsive layout behavior. |
| AC-010 | Documentation sync for live manual testing. |
| AC-011 | Primary narrow control ordering and removal of the legacy ambiguous mobile button model. |
| AC-012 | Stable canonical tool ordering across docked/strip/drawer presentations. |
| AC-013 | Center header/action priority under constrained width. |
| AC-014 | Comprehensive responsive browser matrix coverage. |
| AC-015 | Regression guard for all current failure classes found by the comprehensive probe. |

## Approval Status

Refined from the user's explicit confirmation of the original single-row right-tool tab design, subsequent rejection of the full-screen `Work / Runs / Files / Tools` row and early left-panel auto-collapse, the decision to make left and right side surfaces symmetric, the request to remove the added right-tab edge fade/chevron layer, the decision to use the same left panel/strip/transient-drawer shell across all non-immersive default-layout routes, and the latest strip-flow no-occlusion finding. Both `right-tool-tabs-ux-spec.md` and `workspace-responsive-ui-ux-spec.md` are intended-behavior supplements and require architecture re-review before implementation resumes. This revision adds FR-046/FR-047 and AC-046/AC-047: every closed strip is a 50px consuming flex item, the center shrinks between the strips using the nested effective floor (200px compact, terminal 0px only below 300px), fixed positioning is reserved for the open transient drawer, and a strip is hidden while its drawer is open. Right-tool priority is now docked -> consuming strip with no effective overlay-strip state. The existing wrapping Local Fix, added fade/chevron implementation, initial-fit browser assertion, generic four-surface-row behavior, blanket `<1280px` left collapse, duplicate right-strip-plus-top-Tools behavior, route-specific black-header fallback, `showHeader` compatibility path, and fixed strip-over-content behavior are superseded for their respective scopes; `/mobile` plus immersive application presentations remain explicit boundaries.

### Latest strip-activation reconciliation

The previously described “each strip opens its corresponding transient
drawer” rule is superseded by the clarified hybrid interaction: a wide
user-collapsed strip re-docks its fitting panel when activated; a constrained,
narrow, or responsive-yield strip opens a temporary drawer and leaves the
preference unchanged. FR-040 and AC-041 are the authoritative additions for
this lifecycle and require architecture re-review.

### Core output schema reconciliation (DI-010)

The core design output is aligned with the approved executable contract:
`ResponsivePresentation` is only `docked | strip`, and the nested
`leftPanel.stripActivation` / `rightPanel.stripActivation` fields are the
sole side-action authority. Drawer open/closed state is transient local
interaction state and is not emitted as an effective presentation. The stale
top-level `canOpenLeftDrawer` and `canOpenRightDrawer` fields are removed from
the design pseudocode; `open-drawer` is the explicit action that permits the
corresponding renderer to open its local drawer. Architecture re-review is
required before implementation resumes.

### Strip visual continuity reconciliation

The user clarified that the strip itself must remain the original
`origin/personal` compact surface in every desktop `/workspace` strip state.
The constrained/narrow distinction changes only what strip activation does:
it either re-docks the panel or opens the temporary drawer. It must not change
the strip's controls or add a separate drawer header, breadcrumb/menu button,
close X, or duplicate panel toggle. When the drawer opens, the corresponding
strip is temporarily hidden so the drawer and strip are never simultaneously
visible; backdrop/Escape closes the drawer and restores the strip without
changing preference. FR-041 and AC-042 are the authoritative visual/control
continuity additions; `/mobile` is excluded.

### Global default-layout shell reconciliation

The user clarified that the black responsive header/hamburger is not a useful
second navigation model on desktop routes. The left panel is already owned by
the global `layouts/default.vue` shell, so its responsive presentation must be
shared rather than workspace-only: docked left panel at fitting capacity,
personal-branch left strip when non-docked and the drawer is closed, and the
left navigation drawer as the sole left surface while open. The strip keeps
route-aware active state and navigation meaning for `/agents`, `/agent-teams`,
`/tools`, and other default-layout pages. This is shell-level reuse of the
existing owner, not a new page-level navigation component.

The target removes the default-layout `showHeader`/black-header compatibility
path and its hamburger/breadcrumb trigger. `layout:false` routes such as
`/mobile` and explicitly immersive application presentations remain outside
the shell. `/workspace` continues to add the right tools surface and its
approved right strip/drawer policy. FR-043–FR-045 and AC-043–AC-045 are the
authoritative additions; implementation must remove the obsolete route branch
and update route/component/browser coverage as one coherent change.

## Revised Requirement Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-016 | UC-008, UC-009 |
| FR-017 | UC-008, UC-009 |
| FR-018 | UC-008, UC-009 |
| FR-019 | UC-008, UC-009 |
| FR-020 | UC-008, UC-009 |

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-016 | Single-row right-tool tab-header visual contract. |
| AC-017 | Horizontal overflow interaction across pointer, touch, and keyboard input. |
| AC-018 | Personal-branch visual continuity: no added fade/chevron while native scrolling and active-tab reachability remain available. |
| AC-019 | Active/focused tab auto-scroll reachability. |
| AC-020 | Expanded catalog reachability and order preservation. |
| AC-021 | Optional More-menu non-replacement rule. |

## Shell Reconciliation Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-021 | UC-001, UC-010 |
| FR-022 | UC-001, UC-010 |
| FR-023 | UC-003, UC-004, UC-006, UC-010 |
| FR-024 | UC-003, UC-004, UC-005, UC-010 |
| FR-025 | UC-001, UC-004, UC-010 |
| FR-026 | UC-002, UC-003, UC-007, UC-010 |
| FR-027 | UC-003, UC-004, UC-010 |
| FR-028 | UC-001, UC-002, UC-010 |
| FR-029 | UC-001, UC-003, UC-007, UC-010 |
| FR-030 | UC-003, UC-004, UC-007, UC-010 |
| FR-031 | UC-001, UC-003, UC-004, UC-005, UC-007, UC-010 |
| FR-032 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-010 |
| FR-033 | UC-001, UC-003, UC-007, UC-011 |
| FR-034 | UC-001, UC-003, UC-007, UC-011 |
| FR-035 | UC-003, UC-004, UC-005, UC-010 |
| FR-036 | UC-001, UC-003, UC-007, UC-011 |
| FR-037 | UC-003, UC-004, UC-005, UC-007, UC-010 |
| FR-038 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-010 |
| FR-039 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-010 |
| FR-040 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-007, UC-010 |
| FR-041 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007, UC-010 |
| FR-043 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-010, UC-012 |
| FR-044 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-010, UC-012 |
| FR-045 | UC-006, UC-012 |

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-022 | Wide personal-branch hierarchy and no duplicate top surface bar. |
| AC-023 | Manual left collapse preserves wide hierarchy. |
| AC-024 | Explicit selection/navigation reachability plus wide re-dock versus constrained temporary-drawer behavior. |
| AC-025 | Explicit right-tools reachability in non-docked states. |
| AC-026 | Empty-state selection and run-history discoverability. |
| AC-027 | Cross-mode resize stability and preference preservation. |
| AC-028 | Generic four-surface row is not a universal fallback. |
| AC-029 | Wide typography/spacing non-regression. |
| AC-030 | Large-but-constrained desktop preserves left selection panel and yields right tools first. |
| AC-031 | Measured threshold and resize-priority validation. |
| AC-032 | Composed policy formula, phase-order, and preference/source boundary coverage. |
| AC-033 | Exactly-one right-tool compact affordance across docked and consuming-strip presentations; a fitting wide user-origin strip re-docks, a constrained/responsive strip opens the transient drawer, and no top Tools trigger exists. |
| AC-034 | Bounded right-panel drag preserves docked right tools and practical center; only viewport/panel actions change presentation. |
| AC-035 | Automatic `480px` center protection versus explicit personal-branch `200px` resize override is covered at the policy/layout boundary. |
| AC-036 | Right-tool fallback is docked -> consuming strip; all states have no top Tools trigger, with activation selecting re-dock for a fitting user-origin strip or the transient drawer for constrained/responsive strips. |
| AC-037 | Nested effective center-floor and resize-intent fields are the sole output/renderer authority across automatic, user-override, and responsive-yield states. |
| AC-038 | Right strip is guaranteed as the standard workspace compact affordance, always consuming flow width without top Tools or center loss. |
| AC-039 | Symmetric left/right panel-strip-drawer ownership with wide re-docking, constrained temporary drawers, and no header or duplicate top navigation controls. |
| AC-040 | Shared default-layout shell behavior across workspace and non-workspace routes, with `/mobile` isolation. |
| AC-041 | Symmetric capacity-aware strip activation and preference lifecycle. |
| AC-042 | Personal-branch strip visual continuity, single multifunctional side control, and absence of duplicate drawer chrome. |
| AC-043 | Shared default-layout left panel/strip/transient-drawer rendering across representative non-workspace routes, with no black responsive header, hamburger, or breadcrumb trigger. |
| AC-044 | Non-workspace strip navigation preserves active route meaning, drawer actions, focus restoration, and panel preference semantics across wide, constrained, and narrow states. |
| AC-045 | The composed shell output has no ordinary `showHeader` compatibility field; `/mobile` and immersive application presentations remain explicit shell boundaries. |
| AC-046 | Closed side strips are 50px consuming flow items with no fixed positioning; only an open transient drawer overlays and it hides its corresponding strip. |
| AC-047 | Geometry coverage proves `/agents`, `/agent-teams`, and `/workspace` keep strips outside page/center content at constrained and narrow widths, including a terminal below-300px flow case. |
