# Design Spec

## Status

`Ready for architecture review — revised after round 1`

## Architecture Review Round 1 Resolution

| Finding | Resolution In This Package |
| --- | --- |
| `AR-001` | Reclassified the evidence-backed root cause as `File Placement Or Responsibility Drift` in requirements, investigation, and design; explicitly distinguishes the new behavior from a prior local defect. |
| `AR-002` | Defines one exact `settingsNavigation.ts` record/resolver contract for Back, destinations, labels/icons/test IDs, availability, active state/context, and Server Settings modes; prohibits parallel mappings and gives the collapsed header one typed context prop. |
| `AR-003` | Defines `SettingsToggleFocusHandle.focusToggle()`, page sequencing, visibility-aware narrow behavior, stable `settings-navigation-region`, and exact `aria-controls`/`aria-expanded` values plus durable coverage. |
| `AR-004` | Corrected the UI/UX supplement inventory to `Refined`; approved on 2026-07-15. |

## Current-State Read

`autobyteus-web/pages/settings.vue` currently owns the entire Settings shell: route normalization, `activeSection`, Server Settings mode, Back to Workspace, roughly 200 lines of inline navigation markup, and the navigation/content flex row. At `md` and wider the navigation always reserves `md:w-64`; below `md` it becomes a full-width stacked region capped at `38dvh`. The content side is correctly shrinkable (`min-w-0 flex-1`) and each statistics table correctly contains its own horizontal overflow.

The current governing boundary is fundamentally correct: the Settings page should decide which section is active and how navigation participates in layout. The prior always-open desktop presentation is implemented consistently and is not evidence of a pre-existing local defect. The design pressure is responsibility drift: route policy, the full navigation presentation, direct section mutation, Back action, labels/icons, Server Settings submodes, and content mounting are colocated in the page. Adding contextual layout policy directly would deepen that drift and make the required active-context header prone to parallel mappings.

`AppLeftPanel.vue` contains the exact user-approved left-sidebar panel SVG inline beside Agents. Its global `useLeftPanel()` state belongs to the workspace shell and must not be reused for Settings because Settings has distinct contextual-collapse semantics.

The active manager components own heterogeneous internal headers/content. They must not be edited merely to host the navigation toggle. Token Statistics, its store, GraphQL documents, and task/model tables remain unchanged.

## Intended Change

Create a Settings-owned, normally-open/contextually-collapsible navigation shell:

- Extract the exact existing panel SVG into one reusable layout icon component and use it in both `AppLeftPanel.vue` and Settings.
- Extract the Settings navigation presentation from `settings.vue` into a focused component backed by one typed destination definition.
- Keep the sidebar open by default for ordinary sections.
- Centralize section selection so selecting/direct-linking Token Statistics sets the desktop navigation state to collapsed; selecting any non-statistics section sets it open.
- Permit manual collapse from a separate right-aligned panel button in the existing Back to Workspace row.
- When collapsed, reserve zero desktop sidebar width and render a shell-owned header containing the same panel icon plus active section context.
- Reopening restores the normal persistent sidebar in layout flow; it does not overlay/dim content.
- Preserve the current narrow stacked navigation through responsive CSS rather than JavaScript viewport branching.
- Keep the active manager mounted while only sidebar/header presentation changes, preserving page state.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | Defines approved open/collapsed states, exact icon, placement, transitions, responsive behavior, and accessibility | `REQ-001`–`REQ-012`, `AC-001`–`AC-014` | Governs observable shell behavior implemented by this design | `Refined`; approved |
| `proposed-settings-drawer-closed.png`, `proposed-settings-drawer-open.png`, `proposed-settings-drawer.html` in the same folder | Records an earlier visual exploration | N/A | Explicitly superseded; must not drive implementation | Superseded |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`, local to Settings-shell presentation and inline responsibility size.
- Root cause classification: `File Placement Or Responsibility Drift`
- Refactor needed now: `Yes`, bounded local refactor.
- Evidence: `settings.vue` owns the correct state boundary but combines route policy, menu presentation, every destination, Back action, Server Settings submodes, content mounting, and direct section assignments. The exact panel icon is inline in the workspace shell today and would otherwise be copied. The former always-open behavior did not violate a known invariant; the refactor is required so the new behavior does not extend this responsibility drift or duplicate context resolution.
- Design response: retain Settings page authority, extract presentational/menu metadata concerns, centralize section selection and layout policy, and extract only the canonical SVG icon for cross-shell visual consistency.
- Refactor rationale: The extraction is necessary to avoid duplicated navigation definitions and icon drift while keeping `settings.vue` as the governing owner.
- Intentional deferrals/residual risk: No persisted user preference or generalized app-wide drawer framework is added. A future request for more auto-collapse sections can extend the explicit Settings policy without changing this boundary.

## Terminology

- **Open sidebar:** current 16rem labeled Settings navigation in normal layout flow.
- **Collapsed navigation:** zero desktop sidebar width, no compact rail, plus a shell-owned reopen header.
- **Contextual collapse:** the explicit rule that desktop Token Statistics starts collapsed.
- **Panel icon:** the exact divided-rectangle SVG currently beside Agents.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the inline Settings navigation list from `pages/settings.vue` after the extracted owner is wired.
- Remove direct top-level `activeSection = ...` template assignments; all selection must use the centralized section-selection path.
- Remove the duplicated inline panel SVG from `AppLeftPanel.vue` after shared icon extraction.
- Do not keep both old and new navigation markup, an icon rail fallback, overlay drawer behavior, `×`/chevron controls, or dual selection policies.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`.
- Sidebar state is ephemeral in-memory page state.
- No settings value, token-usage ledger, route contract, local storage entry, or backend schema changes.
- No migration is needed.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | Settings route or destination activation | Active manager rendered with correct open/collapsed shell | `pages/settings.vue` | Centralizes section identity and contextual layout policy |
| `DS-002` | Bounded Local | Panel toggle activation | Sidebar/header visibility changes and focus transfers | `pages/settings.vue` | Provides reversible manual collapse without changing content |
| `DS-003` | Bounded Local | Viewport crosses `md` | Current narrow stacked behavior or desktop collapse presentation applies | CSS responsive presentation owned by Settings shell | Avoids fragile JavaScript viewport policy |

## Primary Execution Spine(s)

`/settings route or navigation button -> SettingsPage.normalize/selectSection -> activeSection + navigationCollapsed policy -> SettingsNavigation/SettingsCollapsedHeader presentation -> active manager component`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Route normalization or a menu selection calls one page-owned selector. It updates active section/mode and open/collapsed policy, then the authoritative resolver supplies the menu's active state and collapsed-header context before rendering the existing manager. | Route, SettingsPage, navigation resolver, manager | SettingsPage | Localization, legacy query normalization, embedded-server default |
| `DS-002` | The user activates the shared panel icon. SettingsPage toggles only navigation presentation, waits for render, and calls the destination child's typed `focusToggle()` boundary. Both buttons expose one stable controlled-region relationship; active manager DOM/state remains mounted. | Toggle, SettingsPage state, navigation/header focus handles | SettingsPage | Focus visibility check, ARIA state, exact shared icon |
| `DS-003` | Responsive classes keep navigation visible/stacked below `md` even if contextual desktop state is collapsed; the collapsed header is desktop-only. | Navigation wrapper, header wrapper, content | SettingsPage | Whole-page overflow containment |

## Spine Actors / Main-Line Nodes

- `SettingsPage` (`pages/settings.vue`) — governing owner for section/mode/navigation-presentation state.
- `SettingsNavigation` — open/stacked navigation presentation and emitted user intents.
- `SettingsCollapsedHeader` — desktop collapsed-state presentation and reopen intent.
- Active Settings manager — existing section content owner.

## Ownership Map

- `SettingsPage` owns route normalization, active section, Server Settings mode, contextual auto-collapse policy, manual open/collapse state, focus sequencing, and manager mounting.
- `SettingsNavigation` owns the visible Back row, exact collapse-button placement, destination list, active styling, and Server Settings sub-navigation presentation. It emits intents; it does not mutate page state or route.
- `SettingsCollapsedHeader` owns only the zero-width-state header presentation, active context text, and expand intent.
- `settingsNavigation.ts` owns the complete Settings navigation model: stable section/mode identities, Back action metadata, all top-level label/icon/test/availability metadata, Server Settings mode metadata, route-identity normalization helpers, the stable controlled-region ID, and the sole resolver for active menu/context state.
- `LeftPanelToggleIcon` owns the exact shared SVG geometry only, not state or click behavior.
- Manager components retain their current data/forms/content ownership.

## Authoritative Navigation And Context Contract

`components/settings/settingsNavigation.ts` is the only source of Settings navigation identity and display context. It exports the following exact conceptual contract (names may be used directly in implementation; fields must not be weakened to generic strings):

```ts
export type SettingsSection =
  | 'api-keys' | 'token-usage' | 'messaging' | 'display' | 'language'
  | 'local-tools' | 'mcp-servers' | 'application-packages'
  | 'agent-packages' | 'server-settings' | 'extensions' | 'updates';

export type ServerSettingsMode = 'quick' | 'advanced' | 'migrations';
export type SettingsAvailability = 'always';

export interface SettingsDestinationDefinition {
  readonly section: SettingsSection;
  readonly labelKey: SettingsSectionLabelKey;
  readonly iconClass: SettingsSectionIconClass;
  readonly testId: `settings-nav-${SettingsSection}`;
  readonly availability: SettingsAvailability;
}

export interface ServerSettingsModeDefinition {
  readonly mode: ServerSettingsMode;
  readonly labelKey: SettingsServerModeLabelKey;
  readonly testId: `settings-nav-server-settings-${ServerSettingsMode}`;
}

export interface SettingsBackActionDefinition {
  readonly action: 'back-to-workspace';
  readonly labelKey: 'settings.page.backLabel';
  readonly ariaLabelKey: 'settings.page.backAriaLabel';
  readonly icon: 'heroicons:arrow-left-20-solid';
  readonly testId: 'settings-nav-back';
}

export interface SettingsNavigationRegionDefinition {
  readonly id: 'settings-navigation-region';
  readonly ariaLabelKey: 'settings.page.navigationAriaLabel';
}

export interface SettingsActiveContext {
  readonly section: SettingsSection;
  readonly primaryLabelKey: SettingsSectionLabelKey;
  readonly secondaryLabelKey: SettingsServerModeLabelKey | null;
  readonly iconClass: SettingsSectionIconClass;
}

export interface ResolvedSettingsNavigation {
  readonly region: SettingsNavigationRegionDefinition;
  readonly backAction: SettingsBackActionDefinition;
  readonly destinations: readonly (SettingsDestinationDefinition & {
    readonly isActive: boolean;
  })[];
  readonly serverSettingsModes: readonly (ServerSettingsModeDefinition & {
    readonly isActive: boolean;
  })[];
  readonly activeContext: SettingsActiveContext;
}

export function resolveSettingsNavigation(
  activeSection: SettingsSection,
  serverSettingsMode: ServerSettingsMode,
): ResolvedSettingsNavigation;
```

The label-key and icon types are literal unions derived from the records below, not free-form `string`. Current availability is deliberately exact: every destination is `always`; no hidden or environment-specific destination exists today. The resolver filters by availability, derives top-level and Server-mode active flags, and derives the collapsed-header context. When `activeSection === 'server-settings'`, `secondaryLabelKey` is the active Basics/Advanced/Migrations label; otherwise it is `null`. The header renders `primaryLabelKey`, followed by ` — ${secondaryLabelKey}` only when the latter exists.

| Section | Label key | Existing icon class | Availability |
| --- | --- | --- | --- |
| `api-keys` | `settings.page.sections.apiKeys` | `i-heroicons-key-20-solid` | `always` |
| `token-usage` | `settings.page.sections.tokenUsage` | `i-heroicons-chart-bar-20-solid` | `always` |
| `messaging` | `settings.page.sections.messaging` | `i-heroicons-chat-bubble-left-right-20-solid` | `always` |
| `display` | `settings.page.sections.display` | `i-heroicons-computer-desktop-20-solid` | `always` |
| `language` | `settings.page.sections.language` | `i-heroicons-language-20-solid` | `always` |
| `local-tools` | `settings.page.sections.localTools` | `i-heroicons-wrench-screwdriver-20-solid` | `always` |
| `mcp-servers` | `settings.page.sections.mcpServers` | `i-heroicons-puzzle-piece-20-solid` | `always` |
| `application-packages` | `settings.page.sections.applicationPackages` | `i-heroicons-squares-plus-20-solid` | `always` |
| `agent-packages` | `settings.page.sections.agentPackages` | `i-heroicons-folder-open-20-solid` | `always` |
| `server-settings` | `settings.page.sections.serverSettings` | `i-heroicons-server-20-solid` | `always` |
| `extensions` | `settings.page.sections.extensions` | `i-heroicons-squares-2x2-20-solid` | `always` |
| `updates` | `settings.page.sections.updates` | `i-heroicons-arrow-path-20-solid` | `always` |

Server Settings modes are the ordered records `quick -> settings.page.serverSettings.quick`, `advanced -> settings.page.serverSettings.advanced`, and `migrations -> settings.page.serverSettings.migrations`. They are rendered only beneath the active `server-settings` destination, but the same records resolve the collapsed header's secondary context. `Back to Workspace` is deliberately an action, not a selectable section: it lives in the same exported model so its label/icon/test identity cannot drift, while `SettingsNavigation` emits `back` and SettingsPage alone performs `router.push('/workspace')`. The model's region record supplies the stable ID and localized `settings.page.navigationAriaLabel`; components do not hard-code an alternate region identifier.

The module also exports `normalizeSettingsSection(raw)` (including the current `about -> updates` alias), `normalizeServerSettingsMode(raw)`, `SETTINGS_NAVIGATION_REGION_ID = 'settings-navigation-region'`, and the shared `SettingsToggleFocusHandle` type described below. The current `server-status -> server-settings/advanced` deep-link rule and embedded-server fallback remain page-owned route/product policy; both terminate in the typed selection functions and then use this resolver.

Consumers must use `resolveSettingsNavigation`; neither `SettingsNavigation.vue`, `SettingsCollapsedHeader.vue`, nor `settings.vue` may contain a second section-to-label, section-to-icon, section-to-availability, or Server-mode-to-label map. `SettingsNavigation` receives the resolved object. `SettingsCollapsedHeader` receives exactly `context: SettingsActiveContext`; it never accepts prelocalized arbitrary strings or independently looks up labels.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SettingsNavigation` emits | SettingsPage | Convert menu interactions into typed page intents | Route normalization or collapse policy |
| `SettingsCollapsedHeader` emit | SettingsPage | Present reopen control/context | Active-section state |
| `LeftPanelToggleIcon` | Caller button | Canonical icon geometry | Click semantics, accessibility label, or layout state |

## Toggle Focus And ARIA Contract

Both presentational children implement and expose the same typed public handle:

```ts
export interface SettingsToggleFocusHandle {
  /** Focus the internal panel-toggle button only when it is rendered and CSS-visible. */
  focusToggle(): boolean;
}
```

Each child keeps a private `ref<HTMLButtonElement | null>` and uses `defineExpose<SettingsToggleFocusHandle>({ focusToggle })`. `focusToggle()` returns `false` without focusing when the element is absent, disabled, or CSS-hidden (`getClientRects().length === 0`); otherwise it calls `focus()` and returns whether focus reached the button. SettingsPage holds `ref<SettingsToggleFocusHandle | null>` for each child. It changes presentation, awaits `nextTick()`, then invokes only the destination child's public method—never queries into child DOM.

Focus sequences are exact:

1. Desktop manual collapse: update collapsed state, `await nextTick()`, call `collapsedHeaderRef.focusToggle()`.
2. Desktop manual reopen: update open state, `await nextTick()`, call `settingsNavigationRef.focusToggle()`.
3. Selecting Token Statistics from the navigation: apply selection/collapse, `await nextTick()`, attempt `collapsedHeaderRef.focusToggle()`. At desktop the newly visible header receives focus; below `md` that method returns `false`, so focus remains on the still-visible selected navigation button.
4. Route initialization, redirects, and viewport changes never steal focus. They apply state only.

`selectSection(section, options)` remains the single selection policy with `options.transferFocus` defaulting to `false`; `SettingsNavigation` selection calls set it to `true`, while route normalization calls do not. This option changes only post-render focus, never section or collapse policy.

The stable disclosure relationship is:

- `SettingsNavigation` root is the persistent `<aside id="settings-navigation-region">`; it stays mounted. Collapsed desktop state applies `md:hidden`, while below `md` it remains the current visible stacked navigation.
- The open-state panel button is `hidden md:inline-flex`, uses localized `Close Settings menu`, `aria-controls="settings-navigation-region"`, and `aria-expanded="true"`. It exists in the visible Back row only while desktop navigation is open.
- `SettingsCollapsedHeader` is `hidden md:flex` and is rendered only for collapsed policy state. Its panel button uses localized `Open Settings menu`, the same `aria-controls="settings-navigation-region"`, and `aria-expanded="false"`.
- The navigation region has a localized navigation label and remains the sole controlled region. The panel SVG is decorative (`aria-hidden="true"`); button text alternatives own semantics. Existing visible focus-ring treatment is retained/matched on both buttons.

No `window.innerWidth`, resize listener, or JavaScript media-query state governs presentation. The visibility-aware focus method is a post-transition safety check, not a layout decision, and prevents focus from moving to the CSS-hidden desktop header at narrow widths.

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Inline navigation block in `pages/settings.vue` | Mixed presentation/orchestration and would duplicate extracted component | `SettingsNavigation.vue` | In this change | Remove completely after wiring |
| Direct template assignments such as `activeSection = 'token-usage'` | Bypass contextual layout policy | `selectSection(section)` | In this change | Server Settings uses typed specialized selector |
| Inline panel SVG in `AppLeftPanel.vue` | Would diverge from Settings copy | `LeftPanelToggleIcon.vue` | In this change | Preserve current button placement/style |
| Superseded overlay drawer/rail concepts | Not approved | Normally-open zero-width collapse | In this change | No source implementation should remain |

## Return Or Event Spine(s)

No asynchronous application event spine is introduced. Component emits synchronously request state transitions from SettingsPage.

## Bounded Local / Internal Spines

- Selection: `destination click -> SettingsNavigation emit -> SettingsPage.selectSection({ transferFocus: true }) -> activeSection + collapsed policy -> resolveSettingsNavigation -> manager/layout render -> visible destination focus attempt when collapse hid the trigger`.
- Manual collapse: `open-sidebar panel button -> emit collapse -> SettingsPage.collapseNavigation -> nextTick -> SettingsCollapsedHeader.focusToggle()`.
- Manual reopen: `collapsed header panel button -> emit expand -> SettingsPage.expandNavigation -> nextTick -> SettingsNavigation.focusToggle()`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Localization | DS-001/002 | Navigation/header | Section labels and Open/Close Settings menu labels | Hard-coded text or inconsistent locale behavior |
| Responsive CSS | DS-003 | SettingsPage | Preserve narrow stack and desktop zero-width collapse | JS resize races/hydration mismatch |
| Focus management | DS-001/002 | SettingsPage + child public handles | Transfer focus to corresponding CSS-visible toggle without DOM reach-through | Focus lost on hidden element or moved to narrow hidden header |
| Durable tests | All | Settings shell | Lock policy/transitions/regressions | Special-case behavior regresses silently |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Exact panel icon | Inline SVG in `AppLeftPanel.vue` | Extract/reuse | User requires exact visual consistency |
| Navigation state | SettingsPage `activeSection`/mode | Extend | Correct existing owner |
| Responsive behavior | Tailwind `md` classes | Reuse | Avoid JS viewport branch |
| Global workspace panel state | `useLeftPanel()` | Do not reuse | Different lifecycle and contextual policy |
| Cross-app drawer framework | None needed | Do not create | Approved behavior is persistent layout, not overlay drawer |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| Settings shell | Section/mode state, open/collapse policy, layout, focus | DS-001–003 | Extend/refactor | Primary scope |
| Shared layout visuals | Canonical panel icon | DS-002 | Extend | Geometry only |
| Settings managers | Existing page content/data | DS-001 | Reuse unchanged | No opener injection |
| Localization | Toggle labels | DS-002 | Extend | English/Chinese |
| Tests | Shell and shared visual regressions | All | Extend | Focused suites |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner/Boundary | Concrete Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `components/layout/LeftPanelToggleIcon.vue` | Shared layout visuals | Icon geometry | Exact divided-panel SVG | One canonical icon | Yes |
| `components/settings/settingsNavigation.ts` | Settings shell | Navigation identity/context contract | Back action, section/mode types, complete metadata, normalizers, resolver, controlled-region ID, focus-handle type | Shared by page/menu/header | Yes |
| `components/settings/SettingsNavigation.vue` | Settings shell | Open navigation presentation | Back row, collapse control, destinations, modes | One menu owner | Uses metadata/icon |
| `components/settings/SettingsCollapsedHeader.vue` | Settings shell | Collapsed presentation | Reopen control and active context | Distinct structural state | Uses metadata/icon |
| `pages/settings.vue` | Settings shell | Governing owner | State/policy/layout/focus/manager selection | Existing page authority | Uses extracted files |

## Reusable Owned Structures Check

| Repeated Structure/Logic | Shared File | Owner | Why Shared | Redundancy Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- |
| Back/section/mode identity, labels, icons, availability, active context | `settingsNavigation.ts` | Settings shell | Menu, page normalization, and header need one resolved identity | Yes | Generic app navigation registry or parallel context map |
| Panel SVG geometry | `LeftPanelToggleIcon.vue` | Shared layout visuals | Agents and Settings require exact icon | Yes | State-owning button abstraction |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundancy Removed | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SettingsDestinationDefinition` | Yes | Yes | Low | Exact section, label, icon, test ID, and availability record; active state is resolver-derived |
| `SettingsActiveContext` | Yes | Yes | Low | Resolver-only derivation; header accepts this typed identity and no raw label strings |
| Back action / Server mode definitions | Yes | Yes | Low | Kept in the same model but discriminated from selectable top-level sections |
| `SettingsSection` | Yes | N/A | Low | Move current union to navigation-owned typed file |
| Navigation collapsed state | Yes | N/A | Low | One page ref; do not add persisted/global duplicate |

## Final File Responsibility Mapping

| File | Owning Area | Responsibility | Change |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/LeftPanelToggleIcon.vue` | Shared layout visuals | Canonical exact panel SVG | Add |
| `autobyteus-web/components/AppLeftPanel.vue` | Workspace shell | Consume shared icon without changing behavior | Modify |
| `autobyteus-web/components/settings/settingsNavigation.ts` | Settings shell | Complete typed navigation/context records, normalizers, resolver, controlled-region ID, and focus-handle contract | Add |
| `autobyteus-web/components/settings/SettingsNavigation.vue` | Settings shell | Normally-open/stacked sidebar UI, typed intents, stable navigation region, and exposed visible-toggle focus method | Add |
| `autobyteus-web/components/settings/SettingsCollapsedHeader.vue` | Settings shell | Desktop collapsed header from typed active context, expand intent, ARIA disclosure, and exposed visible-toggle focus method | Add |
| `autobyteus-web/pages/settings.vue` | Settings shell | Central selection/collapse policy, resolved model, responsive layout, public-handle focus sequencing, manager mounting | Modify |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | Open/Close Settings menu and Settings navigation-region labels | Modify |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese toggle and navigation-region labels | Modify |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Tests | End-to-end component state/policy/layout regression | Modify |
| `autobyteus-web/components/settings/__tests__/SettingsNavigation.spec.ts` | Tests | Menu destinations, placement, emits, modes, icon | Add |
| `autobyteus-web/components/settings/__tests__/SettingsCollapsedHeader.spec.ts` | Tests | Reopen/context/accessibility behavior | Add |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | Tests | Shared icon consumption/no behavior regression | Modify |

## Ownership Boundaries

SettingsPage remains authoritative for mutable section/mode/collapse state and navigation effects. `settingsNavigation.ts` is authoritative for immutable identity plus derived display context. Presentational components consume its resolved types, emit typed intents, expose only `focusToggle()`, and never import the router, server store, or active manager stores. Manager components never import navigation state. The shared icon has no state. The workspace global left-panel composable remains isolated from Settings.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| SettingsPage selection functions | Active section/mode + collapse policy | Navigation emits, route initialization | Direct `activeSection` mutation in template/children | Add typed selector behavior to page |
| `settingsNavigation.ts` | Navigation identity, availability, active/context derivation, stable region/focus types | SettingsPage and both presentation children | Parallel label/icon/mode/context maps | Extend the discriminated records/resolver |
| `SettingsNavigation` | Menu rendering, user intents, controlled region, open-toggle focus target | SettingsPage | Second inline menu copy or parent DOM query | Extend typed props/emits/exposed handle |
| `SettingsCollapsedHeader` | Resolved active context, reopen intent, collapsed-toggle focus target | SettingsPage | Raw/prelocalized context strings or parent DOM query | Extend typed context/emit/exposed handle |
| `LeftPanelToggleIcon` | SVG geometry | AppLeftPanel, Settings components | Duplicate inline SVG | Extend icon only if geometry changes globally |

## Dependency Rules

Allowed:

- SettingsPage imports the navigation resolver/types/components and active manager components.
- Navigation/header import the shared icon and localization.
- SettingsPage may use `nextTick` and typed `SettingsToggleFocusHandle` component refs for focus transfer.

Forbidden:

- Do not import or mutate `useLeftPanel()` from Settings.
- Do not let manager components own/open/collapse Settings navigation.
- Do not use `window.innerWidth`/resize listeners for the approved `md` behavior; use responsive classes.
- Do not unmount/remount the active manager merely because navigation toggles.
- Do not change statistics table columns/minimum widths to satisfy this shell task.
- Do not retain overlay drawer, backdrop, icon rail, `×`, or chevron behavior.
- Do not duplicate section/mode labels, icons, availability, active-context resolution, or Back metadata outside `settingsNavigation.ts`.
- Do not pass arbitrary/prelocalized context strings to `SettingsCollapsedHeader` or reach through either child ref to query/focus internal DOM.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Accepted Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveSettingsNavigation` | Navigation/context projection | Resolve available destinations, active flags, Server modes, Back metadata, and active header context | `(SettingsSection, ServerSettingsMode) -> ResolvedSettingsNavigation` | Sole display-context resolver |
| `SettingsNavigation` props | Open/stacked menu | Render authoritative navigation projection and desktop collapsed class | `{ model: ResolvedSettingsNavigation; isDesktopCollapsed: boolean }` | Root owns `settings-navigation-region`; no router/store dependency |
| `SettingsNavigation` emits | User navigation intents | Select section/mode, back, collapse | Typed events | SettingsPage applies policy |
| `SettingsNavigation.focusToggle()` | Open toggle focus | Focus internal toggle only if CSS-visible | `() => boolean` | `defineExpose<SettingsToggleFocusHandle>` |
| `SettingsCollapsedHeader` props | Collapsed context | Render resolver-derived localized title/mode | `{ context: SettingsActiveContext }` | No arbitrary/prelocalized strings |
| `SettingsCollapsedHeader` emit | Reopen intent | Request navigation open | `expand` | Page owns state |
| `SettingsCollapsedHeader.focusToggle()` | Collapsed toggle focus | Focus internal toggle only if CSS-visible | `() => boolean` | `defineExpose<SettingsToggleFocusHandle>` |
| Panel toggle disclosure | Settings navigation region | Express the same region open/closed from either location | `aria-controls="settings-navigation-region"`; open `aria-expanded="true"`; collapsed `false` | Buttons use localized names; icon decorative |
| `selectSection(section, options)` | Settings section | Update section and contextual layout; optionally transfer UI-origin focus | `SettingsSection`, `{ transferFocus?: boolean }` | Token usage collapses; route callers keep default `false` |
| `selectServerSettings(mode)` | Server Settings | Update section/mode and open layout | `ServerSettingsMode` | Preserves existing semantics |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Navigation resolver/model | Yes | Yes | Low | One discriminated model; no parallel mappings |
| Navigation props/emits | Yes | Yes | Low | Pass resolved model and typed identities |
| Child focus handles | Yes | Yes | Low | One visible-only method; no internal element exposure |
| Panel disclosure | Yes | Yes | Low | Both buttons target the one stable region ID |
| `selectSection` | Yes | Yes | Low | No generic string guessing |
| Shared icon | Yes | N/A | Low | No behavior props |

## Main Domain Subject Naming Check

| Node | Name | Natural | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Settings open menu | `SettingsNavigation` | Yes | Low | Use consistently |
| Zero-width state UI | `SettingsCollapsedHeader` | Yes | Low | Avoid “drawer” terminology |
| Canonical icon | `LeftPanelToggleIcon` | Yes | Low | Mirrors existing left panel meaning |
| State | `isSettingsNavigationCollapsed` | Yes | Low | Avoid ambiguous `menuOpen` across responsive behavior |

## Applied Patterns

- **State owner with presentational children:** SettingsPage owns state/policy; navigation/header emit intents.
- **Shared visual primitive:** one canonical icon component, deliberately not a generic stateful sidebar framework.
- **Responsive presentation via CSS:** narrow stacked behavior remains independent from desktop collapse state.

## Change Inventory

- Add: shared panel icon, Settings navigation metadata, Settings navigation component, collapsed header component, focused tests.
- Modify: Settings page, AppLeftPanel icon use, English/Chinese localization, page/AppLeftPanel tests.
- Remove: inline Settings menu from page, direct template section assignments, inline AppLeftPanel panel SVG.
- No backend/store/GraphQL/table changes.

## Folder / Path Mapping

All new Settings-owned files stay under `autobyteus-web/components/settings/`; the one cross-shell visual primitive stays under `autobyteus-web/components/layout/`. No new generic `common` subsystem or deep module hierarchy is justified.

## Change / Refactor Sequence

1. Add canonical `LeftPanelToggleIcon.vue`; replace the inline AppLeftPanel SVG and lock with focused regression coverage.
2. Add `settingsNavigation.ts` with the complete records, literal types, normalization helpers, resolver, region ID, and focus-handle interface; cover record order, active context (including all Server modes), Back action, and availability before consuming it.
3. Add `SettingsNavigation.vue`; move the existing menu intact and render only the resolved model. Establish the stable root ID, desktop-only close button, typed emits, and exposed visible-only focus method.
4. Add `SettingsCollapsedHeader.vue` with exact `SettingsActiveContext`, the same icon, fixed collapsed disclosure semantics, typed expand emit, and the same exposed focus method.
5. Refactor SettingsPage direct assignments into `selectSection`/`selectServerSettings`, compute the resolved model, add `isSettingsNavigationCollapsed`, and wire only typed focus handles. Remove the inline menu and all parallel mappings in the same step; no temporary dual menu/model remains after this step.
6. Wire responsive classes: navigation remains mounted and visible below `md`; desktop collapsed state hides it and shows the header; content padding adapts symmetrically. Focus attempts rely on child visibility checks and never drive layout.
7. Add localization and focused tests, then run implementation-scoped frontend checks.

## Failure / Edge Behavior

- Direct `?section=token-usage`: desktop collapsed state; narrow stack remains visible through CSS.
- Invalid/legacy section query: existing normalization/fallback behavior, sidebar open unless normalized target is Token Statistics.
- Embedded server not running: Server Settings selected with sidebar open.
- Reopen while statistics are loading/error/empty: presentation changes only; request/state continues.
- Resize narrow -> desktop while Token Statistics policy is collapsed: desktop enters collapsed view; reverse resize shows current stacked navigation.

## Testing / Validation Design

Implementation engineer owns focused component/unit checks; broader browser evidence remains downstream API/E2E ownership.

Focused durable coverage should verify:

- default API Keys/open sidebar;
- Token Statistics selection and direct query collapse;
- same manager instance/state across manual toggle;
- non-statistics selection restores open state;
- exact Back-row toggle placement and absence of `Settings` title/rail/`×`/chevrons;
- shared icon used by AppLeftPanel and Settings;
- Server Settings modes and existing route normalization;
- one complete metadata/resolver source for Back, all destinations/icons/availability, Server Settings active modes, and collapsed header context;
- CSS class invariants for narrow stack versus desktop collapse;
- stable `settings-navigation-region` control targets and exact expanded values;
- each child's `focusToggle()` success/failure behavior for visible versus CSS-hidden controls;
- desktop manual/selection focus transfer, no route-init focus theft, and narrow Token Statistics focus retention.

## Observability / Operational Notes

No telemetry, persistence, release flag, migration, or backend observability is needed. Browser screenshots and DOM measurements are the appropriate validation evidence.

## Security / Privacy

No impact. The sidebar exposes the same destinations already visible; no data or permission boundary changes.

## Alternatives Considered

- Keep sidebar always visible: rejected because it preserves the reported width defect.
- Permanent 50px icon rail: rejected by user due icon density and remaining width consumption.
- Always-hidden/off-canvas drawer: explored visually, then rejected because users normally keep Settings navigation open.
- Statistics-only custom opener inside `TokenUsageStatistics.vue`: rejected because the toggle is overall Settings-shell behavior and managers should not own navigation.
- `×` or double chevrons: rejected; exact Agents panel icon is required in both states.

## Derived Layering Check

No new application layer is introduced. The split is within one frontend Settings subsystem: governing page -> presentational navigation/header -> existing manager. The shared icon is a leaf visual primitive.

## Design Review Checklist

- Approved requirements/UI behavior reflected: Yes.
- Normally-open vs Token Statistics contextual collapse explicit: Yes.
- No rail/overlay/backdrop/alternate icon: Yes.
- Exact Back-row placement and no redundant Settings label: Yes.
- One authoritative navigation/context resolver and one owner/selection policy: Yes.
- Narrow behavior, typed focus APIs, and stable ARIA region/state contracts addressed: Yes.
- Removals/refactor sequence explicit: Yes.
- Persisted data decision: Not affected.
