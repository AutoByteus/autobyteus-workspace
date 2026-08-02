# Design Spec

## Current-State Read

The two requested user journeys already converge on one healthy production
structure. Direct File Explorer selection enters through FileItem.vue and the
workspace file explorer, then the file explorer store classifies the path with
utils/fileExplorer/fileTypePolicy.ts. The store already routes Image states
through its existing local or workspace media URL branches, and FileViewer.vue
already maps Image to ImageViewer.vue.

Event Monitor path actions are opt-in. Their normalization and action policy
uses the same file-type policy. useEventMonitorFilePreview is a thin launcher
that calls the same File Explorer preview store, opens the right-side panel,
selects Files, applies read-only intent, and focuses the active file tab.

The defect is a missing supported-family entry, not a missing viewer or a
fragmented Event Monitor renderer. fileTypePolicy.ts has Image in its
FileDataType union but omits .svg from IMAGE_EXTENSIONS. Classification becomes
Unsupported before URL construction or viewer dispatch, matching the supplied
screenshot. The existing Electron local protocol and workspace REST content
route already validate access and derive image/svg+xml through the installed
MIME package.

## Intended Change

Add .svg to the existing IMAGE_EXTENSIONS set in
autobyteus-web/utils/fileExplorer/fileTypePolicy.ts.

The resulting Image value will make direct File Explorer selection and eligible
Event Monitor SVG actions follow the existing media URL, right-side Files,
FileViewer, and ImageViewer path. Preserve all existing loading, error,
authorization, path containment, read-only, focus, zoom/pan, and unsupported
behavior. Do not add a new renderer, store branch, Event Monitor path, backend
route, local protocol, schema, migration, or compatibility wrapper.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Current Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-004; AC-001, AC-002, AC-004, AC-005 | User selects a workspace SVG row | FileItem -> store -> shared policy currently yields Unsupported -> no URL/viewer | Add .svg as Image and reuse existing media URL/ImageViewer path | DS-001, DS-003 |
| BEH-002 | User | REQ-001, REQ-003, REQ-004, REQ-005; AC-001, AC-003, AC-004, AC-006, AC-007 | Explicit click, Enter, or Space on an eligible Event Monitor SVG path | Action policy calls the shared classifier and currently rejects SVG; launcher already opens Files/read-only for supported types | SVG becomes a typed action; reuse launcher, Files panel, read-only state, and shared viewer | DS-002, DS-003 |
| BEH-003 | System / Contract | REQ-004; AC-004, AC-006 | FileViewer receives type Image and a content URL | Image already dispatches to ImageViewer; authorized URL helper and media boundaries already exist | Preserve URL/object URL lifecycle and image presentation; no inline SVG source | DS-003 |
| BEH-004 | System / Contract | REQ-001, REQ-004; AC-001, AC-005 | Policy receives any path | Pure lowercased allowlist returns Unsupported for unknown/binary paths | Add only .svg; preserve inert unsupported behavior and no content probe | DS-004 |
| BEH-005 | Operational / Contract | REQ-004; AC-004, AC-006 | Supported media request reaches runtime content boundary | Electron and workspace boundaries validate access, file kind, MIME, and bytes | Reuse current boundaries without a new transport | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/in-progress/svg-file-preview/svg-preview-ui-ux-spec.md | Direct File Explorer and Event Monitor journeys, visible states, read-only/right-panel, focus, and non-happy paths | REQ-002–REQ-005; AC-002–AC-007 | Confirms reuse of existing surfaces and states; adds no runtime owner | Requirements-ready; explicit user request and screenshot are approval basis |

## Task Design Health Assessment

- Change posture: Bug Fix / Behavior Change
- Current design issue found: Yes
- Root cause classification: Local Implementation Defect
- Refactor needed now: No
- Evidence: One shared policy governs both File Explorer classification and
  Event Monitor action eligibility. FileViewer already maps Image to ImageViewer,
  and both content boundaries already support generic image media.
- Design response: Extend one allowlist, preserve all existing owners, and add
  focused coverage/documentation.
- Refactor rationale: The owner, boundary, API shape, file placement, and
  transient state shape remain healthy. A refactor would duplicate or weaken the
  recent shared-policy invariant.
- Deferred risk: Live browser/Electron validation is downstream work. Interactive
  or inline SVG is explicitly outside this image-preview design.

## Terminology

- Shared file-type policy: the pure classifier in fileTypePolicy.ts.
- Image family: FileDataType Image, dispatched by FileViewer to ImageViewer.
- Event Monitor file action: an opt-in typed action for a supported absolute path
  or supported absolute file URI; it is not a persisted reference.
- Right-side Files surface: the existing FileExplorerTabs panel selected by the
  right-panel tab coordinator.
- Trusted content boundary: the capability-gated Electron local protocol or
  workspace-contained, MIME-aware REST route, optionally wrapped by the
  authorized object URL helper.

## Legacy Removal Policy

- Policy: No backward compatibility; remove legacy code paths.
- No obsolete in-scope path is identified. The Unsupported branch remains
  necessary for archives, binaries, unknown extensions, invalid paths, and failed
  content.
- Extend the current allowlist directly. Do not add a parallel SVG classifier,
  SVG-specific viewer, second Event Monitor launcher, compatibility alias, or
  dual route.

## Persisted Data / State Transition Decision

- Stored subject, location, shape, and volume: None. Open-file state is transient;
  SVG bytes remain in the existing workspace/local source.
- Code-model or serialization change: None. FileDataType already has Image.
- Normal reader/writer behavior: Existing File Explorer state and media viewer
  contracts continue unchanged.
- Required semantics: Preserve workspace files, application data, path
  containment, read-only Event Monitor intent, authorization, and unsupported
  behavior.
- Physical-store/security constraints: Existing content boundaries and object URL
  lifecycle remain authoritative; no new storage or byte-copy path exists.
- Decision: Not Affected.
- Rationale: Only transient filename classification changes. No transformation,
  I/O, downtime, corruption, rollback, or mixed-version concern exists.
- Supported IDs: REQ-004, AC-004, AC-006. Migration plan: Not applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | File row activation | ImageViewer in right-side Files | File Explorer store and FileViewer | Shows direct selection needs only policy membership |
| DS-002 | Primary End-to-End | BEH-002 | Event Monitor action activation | ImageViewer in right-side Files | Event Monitor launcher plus File Explorer store | Shows the middle feed already uses the same viewer |
| DS-003 | Return-Event | BEH-001, BEH-002, BEH-003, BEH-005 | Content boundary response | Rendered image or existing error state | Native/server boundary and ImageViewer | Protects MIME, access, loading/error, and object URL invariants |
| DS-004 | Bounded Local | BEH-001, BEH-002, BEH-004 | Candidate path | Shared Image/Unsupported result | fileTypePolicy.ts | The missing extension is the shared decision |

## Primary Execution Spine(s)

- DS-001: FileItem -> workspace file explorer facade -> file explorer store
  -> determineFileType -> local-file or workspace content URL -> FileExplorerTabs
  -> FileViewer -> ImageViewer.
- DS-002: Markdown action -> MarkdownRenderer -> AgentEventMonitor ->
  useEventMonitorFilePreview -> runtime locator -> file explorer store
  openFilePreview with read-only intent -> right panel Files -> FileViewer ->
  ImageViewer.
- DS-003: local-file protocol or workspace REST -> MIME/byte response ->
  authorized object URL or direct URL -> ImageViewer image load -> rendered or
  existing error/placeholder state.

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A row activation classifies once. After .svg is Image, the store takes the existing media branch and the right-side shell dispatches ImageViewer. | FileItem, facade, policy, store, content boundary, FileExplorerTabs, FileViewer, ImageViewer | File Explorer store owns transient lifecycle; FileViewer owns dispatch | Loading/error, tabs, zoom/pan, read-only media |
| DS-002 | Event Monitor decorates and emits a typed action only. The launcher maps the runtime path, requests shared preview with read-only intent, opens Files, and leaves the feed in place. | MarkdownRenderer, AgentEventMonitor, launcher, store, panel, FileViewer, ImageViewer | Event Monitor launcher owns activation/panel coordination | Keyboard focus, inert paths, mapping, localized status |
| DS-003 | A trusted/authorized boundary returns SVG bytes with image/svg+xml. The URL helper optionally materializes a credentialed object URL; ImageViewer loads it as an image. | Local protocol, REST route, MIME lookup, URL helper, ImageViewer | Content boundary owns access/bytes; ImageViewer owns presentation | Capability, containment, credentials, decode failure |
| DS-004 | The pure classifier normalizes basename/extension and performs one allowlist lookup. Both entrypoints consume the same result. | basename, extension, allowlist, determineFilePreviewType, action policy | fileTypePolicy.ts | Unknown/binary safety and case variants |

## Spine Actors / Main-Line Nodes

FileItem.vue; useWorkspaceFileExplorer; file explorer store/content actions;
fileTypePolicy.ts; MarkdownRenderer.vue and useMarkdownSegments; AgentEventMonitor;
useEventMonitorFilePreview.ts; local-file protocol; workspace REST content route;
FileExplorerTabs.vue; FileViewer.vue; ImageViewer.vue.

## Ownership Map

| Main-Line Node | Owns | Must Not Own |
| --- | --- | --- |
| FileItem.vue | Row activation and existing text-mode choice | Classification, byte reads, URL construction, or viewer selection |
| Workspace facade | Workspace context delegation | A second classifier or open-file lifecycle |
| fileTypePolicy.ts | Pure family classification | File existence, authorization, MIME, bytes, or UI |
| File Explorer store | Open-file lifecycle, mode, intent, tab identity, content branch | Rendering or Event Monitor parsing |
| MarkdownRenderer | Scoped action decoration and explicit event emission | Reads, authorization, panels, or viewer selection |
| Event Monitor launcher | Runtime mapping, preview request, panel/Files activation, focus, status | Classification duplication, bytes, MIME, or rendering |
| Native/server boundary | Access, containment, regular-file, MIME, byte stream | UI or Event Monitor state |
| FileExplorerTabs | Right-side shell, tab and loading/error presentation | Policy or path mapping |
| FileViewer | Type-to-viewer dispatch and props | Authorization or raw byte fetch |
| ImageViewer | URL/object URL image presentation and zoom/pan | Path policy, file access, inline SVG parsing |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| useWorkspaceFileExplorer.openFile/openFilePreview | File Explorer store | Inject workspace context | Classifier, URL builder, renderer |
| MarkdownRenderer file-path event | Event Monitor launcher | Keep generic Markdown passive | File reads, panel state, viewer choice |
| AgentEventMonitor handler | Event Monitor launcher | Connect host feed to typed action effect | File policy or content loading |
| useEventMonitorFilePreview.openPath | File Explorer store and panel coordinator | Map runtime and apply read-only intent | Media rendering or MIME |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | No obsolete in-scope path exists | N/A | Follow-up | Unsupported handling remains required |
| Any proposed SVG-specific policy/viewer/launcher | It would duplicate shared ownership | Existing policy, FileViewer, ImageViewer, launcher | Rejected in this change | Prevented by dependency rules |

## Return Or Event Spine(s)

DS-003 return flow is local-file protocol or workspace REST response ->
content-type/byte status -> direct URL or authorized object URL -> ImageViewer
resolved resource -> image load -> rendered image or existing placeholder.

Event result flow is explicit action -> openPath returns opened, unavailable, or
failed -> AgentEventMonitor updates existing localized status while the feed
remains unchanged. No persisted event or file reference is created.

## Bounded Local / Internal Spines

- Parent owner: fileTypePolicy.ts.
- Chain: path string -> trim/separator normalization -> lowercase basename ->
  extension -> allowlist lookup -> FileDataType.
- This matters because both direct File Explorer and Event Monitor eligibility
  use this exact decision; it must not inspect filesystem state.
- Parent owner: FileViewer.vue.
- Chain: Image -> ImageViewer -> URL props -> authorized URL resolution ->
  image presentation.
- This matters because SVG joins an existing media family and does not require a
  new component.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path containment and capability | DS-001, DS-002, DS-003 | Native/server boundaries and launcher | Verify runtime identity, workspace boundary, regular file, trusted local capability | Prevent path text from becoming authorization | UI/policy could expose host files |
| MIME and byte streaming | DS-003 | Native/server boundaries | Return image/svg+xml and bytes/ranges | Image decode needs media response | Viewer would duplicate transport/validation |
| Credentialed URL lifecycle | DS-003 | Authorized URL helper | Fetch with credentials and revoke object URLs | Supports protected resources | Leaks/stale resources |
| Loading/error/focus | DS-001, DS-002, DS-003 | FileExplorerTabs, FileViewer, Event Monitor | Announce status, keep feed/shell usable, focus active tab | Coherent non-happy-path UX | Path parsing would own UI effects |
| Tests and docs | All | Coverage and delivery owners | Record supported family and regressions | Prevent stale contract | Runtime fixes could drift |

## Ownership Boundaries

determineFilePreviewType is authoritative for supported-family meaning. It returns
a type only and never authorizes or reads a path. All File Explorer and Event
Monitor callers must use it.

The file explorer store is authoritative for opening a file, transient
OpenFileState, tab reuse, mode, access intent, and local/workspace content branch.
Facades supply context and intent but do not create parallel state.

useEventMonitorFilePreview is authoritative for Event Monitor effects: runtime
path mapping, read-only preview request, right-panel/Files activation, focus, and
localized result. Markdown rendering only emits a typed action.

The Electron local protocol and workspace REST route are authoritative for
access, containment, regular-file checks, MIME, and bytes. Components consume
URLs/object URLs and never gain raw filesystem authority.

FileViewer is authoritative for viewer dispatch and ImageViewer is authoritative
for image presentation. Both direct and Event Monitor flows must end there.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| determineFilePreviewType | Basename/extension normalization and allowlists | fileUtils, store, Event Monitor action policy | Local extension sets, MIME probes, file reads | Extend one policy and tests |
| Store openFile/openFilePreview | OpenFileState, tab reuse, mode, access intent, URLs/content | FileItem, workspace facade, Event Monitor launcher | Direct state mutation or URL assembly | Extend store only if new access mode is proven |
| useEventMonitorFilePreview.openPath | Mapping, read-only intent, panel/Files, focus, result | AgentEventMonitor | Markdown effect or raw file URL navigation | Keep launcher thin |
| Local protocol / workspace REST | Capability, containment, regular-file, MIME, bytes | Store media URLs and URL helper | Direct filesystem read or uncontained static route | Existing generic APIs suffice |
| FileViewer | Type dispatch and viewer props | FileExplorerTabs and shared consumers | Event Monitor-specific viewer or inline injection | Add viewer only for a distinct approved capability |
| ImageViewer | URL resolution, image presentation, zoom/pan | FileViewer | Raw host path or SVG source injection | Existing URL contract is sufficient |

## Dependency Rules

- The file-type policy must remain pure and free of stores, components, network,
  filesystem, or authorization dependencies.
- File Explorer and Event Monitor action eligibility must use the shared policy;
  neither may define a local SVG/image allowlist.
- Workspace and Event Monitor facades call the File Explorer store; they must not
  mutate OpenFileState or build resource URLs.
- MarkdownRenderer may emit a typed action only. It must not open panels, fetch
  bytes, or inspect filesystem state.
- The Event Monitor launcher may map paths and coordinate panels, but must not
  import ImageViewer or implement type dispatch.
- FileViewer may select a viewer from FileDataType but must not authorize or fetch
  raw bytes.
- ImageViewer consumes a resolved URL/object URL and renders an image; it must
  not parse or execute SVG source.
- Native/server boundaries may use path/MIME/byte APIs, but must not import UI.
- Tests should assert owner contracts rather than implement alternate paths.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| determineFilePreviewType(filePath) | Supported family | Pure classify by normalized basename/extension | String path, relative/absolute/Windows style as existing | .svg returns Image; no bytes |
| determineFileType(filePath) | File Explorer type facade | Delegate to shared policy | String path | No second policy |
| openFile(filePath, workspaceId) | Ordinary open lifecycle | Create/reuse state and existing mode | Path plus explicit workspace ID | Direct File Explorer entry |
| openFilePreview(filePath, workspaceId, options) | Preview lifecycle/intent | Create/reuse preview state | Path, workspace ID, optional access intent | Event Monitor is read-only |
| createAbsoluteFilePathAction | Typed Event Monitor action | Normalize, reject unsupported, attach previewType | Raw/normalized absolute candidate plus source kind | .svg becomes Image |
| useEventMonitorFilePreview.openPath | Event Monitor effect | Map path, invoke store, open Files, focus, result | AbsoluteFilePathAction | previewType is descriptive, not authorization |
| FileViewer file/type props | Viewer dispatch | Select viewer and pass media URL | OpenFileState-like file and mode | Image always maps to ImageViewer |
| Workspace content REST | Workspace bytes | Boundary checks, MIME, stream | workspaceId and relative path | Existing route serves SVG |
| Local protocol response | Trusted local bytes | Capability, validation, MIME, ranges | Canonical local-file URL | Existing route serves SVG |
| ImageViewer url prop | Rendered image | Resolve URL and present | URL or null | Existing image contract |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| determineFilePreviewType | Yes | Yes | Low | Extend one allowlist |
| openFilePreview | Yes | Yes | Low | Preserve explicit workspace and intent |
| createAbsoluteFilePathAction | Yes | Yes | Low | Carry normalized candidate/source/type |
| useEventMonitorFilePreview.openPath | Yes | Yes | Low | Keep action and active workspace explicit |
| Workspace content REST | Yes | Yes | Low | Preserve workspaceId/relative path |
| Local protocol response | Yes | Yes | Medium | Preserve canonical URL and capability checks |
| FileViewer | Yes | Yes | Low | Dispatch by FileDataType |
| ImageViewer | Yes | Yes | Low | Accept only URL/null |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| FileDataType Image | Image | Yes | Low | Keep; SVG is a member |
| determineFilePreviewType | File preview type policy | Yes | Low | Keep single classifier |
| AbsoluteFilePathAction | Event Monitor file action | Yes | Low | Preserve typed action |
| OpenFileState | Open file state | Yes | Low | Preserve transient state |
| FileViewer | Shared file viewer | Yes | Low | Do not add SvgViewer |
| ImageViewer | Image viewer | Yes | Low | Render SVG as image |
| FileExplorerTabs | Files surface | Yes | Low | Use existing right-side panel |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why |
| --- | --- | --- | --- |
| SVG classification | File Explorer file-type policy | Extend | It is authoritative for both journeys |
| Media URL/content | File Explorer store/content actions | Reuse | Existing Image branch already handles media |
| Rendered image | File Explorer ImageViewer | Reuse | Existing URL-based zoom/pan viewer suffices |
| Event Monitor eligibility | Event Monitor action policy | Extend indirectly | Shared policy membership is enough |
| Right panel/Files | Right-panel and File Explorer tabs | Reuse | Launcher already does this |
| Authorization/MIME | Electron protocol and workspace REST | Reuse | Generic boundaries already handle image media |
| Tests/docs | Existing suites and docs | Extend/update | Adjacent contracts exist |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Spine IDs | Governing Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| File Explorer policy | Supported family and Unsupported invariant | DS-001, DS-002, DS-004 | fileTypePolicy.ts | Extend | Only runtime source change |
| File Explorer state/content | Open state, URLs, access intent, tabs | DS-001, DS-002, DS-003 | Store/content actions | Reuse | Image arrays already include Image |
| File Explorer presentation | Shell, dispatch, image presentation | DS-001, DS-002, DS-003 | FileExplorerTabs, FileViewer, ImageViewer | Reuse | No new component |
| Event Monitor action/launcher | Opt-in action and panel effect | DS-002, DS-004 | Markdown/action policy, launcher | Extend indirectly | No production code branch |
| Trusted transport | Access, containment, MIME, bytes | DS-003 | Local protocol, REST, URL helper | Reuse | No API/protocol change |
| Evidence/docs | Tests and durable contract | All | Coverage and delivery | Extend/update | Final test matrix downstream |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/utils/fileExplorer/fileTypePolicy.ts | Policy | Pure classifier | Add .svg to IMAGE_EXTENSIONS | One allowlist owns family meaning | FileDataType |
| autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts | Policy tests | Policy test boundary | SVG/case/negative matrix | Adjacent existing tests | determineFileType |
| autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts | Action tests | Action policy boundary | SVG action/URI eligibility | Existing supported matrix | shared policy |
| autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts | Viewer tests | Shared viewer boundary | Optional Image dispatch regression | Existing Image test | FileViewer |
| autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts | UI action tests | Markdown action boundary | Optional click/keyboard SVG case | Existing action matrix | typed action |
| autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts | Store tests | Content routing boundary | Optional local/remote SVG URL case | Existing media routing tests | OpenFileState |
| autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts | REST tests | API boundary | Optional SVG MIME/security case | Existing PNG boundary test | REST contract |
| autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts | Electron tests | Native boundary | Optional SVG MIME case | Existing response tests | response contract |
| autobyteus-web/docs/content_rendering.md, docs/file_explorer.md | Docs | Delivery docs boundary | Supported image list/flow | Existing durable docs | shared terms |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| File family union and extension sets | Existing fileTypePolicy.ts | Policy | Shared by File Explorer and Event Monitor | Yes | Yes | Filesystem probe or UI registry |
| Action previewType and FileDataType Image | Existing action/type contracts | Action/File Explorer boundary | Carries shared decision | Yes | Yes | Second extension-to-viewer mapping |
| OpenFileState type/url/mode/intent | Existing state | File Explorer | Shared transient lifecycle | Yes | Yes | Persisted record |
| Media URL/object URL | Existing store/helper/viewer contract | Transport/presentation | Existing auth/lifecycle is sufficient | Yes | Yes | Component-owned raw loader |

No new reusable structure is required. Existing shared types are semantically
tight for adding one extension.

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| FileDataType | Yes | Yes | Low | Add membership through Image allowlist |
| AbsoluteFilePathAction.previewType | Yes, classification not authorization | Yes | Low | Preserve and do not bypass runtime checks |
| OpenFileState | Yes | Yes | Low | Use existing Image/url/preview fields |
| FileRelativeResourceContext | Yes | Yes | Low | No change |

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/utils/fileExplorer/fileTypePolicy.ts | Policy | Classifier | Add .svg | Exact root-cause boundary | FileDataType |
| Existing policy/action/viewer/store test files | Test boundaries | Existing owners | SVG regression cases selected downstream | Keep evidence with owner | Existing contracts |
| autobyteus-web/docs/content_rendering.md | Docs | Rendering docs | Add SVG to Image table | Existing rendering contract | ImageViewer terms |
| autobyteus-web/docs/file_explorer.md | Docs | File Explorer docs | Add SVG to examples | Existing File Explorer contract | shared policy terms |

The implementation handoff must list the exact tests actually changed. The design
does not pre-authorize edits in every optional test file.

## Applied Patterns

- Shared pure policy: one classifier feeds File Explorer and Event Monitor.
- Thin activation facade: Markdown emits typed actions; launcher owns effects.
- Shared renderer: FileViewer dispatches both journeys to ImageViewer.
- Capability-gated transport: providers own access, MIME, and bytes.
- Explicit negative policy: unknown/binary paths remain inert or unsupported.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/utils/fileExplorer/fileTypePolicy.ts | Module | File Explorer policy | Add .svg to image family | Authoritative shared decision | Filesystem, UI, authorization |
| autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts | File | Policy tests | SVG and negative classification evidence | Direct changed-owner test | Runtime or UI behavior |
| autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts | File | Action tests | SVG action/URI evidence | Direct shared-action test | Panel/transport implementation |
| autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts | File | Viewer tests | Optional Image dispatch evidence | Existing viewer boundary | Policy logic |
| autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts | File | Event Monitor UI tests | Optional explicit SVG action evidence | Existing action boundary | File reads/panel effects |
| autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts | File | Store tests | Optional media URL evidence | Existing route boundary | UI rendering |
| autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts | File | REST tests | Optional SVG MIME/security evidence | Existing API boundary | Frontend behavior |
| autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts | File | Native tests | Optional SVG MIME evidence | Existing native boundary | Policy |
| autobyteus-web/docs/content_rendering.md | File | Rendering docs | Update Image family and Event Monitor shared-policy statement | Existing docs contract | Test transcript |
| autobyteus-web/docs/file_explorer.md | File | File Explorer docs | Update supported image examples | Existing docs contract | New architecture |
| tickets/in-progress/svg-file-preview | Folder | Solution artifact boundary | Core artifacts and UI supplement | Dedicated handoff package | Source implementation or implementation-handoff |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Clear? | Mixed-Layer / Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| autobyteus-web/utils/fileExplorer | Main-Line Policy/Control | Yes | Low | Existing policy/helper boundary |
| autobyteus-web/components/fileExplorer | Main-Line Presentation | Yes | Low | Existing shell/dispatch/viewer boundary |
| autobyteus-web/components/conversation/segments/renderer | Scoped off-spine action presentation | Yes | Low | Event Monitor action stays separate from bytes |
| autobyteus-web/stores | Main-Line State | Yes | Low | Open-file lifecycle remains in store |
| autobyteus-server-ts/src/api/rest | Transport | Yes | Low | Existing workspace content boundary |
| autobyteus-web/electron/local-file-protocol | Transport/provider | Yes | Low | Existing trusted local boundary |
| autobyteus-web/docs | Off-spine docs | Yes | Low | Durable documentation separate from runtime |
| tickets/in-progress/svg-file-preview | Off-spine artifacts | Yes | Low | Design evidence separate from source |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Direct selection | diagram.svg -> shared policy Image -> existing media URL -> FileViewer Image -> ImageViewer | FileItem has a special .svg branch to a new viewer or text editor | One policy and renderer |
| Event Monitor | Typed SVG action -> launcher -> openFilePreview read-only -> Files -> shared ImageViewer | MarkdownRenderer builds a local URL or SVG overlay | Effects and access stay owned |
| Security | Existing trusted/authorized response with image/svg+xml -> URL/object URL -> image element | Inline source injection or raw file URI navigation | No unreviewed document boundary |
| Unsupported | archive.zip remains inert/unsupported with no read or URL | Infer all unknown extensions as text | Preserves binary safety |
| Case | DIAGRAM.SVG normalizes to .svg | Caller-specific case-sensitive checks | Preserves shared normalization |
| Evidence | Policy test for classification, action test for eligibility, boundary test for MIME | One broad mocked UI test claims every contract | Evidence stays at owner boundary |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| FileItem-local .svg classifier | Quick direct-click fix | Rejected | Extend shared fileTypePolicy |
| Event Monitor SVG-specific renderer | Bypass action/viewer limitation | Rejected | Shared policy plus FileViewer/ImageViewer |
| Keep SVG unsupported in one surface | Minimize one change | Rejected | One shared Image membership fixes both |
| Inline SVG source parsing | Richer rendering | Rejected | Existing image presentation; separate security design later |
| New SvgImage type alias | Avoid changing policy meaning | Rejected | Existing FileDataType Image |
| Unauthenticated static/file fallback | Avoid existing helper | Rejected | Existing authorized/trusted boundaries |
| Caller-side fallback for old policy | Mask future drift | Rejected | Direct policy update and regression tests |

## Derived Layering

1. Entry facades: FileItem/workspace facade and Event Monitor typed action host.
2. Policy/control: shared file-type policy and action normalization.
3. State/content: File Explorer store and Event Monitor launcher.
4. Trusted providers: local protocol, workspace REST, authorized URL helper.
5. Presentation: FileExplorerTabs, FileViewer, ImageViewer.
6. Off-spine evidence: focused tests and durable docs.

SVG is a membership change in policy/control. No layer moves or new layer is
needed.

## Change / Refactor Sequence

1. Architecture reviewer approves or returns the package; record any result in
   solution-revision-record.md.
2. implementation_engineer adds .svg to IMAGE_EXTENSIONS and makes only approved
   implementation-scoped test changes. No Event Monitor production branch,
   loader, component, protocol, or backend route change is expected.
3. implementation_engineer runs local implementation checks and owns
   implementation-handoff.md.
4. code_reviewer reviews source and architecture. Requirement/design findings
   return to solution_designer; no compatibility branch is accepted.
5. api_e2e_engineer creates the required coverage investigation, decides whether
   existing coverage is valid or needs SVG expansion, sets up the environment,
   executes authoritative checks, and routes any durable coverage changes back
   through code review.
6. delivery_engineer refreshes the branch against tracked base, records the
   integrated-state check, updates content_rendering.md and file_explorer.md or
   records no-impact, and prepares final handoff.
7. Delivery owns the one-off user verification/completion gate. No release or
   deployment is implied.

No temporary compatibility seam or obsolete in-scope path is required.

## Key Tradeoffs

- Allowlist extension versus new viewer: extension reuse preserves one policy,
  URL contract, renderer, and Event Monitor invariant.
- Image element versus inline SVG: image rendering satisfies the request while
  avoiding a new script/resource/sanitization boundary.
- Policy-only runtime change versus backend change: existing generic boundaries
  already resolve SVG MIME and access.
- Shared inheritance versus two-surface special case: other shared read-only
  consumers may gain SVG support predictably; coverage must verify this.
- Focused boundary tests versus broad snapshots: boundary tests protect the
  invariant with less brittleness; downstream owns final scope.

## Risks

- A malformed or feature-rich SVG can fail image decoding; existing ImageViewer
  error/placeholder behavior is the intended result.
- Interactive SVG is not supported by this design and requires a separate
  security/UX review.
- Shared artifact/team/mobile consumers inherit Image support; downstream must
  check assumptions and coverage.
- No live browser/Electron execution was performed in design stage; downstream
  must provide runtime evidence.

## Guidance For Implementation

- Change only the existing IMAGE_EXTENSIONS set for the runtime fix; preserve its
  pure filename-policy comment and case normalization.
- Do not alter FileDataType, FileViewer, ImageViewer, FileItem.isPreviewable,
  fileExplorerContentActions media arrays, Event Monitor launch coordination,
  local-file protocol, workspace REST route, or authorization logic unless a
  downstream test proves an independent defect.
- Add lower- and upper-case SVG policy coverage and an Event Monitor supported
  action/file-URI case asserting previewType Image. Consider direct viewer, store
  URL, server MIME, Electron MIME, and browser-flow coverage at their owning
  boundaries; api_e2e_engineer decides final durable additions.
- Preserve negative tests for archives, installers, bundles, binaries, unknown
  extensions, invalid paths, and unsupported file URI shapes.
- previewType is descriptive classification, not authorization. The launcher and
  trusted content boundary remain authoritative.
- Do not add inline SVG markup, v-html, raw file URI navigation, direct component
  filesystem reads, or a second renderer.
- Update content_rendering.md and file_explorer.md so the durable image tables
  and examples list SVG and identify ImageViewer.
- Record any deviation or new finding in solution-revision-record.md and route
  requirement/design impacts back to solution_designer before scope expands.
