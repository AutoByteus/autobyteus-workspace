# Design Spec

## Current-State Read

The `/mobile` Phone Access experience is a separate phone-first shell. `MobileRemoteAccessShell.vue` opens a `MobileWorkContext`, sets `mobileWorkStore.activeTab`, hydrates/selects the relevant agent or team run, and renders `MobileWorkShell.vue`. `MobileWorkShell.vue` currently supports five task tabs: Chat, Runs, Files, Tools, and Activity. Tools wraps Terminal/VNC in phone-sized presentation. Activity and tool-history surfaces compute the active/focused agent run id locally.

Desktop Artifacts live in the right-side desktop shell. `useRightSideTabs.ts` includes an `artifacts` tab, and `RightSideTabs.vue` renders `ArtifactsTab.vue`. `ArtifactsTab.vue` is desktop-layout-specific: it renders `ArtifactList`, a draggable vertical resizer, and `ArtifactContentViewer` side-by-side.

The artifact data path is not desktop-specific. `runFileChangesStore.ts` owns run-scoped artifact rows. `fileChangeHandler.ts` applies live `FILE_CHANGE` events. Agent run hydration queries `GetRunFileChanges` and stores rows through `hydrateRunFileChanges`. `ArtifactContentViewer.vue` resolves artifact content through `/rest/runs/:runId/file-change-content` and `authorizedFetch`, which supports mobile remote-access credentials.

Browser is different. `browserShellStore.ts` only reports Browser available when Electron preload APIs exist (`window.electronAPI?.getBrowserShellSnapshot`), and `BrowserPanel.vue` uses Electron Browser IPC plus host-bounds synchronization. `docs/browser_sessions.md` states Electron main creates/projects the native `WebContentsView`. This cannot be added to `/mobile` as a normal web component.

Current coupling/fragmentation problem: mobile active/focused run identity is duplicated in `MobileActivityDigest.vue` and `MobileToolActivityList.vue`. Adding Artifacts without extracting that policy would create a third copy and make agent/team focus scoping fragile.

## Intended Change

Add a dedicated mobile Artifacts task tab. The new mobile tab is a phone-first presentation over existing artifact store and viewer owners. It must:

- add `artifacts` to `MobileTaskTab` and mobile bottom navigation;
- render a new `MobileArtifacts.vue` component for the tab;
- use a new mobile composable for resolving the currently selected/focused agent run id;
- list run artifacts from `runFileChangesStore` newest first;
- delegate content preview to `ArtifactContentViewer.vue` using existing `ArtifactViewerItem` shapes;
- preserve team-member focus semantics by showing the existing team focus bar on Artifacts;
- explicitly keep Browser out of the mobile tab set.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / mobile parity bug fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `MobileActivityDigest.vue` and `MobileToolActivityList.vue` independently compute the same active/focused run id. Mobile Artifacts needs that same subject identity to read artifact rows. Desktop Artifacts already uses active agent context run id; the missing part is a mobile-owned way to resolve the same identity without duplicating policy.
- Design response: Add `useMobileFocusedRunIdentity.ts` under `composables/mobile/`, then use it in Activity, ToolActivityList, and new MobileArtifacts. Add `MobileArtifacts.vue` as mobile presentation only; keep `runFileChangesStore` and `ArtifactContentViewer` authoritative for data/content behavior.
- Refactor rationale: The refactor is small, directly tied to the new tab, and prevents a third policy copy in the implementation.
- Intentional deferrals and residual risk, if any: Historical team-member file changes may not be hydrated by current team-member projection queries. This is an existing broader hydration contract issue and is deferred because active/live mobile artifacts and agent-run historical artifacts can be implemented coherently with current owners. If validation reveals a current desktop/mobile parity blocker for historical team artifacts, route back to solution design for a separate requirements/design update.

## Terminology

- `Agent Artifact`: a run-file-change row owned by `runFileChangesStore`, created from explicit file mutation/generated-output runtime events.
- `Focused run identity`: the agent run id that a mobile surface should inspect for the current `MobileWorkContext`; for a team run this means the currently focused leaf agent member.
- `Mobile task tab`: a bottom-navigation task surface owned by `MobileWorkShell.vue`.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add compatibility wrappers or a hidden desktop `ArtifactsTab.vue` reuse path. The new mobile surface should be the direct phone-first target.
- Obsolete path in scope: duplicated local run-id computation in `MobileActivityDigest.vue` and `MobileToolActivityList.vue` becomes unnecessary for the focused-run-id subject and should be removed in favor of the new composable.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MART-001 | Primary End-to-End | User taps mobile Artifacts tab | Phone shows run-scoped artifact list | `MobileWorkShell.vue` + `MobileArtifacts.vue` | Defines the new mobile navigation/display behavior. |
| DS-MART-002 | Primary End-to-End | User selects an artifact row | Artifact content renders through existing viewer/content route | `MobileArtifacts.vue` presentation over `ArtifactContentViewer.vue` | Ensures generated outputs are actually viewable, not just counted. |
| DS-MART-003 | Return-Event | Runtime emits/hydrates `FILE_CHANGE`/run file changes | Mobile artifact list updates from shared store | `runFileChangesStore.ts` | Preserves existing artifact data ownership. |
| DS-MART-004 | Primary End-to-End | User asks about Browser on mobile | Browser remains absent from mobile; docs/gating explain Electron boundary | Browser shell/Electron boundary | Prevents an unsupported fake Browser tab. |
| DS-MART-005 | Bounded Local | Mobile components need active/focused run id | Shared computed focused run id | `useMobileFocusedRunIdentity.ts` | Prevents duplicated scoping policy across mobile Activity/Tools/Artifacts. |

## Primary Execution Spine(s)

- DS-MART-001: `Mobile bottom nav tap -> MobileWorkShell activeTab update -> MobileArtifacts -> useMobileFocusedRunIdentity -> runFileChangesStore -> artifact row cards`
- DS-MART-002: `Artifact row tap -> MobileArtifacts selection state -> toAgentArtifactViewerItem -> ArtifactContentViewer -> authorizedFetch artifact content route -> FileViewer preview`
- DS-MART-004: `Mobile feature request -> Browser feasibility check -> Electron Browser boundary -> mobile docs/gating exclusion`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MART-001 | The mobile work shell accepts `artifacts` as a first-class task tab. When selected, `MobileArtifacts` resolves the current focused agent run id and lists that run's artifact rows sorted newest first. | Mobile task tab, focused run identity, artifact list | `MobileWorkShell.vue`, `MobileArtifacts.vue` | `MobileTaskTab` typing, team focus bar visibility, empty states |
| DS-MART-002 | Selecting a row sets local selection state and passes the existing `ArtifactViewerItem` into `ArtifactContentViewer`, which owns pending/failed/content/media display behavior. | Artifact row, artifact viewer, artifact content route | `MobileArtifacts.vue` for selection; `ArtifactContentViewer.vue` for content | Refresh signal, object URL lifecycle inside viewer, mobile wrapper sizing |
| DS-MART-003 | Live/hydrated artifact updates continue to flow through existing store owners; mobile observes the same store, so no new artifact persistence or mutation path is introduced. | Runtime event/hydration, run-file-change store, mobile computed list | `runFileChangesStore.ts` | Streaming handler, run hydration service |
| DS-MART-004 | Browser is not exposed on mobile because the current Browser tab requires Electron preload IPC and native `WebContentsView` projection. | Browser feature boundary, Electron shell | Browser shell/Electron subsystem | Documentation and mobile feature-gating clarity |
| DS-MART-005 | Mobile components share one computed policy for resolving the active/focused agent run id from agent/team mobile contexts. | Mobile context, selected run, active/focused agent context | `useMobileFocusedRunIdentity.ts` | Selection store, active context store, team context store |

## Spine Actors / Main-Line Nodes

- `MobileWorkShell.vue`: mobile task navigation and selected task renderer.
- `MobileArtifacts.vue`: mobile artifact list/selection presentation.
- `useMobileFocusedRunIdentity.ts`: focused agent run identity boundary for mobile surfaces.
- `runFileChangesStore.ts`: authoritative artifact row store.
- `ArtifactContentViewer.vue`: authoritative artifact content viewer/fetch state owner.
- Browser shell/Electron: authoritative Browser surface owner; rejects mobile tab reuse.

## Ownership Map

- `MobileWorkShell.vue` owns only mobile task tab availability, task component routing, and bottom-nav presentation.
- `MobileArtifacts.vue` owns only phone-specific artifact list layout, selection state, refresh signal, empty state messaging, and viewer placement.
- `useMobileFocusedRunIdentity.ts` owns the policy for mapping a `MobileWorkContext` plus current selection/focus stores to a valid agent run id.
- `runFileChangesStore.ts` owns artifact row identity, status/type normalization, live upsert, hydration replacement/merge, and latest artifact signals.
- `ArtifactContentViewer.vue` owns content fetching, file type resolution, pending/failed/deleted states, media object URLs, raw/preview mode, and maximize behavior.
- Browser shell/Electron owns Browser sessions/surface. Mobile must not pretend to own Browser lifecycle or projection.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MobileWorkShell.vue` tab renderer | Individual mobile task components | Provides one task-switching frame | Artifact data fetching or Browser runtime behavior |
| `MobileArtifacts.vue` viewer wrapper | `ArtifactContentViewer.vue` and `runFileChangesStore.ts` | Provides phone layout/selection around existing artifact owners | Artifact persistence, content route semantics, team communication references |
| `ArtifactContentViewer.vue` | Artifact viewer/content subsystem | Existing shared content viewer boundary | Mobile navigation or run-id scoping |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Local duplicate `runId` computed in `MobileActivityDigest.vue` | Same focused-run identity policy will be shared | `composables/mobile/useMobileFocusedRunIdentity.ts` | In This Change | Keep team-message/task-specific logic local. |
| Local duplicate `runId` computed in `MobileToolActivityList.vue` | Same focused-run identity policy will be shared | `composables/mobile/useMobileFocusedRunIdentity.ts` | In This Change | Tool list consumes `focusedRunId`. |
| Any idea of importing desktop `ArtifactsTab.vue` into mobile | Desktop split/resizer layout is not phone-first | `components/mobile/MobileArtifacts.vue` | In This Change | Source guard tests should protect this. |
| Mobile Browser tab using current `BrowserPanel.vue` | Requires Electron APIs and native surface projection | No replacement in this task | Follow-up only if separately designed | Document as out of scope. |

## Return Or Event Spine(s) (If Applicable)

- Live artifact update return/event spine: `Runtime FILE_CHANGE payload -> fileChangeHandler -> runFileChangesStore.upsertFromLivePayload -> MobileArtifacts computed artifacts -> selected viewer refresh if latest signal changes`.
- Hydration event spine: `runHistoryStore.openRun/hydrateLiveRunContext -> GetRunFileChanges -> hydrateRunFileChanges -> runFileChangesStore.replaceRunProjection -> MobileArtifacts computed artifacts`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MobileArtifacts.vue`
  - Chain: `artifacts computed -> latestVisibleArtifactSignal watch -> selectedArtifactId update -> viewerRefreshSignal when same row reselected`
  - Why it matters: keeps mobile selection behavior aligned with desktop without reusing desktop layout.
- Parent owner: `useMobileFocusedRunIdentity.ts`
  - Chain: `context kind -> selection guard -> active context/team focus guard -> focusedRunId`
  - Why it matters: prevents stale artifacts/tool activity from leaking across mobile contexts.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Mobile empty-state copy | DS-MART-001 | `MobileArtifacts.vue` | Explain no context/no run/no artifacts | User needs actionable phone feedback | Main line would mix state policy with copy branches. |
| Viewer content fetch | DS-MART-002 | `ArtifactContentViewer.vue` | Fetch text/blob content and handle pending/errors | Existing artifact viewer owner already owns this | Duplicating fetch in mobile would fork content behavior. |
| Feature docs/gating | DS-MART-004 | Mobile capability contract | Mark run Artifacts supported and Browser unsupported | Prevents wrong product expectation | Main UI would silently omit Browser with no rationale. |
| Test source guards | DS-MART-001, DS-MART-004 | Mobile shell boundary | Ensure mobile does not import desktop right panel/browser shell | Protects boundary over time | Without tests, future changes may reintroduce desktop layout coupling. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Artifact row state | Run file changes / `runFileChangesStore.ts` | Reuse | Already authoritative and live/hydrated | N/A |
| Artifact content preview | `ArtifactContentViewer.vue` / file viewer | Reuse | Already handles file types, content route, pending/errors | N/A |
| Mobile presentation | `components/mobile/` shell | Extend | Existing mobile task surface owner | N/A |
| Focused run identity | Mobile composables | Create New | Existing logic is duplicated in components, no current owner exists | Store owners are too broad; desktop right-tab composable is not mobile-aware. |
| Browser surface | Electron Browser shell | Reuse only on desktop; exclude from mobile | Current implementation requires Electron/native surface | Creating a mobile Browser requires a separate product/runtime design. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile work shell | Mobile tab type, bottom nav, task routing | DS-MART-001 | `MobileWorkShell.vue` | Extend | Add `artifacts` as a first-class tab. |
| Mobile focused context utilities | Focused agent run id resolution | DS-MART-001, DS-MART-005 | `MobileArtifacts`, Activity, ToolActivityList | Create New | Narrow mobile composable. |
| Agent artifacts | Artifact rows and content viewer | DS-MART-002, DS-MART-003 | `runFileChangesStore`, `ArtifactContentViewer` | Reuse | No parallel model. |
| Mobile capability docs/gates | Supported feature declaration | DS-MART-004 | `/mobile` runtime contract | Extend | Add run artifacts; exclude Browser. |
| Browser shell | Electron browser sessions/native surface | DS-MART-004 | Desktop Browser tab | Reuse desktop only | No mobile work. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `types/mobileWork.ts` | Mobile work shell | Mobile task model | Add `artifacts` tab value | Existing type owner | N/A |
| `stores/mobileWorkStore.ts` | Mobile work shell | Mobile active tab state | Accept new tab type via `MobileTaskTab` | Existing store owner | `MobileTaskTab` |
| `components/mobile/MobileWorkShell.vue` | Mobile work shell | Task frame/router | Render `MobileArtifacts`, add nav item, preserve bounded layout | Existing shell component | `MobileTaskTab` |
| `components/mobile/MobileArtifacts.vue` | Mobile artifacts presentation | Mobile artifact surface | Phone list, selection, empty state, viewer placement | New surface deserves one component | `ArtifactViewerItem`, `runFileChangesStore` |
| `composables/mobile/useMobileFocusedRunIdentity.ts` | Mobile focused context utilities | Focused run identity | Compute valid current/focused agent run id | Reused by three mobile components | `MobileWorkContext` |
| `components/mobile/MobileActivityDigest.vue` | Mobile activity | Activity digest | Consume shared run id for tool counts | Avoid duplicate policy | Composable |
| `components/mobile/MobileToolActivityList.vue` | Mobile activity/tools | Tool activity list | Consume shared run id for rows | Avoid duplicate policy | Composable |
| `utils/mobileFeatureGates.ts` | Mobile capability contract | Feature support list | Add run artifacts supported; Browser absent | Existing owner | `MobileFeatureId` |
| `docs/remote_access.md` | Mobile docs | Phone Access contract | Include Artifacts in mobile shell; Browser out-of-scope | Existing durable doc | N/A |
| Mobile tests | Validation | Component/composable behavior | Add/update tests | Existing test suites align with scope | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile focused agent run id resolution | `composables/mobile/useMobileFocusedRunIdentity.ts` | Mobile focused context utilities | Already duplicated and needed by Artifacts | Yes | Yes | A generic run/team coordinator or artifact store wrapper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileTaskTab` | Yes | Yes | Low | Add one explicit `artifacts` literal; no optional flags. |
| Focused run identity composable return | Yes | Yes | Low | Return a narrow `focusedRunId` computed (and optional simple validity booleans only if implementation needs empty-state distinction). |
| `ArtifactViewerItem` | Yes | N/A | Low | Reuse unchanged; do not create mobile-specific artifact DTO. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/mobileWork.ts` | Mobile work shell | Mobile task model | Add `'artifacts'` to `MobileTaskTab` | Existing type owner | N/A |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work shell | Mobile task router | Import/render `MobileArtifacts`; add `Artifacts` bottom-nav item; use 6-column compact nav | Existing task shell owner | `MobileTaskTab` |
| `autobyteus-web/components/mobile/MobileArtifacts.vue` | Mobile artifacts presentation | Mobile artifact tab | Resolve focused run id, list artifacts newest first, local selection/refresh, empty states, embed `ArtifactContentViewer` | New mobile surface with one presentation concern | `runFileChangesStore`, `toAgentArtifactViewerItem` |
| `autobyteus-web/composables/mobile/useMobileFocusedRunIdentity.ts` | Mobile focused context utilities | Focused run identity | Shared valid run-id computation for agent/team mobile contexts | Prevents duplicated policy | `MobileWorkContext` |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile activity | Activity digest | Use shared focused run id for tool counts and summary | Keeps activity presentation local | Composable |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Mobile activity/tools | Tool activity list | Use shared focused run id for row source | Keeps list presentation local | Composable |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile capability contract | Supported feature list | Add run artifacts feature id to supported set; Browser remains absent | Existing gate owner | N/A |
| `autobyteus-web/docs/remote_access.md` | Docs | Phone Access contract | Document mobile Artifacts and Browser non-support | Existing durable docs owner | N/A |
| `autobyteus-web/components/mobile/__tests__/...` and/or `autobyteus-web/composables/mobile/__tests__/...` | Tests | Validation | Cover nav/component/composable/docs boundaries | Existing test locations | N/A |

## Ownership Boundaries

- `MobileArtifacts.vue` may depend on `runFileChangesStore` and `ArtifactContentViewer` because those are the authoritative artifact row/content boundaries.
- `MobileArtifacts.vue` must not import `ArtifactsTab.vue`; that would bypass mobile presentation ownership and drag in desktop layout/resizer responsibilities.
- `useMobileFocusedRunIdentity.ts` may read selection/active/team stores to derive a display subject. It must not mutate selection, focus, hydration, or artifact state.
- Browser mobile exclusion must depend on Browser's actual Electron boundary (`browserShellStore`/docs) and not on hiding a tab while still attempting IPC.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `runFileChangesStore.ts` | Artifact row maps, normalization, latest-visible signal | `MobileArtifacts.vue`, `ArtifactsTab.vue` | Reading raw streaming payloads or hydrating duplicate local arrays | Add/select store getter, not component-local store clones |
| `ArtifactContentViewer.vue` | Fetch route, file type detection, object URLs, preview/raw mode | Mobile/desktop artifact surfaces | Reimplementing artifact content fetch in `MobileArtifacts.vue` | Extend viewer props/layout if truly needed |
| `useMobileFocusedRunIdentity.ts` | Agent/team selection/focus validity checks | Mobile Activity, ToolActivityList, Artifacts | Copying run-id logic into components | Add narrow computed fields to composable |
| Electron Browser shell | Browser IPC, sessions, host bounds, native surface projection | Desktop `BrowserPanel.vue` | Mobile `BrowserPanel` import or `window.electronAPI` calls in `/mobile` | Separate future remote/mobile Browser design |

## Dependency Rules

Allowed:

- `MobileWorkShell.vue` may import `MobileArtifacts.vue`.
- `MobileArtifacts.vue` may import `useMobileFocusedRunIdentity`, `useRunFileChangesStore`, `ArtifactContentViewer`, and `artifactViewerItem` mapping.
- Existing mobile Activity/Tool components may import `useMobileFocusedRunIdentity`.
- Tests may seed `runFileChangesStore` directly for component validation.

Forbidden:

- Mobile components must not import `RightSideTabs.vue`, `ArtifactsTab.vue`, `BrowserPanel.vue`, or desktop shell layout components.
- Mobile code must not call `window.electronAPI` for Browser support.
- Mobile Artifacts must not merge Team Communication `referenceFiles` into Agent Artifacts.
- Mobile Artifacts must not create a second artifact store or a second content route shape.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useMobileFocusedRunIdentity(contextRef)` | Focused agent run identity | Derive current valid run id for mobile surfaces | `Ref<MobileWorkContext | null>` / computed equivalent | Keep read-only. |
| `runFileChangesStore.getArtifactsForRun(runId)` | Agent artifact rows | Return rows for one run | Concrete `runId: string` | Existing boundary. |
| `runFileChangesStore.getLatestVisibleArtifactSignalForRun(runId)` | Artifact latest-visible event signal | Let surface auto-select/refresh newest visible row | Concrete `runId: string` | Existing boundary. |
| `ArtifactContentViewer.artifact` prop | Artifact content subject | Render/fetch selected artifact content | `ArtifactViewerItem | null` | Existing boundary. |
| `MobileWorkShell activeTab` prop/event | Mobile task selection | Select one mobile task tab | `MobileTaskTab` | Add `artifacts`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useMobileFocusedRunIdentity` | Yes | Yes | Low | Use `MobileWorkContext` and current stores; return focused `runId`. |
| `getArtifactsForRun` | Yes | Yes | Low | Reuse unchanged. |
| `ArtifactContentViewer` artifact prop | Yes | Yes | Low | Reuse unchanged. |
| `MobileTaskTab` | Yes | Yes | Low | Explicit literal union. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile artifact tab component | `MobileArtifacts.vue` | Yes | Low | Use direct product language. |
| Focused run identity composable | `useMobileFocusedRunIdentity.ts` | Yes | Low | Avoid generic `helper`/`support` names. |
| Feature gate id | `runArtifacts` or `artifacts` | Yes | Low | Prefer `runArtifacts` if distinguishing from application artifacts. |

## Applied Patterns (If Any)

- Composable extraction: `useMobileFocusedRunIdentity.ts` is a narrow state-derivation composable. It is not a service or coordinator and owns no mutation/hydration behavior.
- Wrapper/presentation component: `MobileArtifacts.vue` wraps existing artifact owners in a phone layout without becoming a second artifact subsystem.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileArtifacts.vue` | File | Mobile artifact presentation | Dedicated phone Artifacts tab | All mobile task surfaces live in `components/mobile` | Desktop resizer/right-panel layout; artifact store mutation |
| `autobyteus-web/composables/mobile/useMobileFocusedRunIdentity.ts` | File | Mobile focused context utility | Shared focused run-id derivation | Existing mobile composables folder owns mobile-specific state derivations | Artifact listing/fetching; selection mutation |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | File | Mobile task shell | Add tab item/render branch | Existing shell owner | Artifact content fetching or Browser logic |
| `autobyteus-web/types/mobileWork.ts` | File | Mobile work type model | Add tab literal | Existing mobile domain type owner | Browser/Electron flags |
| `autobyteus-web/utils/mobileFeatureGates.ts` | File | Mobile capability gate | Add run artifacts support; no Browser support | Existing runtime capability owner | Browser IPC logic |
| `autobyteus-web/docs/remote_access.md` | File | Phone Access docs | Document Artifacts and Browser boundary | Existing durable docs | Implementation-only details beyond contract |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile/` | Main-Line Domain-Control / presentation | Yes | Low | Mobile task components already live here. |
| `composables/mobile/` | Off-Spine Concern | Yes | Low | Focused-run identity is a reusable mobile state derivation. |
| `components/workspace/agent/` | Existing artifact viewer capability | Yes | Low | Reuse viewer/item mapping without moving. |
| `stores/` | Persistence-provider/state owner | Yes | Low | Existing stores remain authoritative. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Mobile Artifacts layout | `MobileWorkShell -> MobileArtifacts -> ArtifactContentViewer` | `MobileWorkShell -> ArtifactsTab` | Avoids dragging desktop split/resizer layout into phone shell. |
| Focused run identity | `const { focusedRunId } = useMobileFocusedRunIdentity(toRef(props, 'context'))` | Copying agent/team selection checks inside every mobile component | Prevents stale-run leaks and duplicated policy. |
| Browser scope | Docs/gate say Browser is Electron-only | Add `MobileBrowser.vue` that calls `window.electronAPI` | Mobile web/Android runtime does not have Electron APIs. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Reuse desktop `ArtifactsTab.vue` unchanged on mobile | Fastest path to show artifacts | Rejected | Add `MobileArtifacts.vue` that reuses store/viewer, not desktop layout. |
| Add Browser to mobile but show desktop unavailable empty state | User asked if Browser is possible | Rejected | Keep Browser absent; document Electron boundary. |
| Keep duplicated run-id logic and copy it into `MobileArtifacts.vue` | Smallest local component change | Rejected | Extract `useMobileFocusedRunIdentity.ts` and remove duplicates from current mobile consumers. |

## Derived Layering (If Useful)

- Presentation: `MobileWorkShell.vue`, `MobileArtifacts.vue`.
- Mobile state derivation: `useMobileFocusedRunIdentity.ts`.
- Shared artifact state/viewer: `runFileChangesStore.ts`, `ArtifactContentViewer.vue`.
- Runtime/data ingestion: existing hydration/streaming services.
- Electron-only Browser: desktop Browser shell outside mobile layer.

## Migration / Refactor Sequence

1. Add `artifacts` to `MobileTaskTab`.
2. Create `useMobileFocusedRunIdentity.ts` and unit tests for agent context, team focused context, mismatched selection, no context, and stale focus cases.
3. Update `MobileActivityDigest.vue` and `MobileToolActivityList.vue` to consume the composable and remove duplicated run-id computed blocks.
4. Add `MobileArtifacts.vue` with phone-first list/empty/viewer layout over `runFileChangesStore` and `ArtifactContentViewer`.
5. Update `MobileWorkShell.vue` to import/render `MobileArtifacts` and add the bottom-nav item with compact six-column layout.
6. Update mobile feature gates/docs to include run Artifacts and explicitly exclude Browser.
7. Update component/source-guard tests and run targeted Vitest suites.

## Key Tradeoffs

- Dedicated bottom tab vs nesting under Files: Dedicated tab matches the user-approved direction and desktop capability name, but consumes a sixth nav slot. This is acceptable if styled compactly and tested.
- Reusing `ArtifactContentViewer` vs building a mobile-specific viewer: Reuse preserves content behavior and reduces risk. A mobile-specific wrapper controls layout without forking viewer logic.
- Browser omission vs placeholder: Omission with docs is cleaner because the current Browser implementation cannot function in mobile runtime.

## Risks

- Six-item bottom nav may be crowded on very narrow devices.
- `ArtifactContentViewer` may need CSS containment verification in mobile wrapper.
- Existing historical team-member artifact hydration may limit old team-run artifact visibility; this must be clearly separated from the mobile surface addition.

## Guidance For Implementation

- Do not import `ArtifactsTab.vue`, `RightSideTabs.vue`, or `BrowserPanel.vue` into mobile components.
- Keep `MobileArtifacts.vue` local state limited to selected artifact id and refresh signal.
- Sort artifacts newest first, matching desktop behavior.
- Use `toAgentArtifactViewerItem` to preserve viewer identity shape.
- Empty states should distinguish at least: no work selected / no active run id / no artifacts.
- Preserve team focus bar on Artifacts by not adding `artifacts` to the hidden-tab list in `MobileWorkShell.vue`.
- Add/update tests before broad validation:
  - `components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` for tab render/viewport and team focus presence on Artifacts.
  - `components/mobile/__tests__/MobileUxRefinement.spec.ts` or a new `MobileArtifacts.spec.ts` for seeded artifacts and selection.
  - `composables/mobile/__tests__/useMobileFocusedRunIdentity.spec.ts` for shared identity policy.
  - `utils/__tests__/mobileFeatureGates.spec.ts` for run artifacts support and Browser absence if assertions exist.
