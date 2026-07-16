# Design Spec

## Supplemental Design Artifact

right-tool-tabs-ux-spec.md is the authoritative task-specific UI/UX supplement for the right-tool tab header. It defines the approved single-row visual contract, horizontal scrolling, conditional edge fade/chevron discoverability, active-tab auto-scroll, keyboard/touch behavior, optional More-menu boundary, and validation obligations. It is intended behavior and requires architecture-review approval together with this design spec.

`workspace-responsive-ui-ux-spec.md` is the authoritative scenario-level supplement for the standard workspace shell. It defines the personal-branch wide layout, explicit left collapse, constrained/narrow strip and drawer states, empty-state selection/run actions, right-tool access, accessibility, and `/mobile` separation. It is intended behavior and requires architecture-review approval together with this design spec.

## Current-State Read

The standard `/workspace` route currently has no single responsive-layout owner.

Current path:

`Browser viewport -> layouts/default.vue app shell -> pages/workspace.vue route selector -> WorkspaceDesktopLayout or WorkspaceMobileLayout -> side-panel composables/components`

Current ownership problems:

- `pages/workspace.vue` owns a JS viewport decision with `matchMedia('(min-width: 640px)')`.
- `WorkspaceDesktopLayout.vue` also owns visibility with `hidden md:flex`; Tailwind `md` is `768px`.
- `WorkspaceMobileLayout.vue` also owns visibility with `md:hidden` and is only mounted below the route's `640px` threshold.
- `layouts/default.vue` independently owns app-shell mobile/desktop behavior at Tailwind `md`.
- `useRightPanel.ts` owns right-panel width clamping but only guarantees a `200px` center, and never changes presentation mode.
- `useLeftPanel.ts` owns user visibility/width but does not distinguish user preference from responsive effective presentation.
- `/mobile` is a separate mature phone/PWA route (`pages/mobile.vue` -> `MobileRemoteAccessShell`) and is not the same owner as `WorkspaceMobileLayout`.

Live evidence:

- `700x700` and `760x700`: blank workspace body because `pages/workspace.vue` mounts desktop branch (`>=640`) while `WorkspaceDesktopLayout` is CSS-hidden (`<768`), and the mobile branch is not mounted.
- `800x700`: left `320px`, center `200px`, right `273px`; unusably cramped.
- `1024x768`: left `320px`, center `247px`, right `450px`; still cramped.
- `<640`: legacy mobile tabs appear but do not expose the standard right-tool capability set.
- Comprehensive probe report: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md` records a 17-viewport `/workspace` matrix plus `/mobile` boundary check. It confirms the first probed no-flag wide desktop state is around `1180x800`, while `640-767px`, `<640px`, `768-1024px`, and `<=480px` height remain problematic under different failure modes.

The target design must preserve the wide desktop layout while making `/workspace` adaptive in constrained windows and preserving `/mobile` as the true phone/PWA owner.

### Workspace shell design-impact finding

The current branch adds a second navigation hierarchy. `WorkspaceAdaptiveLayout.vue` renders `WorkspacePrimarySurfaceControls` when either the workspace is constrained or `shellResponsiveState.leftPanelPresentation !== 'docked'`. The latter condition is true not only for necessary responsive adaptation but also after a user manually collapses the left panel on a wide window. The result is a generic `Work / Runs / Files / Tools` row above the center while `RightSideTabs` remains visible on the right.

The `Work` handler only closes overlays, `Runs` opens `AppLeftPanel`, and `Files`/`Tools` open `WorkspaceRightToolDrawer`. Those handlers expose implementation wiring rather than a coherent user mental model. The target therefore removes the generic row from wide/manual-collapse states, keeps left navigation/history as the selection/run owner, gives narrow states explicit semantic drawer triggers, and replaces the center-only placeholder with actionable empty-state controls. See `workspace-responsive-ui-ux-spec.md` and the live evidence in investigation notes.

The current implementation has a parallel right-surface defect. `WorkspaceAdaptiveLayout.vue` renders `RightSidebarStrip` when the effective right presentation is `strip`, but independently computes `showToolsTrigger` as `rightPanel.presentation !== 'docked'`. A user-collapsed right panel therefore renders both the visible right strip and a top `Tools` button. The strip already is the direct reopen affordance in the personal-branch layout, so this is a local implementation violation of the one-owned-right-surface invariant, not a reason to add another navigation model. The authoritative state must expose or deterministically derive `showRightToolsTrigger = (rightPanel.presentation === 'drawer')`; the strip state must produce `false`.

The app-shell policy has a second design defect: `APP_SHELL_DOCKED_MIN_WIDTH_PX = 1280` currently turns the left panel into a strip for every default-visible viewport below that number. This is too broad for the primary selection surface. The target policy must be capacity- and priority-driven: keep the left panel docked while left navigation plus a practical center fit, move right tools to strip/drawer first, and only then move left navigation to strip/drawer. Manual collapse and automatic responsive presentation remain separate state concepts.

## Authoritative Composed Responsive-Policy Contract

Architecture decision: use **one composed policy boundary**. There must be one pure resolver, `resolveResponsiveWorkspaceShellState`, and one Vue adapter, `useResponsiveWorkspaceShell`, that combine viewport capacity, both panel preferences, and the surface-priority rules. `layouts/default.vue` owns the adapter invocation and provides the resulting state to `WorkspaceAdaptiveLayout`; the workspace layout consumes that state and must not independently resolve a second right-panel policy.

### Policy input

```ts
type PanelPreference = 'visible' | 'hidden-by-user'

interface ResponsiveWorkspaceShellInput {
  viewportWidth: number | null | undefined
  viewportHeight: number | null | undefined
  leftPanelPreference: PanelPreference
  leftPanelPreferredWidth: number | null | undefined
  rightPanelPreference: PanelPreference
  rightPanelPreferredWidth: number | null | undefined
}
```

The adapter obtains `viewportWidth`/`viewportHeight` from the existing SSR-safe `useResponsiveElementRect()` window measurement and obtains the two preferences/widths from `useLeftPanel()` and `useRightPanel()`. No component passes a separately measured “workspace width” to a second resolver. The standard layout root occupies the viewport; the policy computes the center capacity after applying effective side presentations.

### Policy constants and fit formula

The following constants remain centralized in `responsiveLayoutPolicy.ts`:

```text
LEFT_PANEL_DEFAULT_WIDTH = 320
LEFT_PANEL_MIN_WIDTH = 260
LEFT_PANEL_MAX_WIDTH = 520
RIGHT_PANEL_DEFAULT_WIDTH = 450
RIGHT_PANEL_MIN_WIDTH = 400
LEFT_STRIP_WIDTH = 50
RIGHT_STRIP_WIDTH = 50
LEFT_RESIZE_HANDLE_WIDTH = 6
RIGHT_RESIZE_HANDLE_WIDTH = 4
CENTER_MIN_WIDTH = 480
NARROW_WIDTH = 768
SHORT_HEIGHT = 480
```

Preferred dock widths are sanitized/clamped to their panel bounds. For a candidate presentation, the resolver computes:

```text
requiredWidth(left, right) =
  leftConsumedWidth(left)
  + rightConsumedWidth(right)
  + centerMinWidth
  + leftResizeHandleIfDocked(left)
  + rightResizeHandleIfDocked(right)

fits(left, right) = viewportWidth >= requiredWidth(left, right)
```

`leftConsumedWidth` is the preferred left width for `docked`, the 50px strip width for `strip`, and zero for `drawer`. `rightConsumedWidth` is the preferred right width for `docked`, 50px for `strip`, and zero for `drawer`. A drawer does not consume horizontal center capacity. The result is a feasibility decision, not a promise that every tool's internal content is 480px wide.

### Resolver phase order

The resolver applies these phases in this exact order:

1. **Normalize preferences and dimensions.** `hidden-by-user` is preserved as preference data; it is never rewritten by the policy.
2. **Narrow precedence.** If `viewportWidth < NARROW_WIDTH`, use header + left drawer + right tools drawer. No panel is auto-docked, and no generic surface-control row is rendered. The user preference still determines whether the drawer is initially open/closed, not whether the capability exists.
3. **Manual-left precedence for desktop widths.** If the left preference is `hidden-by-user`, expose the left strip with `presentationSource: 'user'`. Do not reinterpret it as an automatic responsive collapse and do not show a generic surface bar.
4. **Short-height right-tools yield.** For non-narrow `viewportHeight <= SHORT_HEIGHT`, prefer a right drawer (or the user's right strip if the right preference is hidden) before changing the left presentation. Keep the left panel docked if `fits(leftDocked, rightDrawer)`; otherwise continue to the horizontal fit phases.
5. **Try the canonical wide split.** With a visible left preference and right visible preference, use `left=docked, right=docked` when `fits(leftDocked, rightDocked)`.
6. **Yield right tools first.** If the canonical split does not fit, try `left=docked, right=drawer`, then `left=docked, right=strip`. If either fits, keep the left panel docked and classify the result as `large-constrained`.
7. **Only then adapt the left surface.** If left docked plus the right alternatives do not fit, use `left=strip` or `left=drawer` with `presentationSource: 'responsive'`, then choose right docked only if it fits; otherwise choose right drawer/strip according to available width and height. This is the first phase that may automatically remove the full left selection panel.
8. **Return explicit effective state.** Include mode, effective left/right presentations, preference values, presentation sources (`user` or `responsive`), consumed widths, center minimum, header/strip/drawer affordance flags, and `showGenericSurfaceControls: false`.

### Output state

```ts
type ResponsivePresentation = 'docked' | 'strip' | 'drawer'
type PresentationSource = 'user' | 'responsive'
type WorkspaceResponsiveMode = 'wide' | 'large-constrained' | 'constrained' | 'narrow' | 'short-height'

interface ResponsiveSurfaceState {
  preference: PanelPreference
  presentation: ResponsivePresentation
  presentationSource: PresentationSource
  consumedWidth: number
  preferredWidth: number
}

interface ResponsiveWorkspaceShellState {
  viewportWidth: number
  viewportHeight: number
  mode: WorkspaceResponsiveMode
  isNarrow: boolean
  isShortHeight: boolean
  centerMinWidth: number
  showHeader: boolean
  showGenericSurfaceControls: false
  showRightToolsTrigger: boolean
  leftPanel: ResponsiveSurfaceState
  rightPanel: ResponsiveSurfaceState
  canOpenLeftDrawer: boolean
  canOpenRightDrawer: boolean
  showLeftStrip: boolean
  showRightStrip: boolean
}
```

`showRightToolsTrigger` is an affordance decision, not a synonym for “right panel is not docked.” Its required truth table is:

| Effective right presentation | Visible right strip | `showRightToolsTrigger` | Reopen owner |
|---|---:|---:|---|
| `docked` | No | `false` | Existing fixed panel toggle |
| `strip` | Yes | `false` | Right strip; clicking a tool opens the right drawer |
| `drawer` | No | `true` | One semantic `Tools`/`Open tools` trigger |

The implementation may keep this as a pure policy output or use the exact equivalent derived expression in the consuming layout, but it must not use `presentation !== 'docked'`, because that conflates strip and drawer states. The corresponding browser/component invariant is “never render a right strip and a top Tools trigger together.”

`hidden-by-user` is a preference value, not an automatic presentation. A user-collapsed desktop left panel therefore has `leftPanel.preference = 'hidden-by-user'`, `leftPanel.presentation = 'strip'`, and `presentationSource = 'user'`. An automatically adapted left panel has `preference = 'visible'`, `presentation = 'strip'` or `drawer`, and `presentationSource = 'responsive'`. This distinction must remain observable in tests and must not be lost in `layouts/default.vue`.

### Composable and dependency map

| Boundary | Responsibility | Inputs | Consumers | Forbidden behavior |
|---|---|---|---|---|
| `resolveResponsiveWorkspaceShellState` | Pure capacity/priority resolver | One composed input above | Policy tests and `useResponsiveWorkspaceShell` | No DOM, no component-specific breakpoint, no blanket `<1280px` left collapse |
| `useResponsiveWorkspaceShell` | One SSR-safe viewport observer plus preference composition | `useLeftPanel`, `useRightPanel`, `useResponsiveElementRect()` | `layouts/default.vue` provider | Must not create separate shell/workspace policy branches |
| `layouts/default.vue` | Render left/header surfaces and provide state | Resolved composed state | AppLeftPanel, LeftSidebarStrip, slot | Must not resolve a second policy or infer strip from raw viewport |
| `WorkspaceAdaptiveLayout.vue` | Render center/right surfaces from provided state | Resolved composed state, active tab/drawer state | RightSideTabs, right strip/drawer, center views | Must not call an independent `resolveWorkspaceResponsiveState` |
| `useLeftPanel` / `useRightPanel` | Store user preference and preferred width | User actions | Composed adapter and panel controls | Must not mutate preference when the resolver changes presentation |

`useWorkspaceResponsiveLayout.ts` and `useAppShellResponsiveLayout.ts` are removed or reduced to non-resolving consumers during implementation; they must not remain as independent policy owners.

### Required policy boundary scenarios

Pure policy tests must cover at least:

| Scenario | Input shape | Required result |
|---|---|---|
| Wide default | Large width/height, both preferences visible | Left docked, right docked, no generic controls |
| Large-but-constrained | Enough for left + center, not left + center + right dock | Left docked, right drawer/strip, source responsive |
| Constrained | Not enough for left + center even after right yield | Left strip/drawer, right strip/drawer, center minimum preserved |
| Manual left collapse | Wide width, left preference hidden-by-user | Left strip, source user; right/center hierarchy unchanged |
| Narrow | Width below 768, any panel preferences | Header + left drawer + right drawer; no generic controls |
| Short-height | Height <=480, width >=768 | Right tools yield to drawer/strip before left; left remains docked if horizontal fit permits |
| Repeated resize | Same preferences across wide -> constrained -> wide | Effective modes change, preferences remain unchanged, wide returns to prior preference |

Right-tool presentation coverage must additionally assert the affordance truth table: docked has no semantic top trigger, strip has a visible strip and no top trigger, and drawer-only has one semantic top trigger and no strip.

## Intended Change

Replace binary desktop/mobile switching on standard `/workspace` with an adaptive desktop-capability workspace shell governed by one responsive policy owner.

High-level target:

- `/workspace` always renders one standard adaptive workspace layout owner.
- The adaptive layout chooses docked, strip, drawer, or sheet presentations for left and right surfaces based on measured space.
- The center workspace surface remains usable before side panels consume the available width.
- The old `WorkspaceMobileLayout` branch is removed/decommissioned from `/workspace`; true phone remote access remains `/mobile`.
- Button/control order is owned by the adaptive workspace design, not by whichever legacy component happens to render at a breakpoint.
- The wide workspace hierarchy is preserved: the left surface owns selection/history, the center is the Work surface, and the right surface owns Files/tools. A generic `Work / Runs / Files / Tools` row is not rendered as a universal replacement or alongside those surfaces.
- The empty center state exposes direct selection and run/history actions; it does not make the user infer that `Work` or an ambiguous `Runs` button opens the left selection surface.
- Responsive rules and control ordering are testable through pure policy/catalog functions and component/browser probes.
- Right-tool reopen ownership is singular: the strip opens the drawer in strip state, while a semantic `Tools` trigger exists only in drawer-only state; no top trigger is added merely because the right panel is not docked.
- The comprehensive responsive probe matrix becomes an implementation validation target, not only an investigation artifact.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Responsive Layout Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: See investigation notes. The blank band is caused by mismatched `640px` JS policy and `768px` CSS policy. Constrained desktop panes are caused by side-panel policies that lack adaptive presentation. The legacy mobile fallback is not the authoritative `/mobile` shell and loses standard workspace tools.
- Design response: Introduce a shared responsive policy owner, convert `/workspace` to one adaptive standard workspace layout, extend side-panel effective presentation, and remove the legacy route-mobile branch.
- Design response: Introduce a shared responsive policy owner, convert `/workspace` to one adaptive standard workspace layout, extend side-panel effective presentation, remove the legacy route-mobile branch, and make side-surface adaptation measured and priority-driven so the left selection/workspace panel is preserved longer than the right tools.
- Refactor rationale: A local breakpoint change would only hide the blank defect while preserving poor mobile fallback and cramped narrow desktop. The requested UX problem is a boundary/coordination defect across route, layout, and panel owners.
- Intentional deferrals and residual risk, if any: Individual internal tool-panel redesign is deferred unless shell-level reachability exposes a blocker. This task must make tool panels reachable and the workspace shell usable; deep Terminal/Browser/VNC internal responsive redesign can be a follow-up if discovered by downstream coverage.

## Terminology

- `Standard workspace`: `/workspace`, the desktop-capability web/electron workspace surface.
- `Phone/PWA mobile`: `/mobile`, the remote-access mobile shell.
- `Wide`: enough measured space to dock app left panel, workspace center, and right tools.
- `Constrained`: enough space for the standard route, but not enough for every side surface to stay docked.
- `Narrow`: very small standard route viewport where drawers/sheets may be required, but the standard workspace capability set must remain reachable.
- `Docked surface`: side panel consumes layout width.
- `Strip surface`: compact icon/navigation rail consumes minimal width.
- `Drawer/sheet surface`: overlay/transient surface that does not permanently consume center width.
- `Surface control order`: the canonical order in which workspace surfaces/tools are presented when there is not enough room for all docked panels.
- `Responsive validation matrix`: the durable browser/component viewport family used to catch blank bands, legacy fallback, cramped panes, short-height behavior, tool ordering/reachability, wide desktop non-regression, and `/mobile` isolation.

## Design Reading Order

1. data-flow spine
2. responsive policy ownership
3. responsive control hierarchy and button ordering
4. shell/workspace surface allocation
5. file responsibilities and removals
6. migration/refactor sequence and coverage guidance

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission `WorkspaceMobileLayout` and `useMobilePanels` from standard `/workspace`; keep `/mobile` route as the only phone/PWA mobile owner.
- Treat removal as first-class design work: do not keep `/workspace` with both an adaptive standard layout and the old mobile fallback behind another breakpoint.
- Decision rule: the design is invalid if standard `/workspace` still depends on route-level dual desktop/mobile branches that can drift again.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Browser viewport/container size | Usable standard workspace surfaces | Standard workspace responsive policy | Governs the product behavior under resize. |
| DS-002 | Primary End-to-End | User opens `/workspace` | Center workspace and tool surfaces rendered | Workspace adaptive layout | Replaces route-level mobile/desktop branching. |
| DS-003 | Return-Event | ResizeObserver/window resize | Updated app shell/workspace presentation | Responsive policy composables | Prevents stale or conflicting presentation after resize. |
| DS-004 | Bounded Local | User toggles/resizes left/right panels | User preference plus responsive effective mode | Left/right panel composables | Keeps user intent separate from auto-collapse decisions. |
| DS-005 | Primary End-to-End | User opens `/mobile` | MobileRemoteAccessShell | Mobile remote-access route | Boundary that must remain separate and unaffected. |

## Primary Execution Spine(s)

- DS-001/DS-002: `Browser viewport/container -> Responsive policy owner -> App shell presentation -> Workspace adaptive layout -> Center workspace + reachable side tools`
- DS-005: `Browser route /mobile -> pages/mobile.vue -> MobileRemoteAccessShell -> Phone/PWA features`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A viewport or container size is measured, normalized into responsive state, and consumed by the app shell and workspace layout to select docked/strip/drawer presentations. | Viewport/container, responsive policy, shell presentation, workspace presentation | Responsive policy owner | ResizeObserver setup, threshold constants, user preference preservation |
| DS-002 | `/workspace` mounts one adaptive standard workspace layout. That layout keeps the center surface primary and decides how side surfaces are presented without losing standard tool access. | Route, adaptive layout, center workspace, side surfaces | Workspace adaptive layout | RightSideTabs reuse, left panel strip/drawer, panel width persistence |
| DS-003 | Resize events update measured dimensions and recompute effective presentation without duplicating breakpoints in CSS and JS. | Resize event, measurement composable, policy function, presentation state | Responsive policy composables | SSR safety, listener cleanup |
| DS-004 | User toggles/resizes panels update preferences; responsive policy computes effective presentation separately so constrained widths can auto-collapse without destroying wide-desktop preference. | User action, panel preference, responsive effective mode | Panel composables | Local storage/persistence if added, drag bounds |
| DS-005 | `/mobile` bypasses the standard app shell and renders the existing mobile remote-access shell. | Mobile route, MobileRemoteAccessShell | Mobile route | Mobile feature gates, pairing/session auth |

## Spine Actors / Main-Line Nodes

- Browser viewport/container measurement
- Responsive policy owner
- App shell presentation
- Workspace adaptive layout
- Center workspace surface
- Left navigation/history surface
- Right tools surface
- `/mobile` route boundary

## Ownership Map

- Responsive policy owner: owns threshold constants, pure decision functions, and invariant that no viewport band can produce no visible workspace layout.
- App shell presentation: owns whether left navigation/history is docked, strip, or overlay/drawer; must not decide workspace center/right tool layout.
- Workspace adaptive layout: owns center/right workspace split, constrained/narrow tool presentation, and reuse of center workspace content.
- Left panel composable: owns user preference for left panel visibility/width; the composed responsive adapter owns effective presentation and source without overwriting preference.
- Right panel composable: owns user preference for right panel visibility/width; the composed responsive adapter owns effective docked/strip/drawer presentation and source without overwriting preference.
- `/mobile` route: owns phone/PWA mobile experience; not a fallback internal to standard `/workspace`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/workspace.vue` | Workspace adaptive layout + responsive policy | Route entry and setup effects (`useWorkspaceRouteSelection`, settings fetch) | Breakpoint policy or choosing legacy mobile fallback |
| `pages/mobile.vue` | `MobileRemoteAccessShell` | Phone/PWA route entry | Standard workspace responsive behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `pages/workspace.vue` import/use of `WorkspaceMobileLayout` | Standard `/workspace` should have one adaptive owner; legacy branch causes capability loss and breakpoint drift. | `WorkspaceAdaptiveLayout.vue` + responsive policy | In This Change | Keep route setup effects. |
| `components/layout/WorkspaceMobileLayout.vue` | Only standard-route legacy fallback; not true `/mobile` owner. | Adaptive layout narrow presentation plus existing `/mobile` route for phone/PWA | In This Change if no other imports | Confirm with `rg WorkspaceMobileLayout`. |
| `composables/useMobilePanels.ts` | Supports only removed legacy layout and adds another `window.innerWidth < 768` policy. | Adaptive layout state/right/left panel composables | In This Change if no other imports | Remove tests/keys if unused. |
| Duplicate `hidden md:flex` / `md:hidden` visibility ownership inside workspace layout branch | Causes mismatch with JS policy. | Single adaptive layout root and pure policy | In This Change | CSS can style modes but must not independently choose route layout. |
| Stale `NUXT_PUBLIC_*` frontend startup docs | Current Nuxt config uses `BACKEND_*`; stale docs impede live setup. | Updated developer docs | Follow-up in delivery/docs sync unless implementation touches README | Record docs impact. |

## Return Or Event Spine(s) (If Applicable)

- `window resize / element ResizeObserver -> measured dimensions -> pure responsive policy -> effective shell/workspace presentation -> Vue render update`
- `panel toggle/drag -> user preference state -> responsive policy recomputes effective presentation -> docked/strip/drawer UI updates`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useRightPanel`
  - `drag start -> preferred width update -> clamp against policy maximum -> effective presentation stays docked only if center remains usable`
  - Matters because width drag should not create unusable center or fight auto-collapse.
- Parent owner: `useLeftPanel`
  - `toggle/collapse action -> user preference -> responsive effective mode -> docked/strip/overlay presentation`
  - Matters because constrained auto-collapse must not permanently erase the user's wide desktop choice.
- Parent owner: responsive measurement composable
  - `mount -> observe element/window -> update dimensions -> cleanup on unmount`
  - Matters for SSR safety and avoiding stale listeners.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Threshold constants | DS-001, DS-003 | Responsive policy owner | Define `md`, constrained, wide, center-minimum, short-height thresholds once. | Prevents `640` vs `768` drift. | Breakpoint drift and blank bands return. |
| ResizeObserver lifecycle | DS-003 | Policy composables | Measure container/viewport safely and clean up. | Needed for container-aware layout in embedded panes. | Components duplicate listeners and policies. |
| User panel preferences | DS-004 | Left/right panel composables | Preserve manual visible/width choices separate from effective responsive mode. | Avoid surprising permanent state changes. | Responsive auto-collapse overwrites user settings. |
| Tool content reuse | DS-002 | Workspace adaptive layout | Reuse `RightSideTabs`/tool panels in docked and drawer presentations. | Avoid duplicate tool UIs. | New narrow UI drifts from desktop tools. |
| Mobile route isolation | DS-005 | `/mobile` route | Keep phone/PWA shell independent. | Protects existing mobile remote-access product. | Standard responsive work regresses phone flow. |

## Responsive Control Hierarchy / Button Ordering

### Right-Tool Tab Header Design Impact

The current CR-003 Local Fix is not the target design. It enables a wrapped right-tool header, which produces a multi-row presentation. The user-confirmed design preserves the original single-row header and solves the expanded catalog through horizontal scrolling.

Required target behavior:

- RightSideTabs renders one horizontal tab row in both docked and drawer modes.
- The row preserves the existing spacing, typography, compact density, active underline, and fixed panel-toggle affordance.
- TabList provides a real horizontal overflow container and does not use a right-tool-specific wrapping mode.
- Horizontal scrolling works through native mouse, touchpad, touch, and keyboard interactions.
- A conditional edge fade and small directional chevron reveal undisclosed tabs without visually crowding the header. The affordance changes direction as the user scrolls and disappears at the relevant boundary.
- Selecting or focusing an offscreen tab automatically scrolls it into view.
- An optional More menu can offer secondary direct selection but cannot replace the visible scrollable row.
- The right-tool catalog remains the sole authority for order; scrolling must not reorder a tab or remove its reachable path.

The initial visible bounds are not a correctness boundary. Validation must prove scrollability, discoverability, active/focused-tab reachability, panel-toggle stability, and canonical order. It must not require every available tab to fit before the user scrolls.

The current integrated catalog order remains Files -> Team when applicable -> Terminal -> Activity -> Usage/Token when available -> Artifacts -> Browser when available -> VNC Viewer. Scrolling changes only the visible window into this sequence, never the sequence itself.

Ownership for this behavior is intentionally narrow:

- RightSideTabs owns presentation configuration, active-tab context, fixed panel-toggle placement, and tool content.
- TabList owns the single-row scroll container, scroll metrics, overflow affordances, and active/focused-tab auto-scroll.
- Tab owns visual tab styling and focus treatment, but not container overflow or catalog order.
- The workspace surface-order catalog remains the only source of tool order.

The standard workspace does not use a generic top-level surface row as its primary navigation. Surface ownership is the contract:

1. **Left navigation/history** owns Agents, Agent Teams, workspaces, existing run history, and run/config selection/creation entrypoints.
2. **Center** owns the current Work surface: agent conversation, team focus/grid/spotlight, selected run config, or the structured empty state.
3. **Right tools** owns Files and the contextual tool catalog below.

The legacy standard-route mobile order (`Running`, optional `Files`, optional `Content`, `Agent`) is not reused. The earlier `Work / Runs / Files / Tools` row is also not rendered in wide or manual-left-collapse states because it duplicates these owners. If narrow space requires compact controls, use explicit semantic triggers (`Agents & teams`, `Open navigation`, `Tools`) tied to the drawer/strip they open.

Canonical right-tool order, reused in docked tabs, constrained strips, and narrow drawers/sheets:

1. `Files` where this presentation includes files; otherwise files stay as the top-level `Files` surface.
2. `Team` only when a team context is selected and team overview is available.
3. `Terminal`
4. `Activity` / progress
5. `Artifacts`
6. `Browser` when available
7. `VNC Viewer`

Center header/action order:

- Left side: current agent/team/member identity, avatar/initials, status.
- Right side, wide mode: copy/export where applicable, new/duplicate run action, edit/view config, then overflow/secondary actions.
- Right side, constrained/narrow mode: preserve identity/status and the primary action first; move lower-priority actions into an overflow menu rather than wrapping controls into a misleading order.
- Team mode switch order remains `Focus`, `Grid`, `Spotlight`; under constrained width it may scroll/collapse, but the order must not change.

Concrete target and avoided shapes:

- Avoid: full-screen `Work / Runs / Files / Tools` above the original right tabs after the user collapses the left panel.
- Avoid: an empty center with only `Select or run an agent/team to begin` and no action.
- Avoid: `Runs` as an unlabeled proxy for the Agents/Agent Teams selection surface.
- Use: wide left panel + center + right tabs; after manual collapse use the left strip + same center + same right tabs.
- Use: narrow center empty state with `Choose an agent or team` and `Open runs/history` actions, plus explicit navigation and Tools drawer triggers.

## Comprehensive Test-Derived UI Mode Plan

The implementation should derive actual modes from measured container space and center-width preservation, not from a single hardcoded viewport label. The following mode plan is the product target implied by the live tests:

| Mode | Trigger Shape | Target Presentation | Current Failure It Replaces |
| --- | --- | --- | --- |
| Wide / full docked | Enough measured width for left panel + practical center + right tools; current no-flag probe starts around `1180x800` | Preserve current good desktop: left docked, center primary, right tools docked; no generic surface bar. | None; preserve non-regression. |
| Wide / user-collapsed | User explicitly collapses left panel while the wide split still fits | Left becomes the existing strip; center and right tabs remain in the same hierarchy; no generic surface bar. | New current regression where left non-docked state triggers `Work / Runs / Files / Tools`. |
| Large-but-constrained desktop | Full three-pane split no longer fits, but left panel + practical center still fit | Keep left docked; right tools yield to strip/drawer first; center remains first-class. | Broad `<1280px` left auto-collapse removes the selection surface too early. |
| Constrained desktop/tablet | Left panel plus practical center no longer fit, especially around `768-1024px` | Left becomes strip or explicit navigation drawer; right tools become docked strip/drawer/sheet as space permits; center remains first-class. | `320px` left + `200-247px` center + cramped right panel. |
| Narrow standard workspace | Below `md` or any container too narrow for docked split | Single-column standard workspace with explicit navigation/selection and Tools drawer triggers; empty state supplies agent/team and run/history actions; tools use canonical order. | Legacy `WorkspaceMobileLayout` `Running/Agent` model, blank `640-767px` band, and ambiguous four-surface row. |
| Short-height | Height around `<=480px` or content area too short for full docked panes | Prefer compact/overlay side surfaces; keep primary controls recoverable by scroll/drawer/overflow. | Full-height docked left/right panes clipping useful controls. |
| Phone/PWA route | Explicit `/mobile` route | Existing `MobileRemoteAccessShell`. | No change; avoid using `/mobile` components as `/workspace` fallback. |

Mode invariants:

- Center is the primary workspace surface; side surfaces must yield first.
- Surface priority is asymmetric: left navigation/selection yields after right tools, not at the same broad breakpoint.
- The left surface is the selection/run owner and the right surface is the Files/tools owner; the center is not represented as a redundant `Work` button.
- A user-collapsed wide panel is not equivalent to a narrow responsive state; it must preserve the original hierarchy.
- Effective responsive presentation must not overwrite stored user preference.
- The standard `/workspace` narrow mode remains desktop-capability; it is not the phone/PWA `/mobile` shell and not the legacy fallback.
- Control/tool ordering is shared by all modes through the catalog, so resizing does not reorder the user's mental model.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Right tool content | `RightSideTabs`, `RightSidebarStrip`, tool panel components | Reuse/Extend | These already own tool tab rendering and content. | N/A |
| Left navigation/history content | `AppLeftPanel`, `LeftSidebarStrip`, `WorkspaceAgentRunsTreePanel` | Reuse/Extend | Existing app shell content remains correct; presentation needs adaptation. | N/A |
| Phone/PWA mobile | `/mobile`, `components/mobile/*` | Reuse/Preserve | Mature owner for true mobile remote access. | N/A |
| Responsive decision policy | None central today | Create New | Existing decisions are fragmented across route, CSS, and composables. | A new pure owner is needed to prevent drift. |
| Surface ownership/order | `useRightSideTabs` owns right tab order; shell owns left navigation/history | Extend existing owners; no generic top-level bar | The adaptive layout needs stable left/center/right ownership and canonical right-tool order across docked/strip/drawer modes. | Existing order is partial and the legacy mobile order is ambiguous. |
| Element measurement | Browser `ResizeObserver` patterns inside existing components | Create small reusable composable or local owner | Current measurement exists only inside `WorkspaceDesktopLayout`; app shell also needs it. | Pure helper prevents copy/paste listeners. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App shell layout | Left panel/header/strip/overlay effective presentation | DS-001, DS-003, DS-004 | App shell presentation | Extend | Modify `layouts/default.vue` and `useLeftPanel`. |
| Standard workspace layout | Center + right tools adaptive presentation | DS-001, DS-002, DS-003, DS-004 | Workspace adaptive layout | Extend/Rename | Rename `WorkspaceDesktopLayout` to adaptive or clearly refactor responsibility. |
| Responsive policy | Pure mode decisions and thresholds | DS-001, DS-003 | App shell and workspace layout | Create New | Keep framework-independent for unit tests. |
| Workspace surface navigation | Surface ownership and right-tool order; explicit drawer/strip triggers where needed | DS-001, DS-002 | App shell + workspace adaptive layout | Extend existing shell/right-tab owners | Prevents navigation ownership from being duplicated per layout. |
| Mobile remote access | Phone/PWA shell | DS-005 | `/mobile` route | Reuse/Preserve | No standard workspace dependency. |
| Developer docs | Local setup instructions | N/A | Delivery/docs sync | Extend | Update env var names. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Pure responsive policy owner | Constants and pure functions for app shell/workspace modes from viewport/container dimensions. | One central place prevents breakpoint drift. | N/A |
| `composables/layout/useResponsiveElementRect.ts` | Responsive policy | Measurement helper | SSR-safe `ResizeObserver` wrapper returning element rect. | Shared by app shell/workspace without policy decisions. | N/A |
| `composables/layout/useResponsiveWorkspaceShell.ts` | Responsive policy | Composed responsive adapter | Observes viewport once, combines left/right preferences, calls the single composed resolver, and provides effective state to shell/workspace renderers. | Eliminates independent shell/workspace policy branches. | Uses policy types and panel preference owners. |
| `utils/layout/workspaceSurfaceOrder.ts` or equivalent catalog | Workspace surface navigation | Surface ownership/order owner | Defines canonical right-tool order and semantic trigger availability; does not require a generic top-level surface row. | Makes tool ownership/order testable without duplicating left/right navigation. | Uses policy/surface types. |
| `components/layout/WorkspaceAdaptiveLayout.vue` | Standard workspace layout | Adaptive workspace layout owner | Renders center, right tools, right strip/drawer/sheet, loading overlay, explicit narrow tool triggers, and empty-state actions using policy. | Current `WorkspaceDesktopLayout` responsibility expands beyond desktop without adding duplicate navigation. | Uses existing center/tool components. |
| `pages/workspace.vue` | Route entry | Thin route facade | Mount adaptive layout and route setup effects only. | Removes breakpoint ownership from route. | N/A |
| `composables/useRightPanel.ts` | Standard workspace layout | Right panel preference owner | Store user visible/preferred width and combine with responsive effective presentation. | Existing global state owner for right panel. | Uses policy types. |
| `composables/useLeftPanel.ts` | App shell layout | Left panel preference owner | Store user visible/preferred width and combine with shell effective presentation. | Existing global state owner for left panel. | Uses policy types. |

## Right-Tool Tab Presentation File Responsibilities

| File / Boundary | Responsibility | Must Not Do |
| --- | --- | --- |
| RightSideTabs.vue | Configure the single-row right-tool header, preserve the fixed panel-toggle affordance, pass active context, and render tool content. | Wrap rows, duplicate catalog order, or require initial tab fit. |
| TabList.vue | Own the horizontal scroll container, scroll metrics, edge fades/chevrons, keyboard/touch reachability, and active/focused-tab auto-scroll. | Decide right-tool order, panel visibility, or tool content. |
| Tab.vue | Preserve spacing, typography, active underline, hover, and focus styling. | Calculate overflow or own scroll affordance state. |
| workspaceSurfaceOrder.ts / useRightSideTabs | Provide canonical tool order and availability. | Change order by presentation mode or scroll position. |
| workspace-responsive-probe.mjs | Assert one-row rendering, scrollability, affordance transitions, active-tab reachability, and order. | Require every tab to fit in initial visible bounds. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Breakpoint/mode decisions | `utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Used by route/layout tests, app shell, and workspace layout. | Yes | Yes | A component-specific helper that reintroduces duplicate breakpoints. |
| Element measurement | `composables/layout/useResponsiveElementRect.ts` | Responsive policy | App shell and workspace both need measured dimensions. | Yes | Yes | A policy owner; it should only measure. |
| Panel presentation mode types | `utils/layout/responsiveLayoutPolicy.ts` or local exported types | Responsive policy | Left/right composables and components need consistent names. | Yes | Yes | Generic catch-all UI state unrelated to responsive layout. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ResponsiveWorkspaceShellState` | Yes | Yes | Low | One composed state includes mode, left/right effective presentations, presentation source, center minimum, and drawer/strip affordances; do not duplicate shell/workspace states. |
| `PanelPreference` plus `ResponsiveSurfaceState` | Yes | Yes | Low | Preserve `hidden-by-user` preference separately from automatic `strip`/`drawer` presentation and source. |
| `PanelPresentation` union | Yes | Yes | Low | Use explicit variants such as `docked`, `strip`, `drawer`, `hidden-by-user`; avoid ambiguous `mobile`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Pure policy owner | Threshold constants and functions resolving shell/workspace presentation. | Centralizes policy and enables focused tests. | N/A |
| `autobyteus-web/utils/layout/workspaceSurfaceOrder.ts` or equivalent | Workspace surface navigation | Surface ownership/order owner | Canonical right-tool order and semantic trigger availability; no universal top-level surface row. | Prevents legacy/ad hoc duplicate navigation. | Policy/surface types. |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Responsive policy | Policy coverage | Boundary tests around `639`, `640`, `767`, `768`, `800`, `1024`, wide desktop, and short height. | Keeps acceptance-critical math durable. | N/A |
| `autobyteus-web/utils/layout/__tests__/workspaceSurfaceOrder.spec.ts` or equivalent | Workspace surface navigation | Order/ownership coverage | Verifies left/center/right ownership, semantic trigger labels, and canonical tool ordering including contextual Team item. | Makes navigation ownership durable without requiring a duplicate surface bar. | N/A |
| `autobyteus-web/composables/layout/useResponsiveElementRect.ts` | Responsive policy | Measurement helper | SSR-safe element measurement and cleanup. | Shared but non-policy. | N/A |
| `autobyteus-web/composables/layout/useResponsiveWorkspaceShell.ts` | Responsive policy | Composed responsive adapter | Provides the one resolved shell/workspace state to `layouts/default.vue` and `WorkspaceAdaptiveLayout.vue`. | Keeps both renderers declarative without separate capacity calculations. | Uses policy state. |
| `autobyteus-web/layouts/default.vue` | App shell layout | Shell renderer | Render header/left panel/strip/overlay according to effective shell presentation. | Existing shell owner remains. | Uses app shell adapter. |
| `autobyteus-web/composables/useLeftPanel.ts` | App shell layout | Left preference owner | Preserve user left-panel visibility/width; expose preference actions separate from effective policy. | Existing state owner remains. | Uses policy presentation types. |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | Standard workspace layout | Standard workspace layout owner | Render center and right tools across wide/constrained/narrow modes. | Name matches expanded responsibility. | Uses workspace adapter, right panel. |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Standard workspace layout | Component coverage | Verify wide docked, constrained collapse/drawer, no blank root, and center shell presence. | Replaces/renames desktop layout tests. | N/A |
| `autobyteus-web/tests/e2e/workspace-responsive.spec.ts` or equivalent browser probe | Responsive validation | Browser-level coverage | Runs the comprehensive viewport family against `/workspace` and `/mobile`, recording traces/screenshots on failure. | Makes the live investigation matrix durable. | Uses policy/order expectations. |
| `autobyteus-web/composables/useRightPanel.ts` | Standard workspace layout | Right preference owner | Preserve user right-panel preference/width; expose effective docked/strip/drawer state. | Existing state owner remains. | Uses policy presentation types. |
| `autobyteus-web/pages/workspace.vue` | Route entry | Thin facade | Always mount adaptive standard layout; keep setup effects. | Removes route-level responsive branching. | N/A |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Legacy standard workspace mobile fallback | Removed/decommissioned | Delete if no imports remain. | Prevents policy drift. | N/A |
| `autobyteus-web/composables/useMobilePanels.ts` | Legacy fallback state | Removed/decommissioned | Delete if no imports remain. | Prevents duplicate window-width policy. | N/A |

## Ownership Boundaries

- `pages/workspace.vue` is a thin route facade. It may start data/setup effects but must not decide desktop/mobile layout.
- `utils/layout/responsiveLayoutPolicy.ts` is the authoritative source for responsive decisions. Components may consume the resolved state; they must not introduce competing hidden/mounted branch breakpoints.
- `layouts/default.vue` owns app shell presentation only. It must not decide right-tool layout or center workspace behavior.
- `WorkspaceAdaptiveLayout.vue` owns standard workspace center/right-tool presentation. It must not own phone/PWA behavior.
- `/mobile` owns phone/PWA behavior. Standard `/workspace` must not import `components/mobile/*` as its responsive fallback.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `responsiveLayoutPolicy.ts` | Threshold constants, fit formula, phase-ordered composed mode calculation | `useResponsiveWorkspaceShell`, policy tests | Components hard-code `640`, `768`, `1280`, or independent `md:hidden`/`hidden md:flex` branch visibility; shell/workspace resolve separate states | Add explicit composed state output or capacity input to this policy boundary. |
| `WorkspaceAdaptiveLayout.vue` | Center/right presentation, tool drawer/strip rendering | `pages/workspace.vue` | Route mounts separate desktop/mobile standard workspace components | Add props/state to adaptive layout. |
| `useRightPanel.ts` | Right panel preference and effective presentation | Right tool renderers | Components compute separate right-panel collapse from raw width | Expose effective presentation and actions. |
| `useLeftPanel.ts` / shell adapter | Left panel preference and effective presentation | `layouts/default.vue`, `LeftSidebarStrip`, `AppLeftPanel` | Shell CSS alone forces full docked left panel at all `md+` widths | Add explicit shell presentation state. |
| `/mobile` route | Phone/PWA shell and mobile feature gates | Mobile clients | `/workspace` uses `/mobile` components as fallback | Improve adaptive standard workspace instead. |

## Dependency Rules

Allowed:

- `pages/workspace.vue` -> `WorkspaceAdaptiveLayout.vue`
- `WorkspaceAdaptiveLayout.vue` -> injected `useResponsiveWorkspaceShell` state, `useRightPanel`, existing center/right components
- `layouts/default.vue` -> `useResponsiveWorkspaceShell`, `useLeftPanel`, `useRightPanel`, existing left panel/strip components
- Composables -> `utils/layout/responsiveLayoutPolicy.ts`
- Tests -> pure policy and layout components

Forbidden:

- `pages/workspace.vue` must not call `window.matchMedia` to choose standard workspace layout.
- `WorkspaceAdaptiveLayout.vue` and `layouts/default.vue` must not encode competing breakpoint constants or call separate shell/workspace resolvers outside the composed policy owner.
- Standard `/workspace` must not import `components/mobile/*` or `WorkspaceMobileLayout` as a compatibility fallback.
- Right/left panel components must not permanently mutate user preference merely because a responsive threshold was crossed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveResponsiveWorkspaceShellState(input)` | Composed shell/workspace presentation | Purely resolve left/center/right presentations from one measured viewport capacity and both panel preferences using the exact phase order above. | `ResponsiveWorkspaceShellInput` | No DOM access; no blanket `<1280px` collapse; preserves user-hidden versus responsive source. |
| `getWorkspacePrimarySurfaceOrder()` / surface catalog | Workspace surface navigation | If retained, expose semantic trigger availability/labels for narrow drawers; it must not force a visible generic top-level row. | Current context capabilities | Must not inspect DOM. |
| `getWorkspaceToolOrder()` / surface catalog | Workspace surface navigation | Return canonical right-tool order including contextual Team item and available Browser/VNC flags. | Current context capabilities | Should reuse/align with `useRightSideTabs`. |
| `useResponsiveWorkspaceShell()` | Composed shell adapter | Observe the viewport once, compose panel preferences, resolve effective state, and provide it to shell/workspace renderers. | Vue refs/injection | Owns listener lifecycle; no second workspace resolver is allowed. |
| `useRightPanel()` | Right panel preference | Toggle, drag, width preference, preference value for composed resolver. | User actions + policy state | Must not compute effective collapse from raw width. |
| `useLeftPanel()` | Left panel preference | Toggle, drag, width preference, preference value for composed resolver. | User actions + policy state | Must not compute effective collapse from raw width. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveResponsiveWorkspaceShellState` | Yes | Yes | Low | Keep pure and composed; test formula, phase order, preference/source precedence, and all boundary modes. |
| `useRightPanel` | Mostly | Yes | Medium | Split preference from effective responsive presentation in returned state. |
| `useLeftPanel` | Mostly | Yes | Medium | Split preference from effective responsive presentation in returned state. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Standard adaptive workspace layout | Current `WorkspaceDesktopLayout`; proposed `WorkspaceAdaptiveLayout` | Proposed yes | Current high | Rename or otherwise make responsibility explicit. |
| Legacy route-mobile fallback | `WorkspaceMobileLayout` | No for current product state | High | Remove/decommission; `/mobile` owns real mobile. |
| Responsive policy | Proposed `responsiveLayoutPolicy` | Yes | Low | Keep pure and central. |
| Right panel preference/effective state | `useRightPanel` | Yes with extension | Medium | Document preference vs effective mode. |

## Applied Patterns (If Any)

- Pure policy function: centralizes deterministic responsive mode decisions and supports unit tests.
- Adapter/composable: encapsulates `ResizeObserver`/window lifecycle and Vue refs around pure policy.
- Facade: `pages/workspace.vue` remains a thin route facade over the adaptive layout owner.
- Drawer/strip presentation: UI pattern for side surfaces under constrained space while keeping capability reachable.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/` | Folder | Responsive policy | Pure layout policy utilities | `utils` is appropriate for framework-independent deterministic logic. | Vue lifecycle code. |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | File | Responsive policy | Thresholds and pure state resolvers. | Central owner for policy. | Component rendering, DOM listeners. |
| `autobyteus-web/composables/layout/` | Folder | Composed layout adapter | Vue lifecycle wrapper for the single viewport measurement/policy boundary. | Existing composable pattern. | Business/data fetching or a second policy. |
| `autobyteus-web/composables/layout/useResponsiveElementRect.ts` | File | Measurement helper | `ResizeObserver` lifecycle. | Reusable infrastructure. | Breakpoint policy. |
| `autobyteus-web/composables/layout/useResponsiveWorkspaceShell.ts` | File | Composed layout adapter | One viewport observer, preference composition, policy invocation, and provided effective shell/workspace state. | Keeps both renderers thin and makes capacity ownership singular. | Must not contain business/data fetching. |
| `autobyteus-web/layouts/default.vue` | File | App shell renderer | Render left panel/header/strip/overlay by effective presentation. | Existing shell location. | Workspace center/right tool policy. |
| `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue` | File | Standard workspace layout | Center/right adaptive rendering. | Existing layout component area. | Phone/PWA mobile route logic. |
| `autobyteus-web/pages/workspace.vue` | File | Route facade | Route setup + mount adaptive layout. | Existing page route. | Breakpoint/matchMedia component selection. |
| `autobyteus-web/pages/mobile.vue` | File | Mobile route | Existing phone/PWA shell. | Existing route. | Standard workspace layout. |
| `autobyteus-web/docs` / `autobyteus-web/README.md` | File(s) | Docs | Correct local startup env names. | User/dev docs. | Product behavior code. |
| `autobyteus-web/tests/e2e/workspace-responsive.spec.ts` or maintained probe location | File | Responsive validation | Browser matrix around known responsive failure classes and `/mobile` boundary. | The user requested comprehensive live testing; downstream coverage needs a durable owner. | Product layout policy implementation details beyond visible assertions. |
| `autobyteus-web/docs` / `autobyteus-web/README.md` | File(s) | Docs | Correct local startup env names. | User/dev docs. | Product behavior code. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `utils/layout` | Off-Spine Concern | Yes | Low | Pure policy belongs outside components. |
| `composables/layout` | Off-Spine Concern | Yes | Low | Vue adapters for policy and measurement. |
| `components/layout` | Main-Line Domain-Control | Yes after rename | Medium | Avoid `Desktop` name drift if component owns all standard workspace responsive modes. |
| `components/mobile` | Main-Line Domain-Control for `/mobile` | Yes | Low | Must remain separate from standard `/workspace`. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Standard route layout | `/workspace.vue -> <WorkspaceAdaptiveLayout />` | `/workspace.vue -> v-if isDesktop ? Desktop : Mobile` | Prevents route/component breakpoint drift. |
| Narrow surface access | `Agents & teams` / `Open navigation` plus `Tools` semantic drawer triggers and empty-state actions | `Work -> Runs -> Files -> Tools` alongside left/right surfaces, or `Running -> Agent` where `Agent` redirects to `Running` | Keeps ownership understandable and avoids duplicate/ambiguous navigation. |
| Tool order | `Files -> Team(if team) -> Terminal -> Activity -> Artifacts -> Browser -> VNC` | Different tab/drawer orders per breakpoint | Keeps muscle memory across responsive modes. |
| Breakpoint/capacity policy | `resolveResponsiveWorkspaceShellState({ viewportWidth: 1024, viewportHeight: 768, leftPanelPreference: 'visible', rightPanelPreference: 'visible', ... }) -> { mode: 'large-constrained', leftPanel: { presentation: 'docked' }, rightPanel: { presentation: 'drawer' } }` | Component A uses `640`, component B uses `md`, component C uses `window.innerWidth < 768`, or shell/workspace resolve independently | Explains one composed owner and right-tools-first phase order. |
| Constrained width | `Left strip + center + right tools drawer/strip` | `320px left + 200px center + 273px right` | Protects center usability. |
| Mobile boundary | `/mobile -> MobileRemoteAccessShell` | `/workspace -> WorkspaceMobileLayout -> subset tabs` | Keeps phone/PWA product separate. |
| Responsive validation | Probe `390`, `640`, `700`, `768`, `800`, `900`, `1024`, `1180+`, short-height, and `/mobile` boundary | Validate only `700x700` or only a wide desktop screenshot | Prevents fixing one breakpoint while missing adjacent UX failures. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Change only `matchMedia('(min-width: 640px)')` to `768px` | Would fix blank band cheaply. | Rejected | It would show the poor legacy mobile layout at `640-767px` and keep cramped `md+` widths. |
| Keep `WorkspaceMobileLayout` as fallback below a new breakpoint | Minimizes deletion. | Rejected | Replace with one adaptive standard workspace layout; delete/decommission legacy fallback. |
| Add another CSS override to force desktop visible from `640px` | Avoids JS changes. | Rejected | It would make `640-767px` render three-pane desktop under mobile app shell and preserve duplicate policy. |
| Keep right panel docked and only reduce minimum widths further | Preserves current structure. | Rejected | Center is already unusable at `200px`; side surfaces must change presentation. |
| Treat the comprehensive probe as investigation-only manual evidence | Minimizes test work. | Rejected | Convert the matrix into policy/component/browser validation so the same failure classes do not return. |

## Derived Layering (If Useful)

- Route layer: `pages/workspace.vue`, `pages/mobile.vue`
- Layout policy layer: `utils/layout/responsiveLayoutPolicy.ts`
- Layout adapter layer: `composables/layout/*`
- Layout rendering layer: `layouts/default.vue`, `WorkspaceAdaptiveLayout.vue`
- Content components: existing center workspace views and right/left panels

Layering follows ownership: route does not bypass the adaptive layout/policy and components do not bypass the policy with independent breakpoints.

## Migration / Refactor Sequence

Right-tool tab design-impact sequence:

1. Reconcile the current CR-003 wrapped implementation back to the approved single-row behavior before any new browser sign-off.
2. Add a scrollable tab-row owner with conditional edge fade/chevron state and active/focused-tab auto-scroll while preserving existing tab visuals and the fixed panel toggle.
3. Replace the initial-fit browser assertion with scrollability, discoverability, active-tab reachability, and canonical-order assertions in docked and drawer states.
4. Re-run component/source review and then current API/E2E before delivery resumes.

1. Replace the split shell/workspace policy functions with the pure `resolveResponsiveWorkspaceShellState` resolver and boundary tests covering the exact fit formula and phase order.
2. Reconcile the surface ownership model: left navigation/history owns selection and runs, the center owns Work, and the right surface owns Files/tools. Remove the generic four-surface row as a universal responsive fallback and add tests for the semantic trigger/ownership contract.
3. Add `useResponsiveWorkspaceShell` as the one SSR-safe viewport adapter; compose left/right preference refs and provide the resolved state to shell/workspace renderers.
4. Keep `useRightPanel` and `useLeftPanel` as preference/width owners only. Do not let either independently compute effective responsive presentation.
5. Update `layouts/default.vue` and `WorkspaceAdaptiveLayout.vue` to consume the composed state. Preserve the left panel while left navigation plus a practical center fit; move right tools first, and auto-collapse/overlay the left panel only after that capacity is exhausted, without overwriting wide-desktop preference or treating manual collapse as permission to show a new top bar.
6. Rename/refactor `WorkspaceDesktopLayout.vue` to `WorkspaceAdaptiveLayout.vue`; remove root `hidden md:flex`; render center surface always, preserve the wide left/center/right hierarchy, render explicit narrow navigation/tool triggers and structured empty-state actions, and render right tools as docked/strip/drawer based on policy/catalog.
7. Modify `pages/workspace.vue` to remove `isDesktop`, `matchMedia`, `WorkspaceMobileLayout` import, and route-level branching; always mount the adaptive layout.
8. Remove/decommission `WorkspaceMobileLayout.vue`, `useMobilePanels.ts`, and unused localization keys/tests if no references remain.
9. Update component/source tests for the new adaptive layout, no-blank behavior, wide manual-collapse non-regression, empty-state actions, explicit drawer reachability, and stable right-tool ordering.
10. Run targeted frontend checks; downstream API/E2E engineer should investigate durable browser responsive coverage and execute the comprehensive viewport family from `comprehensive-responsive-ui-test-report.md` or an equivalent E2E matrix.
11. Delivery docs sync: update `autobyteus-web/README.md` endpoint env variables to `BACKEND_*` / dev proxy reality.

## Key Tradeoffs

- A single adaptive layout is a larger change than a breakpoint patch, but it fixes the actual ownership problem and prevents recurring breakpoint drift.
- Drawer/strip presentations may require more UI work than simply shrinking panels, but shrinking has already proven unusable at `800-1024px`.
- Separating user preference from effective responsive mode adds state complexity, but it avoids surprising the user by permanently changing panel visibility when resizing a window.
- Deleting the legacy workspace mobile fallback is cleaner than retaining a compatibility path, because `/mobile` already owns true mobile usage.

## Risks

- Threshold tuning may need visual iteration after implementation.
- Some right-tool internals may need follow-up responsive fixes once shown in drawer/sheet containers.
- If panel preference persistence is added incorrectly, responsive auto-collapse could feel unpredictable.
- Renaming `WorkspaceDesktopLayout` may require updating imports/tests carefully.

## Guidance For Implementation

- Start with pure policy tests before component rewiring.
- Do not use raw `window.matchMedia('(min-width: 640px)')` or independent `md:hidden`/`hidden md:flex` pairs to choose standard workspace layouts.
- Treat `center` as the primary surface. Collapse/re-present side surfaces before center falls to unusable widths.
- Treat left selection/history as higher-priority than right tools for automatic collapse: yield right tools first and do not encode `viewportWidth < 1280` as a blanket left-strip rule.
- Reuse existing content components (`RightSideTabs`, `AppLeftPanel`, `LeftSidebarStrip`, `RightSidebarStrip`, center workspace views) instead of duplicating content in a new narrow UI.
- Do not let button order be inherited accidentally from old components. Implement the canonical order explicitly and test it.
- Keep `/mobile` untouched except for tests confirming standard workspace changes do not import or affect it.
- Include the live probe screenshots/JSON from investigation when validating the fix, especially the comprehensive report and probe artifacts under `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/` plus earlier `gap-700x700.png`, `gap-760x700.png`, `narrow-desktop-800x700.png`, and `short-800x420.png`.
- Do not consider the fix complete until the target state removes the current comprehensive-probe failure classes: blank `640-767px`, legacy `<640px` `/workspace` fallback, `200-247px` center at `768-1024px`, cramped right tools, unrecoverable short-height panes, unstable control ordering, and `/mobile` boundary regression.
