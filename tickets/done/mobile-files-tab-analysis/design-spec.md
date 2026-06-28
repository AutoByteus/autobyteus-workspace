# Design Spec

## Current-State Read

The reported broken mobile **Files** tab is not owned by native Android or iOS code. Android and iOS are thin trusted WebView/WKWebView shells that load the server-served `/mobile` web app. The mobile web shell owns the bottom navigation and renders `MobileFiles.vue` when the active tab is `files`.

Current execution path:

`Android/iOS wrapper or desktop browser -> /mobile Nuxt shell -> MobileRemoteAccessShell -> MobileWorkShell -> MobileFiles -> useMobileWorkspaceFileExplorer -> fileExplorerStore -> GraphQL/REST/WebSocket file explorer APIs -> workspace filesystem`

Current ownership boundaries are mostly correct:

- Native Android/iOS own pairing, trusted navigation, and web containment only.
- `MobileWorkShell.vue` owns mobile tab routing/presentation frame.
- `MobileFiles.vue` owns mobile Files UI state and interactions.
- `useMobileWorkspaceFileExplorer.ts` owns mobile work-context-to-workspace resolution.
- The shared file explorer store owns tree/content/search state and API calls.
- The server owns authoritative workspace file access and serves `/mobile` assets.

The codebase already contains a mobile Files implementation and backend file APIs. The strongest defect found is a missing error propagation invariant: `fileExplorerTreeActions.fetchFolderChildren()` logs GraphQL/server payload errors and returns instead of surfacing failure to callers. During mobile root resolution, this can leave a selected workspace/run context looking successfully resolved while the root tree is actually unavailable, causing a misleading empty state instead of a clear retryable workspace-unavailable state.

The target design must also respect that Android/iOS behavior depends on the freshness of the served `/mobile` bundle, not only native app installation, and that the user explicitly requires browser/open-tab visual validation of `/mobile` after implementation.

## Intended Change

Implement a narrow mobile-web fix that makes root folder loading fail loudly to mobile workspace resolution and presents an actionable Files-tab state instead of a false empty list. The implementation should:

1. Tighten the shared folder-loading action contract so non-abort, non-stale backend/API failures are observable errors.
2. Update mobile workspace resolution to publish an active workspace only after the workspace metadata is resolved/registered and the initial root folder is confirmed loaded or already valid.
3. Keep no-context and unavailable-workspace states clear and retryable in `MobileFiles.vue`.
4. Add focused tests for the failure and success paths.
5. Use browser/open-tab validation against `/mobile` after the fix, and improve visible UI quality if the checked states are not good.

No native Android/iOS Files UI should be added for this ticket. No backend schema or file-operation expansion is planned unless implementation uncovers a missing server bug.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with small behavior correction and frontend UI validation.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect + Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No large refactor needed now.
- Evidence:
  - `MobileFiles.vue` already implements browse/search/filter/preview/attach UI.
  - `useMobileWorkspaceFileExplorer.ts` already resolves current workspace/run/team-run context and intentionally avoids browsing unrelated fallback workspaces.
  - `fileExplorerTreeActions.ts` currently swallows `folderChildren` GraphQL/server payload failures, so callers cannot reliably distinguish a failed root load from an empty folder.
  - Backend GraphQL, REST content, and WebSocket file explorer capabilities exist.
- Design response: Preserve existing ownership and change the failure contract at the narrow boundary between shared file-tree fetch and mobile workspace resolution.
- Refactor rationale: Existing files are in the right subsystem and have clear responsibilities; the issue is not duplicated ownership or wrong placement. A contract tightening and mobile resolution sequencing fix are sufficient.
- Intentional deferrals and residual risk, if any:
  - Device-specific WebView problems are deferred unless `/mobile` browser validation or later API/E2E testing shows a wrapper transport issue.
  - Stale served mobile bundles are a validation/deployment concern for this ticket, not a source-level architecture rewrite.

## Terminology

- `Mobile shell`: the server-served `/mobile` Nuxt experience loaded by Android/iOS wrappers and desktop browser testing.
- `Files tab`: the mobile bottom-navigation tab that renders `MobileFiles.vue`.
- `Work context`: current workspace, agent run, or team run selected by mobile session state.
- `Resolved workspace`: a workspace whose metadata is known, registered in the shared file explorer store, and whose root folder is available for browsing.
- `Unavailable workspace`: a selected context whose workspace root cannot be resolved or loaded from the paired server process/container.
- `Stale root load`: a folder fetch whose response no longer matches the current request token and should not update or error the current UI.
- `Abort`: an intentionally canceled fetch that should remain silent.

## Design Reading Order

1. Data-flow spine.
2. Existing subsystem ownership allocation.
3. File responsibility mapping for the narrow fix.
4. Interface/error-contract tightening.
5. Visual validation and test guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the silent-success interpretation for non-abort root `folderChildren` failures in the changed code path.
- This ticket must not keep a dual behavior where mobile root resolution can still treat backend/server `folderChildren` errors as an empty successful workspace.
- No native backward-compatibility wrapper or alternate native Files implementation should be introduced.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens `/mobile` Files tab | Workspace root folder list rendered or actionable no-context/unavailable state shown | Mobile Files tab (`MobileFiles.vue` + `useMobileWorkspaceFileExplorer.ts`) | Main user-facing behavior being fixed. |
| DS-002 | Return-Event | Backend/API `folderChildren` failure | Mobile unavailable/error state with retry | Shared file explorer action contract plus mobile resolver | Prevents false empty successful state. |
| DS-003 | Primary End-to-End | User selects/uses a file in mobile Files | File preview/attach interaction | `MobileFiles.vue` and existing file viewer/content loaders | Must remain functional after resolution/error fix. |
| DS-004 | Bounded Local | Implementation engineer opens `/mobile` in browser/open_tab | Visual quality evidence and UI refinements if needed | Implementation validation workflow | User explicitly requires visual frontend validation, not just tests. |
| DS-005 | Return-Event | Served `/mobile` bundle freshness check | Handoff records whether served UI reflects fixed source | Delivery/validation workflow | Explains Android/iOS reports that persist after source changes. |

## Primary Execution Spine(s)

DS-001:

`Android/iOS WebView or browser -> /mobile -> MobileRemoteAccessShell -> MobileWorkShell(files active) -> MobileFiles -> useMobileWorkspaceFileExplorer.resolveWorkspaceForContext -> workspaceStore/fileExplorerStore -> fetchFolderChildren(root) -> backend folderChildren -> file tree nodes -> MobileFiles list/empty/error UI`

DS-003:

`MobileFiles file item -> MobileFileViewer/FileViewer -> fileExplorer content loaders or REST authorized content URL -> preview sheet -> optional attach-to-chat context`

DS-004:

`Implementation engineer -> start local web/server route -> browser open_tab to /mobile -> navigate/select Files states -> inspect loading/no-context/error/empty/list/preview states -> refine UI or record acceptable evidence`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The mobile shell renders the Files tab, resolves the current work context to a workspace, registers that workspace with the shared file explorer store, loads the root folder, and renders the correct Files state. | Mobile route, tab shell, Files UI, mobile workspace resolver, shared file explorer tree action, backend folder listing | Mobile Files tab and resolver | Auth, bundle freshness, visual styling, telemetry/logging |
| DS-002 | A root folder loading failure must travel back as a real failure. Shared tree actions throw observable errors; the mobile resolver catches them and publishes workspace-unavailable state without marking the workspace active. | `fetchFolderChildren`, mobile resolver catch path, `workspaceResolutionError`, retry UI | Shared file explorer store for API contract; mobile resolver for UI state semantics | Abort/stale fetches stay silent; error message formatting remains UI-owned |
| DS-003 | Existing file preview and attach behaviors remain downstream of a successful workspace tree. The fix must not change content/preview ownership. | File item, viewer, REST/content loader, attach action | `MobileFiles.vue` and existing file viewer subsystem | Binary authorization, search, viewer media handling |
| DS-004 | Implementation validation must prove the fixed UI is usable, not merely that unit tests pass. Browser/open-tab validation drives any small UI refinements needed by the observed states. | Browser tab, `/mobile`, Files tab states, implementation evidence | Implementation engineer validation workflow | Local server setup, screenshots/notes, reachable-state limitations |
| DS-005 | Because native wrappers serve the web bundle, validation/handoff must record whether the tested `/mobile` bundle reflects the source change. | Built assets, static mobile server, `/mobile/index.html`/asset hashes or dev server state | Delivery/validation workflow | Native APK/iOS freshness is separate and should not be conflated |

## Spine Actors / Main-Line Nodes

- Android/iOS WebView shell or browser tab: thin entry into `/mobile`.
- `MobileRemoteAccessShell`: mobile top-level shell and current-session context provider.
- `MobileWorkShell.vue`: mobile work shell and bottom-nav tab owner.
- `MobileFiles.vue`: user-facing Files tab UI and interaction owner.
- `useMobileWorkspaceFileExplorer.ts`: current work-context to workspace/file-explorer resolver.
- `fileExplorerStore.fetchFolderChildren(...)`: shared tree-loading command.
- Backend `folderChildren` resolver: authoritative folder listing provider.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| Android/iOS wrappers | Pairing, trusted navigation, web containment | Product Files tab UI or workspace selection semantics |
| `MobileWorkShell.vue` | Tab frame and active-tab rendering | File API error contract or backend fetch details |
| `MobileFiles.vue` | Files presentation state, search/filter controls, preview sheet, retry affordance | Workspace metadata discovery or server filesystem access |
| `useMobileWorkspaceFileExplorer.ts` | Resolving current mobile context to an active workspace; publishing only valid active workspace state | Low-level GraphQL response parsing or UI layout details |
| `fileExplorerTreeActions.ts` | Loading folder children into shared tree state and reporting API failure to callers | Mobile-specific copy, routing, or context fallback |
| Server file explorer APIs | Workspace filesystem reads/search/content streams | Mobile tab UI behavior |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Android `AutoByteusWebView` / iOS `WKWebView` wrapper | Server-served `/mobile` web app | Native installable entrypoint and trusted containment | Files tab implementation |
| `/mobile` static route | Nuxt mobile web shell | Serve mobile assets to browser/WebView | Workspace resolution semantics |
| `MobileWorkShell` tab button | `MobileFiles.vue` and resolver | User-facing tab navigation | File tree API contract |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Silent `return` on non-abort GraphQL `folderChildren` errors in `fetchFolderChildren` | It hides root-load failures from mobile and creates false empty success | Throw/propagate error from `fileExplorerTreeActions.ts` | In This Change | Preserve silent handling only for abort/stale fetches. |
| Silent `return` on server payload `{ error }` for `folderChildren` | Same false-success problem | Throw/propagate payload error from `fileExplorerTreeActions.ts` | In This Change | Error text can be sanitized/formatted by UI layer. |
| Publishing active mobile workspace before root availability is proven | It lets UI treat unresolved/unavailable workspace as active | Publish after successful root fetch or valid seeded tree in `useMobileWorkspaceFileExplorer.ts` | In This Change | Prevent watcher/live session start before active workspace is valid. |
| Any idea of a separate native Files implementation | Would duplicate ownership and not address server-served `/mobile` source | Existing mobile web Files tab | In This Change | Explicitly out of scope. |

## Return Or Event Spine(s) (If Applicable)

DS-002 error flow:

`backend folderChildren GraphQL/server error -> fileExplorerTreeActions throws Error -> useMobileWorkspaceFileExplorer catch path -> workspaceResolutionError + activeWorkspaceId remains empty + activeWorkspaceMetadata remains null -> MobileFiles no-workspace/unavailable panel -> user Retry -> resolver attempts root load again`

Abort/stale flow:

`request aborted or stale request token mismatch -> fileExplorerTreeActions returns silently -> current resolver ignores stale result -> no new user-facing error`

Live update flow remains unchanged:

`backend file explorer WebSocket event -> FileExplorerStreamingService -> shared file explorer store -> MobileFiles tree updates`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useMobileWorkspaceFileExplorer.ts`.
  - Chain: `watch currentContext -> reset local resolution state -> resolve metadata -> ensure workspace registration -> fetch root if needed -> publish active workspace -> start live session`.
  - Why it matters: publication order is the core invariant. Active workspace state must mean the root tree is actually available.
- Parent owner: `MobileFiles.vue`.
  - Chain: `activeWorkspace/resolutionStatus/workspaceResolutionError -> computed no-workspace copy -> template state -> Retry/Choose Workspace action`.
  - Why it matters: the UI state must be actionable and visually good for no-context and unavailable-root cases.
- Parent owner: implementation validation workflow.
  - Chain: `open_tab /mobile -> inspect state -> decide acceptable vs refine -> rerun/reinspect -> record evidence`.
  - Why it matters: user explicitly requested visual validation and UI improvement if not good.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Mobile credential auth | DS-001, DS-003 | API/transport helpers | Attach existing credentials to GraphQL/REST/WebSocket requests | Required for paired mobile sessions | Files UI would become transport-specific and brittle |
| Search/deep search | DS-001, DS-003 | `MobileFiles.vue` + search store | Filter current tree or query workspace search | Existing feature must keep working | Root resolution fix could accidentally overreach into search |
| File preview media loaders | DS-003 | File viewer subsystem | Load text/media/PDF/etc. with existing authorized loaders | Preview is already implemented | Duplicated preview logic in mobile tab |
| Bundle freshness validation | DS-005 | Validation/delivery workflow | Verify served `/mobile` reflects source fix | Native wrappers serve web assets | Source fix might appear absent on phones |
| Visual quality checking | DS-004 | Implementation workflow | Browser/open-tab inspection and small UI refinements | User requirement and frontend quality gate | Unit tests only would miss bad loading/error UX |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Folder loading | Shared file explorer store | Extend | Existing store already owns tree loading; only error contract needs tightening | N/A |
| Mobile context resolution | Mobile file explorer composable | Extend | Existing resolver already maps context to workspace; publication order needs correction | N/A |
| Files UI states | `MobileFiles.vue` | Extend | Existing component owns no-context/error/empty/list states | N/A |
| Backend file APIs | Existing GraphQL/REST/WebSocket APIs | Reuse | Capability already exists | N/A |
| Native app handling | Existing WebView shells | Reuse unchanged | Native is not the feature owner | N/A |
| Visual validation | Browser/open-tab tooling | Reuse | User indicated `/mobile` can be tested this way | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile web shell | Tab selection and Files tab presentation | DS-001, DS-003, DS-004 | `MobileWorkShell.vue`, `MobileFiles.vue` | Extend | Improve state rendering only as needed. |
| Mobile workspace file explorer adapter | Context resolution, active workspace state, retry | DS-001, DS-002 | `useMobileWorkspaceFileExplorer.ts` | Extend | Core invariant fix. |
| Shared file explorer store | Folder children loading and tree state | DS-001, DS-002 | `fileExplorerTreeActions.ts` | Extend | Change error contract for non-abort failures. |
| Server workspace file explorer | Authoritative file operations | DS-001, DS-003 | Server resolvers/routes | Reuse | No schema change planned. |
| Validation workflow | `/mobile` visual check and evidence | DS-004, DS-005 | Implementation/API-E2E/delivery agents | Extend process | Must be explicit in handoffs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | Shared file explorer store | Tree action boundary | Throw observable errors for non-abort/non-stale folder load failures | Existing action already owns folder API response handling | Existing store types/helpers |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile workspace adapter | Mobile resolver | Delay active workspace publication until root is available; surface root load error | Existing composable already owns context/workspace resolution | Existing workspace/file explorer stores |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile web shell | Files UI | Ensure no-context/unavailable/loading/empty/list states are clear and visually acceptable | Existing component owns Files presentation | Existing composable outputs |
| `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts` | Mobile component tests | UI behavior tests | Assert root-load failure shows unavailable/retry, not empty list | Existing focused mobile Files tests live here | Existing test mocks |
| Possible store/composable test near existing store tests | Shared file explorer tests | Store contract tests | Assert `fetchFolderChildren` throws on API/server errors and stays silent for abort/stale | Contract belongs near store action if existing structure supports it | Existing store test utilities |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Folder load error formatting | None planned initially | Shared file explorer + UI boundary | Error creation can stay local unless repeated across actions | Yes | Yes | A broad cross-subsystem error framework |
| Workspace resolution status | Existing composable state | Mobile workspace adapter | Already centralized in `useMobileWorkspaceFileExplorer.ts` | Yes | Yes | Parallel component-only state |
| UI state copy | Existing `MobileFiles.vue` computed copy | Mobile Files UI | Presentation text belongs in component | Yes | Yes | Shared backend/API concern |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `activeWorkspaceId` | Yes, after fix it means root-load-valid active workspace | Yes | Low | Do not set until root is available. |
| `activeWorkspaceMetadata` | Yes, after fix it describes the currently browsable workspace | Yes | Low | Keep local during resolution and publish on success. |
| `workspaceResolutionError` | Yes, selected context failed to resolve/load workspace | Yes | Low | Set on root-load failures; clear on successful retry. |
| File tree folder node | Yes, shared tree representation | Yes | Low | Do not create a mobile-specific folder-node model. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | Shared file explorer store | Folder loading action | Convert non-abort/non-stale API/server payload failures into thrown errors; keep successful tree mutation unchanged | Existing response handling point | Yes |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile workspace adapter | Resolver | Use local resolution variables, fetch/verify root, then publish active workspace; catch errors into `workspaceResolutionError` and no active workspace | Existing mobile context boundary | Yes |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile web shell | UI component | Render clear loading, choose-workspace, workspace-unavailable, retry, empty, list, preview states; refine styling if visual check finds poor UI | Existing Files presentation owner | Yes |
| `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts` and/or nearby composable/store tests | Test suite | Validation | Cover root failure, retry, and successful listing behavior | Existing focused test location | Yes |
| No Android/iOS file changes expected | Native shells | N/A | Leave unchanged unless validation proves wrapper blocks `/mobile` file APIs | Native not feature owner | N/A |

## Ownership Boundaries

Authority changes hands at these points:

- Native wrapper -> `/mobile` web app: wrapper may load/trust the route, but all tab UI behavior belongs to the web app.
- `MobileFiles.vue` -> `useMobileWorkspaceFileExplorer.ts`: component asks for Files state/actions; resolver owns workspace context resolution.
- Mobile resolver -> shared file explorer store: resolver requests tree loading; store owns API response parsing and tree mutation.
- Shared store -> backend APIs: store consumes backend file listings/content/search; backend remains authoritative for filesystem boundaries.

The key boundary rule: `MobileFiles.vue` should not infer root-load success from a workspace ID alone. The resolver must only expose active workspace state when the shared store has successfully established the root tree.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useMobileWorkspaceFileExplorer.ts` composable | Workspace metadata lookup, registration, root fetch sequencing, live session start | `MobileFiles.vue` | Component directly pokes workspace store/file tree to decide if a run root is valid | Add explicit state/actions on composable |
| `fileExplorerStore.fetchFolderChildren(...)` | GraphQL call, payload parsing, tree mutation, stale/abort handling | Mobile resolver and desktop tree consumers | Callers separately parsing GraphQL response to infer failures | Tighten action's error contract |
| Server GraphQL `folderChildren` | Workspace filesystem lease/listing | Frontend stores | Mobile-specific REST/listing bypass for root folders | Fix server resolver only if existing API cannot express needed failure |
| Existing authorized content loaders | Credential attachment and object URL handling | File viewers | Mobile component constructing ad hoc fetch URLs | Extend loaders if missing a content type |

## Dependency Rules

- `MobileFiles.vue` may depend on `useMobileWorkspaceFileExplorer.ts` outputs/actions and shared viewer components. It must not call backend APIs directly for folder listing.
- `useMobileWorkspaceFileExplorer.ts` may depend on workspace and file explorer stores. It must not contain UI layout/styling decisions beyond semantic status/error state.
- `fileExplorerTreeActions.ts` may know GraphQL response shape and shared tree state. It must not know about mobile-specific wording or tab state.
- Backend routes/resolvers must not be changed to accommodate a silent frontend failure path; if backend returns an error, the frontend must surface it.
- Abort/stale request control remains internal to the fetch/action/resolution flow and should not produce user-facing errors.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `fetchFolderChildren(workspaceId, path, ...)` | Folder children in a registered workspace | Load one folder and update shared tree or throw on non-abort failure | Workspace ID + folder path | Must not silently convert server failure into empty success. |
| `resolveWorkspaceForContext(context)` (internal composable flow) | Mobile active workspace | Resolve context to workspace metadata, ensure registration, load root, publish state | Workspace context, agent run context, team run context | Publish active only after root is valid. |
| `workspaceResolutionError` composable output | Mobile resolution failure | Communicate selected context/root failure to UI | Error message/string | UI decides display copy and retry affordance. |
| GraphQL `folderChildren` | Backend folder listing | Return children or error for workspace/path | Workspace ID + relative path | Existing API reused. |
| REST `/rest/workspaces/:workspaceId/content` | File content | Serve protected file bytes | Workspace ID + relative file path | Existing preview path reused. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `fetchFolderChildren` | Yes | Yes | Low | Clarify thrown-error behavior in tests. |
| Mobile workspace resolver | Yes | Mostly | Medium currently due active metadata before root load | Publish only after root success. |
| `workspaceResolutionError` | Yes | Yes | Low | Keep error presentation UI-owned. |
| Native wrapper `/mobile` entry | Yes | Yes | Low | Leave as thin facade. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile Files tab | `MobileFiles` | Yes | Low | No rename. |
| Mobile file explorer adapter | `useMobileWorkspaceFileExplorer` | Yes | Low | No rename. |
| Folder children action | `fetchFolderChildren` | Yes | Low | No rename; behavior contract changes. |
| Workspace resolution error | `workspaceResolutionError` | Yes | Low | No rename. |
| Active workspace | `activeWorkspaceId` / `activeWorkspaceMetadata` | Yes after invariant fix | Medium now | Tighten meaning via publication order. |

## Applied Patterns (If Any)

- **Fail-fast action contract**: shared tree action throws for non-abort API/server failures so upstream owners can react semantically.
- **Publish-after-validate state transition**: mobile resolver keeps local candidate metadata until root availability is proven, then commits active workspace state in one coherent transition.
- **Thin native shell pattern**: Android/iOS remain web containment facades and do not duplicate product UI.
- **Frontend visual validation loop**: implementation includes browser/open-tab inspection and UI refinements as part of the same ticket.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | File | Shared file explorer store | Folder fetch response handling, tree mutation, thrown failure contract | Existing shared tree action owner | Mobile UI copy/layout |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | File | Mobile workspace resolver | Context resolution, root validation, active workspace state, retry integration | Existing mobile-specific adapter owner | GraphQL response parsing details beyond catching store errors |
| `autobyteus-web/components/mobile/MobileFiles.vue` | File | Mobile Files UI | State-specific presentation and interactions | Existing Files tab component | Workspace registration/API fetch internals |
| `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts` | File | Mobile UI tests | Focused Files-tab behavioral assertions | Existing test file for component behavior | End-to-end server setup details |
| Possible existing store test path | File | Shared store tests | Fetch error contract assertions | Keeps store behavior verified near owner | Mobile UI concerns |
| `autobyteus-android/**` | Folder | Native wrapper | No change expected | Native is not Files owner | Product Files implementation |
| `autobyteus-ios/**` | Folder | Native wrapper | No change expected | Native is not Files owner | Product Files implementation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile` | Main-Line Domain-Control + UI presentation | Yes | Low | Mobile components own mobile UI states. |
| `autobyteus-web/composables/mobile` | Main-Line Domain-Control adapter | Yes | Low | Mobile-specific context resolution belongs here. |
| `autobyteus-web/stores` | Shared state/actions | Yes | Medium | Store folder is broad, but existing file ownership is clear for this narrow change. |
| `autobyteus-server-ts/src/api` | Transport/API | Yes | Low | Reused; no planned change. |
| `autobyteus-android` / `autobyteus-ios` | Thin native transport/containment | Yes | Low | No product Files logic should move here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Root failure propagation | `fetchFolderChildren` throws `Error('Workspace root is unavailable')`; resolver catches and leaves `activeWorkspaceId` empty while setting `workspaceResolutionError`. | `fetchFolderChildren` logs error and returns; resolver sets active workspace; UI shows empty list. | This is the core bug fix. |
| Active workspace publication | Resolve metadata in a local variable, register workspace, successfully load `/`, then set `activeWorkspaceMetadata` and `activeWorkspaceId`. | Set `activeWorkspaceMetadata` before root load and rely on later errors to clean up. | Prevents transient false-success state. |
| UI state | Unavailable panel shows selected context name/path when available, concise error, Retry, and Choose workspace if applicable. | Generic “No files match this view” for a failed root request. | Makes the tab actionable for users. |
| Visual validation | Open `/mobile`, inspect Files loading/no-context/unavailable/empty/list/preview states, refine spacing/copy if rough, record evidence. | Only run unit tests and assume UI is fine. | User explicitly requested frontend-style quality. |
| Native scope | Leave Android/iOS unchanged unless wrapper transport is proven broken. | Add native Files screens duplicating web feature. | Avoids ownership drift and duplicate product implementations. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep silent `fetchFolderChildren` error handling for existing callers | It avoids changing a shared action contract | Rejected for non-abort/non-stale failures | Tests should lock the new contract; callers that need silent behavior must explicitly catch and decide. |
| Maintain active workspace state before root validation and add separate UI patch | Minimal code churn | Rejected | Make active workspace mean browsable workspace; use `workspaceResolutionError` for failures. |
| Add native Android/iOS Files implementation | User mentioned Android/iOS | Rejected | Existing `/mobile` web feature remains source of truth. |
| Add fallback to arbitrary workspace when selected run root fails | Could make Files show something | Rejected | Requirements forbid silently browsing unrelated workspace. |

## Derived Layering (If Useful)

The target layering remains:

1. Native/web entry facade: Android/iOS/browser load `/mobile`.
2. Mobile presentation: `MobileWorkShell.vue` and `MobileFiles.vue`.
3. Mobile adapter/control: `useMobileWorkspaceFileExplorer.ts`.
4. Shared frontend state/API adapter: file explorer store actions.
5. Backend API/filesystem provider: GraphQL/REST/WebSocket workspace file explorer.

The fix changes layers 3 and 4, with possible small layer-2 copy/layout refinements after visual validation.

## Migration / Refactor Sequence

1. Add or update failing tests that capture the currently broken state:
   - root `folderChildren` server/GraphQL failure must not render an empty successful Files list;
   - retryable unavailable state should appear;
   - successful folder load should still render files.
2. Update `fileExplorerTreeActions.fetchFolderChildren()`:
   - throw on GraphQL errors;
   - throw when response data is missing/invalid;
   - throw on backend payload `{ error }`;
   - throw if the target folder node cannot be found after a non-stale successful response;
   - preserve silent return for abort/stale request cases only.
3. Update `useMobileWorkspaceFileExplorer.ts`:
   - clear previous resolution error at resolution start;
   - resolve metadata and ensure registration into local/candidate variables;
   - fetch/verify root before publishing active workspace metadata/ID;
   - on failure, keep active workspace empty/null and set `workspaceResolutionError`;
   - start live session/watch only after active workspace publication.
4. Check `MobileFiles.vue` states:
   - ensure resolving/loading copy appears while resolution is running;
   - ensure unavailable state uses `workspaceResolutionError` and retry action;
   - ensure empty-folder/search state is only used after a real workspace root has loaded;
   - refine visual spacing/copy/buttons if browser validation shows poor UI.
5. Run focused unit/component tests. If dependencies are missing in this worktree, either install/prepare them or run in the prepared checkout and record exactly what happened.
6. Start or use a local `/mobile` route and validate visually with browser/open-tab tooling. Inspect reachable states: loading, no-context/choose-workspace, workspace-unavailable/error, retry, empty-folder/search, successful file list, and preview. Improve any unacceptable UI before handoff.
7. Record whether the served `/mobile` bundle/dev route reflects the source fix; hand off any stale-bundle limitation to later delivery validation.

## Key Tradeoffs

- **Throwing from a shared action is stricter than today.** This is intentional because silent API failure is the root issue. The migration risk is mitigated by preserving abort/stale silent behavior and by running focused tests for desktop/shared consumers if available.
- **No native implementation.** This keeps ownership correct and avoids duplicate Files products. If a WebView-specific transport issue is later proven, it should be addressed as wrapper/transport work, not a separate Files tab implementation.
- **Minimal refactor.** Existing owners are healthy enough. Larger store restructuring would slow the fix without improving the in-scope behavior.
- **Visual validation is required.** It adds setup cost but directly addresses the user's quality requirement for a frontend bug.

## Risks

- Existing desktop file explorer callers may implicitly depend on `fetchFolderChildren` never throwing. Mitigation: add/adjust tests and only throw for genuine non-abort failures.
- Local environment may lack dependencies or a runnable server. Mitigation: implementation handoff must document setup attempts, blockers, and any alternate prepared checkout used.
- Root path availability may still fail on the user's paired node if server/container mounts are wrong. Mitigation: mobile UI will show a clear error and retry instead of silent empty state; delivery can separately verify deployment/runtime mounts.
- Stale `/mobile` assets can make Android/iOS appear unfixed after source changes. Mitigation: include bundle freshness/build/served-route validation in implementation/API-E2E/delivery evidence.
- UI states may be hard to reach naturally in local data. Mitigation: use test fixtures/mocks for automated coverage and browser manipulation/local context setup for visual checks where possible.

## Guidance For Implementation

- Treat the ticket as a mobile web/frontend fix first. Do not start in Android/iOS unless validation proves the wrappers block `/mobile` file API traffic.
- Focus on the root-load invariant: an active workspace in mobile Files must mean the workspace root is actually browsable.
- Keep error message handling user-safe and actionable. Avoid dumping stack traces; show concise failure text and Retry/Choose Workspace actions.
- Use existing component styling conventions. If the browser/open-tab check shows cramped spacing, confusing copy, missing retry affordance, or a poor empty/error state, refine `MobileFiles.vue` in the same implementation.
- The user specifically hinted that `/mobile` can be tested using `open_tab`. Use browser/open-tab tooling to open the local `/mobile` route after the fix, inspect Files visually/interactively, and include evidence in the implementation handoff.
- Suggested focused commands after dependencies are available:
  - `pnpm --dir autobyteus-web test:nuxt -- run components/mobile/__tests__/MobileFiles.spec.ts`
  - Add any relevant store/composable test command discovered in the repo.
  - Run lint/type checks for touched web files if practical.
- The isolated worktree initially lacked `node_modules` and `cross-env`; do not mistake that setup failure for product test failure. Prepare dependencies or use a prepared checkout and record the exact validation environment.
