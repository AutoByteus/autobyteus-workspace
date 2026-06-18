# Design Spec

## Current-State Read

The default desktop shell is rendered by `autobyteus-web/layouts/default.vue`. It chooses one of two left-navigation presentations:

- expanded panel: `autobyteus-web/components/AppLeftPanel.vue`
- collapsed icon strip: `autobyteus-web/components/layout/LeftSidebarStrip.vue`

Both components currently own their own copy of the same shell primary navigation policy:

- `PrimaryNavKey` union
- `allPrimaryNavItems`
- route target mapping
- active-route matching
- Applications capability filtering

`Media` is one of those duplicated primary nav items and routes to `/media`. The media page itself (`autobyteus-web/pages/media.vue`) is a real feature surface, so removing the menu item should not delete the route/page or backend media behavior in this task.

Node management is already owned by `autobyteus-web/components/settings/NodeManager.vue`. That component initializes and uses node-related stores and renders the existing Manage Nodes / Phone Setup / Docker Guide tabs. It already reads `route.query.nodeTab`, so it can be mounted under a dedicated `/nodes` page without duplicating node-management logic.

`autobyteus-web/pages/settings.vue` currently treats nodes as one settings section. The approved product direction is a clean move: `Nodes` becomes a top-level shell item only and is removed from the Settings sidebar/section routing. Therefore `/settings?section=nodes` should no longer be retained as a hidden legacy access path.

## Intended Change

Promote `Nodes` to top-level home/workspace shell navigation, remove `Media` from that primary navigation, and remove `Nodes` from Settings. The target experience is:

- Home/workspace primary nav has `Nodes` where `Media` used to be, after `Memory`.
- Clicking `Nodes` routes to `/nodes`.
- `/nodes` renders the existing `NodeManager` feature owner.
- Settings no longer lists or routes to `Nodes`.
- `/media` remains deep-linkable but is no longer discoverable from primary shell nav.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes`
- Evidence: `AppLeftPanel.vue` and `LeftSidebarStrip.vue` duplicate the same primary nav item list and route/active-state policy. The requested change would otherwise require parallel edits in both files and preserve drift risk.
- Design response: Extract a shared shell primary navigation owner, then have both sidebar presentation components consume it. Add `/nodes` as a page wrapper around `NodeManager`. Remove `nodes` from settings section ownership.
- Refactor rationale: This is not a broad redesign. The refactor is required because the exact policy being changed is duplicated in two active shell components.
- Intentional deferrals and residual risk, if any: `pages/media.vue` and backend media behavior remain. Residual risk is that users with bookmarked `/media` can still access media library; this is intentional because the request is menu removal, not media decommission.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. Shell primary navigation spine
2. Node-management page reuse spine
3. Subsystem allocation
4. File responsibility mapping
5. Removal/decommission mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove settings-level `Nodes` navigation and section routing. Do not keep `/settings?section=nodes` as a hidden compatibility route.
- Media distinction: Removing the `Media` shell item is in scope; deleting the `/media` page or media subsystem is out of scope.
- Decision rule: Do not implement duplicate `Nodes` access through both `/nodes` and Settings.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User views/clicks shell primary nav | `/nodes` page renders `NodeManager` | Shared shell primary navigation owner + Nuxt router | Governs the promoted Nodes access path. |
| DS-002 | Primary End-to-End | User views shell primary nav | No Media item rendered | Shared shell primary navigation owner | Governs removal of Media from primary discoverability. |
| DS-003 | Primary End-to-End | User opens Settings | Settings page without Nodes section | Settings page section owner | Governs clean move out of Settings and rejects duplicate access. |
| DS-004 | Return-Event | Route changes to `/nodes` or another primary route | Active nav styling updates | Shared shell primary navigation owner | Keeps active state consistent between expanded and collapsed sidebars. |
| DS-005 | Primary End-to-End | Mobile runtime attempts `/nodes` | Unsupported desktop-settings redirect | Mobile feature gate | Prevents desktop-only node management from leaking into mobile remote runtime. |

## Primary Execution Spine(s)

- `Expanded Shell Panel -> Shared Primary Navigation Model -> Router Push(/nodes) -> Nodes Page -> NodeManager`
- `Collapsed Shell Strip -> Shared Primary Navigation Model -> Router Push(/nodes) -> Nodes Page -> NodeManager`
- `Settings Page -> Settings Section Model -> Non-node settings sections only`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user clicks the `Nodes` shell item from either sidebar presentation. The presentation delegates route resolution to the shared primary nav owner, then Nuxt routes to `/nodes`, which mounts `NodeManager`. | Shell sidebar, shared primary nav, router, nodes page, NodeManager | Shared shell primary navigation owner | Applications feature filtering, localization labels, icon selection |
| DS-002 | The primary navigation item list no longer contains `Media`, so neither sidebar presentation renders it. `/media` itself remains available by direct URL. | Shared primary nav, sidebar presentations | Shared shell primary navigation owner | Media page remains out-of-menu |
| DS-003 | Settings page renders settings-specific sections only. The old `nodes` section is removed from sidebar buttons, valid section normalization, imports, and content mounting. | Settings page section owner | Settings page | Docs/copy updates for new top-level Nodes path |
| DS-004 | Active nav checks come from the same shared function used by both shell presentations. `/nodes` activates `Nodes`; `/media` no longer activates a primary item. | Route, shared active matcher, sidebars | Shared shell primary navigation owner | No duplicated switch statements |
| DS-005 | Mobile route middleware classifies `/nodes` as desktop settings functionality and redirects to the mobile home with unsupported feature metadata. | Mobile feature gate, route middleware | Mobile feature gate | None |

## Spine Actors / Main-Line Nodes

- Default shell layout
- Expanded sidebar presentation (`AppLeftPanel`)
- Collapsed sidebar presentation (`LeftSidebarStrip`)
- Shared shell primary navigation owner
- Nuxt router / route middleware
- Dedicated `/nodes` page
- Existing `NodeManager`
- Settings page section owner

## Ownership Map

| Actor / Node | Owns |
| --- | --- |
| `useShellPrimaryNavigation` / shared nav owner | Primary shell nav item identities, labels, icons, route targets, active-route matching, feature availability filtering. |
| `AppLeftPanel.vue` | Expanded panel presentation, run tree composition, click forwarding to shared nav route target. |
| `LeftSidebarStrip.vue` | Collapsed icon-strip presentation, click forwarding to shared nav route target, left-panel expand behavior. |
| `pages/nodes.vue` | Page-level mount point for the existing node-management feature in the default shell layout. |
| `NodeManager.vue` | Node-management behavior, tabs, node registry actions, remote browser sharing, phone access, Docker guide. |
| `pages/settings.vue` | Settings-only section navigation and settings feature composition; no longer owns node management. |
| `mobileFeatureGates.ts` | Desktop/mobile feature availability classification by route. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/nodes.vue` | `NodeManager.vue` | Provides a top-level route and shell placement for node management. | Node registry actions, tab state rules beyond passing route query through, remote browser sharing policy. |
| `AppLeftPanel.vue` primary button loop | Shared shell primary navigation owner | Expanded visual presentation. | Primary nav identity/route/active policy. |
| `LeftSidebarStrip.vue` primary button loop | Shared shell primary navigation owner | Collapsed visual presentation. | Primary nav identity/route/active policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `media` from shell primary nav items | User no longer wants Media as first-level menu item. | No replacement in nav; `/media` remains route-only. | In This Change | Remove from shared nav model, not from media subsystem. |
| Duplicate primary nav definitions in `AppLeftPanel.vue` and `LeftSidebarStrip.vue` | Shared owner will define the policy once. | `useShellPrimaryNavigation` or equivalent shared nav owner. | In This Change | Remove duplicated union/list/switches from presentation components. |
| Settings sidebar `Nodes` button | Approved clean move makes Nodes top-level only. | Top-level `/nodes` route. | In This Change | Remove button from template. |
| `nodes` settings section in `SettingsSection`, `validSections`, and content mount | Hidden `/settings?section=nodes` would be legacy duplicate access. | `/nodes` page. | In This Change | Unknown `section=nodes` should fall back to default settings behavior. |
| `NodeManager` import in `pages/settings.vue` | Settings no longer mounts node management. | `pages/nodes.vue`. | In This Change | Keep `NodeManager.vue` itself. |
| `shell.navigation.media` labels if no longer referenced | Removed menu item should not leave unused shell label. | `shell.navigation.nodes`. | In This Change | Remove or leave only if tests/localization tooling requires; prefer removal if unused. |
| User-facing copy saying `Settings -> Nodes` | Stale after clean move. | `Nodes` / `Nodes -> <tab>` copy. | In This Change / Docs Sync | Source-code strings should change during implementation; durable docs under docs sync stage. |

## Return Or Event Spine(s) (If Applicable)

- Route state return/event spine: `router.push(target)` -> route updates -> shared `isPrimaryNavActive(route.path, key)` recomputes -> both sidebar presentations highlight the same active item.

## Bounded Local / Internal Spines (If Applicable)

- `NodeManager` tab local spine: `route.query.nodeTab` -> `initialActiveTab()` / watcher -> `activeTab` -> tab panel render. This remains owned by `NodeManager` and must not be reimplemented in `pages/nodes.vue`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization labels | DS-001, DS-002 | Shared shell nav owner and settings page | Provide `Nodes` labels in English and Chinese; remove stale `Media` shell label if unused. | UI labels must be locale-safe. | Hard-coded strings or inconsistent locales. |
| Applications feature filtering | DS-001, DS-004 | Shared shell nav owner | Preserve existing Applications nav visibility behavior. | Existing nav has runtime/capability filtering. | Regression by always showing Applications. |
| Mobile route gating | DS-005 | Mobile feature gate | Treat `/nodes` like desktop settings. | Prevent unsupported mobile route. | Mobile users can reach desktop-only UI or get confusing blank state. |
| Docs/source copy sync | DS-003 | Settings/navigation IA | Replace `Settings -> Nodes` references. | Clean move changes the way users find Nodes. | Documentation tells users to click a removed menu. |
| Media route preservation | DS-002 | Media page owner | Keep `/media` behavior out of scope. | Menu removal is not feature deletion. | Accidental broad media regression. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Node management UI | `components/settings/NodeManager.vue` | Reuse | Already owns node registry, tabs, sharing, phone setup, Docker guide. | N/A |
| Shell navigation policy | Shell layout/navigation components | Extend / extract | Policy exists but is duplicated; extract into shared owner. | N/A |
| Mobile unsupported route classification | `utils/mobileFeatureGates.ts` | Extend | Existing owner maps desktop-only routes to feature gates. | N/A |
| Media page | `pages/media.vue` + stores | Reuse unchanged | Not being decommissioned. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Shell navigation | Primary nav item model, routing, active matching, feature filtering | DS-001, DS-002, DS-004 | Default shell sidebars | Extend | Add shared owner. |
| Node management | Node registry UI and actions | DS-001 | NodeManager | Reuse | Add page wrapper only. |
| Settings page | Settings sections excluding nodes | DS-003 | Settings page | Modify | Remove nodes section. |
| Mobile route gating | Desktop/mobile route support decisions | DS-005 | Middleware | Extend | Add `/nodes`. |
| Localization | User-facing labels | DS-001, DS-003 | Shell/settings/docs | Modify | Add `nodes`, remove stale `media`/settings nodes labels if unused. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Shell navigation | Shared primary nav owner | Primary nav model and route helpers consumed by both sidebars. | Nav policy is reactive due Applications capability store and runtime feature gate. | N/A |
| `autobyteus-web/pages/nodes.vue` | Node management route | Thin page facade | Mount existing `NodeManager` in default layout. | Page route wrapper only. | Uses `NodeManager`. |
| `autobyteus-web/components/AppLeftPanel.vue` | Shell navigation presentation | Expanded presentation | Render shared primary nav and navigate using shared route target. | Visual composition plus run tree remains here. | Uses shared nav owner. |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Shell navigation presentation | Collapsed presentation | Render shared primary nav and navigate using shared route target. | Visual icon-strip behavior remains here. | Uses shared nav owner. |
| `autobyteus-web/pages/settings.vue` | Settings page | Settings section owner | Remove nodes section/import/content and keep remaining sections. | Existing settings page owner. | N/A |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile route gating | Route feature mapper | Map `/nodes` to `desktopSettings`. | Existing gate owner. | N/A |
| Localization files | Localization | Shell/settings labels | Add `shell.navigation.nodes`; remove stale nav/settings node labels if unused. | Existing locale catalogs. | N/A |
| Tests | Test suite | Component/middleware tests | Assert Nodes present, Media absent, shared nav behavior, `/nodes` gate. | Existing colocated test pattern. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Primary nav key/list/route/active logic repeated in two components | `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Shell navigation | Same policy drives expanded and collapsed sidebar presentations. | Yes | Yes | Generic routing helper for unrelated routes. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ShellPrimaryNavItem` | Yes | Yes | Low | Keep fields limited to `key`, `labelKey`, `icon`; keep route/active behavior as functions rather than redundant per-item route fields if simpler. |
| `ShellPrimaryNavKey` | Yes | Yes | Low | Include only active shell primary items: `agents`, `agentTeams`, `applications`, `skills`, `memory`, `nodes`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Shell navigation | Shared primary nav owner | Export primary nav items, route resolution, active matching, and readiness bootstrap while preserving Applications capability filtering. | One shared owner replaces duplicated policy. | N/A |
| `autobyteus-web/pages/nodes.vue` | Node management route | Thin page facade | Render `NodeManager` as top-level page. | Keeps page routing separate from feature behavior. | `NodeManager` |
| `autobyteus-web/components/AppLeftPanel.vue` | Shell presentation | Expanded sidebar | Render shared primary nav; no local nav policy. | Still owns expanded layout/run tree. | `useShellPrimaryNavigation` |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Shell presentation | Collapsed sidebar | Render shared primary nav; no local nav policy. | Still owns collapsed icon strip behavior. | `useShellPrimaryNavigation` |
| `autobyteus-web/pages/settings.vue` | Settings page | Settings section owner | Remove nodes section and keep valid settings sections. | Existing settings composition owner. | N/A |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile gating | Route feature mapper | Classify `/nodes` as `desktopSettings`. | Existing route-gate owner. | N/A |
| `autobyteus-web/localization/messages/en/shell.ts` | Localization | English shell labels | Add `shell.navigation.nodes`; remove `shell.navigation.media` if unused. | Existing catalog owner. | N/A |
| `autobyteus-web/localization/messages/zh-CN/shell.ts` | Localization | Chinese shell labels | Add `shell.navigation.nodes`; remove `shell.navigation.media` if unused. | Existing catalog owner. | N/A |
| `autobyteus-web/localization/messages/en/settings.ts` / `zh-CN/settings.ts` | Localization | Settings labels | Remove `settings.page.sections.nodes` if no longer referenced. | Prevent stale settings section label. | N/A |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | Tests | Expanded nav regression | Update for shared nav and Nodes/Media behavior. | Existing test owner. | Shared nav owner likely imported/observed. |
| `autobyteus-web/components/layout/__tests__/LeftSidebarStrip.spec.ts` | Tests | Collapsed nav regression | Assert Nodes present, Media absent, Applications filtering preserved. | Existing test owner. | Shared nav owner indirectly. |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Tests | Settings page regression | Assert Nodes removed; `section=nodes` no longer activates node section. | Existing settings tests. | N/A |
| `autobyteus-web/middleware/__tests__/mobileFeatureGate.global.spec.ts` | Tests | Mobile gate regression | Assert `/nodes` redirects as unsupported `desktopSettings`. | Existing gate tests. | N/A |

## Ownership Boundaries

The authoritative boundary for shell primary navigation becomes the shared nav owner. Sidebar components are presentations and must not each redefine item identity, route targets, or active-state rules.

The authoritative boundary for node-management behavior remains `NodeManager.vue`. The new `/nodes` page is only a route/page facade; it must not reimplement add/rename/remove node actions, remote browser sharing state, phone setup, or Docker guide behavior.

The authoritative boundary for settings navigation remains `pages/settings.vue`; after this change it no longer owns node management as a settings section.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Shared shell primary navigation owner | nav list, feature filter, route resolver, active matcher | `AppLeftPanel`, `LeftSidebarStrip` | Recreating nav switch statements inside sidebars | Add focused helpers to shared nav owner. |
| `NodeManager.vue` | node stores, add/rename/remove/focus actions, tab query sync | `pages/nodes.vue` | Page wrapper directly manipulating node stores for page-specific behavior | Extend `NodeManager` props/API only if a real page-level need appears. |
| `pages/settings.vue` | settings section list and normalization | Settings route | Hidden `nodes` section retained for compatibility | Route users to `/nodes`; remove old section. |
| `mobileFeatureGates.ts` | route-to-feature mapping | mobile route middleware | Local `/nodes` special-case in middleware | Extend central mapper. |

## Dependency Rules

Allowed:

- `AppLeftPanel.vue` and `LeftSidebarStrip.vue` may depend on the shared shell primary navigation owner.
- `pages/nodes.vue` may depend on `NodeManager.vue`.
- `NodeManager.vue` may continue depending on node, remote browser sharing, and window-node stores.
- `mobileFeatureGate.global.ts` may depend on `mobileFeatureForRouteLocation()`.

Forbidden:

- Do not keep duplicated `PrimaryNavKey`, item list, route resolver, or active matcher in either sidebar.
- Do not keep `NodeManager` mounted by `pages/settings.vue`.
- Do not add compatibility redirect or dual-path support from `/settings?section=nodes` to `/nodes` unless explicitly requested; unknown sections should follow existing settings fallback behavior.
- Do not remove media backend/storage/tool behavior in this change.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useShellPrimaryNavigation()` | Shell primary navigation | Return nav items and helper functions for shell sidebars. | `ShellPrimaryNavKey`; route path string for active checks. | Keep subject-specific to shell primary nav. |
| `resolvePrimaryRoute(key)` | Shell primary navigation | Map primary nav key to route target. | `ShellPrimaryNavKey` | `nodes` -> `/nodes`; no `media` key. |
| `isPrimaryNavActive(key)` or `isShellPrimaryNavActive(key, route.path)` | Shell primary navigation | Active state for shell item. | `ShellPrimaryNavKey`, current route path. | `nodes` active on `/nodes`. |
| `/nodes?nodeTab=<tab>` | Nodes page / NodeManager | Top-level node-management route and tab state. | `nodeTab` in `manage`, `phoneSetup`, `dockerGuide`. | Owned by `NodeManager`. |
| `mobileFeatureForRouteLocation({ path, query })` | Mobile feature gating | Map routes to desktop/mobile feature availability. | Route path and query. | `/nodes` -> `desktopSettings`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `useShellPrimaryNavigation()` | Yes | Yes | Low | Keep scope to primary shell nav only. |
| `/nodes` page | Yes | Yes | Low | Mount `NodeManager` only. |
| `SettingsSection` | Yes after nodes removal | Yes | Low | Remove `nodes` from union and valid set. |
| `mobileFeatureForRouteLocation` | Yes | Yes | Low | Add explicit `/nodes` branch. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Top-level node access | `Nodes` | Yes | Low | Use `shell.navigation.nodes`. |
| Shared nav owner | `useShellPrimaryNavigation` | Yes | Low | Avoid generic `useNavigation`. |
| Node page | `pages/nodes.vue` | Yes | Low | Keep plural matching user-facing label. |
| Media route | `pages/media.vue` | Yes | Low | Leave page unchanged. |

## Applied Patterns (If Any)

- Shared composable: used as an authoritative UI navigation policy owner with reactive feature filtering.
- Thin page facade: `/nodes` wraps `NodeManager` without owning node operations.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts` | File | Shell primary navigation | Shared primary nav state/model/helpers. | Composables already house shell/UI state helpers such as `useLeftPanel`. | Node-management actions, settings section logic, generic route registry. |
| `autobyteus-web/pages/nodes.vue` | File | Nodes route facade | Top-level Nuxt route mounting `NodeManager`. | Nuxt page convention. | Node operation logic. |
| `autobyteus-web/components/AppLeftPanel.vue` | File | Expanded sidebar presentation | Visual expanded nav + run tree. | Existing owner for expanded panel. | Local nav model/route switch. |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | File | Collapsed sidebar presentation | Visual collapsed nav. | Existing owner for collapsed icon strip. | Local nav model/route switch. |
| `autobyteus-web/pages/settings.vue` | File | Settings section page | Settings navigation excluding Nodes. | Existing settings owner. | NodeManager import/mount, nodes valid section. |
| `autobyteus-web/utils/mobileFeatureGates.ts` | File | Mobile feature gate | Route feature mapping. | Existing owner for this policy. | Page-specific routing hacks. |
| `autobyteus-web/localization/messages/*/shell.ts` | File | Shell labels | `Nodes` label. | Existing shell catalog. | Settings copy. |
| `autobyteus-web/localization/messages/*/settings.ts` | File | Settings labels | Settings labels excluding nodes. | Existing settings catalog. | Unused `nodes` settings label. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `composables/` | Off-Spine Concern | Yes | Low | Existing pattern for reusable UI state/policy; shared nav owner fits. |
| `pages/` | Transport / route facade | Yes | Low | `/nodes` is a page wrapper only. |
| `components/settings/` | Main-Line Feature UI | Yes | Low | `NodeManager` remains here for now because it is the established owner; moving it is not necessary for this task. |
| `components/layout/` and root components | Presentation | Yes | Medium | Risk is duplicated policy; corrected by shared nav owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shared nav use | `const { primaryNavItems, resolvePrimaryRoute, isPrimaryNavActive, ensurePrimaryNavigationReady } = useShellPrimaryNavigation()` in both sidebar components. | Two components each define `case 'nodes': return '/nodes'` and both remember to delete `media`. | Prevents recurrence of duplicated policy. |
| Nodes page | `<template><div class="h-full"><NodeManager /></div></template>` | Rebuilding add-node/phone/Docker UI directly in `pages/nodes.vue`. | Keeps `NodeManager` authoritative. |
| Settings removal | Remove `nodes` from `SettingsSection` and `validSections`. | Keep hidden `/settings?section=nodes` because old links may exist. | User approved clean move; no legacy duplicate access. |
| Media removal | Remove `media` from shell nav only. | Delete `pages/media.vue`, media store, and backend media APIs. | Avoids over-scoping from menu preference to feature deletion. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `Nodes` in Settings and also add `/nodes` | Lower-risk transition and old docs still work. | Rejected | User approved recommended clean move. Remove Settings entry and section routing. |
| Redirect `/settings?section=nodes` to `/nodes` | Preserve deep links. | Rejected | Treat `section=nodes` as invalid/unknown and fall back to existing settings default. Update docs/copy. |
| Keep duplicated sidebar nav logic and edit both places | Smallest patch. | Rejected | Extract shared shell primary navigation owner. |
| Delete `/media` page entirely | User says Media unused. | Rejected | Remove only primary nav item; leave route/subsystem intact. |

## Derived Layering (If Useful)

- Shell policy layer: `useShellPrimaryNavigation`
- Presentation layer: `AppLeftPanel`, `LeftSidebarStrip`
- Route facade layer: `pages/nodes.vue`
- Feature UI layer: `NodeManager`
- Settings page layer: `pages/settings.vue`
- Runtime gate utility: `mobileFeatureGates.ts`

## Migration / Refactor Sequence

1. Add shared shell primary navigation owner with the target nav keys: `agents`, `agentTeams`, `applications`, `skills`, `memory`, `nodes`.
2. Preserve existing Applications feature availability behavior inside that shared owner.
3. Update `AppLeftPanel.vue` to consume the shared nav owner and remove local nav list/route/active logic.
4. Update `LeftSidebarStrip.vue` to consume the shared nav owner and remove local nav list/route/active logic.
5. Add `pages/nodes.vue` as a thin wrapper around `NodeManager`.
6. Remove Settings `Nodes` sidebar item, `NodeManager` import/mount, `nodes` union member, and `nodes` from `validSections` in `pages/settings.vue`.
7. Update shell/settings localization catalogs.
8. Add `/nodes` to mobile feature gate mapping as `desktopSettings`.
9. Update source-code copy that points users to `Settings -> Nodes` to use `Nodes` / `Nodes -> <tab>`.
10. Update tests for nav presence/absence, shared navigation, settings removal, mobile gate, and NodeManager page query behavior.
11. Leave `/media` page and media subsystem code unchanged.

## Key Tradeoffs

- Centralizing nav policy is slightly larger than editing two components, but it directly addresses the duplicated policy exposed by the request.
- Removing settings access is cleaner IA but requires docs/copy updates; this is approved by the user.
- Keeping `/media` deep-linkable avoids over-scoping. Full media decommission can be a separate future task if desired.

## Risks

- If any tests/source comments still assume `Settings -> Nodes`, they may fail or remain stale. Mitigation: search/update exact references during implementation and docs sync.
- `NodeManager` currently lives under `components/settings/`; top-level `/nodes` reuses it from that path. This is acceptable for scope but creates mild naming/path drift. Do not move the component in this task unless implementation reveals import/path confusion that is cheap to fix.
- Static source tests may need modernization because the nav policy moves out of `AppLeftPanel.vue`.

## Guidance For Implementation

- Do not alter node-management store/API behavior.
- Prefer `heroicons:circle-stack` (or equivalent existing nodes icon family) for shell `Nodes` icon.
- Preserve the `nodeTab` query contract from `NodeManager`.
- Use explicit tests rather than screenshots for acceptance where possible:
  - shared nav owner has `nodes`, no `media`
  - expanded sidebar shows Nodes and not Media
  - collapsed strip shows Nodes and not Media
  - clicking Nodes routes to `/nodes`
  - `/nodes?nodeTab=phoneSetup` selects Phone Setup
  - settings no longer shows Nodes and `section=nodes` does not activate it
  - mobile gate redirects `/nodes` as `desktopSettings`
- Run focused frontend tests first, then broader `pnpm test:nuxt` if feasible.
