# Design Spec

## Current-State Read

The `/mobile` shell is phone-first and intentionally separate from desktop split-pane workspace UI. `MobileRemoteAccessShell.vue` owns pairing/home/work-screen orchestration, `MobileWorkShell.vue` owns the bottom task tabs, and the current tab set is Chat, Runs, Files, Artifacts, and Activity. The mobile Artifacts tab already follows the desired pattern: mobile owns presentation, while artifact state/content remain owned by existing run-file-change and artifact-viewer boundaries.

Mobile Files currently has a phone-first browser (`MobileFiles.vue`) and full-screen preview (`MobileFileViewer.vue`), but the implementation does not preserve the desktop file-explorer data-flow contract:

- desktop folder opening goes through `useWorkspaceFileExplorer` and `workspaceStore.fetchFolderChildren()` when children are unloaded;
- mobile folder opening only pushes the selected folder into a local stack;
- desktop workspace-wide search uses `fileExplorerStore.searchFiles()` / `SearchFiles`;
- mobile “deep search” flattens only the loaded in-memory tree;
- desktop and shared file viewers can render multiple content families;
- mobile file viewing currently supports only text/code/Markdown and stores that preview policy inside `useMobileFileContextCoordinator`, which should primarily coordinate attachment targets.

Mobile workspace scoping also needs tightening. `MobileFiles.vue` attempts to resolve a workspace from the `MobileWorkContext`, but if a run context's root cannot be matched, it can fall back to `workspaceStore.activeWorkspace` or the first workspace. For a run-scoped file tab that is the wrong invariant: unresolved selected-run workspace should show an explicit unavailable/loading state, not another workspace.

Desktop team communication references work through a complete message-owned boundary. `TeamCommunicationPanel.vue` renders each `message.referenceFiles[]` entry as a sibling button under the message summary. Selecting a reference renders `TeamCommunicationReferenceViewer.vue`, which fetches content by `teamRunId + messageId + referenceId` through `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` using `authorizedFetch`, then delegates display to `FileViewer`.

Mobile team communication messages (`MobileTeamMessages.vue`) compute the focused-member perspective but collapse references to text: `N reference file(s)`. There is no tappable row and no mobile viewer. This is the direct mobile reference-file clickability gap.

Server-side content contracts and mobile authorization already fit the target. GraphQL POST, `/rest/workspaces/...`, and `/rest/team-runs/...` are protected routes; the mobile Apollo/fetch layers add the Phone Access bearer credential. Android's native app hosts the served `/mobile` shell and has no file/reference-specific native control path in this read.

## Intended Change

Deliver a mobile-web fix that makes Files and team-message reference files usable on Android/phone:

- Refactor mobile workspace-file browsing/viewing into a small mobile owner that delegates to `workspaceStore`, `fileExplorerStore`, `useWorkspaceFileExplorer`, and protected-resource helpers.
- Update `MobileFiles.vue` to browse the correct selected workspace, lazy-load folders, perform real workspace-wide search, and open a read-only file viewer.
- Update `MobileFileViewer.vue` so supported content families are viewable on mobile, not only text/code/Markdown, while preserving the existing `Attach` affordance.
- Add mobile reference-file rows to `MobileTeamMessages.vue`.
- Add a mobile full-screen/sheet wrapper that opens `TeamCommunicationReferenceViewer.vue` by message-owned identity.
- Extract shared team-reference presentation helpers for display name/icon mapping so desktop and mobile stay consistent without importing the desktop panel.
- Preserve desktop behavior, mobile Artifacts, and the separation between run artifacts and team-message references.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / mobile parity behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `MobileFiles.vue` bypasses `fetchFolderChildren()` and true file search, may fall back to the wrong workspace, and relies on preview helpers in an attachment coordinator. `MobileTeamMessages.vue` bypasses the existing Team Communication reference viewer entirely. Existing authoritative owners are already present in `workspaceStore`, `fileExplorerStore`, and `TeamCommunicationReferenceViewer.vue`.
- Design response: Add a mobile workspace-file composable/boundary, narrow the attachment coordinator back toward attachment concerns, and add mobile reference-file presentation that delegates content loading to the existing team-reference viewer.
- Refactor rationale: This is not a broad redesign, but a local refactor is required to prevent a direct patch from duplicating desktop file/reference policy inside mobile components and from preserving unsafe workspace fallback.
- Intentional deferrals and residual risk, if any: Mobile file editing and desktop-level file operations remain out of scope. HTML rich preview may remain raw/read-only on mobile unless implementation can guarantee authorized blob/static handling. Full Android validation depends on a freshly served `/mobile` bundle.

## Terminology

- `Workspace File`: A file/folder in a `WorkspaceInfo.fileExplorer` tree, owned by workspace/file-explorer stores and opened by workspace id plus path.
- `Team Communication Reference File`: A structured `message.referenceFiles[]` entry created from `send_message_to.reference_files`, owned by Team Communication and opened by team run id, message id, and reference id.
- `Agent Artifact`: A run-file-change artifact owned by `runFileChangesStore`; not the same subject as a Team Communication reference file.
- `Mobile file viewer`: A read-only phone surface for one selected workspace file.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the incomplete mobile-only file preview policy instead of preserving it as a parallel fallback. Replace mobile reference count-only rendering with actual reference controls.
- Obsolete paths in scope:
  - `useMobileFileContextCoordinator.getPreviewSupport`, `openPreview`, and `getPreviewState` as file-viewing policy should be removed or reduced after `MobileFileViewer` moves to the new mobile workspace-file owner.
  - `MobileTeamMessages.vue` reference count-only UI should be replaced with reference rows.
- The design must not add dual desktop/mobile reference content routes or linkify raw message prose.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MFRC-001 | Primary End-to-End | User opens mobile `Files` | Correct workspace root/folder entries render | `MobileFiles.vue` + new mobile workspace-file composable | Fixes the reported file explorer display/browse failure. |
| DS-MFRC-002 | Primary End-to-End | User taps a mobile folder | Folder children load and render | `workspaceStore` via mobile workspace-file composable | Restores authoritative lazy folder loading on mobile. |
| DS-MFRC-003 | Primary End-to-End | User searches mobile Files | Workspace search results render | `fileExplorerStore` via mobile workspace-file composable | Ensures “all files” discovery is not limited to loaded nodes. |
| DS-MFRC-004 | Primary End-to-End | User taps a mobile file | Read-only mobile file content view renders | `MobileFileViewer.vue` over `fileExplorerStore`/`FileViewer` | Makes file taps functional like Artifacts, without artifact ownership confusion. |
| DS-MFRC-005 | Primary End-to-End | User taps a mobile team reference row | Reference content opens in mobile viewer | `MobileTeamMessages.vue` + `MobileTeamReferenceViewer.vue` over Team Communication viewer | Fixes reference-file clickability. |
| DS-MFRC-006 | Return-Event | Workspace fetch/watch/file-open state changes | Mobile file list/view updates | `workspaceStore` / `fileExplorerStore` | Keeps mobile synced with existing data owners. |
| DS-MFRC-007 | Return-Event | Team Communication messages hydrate/stream | Mobile reference rows update | `teamCommunicationStore` | Keeps mobile messages/references in the same projection as desktop. |
| DS-MFRC-008 | Bounded Local | Mobile file/reference sheet opens/closes | User returns to the previous mobile list | Mobile viewer components | Preserves phone navigation context. |

## Primary Execution Spine(s)

- DS-MFRC-001: `MobileWorkShell Files tab -> MobileFiles -> useMobileWorkspaceFileExplorer -> workspaceStore active/resolved workspace -> file/folder rows`
- DS-MFRC-002: `Folder row tap -> useMobileWorkspaceFileExplorer.ensureFolderLoaded -> workspaceStore.fetchFolderChildren -> workspace tree update -> MobileFiles folder stack/list`
- DS-MFRC-003: `Search query/toggle -> useMobileWorkspaceFileExplorer.search -> fileExplorerStore.searchFiles -> GraphQL SearchFiles -> mobile search rows`
- DS-MFRC-004: `File row tap -> MobileFiles selected file -> MobileFileViewer -> fileExplorerStore OpenFileState -> FileViewer/viewer components -> authorized content/resource display`
- DS-MFRC-005: `Mobile Activity Messages -> MobileTeamMessages reference row tap -> MobileTeamReferenceViewer -> TeamCommunicationReferenceViewer -> authorized team reference REST route -> FileViewer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MFRC-001 | Mobile Files resolves the selected context's workspace and renders rows from that workspace only. If the selected workspace cannot be resolved, it shows a scoped unavailable/loading state instead of falling back to another workspace. | Mobile context, workspace identity, workspace tree, file rows | `MobileFiles.vue`, new mobile workspace-file composable | Root-path normalization, no-workspace state |
| DS-MFRC-002 | Folder taps call the existing workspace folder-children loader before/while entering the folder, then render the updated children from `workspaceStore`. | Folder row, folder loader, workspace tree | `workspaceStore` | Per-folder loading/error UI |
| DS-MFRC-003 | Workspace-wide search uses the existing file search store/query for matches beyond the loaded tree; normal filter remains local to the current folder. | Search query, file search store, result rows | `fileExplorerStore` | Debounce, search loading/error state |
| DS-MFRC-004 | File taps open a mobile read-only viewer. Text uses content state; media/PDF/Excel use existing viewer/protected-resource helpers. Attach remains available but separate. | File row, open-file state, file viewer | `fileExplorerStore` for content state; `MobileFileViewer.vue` for phone presentation | Attach target policy, too-large/unsupported states |
| DS-MFRC-005 | Mobile team messages render references as rows. Tapping one opens the team-reference viewer by message-owned identity, preserving the current message list behind the sheet. | Message, reference file, reference content viewer | Team Communication viewer/route | Shared reference display helper, close/back affordance |
| DS-MFRC-006 | Workspace fetch/watch updates stay in `workspaceStore`/`fileExplorerStore`; mobile only observes. | Workspace tree, open-file state | `workspaceStore`, `fileExplorerStore` | File-system WebSocket updates |
| DS-MFRC-007 | Team communication hydration/live events stay in `teamCommunicationStore`; mobile only renders the focused perspective. | Team message projection, reference rows | `teamCommunicationStore` | Focused-member selector |
| DS-MFRC-008 | Viewer sheets own only ephemeral open/close/refresh state and do not become content fetch owners. | Viewer sheet state | Mobile viewer components | Back/close, refresh signal |

## Spine Actors / Main-Line Nodes

- `MobileWorkShell.vue`: mobile tab entrypoint.
- `MobileFiles.vue`: phone-first workspace file browser.
- `useMobileWorkspaceFileExplorer.ts` (new): mobile workspace resolution, folder load, search, and file-open adapter.
- `workspaceStore`: authoritative workspace tree and folder-child loading owner.
- `fileExplorerStore`: authoritative file search/open/content state owner.
- `MobileFileViewer.vue`: phone-first read-only file viewer and attach action.
- `MobileTeamMessages.vue`: phone-first team-message/reference list.
- `MobileTeamReferenceViewer.vue` (new): phone-first wrapper for selected reference content.
- `TeamCommunicationReferenceViewer.vue`: authoritative team-reference content route/viewer owner.
- `teamCommunicationStore`: authoritative team message/reference projection owner.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `MobileWorkShell.vue` | Active mobile task tab presentation and tab events | File tree loading, team reference content fetching |
| `MobileFiles.vue` | Phone layout, folder stack, selected file sheet state, visible filter UI | Workspace identity invariants, folder-child query, file content model |
| `useMobileWorkspaceFileExplorer.ts` | Mobile-specific workspace resolution/scoping, lazy-load command, search command, file open/read state adapter | Rendering rows, attachment targets, desktop layout |
| `workspaceStore` | Workspace list/tree, `WorkspaceInfo`, folder children, watcher updates | Mobile presentation |
| `fileExplorerStore` | Open file state, file content fetch/search, file-operation state | Mobile sheet layout, team reference content |
| `MobileFileViewer.vue` | Full-screen/back UI, read-only view composition, attach button placement | Tree/search ownership, team reference content route |
| `useMobileFileContextCoordinator.ts` | Mobile context-attachment target selection and attach/remove/clear operations | Workspace browse/search/file preview policy after refactor |
| `MobileTeamMessages.vue` | Mobile message cards/reference rows and selected-reference sheet state | Reference content fetching, desktop split-pane behavior |
| `MobileTeamReferenceViewer.vue` | Full-screen/back wrapper around a selected message reference | Message-owned content route logic |
| `TeamCommunicationReferenceViewer.vue` | Reference content fetch/type mapping/read-only rendering by team/message/reference id | Mobile message list layout |
| `teamCommunicationStore` | Hydrated/live team communication projection and focused perspective | Reference viewer sheet state |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MobileFileViewer.vue` | `fileExplorerStore` / shared `FileViewer` | Phone shell around read-only file content and attach action | Folder loading, search, workspace fallback |
| `MobileTeamReferenceViewer.vue` | `TeamCommunicationReferenceViewer.vue` | Phone shell with Back/close around existing team-reference content viewer | REST route construction/fetch policy beyond passing props |
| `MobileFiles.vue` | `useMobileWorkspaceFileExplorer.ts` + stores | Phone row/list presentation | Workspace resolution policy duplicated locally |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Text-only preview support functions in `useMobileFileContextCoordinator.ts` (`getPreviewSupport`, `openPreview`, `getPreviewState`) | File viewing should not live in attachment coordinator and must support more than text | `useMobileWorkspaceFileExplorer.ts` + `MobileFileViewer.vue` over `fileExplorerStore` | In This Change | Keep attachment functions in coordinator. |
| `MobileTeamMessages.vue` reference count-only UI | It is the reported inert mobile reference behavior | Tappable reference rows + `MobileTeamReferenceViewer.vue` | In This Change | A compact count may remain as metadata only if buttons are present. |
| Direct local root matching without normalization in mobile Files | Can fail for trailing slash/path format and cause wrong fallback | Shared normalization in new composable | In This Change | Reuse/run-history-compatible normalization shape. |
| “Deep search” over only loaded nodes as workspace-wide discovery | Misleading; cannot find unloaded tree files | `fileExplorerStore.searchFiles()` | In This Change | Local current-folder filtering may remain. |
| Duplicate reference icon/name logic in desktop panel if mobile needs same mapping | Duplication risks drift | `utils/teamCommunication/referenceFilePresentation.ts` | In This Change | Update desktop panel to use helper. |

## Return Or Event Spine(s) (If Applicable)

- DS-MFRC-006: `GetAllWorkspaces/CreateWorkspace/folderChildren/file-system WS -> workspaceStore tree -> useMobileWorkspaceFileExplorer computed rows -> MobileFiles rerender`
- DS-MFRC-006b: `file row tap -> fileExplorerStore OpenFileState loading/content/error -> MobileFileViewer read-only renderer updates`
- DS-MFRC-007: `team communication hydration/stream event -> teamCommunicationStore projection -> MobileTeamMessages focused perspective -> reference rows update`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MobileFiles.vue`
  - `current folder row tap -> pending folder path set -> composable ensureFolderLoaded -> folder stack update/error state -> row list rerender`
  - Matters because Android taps must get feedback while lazy children load.
- Parent owner: `MobileTeamMessages.vue`
  - `reference row tap -> selectedReferenceContext set -> sheet opens -> close clears selectedReferenceContext`
  - Matters because phone navigation should return to the same message context.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Root path normalization | DS-MFRC-001 | `useMobileWorkspaceFileExplorer.ts` | Compare context roots and workspace roots reliably | Prevents wrong no-match/fallback behavior | Mobile could show wrong workspace files. |
| Folder load state | DS-MFRC-002 | `MobileFiles.vue` | Show loading/error for folder taps | Touch users need feedback | Hidden async failures look like inert folders. |
| Search debounce/loading | DS-MFRC-003 | `MobileFiles.vue` / composable | Avoid querying on every keystroke; show search status | Existing desktop search is debounced | Query policy duplication across components. |
| Protected resource authorization | DS-MFRC-004/005 | File/reference viewers | Convert protected REST resources to authorized fetch/object URL where needed | Mobile bearer tokens are not sent by raw media loads | Media/PDF appears broken on Android. |
| Attachment targeting | DS-MFRC-004 | `useMobileFileContextCoordinator.ts` | Attach selected workspace files to active run/draft/pending team | Separate concern from viewing | Viewer becomes mixed with chat context mutation. |
| Reference display name/icon | DS-MFRC-005 | Desktop and mobile reference rows | Consistent file label/icon from path/type | Avoids duplication | Desktop/mobile type mapping drift. |
| Android stale bundle evidence | DS-MFRC-001..005 | Delivery/API-E2E | Verify server serves fresh `/mobile` bundle | Prior mobile ticket hit stale Android runtime | False failure if source fixed but bundle stale. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Workspace tree and lazy folder children | `workspaceStore` / file explorer backend | Reuse | Already authoritative and used by desktop | N/A |
| Workspace-scoped file operations/search/open state | `fileExplorerStore` + `useWorkspaceFileExplorer` | Reuse/Extend | Existing store owns search/open/content state | N/A |
| Mobile workspace resolution and no-fallback invariant | Mobile composables | Create New | Existing desktop/active workspace fallback is not sufficient for mobile run contexts | This is mobile context-specific glue, not core store policy. |
| Read-only content rendering | `FileViewer` + viewer components + authorized resource helpers | Reuse/Extend | Existing viewers support target file families | N/A |
| Team communication reference content | `TeamCommunicationReferenceViewer.vue` + server route | Reuse | Already message-owned and desktop-proven | N/A |
| Mobile wrapper around team-reference viewer | Mobile components | Create New | Existing desktop `TeamCommunicationPanel` is split-pane and should not be imported | Needed only for phone navigation/presentation. |
| Reference display metadata | Team communication utility | Create New | Current mapping is embedded in desktop panel | Shared utility avoids copy/paste. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile work shell | Tab entry and phone layout | DS-MFRC-001/005 | `MobileWorkShell.vue` | Reuse | No tab model change. |
| Mobile workspace files | Mobile workspace resolution, folder loading/search adapter, file viewer sheet | DS-MFRC-001..004 | `MobileFiles.vue`, `MobileFileViewer.vue` | Extend/Create local composable | Main implementation area. |
| Workspace/file explorer core | Workspace tree, folder children, search, open file state | DS-MFRC-001..004/006 | `workspaceStore`, `fileExplorerStore` | Reuse | No backend contract change expected. |
| Team Communication | Message/reference projection and reference content route | DS-MFRC-005/007 | `teamCommunicationStore`, `TeamCommunicationReferenceViewer.vue` | Reuse/Extend presentation | Add mobile rows/wrapper. |
| Protected resource loading | Mobile auth fetch/object URLs | DS-MFRC-004/005 | Viewer components | Reuse | Guard against raw protected static/iframe paths. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile workspace files | Mobile workspace-file adapter | Resolve scoped workspace, normalize roots, lazy-load folders, search files, open/read file state | Cohesive mobile adapter between context and core stores | Uses `workspaceStore`, `fileExplorerStore`, `useWorkspaceFileExplorer` |
| `components/mobile/MobileFiles.vue` | Mobile workspace files | Phone file browser | Header/search/filter/folder-stack/list and selected file sheet | Presentation only after extraction | Uses new composable |
| `components/mobile/MobileFileViewer.vue` | Mobile workspace files | Phone file viewer | Full-screen read-only content, Back, Attach | One selected-file sheet | Uses `FileViewer`, `OpenFileState`, attachment coordinator |
| `utils/teamCommunication/referenceFilePresentation.ts` | Team Communication | Reference presentation helper | File name, extension, icon/type mapping | Shared by desktop and mobile rows | Uses `TeamCommunicationReferenceFile` type |
| `components/mobile/MobileTeamMessages.vue` | Team Communication mobile presentation | Phone message/reference list | Message cards, reference buttons, selected reference context | Existing mobile message surface | Uses presentation helper and mobile viewer |
| `components/mobile/MobileTeamReferenceViewer.vue` | Team Communication mobile presentation | Phone reference viewer wrapper | Full-screen Back/close wrapper, passes team/message/reference props | Keeps mobile navigation out of desktop viewer | Uses `TeamCommunicationReferenceViewer` |
| `components/workspace/team/TeamCommunicationPanel.vue` | Team Communication desktop presentation | Desktop split pane | Keep desktop behavior; use shared reference helper | Existing desktop owner | Uses presentation helper |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reference file display name/icon/extension mapping | `utils/teamCommunication/referenceFilePresentation.ts` | Team Communication | Needed by desktop and mobile reference rows | Yes | Yes | A content-fetching service or UI component |
| Mobile workspace root normalization/resolution | `composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile workspace files | Needed by MobileFiles and maybe MobileFileViewer | Yes | Yes | Generic global active-workspace replacement |
| File preview support classification | New mobile workspace-file composable / viewer-local logic | Mobile workspace files | Replaces text-only helper in attachment coordinator | Yes | Yes | Parallel file content store |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamCommunicationReferenceFile` | Yes | N/A | Low | Use existing type; do not add mobile-only reference shape. |
| `OpenFileState` | Yes | N/A | Low | Use existing file explorer state for workspace file content. |
| New reference presentation helper return values | Yes | Yes | Low | Return only display name/icon/extension helpers; no content data. |
| New mobile workspace-file composable outputs | Yes | Yes | Medium | Keep identity fields explicit: `workspaceId`, `workspace`, `resolutionStatus`; do not return ambiguous active workspace fallback. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Mobile workspace files | Mobile workspace-file boundary | Context-scoped workspace resolution, folder load, search, file open/read adapter | Prevents `MobileFiles.vue` and attachment coordinator from owning store-policy glue | `WorkspaceInfo`, `TreeNode`, `OpenFileState` |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile workspace files | Phone browser | Render rows, breadcrumbs, filter/search controls, folder loading/error state, selected file sheet | Pure phone presentation over composable | New composable |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Mobile workspace files | Phone viewer | Render selected file read-only; Back; Attach | Focused selected-file responsibility | `FileViewer`, `OpenFileState`, attachment coordinator |
| `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts` | Mobile file attachments | Attachment target coordinator | Attach/remove/clear visible context attachments only | Keeps existing chat/run attachment policy coherent | `ContextAttachment` |
| `autobyteus-web/utils/teamCommunication/referenceFilePresentation.ts` | Team Communication | Reference row presentation helper | Shared file name/icon/extension mapping | Avoids desktop/mobile duplication | `TeamCommunicationReferenceFile` |
| `autobyteus-web/components/mobile/MobileTeamMessages.vue` | Team Communication mobile presentation | Phone message/reference list | Render reference buttons and selected viewer sheet | Existing mobile message surface | Reference helper |
| `autobyteus-web/components/mobile/MobileTeamReferenceViewer.vue` | Team Communication mobile presentation | Phone reference wrapper | Full-screen wrapper around existing reference viewer | Separate phone navigation from content owner | `TeamCommunicationReferenceViewer` |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Team Communication desktop presentation | Desktop split-pane panel | Preserve reference selection; consume shared reference helper | Reduces duplicated icon/name mapping | Reference helper |
| `autobyteus-web/docs/remote_access.md` | Docs | Mobile feature contract | Document mobile Files/reference-file support and Android bundle freshness note if needed | Durable product behavior doc | N/A |
| `autobyteus-web/docs/agent_artifacts.md` | Docs | Artifact/reference distinction | Note mobile reference-file support remains Team Communication-owned | Prevents future Artifacts confusion | N/A |

## Ownership Boundaries

- Mobile Files presentation must depend on the mobile workspace-file composable, not directly mix workspace resolution, folder loading, file content, and attachment policy in one component.
- The mobile workspace-file composable may call `workspaceStore` and `fileExplorerStore`; callers above it should not bypass it for the same subject in parallel.
- `useMobileFileContextCoordinator` remains the owner for mobile attachment target policy only. It must not own file preview support after the refactor.
- Team Communication reference content remains owned by `TeamCommunicationReferenceViewer.vue` and the message-owned REST route. Mobile may wrap the viewer, but it must not reconstruct content URLs elsewhere unless that logic is extracted from the viewer as a shared team-reference content owner.
- Artifacts remain owned by run-file-change stores and `ArtifactContentViewer`; team references must not be pushed into `runFileChangesStore` or mobile Artifacts.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| New `useMobileWorkspaceFileExplorer.ts` | Workspace resolution, folder-child loading command, search/open adapter | `MobileFiles.vue`, `MobileFileViewer.vue` | `MobileFiles.vue` directly falling back to first workspace or manually deciding unloaded folder behavior | Strengthen composable outputs/actions |
| `workspaceStore` | Workspace tree and folder children | Mobile workspace-file composable | Local mobile fake tree/folder fetch policy | Call or extend store action |
| `fileExplorerStore` | Search/open/content state | Mobile workspace-file composable/viewer | Separate mobile file content cache for workspace files | Add explicit store action/getter if needed |
| `TeamCommunicationReferenceViewer.vue` | Team reference content route, type mapping, read-only FileViewer handoff | `MobileTeamReferenceViewer.vue`, desktop panel | Mobile constructing reference content route and fetching independently | Extract a shared team reference content composable if viewer reuse is insufficient |
| `teamCommunicationStore` | Message/reference projection | `MobileTeamMessages.vue`, desktop panel | Parsing raw message prose for file paths | Add projection data if needed; do not linkify prose |
| `ArtifactContentViewer` / `runFileChangesStore` | Agent artifacts | `MobileArtifacts.vue`, desktop Artifacts | Rendering team-message references as artifacts | Keep references in Team Communication |

## Dependency Rules

Allowed:

- `components/mobile/*` may import mobile composables, stores, shared viewer primitives (`FileViewer`), and the content-level `TeamCommunicationReferenceViewer.vue`.
- `components/mobile/*` may not import desktop shell/split-pane containers (`FileExplorerLayout`, `FileExplorerTabs`, `TeamCommunicationPanel`, `RightSideTabs`, `BrowserPanel`, `WorkspaceMobileLayout`).
- `useMobileWorkspaceFileExplorer.ts` may depend on `workspaceStore`, `fileExplorerStore`, `useWorkspaceFileExplorer`, and `runHistoryStore.ensureWorkspaceByRootPath` if it needs to resolve a context root.
- `MobileTeamMessages.vue` must read `message.referenceFiles` from `teamCommunicationStore` projections, not parse paths from message content.
- Protected REST resources should be consumed through `authorizedFetch`, `useAuthorizedObjectUrl`, or viewer components that already use those helpers.

Forbidden:

- No Electron APIs in mobile file/reference code.
- No fallback from a run context's unresolved workspace to an unrelated first workspace.
- No duplicate team-reference content fetch route inside `MobileTeamMessages.vue` if `TeamCommunicationReferenceViewer` remains available.
- No compatibility branch keeping the old inert reference count as the only mobile behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useMobileWorkspaceFileExplorer(contextRef)` | Mobile workspace-file subject | Resolve workspace and expose mobile file actions/state | `Ref<MobileWorkContext | null>` | New composable. |
| `ensureFolderChildren(node)` | Workspace folder | Load children when needed | `{ workspaceId, folderPath }` via node/context | Delegates to `workspaceStore.fetchFolderChildren`. |
| `searchFiles(query)` | Workspace file search | Search full workspace | `{ workspaceId, query }` | Delegates to `fileExplorerStore.searchFiles`. |
| `openFileReadOnly(path)` | Workspace file content | Open file state for viewing | `{ workspaceId, filePath }` | Delegates to `fileExplorerStore.openFilePreview` or equivalent. |
| `MobileFileViewer` props | Selected workspace file | Render mobile file sheet | `node/path + workspaceId + context` | Keep attachment context explicit. |
| `MobileTeamReferenceViewer` props | Team communication reference | Render mobile reference sheet | `{ teamRunId, messageId, reference }` | `reference` is `TeamCommunicationReferenceFile`. |
| `TeamCommunicationReferenceViewer` props | Team communication reference content | Fetch/render reference content | `{ teamRunId, messageId, referenceId }` through props | Existing owner. |
| REST `GET /team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` | Team reference content | Stream reference bytes | Path params identify team/message/reference | Existing server route. |
| GraphQL `SearchFiles` | Workspace file search | Return matching file paths | `{ workspaceId, query }` | Existing query. |
| GraphQL `GetFolderChildren` | Workspace folder children | Return shallow folder children | `{ workspaceId, folderPath }` | Existing query through store. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs. Workspace files are identified by workspace id/path; team references are identified by team run/message/reference id; artifacts are identified by run/file-change artifact identity.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useMobileWorkspaceFileExplorer(contextRef)` | Yes | Yes | Medium | Ensure outputs distinguish unresolved selected workspace from no-context fallback. |
| `MobileFileViewer` | Yes | Yes | Low | Require `workspaceId` and selected file path. |
| `MobileTeamReferenceViewer` | Yes | Yes | Low | Require team run id, message id, reference object. |
| `TeamCommunicationReferenceViewer` | Yes | Yes | Low | Existing shape is correct. |
| `MobileTeamMessages` | Yes | Yes | Low | It renders only store-provided reference files, not parsed prose. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile workspace-file adapter | `useMobileWorkspaceFileExplorer` | Yes | Low | Use this instead of vague `fileSupport`/`helper`. |
| Mobile reference wrapper | `MobileTeamReferenceViewer` | Yes | Low | Name by Team Communication reference subject. |
| Team reference presentation helper | `referenceFilePresentation` | Yes | Low | Keep it presentation-only. |
| Attachment coordinator | `useMobileFileContextCoordinator` | Mostly | Medium | Narrow back to attachment context coordination. |

## Applied Patterns (If Any)

- Adapter/composable: `useMobileWorkspaceFileExplorer.ts` adapts `MobileWorkContext` to workspace/file-explorer store identities.
- Thin wrapper: `MobileTeamReferenceViewer.vue` wraps `TeamCommunicationReferenceViewer.vue` with phone navigation but owns no content route logic.
- Shared presentation helper: `referenceFilePresentation.ts` centralizes reference row display mapping.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | File | Mobile workspace-file adapter | Context-scoped workspace resolution, folder load, search/open adapter | Mobile-specific adapter belongs with mobile composables | Desktop layout, attachment mutation UI |
| `autobyteus-web/components/mobile/MobileFiles.vue` | File | Mobile file browser | Phone browsing/search UI and selected-file sheet state | Existing mobile file surface | Direct first-workspace fallback, content fetch internals |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | File | Mobile file viewer | Read-only content viewer and attach button | Existing selected-file mobile sheet | Folder tree/search ownership |
| `autobyteus-web/components/mobile/MobileTeamMessages.vue` | File | Mobile team message/reference list | Reference rows and selected reference sheet | Existing mobile message detail | Reference content fetch implementation |
| `autobyteus-web/components/mobile/MobileTeamReferenceViewer.vue` | File | Mobile reference wrapper | Full-screen/back wrapper for selected reference | Mobile presentation only | Team-reference route/content fetch internals |
| `autobyteus-web/utils/teamCommunication/referenceFilePresentation.ts` | File | Team Communication presentation helper | File name/icon/extension helper | Shared by desktop and mobile without desktop imports | Store mutation or content fetching |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | File | Desktop team communication panel | Continue desktop split-pane behavior using shared helper | Existing desktop owner | Mobile-specific sheet logic |
| `autobyteus-web/docs/remote_access.md` | File | Docs | Update mobile Files/reference capability if changed | Durable feature contract | Implementation details beyond useful contract |
| `autobyteus-web/docs/agent_artifacts.md` | File | Docs | Clarify mobile team references stay Team Communication-owned | Existing artifact/reference distinction doc | Moving references into Artifacts |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile` | Mobile presentation | Yes | Medium | Keep only phone UI/wrappers; avoid desktop split-pane imports. |
| `composables/mobile` | Mobile presentation/domain adapter | Yes | Low | Correct place for `MobileWorkContext` -> store adapters. |
| `utils/teamCommunication` | Shared team-communication presentation utility | Yes | Low | Better than importing desktop component logic into mobile. |
| `stores` | State owners | Yes | Low | Reuse existing stores; no new mobile file store. |
| `components/workspace/team` | Desktop/team content viewer | Yes | Medium | Reusing content-level `TeamCommunicationReferenceViewer` is allowed; do not import `TeamCommunicationPanel` into mobile. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Mobile folder tap | `await mobileFiles.ensureFolderChildren(node); folderStack.push(node);` | `folderStack.push(node); // children may be empty/unloaded` | Explains the current file explorer failure. |
| Workspace scoping | Run context root unresolved -> `Workspace unavailable` with retry/load | Run context root unresolved -> show `allWorkspaces[0]` | Prevents file leakage/wrong files on phone. |
| Reference file opening | `MobileTeamReferenceViewer(teamRunId, messageId, reference)` -> `TeamCommunicationReferenceViewer` | `open workspace file by reference.path` or add to Artifacts | Reference files are message-owned, not workspace/artifact-owned. |
| Mobile viewer reuse | Mobile wrapper delegates to content-level viewer/store | Mobile imports `FileExplorerTabs` or `TeamCommunicationPanel` | Preserves phone-first display instead of desktop layout copy. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep text-only mobile preview and add a few extension exceptions | Minimal patch | Rejected | Move file viewing to broader read-only viewer over file-explorer state/protected resource helpers. |
| Keep mobile reference count and add a separate “open on desktop” hint | Avoids UI work | Rejected | Render tappable reference rows and mobile viewer. |
| Linkify raw paths in mobile message prose | Quick clickable appearance | Rejected | Use structured `message.referenceFiles[]` only. |
| Import desktop `TeamCommunicationPanel` into mobile Activity | Reuses desktop behavior | Rejected | Add phone-first reference rows and mobile wrapper over content viewer. |
| Use Artifacts tab for team reference files | Artifacts already works on mobile | Rejected | Keep Team Communication references message-owned. |
| Fall back to first workspace when selected run workspace is missing | Current behavior can keep UI non-empty | Rejected | Show scoped unavailable/loading state and/or resolve workspace by root through existing store action. |

## Derived Layering (If Useful)

- Mobile presentation layer: `MobileFiles.vue`, `MobileFileViewer.vue`, `MobileTeamMessages.vue`, `MobileTeamReferenceViewer.vue`.
- Mobile adapter layer: `useMobileWorkspaceFileExplorer.ts`, `useMobileFileContextCoordinator.ts` (attachments only).
- Shared state/content owners: `workspaceStore`, `fileExplorerStore`, `teamCommunicationStore`, `TeamCommunicationReferenceViewer.vue`, `FileViewer.vue`.
- Server contracts: existing GraphQL file queries and REST workspace/team-reference content routes.

Layering is descriptive only. Ownership remains the controlling rule.

## Migration / Refactor Sequence

1. Add `utils/teamCommunication/referenceFilePresentation.ts`; move reference file name/icon/extension mapping out of `TeamCommunicationPanel.vue`; update desktop tests to confirm behavior unchanged.
2. Add `components/mobile/MobileTeamReferenceViewer.vue` as a full-screen/sheet wrapper around `TeamCommunicationReferenceViewer.vue`.
3. Update `MobileTeamMessages.vue` to render reference rows/buttons from `message.referenceFiles[]`, open/close the mobile reference viewer, and preserve focused-member perspective.
4. Add `composables/mobile/useMobileWorkspaceFileExplorer.ts`:
   - normalize workspace roots;
   - resolve workspace for each `MobileWorkContext`;
   - avoid unrelated fallback for run/workspace contexts;
   - expose folder load/search/open state actions around existing stores.
5. Update `MobileFiles.vue` to use the new composable for workspace state, folder loading, and search; add loading/error states for unresolved workspaces and folders.
6. Update `MobileFileViewer.vue` to consume open-file state from `fileExplorerStore`/new composable and render read-only supported content families. Keep `Attach` through `useMobileFileContextCoordinator`.
7. Remove/decommission preview support functions from `useMobileFileContextCoordinator.ts` once unused.
8. Add/update tests:
   - mobile folder lazy load;
   - mobile no wrong workspace fallback;
   - mobile real search;
   - mobile file view for text and at least one protected media/PDF-like URL path;
   - mobile reference row click/viewer route props;
   - desktop team reference no-regression;
   - mobile Artifacts no-regression/source guard.
9. Update docs (`remote_access.md`, `agent_artifacts.md`) for mobile Files/reference support and Android served-bundle freshness as needed.

## Key Tradeoffs

- Reusing content-level viewers avoids duplicating content fetch/type logic, but mobile must wrap them in phone navigation rather than import desktop panes.
- A new mobile workspace-file composable adds a small layer, but it removes unsafe fallback and prevents mixed responsibilities in `MobileFiles.vue`/attachment coordinator.
- Mobile file viewing is read-only in this change. That intentionally avoids large mobile edit/save/context-menu scope while solving the reported browse/click/view failure.
- HTML rich preview may be limited or raw on mobile if existing static iframe paths are not authorization-safe. This is preferable to a broken or unauthenticated mobile preview.

## Risks

- Some shared viewer components were designed for desktop dimensions; API/E2E must validate phone viewport sizing/scrolling for PDF/Excel/media.
- Android WebView validation can appear stale if the server serves an old `/mobile` bundle. Delivery must explicitly verify freshness.
- If implementation discovers the workspace content route or GraphQL file content is not available to mobile credentials in a real environment, route back as a requirement/design impact; current route-policy read indicates it should work.
- Very large file handling may require a mobile size cap; implement explicit too-large/unsupported states rather than blocking the whole viewer.

## Guidance For Implementation

- Do not implement this by importing `FileExplorerLayout`, `FileExplorerTabs`, or `TeamCommunicationPanel` into mobile.
- Prefer `TreeNode`/existing workspace types over a reduced local `MobileFileNode` that loses `childrenLoaded`.
- The mobile file viewer should pass protected REST URLs through shared authorized-resource helpers or through viewer components that already do so.
- Keep attachment behavior separate: `Attach` should call `useMobileFileContextCoordinator.attachWorkspaceFile()`, but preview/open state should not live there.
- Preserve existing `MobileArtifacts.vue`; do not add reference files to Artifacts.
- Include tests for both “works” and “does not leak wrong workspace/reference subject” scenarios.
