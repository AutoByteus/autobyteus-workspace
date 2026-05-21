# Design Spec

## Current-State Read

The dedicated phone shell is implemented under `autobyteus-web/components/mobile/*` and mounted by `pages/mobile.vue` / mobile-runtime `pages/index.vue`. It is separate from the desktop `/workspace` shell and currently owns three top-level screens: Home, Work, and Troubleshooting.

Current mobile work discovery path:

`MobileRemoteAccessShell.checkStatus()` -> `useMobileWorkCatalog.refreshMobileWorkCatalog()` -> existing domain stores (`runHistoryStore`, `agentDefinitionStore`, `agentTeamDefinitionStore`, `workspaceStore`) -> computed item arrays -> `MobileContextSwitcher`.

The data-source choice is mostly correct: mobile already attempts to reuse the authoritative desktop stores and GraphQL APIs. The defect is that `useMobileWorkCatalog` collapses load results to item arrays and a coarse `{ hadSuccess, hadFailure }`, while `MobileContextSwitcher` renders any empty array as a successful empty segment. Therefore a pending/failed/stale catalog can appear as `No matching agents` and block the start path when no recent run exists.

Current start-new path:

`MobileContextSwitcher.select(agent/team definition)` -> `MobileRemoteAccessShell.openContext()` -> `mobileWorkStore.selectContext(context, preferredTabForMobileContext(context))` -> Work shell Runs tab -> `MobileRuns` with `showRunSetup = false` -> user must press `Start new` manually.

This is not a direct start flow. Selecting a definition changes context but does not immediately expose the run setup that can launch it.

Current mobile tools path:

There is none in the dedicated phone shell. `MobileWorkShell` defines `MobileTaskTab = 'chat' | 'runs' | 'files' | 'activity'`. `MobileActivityDigest` explicitly says interactive terminal/browser/desktop panes are unsupported. However desktop `RightSideTabs` already hosts `Terminal` and `VncViewer`, and the old responsive `/workspace` `WorkspaceMobileLayout` included a Tools panel that rendered `RightSideTabs`. Terminal uses the browser xterm component plus `useTerminalSession`, which already uses the bound node endpoint and mobile credential. VNC uses server settings plus noVNC. This means the reduced mobile shell is a product-boundary decision, not a proven technical limitation for Terminal/VNC in Chrome.

Current Files/Activity mobile surfaces:

`MobileFiles` exposes a crowded header with search plus multiple discovery chips and deep-search toggle. This creates a phone-specific control model and visible clipping risk. `MobileActivityDigest` promotes Errors/Approvals filters and retains unsupported-tool messaging. These are not desktop-equivalent defaults and should be simplified.

Target constraints:

- Preserve desktop behavior and desktop layout routes.
- Keep mobile presentation owned by mobile components; do not import `RightSideTabs` or desktop layout shells into the phone shell.
- Reuse existing domain stores and lower-level tool components where they already own data/protocol behavior.
- Remove the mobile-MVP unsupported Terminal/VNC policy for this scope.

## Intended Change

Convert the phone shell from a reduced mobile-MVP shell into a responsive parity shell for the in-scope capabilities:

1. Make mobile work catalog state explicit and truthful.
2. Make no-recent Home and Switch Work default to startable work, not false empty Recent/Agents states.
3. Bridge agent/team definition selection directly into visible `MobileRunSetup` with the chosen target preselected.
4. Simplify mobile Files default controls while preserving browse/preview/attach capability.
5. Add a mobile-owned Tools surface that exposes Terminal and VNC through phone-sized wrappers around existing browser-compatible tool owners.
6. Remove stale unsupported Terminal/VNC mobile copy and update feature gates/docs/tests accordingly.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The phone shell owns a reduced unsupported-feature boundary even though lower-level domain/tool owners already support much of the behavior. The work catalog collapses load/failure state into empty arrays. Selecting a definition does not govern the next-run setup lifecycle. Files/Activity have mobile-specific defaults that are not desktop-equivalent.
- Design response: Strengthen the mobile shell as the responsive parity owner, extend the mobile work catalog view model, add an explicit mobile run setup intent, add a mobile Tools wrapper, and remove stale unsupported-tool policy/copy.
- Refactor rationale: Without this refactor, isolated fixes would preserve contradictory ownership: mobile would still claim Terminal/VNC are unsupported while reusing backend/tool components elsewhere, and the picker would still be unable to distinguish failed catalogs from true emptiness.
- Intentional deferrals and residual risk, if any: Browser/application iframe parity remains out of scope. xterm touch-keyboard ergonomics and VNC host reachability may require follow-up polish, but the in-scope design must expose truthful Terminal/VNC states rather than hiding them.

## Terminology

- `Mobile parity shell`: the dedicated phone UI under `components/mobile`, responsible for responsive presentation and navigation.
- `Catalog owner`: `useMobileWorkCatalog`, the mobile-specific view model over existing run/definition/workspace stores.
- `Run setup intent`: a mobile-shell state object that says a definition/workspace selection should open the Runs setup with specific defaults.
- `Tool owner`: existing lower-level Terminal/VNC components and composables that own protocol/session behavior.

## Design Reading Order

1. Mobile data-flow spines.
2. Ownership and subsystem allocation.
3. File responsibilities and extracted structures.
4. Concrete folder/path mapping and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old in-scope mobile-MVP rule that treats Terminal/VNC as unsupported solely because they were not in the first phone shell.
- Required action: do not keep dual empty-state behavior where catalog failures can still render as successful empty lists.
- Required action: simplify default Files/Activity controls rather than preserving crowded mobile-only defaults as the primary path.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Paired mobile Home / Switch Work | Truthful recent/agent/team/workspace lists or retriable state | `useMobileWorkCatalog` | Fixes false `No matching agents` and establishes one catalog boundary |
| DS-002 | Primary End-to-End | User selects agent/team definition | Visible mobile run setup with target preselected | `MobileRemoteAccessShell` + `mobileWorkStore` setup intent | Makes selecting a target actually start new work |
| DS-003 | Primary End-to-End | Mobile Files tab | Browse/preview/attach files from selected workspace | `MobileFiles` | Simplifies default file workflow while preserving functionality |
| DS-004 | Primary End-to-End | Mobile Tools tab | Terminal/VNC session or truthful unavailable/config state | `MobileTools` | Restores desktop-equivalent tool functionality on phone |
| DS-005 | Return-Event | Catalog/tool fetch/session result | Loading/error/empty/connected UI state | Owning component/composable per surface | Prevents false empty or unsupported messages |
| DS-006 | Bounded Local | Mobile run setup intent created | Intent consumed/cleared by Runs setup | `mobileWorkStore` | Prevents stale setup auto-open after selection is handled |

## Primary Execution Spine(s)

- DS-001: `Mobile Home/Switch Work -> MobileRemoteAccessShell -> useMobileWorkCatalog -> Definition/Team/Workspace/RunHistory stores -> MobileContextSwitcher segment state`
- DS-002: `MobileContextSwitcher selection -> MobileRemoteAccessShell openContext/requestSetup -> mobileWorkStore setup intent -> MobileRuns -> MobileRunSetup -> useMobileRunLaunchCoordinator -> Agent/Team runtime stores/backend`
- DS-003: `Mobile WorkShell Files tab -> MobileFiles -> WorkspaceStore/FileExplorerStore -> MobileFileViewer -> authorized file APIs -> active-run or draft attachment state`
- DS-004: `Mobile WorkShell Tools tab -> MobileTools -> Terminal/VncViewer -> useTerminalSession/useVncSession/server settings -> bound node WebSocket/VNC host`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The mobile shell refreshes the catalog, each domain store supplies its authoritative data, and the switcher renders each segment as loading/error/empty/items rather than guessing from array length. | Mobile shell, catalog view model, domain stores, switcher | `useMobileWorkCatalog` for catalog state; stores for data | Retry, search filtering, per-category error messages |
| DS-002 | A definition selection creates both a mobile context and a setup intent. The Runs surface consumes that intent, opens setup, preselects target/workspace, and clears the intent after application. | Context switcher, mobile shell, mobile work store, Runs setup, launch coordinator | `MobileRemoteAccessShell` owns transition; `mobileWorkStore` owns setup intent state | Default workspace resolution, team first-message target defaults |
| DS-003 | Files resolves the workspace from current mobile context/run/workspace selection, shows simple browse-first UI, opens preview through existing file store, and attaches to active run or mobile draft. | Work shell, Files, WorkspaceStore, FileExplorerStore, FileViewer | `MobileFiles` owns presentation; file/domain stores own data | Advanced filters hidden behind secondary drawer/menu |
| DS-004 | Tools resolves whether a workspace/tool config is available, then renders Terminal or VNC through mobile layout wrappers while reusing existing session owners. | Work shell, Tools, Terminal, VNC, bound node endpoints | `MobileTools` owns presentation/availability; tool components own sessions | Capability hints, no-workspace state, host configuration guidance |
| DS-005 | Async results flow back to the owning surface and are displayed as truthful states instead of generic unsupported/empty messages. | Catalog/tool session owners, surface state | Each surface owner | Error normalization, retry buttons |
| DS-006 | Setup intent is single-use state to avoid persistent automatic setup opening. | `mobileWorkStore`, `MobileRuns`, `MobileRunSetup` | `mobileWorkStore` | Intent revision/correlation id |

## Spine Actors / Main-Line Nodes

- `MobileRemoteAccessShell`: mobile screen and transition owner.
- `useMobileWorkCatalog`: mobile catalog view-model owner over authoritative domain stores.
- `MobileContextSwitcher`: mobile work picker presentation owner.
- `mobileWorkStore`: current mobile context, active tab, draft attachments, team focus memory, and new setup intent owner.
- `MobileRuns` / `MobileRunSetup`: mobile launch setup presentation and launch submission owner.
- `MobileFiles`: mobile file browsing presentation owner.
- `MobileTools`: new mobile tool presentation and availability owner.
- Existing domain/tool stores/components: authoritative data/session owners for definitions, teams, workspaces, terminal sessions, VNC sessions, and server settings.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `MobileRemoteAccessShell` | Top-level mobile screen state, context open transition, catalog refresh invocation, setup intent creation from picker selection | GraphQL query details, terminal/VNC session protocols |
| `useMobileWorkCatalog` | Segment-level mobile catalog state, item projection, refresh/retry coordination | Definition/workspace persistence, run launch behavior |
| `MobileContextSwitcher` | Search, segment/tab UI, loading/error/empty/items display, selection events | Fetching domain data directly, run setup lifecycle |
| `mobileWorkStore` | Mobile context/tab/draft state and single-use setup intent | Domain catalog fetching, launch validation |
| `MobileRuns` | Runs list vs setup visibility; setup intent consumption | Launch protocol, definition fetching |
| `MobileRunSetup` | Launch form state and preselected defaults | Work catalog ownership, backend transport |
| `MobileFiles` | Phone-sized browse/preview/attach UI | Workspace persistence, file API transport internals |
| `MobileTools` | Phone-sized Terminal/VNC selection and availability states | Terminal/VNC protocol internals |
| `Terminal`/`useTerminalSession` | Terminal rendering and PTY WebSocket lifecycle | Mobile navigation or tab selection |
| `VncViewer`/`useVncSession` | VNC host rendering and noVNC lifecycle | Mobile navigation or work context selection |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MobileTools.vue` | `Terminal.vue` / `VncViewer.vue` for sessions | Phone-sized wrapper and availability selection | PTY/VNC protocol behavior |
| `MobileContextSwitcher.vue` | `useMobileWorkCatalog` for data state | Bottom sheet UI and selection events | Catalog fetch policy |
| `MobileRemoteAccessShell.vue` | Domain stores and mobile stores behind it | Orchestrates mobile screens | Data persistence or protocol sessions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Generic mobile Activity notice saying interactive terminal/browser/desktop panes are unsupported | Terminal/VNC are in scope and should not be declared unsupported | `MobileTools.vue` plus specific unavailable/config states | In This Change | Browser/application iframe may remain out of scope, but copy must not lump Terminal/VNC into unsupported |
| False empty-state behavior in `MobileContextSwitcher` | Empty arrays can mean loading/failure, not true empty | `MobileCatalogSegmentState` from `useMobileWorkCatalog` | In This Change | Show empty only after successful segment load |
| Default crowded Files chip row as the primary UI | Causes clipping and mobile-only complexity | Simplified Files header plus optional secondary filter panel/menu | In This Change | Preserve capabilities behind secondary controls if still useful |
| Mobile feature-gate exclusion for `terminal` and absence of `vnc` support | Old MVP policy conflicts with parity requirements | Updated `mobileFeatureGates.ts` | In This Change | Keep Electron-only local folder picker gated |
| Tests/docs asserting phone shell lacks tools because MVP unsupported | Obsolete product rule | Updated tests/docs for parity | In This Change | Preserve tests that prevent desktop layout import |

## Return Or Event Spine(s) (If Applicable)

- DS-005 catalog return path: `domain store fetch result -> useMobileWorkCatalog segment state -> MobileContextSwitcher loading/error/empty/items -> retry event -> useMobileWorkCatalog.refreshSegment/refreshAll`.
- DS-005 tool return path: `Terminal/VNC session/settings state -> MobileTools card/tab state -> retry/connect/config guidance`.

## Bounded Local / Internal Spines (If Applicable)

- DS-006 setup intent consumption: `mobileWorkStore.requestRunSetup(intent) -> MobileRuns watcher sees new revision -> showRunSetup = true -> MobileRunSetup applies target/workspace defaults -> mobileWorkStore.consumeRunSetupIntent(revision)`.
- This matters because a selected agent/team should open setup once, but normal navigation back to Runs should not repeatedly force setup open after the user closes it.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Search filtering | DS-001 | `MobileContextSwitcher` | Filter visible items by query | UI-only concern | Would pollute catalog owner with presentation state |
| Error normalization | DS-001, DS-005 | `useMobileWorkCatalog` | Convert store errors into segment messages | Avoid false empty states | If kept in component, each segment duplicates policy |
| Workspace resolution for mobile context | DS-003, DS-004 | `MobileFiles`, `MobileTools` | Map run/workspace context to workspace id/root | Needed before files/tools can work | If hidden in Terminal, Terminal may connect to stale desktop active workspace |
| Advanced file filters | DS-003 | `MobileFiles` | Optional Recent/Attached/Type/Deep Search | Useful but not primary | Default header becomes crowded again |
| Capability/config hints | DS-004 | `MobileTools` | Explain no workspace/no host/capability unavailable | Honest unavailability | If placed in feature gates, UI loses context-specific recovery |
| Test fixtures | All | Test files | Seed no-recents + agents/teams/catalog failures | Prevent regressions | Without fixtures, screenshot bug can return |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent/team/workspace discovery | Existing Pinia domain stores | Reuse/Extend via `useMobileWorkCatalog` | They are authoritative and already used by desktop | N/A |
| Run launch | `MobileRunSetup` + `useMobileRunLaunchCoordinator` + run config stores | Reuse/Extend | Existing mobile launch semantics are close; needs direct entry intent | N/A |
| Terminal | `Terminal.vue` + `useTerminalSession` | Reuse | Already browser-based and remote-auth aware | N/A |
| VNC | `VncViewer.vue` + `VncHostTile.vue` + `useVncSession` | Reuse | Already browser/noVNC-based | N/A |
| Mobile tool presentation | No dedicated phone wrapper | Create New `MobileTools.vue` | Desktop `RightSideTabs` is layout-specific and forbidden in mobile shell | Existing low-level tools are not navigation wrappers |
| Catalog segment state | `useMobileWorkCatalog` has only arrays/booleans | Extend | Existing file is correct owner | N/A |
| Setup intent state | `mobileWorkStore` has mobile context/tab state | Extend | Same store owns mobile work state | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile shell | Top-level phone navigation, context transitions, task tabs | DS-001, DS-002, DS-004 | `MobileRemoteAccessShell`, `MobileWorkShell` | Extend | Add Tools and setup intent transition |
| Mobile work catalog | Segment state and item projection | DS-001, DS-005 | `useMobileWorkCatalog` | Extend | Per-category status/error/retry |
| Mobile run setup | Launch UI and defaults | DS-002, DS-006 | `MobileRuns`, `MobileRunSetup` | Extend | Visible setup on definition selection |
| Mobile files | Phone file browse/preview/attach | DS-003 | `MobileFiles`, `MobileFileViewer` | Extend | Simplify default controls |
| Mobile tools | Phone Terminal/VNC presentation | DS-004, DS-005 | New `MobileTools` | Create New | Reuse tool components; do not import desktop right panel |
| Feature gates/docs | Mobile support policy | DS-004 | `mobileFeatureGates`, docs | Extend | Terminal/VNC supported if configured/capable |
| Tests | Regression and parity checks | All | Test suites | Extend | Update obsolete MVP assertions |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `composables/mobile/useMobileWorkCatalog.ts` | Mobile work catalog | Catalog view model | Item lists plus segment loading/error/status and refresh/retry | Existing owner; extend not duplicate | Yes, new catalog state types |
| `types/mobileWork.ts` | Mobile shell types | Mobile work model | Add `tools` tab and setup intent types | Existing mobile shared type owner | Yes |
| `stores/mobileWorkStore.ts` | Mobile shell state | Mobile state store | Single-use run setup intent lifecycle | Same owner as current context/tab | Yes |
| `components/mobile/MobileContextSwitcher.vue` | Mobile catalog UI | Picker UI | Render segment states and emit start/select intent | Presentation file | Yes |
| `components/mobile/MobileRemoteAccessShell.vue` | Mobile shell | Screen transition owner | Create setup intent on definition selection; pass catalog state | Existing orchestrator | Yes |
| `components/mobile/MobileRuns.vue` | Mobile run setup | Runs/setup surface | Consume setup intent and open setup | Existing owner of setup visibility | Yes |
| `components/mobile/MobileRunSetup.vue` | Mobile launch UI | Launch form | Apply target/workspace defaults from setup intent | Existing launch form | Yes |
| `components/mobile/MobileWorkShell.vue` | Mobile shell | Task navigation | Add Tools tab | Existing bottom-nav owner | Yes |
| `components/mobile/MobileTools.vue` | Mobile tools | Tools wrapper | Terminal/VNC mobile UI and states | New presentation owner | Yes |
| `components/mobile/MobileFiles.vue` | Mobile files | Files UI | Simplify default controls | Existing file owner | No new shared needed |
| `components/mobile/MobileActivityDigest.vue` | Mobile activity | Activity UI | Remove unsupported notice, simplify filters | Existing file owner | No |
| `utils/mobileFeatureGates.ts` | Feature gates | Support policy | Mark terminal/vnc supported; keep real unsupported gates | Existing policy owner | No |
| `docs/remote_access.md` | Documentation | Phone Access docs | Update parity posture and real constraints | Existing docs owner | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Catalog segment state (`status`, `items`, `error`, `retry`) | `types/mobileWork.ts` or local exported types in `useMobileWorkCatalog.ts` | Mobile work catalog | Shared between catalog composable and switcher | Yes | Yes | Generic app-wide async state kitchen sink |
| Run setup intent (`kind`, target id, optional workspace id, revision) | `types/mobileWork.ts` | Mobile shell state | Shared by shell/store/runs/setup | Yes | Yes | Parallel run config model |
| Workspace resolution from mobile context | Prefer local helper in `MobileTools.vue`; extract only if duplicated with `MobileFiles` after implementation | Mobile shell/files/tools | Avoid divergent root matching | Yes | Yes | Hidden global workspace selector |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileCatalogSegmentState<T>` | Yes | Yes | Low | Keep fields minimal: `status`, `items`, `errorMessage`, optional `lastUpdatedAt` only if used |
| `MobileRunSetupIntent` | Yes | Yes | Medium | Do not duplicate full run config; only target/workspace defaults plus revision |
| `MobileTaskTab` | Yes | Yes | Low | Add only `tools`; do not split terminal/vnc into top-level tabs unless product asks |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile work catalog | Catalog view model | Per-segment refresh state, item projection, retry methods | Single owner over domain stores for mobile picker | `MobileCatalogSegmentState` |
| `autobyteus-web/types/mobileWork.ts` | Mobile shared model | Mobile shell contracts | `MobileTaskTab`, `MobileWorkContext`, `MobileRunSetupIntent`, keys/titles | Existing shared mobile type file | Yes |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile state | Mobile work state store | Context/tab/draft/team focus/setup intent | One mobile state owner | `MobileRunSetupIntent` |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Mobile shell | Screen transition owner | Open context, default no-recent picker behavior, setup intent creation | Existing mobile orchestrator | Yes |
| `autobyteus-web/components/mobile/MobileContextSwitcher.vue` | Mobile catalog UI | Picker presentation | Segment loading/error/empty/items; emits selected context | One bottom-sheet concern | `MobileCatalogSegmentState` |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Mobile runs | Runs/setup presentation | Show setup on explicit setup intent; list recent runs otherwise | Existing owner of setup visibility | `MobileRunSetupIntent` |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile launch UI | Launch form | Preselect from context/setup intent; submit via coordinator | Existing form owner | `MobileRunSetupIntent` |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile shell | Work task nav | Add Tools tab rendering `MobileTools` | Existing bottom nav owner | `MobileTaskTab` |
| `autobyteus-web/components/mobile/MobileTools.vue` | Mobile tools | Tools presentation | Terminal/VNC segmented cards/states | New wrapper needed; lower-level tools own sessions | Maybe local helper |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile files | Files presentation | Simplified default controls, overflow-safe advanced filters | Existing file owner | No |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile activity | Activity presentation | Remove unsupported notice; simplify default filters | Existing activity owner | No |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Feature policy | Mobile support map | Support terminal/vnc; keep real desktop-only gates | Existing feature-gate owner | No |
| `autobyteus-web/docs/remote_access.md` | Docs | Phone Access docs | Update parity and constraints | Existing doc | No |

## Ownership Boundaries

- Mobile shell owns phone navigation and presentation, not domain data or transport protocols.
- Domain stores remain authoritative for definitions, teams, workspaces, run history, and run configs.
- Tool components remain authoritative for Terminal/VNC session behavior.
- `useMobileWorkCatalog` is the single mobile boundary above domain stores for picker-ready catalog state. Components must not independently call definition/workspace fetches for picker display.
- `MobileTools` is a presentation boundary above Terminal/VNC, not a new terminal or VNC protocol owner.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useMobileWorkCatalog` | Store fetches, item projection, segment state | `MobileRemoteAccessShell`, `MobileContextSwitcher`, `MobileRunSetup` for choices | Components separately fetching and deriving inconsistent empty/error states | Add segment state/retry APIs to catalog |
| `mobileWorkStore` | Current context/tab/setup intent/draft attachments | Mobile shell components | Passing ad-hoc setup flags through multiple components only | Add typed setup intent state |
| `useMobileRunLaunchCoordinator` | Launch validation and run creation submission | `MobileRunSetup` | Directly calling agent/team run stores from picker | Extend coordinator if launch flow needs more data |
| `Terminal.vue` / `useTerminalSession` | xterm and PTY WebSocket lifecycle | `MobileTools` | MobileTools constructing terminal WebSocket directly | Add props/options to Terminal/session composable if needed |
| `VncViewer.vue` / `useVncSession` | noVNC session and host tiles | `MobileTools` | MobileTools implementing noVNC directly | Add mobile layout props to VNC components if needed |

## Dependency Rules

Allowed:

- `components/mobile/*` may import mobile composables/stores/types and lower-level browser-compatible tool components.
- `MobileTools.vue` may import `components/workspace/tools/Terminal.vue` and `VncViewer.vue`.
- `useMobileWorkCatalog.ts` may import domain stores.
- `MobileRunSetup.vue` may use `useMobileRunLaunchCoordinator` and catalog choices.

Forbidden:

- Dedicated phone shell must not import `RightSideTabs`, `WorkspaceDesktopLayout`, or desktop layout shells.
- `MobileContextSwitcher` must not fetch GraphQL/domain data directly.
- `MobileTools` must not duplicate Terminal/VNC transport/session code.
- Mobile feature gates must not label Terminal/VNC unsupported merely because of old MVP scope.
- Desktop routes/layouts must not be rewritten to satisfy mobile parity.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `refreshMobileWorkCatalog(options?)` | Mobile catalog | Refresh all segment data and update segment states | Optional `{ force?: boolean }` | Return richer result or expose state refs |
| `refreshMobileCatalogSegment(segmentId)` | Mobile catalog | Retry one failed/empty segment | `'recent' | 'agents' | 'teams' | 'workspaces'` | Optional if full refresh is enough for first pass |
| `requestRunSetup(intent)` | Mobile work state | Create single-use setup intent | `{ kind: 'agent'|'team', agentDefinitionId?/teamDefinitionId?, workspaceId?, revision }` | Do not include full config |
| `consumeRunSetupIntent(revision)` | Mobile work state | Clear applied intent | revision/id | Prevent stale repeated opening |
| `MobileContextSwitcher @select-context` | Picker UI | Select context | `MobileWorkContext` | Shell decides if setup intent is needed |
| `MobileTools` props | Tools UI | Render tools for current context | `MobileWorkContext | null` | Resolves workspace availability |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `refreshMobileWorkCatalog` | Yes | Yes | Low | Keep segment ids explicit if segment retry added |
| `requestRunSetup` | Yes | Yes | Medium | Use discriminated union; no generic target id without kind |
| `MobileContextSwitcher @select-context` | Yes | Yes | Low | Continue using `MobileWorkContext` discriminated union |
| `MobileTools` context prop | Yes | Yes | Low | Resolve workspace by context kind explicitly |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile work catalog | `useMobileWorkCatalog` | Yes | Low | Keep |
| Mobile tool wrapper | `MobileTools` | Yes | Low | Add file |
| Setup intent | `MobileRunSetupIntent` | Yes | Medium | Ensure it is not a config clone |
| Mobile tabs | `MobileTaskTab` including `tools` | Yes | Low | Extend |

## Applied Patterns (If Any)

- Adapter/view-model: `useMobileWorkCatalog` adapts authoritative stores into mobile picker segment states.
- State-machine-lite / single-use intent: `mobileWorkStore` setup intent uses revision/id to move from requested -> consumed without repeated side effects.
- Wrapper/adapter: `MobileTools` adapts lower-level Terminal/VNC components into a phone layout without owning their sessions.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileTools.vue` | File | Mobile tools presentation | Terminal/VNC segmented mobile surface and availability states | Mobile folder owns phone shell screens | PTY/noVNC implementation |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | File | Mobile work task navigation | Add Tools tab | Existing bottom-nav owner | Tool protocols |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | File | Mobile catalog view model | Segment states and refresh | Existing mobile catalog owner | UI rendering |
| `autobyteus-web/types/mobileWork.ts` | File | Mobile shared contracts | Add `tools`, catalog/setup types if shared | Existing shared mobile type owner | Domain store types unrelated to mobile |
| `autobyteus-web/stores/mobileWorkStore.ts` | File | Mobile work state | Setup intent lifecycle | Existing mobile state store | Catalog fetches |
| `autobyteus-web/components/mobile/MobileFiles.vue` | File | Mobile files UI | Simplify default header/filters | Existing files surface | Workspace persistence |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | File | Mobile activity UI | Remove unsupported notice and simplify filters | Existing activity digest | Tools session UI |
| `autobyteus-web/utils/mobileFeatureGates.ts` | File | Feature support policy | Update terminal/vnc support | Existing mobile gate owner | UI copy beyond feature ids |
| `autobyteus-web/docs/remote_access.md` | File | Phone Access docs | Document parity posture and real unsupported constraints | Existing docs | Implementation code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile` | Main-Line Domain-Control / Presentation | Yes | Low | Phone shell surfaces live here; low-level tools may be reused from workspace/tools |
| `composables/mobile` | Off-Spine Concern / View-model | Yes | Low | Mobile-specific catalog and launch coordination |
| `stores` | Main-Line state | Yes | Low | Existing Pinia state owners |
| `components/workspace/tools` | Transport/session presentation | Yes | Low | Existing Terminal/VNC owners reused without moving |
| `utils` | Off-Spine policy | Yes | Low | Feature gates remain utility policy |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Catalog state | Agents segment shows `Loading agents…`, `Could not load agents. Retry`, or agent rows based on segment status | Always rendering `No matching agents` when `agentItems.length === 0` | Prevents the screenshot regression |
| Direct start | Select `Builder Agent` -> Work/Runs opens with setup visible and Builder Agent selected | Select `Builder Agent` -> context title changes but user must discover `Start new` | Makes selection actionable |
| Tools wrapper | `MobileTools` renders local tabs `Terminal` / `VNC` and imports `Terminal.vue` / `VncViewer.vue` | Importing `RightSideTabs` into mobile shell | Reuses tool owners without desktop layout dependency |
| Files simplification | Header shows workspace + search + one `Filters`/`More` button; folder list remains primary | Four or five chips clipped across the top of the phone | Matches desktop mental model and avoids crowding |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Terminal/VNC unsupported notice while adding hidden/experimental tools | Avoids changing old mobile MVP text | Rejected | Remove notice; expose Tools with truthful availability states |
| Keep false empty state but add Refresh button elsewhere | Smallest change | Rejected | Empty state must be based on successful loaded empty catalog only |
| Import desktop `RightSideTabs` into mobile shell | Fast way to expose Terminal/VNC | Rejected | Add `MobileTools` wrapper around lower-level tool components |
| Preserve default Files chip row and only tweak CSS | Minimal visual change | Rejected | Simplify default controls; move advanced filters behind secondary UI |

## Derived Layering (If Useful)

- Presentation: `components/mobile/*`, lower-level `components/workspace/tools/*`.
- View model/coordination: `composables/mobile/*`, `stores/mobileWorkStore.ts`.
- Domain state: existing definition/team/workspace/run stores.
- Transport/session: existing terminal/VNC/file/session composables and stores.

Layering remains secondary to ownership: mobile presentation calls mobile catalog/setup boundaries and lower-level tool owners, not internal protocol code.

## Migration / Refactor Sequence

1. Extend shared mobile types:
   - Add `tools` to `MobileTaskTab`.
   - Add `MobileRunSetupIntent` discriminated union if shared across store/components.
   - Add catalog segment status types either in `types/mobileWork.ts` or exported from `useMobileWorkCatalog.ts`.
2. Extend `mobileWorkStore`:
   - Add `runSetupIntent` state.
   - Add `requestRunSetup`, `consumeRunSetupIntent`, and clear intent on unpair/clear context.
3. Extend `useMobileWorkCatalog`:
   - Track per-segment loading/error/status.
   - Return segment states and refresh/retry methods.
   - Preserve item projections from existing stores.
4. Update `MobileContextSwitcher`:
   - Render loading/error/retry/empty/items per segment.
   - Default active segment to startable work when no recents exist.
   - Keep search local.
5. Update `MobileRemoteAccessShell`:
   - Pass catalog states to switcher.
   - On agent/team definition selection, select context, switch to Runs, and request setup intent.
   - On workspace selection, keep Files preference.
6. Update `MobileRuns` and `MobileRunSetup`:
   - Consume setup intent and set `showRunSetup = true` once.
   - Apply target/workspace defaults from intent/context.
7. Add `MobileTools.vue` and update `MobileWorkShell.vue`:
   - Add Tools nav item.
   - Render Terminal/VNC subtabs/cards with no-workspace/no-config states.
   - Reuse `Terminal.vue` and `VncViewer.vue` directly; do not import `RightSideTabs`.
8. Simplify `MobileFiles.vue` default header:
   - Keep search and workspace/folder context visible.
   - Move Recent/Attached/Markdown-code/Deep-search to a secondary filters panel/menu or collapse them behind one button.
9. Update `MobileActivityDigest.vue`:
   - Remove unsupported Terminal/VNC notice.
   - De-emphasize Errors/Approvals chips from default top-level filters; if retained, put behind secondary filter control.
10. Update `mobileFeatureGates.ts`, tests, and `docs/remote_access.md`:
    - Mark Terminal/VNC as supported mobile-safe features.
    - Keep settings/updates/local-folder-picker/application iframe restrictions.
11. Validation:
    - Install dependencies in the dedicated worktree if absent.
    - Run targeted mobile/unit tests and full relevant frontend validation.

## Key Tradeoffs

- New `MobileTools` wrapper adds one presentation file but avoids importing the desktop right-panel layout and preserves mobile shell ownership.
- Setup intent adds a small state-machine-like concept, but it prevents fragile prop chains and stale repeated setup opening.
- Simplifying Files may hide some power filters one tap deeper; this is intentional because the default mobile surface should match core desktop functionality first.
- VNC/Terminal may not be perfect ergonomically on a phone immediately, but hiding them entirely is a bigger functionality loss.

## Risks

- Terminal may need additional mobile keyboard shortcuts or paste handling after real-device validation.
- VNC hosts configured as `localhost` may be unreachable from phone. UI/docs must explain host reachability rather than treat VNC as unsupported.
- If `workspaceStore.activeWorkspace` does not track mobile context reliably for Tools, `MobileTools` may need an explicit workspace-selection bridge before rendering Terminal.
- Existing tests that intentionally blocked desktop tool imports must be updated carefully: still block desktop layout imports, but allow lower-level tool component imports.

## Guidance For Implementation

- Start with catalog state and direct setup because they directly fix screenshot #1.
- Keep changes frontend-scoped unless real API authorization failures appear during validation.
- Prefer adding tests before/alongside changes for:
  - no-recent + agents/teams visible;
  - catalog failure displays retry, not empty;
  - selecting agent/team opens setup visible with target preselected;
  - Tools tab renders Terminal/VNC states;
  - Files default controls fit 390px width by DOM/class assertions or browser screenshot test if available.
- Do not regress desktop `/workspace`, desktop `RightSideTabs`, or desktop settings/update routes.
