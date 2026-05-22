# Design Spec: Demand-Driven File Explorer Watchers and Lazy Historical Workspace Activation

Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
Date: 2026-05-22
Status: Revised for architecture review round 4 after AR-003/AR-004 design-impact findings

Related artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`

Revision after architecture review round 1:

- AR-001 covered by making the dedicated mobile `explorer` panel the only mobile file-explorer live surface and requiring mobile tools `RightSideTabs` to suppress the `files` tab/render path.
- AR-002 covered by assigning raw WebSocket pending-connect cleanup to `api/websocket/file-explorer.ts` and atomic lease/session setup cleanup to `FileExplorerStreamHandler.connect()`.

Same-ticket release-blocker revision after implementation/delivery validation:

- Slow historical run opening is now in scope because the current-ticket build is not releasable if history rows eagerly initialize workspaces.
- Historical run viewing must use canonical `workspaceRootPath` / cheap workspace reference and must not create/initialize a workspace or build file trees until the user opens Files, Terminal, resume/rerun, context picker, or another workspace-dependent action.

Revision after architecture review round 3:

- AR-003 covered by defining `WorkspaceReference` as the run/team config identity companion, making `workspaceId` a deterministic reference id rather than initialization proof, and assigning initialized workspace payload/activation state exclusively to `WorkspaceStore`.
- AR-004 covered by adding the team historical hydration spine and splitting live member workspace activation from historical member context shell/reference building. Historical team open builds focused-member and sibling shells with per-member references and does not call `ensureWorkspaceByRootPath()` for every member.

## Current-State Read

### Current frontend execution path

Current frontend workspace loading opens live filesystem streams too early:

- `autobyteus-web/stores/workspace.ts:createWorkspace()` stores the workspace, then calls `connectToFileSystemChanges(newWorkspace.workspaceId)`.
- `autobyteus-web/stores/workspace.ts:fetchAllWorkspaces()` iterates all fetched workspaces and calls `connectToFileSystemChanges(ws.workspaceId)` for each one.
- `autobyteus-web/stores/workspace.ts:registerSkillWorkspace()` creates a placeholder workspace and immediately calls `connectToFileSystemChanges(workspaceId)`.
- `connectToFileSystemChanges()` creates a `FileExplorerStreamingService` and calls `service.connect(workspaceId)`.

This means loading known workspaces, not user-visible file-explorer intent, causes backend watcher startup.

Desktop rendering is closer to the desired model but still incomplete:

- `RightSideTabs.vue` renders `FileExplorerLayout` only when `activeTab === 'files'`.
- `WorkspaceDesktopLayout.vue` hides the entire right panel with `v-show`, so if the active tab is Files and the right panel is collapsed, the file explorer component may remain mounted even though it is not visible.

Mobile rendering currently keeps the explorer mounted while hidden:

- `WorkspaceMobileLayout.vue` wraps the explorer in `v-if="hasActiveWorkspace"` and `v-show="activeMobilePanel === 'explorer'"`.
- Because `v-show` does not unmount, a mount-driven live subscription would stay active even when mobile user is on another panel unless this is changed.
- `WorkspaceMobileLayout.vue` also mounts `RightSideTabs` inside the mobile `tools` panel via `v-show`.
- `RightSideTabs` has global right-side-tab state and can render `FileExplorerLayout` when `activeTab === 'files'`. Therefore mobile has a second hidden file-explorer path today: `activeMobilePanel !== 'explorer'` but mobile `RightSideTabs` still mounted and active right-side tab equals `files`.
- Target decision: the mobile `tools` panel must not expose or render the `files` tab through `RightSideTabs`; the dedicated mobile `explorer` panel is the only mobile file-explorer live surface.

Skill detail embeds an always-visible file explorer while the skill detail page is mounted:

- `SkillDetail.vue` renders `<FileExplorer :workspaceId="workspaceId" />` and `<FileExplorerTabs :workspaceId="workspaceId" />`.
- This should remain a valid live-consumer path while the skill detail workspace is displayed.

### Current backend execution path

Backend watcher startup is also too implicit:

- `FileSystemWorkspace.initialize()` builds a shallow tree, creates `FileNameIndexer`, creates search strategy, then starts `completeFullInitialization()` in the background.
- `completeFullInitialization()` builds the full workspace tree and calls `fileNameIndexer.start()`.
- `FileNameIndexer.start()` builds an index, then calls `fileExplorer.ensureWatcherStarted()` and subscribes to watcher events.
- `LocalFileExplorer.ensureWatcherStarted()` calls `FileExplorer.startWatcher()`.
- `FileExplorer.startWatcher()` creates `FileSystemWatcher`, whose `start()` calls recursive `chokidar.watch(workspaceRootPath, ...)`.
- `FileExplorerStreamHandler.connect()` separately calls `fileExplorer.ensureWatcherStarted()` before creating a streaming session.
- `FileExplorerStreamHandler.disconnect()` closes the session but has no explicit watcher lease to release.
- `autobyteus-server-ts/src/api/websocket/file-explorer.ts` currently stores `sessionId` only after async `connect()` resolves. If the socket closes before that resolution, the close handler sees `sessionId === null` and returns. After watcher leases are introduced, that race could leak a late-created session/lease unless the route tracks pending connect cleanup.

### Current implemented historical run open path

After the watcher lifecycle implementation, a separate same-ticket release blocker remains:

- `autobyteus-web/stores/runHistoryLoadActions.ts:openHistoricalRun()` calls `openAgentRun()`.
- `openAgentRun()` calls `loadRunContextHydrationPayload()`.
- `loadRunContextHydrationPayload()` calls `input.ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)` before building the run config or selecting the run.
- `ensureRunHistoryWorkspaceByRootPath()` may call `workspaceStore.fetchAllWorkspaces()` and then `workspaceStore.createWorkspace({ root_path })`.
- Backend `WorkspaceManager.createWorkspace()` awaits `FileSystemWorkspace.initialize()`.
- `FileSystemWorkspace.initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)`.

This means opening a historical run can still pay filesystem workspace activation/tree-scan cost before the user opens Files or any other workspace-dependent surface. The historical payload already contains `workspaceRootPath`, which is enough to display historical metadata. A live/current initialized workspace is not needed for read-only history viewing.

### Current implemented historical team/member open path

Team history has a separate eager path that must not be hidden behind the standalone agent fix:

- `autobyteus-web/stores/runHistorySelectionActions.ts:openTeamMemberRunFromHistory()` calls `openTeamRun()` and passes `ensureWorkspaceByRootPath`.
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:openTeamRun()` calls `loadTeamRunContextHydrationPayload()` and receives `firstWorkspaceId` for `TeamRunConfig` reconstruction.
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:loadHistoricalTeamRunContextHydrationPayload()` fetches the focused member projection, but then calls `buildTeamMemberContexts({ ensureWorkspaceByRootPath })`.
- `autobyteus-web/stores/runHistoryTeamHelpers.ts:buildTeamMemberContexts()` loops all flattened agent members and calls `ensureWorkspaceByRootPath(member.workspaceRootPath)` for each member with a path before building that member config.
- `autobyteus-web/utils/teamRunConfigUtils.ts:reconstructTeamRunConfigFromMetadata({ firstWorkspaceId })` writes that id into `TeamRunConfig.workspaceId` without retaining the root-path/display reference.

Therefore historical team/member viewing can multiply the same eager workspace activation cost across all team members, even when only one focused member projection is being viewed.

### Current ownership problem

The file watcher currently behaves as a property of a loaded workspace/index, but product intent says it is a property of a visible file-explorer experience. This boundary mismatch lets inactive workspaces retain recursive watchers and file descriptors indefinitely. The late history-open blocker exposes the same deeper ownership issue at the workspace identity layer: historical run viewing depends on current workspace activation because `workspaceId`, workspace metadata, and file-explorer snapshot are currently coupled too tightly.

## Intended Change

Refactor file-explorer monitoring so live filesystem watchers are demand-driven by frontend file-explorer visibility and backend watcher leases.

The target rule:

> A workspace is not watched merely because it exists, was fetched, was searched, or has an agent run. A workspace is watched only while at least one active user-facing file explorer is visible/connected for that workspace, plus an optional short idle timeout.

When the file explorer opens, the UI may show loading, refresh a current snapshot, and attach live changes. When it closes/hides, the stream and backend watcher interest are released.

Mobile target decision:

- The dedicated mobile `explorer` panel is the only mobile file-explorer live surface.
- `RightSideTabs` must support an explicit context, preferably `mode="desktop" | "mobile-tools"` with desktop behavior as the default; an equivalent no-files prop is acceptable only if it fully suppresses the files tab and render path.
- In mobile-tools mode, `RightSideTabs.visibleTabs` filters out `files`, its auto-switch-to-files watcher is disabled, and the template cannot render `FileExplorerLayout`.

Backend pending-connect target decision:

- The raw WebSocket route owns socket lifecycle before `sessionId` exists.
- The stream handler owns atomic session/lease setup once `connect()` is called.
- Both layers must be idempotent: route late cleanup may call `disconnect(sessionId)` after `connect()` resolves, while handler setup failure must release all resources before returning/rejecting.

Historical run lazy-workspace target decision:

- Historical run opening is a read-only history-view use case and must not activate the filesystem workspace.
- Canonical `workspaceRootPath` is the persisted historical workspace identity; deterministic `workspaceId` is a derived reference, not proof that a workspace is initialized.
- Add or expose a cheap filesystem workspace reference boundary that canonicalizes root path, derives deterministic `workspaceId`, returns display name, and optionally persists mapping without calling `FileSystemWorkspace.initialize()` or building a file tree.
- Files, Terminal, resume/rerun, context picker, and any other workspace-dependent surface/action must explicitly activate/initialize the workspace at its own boundary and show loading/errors there.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Refactor + Performance
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Invariant / Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The current Electron server had 10k+ descriptors; direct reproduction showed new Codex app-server spawns fail with `spawn EBADF`; independent watcher-pressure probes reproduced the same `spawn EBADF`; current code starts watchers from workspace fetch/indexing rather than visible file-explorer demand. Late release validation showed history rows can still be slow because history hydration eagerly resolves `workspaceRootPath` to live `workspaceId` through workspace creation/initialization and shallow tree traversal.
- Design response: Move watcher ownership to explicit frontend live-consumer acquisition and backend watcher leases; decommission automatic workspace-load watcher startup; split historical workspace reference from initialized workspace activation so history viewing does not scan the filesystem.
- Refactor rationale: A local Codex retry or file-descriptor limit increase does not remove descriptor pressure or history-open latency. The defective boundaries are file-explorer/watch lifecycle ownership and historical-run workspace identity vs activation ownership.
- Intentional deferrals and residual risk, if any: Full workspace cache eviction can be deferred if watcher resources are released correctly. Folder-scoped file explorer traversal can be deferred only if history-open no longer performs tree traversal and Files opening has an acceptable loading state.

## Terminology

- **Snapshot tree**: A point-in-time file tree loaded by GraphQL folder/workspace queries.
- **Live stream**: Frontend WebSocket connection for file system changes for one workspace.
- **Watcher lease**: Backend lifecycle token representing one active reason to keep a workspace watcher alive.
- **Visible consumer**: A mounted and visible file explorer surface: desktop Files tab with panel visible, dedicated mobile explorer panel, or skill detail embedded file explorer. Mobile `RightSideTabs` in the tools panel is explicitly not a file-explorer visible consumer.
- **Pending file-explorer connection**: A WebSocket route attachment whose async backend `connect()` has started but has not yet returned a `sessionId`.
- **Workspace reference**: A cheap identity/display object for a filesystem workspace: deterministic `workspaceId`, canonical `workspaceRootPath`, display name, and kind/display metadata. It contains no file tree and does not imply initialization.
- **Workspace activation state**: Frontend store-owned status for a workspace reference (`uninitialized`, `activating`, `initialized`, or `error`). Activation state is not duplicated into every run config.
- **Activated workspace**: A backend `FileSystemWorkspace` that has been created/initialized enough for workspace-dependent features such as Files, Terminal, or runtime launch. In the frontend, activation is represented by `WorkspaceStore.workspaces[workspaceId]` plus activation state `initialized`.

## Design Reading Order

1. Data-flow spine inventory
2. Ownership model
3. Workspace reference / activation data model
4. Historical team hydration model
5. Frontend live-consumer design
6. Backend watcher lease design
7. Search/snapshot behavior
8. File responsibilities and migration sequence

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission automatic file-explorer stream connection from workspace creation/fetch/register flows and decommission watcher startup from filename indexer startup.
- The target behavior should not keep a hidden compatibility path that continues watching all loaded workspaces.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Workspace fetch/create/register | Snapshot workspace state in frontend | `WorkspaceStore` + `WorkspaceManager` | Must load workspace metadata/tree without starting watchers. |
| DS-002 | Primary End-to-End | File explorer becomes visible | Live stream connected and snapshot refreshed | `WorkspaceStore` live-consumer lifecycle | This is the only normal trigger for live monitoring. |
| DS-003 | Return-Event | Filesystem event from active watcher | Frontend workspace tree/content invalidation updated | `FileExplorerStreamHandler` + `WorkspaceStore` | Preserves live updates while user is watching. |
| DS-004 | Bounded Local | Backend stream session connect/disconnect | Watcher start/share/stop | `LocalFileExplorer` watcher lease owner | Releases descriptors deterministically. |
| DS-005 | Primary End-to-End | Search/folder/file operation | Query/mutation result returned | GraphQL file explorer resolver | Must work without persistent watcher. |
| DS-006 | Bounded Local | Child-process spawn failure | Resource-pressure diagnostic log | Runtime client / spawn boundary | Makes future `EBADF` diagnosis fast. |
| DS-007 | Bounded Local | WebSocket attach/early close | Pending connect cleaned up or skipped | file-explorer WebSocket route + `FileExplorerStreamHandler` | Prevents watcher/session leaks when socket closes before `connect()` resolves. |
| DS-008 | Primary End-to-End | Historical standalone agent run row opened | Conversation/activity/config rendered with workspace reference but without workspace activation | Run history open/hydration owner | Keeps agent history viewing fast and independent from filesystem scans. |
| DS-009 | Primary End-to-End | Workspace-dependent action from historical run | Workspace reference is activated and action proceeds using initialized handle or root path | Workspace activation boundary | Moves filesystem initialization to Files/Terminal/context action boundary and keeps resume/rerun from initializing merely to recover root path. |
| DS-010 | Primary End-to-End | Historical team/member row opened | Focused member history plus sibling shells rendered with per-member references and no eager member workspace activation | Team run history open/hydration owner | Covers the separate team path that currently resolves every member workspace. |
| DS-011 | Primary End-to-End | Historical team sibling member focused | Sibling projection hydrated without workspace activation | Team historical member hydration owner | Allows team history navigation without triggering filesystem initialization for each member. |

## Primary Execution Spine(s)

- DS-001: `WorkspaceStore.fetchAllWorkspaces/createWorkspace/registerSkillWorkspace -> GraphQL workspace query/mutation -> WorkspaceManager -> FileSystemWorkspace.initialize(shallow snapshot only) -> WorkspaceConverter -> frontend WorkspaceStore tree state`
- DS-002: `Visible FileExplorer component -> WorkspaceStore.acquireFileExplorerLiveSession(workspaceId, consumerId) -> FileExplorerStreamingService.connect -> /ws/file-explorer/:workspaceId -> route pending-connection context -> FileExplorerStreamHandler.connect -> BaseFileExplorer.acquireWatcherLease -> FileExplorerSession -> CONNECTED -> WorkspaceStore.refreshWorkspaceSnapshot`
- DS-005: `FileExplorer search/folder/open/mutation UI -> FileExplorerStore/WorkspaceStore -> GraphQL file explorer resolver -> FileSystemWorkspace/LocalFileExplorer -> snapshot traversal/read/write/search -> result/change event -> frontend state update`
- DS-008: `Agent history row click -> openHistoricalRun -> openAgentRun -> loadRunContextHydrationPayload -> getRunProjection/getAgentRunResumeConfig/getRunFileChanges -> resolveWorkspaceReferenceByRootPath(workspaceRootPath) -> AgentRunConfig{workspaceId, workspaceReference} -> historical agent context rendered`
- DS-009: `Historical Files/Terminal/context action -> WorkspaceStore.ensureWorkspaceInitialized(workspaceReference) -> backend workspace activation -> WorkspaceStore.workspaces[workspaceId] populated -> feature-specific loading/result or error`; `resume/rerun -> AgentRunConfig.workspaceReference.workspaceRootPath -> prepare/launch runtime` and activates only if that feature needs initialized workspace state.
- DS-010: `Team history/member row click -> openTeamMemberRunFromHistory -> openTeamRun -> loadTeamRunContextHydrationPayload -> loadHistoricalTeamRunContextHydrationPayload -> buildHistoricalTeamMemberContextShells -> focused projection fetch -> AgentTeamContext{config.workspaceReference, member workspaceReferences} rendered`
- DS-011: `Historical team member focus -> ensureHistoricalTeamMemberHydrated -> fetchTeamMemberProjection -> applyProjectionToTeamMemberContext -> mark member projection loaded`, with no call to workspace activation.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Workspaces are loaded as metadata plus shallow snapshots. No file system live stream is created in this path. | Workspace list, workspace snapshot tree | `WorkspaceStore` and `WorkspaceManager` | GraphQL conversion, tree serialization |
| DS-002 | When the file explorer becomes visible, frontend registers a consumer. First consumer opens one stream, backend acquires a watcher lease, frontend refreshes snapshot, then applies live changes. | File explorer live consumer, stream service, watcher lease | Frontend `WorkspaceStore` for visible consumer lifecycle; backend `LocalFileExplorer` for watcher lifecycle | Loading state, event buffering, reconnect policy |
| DS-003 | Active watcher events flow through server session to frontend, which applies structural changes and invalidates open file content. | File change event | `FileExplorerStreamHandler` and `WorkspaceStore.handleFileSystemChange` | Echo suppression for self-initiated mutations |
| DS-004 | Backend stream sessions share one watcher per workspace. Lease count controls start/stop. Final release closes the watcher and awaits descriptor release. | Watcher lease count, watcher start promise, idle timer | `LocalFileExplorer` | Chokidar adapter details, close promise |
| DS-005 | Search/open/mutations are request/response operations and do not require active live monitoring. Mutations return explicit change events to update UI immediately. | File query/mutation request | GraphQL file explorer resolver | Search indexing, ripgrep fallback, permission errors |
| DS-006 | Spawn failures log resource context and distinguish descriptor pressure from missing binaries. | Spawn attempt | Runtime client/spawn boundary | lsof/fd count diagnostic should be best-effort |
| DS-007 | The WebSocket route registers close/error cleanup before auth/connect, tracks `closed`, `connectPromise`, and `sessionId`, skips connect if already closed, and disconnects a late session if close happened before `connect()` resolved. Handler `connect()` guarantees no retained lease/session on null/reject. | Pending file-explorer connection | Route owns socket lifecycle; handler owns session/lease setup atomicity | Remote auth rejection, send failure, setup failure |
| DS-008 | Historical standalone agent hydration uses stored projection/resume/file-change data plus a cheap workspace reference. It does not create or initialize the workspace. | Historical agent context, workspace reference | Run history open/hydration owner | Agent definition lookup, run file-change hydration |
| DS-009 | When the user asks for current workspace functionality from history, that action activates the referenced workspace and owns loading/error feedback. Resume/rerun can use the canonical root path from the reference without activating solely to recover that path. | Workspace activation request, initialized workspace or root-path launch input | Workspace activation boundary | Missing path handling, feature-specific loading |
| DS-010 | Historical team hydration builds a primary team workspace reference and per-member references, creates all leaf member shells, fetches only the focused member projection, and renders the team without initializing each member workspace. | Historical team context, member shells, member workspace references | Team run history open/hydration owner | Team communication hydration, status normalization |
| DS-011 | Focusing a sibling member hydrates only that member projection and updates the existing shell; it does not resolve/activate the member workspace. | Historical team member projection | Team historical member hydration owner | Projection load-state dedupe/error state |

## Spine Actors / Main-Line Nodes

- `FileExplorer.vue`: visible UI consumer entrypoint for desktop, mobile, and skill detail surfaces.
- `WorkspaceDesktopLayout.vue`: desktop right-panel visibility owner; hidden/collapsed panel must unmount `RightSideTabs` or otherwise make Files content unreachable.
- `RightSideTabs.vue`: desktop files-tab host; in mobile-tools mode it must suppress files-tab rendering.
- `WorkspaceStore`: frontend owner of workspace snapshot state and live file-explorer consumer registration.
- `FileExplorerStreamingService`: transport adapter for one workspace live stream.
- `registerFileExplorerWebsocket`: route-level owner for socket close/error state and pending-connect cleanup.
- `FileExplorerStreamHandler`: backend WebSocket entrypoint/session coordinator.
- `FileExplorerSession`: owns one backend stream session and its generator cleanup.
- `LocalFileExplorer`: public backend file-explorer boundary and watcher lease owner.
- `FileExplorer`: low-level local filesystem explorer and actual `FileSystemWatcher` holder.
- `FileSystemWatcher`: chokidar adapter/event source.
- `FileNameIndexer`: snapshot filename index owner, no longer live watcher owner by default.
- `openHistoricalRun` / `openAgentRun`: standalone historical run open coordinator; must not activate workspaces for read-only history viewing.
- `loadRunContextHydrationPayload`: standalone historical projection/resume hydration owner; produces lazy workspace reference and `AgentRunConfig` fields with one meaning.
- `openTeamMemberRunFromHistory` / `openTeamRun`: team historical run open coordinator; must not activate all member workspaces.
- `loadTeamRunContextHydrationPayload`: branches live vs historical team hydration and owns the team-specific reference/activation split.
- `buildHistoricalTeamMemberContextShells`: target historical team helper that builds member `AgentContext` shells with per-member `WorkspaceReference` values and no activation.
- `buildLiveTeamMemberContexts`: target live-team helper that may activate member workspaces when live/recovery semantics require it.
- `AgentRunConfig` / `TeamRunConfig`: run config identity carriers; `workspaceId` means deterministic workspace identity/reference id and `workspaceReference` carries root-path/display metadata.
- `AgentContext` / `AgentTeamContext`: context containers that carry config references and do not separately own workspace activation.
- `WorkspaceIdMappingStore` / workspace reference resolver: canonical root-path-to-deterministic-id owner without file-tree initialization.
- `WorkspaceStore`: initialized workspace payload and activation-state owner; non-null config `workspaceId` is not sufficient to read `WorkspaceStore.workspaces[workspaceId]` without null handling.
- Workspace activation boundary: action-specific owner that turns a reference into an initialized workspace only when needed.

## Ownership Map

- `WorkspaceStore` owns frontend live-consumer reference counting by `(workspaceId, consumerId)`, not low-level WebSocket details.
- `FileExplorerStreamingService` owns one WebSocket connection lifecycle, reconnect policy, and parsed message callbacks.
- `FileExplorer.vue` owns declaring visible interest while mounted/visible for its resolved workspace.
- `WorkspaceDesktopLayout.vue` owns the desktop collapsed-panel visibility boundary. It should prefer `v-if="isRightPanelVisible"` for the `RightSideTabs` host, or an equivalent explicit visibility prop that prevents `FileExplorerLayout` from mounting while collapsed.
- `WorkspaceMobileLayout.vue` owns the mobile decision that only the dedicated `explorer` panel can host file explorer. It must mount that panel with `v-if` and pass mobile `RightSideTabs` a no-files mode.
- `RightSideTabs.vue` owns context-specific file-tab rendering. In desktop context it may render `FileExplorerLayout` only when the Files tab is active and the right panel is visible; in mobile-tools context it must exclude the `files` tab and never render `FileExplorerLayout`.
- `registerFileExplorerWebsocket` owns socket lifecycle races before a session id exists: close before auth, close before connect starts, and close before connect resolves.
- `LocalFileExplorer` owns backend watcher lease counting, concurrent start de-duplication, idle release timer, and stop sequencing.
- `FileExplorer` owns concrete filesystem operations and the actual watcher object, but not higher-level consumer policy.
- `FileExplorerSession` owns session event generator cancellation so subscribers do not remain registered after disconnect.
- `FileNameIndexer` owns snapshot index content and optional refresh, not persistent live monitoring.
- Run-history hydration owns historical run view data and historical workspace reference shape; it must not own current workspace activation.
- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` mean stable deterministic workspace identity/reference id. They do not mean that `WorkspaceStore.workspaces[workspaceId]` exists.
- `AgentRunConfig.workspaceReference` and `TeamRunConfig.workspaceReference` carry root path/display metadata. When `workspaceId` is non-null, the corresponding config must also carry a matching `workspaceReference` in target code.
- `AgentContext` and team member `AgentContext` instances consume workspace identity only through their config; they do not own activation state or duplicate workspace payload.
- `AgentTeamContext.config.workspaceReference` is the primary/team-level display reference, chosen from the coordinator member workspace reference when present, otherwise the first member workspace reference. Focused-member workspace actions use the focused leaf member context's reference before falling back to the team primary reference.
- `HistoricalTeamHydrationState` owns member metadata, projection load state, and the per-member workspace reference map for historical team shells.
- Workspace reference resolution owns canonical path normalization, deterministic id derivation, display name, and mapping persistence; it must not build file trees.
- `WorkspaceStore` owns initialized `WorkspaceInfo` payloads in `workspaces`, cheap references in `workspaceReferencesById`, and activation state in `workspaceActivationStateById`. `activeWorkspace` returns only initialized payload; `activeWorkspaceReference` returns the selected config reference without activation.
- Workspace activation owns the transition from reference to initialized workspace for Files/Terminal/context actions; it owns loading/error state at that action boundary. Activation does not rewrite run config identity fields unless a bug is detected between returned id and reference id.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `FileExplorerStreamingService` | Frontend `WorkspaceStore` live-consumer registry | Browser WebSocket transport adapter | Workspace-wide policy deciding which workspaces deserve monitoring |
| `/ws/file-explorer/:workspaceId` route | Route pending-connection cleanup + `FileExplorerStreamHandler` | HTTP/WebSocket boundary and socket close/error owner | Watcher lease policy beyond pairing pending/late session cleanup with socket lifecycle |
| GraphQL file explorer resolver | `FileSystemWorkspace` / `LocalFileExplorer` | Request/response API boundary | Persistent live watcher ownership |
| Historical run open/hydration functions | Run history projection/resume services + workspace reference resolver | UI/store boundary for opening stored runs | Workspace activation or file tree scanning |
| Workspace reference resolver | `WorkspaceIdMappingStore` and canonical path utilities | Cheap identity/display boundary | Initialized workspace lifecycle or file explorer snapshots |


## Workspace Reference And Run Context Data Model (AR-003 Target)

### Authoritative semantics

| Field / Store Slot | Target Meaning | Initialization Implication | Owner |
| --- | --- | --- | --- |
| `WorkspaceReference.workspaceId` | Deterministic identity for a canonical filesystem root path | None; identity only | Workspace reference resolver / `WorkspaceStore.workspaceReferencesById` |
| `WorkspaceReference.workspaceRootPath` | Canonical server filesystem path used by history display and runtime launch | None | Workspace reference resolver |
| `AgentRunConfig.workspaceId` | Stable workspace reference id for the run | None; may be present while `WorkspaceStore.workspaces[workspaceId]` is absent | Run config |
| `AgentRunConfig.workspaceReference` | Root-path/display companion for `workspaceId` | None | Run config hydration/config stores |
| `TeamRunConfig.workspaceId` | Stable primary/team workspace reference id | None | Team config |
| `TeamRunConfig.workspaceReference` | Primary/team display reference; coordinator member reference if present, otherwise first member reference | None | Team config reconstruction |
| `AgentContext.config.workspaceReference` | Workspace reference for that agent/member context | None | Agent context config |
| `AgentTeamContext.historicalHydration.memberWorkspaceReferencesByRouteKey` | Per-member historical workspace references | None | Historical team hydration state |
| `WorkspaceStore.workspaces[workspaceId]` | Initialized `WorkspaceInfo` payload, including file-explorer snapshot | Yes, this is the initialized frontend payload | `WorkspaceStore` |
| `WorkspaceStore.workspaceActivationStateById[workspaceId]` | Activation status/error for a reference | Status only; does not duplicate config | `WorkspaceStore` |

Target type shape, names illustrative but required semantics:

```ts
export interface WorkspaceReference {
  workspaceId: string;
  workspaceRootPath: string;
  displayName: string;
  kind: 'filesystem';
}

export type WorkspaceActivationStatus = 'uninitialized' | 'activating' | 'initialized' | 'error';

export interface WorkspaceActivationState {
  status: WorkspaceActivationStatus;
  error: string | null;
}

export interface AgentRunConfig {
  workspaceId: string | null;              // deterministic reference id, not initialization proof
  workspaceReference: WorkspaceReference | null;
  // existing fields...
}

export interface TeamRunConfig {
  workspaceId: string | null;              // primary deterministic reference id, not initialization proof
  workspaceReference: WorkspaceReference | null;
  // existing fields...
}
```

Clean-cut invariant: in target code, `workspaceId !== null` for a filesystem workspace requires `workspaceReference !== null` and `workspaceReference.workspaceId === workspaceId`. Consumers must not use `workspaceId` alone to imply an initialized workspace. If a draft config is created from an already initialized workspace, the draft config still receives both `workspaceId` and `workspaceReference` from the selected `WorkspaceInfo`.

### Hydration and activation transitions

Standalone historical agent open:

1. `loadRunContextHydrationPayload()` reads `resumeConfig.metadataConfig.workspaceRootPath`.
2. It calls `resolveWorkspaceReferenceByRootPath(workspaceRootPath)` or equivalent metadata-only resolver.
3. It builds `AgentRunConfig` with `workspaceId = reference.workspaceId` and `workspaceReference = reference`.
4. It upserts/selects `AgentContext` without inserting `WorkspaceInfo` into `WorkspaceStore.workspaces` and without calling `workspaceStore.createWorkspace()`.

Workspace-dependent action after history open:

1. The action reads the selected config reference (`activeWorkspaceReference`, focused team member reference, or explicit prop reference).
2. If the action needs initialized workspace state, it calls `WorkspaceStore.ensureWorkspaceInitialized(reference)`.
3. `WorkspaceStore.ensureWorkspaceInitialized(reference)` returns the existing `WorkspaceInfo` if `workspaces[reference.workspaceId]` exists; otherwise it records activation status `activating`, calls the backend activation/create boundary, validates the returned id equals `reference.workspaceId`, stores the `WorkspaceInfo`, records status `initialized`, and returns the payload.
4. If activation fails, the store records status `error`; the historical run context/config remains intact and displayable. No run config field is cleared or rewritten.
5. Resume/rerun must use `config.workspaceReference.workspaceRootPath` as the launch/root-path input when `WorkspaceInfo` is absent. It must not initialize the file tree solely to recover root path. If a runtime path truly requires an initialized workspace handle, the resume/rerun action owns that explicit activation and error display.

### Store selectors and display/action consumers

`WorkspaceStore` target selectors:

- `activeWorkspaceReference`: reads the current selected agent config reference, or for selected team reads the focused leaf member config reference and falls back to team config reference, or for draft screens reads the draft config reference.
- `activeWorkspace`: returns `workspaces[activeWorkspaceReference.workspaceId] ?? null`; it does not activate and does not fall back to creating workspace state.
- `currentWorkspaceTree`: continues to return `activeWorkspace?.fileExplorer ?? null`; a null tree is valid for unactivated history selections.
- `workspaceActivationState(referenceOrId)`: exposes loading/error state for Files/Terminal/context actions and config display.

Display consumers:

- `RunConfigPanel.vue` / config forms must display path/name from `config.workspaceReference.workspaceRootPath` / `displayName` first, falling back to initialized `WorkspaceStore.workspaces[workspaceId]` only when the reference is absent during draft construction.
- History rows and selected historical config views must tolerate `WorkspaceStore.workspaces[workspaceId] === undefined`.

Action consumers:

- `FileExplorer.vue` / `FileExplorerLayout` must resolve a `WorkspaceReference` first, call `ensureWorkspaceInitialized(reference)`, then use the initialized `workspaceId` for folder fetches and live-session acquisition. Loading/error belongs in the file explorer surface.
- `Terminal.vue` must not derive a missing id solely from `workspaceStore.activeWorkspace`. It must use an explicit reference/initialized workspace path: ensure the focused reference is initialized, then connect `useTerminalSession` with the initialized id; failure is shown in Terminal.
- `agentRunStore.sendUserInputAndSubscribe()` must prefer `config.workspaceReference.workspaceRootPath` over `WorkspaceStore.workspaces[workspaceId]` for existing/historical runs, and must not create a workspace merely to recover `workspaceRootPath`.
- Context picker/file attachment features that browse the filesystem must call activation before listing. Context-file artifacts already attached to history remain displayable from history metadata without activation.

## Historical Team Hydration Data Model And Flow (AR-004 Target)

Historical team open uses a different path from standalone agents and must be designed explicitly:

```text
openTeamMemberRunFromHistory
-> openTeamRun
-> loadTeamRunContextHydrationPayload
-> loadHistoricalTeamRunContextHydrationPayload
-> resolve member WorkspaceReferences without activation
-> buildHistoricalTeamMemberContextShells
-> fetch focused member projection only
-> AgentTeamContext rendered
```

### Live vs historical split

`teamRunContextHydrationService.ts` must keep separate branches with separate workspace contracts:

| Branch | Helper | Workspace Contract | Why |
| --- | --- | --- | --- |
| Live/active team recovery | `buildLiveTeamMemberContexts` | May call a clearly named activation function such as `activateWorkspaceByRootPathForLiveRun()` when active team semantics require initialized workspaces | Active/recovered runs may need current workspace handles. |
| Historical team viewing | `buildHistoricalTeamMemberContextShells` | May call only `resolveWorkspaceReferenceByRootPath()` / `resolveWorkspaceReferencesByRootPaths()`; must not call `ensureWorkspaceByRootPath()` | History viewing is read-only and must not initialize every member workspace. |

The current generic `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` shape must be removed or split because it hides the activation mode and makes the historical path accidentally eager.

### Historical member shells

`buildHistoricalTeamMemberContextShells` target responsibilities:

1. Flatten all agent members from team metadata.
2. Resolve each `member.workspaceRootPath` to a `WorkspaceReference` through a cheap resolver. A batched resolver is preferred to keep team open bounded, but repeated cheap single-reference calls are acceptable only if they do not activate workspace state.
3. Build each member `AgentRunConfig` with `workspaceId = memberReference?.workspaceId ?? null` and `workspaceReference = memberReference`.
4. Build each leaf `AgentContext` as a shell with metadata-derived conversation/status and no projection for siblings not yet loaded.
5. Apply the focused member projection only to the focused member context.
6. Return `{ members, primaryWorkspaceReference, memberWorkspaceReferencesByRouteKey }`.

Primary/team reference selection:

- `primaryWorkspaceReference` is chosen from the coordinator/focused member reference when available, otherwise the first member reference in metadata order.
- `TeamRunConfig.workspaceId = primaryWorkspaceReference?.workspaceId ?? null`.
- `TeamRunConfig.workspaceReference = primaryWorkspaceReference`.
- The old `firstWorkspaceId` local return must be renamed/replaced with `primaryWorkspaceReference` / `firstWorkspaceReference`. If a temporary local variable named `firstWorkspaceId` remains during refactor, it must be documented and typed as a reference id only, not an initialized workspace id.

`HistoricalTeamHydrationState` target addition:

```ts
export interface HistoricalTeamHydrationState {
  createdAt: string;
  updatedAt: string;
  memberMetadataByRouteKey: Record<string, TeamRunMetadataAgentMember>;
  memberProjectionLoadStateByRouteKey: Record<string, TeamMemberProjectionLoadState>;
  memberWorkspaceReferencesByRouteKey: Record<string, WorkspaceReference>;
}
```

Focused member and sibling behavior:

- Initial historical team open fetches the focused member projection and builds unloaded sibling shells. It does not activate the focused member workspace or any sibling workspace.
- `ensureHistoricalTeamMemberHydrated()` fetches a sibling projection and applies it to the existing member context. It must not resolve/activate workspace state because each shell already has its reference.
- Files/Terminal/context actions inside a selected team member use that focused member's `AgentContext.config.workspaceReference` and then follow DS-009 activation rules.

### Team file mappings for current code

| Current File | Required Target Behavior |
| --- | --- |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | `openTeamMemberRunFromHistory()` passes a cheap reference resolver for historical opening and does not pass an activation function into the historical branch. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Receives hydration payload with `primaryWorkspaceReference` rather than `firstWorkspaceId`; reconstructs `TeamRunConfig` with `workspaceReference`. |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Branches live vs historical with different helper contracts; historical branch never calls `ensureWorkspaceByRootPath`. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Splits `buildTeamMemberContexts()` into live activation and historical shell/reference builders; `applyProjectionToTeamMemberContext()` preserves existing `workspaceReference` when applying projections. |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Replaces `reconstructTeamRunConfigFromMetadata({ firstWorkspaceId })` with `reconstructTeamRunConfigFromMetadata({ primaryWorkspaceReference })`, deriving `workspaceId` from the reference id. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Extends `HistoricalTeamHydrationState` with `memberWorkspaceReferencesByRouteKey` and imports the shared `WorkspaceReference` type. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `connectToFileSystemChanges()` calls from `createWorkspace()` | Workspace creation is not visible explorer demand | `acquireFileExplorerLiveSession()` from mounted visible explorer | In This Change | Keep workspace snapshot load. |
| `connectToFileSystemChanges()` calls from `fetchAllWorkspaces()` | Fetching known workspaces should not watch all of them | Visible-consumer activation | In This Change | Biggest frontend descriptor-pressure fix. |
| `connectToFileSystemChanges()` call from `registerSkillWorkspace()` | Skill workspace should watch only while embedded explorer is mounted | `FileExplorer.vue` mount with explicit workspaceId | In This Change | Still fetch root children for initial display if visible. |
| Mobile tools `RightSideTabs` `files` tab / `FileExplorerLayout` path | Mobile has a dedicated Files/Explorer panel; hidden tools-side right tabs must not host a duplicate file explorer | `WorkspaceMobileLayout` passes no-files mode to `RightSideTabs`; `RightSideTabs` filters `files` and blocks `FileExplorerLayout` | In This Change | Fixes AR-001 and keeps AC-004 true. |
| `FileNameIndexer.start()` live watcher startup | Search index should not force permanent watchers | `refreshSnapshotIndex()` / on-demand indexing | In This Change | Method naming can be adjusted during implementation. |
| `ensureWatcherStarted()` as general public caller API | Too easy to bypass lease lifecycle | `acquireWatcherLease(reason)` | In This Change | Existing direct calls should be migrated. |
| Session close without generator return | Can leave subscriber stuck until next event | `FileExplorerSession.close()` awaits generator cancellation | In This Change | Prevents event subscriber leaks. |
| Route close handler that returns when `sessionId` is null | Misses close-before-connect-resolves cleanup | Pending-connection cleanup context with `closed`, `connectPromise`, `sessionId`, idempotent cleanup | In This Change | Fixes AR-002. |
| Historical standalone run hydration requiring `ensureWorkspaceByRootPath()` before display | Couples read-only history viewing to workspace activation/tree scan | Lazy `WorkspaceReference` from `workspaceRootPath`; action-specific activation | In This Change | Same-ticket release blocker. |
| Historical team member context building through generic `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` | Eagerly activates every member workspace for read-only team history | Split live `buildLiveTeamMemberContexts` from historical `buildHistoricalTeamMemberContextShells` with cheap references | In This Change | Resolves AR-004. |
| `firstWorkspaceId` as the only team config workspace output | Ambiguous whether id is initialized workspace or reference id and loses root path/display metadata | `primaryWorkspaceReference` / `firstWorkspaceReference` plus `TeamRunConfig.workspaceReference` | In This Change | `workspaceId` derives from reference id only. |
| `RunConfigPanel` display path only from `WorkspaceStore.workspaces[workspaceId]` | Historical config display becomes blank or pressures activation when workspace is uninitialized | Display from `config.workspaceReference` first | In This Change | Resolves AR-003 display-consumer gap. |
| Using `WorkspaceInfo` with `fileExplorer` snapshot as the identity shape for history workspace display | Pulls file tree snapshot into metadata/reference use cases | Cheap workspace reference shape without tree payload | In This Change | Prevents accidental scans. |

## Return Or Event Spine(s) (If Applicable)

Active live update flow:

`chokidar event -> FileSystemWatcher.handle* -> WatchdogHandler -> FileSystemChangeEvent JSON -> FileExplorerSession.forwardEvents -> FileExplorerStreamHandler.streamLoop -> WebSocket FILE_SYSTEM_CHANGE -> FileExplorerStreamingService.onFileSystemChange -> WorkspaceStore.handleFileSystemChange -> FileExplorerStore invalidation/tree state`

Snapshot refresh on open:

`FileExplorer visible -> WorkspaceStore marks workspace refreshing/buffering -> live stream connected -> fetchFolderChildren(workspaceId, '') and optionally reopened folders -> replace/update snapshot tree -> replay buffered live events -> clear refreshing/loading state`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `LocalFileExplorer`
  - `acquireWatcherLease -> increment consumer count -> cancel idle stop -> ensure start promise -> return idempotent lease`
  - `lease.release -> decrement consumer count -> if zero schedule/perform stop -> FileExplorer.stopWatcher -> FileSystemWatcher.close`
  - Matters because descriptor release depends on final release being deterministic and awaited.

- Parent owner: `WorkspaceStore`
  - `activate consumer -> if first consumer connect stream -> set refreshing/loading -> refresh snapshot -> buffer/replay stream events -> deactivate consumer -> if last consumer disconnect`
  - Matters because multiple visible file explorer surfaces can exist for the same workspace.

- Parent owner: `FileExplorerSession`
  - `start forwarder -> for-await watcher generator -> push events -> close -> generator.return -> queue null -> forwarder settles`
  - Matters because session disconnect must release watcher subscribers immediately.

- Parent owner: `registerFileExplorerWebsocket`
  - `socket attach -> register close/error cleanup immediately -> authorize -> if closed skip connect -> start handler.connect promise -> close before id chains disconnect after promise -> late id immediately disconnects if closed`
  - Matters because async setup can outlive the socket and otherwise leak a session/lease created after the close event.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Loading/refresh state | DS-002 | `WorkspaceStore` / `FileExplorer.vue` | Show user that tree is refreshing on open | User accepts loading over permanent monitoring | If placed in transport only, UI cannot represent visible state. |
| Event buffering during snapshot refresh | DS-002, DS-003 | `WorkspaceStore` | Avoid dropping or misordering changes around open | Snapshot and stream are separate channels | If omitted entirely, rare open-time races can leave stale tree. |
| Reconnect backoff | DS-002 | `FileExplorerStreamingService` | Retry transient WS errors while visible | Transport concern | If owned by workspace manager, transport details leak upward. |
| Mobile tools tab filtering | DS-002 | `WorkspaceMobileLayout` / `RightSideTabs` | Prevent nested mobile tools from mounting a hidden file explorer | Mobile already has dedicated Explorer panel | If omitted, hidden mobile tools can keep watchers alive. |
| Pending WebSocket cleanup | DS-007 | file-explorer WebSocket route | Pair close/error with connect promise and late session id cleanup | Async connect can finish after socket close | If misplaced only in handler, route can still ignore early close and leak late sessions. |
| Echo suppression | DS-003, DS-005 | `FileExplorerStore` | Avoid double-applying self-initiated mutation events | Existing behavior should remain | If owned by watcher lease, UI mutation semantics leak backend. |
| FD/resource diagnostics | DS-006 | Runtime spawn boundary | Better logs for EBADF/EMFILE | Debugging support | If put in file explorer only, other spawn failures remain opaque. |
| Historical workspace reference display | DS-008, DS-010 | Run/team history hydration / run config display | Show workspace path/name without initializing the workspace | History view needs metadata only | If placed on workspace activation main line, history rows stay slow. |
| Workspace activation loading/error | DS-009 | Files/Terminal/resume/context action owner | Surface missing path or initialization failures only when current workspace functionality is requested | Historical viewing should tolerate missing local paths | If placed in history hydration, read-only viewing blocks on filesystem availability. |
| Team member workspace reference shells | DS-010, DS-011 | Team historical hydration | Preserve per-member root-path identity while keeping siblings unloaded | Team history has multiple workspace roots | If omitted, helper code will keep activating all member workspaces. |
| Run config reference display fallback | DS-008, DS-010 | Config panel/forms | Use config reference when initialized workspace payload is absent | Historical selected configs must still show path/name | If display reads only `WorkspaceStore.workspaces`, UI pressures activation. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Frontend workspace live stream ownership | `autobyteus-web/stores/workspace.ts` | Extend | Already owns workspace tree and stream map | N/A |
| WebSocket transport | `FileExplorerStreamingService` | Reuse | Already owns file-explorer stream transport | N/A |
| Backend stream session and route pending cleanup | `api/websocket/file-explorer.ts` + `services/file-explorer-streaming` | Extend | Existing route/session subsystem owns WebSocket attachment, pending-connect cleanup, session lifecycle | N/A |
| Backend watcher lifecycle | `LocalFileExplorer` / `FileExplorer` | Extend | Existing filesystem boundary and watcher holder | N/A |
| Filename index | `FileNameIndexer` | Extend/refine | Existing index owner; remove live-monitor responsibility | N/A |
| Spawn diagnostics | Codex runtime client / shared utility if present | Extend | Existing spawn boundary knows command/cwd | New utility only if repeated across spawn call sites. |
| Cheap workspace identity/reference | `WorkspaceIdMappingStore` + `workspace-path-utils` | Extend | Existing owner already canonicalizes root paths and derives deterministic filesystem workspace ids | N/A |
| Historical standalone run hydration | `runContextHydrationService` / run open services | Extend | Existing owner hydrates projection/resume config; change its workspace contract from eager activation to lazy reference | N/A |
| Historical team run hydration | `teamRunContextHydrationService`, `runHistoryTeamHelpers`, `teamRunOpenCoordinator`, `teamRunConfigUtils` | Extend | Existing team path is distinct and currently activates every member workspace; split live activation from historical references/shells | N/A |
| Run config/context workspace identity | `AgentRunConfig`, `TeamRunConfig`, `AgentContext`, `AgentTeamContext`, `WorkspaceStore` selectors | Extend | Existing `workspaceId` is used by many display/action consumers; give it one meaning and add reference companion | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend workspace state | Snapshot tree, active live consumers, stream map, refresh loading/buffering | DS-001, DS-002, DS-003 | `WorkspaceStore` | Extend | Rename methods to express live file-explorer sessions. |
| Frontend file explorer UI/layouts | Declare visible interest by mount/visibility, show loading, suppress duplicate hidden mobile file explorer path | DS-002 | `FileExplorer.vue`, `WorkspaceDesktopLayout.vue`, `RightSideTabs.vue`, `WorkspaceMobileLayout.vue` | Extend | Desktop Files tab only exists while the right panel is visible; dedicated mobile explorer is supported; mobile tools `RightSideTabs` excludes files. |
| File explorer streaming backend | WebSocket route pending cleanup, session lifecycle, watcher lease acquisition/release | DS-002, DS-003, DS-007 | `registerFileExplorerWebsocket`, `FileExplorerStreamHandler`, `FileExplorerSession` | Extend | Must release leases on setup failure, disconnect, and close-before-connect-resolves. |
| Backend local file explorer | Watcher lease refcount, watcher start/stop | DS-004 | `LocalFileExplorer`, `FileExplorer` | Extend | Primary backend lifecycle fix. |
| Backend search/index | Snapshot/on-demand index, no default watcher | DS-005 | `FileNameIndexer`, search strategies | Extend/refine | Avoid permanent monitoring. |
| Runtime diagnostics | EBADF/EMFILE logging | DS-006 | Codex client/spawn boundary | Extend | Secondary but useful. |
| Standalone run history hydration/opening | Projection/resume/file-change hydration, lazy workspace reference, no activation during history view | DS-008, DS-009 | `openHistoricalRun`, `openAgentRun`, `loadRunContextHydrationPayload` | Extend | Same-ticket release-blocker fix for standalone agents. |
| Team run history hydration/opening | Focused-member projection, sibling shells, per-member workspace references, no eager member activation | DS-010, DS-011 | `openTeamMemberRunFromHistory`, `openTeamRun`, `loadTeamRunContextHydrationPayload`, `runHistoryTeamHelpers` | Extend | Same-ticket release-blocker fix for teams. |
| Run/team config data model | Stable workspace reference id plus root-path/display companion in configs/contexts | DS-008, DS-009, DS-010, DS-011 | `AgentRunConfig`, `TeamRunConfig`, `AgentContext`, `AgentTeamContext` | Extend | `workspaceId` is identity only; initialized payload lives in `WorkspaceStore`. |
| Workspace identity/reference | Canonical root-path identity, deterministic id, and display name without tree | DS-008, DS-009, DS-010 | `WorkspaceIdMappingStore`, workspace GraphQL reference boundary, `WorkspaceStore` reference state | Extend | Avoid `WorkspaceInfo` snapshot payload for metadata-only reference. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace state | `WorkspaceStore` | Live file-explorer consumer registry, connect/disconnect only on visible demand, refresh buffering | Existing owner of workspace tree and stream map | Consumer key type if extracted |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Frontend file explorer UI | Visible consumer entrypoint | Activate/deactivate live session on mount/unmount/workspace change; show loading | Component corresponds to visible file tree | Workspace store methods |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Frontend layout | Desktop right-panel visibility boundary | Replace right-panel `v-show` hidden persistence with `v-if` mount/unmount or pass explicit visible state so Files content cannot stay mounted while collapsed | Owns right panel visibility state usage | N/A |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Frontend layout | Context-aware right-tabs boundary | Desktop: render Files content only when active tab and right panel visible. Mobile-tools: exclude `files` from visible tabs and never render `FileExplorerLayout`. | Knows tab state; receives context/no-files mode from layout | N/A |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Frontend layout | Mobile visibility boundary | Use `v-if` for dedicated explorer panel; pass `mode="mobile-tools"`/no-files mode to mobile tools `RightSideTabs` so it cannot mount `FileExplorerLayout`. | Owns mobile active panel and tools context | N/A |
| `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | Frontend transport | WS adapter | Optional promise/callback behavior for connected/closed states | Existing transport wrapper | Existing message types |
| `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` | Backend file explorer API | Abstract boundary | Replace generic ensure watcher with watcher lease API | Defines public explorer contract | Watcher lease interface |
| `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | Backend local file explorer | Lease owner | Refcount, start de-dupe, idle stop, release | Existing local boundary around `FileExplorer` | Watcher lease interface |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Backend local filesystem | Concrete watcher holder | Start/stop watcher and set `fileWatcher=null` on stop | Owns actual watcher object | N/A |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Backend watcher adapter | Chokidar adapter | Make `stop()` async/await close; clear subscribers | Owns underlying `FSWatcher` | N/A |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Backend streaming | Session owner | Store/cancel event generator; close async | Owns session event loop | Watcher lease optional if stored here |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts` | Backend streaming | Session registry | Await async session close | Existing session owner | N/A |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` | Backend streaming | Session/lease setup owner | Acquire lease on connect; register session atomically; release lease on setup failure, send failure, disconnect, or route-requested late cleanup | Existing backend stream coordinator | Watcher lease interface |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Backend workspace | Workspace lifecycle | Shallow init only; no background watcher-triggering index; on-demand search refresh | Existing workspace owner | FileNameIndexer |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Backend search/index | Snapshot index owner | Refresh snapshot index, optional event handling only if explicitly leased in future | Existing index owner | N/A |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Runtime diagnostics | Spawn boundary | Log EBADF/EMFILE diagnostic context | Existing Codex spawn site | Optional diagnostics helper |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | Run history hydration | Historical run hydration owner | Stop requiring eager `ensureWorkspaceByRootPath`; produce config/reference from `workspaceRootPath` | Existing hydration owner | `WorkspaceReference` |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | Run history opening | History open action owner | Replace history-only workspace creation fallback with cheap reference resolution or no activation | Existing history-open entry | `WorkspaceReference` |
| `autobyteus-web/types/workspace/WorkspaceReference.ts` or equivalent | Workspace identity/reference | Shared type owner | Define metadata-only reference and activation-state types | Prevent duplicate local shapes across config, store, GraphQL mappers | `WorkspaceReference` |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | Run config model | Agent run config boundary | Add `workspaceReference`; document `workspaceId` as deterministic reference id, not initialization proof | Existing agent run config type | `WorkspaceReference` |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Team config model | Team run config boundary | Add `workspaceReference`; document `workspaceId` as primary deterministic reference id | Existing team run config type | `WorkspaceReference` |
| `autobyteus-web/types/agent/AgentContext.ts` | Agent context | Config/state container | No extra workspace state; carries reference through `config` only | Avoid duplicate activation state in context | `AgentRunConfig` |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Team context | Team context container | Add member workspace references to historical hydration state | Current holder of member metadata/load state | `WorkspaceReference` |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Team history selection | Team history open action owner | Pass reference resolver, not eager activation, into historical team open path | Existing team history entrypoint | `WorkspaceReference` |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Team run opening | Team open coordinator | Consume `primaryWorkspaceReference` and reconstruct config with reference | Existing team run coordinator | `WorkspaceReference` |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Team history hydration | Team hydration owner | Split live activation branch from historical reference/shell branch | Existing team hydration owner | `WorkspaceReference` |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Team member context building | Team member shell/config builder | Split `buildTeamMemberContexts` into live and historical helpers; historical helper never calls `ensureWorkspaceByRootPath` | Current location of eager per-member activation | `WorkspaceReference` |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Team config reconstruction | Team config mapper | Replace `firstWorkspaceId` input with `primaryWorkspaceReference` | Existing mapper for metadata to config | `WorkspaceReference` |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Run/team config display | Config display consumer | Resolve loaded path/name from `config.workspaceReference` before `WorkspaceStore.workspaces` | Existing display of selected run/team config | `WorkspaceReference` |
| `autobyteus-web/stores/agentRunStore.ts` | Agent send/resume | Runtime launch action owner | Use `config.workspaceReference.workspaceRootPath` for existing/historical runs; no workspace creation solely to recover path | Existing send/prepare run path | `WorkspaceReference` |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Terminal UI | Workspace-dependent action owner | Ensure active/focused reference is initialized before connecting terminal session | Existing terminal entrypoint | Workspace activation API |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace state/reference | Workspace reference + activation owner | Store cheap references separately from initialized workspace tree entries; expose `activeWorkspaceReference` and `ensureWorkspaceInitialized` | Existing workspace UI state owner | `WorkspaceReference` |
| `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | Workspace identity | Root path identity owner | Expose deterministic id/canonical root path reference semantics without initializing workspace | Existing id mapping owner | `WorkspaceReference` DTO |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Workspace GraphQL API | Workspace reference/activation boundary | Add distinct cheap reference query/mutation or reshape create/resolve boundary so history can resolve identity without `WorkspaceInfo.fileExplorer` | Existing workspace API owner | `WorkspaceReference` DTO |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Backend watcher lease shape | `autobyteus-server-ts/src/file-explorer/watcher/watcher-lease.ts` or `base-file-explorer.ts` export | Backend file explorer | Used by `BaseFileExplorer`, `LocalFileExplorer`, stream handler/session | Yes | Yes | A generic resource manager unrelated to file explorer |
| Frontend visible consumer key | Inline type or `types/fileExplorerLiveSession.ts` if repeated | Frontend workspace state | Used by component/store tests | Yes | Yes | Global UI visibility framework |
| Mobile right-tabs mode | Inline prop type in `RightSideTabs.vue` unless reused | Frontend layout | Distinguishes desktop right panel from mobile tools usage | Yes | Yes | A second global tabs store |
| Pending file-explorer route context | Inline local state in `api/websocket/file-explorer.ts` unless tests benefit from helper | Backend WebSocket route | Tracks `closed`, `sessionId`, and `connectPromise` for one raw socket | Yes | Yes | A generic WebSocket framework |
| Spawn resource diagnostic formatter | Create only if multiple spawn sites use it | Runtime management | Avoid duplicating EBADF/EMFILE diagnosis | Yes | Yes | Heavy lsof dependency in hot path |
| Workspace reference shape | `autobyteus-web/types/workspace/WorkspaceReference.ts` plus backend/GraphQL DTO mapping | Workspace identity/reference | Needed by run history hydration, team member shells, config display, and later activation surfaces | Yes | Yes | A replacement for initialized workspace tree state |
| Workspace activation state | `WorkspaceStore` state type | Frontend workspace activation | Centralizes `uninitialized`/`activating`/`initialized`/`error` instead of duplicating status into each config | Yes | Yes | A second copy of run config identity |
| Team member workspace reference map | `HistoricalTeamHydrationState.memberWorkspaceReferencesByRouteKey` | Historical team hydration | Focused/sibling member actions need per-member identity without activation | Yes | Yes | A workspace payload cache |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WatcherLease` | Yes | Yes | Low | Keep fields minimal: `release()` and optional readonly id/reason for logging. |
| Frontend consumer id | Yes | Yes | Low | Use `(surface, component instance id)` or generated id; do not overload workspace id as consumer id. |
| Mobile right-tabs mode | Yes | Yes | Low | One mode field decides whether file tab can exist; do not infer from viewport deep inside `RightSideTabs`. |
| Pending route context | Yes | Yes | Low | Keep lifecycle fields local to one socket; avoid parallel closed/session state in handler. |
| File stream connection state | Mostly | Yes | Medium | Keep connection state in `FileExplorerStreamingService`; keep visible consumer counts in `WorkspaceStore`. |
| `WorkspaceReference` | Yes | Yes | Low | Keep minimal: `workspaceId`, `workspaceRootPath`, `displayName`, `kind`; do not include `fileExplorer` tree or mutable activation status. |
| `WorkspaceActivationState` | Yes | Yes | Low | Keep mutable state centrally in `WorkspaceStore`, keyed by reference id. Do not duplicate across run/team configs. |
| `AgentRunConfig.workspaceId` | Yes | Yes | Low | Means deterministic workspace reference id only. Initialized payload is `WorkspaceStore.workspaces[workspaceId]`, not this field. |
| `AgentRunConfig.workspaceReference` | Yes | Yes | Low | Root path/display companion for `workspaceId`; required whenever a filesystem workspace id exists in target code. |
| `TeamRunConfig.workspaceId` | Yes | Yes | Low | Means primary/team deterministic workspace reference id only. It may be uninitialized. |
| `TeamRunConfig.workspaceReference` | Yes | Yes | Low | Primary/team display reference derived from coordinator/focused/first member reference. |
| `HistoricalTeamHydrationState.memberWorkspaceReferencesByRouteKey` | Yes | Yes | Low | Per-member references for history shells; not a workspace payload cache and not activation state. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace state | Governing owner | Replace auto-connect with `acquireFileExplorerLiveSession(workspaceId, consumerId)` and `releaseFileExplorerLiveSession(...)`; maintain per-workspace consumer sets, stream map, refreshing state, event buffer; refresh snapshot on activation | Workspace tree and stream state already live here | Optional consumer type |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Frontend file explorer UI | Visible consumer | On mounted/resolved workspace change, acquire live session; on unmount/old workspace, release; render loading/refresh state | Component represents actual visible file tree | Workspace store live API |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Frontend layout | Desktop right-panel visibility boundary | Ensure collapsed desktop right panel unmounts `RightSideTabs` or passes explicit visible state that prevents `FileExplorerLayout` mounting | Prevents hidden collapsed Files tab from retaining live consumer | N/A |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Frontend layout | Context-aware right-tabs boundary | Desktop: `FileExplorerLayout` exists only when Files tab active and right panel visible. Mobile-tools: `files` tab is filtered out and `FileExplorerLayout` is unreachable. | Has active tab and receives layout context/no-files mode | N/A |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Frontend layout | Mobile visibility boundary | Replace dedicated explorer `v-show` with `v-if`; ensure mobile tools `RightSideTabs` cannot host `files`/`FileExplorerLayout` | Prevents both direct and nested hidden mounted explorers | N/A |
| `autobyteus-web/components/skills/SkillDetail.vue` | Skills UI | Embedded visible consumer host | No major logic; relies on `FileExplorer.vue` mount lifecycle | Embedded explorer is visible while skill detail mounted | N/A |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Backend route | Raw WebSocket / pending-connect owner | Register close/error cleanup before auth/connect; track `closed`, `connectPromise`, and `sessionId`; disconnect late session when early close occurred | Current route is where `sessionId === null` close race exists | Pending route context |
| `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` | Backend file explorer API | Contract | Add watcher lease contract; remove/deprecate direct `ensureWatcherStarted` public usage | Central abstract boundary | `WatcherLease` |
| `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | Backend local file explorer | Governing owner for watcher lifecycle | Implement refcounted leases, concurrent start, idle stop, release idempotence | Existing wrapper around concrete explorer | `WatcherLease` |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Backend filesystem | Concrete watcher holder | Add explicit async `stopWatcher`; make close clear watcher reference | Holds actual watcher instance | N/A |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Backend watcher adapter | Chokidar boundary | Make stop async and await `FSWatcher.close()`; terminate subscribers and pending timers | Owns chokidar object | N/A |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` | Backend stream | Session/lease setup coordinator | Acquire watcher lease before creating session; release on setup failure, send failure, disconnect, or route cleanup after early close | Existing connect/disconnect flow | `WatcherLease` |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Backend stream | Session owner | Hold generator; async close calls generator.return and drains forwarder | Owns per-session event loop | N/A |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts` | Backend stream | Session registry | Await `session.close()` | Existing registry | N/A |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Backend workspace | Workspace owner | Remove background full scan watcher path; initialize shallow; refresh index/tree on demand for search/folder | Existing workspace lifecycle owner | FileNameIndexer |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Backend search/index | Snapshot index owner | Split snapshot build from live monitoring; default no watcher | Keeps search index focused | N/A |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Runtime diagnostics | Spawn boundary | Add contextual logging for EBADF/EMFILE | Current Codex spawn site | Optional helper |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | Run history hydration | Historical run hydration owner | Build historical config/context from projection/resume data and lazy workspace reference; no eager `ensureWorkspaceByRootPath` for history view | Existing hydration owner | `WorkspaceReference` |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | Run history opening | History open action owner | Remove history-open fallback that creates workspace for display; route activation only for workspace-dependent actions | Existing history open owner | `WorkspaceReference` |
| `autobyteus-web/types/workspace/WorkspaceReference.ts` or equivalent | Workspace identity/reference | Shared type owner | Define metadata-only reference and activation-state types; no `fileExplorer` tree | Prevent repeated ambiguous shapes | `WorkspaceReference` |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | Run config model | Agent run config boundary | Add `workspaceReference`; define `workspaceId` as deterministic reference id, not initialized workspace proof | Existing shared agent config type | `WorkspaceReference` |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Team config model | Team run config boundary | Add `workspaceReference`; define `workspaceId` as primary deterministic reference id | Existing shared team config type | `WorkspaceReference` |
| `autobyteus-web/types/agent/AgentContext.ts` | Agent context | Config/state container | Keep workspace reference in `config`; do not add duplicate activation state | Context should not own workspace lifecycle | `AgentRunConfig` |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Team context | Team context container | Extend `HistoricalTeamHydrationState` with `memberWorkspaceReferencesByRouteKey`; keep focused member reference in leaf context config | Existing team context shell owner | `WorkspaceReference` |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Team history selection | Team history open action owner | Pass reference resolver into historical team open; no eager activation for member workspaces | Existing team-history selection entry | `WorkspaceReference` |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Team run opening | Team open coordinator | Use hydration payload `primaryWorkspaceReference` instead of `firstWorkspaceId` to reconstruct `TeamRunConfig` | Existing coordinator | `WorkspaceReference` |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Team history hydration | Team hydration owner | Split live activation helper from historical shell/reference helper; historical branch never calls `ensureWorkspaceByRootPath` | Existing branch owner | `WorkspaceReference` |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Team member context building | Team member config/shell builder | Replace generic `buildTeamMemberContexts` with `buildLiveTeamMemberContexts` and `buildHistoricalTeamMemberContextShells`; preserve member `workspaceReference` on projection apply | Current source of eager per-member activation | `WorkspaceReference` |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Team config reconstruction | Team config mapper | Replace `firstWorkspaceId` input with `primaryWorkspaceReference`; derive `workspaceId` from reference id | Current `firstWorkspaceId` ambiguity owner | `WorkspaceReference` |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Run/team config display | Config display consumer | Display path/name from `config.workspaceReference` before initialized workspace lookup | Existing config display | `WorkspaceReference` |
| `autobyteus-web/stores/agentRunStore.ts` | Agent send/resume | Runtime launch action owner | Prefer `config.workspaceReference.workspaceRootPath` for historical/existing runs; do not initialize file tree solely to recover root path | Existing send/prepare run owner | `WorkspaceReference` |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Terminal UI | Workspace-dependent action owner | Resolve/focused reference and call workspace activation before connecting terminal session | Existing terminal entrypoint | Workspace activation API |
| `autobyteus-web/stores/workspace.ts` | Frontend workspace state/reference | Workspace reference and activation owner | Maintain cheap references separately from initialized workspace entries; expose `activeWorkspaceReference`, `workspaceActivationState`, and `ensureWorkspaceInitialized` | Existing workspace store | `WorkspaceReference` |
| `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | Workspace identity | Canonical root-path identity owner | Provide deterministic id/canonical root path mapping for references without initialization | Existing mapping owner | `WorkspaceReference` values |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Workspace GraphQL API | Workspace reference/activation boundary | Expose cheap reference resolution separately from initialized workspace/tree payload | Existing workspace API owner | `WorkspaceReference` GraphQL type |

## Ownership Boundaries

Frontend boundary:

- Components declare visibility; they must not create raw `FileExplorerStreamingService` instances directly.
- `WorkspaceStore` decides whether a backend stream should be open for a workspace based on active visible consumers.
- `FileExplorerStreamingService` is transport only.

Run history / workspace identity boundary:

- Run history hydration owns historical view data. It may depend on a cheap workspace reference but must not initialize workspace state.
- Run/team configs own workspace identity/reference fields only: deterministic `workspaceId` and root-path/display `workspaceReference`.
- `WorkspaceStore` owns initialized workspace payloads and activation state; contexts/configs do not own or duplicate activation status.
- Team historical hydration owns member reference shells and focused/sibling projection load state. It must not use the live team member workspace activation helper.
- Workspace identity/reference resolution owns canonical path normalization and deterministic id derivation. It must not build file trees.
- Workspace activation owns the transition to initialized workspace state for Files, Terminal, context picker, and resume/rerun only when initialized handle is truly needed.

Backend boundary:

- `registerFileExplorerWebsocket` owns raw socket lifecycle and pending-connect cleanup before a session id exists.
- `FileExplorerStreamHandler` owns WebSocket session coordination and must acquire watcher resources through `BaseFileExplorer.acquireWatcherLease`, with atomic cleanup on setup failure.
- `LocalFileExplorer` is the watcher lifecycle owner; other code must not call concrete `FileExplorer.startWatcher()` directly.
- `FileNameIndexer` must not own persistent watcher lifecycle.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession` | stream map, consumer sets, refresh/loading/buffer state | `FileExplorer.vue` and any visible explorer host | Component directly instantiates `FileExplorerStreamingService` | Add store API for needed state/action |
| `RightSideTabs` context/mode prop | tab filtering and `FileExplorerLayout` render guard | `WorkspaceDesktopLayout`, `WorkspaceMobileLayout` | Mobile tools reusing desktop `files` tab path implicitly | Add explicit `mode`/`suppressFilesTab` prop and tests |
| `api/websocket/file-explorer.ts` pending cleanup context | raw socket close/error, connect promise, late-session disconnect | Fastify websocket route | Close handler returns while `sessionId` is null and never cleans up late session | Add local pending connection state and idempotent cleanup helper |
| `BaseFileExplorer.acquireWatcherLease` | watcher refcount/start/stop | `FileExplorerStreamHandler`, future backend live consumers | Direct `ensureWatcherStarted()` + never release | Add lease API semantics |
| `FileExplorer.stopWatcher` | `FileSystemWatcher.stop/close`, nulling watcher | `LocalFileExplorer.close/release` | External code mutates `fileWatcher` or starts watcher | Add explicit public method on `LocalFileExplorer`/`FileExplorer` |
| GraphQL file explorer resolver | read/write/search/folder operations | UI stores | Operations starting live watchers implicitly | Keep operations request/response only |
| Workspace reference resolver | canonical path, deterministic workspace id, display metadata | run/team history hydration, config display, activation actions | Calling `createWorkspace()`/`WorkspaceInfo.fileExplorer` just to display history workspace metadata | Add cheap reference API and activation API split |
| Run/team config workspace fields | `workspaceId` reference id plus `workspaceReference` root-path/display companion | run hydration, team hydration, config display, send/resume actions | Treating config `workspaceId` as initialized workspace proof or looking up path only in `WorkspaceStore.workspaces` | Define one meaning per field and require the reference companion |
| Team historical hydration boundary | member metadata, member reference shells, focused projection load state | `openTeamRun`, member focus actions | Generic `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` activating every member | Split live activation helper from historical shell builder |
| Workspace activation boundary | current initialized workspace and file tree readiness | Files, Terminal, context picker, and resume/rerun only when initialized handle is truly needed | History hydration directly initializing workspace | Move activation to feature action boundary |

## Dependency Rules

- UI components may depend on `WorkspaceStore` live-session methods; they must not depend on `FileExplorerStreamingService` directly.
- `WorkspaceMobileLayout` must either unmount `RightSideTabs` outside the active tools panel or pass a context/no-files mode; mobile `RightSideTabs` must not render the file explorer path.
- `WorkspaceStore` may own `FileExplorerStreamingService` instances; service must not import stores.
- `registerFileExplorerWebsocket` may call `FileExplorerStreamHandler.connect/disconnect`; it must not acquire watcher leases directly.
- `FileExplorerStreamHandler` may depend on `BaseFileExplorer.acquireWatcherLease`; it must not directly construct `FileSystemWatcher`.
- `FileNameIndexer` may read `BaseFileExplorer.getTree()` and refresh indexes; it must not start watchers by default.
- `FileExplorer` may own concrete watcher start/stop; `WorkspaceManager` must not call watcher start as part of workspace cache creation.
- Search and file operations must not require an active live stream.
- History hydration may depend on workspace reference resolution but must not call workspace activation/create/initialize.
- Standalone agent history hydration writes both `config.workspaceId` and `config.workspaceReference`; it must not leave `workspaceId` as an ambiguous initialized-only token.
- Historical team hydration writes a primary `TeamRunConfig.workspaceReference` and per-member `AgentRunConfig.workspaceReference` values; it must not call `ensureWorkspaceByRootPath()` for all members.
- Workspace reference resolution may use canonical path and mapping store; it must not import file explorer/tree traversal.
- `WorkspaceStore.activeWorkspace` must not activate or create workspace state. It returns initialized `WorkspaceInfo` only.
- Files/Terminal/context actions must call explicit workspace activation before assuming initialized workspace state.
- Resume/rerun must use `config.workspaceReference.workspaceRootPath` when initialized `WorkspaceInfo` is absent and must not initialize a workspace solely to recover the root path.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession` | Frontend visible interest | Register visible file explorer consumer and ensure live stream/snapshot | `workspaceId: string`, `consumerId: string` | Returns/requires release or paired release method. |
| `WorkspaceStore.releaseFileExplorerLiveSession` | Frontend visible interest | Release one visible consumer and disconnect when last leaves | `workspaceId`, `consumerId` | Idempotent. |
| `BaseFileExplorer.acquireWatcherLease` | Backend watcher interest | Keep watcher alive for one backend consumer | `reason: string` | Returns `WatcherLease`. |
| `WatcherLease.release` | Backend watcher interest | Release watcher ref exactly once | none | Idempotent, async. |
| `folderChildren(workspaceId, folderPath)` | Snapshot folder data | Refresh/read folder snapshot | workspace id + relative folder path | No watcher requirement. |
| `searchFiles(workspaceId, query)` | File search | Search by snapshot index/ripgrep | workspace id + query | No watcher requirement. |
| `FileExplorerStreamingService.connect(workspaceId)` | Transport connection | Open WS and parse messages | workspace id | Store-owned only. |
| Route pending connection cleanup | Raw WebSocket attachment | Pair close/error with async connect and late session id cleanup | `workspaceId`, raw socket, pending state | Implemented in `api/websocket/file-explorer.ts`, not in UI. |
| `FileExplorerStreamHandler.connect` | Backend stream session | Create session and watcher lease atomically or clean up fully | connection adapter, workspace id | Must leave no lease/session on null/reject. |
| `resolveWorkspaceReferenceByRootPath` (name illustrative) | Workspace reference | Canonicalize root path and return deterministic identity/display without initialization | `workspaceRootPath: string` | Must not call `FileSystemWorkspace.initialize()`. |
| `resolveWorkspaceReferencesByRootPaths` (optional batched name) | Workspace reference | Resolve multiple member roots to references without activation | canonical root paths | Preferred for historical team hydration. |
| `WorkspaceStore.ensureWorkspaceInitialized` (name illustrative) | Workspace activation | Create/initialize workspace for a feature action and populate `WorkspaceStore.workspaces` | `WorkspaceReference` | Called by Files/Terminal/context, not history display. |
| `loadRunContextHydrationPayload` | Historical standalone run hydration | Hydrate history context and `AgentRunConfig{workspaceId, workspaceReference}` | `runId`, resume/projection data, reference resolver | Must not require initialized workspace for offline history view. |
| `loadTeamRunContextHydrationPayload` | Team run hydration | Branch live activation vs historical references/shells | `teamRunId`, focused member key, reference resolver, live activation function only for live branch | Historical branch must not call `ensureWorkspaceByRootPath`. |
| `buildHistoricalTeamMemberContextShells` | Historical team member shells | Build member contexts with per-member `workspaceReference` and unloaded projection state | team metadata + projection map + reference map | Replaces generic helper for history. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `acquireFileExplorerLiveSession` | Yes | Yes | Low | Include consumer id to support multiple visible components. |
| `connectToFileSystemChanges` current method | No | Partially | High | Replace/rename to visible live-session API. |
| `ensureWatcherStarted` current method | No | No release identity | High | Replace with watcher lease API. |
| `FileNameIndexer.start` current method | No | N/A | High | Split snapshot index from live monitoring. |
| Current route close handler with `sessionId === null` return | No | No | High | Replace with pending-connection cleanup that disconnects a late session after early close. |
| Mobile tools `RightSideTabs` current `files` tab | No | N/A | High | Add no-files/mobile-tools mode so this context cannot mount `FileExplorerLayout`. |
| Current `ensureWorkspaceByRootPath` in standalone history hydration | No | Partially | High | Replace with cheap workspace reference for history view and explicit activation for workspace-dependent actions. |
| Current `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` in historical team hydration | No | No | High | Split live activation from historical shell/reference building. |
| `AgentRunConfig.workspaceId` as ambiguous initialized-or-reference field | No | No | High | Define as deterministic reference id and add `workspaceReference`. |
| `TeamRunConfig.workspaceId` / `firstWorkspaceId` as ambiguous initialized-or-reference field | No | No | High | Define as primary reference id and pass `primaryWorkspaceReference`. |
| `WorkspaceInfo` as history workspace display shape | No | Partially | High | Do not use tree-bearing `WorkspaceInfo` for metadata-only reference; add `WorkspaceReference`. |

## Route / Handler Cleanup Contract For Pending Connections

The route must register cleanup before starting authorization or backend `connect()`:

```ts
let closed = false;
let cleanupStarted = false;
let sessionId: string | null = null;
let connectPromise: Promise<string | null> | null = null;

const cleanup = () => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  closed = true;
  if (sessionId) {
    void fileExplorerStreamHandler.disconnect(sessionId);
    sessionId = null;
    return;
  }
  if (connectPromise) {
    void connectPromise
      .then((lateSessionId) => {
        if (lateSessionId) {
          void fileExplorerStreamHandler.disconnect(lateSessionId);
        }
      })
      .catch(() => undefined);
  }
};

socket.on("close", cleanup);
socket.on("error", cleanup);

await authorizeRemoteAccessWebSocket(req);
if (closed) return;
connectPromise = fileExplorerStreamHandler.connect(connectionAdapter, workspaceId);
connectPromise
  .then((id) => {
    sessionId = id;
    if (closed && id) {
      sessionId = null;
      void fileExplorerStreamHandler.disconnect(id);
      return;
    }
    if (!id && !closed) {
      socket.close(1011);
    }
  })
  .catch((error) => {
    logger.error(`Error connecting file explorer websocket: ${String(error)}`);
    if (!closed) {
      socket.close(1011);
    }
  });
```

The handler must make setup atomic:

- Acquire watcher lease into a local variable.
- Create/register session only after lease acquisition succeeds.
- If any later step fails, including `connection.send(CONNECTED)`, close the registered session if present and release the lease if session creation did not take ownership.
- Return `null` or reject only after cleanup is complete.
- Route-level rejection handling must close the socket only if it is still open; early-close handling remains responsible for disconnecting any late resolved session id.
- `disconnect(sessionId)` must be idempotent and safe if route late cleanup races with normal close cleanup.

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Frontend stream acquisition | `connectToFileSystemChanges` -> `acquireFileExplorerLiveSession` | Yes | Low | Name expresses visible UI lifecycle instead of generic file system changes. |
| Backend watcher resource | `ensureWatcherStarted` -> `acquireWatcherLease` | Yes | Low | Name implies release obligation. |
| Filename index | `start()` -> `refreshSnapshotIndex()` / `startLiveUpdates()` only if needed | Yes | Medium | Avoid overloading `start`. |

## Applied Patterns (If Any)

- **Lease/ref-count lifecycle**: used for backend watcher lifetime because multiple stream sessions may share one watcher.
- **Visible consumer registry**: frontend equivalent to leases; one stream per workspace while one or more visible file explorers exist.
- **Snapshot + live delta**: file tree is refreshed on open, then live deltas apply only while visible.
- **Reference/activation split**: used for historical workspaces so identity/display is cheap and current filesystem activation is explicit at feature-action boundaries.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | File | Frontend workspace state | Consumer registry, stream lifecycle, snapshot refresh state | Existing owner of workspace tree | Raw component visibility detection beyond consumer ids |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | File | File explorer visible component | Mount/unmount live-session declaration, loading display | Existing UI entrypoint | WebSocket construction |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | File | Desktop right-panel visibility | Right-panel collapse must unmount or explicitly hide file-explorer live consumers | Owns desktop right-panel host visibility | Backend lifecycle details |
| `autobyteus-web/components/layout/RightSideTabs.vue` | File | Context-aware right-tabs rendering | Desktop files-tab visibility; mobile-tools no-files mode that filters `files` and prevents `FileExplorerLayout` mounting | Knows active tab and tab list rendering | Backend lifecycle details; mobile file explorer subscription ownership |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | File | Mobile panel visibility | Dedicated explorer panel uses mount/unmount semantics; tools panel cannot mount a hidden file explorer through `RightSideTabs` | Owns mobile active panel and tools context | Backend lifecycle details |
| `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` | File | Backend explorer contract | Watcher lease API | Existing abstract contract | Concrete chokidar logic |
| `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | File | Backend local explorer boundary | Lease count/start/stop/idle policy | Existing wrapper | WebSocket session management |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | File | Concrete filesystem explorer | Concrete watcher start/stop and operations | Existing holder of watcher | Consumer refcount policy |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | File | Chokidar adapter | Awaitable watcher close and event subscriptions | Existing adapter | Workspace cache policy |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | File | WebSocket route / pending connection owner | Register close/error cleanup before async auth/connect; track closed/connectPromise/sessionId; disconnect late sessions after early close | Current route is where close-before-session-id occurs | Watcher lease internals; file search policy |
| `autobyteus-server-ts/src/services/file-explorer-streaming/*` | Folder | Backend file-explorer WS subsystem | Session lifecycle, lease setup/teardown, event streaming | Existing subsystem | Filename search policy; raw socket pending state beyond handler contract |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | File | Workspace lifecycle | Shallow initialization; on-demand full snapshot/search index | Existing workspace owner | Persistent watcher startup |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | File | Search index | Snapshot index refresh and query data | Existing index owner | Watcher ownership by default |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | File | Historical run hydration | Lazy workspace reference in run context without eager activation | Existing hydration owner | Workspace create/initialize calls for history display |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | File | History open actions | Remove display-time workspace creation; invoke activation only for workspace-dependent paths | Existing history action owner | File tree loading |
| `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts` | File | Workspace identity | Deterministic id/canonical root reference | Existing mapping owner | File tree initialization |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | File | Workspace GraphQL boundary | Separate cheap reference resolution from initialized workspace payload | Existing workspace API owner | Mixed metadata+tree identity for history |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores` | Main-Line Domain-Control | Yes | Medium | Store currently mixes snapshot and stream state, but workspace tree ownership makes this acceptable for this bounded refactor. |
| `autobyteus-web/services/fileExplorerStreaming` | Transport | Yes | Low | Keep as transport-only. |
| `autobyteus-server-ts/src/api/websocket` | Transport entry | Yes | Low | Route owns raw socket lifecycle and pending-connect cleanup before session id exists. |
| `autobyteus-server-ts/src/services/file-explorer-streaming` | Transport/session | Yes | Low | Handler/session manager own established or partially-created stream sessions and leases. |
| `autobyteus-server-ts/src/file-explorer` | Domain filesystem explorer | Yes | Medium | Contains operations, watcher, search. Lease API should keep boundaries clear. |
| `autobyteus-server-ts/src/workspaces` | Workspace lifecycle | Yes | Low | Must not own watcher consumer policy. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Frontend visible consumer | `const release = workspaceStore.acquireFileExplorerLiveSession(workspaceId, consumerId); onUnmounted(release)` | `fetchAllWorkspaces()` connects every workspace forever | Aligns resource use with user intent. |
| Backend watcher lease | `const lease = await fileExplorer.acquireWatcherLease('file-explorer-ws'); try { ... } finally { await lease.release(); }` | `await ensureWatcherStarted(); return subscribe();` with no release owner | Makes cleanup unavoidable. |
| Mobile visibility | `<FileExplorer v-if="activeMobilePanel === 'explorer'" />` and `<RightSideTabs mode="mobile-tools" />` filters out `files` | `<FileExplorer v-show="activeMobilePanel === 'explorer'" />` or mobile tools `RightSideTabs` rendering `FileExplorerLayout` while hidden | Hidden mounted component or nested files tab would keep live monitoring active. |
| WebSocket early close | Route registers cleanup before connect; if close happens first, late `sessionId` is immediately disconnected after `connectPromise` settles | Close handler returns because `sessionId` is null | Prevents lease/session leaks during async setup races. |
| History open | `workspaceRootPath -> WorkspaceReference -> AgentRunConfig{workspaceId, workspaceReference} -> render history` | `workspaceRootPath -> createWorkspace -> initialize -> build tree -> render history` | Keeps read-only history viewing independent from filesystem activation. |
| Config identity split | `workspaceId='fs_abcd'` means stable identity; `workspaceReference.workspaceRootPath='/repo'`; `WorkspaceStore.workspaces.fs_abcd` may be absent | Treating any non-null `workspaceId` as an initialized `WorkspaceInfo` key and failing/creating when missing | Removes ambiguity that caused eager activation. |
| Historical team open | `member roots -> member WorkspaceReferences -> shell contexts -> focused projection` | `for each member root -> ensureWorkspaceByRootPath -> create/init workspace` | Team history must not scale with member workspace initialization. |
| Team sibling focus | `ensureHistoricalTeamMemberHydrated -> fetch projection -> apply to existing shell` | `focus sibling -> initialize sibling workspace before showing conversation` | Keeps team navigation read-only until Files/Terminal/context action. |
| Search | `searchFiles()` refreshes snapshot index or uses ripgrep without watcher | `FileNameIndexer.start()` starts recursive watcher at workspace init | Search is user request/response, not live monitoring. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `connectToFileSystemChanges()` on workspace load and add idle cleanup only | Smaller change | Rejected | Remove auto-connect; visibility owns live stream. |
| Keep `ensureWatcherStarted()` as public API and rely on callers to stop separately | Less API churn | Rejected | Replace direct public use with `acquireWatcherLease()`. |
| Keep `FileNameIndexer.start()` watcher behavior behind option defaulting to old behavior | Backward compatibility | Rejected | Default snapshot-only; live monitoring only via explicit future API if needed. |
| Keep mobile tools `RightSideTabs` file tab and rely on `FileExplorer.vue` to notice visibility | Less layout API change | Rejected | Mobile tools right tabs use no-files mode; dedicated mobile Explorer panel owns mobile file live subscription. |
| Keep route close handler as session-id-only cleanup | Simpler route | Rejected | Track pending connection and disconnect late sessions after close-before-connect-resolves. |
| Retry Codex spawn after EBADF without watcher lifecycle fix | Quick symptom patch | Rejected as primary fix | Add diagnostics only; fix descriptor pressure at source. |
| Keep history hydration eager workspace creation because active run config expects `workspaceId` | Smaller code change | Rejected | Add lazy workspace reference and explicit activation boundary. |
| Use `WorkspaceInfo` with shallow `fileExplorer` as workspace reference | Reuses existing GraphQL shape | Rejected | Add metadata-only reference shape without tree payload. |

## Derived Layering (If Useful)

Layering after refactor:

- UI visibility layer: `FileExplorer.vue`, `RightSideTabs.vue`, layout components with explicit desktop/mobile-tools modes.
- Frontend state/control layer: `WorkspaceStore`.
- Frontend transport layer: `FileExplorerStreamingService`.
- Backend route/transport/session layer: `api/websocket/file-explorer.ts`, `FileExplorerStreamHandler`, `FileExplorerSessionManager`, `FileExplorerSession`.
- Backend domain boundary: `BaseFileExplorer`, `LocalFileExplorer`.
- Backend adapter: `FileExplorer`, `FileSystemWatcher`/chokidar.
- History/reference layer: run history hydration + workspace reference resolver sits beside workspace state and must not cross into file explorer activation until a feature action requests it.

No upper layer should bypass the layer immediately below it to start watchers directly.

## Migration / Refactor Sequence

1. Backend lease foundation:
   - Add watcher lease contract.
   - Implement refcounted `LocalFileExplorer.acquireWatcherLease()` with idempotent async release.
   - Add async `FileExplorer.stopWatcher()` and async/awaited `FileSystemWatcher.stop()`.
2. Backend streaming migration:
   - Migrate `FileExplorerStreamHandler` from `ensureWatcherStarted()` to watcher lease.
   - Ensure setup failures, send failures, disconnect, and route-requested late cleanup release lease.
   - Make `FileExplorerSession.close()` async and cancel the event generator.
   - Update `api/websocket/file-explorer.ts` to register close/error cleanup before auth/connect and disconnect late sessions if close happens before `connect()` resolves.
3. Backend implicit watcher removal:
   - Split `FileNameIndexer` snapshot index from live monitoring.
   - Remove background full scan/index watcher path from `FileSystemWorkspace.initialize()`.
   - Ensure `searchFiles()` refreshes or falls back without requiring watcher.
4. Frontend live-consumer migration:
   - Replace workspace-store auto-connect calls with explicit visible-consumer APIs.
   - Update `FileExplorer.vue` to acquire/release on mount/unmount/workspace change.
   - Update desktop visibility so collapsed `WorkspaceDesktopLayout` right panel unmounts `RightSideTabs` or passes an explicit hidden state that prevents `FileExplorerLayout` from mounting.
   - Update mobile visibility so hidden explorer surfaces unmount or release interest.
   - Add a mobile-tools/no-files mode to `RightSideTabs` and pass it from `WorkspaceMobileLayout` so mobile tools cannot render `FileExplorerLayout`.
5. Historical run lazy workspace activation:
   - Add cheap workspace reference shape/API using canonical `workspaceRootPath` and deterministic `workspaceId`; no file tree payload and no mutable activation status in the reference.
   - Extend `AgentRunConfig` and `TeamRunConfig` with `workspaceReference`; document and migrate `workspaceId` to mean deterministic reference id only.
   - Extend `WorkspaceStore` with `workspaceReferencesById`, activation state keyed by reference id, `activeWorkspaceReference`, and `ensureWorkspaceInitialized(reference)`. Keep `activeWorkspace` initialized-only.
   - Change `loadRunContextHydrationPayload()` and standalone history-open actions to hydrate references without calling `ensureWorkspaceByRootPath()`/`createWorkspace()` for read-only history display.
   - Split team hydration: live branch may use activation; historical branch uses `buildHistoricalTeamMemberContextShells`, `primaryWorkspaceReference`, and `memberWorkspaceReferencesByRouteKey` without calling `ensureWorkspaceByRootPath()` for members.
   - Update `teamRunOpenCoordinator.ts` and `teamRunConfigUtils.ts` to replace `firstWorkspaceId` handoff with `primaryWorkspaceReference`.
   - Update display/action consumers: `RunConfigPanel` displays from reference, `FileExplorer`/`Terminal` activate at action boundary, and `agentRunStore` uses reference root path for resume/rerun without file-tree activation solely to recover the path.
6. Diagnostics:
   - Add EBADF/EMFILE diagnostic logging around Codex app-server spawn.
7. Validation:
   - Run unit tests for store, components, leases, sessions.
   - Run local descriptor/spawn probe.
   - Manually reproduce original Codex scenario.

## Validation Plan

Backend tests:

- `FileSystemWorkspace.initialize()` does not start watcher.
- `FileNameIndexer` snapshot refresh does not call watcher acquisition.
- `LocalFileExplorer` starts watcher once for two leases and stops only after final release.
- `FileExplorerStreamHandler` releases lease on disconnect, setup failure, send failure, and route-requested late cleanup.
- `FileExplorerSession.close()` cancels the generator/subscription.
- `api/websocket/file-explorer.ts` handles close before `connect()` resolves by disconnecting any late `sessionId`; test also covers setup failure after lease acquisition.

Frontend tests:

- `fetchAllWorkspaces()` and `createWorkspace()` do not create `FileExplorerStreamingService`.
- `FileExplorer.vue` acquire/release lifecycle works on mount/unmount and workspace id change.
- `RightSideTabs.vue` does not mount file explorer content when desktop right panel hidden or non-Files tab active.
- In mobile-tools mode, `RightSideTabs.vue` filters out `files` and cannot mount `FileExplorerLayout`.
- `WorkspaceMobileLayout.vue` mounts dedicated explorer only on active `explorer` panel and passes no-files mode to tools `RightSideTabs`.
- Multiple consumers for same workspace keep one connection until final release.
- Opening a historical standalone agent run does not call `workspaceStore.createWorkspace()` when only rendering conversation/activity/config.
- Historical standalone agent context has `config.workspaceReference` and deterministic `config.workspaceId`, but `WorkspaceStore.workspaces[workspaceId]` may remain absent until activation.
- Historical run UI displays workspace path/name from `WorkspaceReference` before activation, including in `RunConfigPanel` selection mode.
- Opening Files/Terminal/context after historical selection triggers explicit workspace activation and shows loading/error as needed.
- Resume/rerun uses `config.workspaceReference.workspaceRootPath` when initialized workspace payload is absent and does not initialize the file tree solely to recover root path.
- Opening a historical team run with multiple member workspace paths does not call `ensureWorkspaceByRootPath`, `workspaceStore.createWorkspace`, backend `WorkspaceManager.createWorkspace`, or `FileSystemWorkspace.initialize()`.
- Historical team context has team-level `config.workspaceReference`, per-member `AgentContext.config.workspaceReference`, and `historicalHydration.memberWorkspaceReferencesByRouteKey`; `WorkspaceStore.workspaces` remains uninitialized for those references until a workspace-dependent action.
- Focusing a sibling in historical team history fetches/applies that member projection but does not activate that member workspace.

Executable/manual validation:

- Repeat file explorer open/close cycles on large workspaces and verify `lsof` count returns near baseline.
- Verify `child_process.spawn('/bin/echo', ['ok'])` succeeds after cycles.
- Verify a fresh `Codex` `codex_app_server` run with `gpt-5.5` starts in `autobyteus-tutorial-videos` after normal use.
- In packaged Electron, opening representative historical run rows is fast and does not log workspace initialization/tree traversal until Files/Terminal/resume/context is used.
