# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

The current live application route already has the right high-level owners, but the rendered experience is fragmented across three boundaries in a way that weakens immersion:

- `pages/applications/[id].vue` is only a thin entry wrapper over `ApplicationShell.vue`.
- `ApplicationShell.vue` is the real page-shell owner, but today it still renders a large host-managed live-session card above the application surface and keeps host controls in the primary visual hierarchy.
- `ApplicationSurface.vue` is correctly the iframe launch/bootstrap owner, but it hard-codes a reduced viewport height (`h-[calc(100vh-11rem)]`) and a framed card treatment that makes the launched app feel embedded rather than dominant.
- `layouts/default.vue` always renders the left panel or left sidebar strip beside the page content, so the host shell keeps competing visually with the application even when the user is in live Application mode.

Current execution path for a live application session:

`Route /applications/[id] -> ApplicationShell -> applicationSessionStore.bindApplicationRoute(...) -> live-session header + mode controls -> ApplicationSurface / ApplicationExecutionWorkspace -> ApplicationIframeHost`

Current ownership/coupling problems:

1. **Page shell drift from documented target**: `autobyteus-web/docs/applications.md` already says Application mode should be app-first with minimal host chrome, but the current shell still behaves like a management dashboard.
2. **Surface sizing is trapped in a dashboard assumption**: `ApplicationSurface.vue` assumes there will always be substantial chrome above it and sizes itself accordingly.
3. **Layout suppression has no authoritative boundary**: the host layout owns the left shell, while the application page owns live-session context, but there is no explicit contract allowing the page shell to request an immersive host-shell presentation.
4. **Potential boundary-bypass risk**: `useLeftPanel()` exposes raw panel visibility state, but having `ApplicationShell.vue` reach into that composable directly would bypass the layout boundary and mix page logic with layout internals.

Constraints the target design must respect:

- keep `ApplicationSurface.vue` as the authoritative iframe launch/bootstrap owner;
- keep `ApplicationShell.vue` as the authoritative page owner for live application sessions;
- keep `Execution` mode as the host-native retained-state surface;
- do not introduce fallback-heavy dual UX or preserve the old heavy live-session layout as a compatibility mode.

## Intended Change

Refactor the live application route so `Application` mode defaults to an immersive app-first presentation. `ApplicationShell.vue` will own one local live-session presentation state (`immersive` vs `standard`) for the Application-mode surface and will derive a host-shell presentation request from that state. The shell will push that derived request through `appLayoutStore`, and `default.vue` will interpret it by suppressing competing host chrome while immersive mode is active.

The application surface itself will remain owned by `ApplicationSurface.vue`, but that component will become parent-height-driven instead of hard-coding a dashboard-height calculation. The heavy live-session card will be removed. Minimal immersive controls will move into a compact overlay/secondary-actions surface so the user can exit immersive mode, switch to Execution mode, and reach Details / Relaunch / Stop without losing the app-first feeling.

## Terminology

- `Application presentation`: the Application-mode visual style for a live session. In scope values are `immersive` and `standard`.
- `Host shell presentation`: the outer layout presentation controlled by `appLayoutStore`. In scope values are `standard` and `application_immersive`.
- `Immersive controls`: the minimal overlay controls visible while the application is in immersive presentation.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-IMM-001 | `Primary End-to-End` | User opens a live application route in `Application` mode | Bundled application UI occupies the dominant canvas with matching host-shell suppression | `ApplicationShell.vue` | Main immersive presentation flow |
| DS-IMM-002 | `Primary End-to-End` | User triggers exit immersive / switch to Execution / open session actions | Host shell and live session surface update coherently without losing the bound session | `ApplicationShell.vue` | Main control and escape flow |
| DS-IMM-003 | `Bounded Local` | `ApplicationSurface.vue` receives a bound live session | Iframe ready/bootstrap/failure states resolve inside the surface | `ApplicationSurface.vue` | Launch/bootstrap behavior must stay encapsulated while layout changes around it |

## Primary Execution Spine(s)

- `Route -> ApplicationShell -> local application presentation -> appLayoutStore -> default.vue -> ApplicationSurface -> ApplicationIframeHost`
- `Immersive control intent -> ApplicationShell -> applicationPageStore / local presentation / appLayoutStore -> ApplicationExecutionWorkspace or ApplicationSurface`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-IMM-001` | Once route binding resolves a live session, `ApplicationShell.vue` chooses the Application-mode presentation. If that presentation is immersive, it requests `application_immersive` host shell state through `appLayoutStore`, the default layout suppresses competing chrome, and `ApplicationSurface.vue` fills the remaining canvas with the bundled app. | `pages/applications/[id].vue`, `ApplicationShell.vue`, `appLayoutStore`, `default.vue`, `ApplicationSurface.vue` | `ApplicationShell.vue` | `applicationSessionStore`, `ApplicationImmersiveControls.vue`, localization |
| `DS-IMM-002` | User actions from the minimal immersive controls route back into `ApplicationShell.vue`. The shell either exits immersive presentation locally, switches page mode through `applicationPageStore`, or invokes session actions while keeping the current session binding authoritative. The derived host-shell presentation is then updated through `appLayoutStore`. | `ApplicationImmersiveControls.vue`, `ApplicationShell.vue`, `applicationPageStore`, `appLayoutStore`, `ApplicationExecutionWorkspace.vue` | `ApplicationShell.vue` | `workspaceNavigationService`, `applicationSessionStore` |
| `DS-IMM-003` | The application surface receives a live session and independently manages iframe launch descriptor generation, ready handshake, bootstrap delivery, retry, and failure overlays. The surrounding page may change between immersive and standard, but the surface remains the only owner of iframe launch state. | `ApplicationSurface.vue`, `ApplicationIframeHost.vue` | `ApplicationSurface.vue` | `windowNodeContextStore`, iframe contract helpers |

## Spine Actors / Main-Line Nodes

- `pages/applications/[id].vue`
- `ApplicationShell.vue`
- `appLayoutStore.ts`
- `layouts/default.vue`
- `ApplicationSurface.vue`
- `ApplicationExecutionWorkspace.vue`

## Ownership Map

- `pages/applications/[id].vue`: thin route entry only; owns no live-session or immersive policy.
- `ApplicationShell.vue`: governing owner of live application page composition, live-session action handling, Application vs Execution mode selection, and local Application-mode presentation (`immersive` vs `standard`).
- `appLayoutStore.ts`: authoritative host-shell presentation boundary. Owns the one shared signal that tells the outer layout whether immersive host-shell suppression is active.
- `layouts/default.vue`: governing renderer for outer host shell. Owns how the left panel, left strip, drag handle, and mobile header render or suppress in response to the app layout store.
- `ApplicationSurface.vue`: governing owner of application iframe launch state, bootstrap lifecycle, and surface container styling variants.
- `ApplicationExecutionWorkspace.vue`: governing owner of host-native execution presentation once Execution mode is selected.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/applications/[id].vue` | `ApplicationShell.vue` | Route-level Nuxt entrypoint | session binding, immersive policy, layout suppression |
| `ApplicationImmersiveControls.vue` | `ApplicationShell.vue` | Focused immersive overlay presentation | session binding, layout store mutation, application mode state ownership |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Large live-session header block in `ApplicationShell.vue` | It keeps host chrome in the primary hierarchy and breaks immersion | Compact standard live-session toolbar + immersive overlay controls owned by `ApplicationShell.vue` / `ApplicationImmersiveControls.vue` | `In This Change` | Remove, do not preserve behind a legacy toggle |
| Fixed dashboard-height wrapper in `ApplicationSurface.vue` | It assumes non-immersive layout chrome and prevents full canvas use | Parent-height-driven surface layout with presentation prop | `In This Change` | Replace hard-coded `calc(100vh-11rem)` behavior |
| Default always-visible left shell during immersive application viewing | It visually competes with the app surface | `appLayoutStore` + `layouts/default.vue` immersive host-shell branch | `In This Change` | Suppression is stateful, not a second legacy layout |

## Return Or Event Spine(s) (If Applicable)

Not separately modeled beyond the bounded local iframe launch spine because the main user-facing return effects are immediate UI presentation changes inside `ApplicationShell.vue` and `default.vue`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationSurface.vue`
- Arrow chain: `bound live session -> launch descriptor commit -> ready signal acceptance -> bootstrap envelope delivery -> bootstrapped / failed overlay state`
- Why this bounded local spine matters: immersive refactoring must not leak iframe bootstrap state upward into `ApplicationShell.vue` or the layout.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `applicationSessionStore` | `DS-IMM-001`, `DS-IMM-002` | `ApplicationShell.vue` | Route binding, session termination, relaunch | Backend-authoritative session ownership remains outside view composition | Would mix backend session policy into page-rendering decisions |
| `applicationPageStore` | `DS-IMM-002` | `ApplicationShell.vue` | Application vs Execution mode and selected execution member state | Existing page-local UI state boundary already exists | Would be overloaded if forced to own layout suppression or iframe launch state |
| `appLayoutStore` | `DS-IMM-001`, `DS-IMM-002` | `default.vue` and page shells | Shared host-shell presentation signal | Gives pages an authoritative way to request outer-shell changes | Direct page calls into `useLeftPanel()` would bypass layout authority |
| `ApplicationImmersiveControls.vue` | `DS-IMM-001`, `DS-IMM-002` | `ApplicationShell.vue` | Minimal immersive overlay UI, secondary action surfaces, intent emits | Keeps overlay-specific UI out of the main page-shell logic | If promoted to owner, it would start mutating stores and session state directly |
| `workspaceNavigationService.ts` | `DS-IMM-002` | `ApplicationShell.vue` / `ApplicationExecutionWorkspace.vue` | Existing workspace handoff route construction | Reuse existing execution-monitor boundary | Letting application UI mutate workspace selection stores directly would break existing boundary rules |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live application page composition | `components/applications` | `Extend` | `ApplicationShell.vue` already owns the page | N/A |
| Host-shell suppression signal | `stores/appLayoutStore.ts` | `Extend` | Outer layout already depends on this store | N/A |
| Left panel visibility internals | `composables/useLeftPanel.ts` | `Reuse Internally Only` | Layout still uses it for its own rendering decisions | New page code must not depend on it directly |
| Immersive overlay presentation | `components/applications` | `Create New` | A focused overlay component clarifies UI responsibility without changing ownership | Existing components either own the whole page shell or iframe bootstrap, not the overlay chrome |
| Application surface presentation variant type | `types/application` | `Create New` | Shared by shell/surface/overlay without duplicating string unions | Existing types are session/bootstrap contracts, not view-presentation semantics |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/applications` | Live application page composition, immersive overlay, app surface rendering | `DS-IMM-001`, `DS-IMM-002`, `DS-IMM-003` | `ApplicationShell.vue`, `ApplicationSurface.vue` | `Extend` | Main UI refactor lives here |
| `stores` | Shared host-shell presentation state | `DS-IMM-001`, `DS-IMM-002` | `appLayoutStore.ts` | `Extend` | One authoritative layout state signal |
| `layouts` | Outer host shell rendering and suppression | `DS-IMM-001`, `DS-IMM-002` | `default.vue` | `Extend` | Must react to store state, not inspect application internals |
| `types/application` | Shared presentation-mode type | `DS-IMM-001`, `DS-IMM-002`, `DS-IMM-003` | multiple application UI files | `Create New` | Tight reusable UI contract only |
| `docs` | Product/architecture documentation of application mode behavior | `DS-IMM-001`, `DS-IMM-002` | documentation readers | `Extend` | Keep docs aligned with new immersive default |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `components/applications` | page-shell owner | live-session composition, local application presentation state, action handlers, layout-store synchronization | All page-level orchestration already lives here | Yes |
| `autobyteus-web/components/applications/ApplicationImmersiveControls.vue` | `components/applications` | immersive overlay presenter | minimal overlay controls + secondary surfaces + emits | Focused UI concern distinct from iframe surface | Yes |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `components/applications` | app-surface owner | iframe bootstrap + parent-height surface styling variants | Launch/bootstrap and surface rendering stay together | Yes |
| `autobyteus-web/stores/appLayoutStore.ts` | `stores` | layout-state boundary | host-shell presentation state and mutations | Shared layout signal belongs in the layout store | No |
| `autobyteus-web/layouts/default.vue` | `layouts` | host-shell renderer | suppress/show outer chrome from app-layout state | This file already renders the shell | No |
| `autobyteus-web/types/application/ApplicationSurfacePresentation.ts` | `types/application` | shared type | `immersive` vs `standard` presentation union | Avoid repeated string unions across components | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Application surface presentation union used by shell, overlay, and surface | `autobyteus-web/types/application/ApplicationSurfacePresentation.ts` | `types/application` | Keeps presentation semantics consistent and tight | `Yes` | `Yes` | a generic page-layout enum that mixes unrelated shell states |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationSurfacePresentation` (`'immersive' | 'standard'`) | `Yes` | `Yes` | `Low` | Keep only the two Application-mode presentation values; do not mix Execution or outer layout states into this type |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `components/applications` | authoritative page shell | route-bound live-session composition, local Application-mode presentation, session action handlers, layout-store synchronization, Application vs Execution rendering | Governing owner already exists here and should stay here | Yes |
| `autobyteus-web/components/applications/ApplicationImmersiveControls.vue` | `components/applications` | internal overlay presenter | render minimal immersive controls, compact title/live-state pill, overflow/secondary actions, emit user intents upward | Keeps focused UI complexity off the page-shell owner while not taking over ownership | Yes |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `components/applications` | authoritative app-surface owner | iframe bootstrap lifecycle, loading/failure overlays, parent-height immersive/standard surface frame styles | Prevents page shell from taking over iframe launch concerns | Yes |
| `autobyteus-web/stores/appLayoutStore.ts` | `stores` | authoritative layout-state boundary | expose `hostShellPresentation` state and mutations for immersive application viewing | Layout state should not be hidden in arbitrary composables | No |
| `autobyteus-web/layouts/default.vue` | `layouts` | authoritative host shell renderer | interpret `hostShellPresentation` and suppress left panel/strip/mobile header when immersive application state is active | The outer layout, not the page shell, decides how to render itself | No |
| `autobyteus-web/types/application/ApplicationSurfacePresentation.ts` | `types/application` | shared UI contract | shared Application-mode presentation union | Prevents duplicated string unions | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | `components/applications/__tests__` | behavior test | verify immersive default, hidden details by default, execution handoff, and session action reachability | Existing live-session shell coverage belongs here | Yes |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | `components/applications/__tests__` | behavior test | verify surface bootstrap still works across presentation variants | Keeps bootstrap owner covered after sizing changes | Yes |
| `autobyteus-web/layouts/__tests__/default.spec.ts` | `layouts/__tests__` | source/behavior test | verify layout contains immersive-shell suppression branch | Existing default layout test file already covers source-level layout behavior | No |
| `autobyteus-web/docs/applications.md` | `docs` | documentation | document immersive Application-mode default and host-shell suppression behavior | Current doc should match new behavior precisely | No |

## Ownership Boundaries

1. **`ApplicationShell.vue` authoritative page boundary**
   - owns local `Application`-mode presentation state (`immersive`/`standard`), resets that state when a new live session is launched/bound, and maps user intents into page-mode changes, session actions, and layout-store requests;
   - must remain the only page-level place that knows both the bound live session and the chosen presentation.

2. **`appLayoutStore.ts` authoritative host-shell presentation boundary**
   - encapsulates the shared signal that tells the layout whether immersive host-shell suppression is active;
   - upstream pages must not call `useLeftPanel()` directly or manipulate layout internals themselves.

3. **`layouts/default.vue` authoritative outer-shell renderer**
   - owns the actual suppression/showing of mobile header, left panel, drag handle, and left strip;
   - it reacts only to `appLayoutStore`, not to `applicationPageStore` or application route internals.

4. **`ApplicationSurface.vue` authoritative iframe launch owner**
   - owns launch descriptor generation, ready timeout, bootstrap delivery, retry, and failed-state overlays;
   - accepts only a narrow presentation prop for styling, not layout orchestration responsibilities.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | local application presentation ref, details/action visibility, session action handlers | immersive overlay controls, route entry wrapper | overlay component mutates stores or session state directly | emitting explicit intents back to `ApplicationShell.vue` |
| `appLayoutStore.ts` | host-shell presentation state | `ApplicationShell.vue`, `default.vue` | `ApplicationShell.vue -> useLeftPanel()` while `default.vue` also uses `useLeftPanel()` | extending `appLayoutStore` with explicit immersive presentation mutations |
| `ApplicationSurface.vue` | launch descriptor, handshake state, retry/failure overlays | `ApplicationShell.vue` | `ApplicationShell.vue` manages iframe ready/bootstrap state itself | adding a narrow styling prop rather than moving launch state upward |

## Dependency Rules

- `ApplicationShell.vue` may depend on `applicationSessionStore`, `applicationPageStore`, `appLayoutStore`, `ApplicationSurface.vue`, `ApplicationExecutionWorkspace.vue`, and the focused immersive overlay component.
- `ApplicationShell.vue` must **not** depend on `useLeftPanel()` directly.
- `default.vue` may depend on `appLayoutStore` and `useLeftPanel()` because it is the authoritative outer-shell renderer.
- `ApplicationImmersiveControls.vue` may emit user intents upward but must not call stores or services directly.
- `ApplicationSurface.vue` may receive presentation styling props but must not know about `appLayoutStore` or page mode.
- `applicationPageStore` remains limited to Application vs Execution page mode and selected execution member route key; it must not become a second layout store.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `appLayoutStore.setHostShellPresentation(presentation)` | host shell layout state | request outer-shell presentation change | `'standard' | 'application_immersive'` | Used by `ApplicationShell.vue` only |
| `appLayoutStore.resetHostShellPresentation()` | host shell layout state | restore default shell on unmount/exit | none | Cleanup boundary for page shells |
| `ApplicationSurface` prop `presentation` | application surface styling | choose immersive vs standard surface frame styling | `ApplicationSurfacePresentation` | Styling-only, not orchestration |
| `ApplicationImmersiveControls` emits (`exit-immersive`, `switch-execution`, `toggle-details`, `relaunch`, `stop-session`) | immersive overlay intents | communicate user actions to page shell | none | Pure intent boundary |
| `applicationPageStore.setMode(applicationId, mode)` | application page mode | switch Application vs Execution | `applicationId + mode` | Existing boundary reused |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `appLayoutStore.setHostShellPresentation(...)` | `Yes` | `Yes` | `Low` | Keep it restricted to outer-shell presentation only |
| `ApplicationSurface` `presentation` prop | `Yes` | `Yes` | `Low` | Keep it styling-only |
| `ApplicationImmersiveControls` emits | `Yes` | `Yes` | `Low` | Keep payload-free intent emits unless a future use case proves otherwise |
| `applicationPageStore.setMode(...)` | `Yes` | `Yes` | `Low` | No change needed |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| local Application-mode presentation | `ApplicationSurfacePresentation` | `Yes` | `Low` | Keep it scoped to Application-mode surface semantics |
| host shell presentation | `hostShellPresentation` | `Yes` | `Low` | Keep host-shell and application-surface presentation names distinct |
| overlay presenter | `ApplicationImmersiveControls.vue` | `Yes` | `Low` | Avoid vague names like `ApplicationOverlayHelper` |

## Applied Patterns (If Any)

- **Adapter-like boundary via store**: `appLayoutStore.ts` acts as the authoritative adapter between page-level immersive intent and layout rendering, preventing direct page-to-layout-internal coupling.
- **Focused presenter component**: `ApplicationImmersiveControls.vue` is a bounded UI presenter pattern that keeps immersive overlay details local without taking over orchestration ownership.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `File` | authoritative page shell | live-session page composition, local presentation state, layout-store synchronization, action handlers | Existing live application page owner | iframe bootstrap internals or direct left-panel manipulation |
| `autobyteus-web/components/applications/ApplicationImmersiveControls.vue` | `File` | internal overlay presenter | minimal immersive overlay UI and secondary actions | New focused immersive UI concern belongs with applications UI | session binding logic, store mutations |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `File` | authoritative surface owner | parent-height application surface, immersive/standard frame styles, iframe bootstrap lifecycle | Surface and bootstrap already live here | layout orchestration or page-mode logic |
| `autobyteus-web/stores/appLayoutStore.ts` | `File` | authoritative layout-state boundary | host-shell presentation signal | Existing shared layout state store | page-specific session logic |
| `autobyteus-web/layouts/default.vue` | `File` | authoritative host shell renderer | render/suppress outer shell from store state | Existing outer layout renderer | application-session binding or immersive local state |
| `autobyteus-web/types/application/ApplicationSurfacePresentation.ts` | `File` | shared type | tight Application-mode presentation union | Shared UI contract belongs with application types | execution or layout-wide enums |
| `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | `File` | test coverage | live-session shell behavior assertions | Existing ApplicationShell test home | unrelated layout-only assertions |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | `File` | test coverage | surface behavior assertions | Existing ApplicationSurface test home | page-shell behavior |
| `autobyteus-web/layouts/__tests__/default.spec.ts` | `File` | test coverage | outer layout immersive branch assertions | Existing default layout test home | application session semantics |
| `autobyteus-web/docs/applications.md` | `File` | documentation | immersive Application-mode behavior and shell suppression docs | Current authoritative frontend Applications doc | stale pre-immersive description |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications` | `Mixed Justified` | `Yes` | `Low` | Existing feature-oriented folder is still readable for this UI scope |
| `autobyteus-web/stores` | `Off-Spine Concern` | `Yes` | `Low` | Store boundary remains layout-state focused |
| `autobyteus-web/layouts` | `Main-Line Domain-Control` | `Yes` | `Low` | Layout file is the true outer-shell renderer |
| `autobyteus-web/types/application` | `Off-Spine Concern` | `Yes` | `Low` | Tight shared type only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Layout suppression boundary | `ApplicationShell -> appLayoutStore.setHostShellPresentation('application_immersive') -> default.vue suppresses left shell` | `ApplicationShell -> useLeftPanel().toggleLeftPanel(); default.vue also uses useLeftPanel()` | Prevents boundary bypass and mixed-level ownership |
| Surface ownership | `ApplicationShell renders overlay + passes presentation prop; ApplicationSurface still owns iframe ready/bootstrap` | `ApplicationShell starts handling iframe ready/bootstrapped state so it can drive overlay timing` | Keeps launch/bootstrap local to the surface owner |
| Immersive escape path | `ApplicationImmersiveControls emits exit intent -> ApplicationShell sets local presentation to standard` | `Immersive overlay directly mutates stores and route mode` | Keeps orchestration authority in the page shell |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old heavy live-session card behind a toggle or feature flag | Easier incremental rollout | `Rejected` | Remove the heavy card and replace it with immersive overlay + compact standard toolbar |
| Let immersive mode fall back to the old `ApplicationSurface` height calculation | Reduce CSS churn | `Rejected` | Remove the height calculation and make the surface parent-driven |
| Page directly manipulating `useLeftPanel()` while layout also uses it | Quick way to hide sidebar | `Rejected` | Extend `appLayoutStore` and keep layout suppression inside `default.vue` |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- **Route entry layer**: `pages/applications/[id].vue`
- **Page-shell orchestration layer**: `ApplicationShell.vue`
- **Shared host-shell state boundary**: `appLayoutStore.ts`
- **Outer layout rendering layer**: `layouts/default.vue`
- **Application surface / execution surface layer**: `ApplicationSurface.vue`, `ApplicationExecutionWorkspace.vue`
- **Iframe bridge layer**: `ApplicationIframeHost.vue`

## Migration / Refactor Sequence

1. **Extend outer-layout state boundary**
   - Add `hostShellPresentation` plus explicit setter/reset methods to `appLayoutStore.ts`.
   - Update `layouts/default.vue` to suppress the mobile header, left panel, drag handle, and left strip when `hostShellPresentation === 'application_immersive'`.

2. **Add shared application presentation contract**
   - Add `ApplicationSurfacePresentation` shared type under `types/application`.

3. **Refactor the application surface owner**
   - Update `ApplicationSurface.vue` to accept the presentation prop, remove the fixed dashboard-height wrapper, and render immersive vs standard frame styles from parent height.
   - Keep iframe launch/bootstrap logic unchanged except for layout-neutral container behavior.

4. **Refactor the live-session page shell**
   - Remove the large live-session card from `ApplicationShell.vue`.
   - Add local `Application`-mode presentation state defaulting to `immersive`.
   - Reset that local presentation to `immersive` when a new session is launched/bound.
   - Synchronize effective immersive state into `appLayoutStore` via watch + cleanup on unmount.
   - Render the immersive overlay controls for immersive Application mode, a compact standard toolbar for non-immersive Application mode, and keep Execution mode separate.

5. **Add focused immersive overlay component**
   - Implement `ApplicationImmersiveControls.vue` as a presentational emitter-only component.

6. **Update tests and docs**
   - Revise ApplicationShell and ApplicationSurface tests for immersive default behavior.
   - Update default layout tests for immersive shell suppression.
   - Update `autobyteus-web/docs/applications.md` so docs match implementation again.

7. **Remove obsolete legacy assumptions**
   - Delete code and assertions that depend on the old large live-session card and fixed height calculation.

## Key Tradeoffs

- **Local shell state vs page store persistence**: immersive Application presentation is kept local to `ApplicationShell.vue` rather than moved into `applicationPageStore` because the desired behavior is “default to immersive whenever the live page is opened/bound.” It only needs to persist during the mounted page session, not as a broader cross-route remembered preference.
- **Store-mediated layout suppression vs direct composable access**: extending `appLayoutStore.ts` adds one more store field, but it preserves the authoritative layout boundary and avoids page-level bypass of `useLeftPanel()` internals.
- **Always-visible minimal controls vs fully hidden controls**: the design keeps a tiny always-available escape surface instead of a hover-only hidden control so the user always has a clear exit path.

## Risks

- Styling changes around `100dvh` / `h-full` may behave differently across desktop and mobile layouts and will need visual validation.
- Overlay z-index and pointer-events must not interfere with the bundled app iframe more than necessary.
- Existing tests and any screenshot-based expectations may need broad updates because the live-session visual hierarchy changes significantly.

## Guidance For Implementation

- Do not move iframe launch/bootstrap state out of `ApplicationSurface.vue`.
- Do not let `ApplicationShell.vue` call `useLeftPanel()` directly.
- Keep immersive overlay components emitter-only; orchestration stays in `ApplicationShell.vue`.
- When a live session is rebound or relaunched, reset local Application presentation to `immersive` so the default immersive contract remains true.
- Keep Execution mode behavior intentionally separate and host-native.
