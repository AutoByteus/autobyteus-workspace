# Design Spec

## Current-State Read

The current mobile experience is mounted under `autobyteus-web/pages/mobile.vue`, which is a thin route wrapper around `MobileRemoteAccessShell`. The shell owns paired-state routing and switches between `MobileHome`, `MobileWorkShell`, and troubleshooting. `MobileWorkShell` owns the phone work frame: compact header, optional team focus bar, task surface, and bottom nav.

The current redundant-copy behavior is mostly local to mobile components:

- `MobileHome.vue` hardcodes Home section labels and a large blue `Primary next action` shortcut.
- `MobileWorkShell.vue` uses `mobileWorkContextSubtitle()` from `types/mobileWork.ts`; the helper appends `Agent run` / `Team run` to compact run metadata.
- `MobileActivityDigest.vue` owns the aggregate `all` filter locally.
- `MobileTools.vue` owns the default Terminal/VNC wrapper copy.
- `MobileTeamMemberFocusBar.vue` owns the visible target label/current/explanation while focus behavior is delegated to `useMobileTeamMemberFocusCoordinator`.

The chat scroll defect crosses component boundaries. The mobile shell creates a fixed-height work frame, `MobileChat` mounts shared `AgentEventMonitor` / `AgentTeamEventMonitor`, and `AgentEventMonitor` splits conversation feed from composer. The transcript should be the only scroll owner, but not every flex boundary currently asserts `min-h-0`, `overflow-hidden`, and `shrink-0`, so mobile browsers/WebView can scroll the whole page and expose blank space under controls.

The Android icon defect is local to adaptive icon resources. `AndroidManifest.xml` references `@mipmap/ic_launcher`; `ic_launcher.xml` references a blue background and `ic_launcher_foreground.xml`. The foreground vector draws the full logo nearly edge-to-edge inside a 108dp viewport, outside common adaptive icon mask safe areas.

Constraints: preserve desktop behavior, avoid backend protocol changes, preserve accessibility semantics, and do not introduce old/new compatibility modes. Core stores and APIs are not part of the behavioral change; mobile UI may consume existing store state, but this design must not alter core store semantics or desktop journey behavior.

## Intended Change

Simplify the mobile shell by removing redundant visible copy and duplicate action surfaces in the existing mobile owners, tighten compact mobile work metadata in the single mobile helper, remove Activity's aggregate `All` view, keep only actionable helper text in Tools, simplify team target selection while preserving focus behavior, enforce chat scroll containment through a mobile-scoped layout path, and rescale the Android launcher foreground into the adaptive icon safe zone.

Mobile-only isolation rule: do not change backend services, GraphQL/REST/WebSocket contracts, runtime behavior, or core store semantics. Desktop/web UI behavior must remain unchanged. If a shared UI component is touched for scroll containment, the change must either be an opt-in mobile prop/class used only by `MobileChat`/`MobileWorkShell`, or be proven behavior-neutral for existing desktop callers by focused checks.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination for redundant copy/action surfaces; Missing Invariant / Local Implementation Defect for chat scroll containment; Local Implementation Defect for Android adaptive icon sizing.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted local refactor only.
- Evidence: `MobileHome.vue` duplicates recent/current work action; `types/mobileWork.ts` appends run type centrally; `MobileActivityDigest.vue` has local `all`; shared monitors lack complete flex overflow invariant; launcher foreground fills most of 108dp viewport.
- Design response: Edit existing mobile owners and keep any shared monitor layout adjustment mobile-scoped or behavior-neutral. Remove duplicate action plumbing, tighten helper output, remove aggregate state, add accessible compact picker presentation, and resize icon vector. Do not create new mobile routes, backend APIs, or store semantics.
- Refactor rationale: The change would become brittle if each caller stripped copy independently. The centralized mobile subtitle helper is the right owner for compact metadata. For chat scroll containment, prefer a mobile-scoped monitor frame/opt-in layout over changing desktop defaults.
- Intentional deferrals and residual risk, if any: No backend/native credential/storage work in this ticket. Real-device Android icon validation may be completed by API/E2E if implementation cannot access a device.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove redundant mobile presentation paths rather than hiding them behind a compatibility flag.
- Obsolete paths in scope: Home primary-action shortcut/plumbing, `All` Activity filter state, visible `Agent run` / `Team run` suffix in compact mobile metadata, routine Tools/VNC helper copy, visible team-target label/current/explanation copy, oversized Android icon foreground scale.
- The design must not keep old and new mobile variants in parallel.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MOB-001 | Primary End-to-End | Paired phone opens `/mobile` | User sees compact Home / Work task shell | `MobileRemoteAccessShell` with child mobile components | Defines where visible mobile copy and action surfaces are governed. |
| DS-MOB-002 | Primary End-to-End | User opens a team run Chat/Files/Activity tab | Focused member target can be viewed/changed without redundant copy | `MobileTeamMemberFocusBar` + focus coordinator | Defines target-selector ownership and accessibility. |
| DS-MOB-003 | Primary End-to-End | User reads/sends chat on phone | Transcript scrolls while composer/nav stay anchored | `MobileWorkShell` + shared monitor layout owners | Defines layout invariant for chat scroll fix. |
| DS-MOB-004 | Primary End-to-End | User opens mobile Activity | User chooses concrete Activity category | `MobileActivityDigest` | Defines removal of aggregate `All` view. |
| DS-MOB-005 | Primary End-to-End | User opens mobile Tools | Terminal/VNC appear with only actionable setup/error copy | `MobileTools` | Defines Tools copy simplification without changing tool protocols. |
| DS-AND-001 | Primary End-to-End | Android launcher displays app icon | Complete logo appears within launcher mask | Android adaptive icon resources | Defines native icon resource fix. |

## Primary Execution Spine(s)

- DS-MOB-001: `/mobile route -> MobileRemoteAccessShell -> MobileHome / MobileWorkShell -> mobile child component -> visible compact UI`
- DS-MOB-002: `MobileWorkShell active team tab -> MobileTeamMemberFocusBar -> MobileLaunchTargetPicker sheet / focus coordinator -> mobileWorkStore remembered focus -> compact target display`
- DS-MOB-003: `MobileWorkShell fixed viewport frame -> MobileChat -> AgentEventMonitor / AgentTeamEventMonitor -> AgentConversationFeed scroll owner -> AgentUserInputForm composer -> MobileWorkShell bottom nav`
- DS-MOB-004: `MobileActivity -> MobileActivityDigest -> concrete filter state -> task/message/tool cards`
- DS-MOB-005: `MobileTools -> selected workspace resolution -> Terminal / VncViewer wrapper -> tool surface`
- DS-AND-001: `AndroidManifest icon -> mipmap adaptive icon -> drawable background/foreground -> launcher mask`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MOB-001 | The mobile route enters the remote-access shell, which chooses Home or Work and delegates visible copy to the relevant mobile component. | `/mobile`, `MobileRemoteAccessShell`, `MobileHome`, `MobileWorkShell` | `MobileRemoteAccessShell` for screen routing; child components for local copy | Catalog refresh, status diagnostics, accessibility labels |
| DS-MOB-002 | The work shell shows the team focus bar only where focus affects content. The bar displays the selected member compactly and opens the searchable picker to change focus. | `MobileWorkShell`, `MobileTeamMemberFocusBar`, `MobileLaunchTargetPicker`, focus coordinator | `MobileTeamMemberFocusBar` for presentation; coordinator/store for state | Accessible label, remembered focus, error copy |
| DS-MOB-003 | The work shell owns the viewport frame. The monitor owns transcript/composer split. The transcript feed is the only scroll container, while composer and nav shrink but stay anchored. | `MobileWorkShell`, `MobileChat`, `AgentEventMonitor`, `AgentConversationFeed`, composer | Shared monitor layout owners inside the mobile frame | Safe-area padding, desktop monitor smoke checks |
| DS-MOB-004 | Activity starts in a concrete category and renders only selected category cards; issue filters remain secondary filters over tool activity. | `MobileActivity`, `MobileActivityDigest` | `MobileActivityDigest` | Store-derived counts, no-work context empty state |
| DS-MOB-005 | Tools resolves a workspace and shows Terminal/VNC wrappers. Default labels and routine guidance are removed; only no-workspace/setup/error guidance remains. | `MobileTools`, `Terminal`, `VncViewer` | `MobileTools` for wrapper copy | Workspace resolver, docs troubleshooting |
| DS-AND-001 | Android launcher reads the adaptive icon resources. The foreground art is centered/scaled inside the safe zone so common masks do not crop it. | Manifest, adaptive icon XML, foreground vector | Android resource files | Build/preview/device validation |

## Spine Actors / Main-Line Nodes

- `MobileRemoteAccessShell`: mobile screen routing and work selection orchestration.
- `MobileHome`: Home status/current/recent work presentation.
- `MobileWorkShell`: mobile viewport frame, header, tab surface, bottom nav.
- `MobileTeamMemberFocusBar`: team target compact presentation and change entrypoint.
- `MobileActivityDigest`: Activity category filter owner.
- `MobileTools`: Terminal/VNC mobile wrapper.
- `AgentEventMonitor` / `AgentTeamEventMonitor`: shared transcript/composer layout owners.
- `AgentConversationFeed`: transcript scroll owner.
- Android launcher resource XML: app icon presentation owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `MobileRemoteAccessShell` | Paired-state screen lifecycle, context switcher lifecycle, Home/Work routing, catalog refresh calls. |
| `MobileHome` | Mobile Home visible content density and Home actions. |
| `types/mobileWork.ts` | Shared mobile work context identity and compact presentation labels. |
| `MobileWorkShell` | Fixed viewport frame, work header, tab surface, bottom nav, team focus-bar placement. |
| `MobileTeamMemberFocusBar` | Visible target display, target-change affordance, target-specific error copy. |
| `useMobileTeamMemberFocusCoordinator` / `mobileWorkStore` | Actual focused member state, hydration, remembering focus. |
| `MobileActivityDigest` | Activity filter state and card visibility. |
| `MobileTools` | Mobile tool wrapper copy and workspace resolution for Terminal. |
| `AgentEventMonitor` / `AgentTeamEventMonitor` | Shared monitor layout contract and delegation to feed/composer. |
| `AgentConversationFeed` | Conversation transcript scrolling and auto-stick-to-bottom. |
| Android icon XML | Launcher icon drawing and mask-safe sizing. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/mobile.vue` | `MobileRemoteAccessShell` | Nuxt route/head metadata entrypoint | Mobile screen routing or copy policy |
| `mipmap-anydpi-v26/ic_launcher.xml` | `ic_launcher_background.xml` + `ic_launcher_foreground.xml` | Android adaptive icon wrapper | Runtime app behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Home visible `Mobile Home` text | App identity and route context already visible. | `MobileHome` heading/status card. | In This Change | Preserve page/test semantics via test ids/aria where needed. |
| Home visible `Current node` label | Node name/URL/status pill identify the card. | `MobileHome` status card content. | In This Change | Keep status and URL. |
| Home visible `Current work context` label | Current work card title/subtitle identify content. | Current work card content. | In This Change | Add aria label if needed. |
| Home `Primary next action` button and `continueLatest` plumbing | Duplicates recent/current work rows and switcher. | Recent work rows + `Switch work` / `Choose work`. | In This Change | Remove unused `latestRunItem` export if no remaining callers. |
| Visible `Agent run` / `Team run` suffix in compact metadata | Redundant in mobile header/current-context card. | Compact `mobileWorkContextSubtitle()` status output. | In This Change | Do not strip at callers. |
| Activity `all` filter and visible `All` button | Duplicates concrete categories. | `tasks`, `messages`, `tools`, plus secondary issue filters. | In This Change | Default to `tasks`. |
| Tools eyebrow `Tools` and Terminal label `Workspace Terminal` | Bottom nav/tab and active tool already identify surface. | Tool tabs and workspace path/empty states. | In This Change | Keep selected workspace path. |
| Routine VNC host paragraph on default VNC surface | Not actionable in normal state. | Docs and error/setup copy. | In This Change | Keep no-workspace/setup guidance when applicable. |
| Visible `Message target`, `Current: ...`, and alignment explanation | Target row can show selected member + Change directly. | Compact target row with accessible label. | In This Change | Error copy remains visible when actionable. |
| Oversized adaptive icon foreground geometry | Causes launcher mask crop. | Centered safe-zone foreground vector. | In This Change | Background can remain blue. |

## Return Or Event Spine(s) (If Applicable)

- Team target change return/event: `MobileLaunchTargetPicker selection -> MobileTeamMemberFocusBar.handleFocusChange -> useMobileTeamMemberFocusCoordinator.focusMember -> agentTeamContextsStore focus/hydration -> mobileWorkStore.updateFocusedTeamMember -> compact target display updates`.
- Conversation scroll return/event: `conversation messages update -> AgentConversationFeed onUpdated -> stick-to-bottom if pinned -> transcript scrollTop changes only inside feed container`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentConversationFeed`.
  - `Scroll event -> updatePinnedStateFromScrollPosition -> onUpdated -> syncAutoScrollIfPinned -> scrollToBottom`.
  - This bounded local spine matters because the feed can only own auto-scroll if its parent gives it a bounded height.
- Parent owner: `MobileActivityDigest`.
  - `Filter button click -> activeFilter -> showTasks/showMessages/showTools/toolFilter -> visible cards`.
  - This remains local and should not become store/backend state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Accessibility labels / visually-hidden text | DS-MOB-001, DS-MOB-002, DS-MOB-005 | Mobile presentation components | Preserve semantics when visible labels are removed. | Copy removal must not harm screen readers. | Visible redundant text may return or accessibility may regress. |
| Mobile catalog refresh | DS-MOB-001 | `MobileRemoteAccessShell` | Load recent/agent/team/workspace choices. | Existing data source for Home rows. | Would mix data refresh into copy components. |
| Focus hydration | DS-MOB-002 | Focus coordinator/store | Keep selected team member hydrated and remembered. | Target display depends on valid focus. | Presentation component would own runtime state. |
| Desktop monitor smoke checks | DS-MOB-003 | Shared monitor components | Verify desktop behavior if any shared monitor file changes. | Shared component may be touched for mobile opt-in containment. | Mobile fix could silently break desktop if applied globally. |
| Android build/preview evidence | DS-AND-001 | Android resources | Show icon is mask-safe. | Static XML alone may not prove launcher behavior. | Delivery may claim unverified native visual change. |
| Docs sync | All | Delivery/doc owners | Align remote-access and Android validation docs. | User-visible contract changes. | Docs would describe removed copy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Mobile Home copy/action cleanup | `components/mobile` | Reuse/Extend | Existing owner already isolates mobile shell from desktop. | N/A |
| Compact work metadata | `types/mobileWork.ts` | Extend | Existing helper is already used by Home/WorkShell. | N/A |
| Team target selection | `MobileTeamMemberFocusBar` + `MobileLaunchTargetPicker` + coordinator | Extend | Existing state and search picker should be reused. | N/A |
| Chat transcript layout | Shared monitor components | Extend | Existing monitor owns transcript/composer split. | N/A |
| Activity categories | `MobileActivityDigest` | Extend | Local filter owner. | N/A |
| Android icon | Android resources | Extend | Existing resource pipeline is correct; geometry is wrong. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile remote-access shell | Home/work routing, visible mobile copy density, task tabs | DS-MOB-001, DS-MOB-004, DS-MOB-005 | `MobileRemoteAccessShell`, child components | Extend | No new route/shell. |
| Mobile work context model | Work context identity and compact labels | DS-MOB-001 | `MobileWorkShell`, `MobileHome` | Extend | Tighten helper. |
| Team focus coordination | Focus state and compact target presentation | DS-MOB-002 | `MobileTeamMemberFocusBar`, coordinator | Extend | Presentation/state separation retained. |
| Shared event monitor | Transcript/composer layout | DS-MOB-003 | `AgentEventMonitor`, `AgentTeamEventMonitor`, `AgentConversationFeed` | Extend | Desktop checks required. |
| Android mobile shell resources | Launcher icon resources | DS-AND-001 | Android resource XML | Extend | No Kotlin change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `MobileHome.vue` | Mobile shell | Home presentation | Remove redundant labels/primary action and emits. | Home-only copy/action. | `MobileWorkListItem`, `mobileWorkContextTitle/subtitle` |
| `MobileRemoteAccessShell.vue` | Mobile shell | Screen orchestration | Remove `continueLatestRun` dependency if unused. | Shell owns Home event wiring. | `useMobileWorkCatalog` |
| `useMobileWorkCatalog.ts` | Mobile catalog | Catalog projection | Remove `latestRunItem` export if only used by removed action. | Catalog should not expose dead shortcut data. | Mobile context types |
| `types/mobileWork.ts` | Mobile work model | Presentation helper | Compact subtitle for run contexts. | Single helper owner. | N/A |
| `MobileActivityDigest.vue` | Mobile activity | Filter state/card visibility | Remove `all`, default to concrete category. | Activity-only UI state. | Stores |
| `MobileTools.vue` | Mobile tools | Tool wrapper | Remove routine copy; keep setup/empty copy. | Tools-only wrapper copy. | Workspace store |
| `MobileTeamMemberFocusBar.vue` | Team focus presentation | Target display/change | Remove visible label/current/explanation. | Focus-bar-specific presentation. | Coordinator, picker |
| `MobileLaunchTargetPicker.vue` | Mobile picker | Searchable picker | Optional label visibility / accessible label support if reused by focus bar. | Avoid duplicate selector logic. | N/A |
| `MobileWorkShell.vue` | Mobile work frame | Viewport layout | Enforce overflow hidden/safe-area as needed. | Shell frame owner. | Mobile task tabs |
| `MobileChat.vue` | Mobile chat | Chat surface | Ensure `overflow-hidden`/`min-h-0` root. | Chat-only boundary to monitors. | Shared monitors |
| `AgentEventMonitor.vue` | Shared monitor | Transcript/composer split | Only if needed: add opt-in/mobile-contained layout prop or behavior-neutral containment; desktop default unchanged. | Shared owner of monitor layout, but desktop behavior must remain stable. | Agent feed/form |
| `AgentTeamEventMonitor.vue` | Shared team monitor | Team-to-agent monitor wrapper | Only if needed: propagate opt-in/mobile-contained layout to nested monitor; desktop default unchanged. | Shared team wrapper, but mobile must not force desktop changes. | Agent monitor |
| `AgentConversationFeed.vue` | Shared monitor | Transcript scroll owner | Prefer no change; if changed, keep scroll behavior behavior-neutral and covered by checks. | Existing auto-scroll owner. | Conversation types |
| `ic_launcher_foreground.xml` | Android resources | Launcher foreground | Rescale logo into safe zone. | Resource-only defect. | Existing background |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compact work context subtitle | Existing `types/mobileWork.ts` | Mobile work model | Already reused by Home and WorkShell. | Yes | Yes | Per-caller string stripping |
| Searchable member picker | Existing `MobileLaunchTargetPicker.vue` | Mobile picker | Avoid duplicating picker/filter sheet logic for target focus. | N/A | N/A | Generic policy blob owning team focus state |
| Chat scroll containment classes | Existing monitor/shell files | Mobile/shared monitor layout | Layout invariant belongs at each owner, not a helper. | N/A | N/A | Utility class wrapper hiding ownership |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileWorkContext` | Yes | N/A | Low | No data-shape change. |
| `mobileWorkContextSubtitle()` | Yes after change | Yes | Low | Return compact status/path/profile metadata only. |
| `ActivityFilter` | Yes after `all` removal | Yes | Low | Remove aggregate `all`. |
| Android vector foreground | Yes | Yes | Low | Scale existing mark; no new asset family. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileHome.vue` | Mobile shell | Home presentation | Render compact Home status/current/recent work; no primary action. | Existing Home component. | Mobile work helpers |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Mobile shell | Screen routing | Remove obsolete primary-action event handler/wiring. | Existing orchestration owner. | Catalog composable |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile catalog | Catalog projection | Remove dead `latestRunItem` export if unused. | Keeps catalog API tight. | Mobile work context |
| `autobyteus-web/types/mobileWork.ts` | Mobile work model | Compact work metadata | Return status-only for run contexts. | Single shared helper. | N/A |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile activity | Category filters | Remove `all`; update card visibility. | Existing Activity owner. | Activity stores |
| `autobyteus-web/components/mobile/MobileTools.vue` | Mobile tools | Tool wrapper | Remove routine labels/copy; keep actionable empty state. | Existing Tools owner. | Workspace store, Terminal/VNC |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | Team focus presentation | Compact target selector | Show selected target + `Change`; visible error only when actionable. | Existing focus-bar owner. | Coordinator/picker |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Mobile picker | Searchable picker | Support non-visible accessible label if needed. | Existing picker owner. | N/A |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work frame | Layout frame | Enforce viewport and non-page-scroll containment. | Existing frame owner. | Task tabs |
| `autobyteus-web/components/mobile/MobileChat.vue` | Mobile chat | Chat tab boundary | Keep monitor root bounded. | Existing chat owner. | Shared monitors |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Shared monitor | Transcript/composer layout | Add `min-h-0`, `overflow-hidden`, composer `shrink-0`, feed `min-h-0 flex-1`. | Existing layout owner. | Feed/form |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Shared team monitor | Wrapper layout | Propagate bounded layout. | Existing team monitor owner. | Agent monitor |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Shared monitor | Scroll owner | Ensure scroll container is bounded and auto-scroll remains local. | Existing feed owner. | Conversation |
| `autobyteus-android/app/src/main/res/drawable/ic_launcher_foreground.xml` | Android resources | Launcher foreground | Center/scale logo into adaptive safe zone. | Existing resource owner. | Background XML |
| `autobyteus-web/components/mobile/__tests__/*.spec.ts` | Test coverage | Mobile behavior assertions | Update old-copy assertions and add new compact-copy/layout tests. | Existing coverage location. | Test utilities |
| `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-android/README.md` | Docs | User/validation docs | Align target selector/tools/icon validation wording or record no-impact. | Existing docs. | N/A |

## Ownership Boundaries

- Mobile presentation copy must remain below `components/mobile`; backend stores and GraphQL services must not learn about compact-copy policy.
- Work context metadata is governed by `types/mobileWork.ts`; Home/WorkShell must use the helper rather than locally editing run-type strings.
- Team focus state belongs to the coordinator/store; `MobileTeamMemberFocusBar` only presents current focus and invokes focus changes.
- Transcript scrolling belongs to `AgentConversationFeed`; shell/monitor parents must provide bounded height but must not own auto-scroll behavior.
- Android launcher icon shape belongs to resource XML; Kotlin/WebView runtime code must not compensate for icon sizing.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `mobileWorkContextSubtitle()` | Kind-specific compact subtitle strings | `MobileHome`, `MobileWorkShell` | Caller does `.replace('Agent run', '')` | Tighten helper output. |
| `useMobileTeamMemberFocusCoordinator` | Member rows, focus update, hydration/error | `MobileTeamMemberFocusBar` | Bar directly mutates team context only for display | Add coordinator/store method if missing. |
| `AgentConversationFeed` | Scroll/pinned state | `AgentEventMonitor` | Parent scrolls whole page instead of bounding feed | Strengthen layout contract. |
| Android adaptive icon resources | Foreground/background drawing | Android manifest/launcher | Runtime code or alternate icons for same purpose | Fix XML geometry. |

## Dependency Rules

- Mobile components may depend on mobile stores/composables and shared monitor/tool components.
- Shared monitor components must not import mobile-only components. If shared monitor APIs are extended, the default desktop path must remain unchanged and mobile must opt in explicitly.
- Core stores (`runHistoryStore`, `agentContextsStore`, `agentTeamContextsStore`, `activeContextStore`, runtime stores) are not design targets; mobile may read/call existing public behavior only.
- `types/mobileWork.ts` may expose mobile presentation helpers, but must not depend on component state or stores.
- `MobileActivityDigest` filter state remains local; stores should not expose an `all` aggregate just for UI.
- Android resources must not depend on web build scripts; web PWA icons are separate from Android adaptive icon resources.
- Forbidden shortcuts:
  - Do not add backend fields, store flags, or API switches to hide labels.
  - Do not change desktop/web store semantics to satisfy a mobile journey.
  - Do not introduce `legacyMobileHome` / `compactMobileHome` dual rendering.
  - Do not strip redundant strings independently in multiple callers.
  - Do not move team focus state into the picker component.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `mobileWorkContextSubtitle(context)` | Mobile work context | Compact metadata string | `MobileWorkContext | null` | Tighten run output to status only. |
| `MobileTeamMemberFocusBar.handleFocusChange(memberRouteKey)` | Team member focus | Request focus change | `memberRouteKey` within current `teamRunId` context | Delegates to coordinator. |
| `focusMember(memberRouteKey)` | Team focus coordinator | Hydrate/change focused member | Route key scoped by current team context | Existing behavior retained. |
| `activeFilter` in `MobileActivityDigest` | Activity category | Select card visibility | `tasks | messages | tools | errors | approvals` | Remove `all`. |
| `Terminal(workspaceId)` | Terminal tool | Connect to selected workspace terminal | `workspaceId` | Existing interface retained. |
| Android `@mipmap/ic_launcher` | Launcher icon | App icon resource | Resource references | Existing manifest retained. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `mobileWorkContextSubtitle` | Yes | Yes | Low | Remove mixed run-type text from compact output. |
| Team focus coordinator | Yes | Yes | Low | No state move to presentation. |
| Activity filters | Yes after change | Yes | Low | Remove aggregate `all`. |
| Terminal `workspaceId` prop | Yes | Yes | Low | No change. |
| Adaptive icon resource | Yes | Yes | Low | Rescale foreground only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile Home | `MobileHome` | Yes | Low | No rename. |
| Work shell | `MobileWorkShell` | Yes | Low | No rename. |
| Activity digest | `MobileActivityDigest` | Yes | Low | No rename. |
| Team focus bar | `MobileTeamMemberFocusBar` | Yes | Low | No rename. |
| Launch target picker | `MobileLaunchTargetPicker` | Mostly | Low | Keep generic picker, not team state owner. |
| Event monitor | `AgentEventMonitor` | Yes | Low | No rename. |
| Launcher foreground | `ic_launcher_foreground.xml` | Yes | Low | No rename. |

## Applied Patterns (If Any)

- Bounded scroll container pattern: `MobileWorkShell` fixes the viewport, task surface hides overflow, shared monitor uses flex column with bounded feed, and `AgentConversationFeed` is the only `overflow-y-auto` transcript owner.
- Accessible compact label pattern: visible redundant labels are removed, while aria labels or visually-hidden text preserve semantics for controls like target selection.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/` | Folder | Mobile shell presentation | Phone-first components and copy policy. | Existing mobile subsystem. | Desktop shell imports or backend policy. |
| `autobyteus-web/types/mobileWork.ts` | File | Mobile work context model | Context types and compact labels. | Existing type/helper owner. | Store reads or component conditionals. |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | File | Shared monitor layout | Transcript/composer layout invariant. | Existing monitor owner. | Mobile-specific copy. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | File | Shared team monitor layout | Team wrapper layout invariant. | Existing team monitor owner. | Mobile-specific target UI. |
| `autobyteus-android/app/src/main/res/drawable/` | Folder | Android drawable resources | Icon foreground/background resources. | Existing Android resource location. | Kotlin runtime behavior. |
| `autobyteus-web/components/mobile/__tests__/` | Folder | Mobile unit tests | Copy/layout behavior assertions. | Existing test coverage. | Stale old-copy assertions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile` | Main-Line Domain-Control / Presentation | Yes | Low | Existing phone shell folder; keep changes local. |
| `components/workspace/agent` | Shared monitor presentation/control | Yes | Low | Shared monitor layout belongs here, not mobile folder. |
| `types/mobileWork.ts` | Shared mobile model/helper | Yes | Low | Compact metadata helper already centralized. |
| `autobyteus-android/app/src/main/res` | Platform resources | Yes | Low | Resource-only icon fix. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Compact subtitle | `agent-run -> "Running"`; `workspace -> "/Users/normy/project"` | `MobileWorkShell` calls `.replace(' · Agent run', '')` | Keeps compact metadata owned by one helper. |
| Home action removal | Recent row click opens latest/current work; `Switch work` opens picker | Keep blue primary card but rename it | User asked to remove duplicate action, not relabel it. |
| Activity categories | Default `activeFilter = 'tasks'`; buttons `Tasks`, `Messages`, `Tools` | Keep `All` but hide with CSS | Removal should be clean and testable. |
| Target selector | `Lead` + `Change`, with `aria-label="Message target"` | Visible `Message target`; `Current: Lead`; explanatory sentence | Preserves semantics without redundant copy. |
| Chat layout | `Shell fixed frame -> monitor bounded flex -> feed scrolls -> composer/nav shrink` | `body/page scrolls while composer/nav drift upward` | Encodes the core bug fix. |
| Android icon | 24x24 logo paths scaled to centered 72dp-ish safe zone within 108dp viewport | Full 108dp edge-to-edge foreground | Avoids adaptive mask crop. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Prop/flag to render old Home primary action | Could preserve tests/old UI | Rejected | Remove primary action and update tests. |
| Keep Activity `All` but make it non-default | Might reduce change size | Rejected | Remove `all` state/button entirely. |
| Add a second compact subtitle helper while keeping old helper | Could minimize call-site changes | Rejected | Tighten existing mobile helper. |
| CSS-only hide redundant text | Quick but leaves dead semantics/copy | Rejected | Remove visible copy from templates and preserve aria intentionally. |
| Alternate Android icon resource for specific launchers | Could address one mask | Rejected | Use adaptive icon safe-zone geometry. |

## Derived Layering (If Useful)

- Route layer: `pages/mobile.vue` only.
- Mobile shell presentation layer: `components/mobile/*`.
- Shared monitor presentation layer: `components/workspace/agent/*`, `components/workspace/team/*`.
- Platform resource layer: `autobyteus-android/app/src/main/res/*`.

Layering is descriptive; ownership remains component/resource-led.

## Migration / Refactor Sequence

1. Update `types/mobileWork.ts` to compact run subtitles.
2. Remove Home primary action template/script/emits and corresponding shell `continueLatestRun` / `latestRunItem` wiring; remove `latestRunItem` export if now unused.
3. Simplify Home status/current-context copy while preserving refresh, node name/URL, status, diagnostics, recent rows, switch/choose/files/troubleshoot/unpair actions.
4. Update `MobileActivityDigest.vue`: remove `all` type/value/filter, default to `tasks`, use three primary category buttons, and keep errors/approvals as secondary issue filters over tool history.
5. Update `MobileTools.vue`: remove `Tools` eyebrow, redundant Terminal panel title, generic workspace/VNC helper paragraphs; keep selected workspace path and actionable no-workspace/setup copy.
6. Update `MobileTeamMemberFocusBar.vue` and, if needed, `MobileLaunchTargetPicker.vue` for compact visible target display with accessible label and unchanged member search/change behavior.
7. Enforce chat layout invariant first in mobile-owned files (`MobileWorkShell.vue`, `MobileChat.vue`) and, only if required, through an opt-in/mobile-contained shared monitor path in `AgentTeamEventMonitor.vue` / `AgentEventMonitor.vue`. Composer and bottom nav must be non-scrolling shrink elements; transcript feed is the scroll element. Desktop default monitor behavior must remain unchanged.
8. Rescale `ic_launcher_foreground.xml` into adaptive safe area. Keep manifest and background unless visual validation indicates otherwise.
9. Update mobile unit tests and add assertions for removed copy, no `All`, compact target row, and bounded layout class/source behavior. Update old tests that clicked `mobile-home-primary-action` to click recent row/switcher instead.
10. Run implementation-scoped checks if dependencies/build tools are available; otherwise document missing setup precisely for API/E2E.
11. During docs sync, update remote-access/Android docs or record explicit no-impact.

## Key Tradeoffs

- Tightening `mobileWorkContextSubtitle()` affects all mobile call sites, but that is preferred over scattered string stripping because the helper is the existing presentation owner.
- Chat scroll containment crosses monitor boundaries, but desktop isolation is higher priority. The preferred tradeoff is mobile-scoped containment or an opt-in shared monitor layout, not a global desktop-affecting class change.
- Removing routine VNC copy reduces immediate guidance, but the guidance remains available in docs and should appear only when actionable.
- Rescaling the existing vector avoids adding another asset source, but final confidence needs visual preview/device evidence.

## Risks

- Shared monitor layout may affect desktop sizing if changed globally; avoid global changes and require desktop smoke/unit checks for any shared-file touch.
- Tests currently encode old copy and primary action behavior; update intentionally.
- Local dependency state blocks immediate Vitest execution in this worktree; implementation must resolve or record validation limitations.
- Android icon visual result depends on launcher masks; static safe-zone XML is necessary but may need emulator/device confirmation.

## Guidance For Implementation

- Do not implement backend/API changes or core store semantic changes for this ticket.
- Treat desktop/web journeys as non-targets: any shared UI edit must be mobile opt-in or behavior-neutral.
- Prefer deleting obsolete template/script code over CSS-hiding text.
- Preserve test ids where still semantically useful, but remove test ids tied only to deleted elements such as `mobile-home-primary-action` if no replacement exists.
- When visible labels are removed, add `aria-label`, `title`, or `sr-only` text only where a control would otherwise lose accessible purpose.
- Keep `MobileLaunchTargetPicker` generic; if adding label visibility support, do not let it own team focus state.
- Validate at least:
  - updated mobile unit suites for `MobileHome`, `MobileWorkShell`, `MobileActivityDigest`, `MobileTools`, `MobileTeamMemberFocusBar`;
  - shared monitor desktop smoke or focused tests;
  - Android resource build/preview or device screenshot for icon safe area;
  - narrow mobile viewport chat scroll behavior through browser/manual/API-E2E validation.
