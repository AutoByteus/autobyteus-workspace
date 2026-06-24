# Design Spec

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

## Intended Change

Replace binary desktop/mobile switching on standard `/workspace` with an adaptive desktop-capability workspace shell governed by one responsive policy owner.

High-level target:

- `/workspace` always renders one standard adaptive workspace layout owner.
- The adaptive layout chooses docked, strip, drawer, or sheet presentations for left and right surfaces based on measured space.
- The center workspace surface remains usable before side panels consume the available width.
- The old `WorkspaceMobileLayout` branch is removed/decommissioned from `/workspace`; true phone remote access remains `/mobile`.
- Button/control order is owned by the adaptive workspace design, not by whichever legacy component happens to render at a breakpoint.
- Responsive rules and control ordering are testable through pure policy/catalog functions and component/browser probes.
- The comprehensive responsive probe matrix becomes an implementation validation target, not only an investigation artifact.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Responsive Layout Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: See investigation notes. The blank band is caused by mismatched `640px` JS policy and `768px` CSS policy. Constrained desktop panes are caused by side-panel policies that lack adaptive presentation. The legacy mobile fallback is not the authoritative `/mobile` shell and loses standard workspace tools.
- Design response: Introduce a shared responsive policy owner, convert `/workspace` to one adaptive standard workspace layout, extend side-panel effective presentation, and remove the legacy route-mobile branch.
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
- Left panel composable: owns user preference for left panel visibility/width and exposes effective presentation from shell policy without overwriting preference.
- Right panel composable: owns user preference for right panel visibility/width and exposes effective docked/strip/drawer presentation from workspace policy without overwriting preference.
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

Control order is part of the design contract. The adaptive workspace must not simply reuse the legacy mobile tab order (`Running`, optional `Files`, optional `Content`, `Agent`) because that order is ambiguous and does not map to the standard workspace capability set.

Canonical standard `/workspace` surface order:

1. `Work` — the active center surface: agent conversation, team focus/grid/spotlight, or selected run config when explicitly in config mode.
2. `Runs` — run history, running runs, and run/config selection/creation entrypoints.
3. `Files` — workspace file explorer/open file content.
4. `Tools` — secondary tool surfaces in the canonical tool order below.

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

Concrete avoided shape:

- Avoid: top-level narrow buttons `Running`, `Agent`, with `Agent` redirecting back to `Running` when no selected run exists.
- Use: `Work`, `Runs`, `Files`, `Tools`, with unavailable surfaces disabled/hidden by policy and with labels stable enough that users understand where to go next.

## Comprehensive Test-Derived UI Mode Plan

The implementation should derive actual modes from measured container space and center-width preservation, not from a single hardcoded viewport label. The following mode plan is the product target implied by the live tests:

| Mode | Trigger Shape | Target Presentation | Current Failure It Replaces |
| --- | --- | --- | --- |
| Wide / full docked | Enough measured width for left panel + practical center + right tools; current no-flag probe starts around `1180x800` | Preserve current good desktop: left docked, center primary, right tools docked. | None; preserve non-regression. |
| Constrained desktop/tablet | `md+` widths or embedded containers where docked side surfaces would leave center below practical target, especially `768-1024px` | Left becomes strip or drawer; right tools become strip/drawer/sheet; center remains first-class. | `320px` left + `200-247px` center + cramped right panel. |
| Narrow standard workspace | Below `md` or any container too narrow for docked split | Single-column standard workspace with `Work -> Runs -> Files -> Tools`; tools open in drawer/sheet with canonical order. | Legacy `WorkspaceMobileLayout` `Running/Agent` model and blank `640-767px` band. |
| Short-height | Height around `<=480px` or content area too short for full docked panes | Prefer compact/overlay side surfaces; keep primary controls recoverable by scroll/drawer/overflow. | Full-height docked left/right panes clipping useful controls. |
| Phone/PWA route | Explicit `/mobile` route | Existing `MobileRemoteAccessShell`. | No change; avoid using `/mobile` components as `/workspace` fallback. |

Mode invariants:

- Center is the primary workspace surface; side surfaces must yield first.
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
| Surface/control ordering | `useRightSideTabs` currently owns right tab order only; `WorkspaceMobileLayout` owns legacy mobile tab order | Extend/Create canonical catalog | The adaptive layout needs one order model for top-level surfaces and tools across docked/strip/drawer modes. | Existing order is partial and split by layout. |
| Element measurement | Browser `ResizeObserver` patterns inside existing components | Create small reusable composable or local owner | Current measurement exists only inside `WorkspaceDesktopLayout`; app shell also needs it. | Pure helper prevents copy/paste listeners. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App shell layout | Left panel/header/strip/overlay effective presentation | DS-001, DS-003, DS-004 | App shell presentation | Extend | Modify `layouts/default.vue` and `useLeftPanel`. |
| Standard workspace layout | Center + right tools adaptive presentation | DS-001, DS-002, DS-003, DS-004 | Workspace adaptive layout | Extend/Rename | Rename `WorkspaceDesktopLayout` to adaptive or clearly refactor responsibility. |
| Responsive policy | Pure mode decisions and thresholds | DS-001, DS-003 | App shell and workspace layout | Create New | Keep framework-independent for unit tests. |
| Workspace surface navigation | Canonical primary surface and tool order | DS-001, DS-002 | Workspace adaptive layout | Create New or extend `useRightSideTabs` with a catalog | Prevents button order from being accidental per layout. |
| Mobile remote access | Phone/PWA shell | DS-005 | `/mobile` route | Reuse/Preserve | No standard workspace dependency. |
| Developer docs | Local setup instructions | N/A | Delivery/docs sync | Extend | Update env var names. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Pure responsive policy owner | Constants and pure functions for app shell/workspace modes from viewport/container dimensions. | One central place prevents breakpoint drift. | N/A |
| `composables/layout/useResponsiveElementRect.ts` | Responsive policy | Measurement helper | SSR-safe `ResizeObserver` wrapper returning element rect. | Shared by app shell/workspace without policy decisions. | N/A |
| `composables/layout/useAppShellResponsiveLayout.ts` | App shell layout | App shell responsive adapter | Applies pure policy to viewport/shell measurements and exposes effective left presentation. | Keeps `layouts/default.vue` thin. | Uses policy types. |
| `composables/layout/useWorkspaceResponsiveLayout.ts` | Standard workspace layout | Workspace responsive adapter | Applies pure policy to workspace container measurements and exposes right/center presentation. | Keeps adaptive component thin. | Uses policy types. |
| `utils/layout/workspaceSurfaceOrder.ts` or equivalent catalog | Workspace surface navigation | Surface/control order owner | Defines top-level surface order (`Work`, `Runs`, `Files`, `Tools`) and canonical right-tool order. | Makes button order testable and shared. | Uses policy/surface types. |
| `components/layout/WorkspaceAdaptiveLayout.vue` | Standard workspace layout | Adaptive workspace layout owner | Renders center, right tools, right strip/drawer/sheet, loading overlay, and primary surface controls using policy/catalog. | Current `WorkspaceDesktopLayout` responsibility expands beyond desktop. | Uses existing center/tool components. |
| `pages/workspace.vue` | Route entry | Thin route facade | Mount adaptive layout and route setup effects only. | Removes breakpoint ownership from route. | N/A |
| `composables/useRightPanel.ts` | Standard workspace layout | Right panel preference owner | Store user visible/preferred width and combine with responsive effective presentation. | Existing global state owner for right panel. | Uses policy types. |
| `composables/useLeftPanel.ts` | App shell layout | Left panel preference owner | Store user visible/preferred width and combine with shell effective presentation. | Existing global state owner for left panel. | Uses policy types. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Breakpoint/mode decisions | `utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Used by route/layout tests, app shell, and workspace layout. | Yes | Yes | A component-specific helper that reintroduces duplicate breakpoints. |
| Element measurement | `composables/layout/useResponsiveElementRect.ts` | Responsive policy | App shell and workspace both need measured dimensions. | Yes | Yes | A policy owner; it should only measure. |
| Panel presentation mode types | `utils/layout/responsiveLayoutPolicy.ts` or local exported types | Responsive policy | Left/right composables and components need consistent names. | Yes | Yes | Generic catch-all UI state unrelated to responsive layout. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceResponsiveState` | Yes | Yes | Medium | Include explicit `workspaceMode`, `rightToolsPresentation`, `centerMinimumWidth`, `isShortHeight`; do not duplicate raw breakpoints as booleans in components. |
| `AppShellResponsiveState` | Yes | Yes | Medium | Include explicit `leftPanelPresentation`; keep user preference outside this pure state. |
| `PanelPresentation` union | Yes | Yes | Low | Use explicit variants such as `docked`, `strip`, `drawer`, `hidden-by-user`; avoid ambiguous `mobile`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | Responsive policy | Pure policy owner | Threshold constants and functions resolving shell/workspace presentation. | Centralizes policy and enables focused tests. | N/A |
| `autobyteus-web/utils/layout/workspaceSurfaceOrder.ts` or equivalent | Workspace surface navigation | Surface/control order owner | Canonical top-level surface order and right-tool order. | Prevents legacy/ad hoc button order. | Policy/surface types. |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Responsive policy | Policy coverage | Boundary tests around `639`, `640`, `767`, `768`, `800`, `1024`, wide desktop, and short height. | Keeps acceptance-critical math durable. | N/A |
| `autobyteus-web/utils/layout/__tests__/workspaceSurfaceOrder.spec.ts` or equivalent | Workspace surface navigation | Order coverage | Verifies `Work`, `Runs`, `Files`, `Tools` and canonical tool ordering including contextual Team item. | Makes button order durable. | N/A |
| `autobyteus-web/composables/layout/useResponsiveElementRect.ts` | Responsive policy | Measurement helper | SSR-safe element measurement and cleanup. | Shared but non-policy. | N/A |
| `autobyteus-web/composables/layout/useAppShellResponsiveLayout.ts` | App shell layout | Shell responsive adapter | Provides effective shell presentation to `layouts/default.vue`. | Keeps shell component declarative. | Uses policy state. |
| `autobyteus-web/composables/layout/useWorkspaceResponsiveLayout.ts` | Standard workspace layout | Workspace responsive adapter | Provides effective workspace/right-tool presentation and measured container width. | Keeps workspace component declarative. | Uses policy state. |
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
| `responsiveLayoutPolicy.ts` | Threshold constants, mode calculation | `layouts/default.vue`, `WorkspaceAdaptiveLayout`, panel composables/tests | Components hard-code `640`, `768`, or independent `md:hidden`/`hidden md:flex` branch visibility | Add explicit policy output or threshold to policy file. |
| `WorkspaceAdaptiveLayout.vue` | Center/right presentation, tool drawer/strip rendering | `pages/workspace.vue` | Route mounts separate desktop/mobile standard workspace components | Add props/state to adaptive layout. |
| `useRightPanel.ts` | Right panel preference and effective presentation | Right tool renderers | Components compute separate right-panel collapse from raw width | Expose effective presentation and actions. |
| `useLeftPanel.ts` / shell adapter | Left panel preference and effective presentation | `layouts/default.vue`, `LeftSidebarStrip`, `AppLeftPanel` | Shell CSS alone forces full docked left panel at all `md+` widths | Add explicit shell presentation state. |
| `/mobile` route | Phone/PWA shell and mobile feature gates | Mobile clients | `/workspace` uses `/mobile` components as fallback | Improve adaptive standard workspace instead. |

## Dependency Rules

Allowed:

- `pages/workspace.vue` -> `WorkspaceAdaptiveLayout.vue`
- `WorkspaceAdaptiveLayout.vue` -> `useWorkspaceResponsiveLayout`, `useRightPanel`, existing center/right components
- `layouts/default.vue` -> `useAppShellResponsiveLayout`, `useLeftPanel`, existing left panel/strip components
- Composables -> `utils/layout/responsiveLayoutPolicy.ts`
- Tests -> pure policy and layout components

Forbidden:

- `pages/workspace.vue` must not call `window.matchMedia` to choose standard workspace layout.
- `WorkspaceAdaptiveLayout.vue` and `layouts/default.vue` must not encode competing breakpoint constants outside the policy owner.
- Standard `/workspace` must not import `components/mobile/*` or `WorkspaceMobileLayout` as a compatibility fallback.
- Right/left panel components must not permanently mutate user preference merely because a responsive threshold was crossed.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveAppShellResponsiveState(input)` | App shell presentation | Purely map viewport/height to left-panel presentation. | `{ viewportWidth, viewportHeight, userLeftPanelVisible }` plus optional measured shell width | No DOM access. |
| `resolveWorkspaceResponsiveState(input)` | Workspace presentation | Purely map workspace container dimensions and panel preferences to center/right presentation. | `{ containerWidth, containerHeight, rightPanelPreference }` | No DOM access. |
| `getWorkspacePrimarySurfaceOrder()` / surface catalog | Workspace surface navigation | Return canonical top-level surface order and labels/availability hooks. | Current context capabilities | Must not inspect DOM. |
| `getWorkspaceToolOrder()` / surface catalog | Workspace surface navigation | Return canonical right-tool order including contextual Team item and available Browser/VNC flags. | Current context capabilities | Should reuse/align with `useRightSideTabs`. |
| `useAppShellResponsiveLayout()` | Shell adapter | Observe viewport/shell and expose effective left presentation. | Vue refs | Owns listener lifecycle. |
| `useWorkspaceResponsiveLayout(containerRef)` | Workspace adapter | Observe workspace container and expose effective workspace mode. | Element ref | Owns ResizeObserver lifecycle. |
| `useRightPanel()` | Right panel preference/effective presentation | Toggle, drag, width preference, effective presentation. | User actions + policy state | Must separate preference from policy. |
| `useLeftPanel()` | Left panel preference/effective presentation | Toggle, drag, width preference, effective presentation. | User actions + policy state | Must separate preference from policy. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveAppShellResponsiveState` | Yes | Yes | Low | Keep pure and shell-specific. |
| `resolveWorkspaceResponsiveState` | Yes | Yes | Low | Keep pure and workspace-specific. |
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
| `autobyteus-web/composables/layout/` | Folder | Layout adapters | Vue lifecycle wrappers for measurement/policy. | Existing composable pattern. | Business/data fetching. |
| `autobyteus-web/composables/layout/useResponsiveElementRect.ts` | File | Measurement helper | `ResizeObserver` lifecycle. | Reusable infrastructure. | Breakpoint policy. |
| `autobyteus-web/composables/layout/useAppShellResponsiveLayout.ts` | File | App shell adapter | Effective shell presentation. | Keeps shell renderer thin. | Workspace right-tool logic. |
| `autobyteus-web/composables/layout/useWorkspaceResponsiveLayout.ts` | File | Workspace adapter | Effective workspace presentation. | Keeps workspace renderer thin. | App-left nav content logic. |
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
| Primary narrow buttons | `Work -> Runs -> Files -> Tools` | `Running -> Agent`, where `Agent` may redirect to `Running` | Gives users a stable mental model and avoids legacy ambiguity. |
| Tool order | `Files -> Team(if team) -> Terminal -> Activity -> Artifacts -> Browser -> VNC` | Different tab/drawer orders per breakpoint | Keeps muscle memory across responsive modes. |
| Breakpoint policy | `resolveWorkspaceResponsiveState({ containerWidth: 700 }) -> { mode: 'narrow', rightToolsPresentation: 'drawer' }` | Component A uses `640`, component B uses `md`, component C uses `window.innerWidth < 768` | Explains single owner. |
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

1. Add pure responsive policy file and tests with thresholds that cover the known failure band and constrained widths.
2. Add a canonical workspace surface/tool order catalog and tests for `Work`, `Runs`, `Files`, `Tools` plus right-tool order.
3. Add measurement composable(s) for viewport/container size with SSR-safe cleanup.
4. Extend `useRightPanel` to separate user preference (`visible`, preferred width) from effective responsive presentation (`docked`, `strip`, `drawer`, `hidden-by-user`) and to preserve a larger practical center width.
5. Extend `useLeftPanel`/app shell layout to separate user preference from effective presentation and to auto-collapse/overlay the left panel under constrained width/height without overwriting wide-desktop preference.
6. Rename/refactor `WorkspaceDesktopLayout.vue` to `WorkspaceAdaptiveLayout.vue`; remove root `hidden md:flex`; render center surface always, render primary surface controls in canonical order, and render right tools as docked/strip/drawer based on policy/catalog.
7. Modify `pages/workspace.vue` to remove `isDesktop`, `matchMedia`, `WorkspaceMobileLayout` import, and route-level branching; always mount the adaptive layout.
8. Remove/decommission `WorkspaceMobileLayout.vue`, `useMobilePanels.ts`, and unused localization keys/tests if no references remain.
9. Update component/source tests for the new adaptive layout, no-blank behavior, and stable button/tool ordering.
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
- Reuse existing content components (`RightSideTabs`, `AppLeftPanel`, `LeftSidebarStrip`, `RightSidebarStrip`, center workspace views) instead of duplicating content in a new narrow UI.
- Do not let button order be inherited accidentally from old components. Implement the canonical order explicitly and test it.
- Keep `/mobile` untouched except for tests confirming standard workspace changes do not import or affect it.
- Include the live probe screenshots/JSON from investigation when validating the fix, especially the comprehensive report and probe artifacts under `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/` plus earlier `gap-700x700.png`, `gap-760x700.png`, `narrow-desktop-800x700.png`, and `short-800x420.png`.
- Do not consider the fix complete until the target state removes the current comprehensive-probe failure classes: blank `640-767px`, legacy `<640px` `/workspace` fallback, `200-247px` center at `768-1024px`, cramped right tools, unrecoverable short-height panes, unstable control ordering, and `/mobile` boundary regression.
