# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement

Prevent rare `spawn EBADF` failures that block prepared agent runs from activating after the AutoByteus Electron backend accumulates too many workspace watcher/file descriptors. Refactor file-explorer live monitoring so recursive filesystem watchers exist only while a user-facing file explorer is actively visible/connected, not for every loaded workspace. The current-ticket release is also blocked by a late-discovered performance regression: opening a historical run can eagerly resolve/create/initialize the run workspace and scan a shallow file tree before the user opens Files or another workspace-dependent surface. This must be fixed in the same ticket because the current build is not releasable if history-row opening is too slow.

## Investigation Findings

The selected `Codex` run fails before activation: `startedAt` and `platformAgentRunId` remain `null`, and `SEND_MESSAGE` is rejected with `[ACTIVATION_FAILED] spawn EBADF`.

The failure reproduces through the same backend path used by the frontend send button (`prepareAgentRun` + `/ws/agent/:runId` + `SEND_MESSAGE`). It also reproduces for a fresh Codex run in the tutorial workspace and a tiny `/tmp` workspace while the current Electron server process is descriptor-saturated. A run in `autobyteus-workspace-superrepo` can still work because an existing Codex app-server child already exists for that cwd and avoids a new spawn.

The embedded server has about 11k `lsof` rows, dominated by workspace file watcher descriptors. A standalone Node watcher-pressure probe reproduced the same `spawn EBADF` exception without Codex, GPT-5.5, or agent code.

Current code starts watcher-heavy flows too early:

- `autobyteus-web/stores/workspace.ts` connects a file-explorer WebSocket in `createWorkspace()`, `fetchAllWorkspaces()`, and `registerSkillWorkspace()`.
- `WorkspaceMobileLayout.vue` has two mobile file-explorer routes today: a dedicated mobile `explorer` panel and a `RightSideTabs` instance inside the mobile `tools` panel. Because the mobile tools panel is mounted through `v-show`, `RightSideTabs` can render `FileExplorerLayout` when its global active tab is `files`, even while the dedicated mobile explorer panel is not active.
- `FileSystemWorkspace.initialize()` starts a background full scan.
- `FileNameIndexer.start()` calls `fileExplorer.ensureWatcherStarted()` and subscribes to live watcher events.
- `WorkspaceManager` caches workspaces indefinitely.
- File-explorer streaming disconnect closes sessions but does not release an explicit backend watcher lease.

Late-release-blocker finding after the watcher lifecycle implementation:

- Opening a historical run still calls `loadRunContextHydrationPayload()` -> `ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)` before the run can display.
- `ensureRunHistoryWorkspaceByRootPath()` may call `workspaceStore.fetchAllWorkspaces()` and then `workspaceStore.createWorkspace({ root_path })`.
- Backend `WorkspaceManager.createWorkspace()` awaits `FileSystemWorkspace.initialize()`, and `initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)`.
- Therefore history viewing is still coupled to current workspace activation/tree scanning even though the historical payload already contains `workspaceRootPath` and viewing conversation/activity/config does not require an initialized workspace.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Refactor + Performance
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Invariant / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Watcher lifetime is owned implicitly by workspace loading and filename indexing rather than by visible file-explorer consumers. Current frontend auto-connects streams for every loaded workspace. Current backend watcher creation is triggered from index startup, not explicit UI demand. Late validation found history-run opening still requires eager workspace root-path-to-workspace-id resolution through workspace creation/initialization, which can scan the file tree before the user opens Files.
- Requirement or scope impact: The fix must change frontend connection ownership, backend watcher lifecycle, and historical-run workspace identity/activation ownership. A Codex-only retry, fd-limit increase, or watcher-only fix is insufficient for a releasable user experience.

## Recommendations

Make live filesystem monitoring demand-driven:

1. Treat the watcher as a **frontend file-explorer live subscription**, not as a workspace property.
2. Remove automatic file-explorer WebSocket connection from workspace creation/fetch/register paths.
3. Activate a live file-explorer session only when the file explorer panel/component is visible.
4. On mobile, make the dedicated `explorer` panel the only mobile file-explorer live surface; suppress the `files` tab / `FileExplorerLayout` inside mobile `RightSideTabs`.
5. Refresh a snapshot when the explorer opens; showing a loading state is acceptable.
6. Release the frontend connection and backend watcher lease when the explorer closes, hides, switches workspace, or unmounts.
7. Keep file search and click-to-open on-demand and independent from persistent watchers.
8. Treat canonical `workspaceRootPath` as the historical run workspace identity for viewing; resolve/activate a `workspaceId` lazily only when the user opens Files, Terminal, resume/rerun, context picker, or another workspace-dependent surface.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases

- UC-001: A user can activate a new Codex app-server run after normal use of large workspaces.
- UC-002: Desktop user opens the right-side Files tab and receives live file updates while the Files tab is visible.
- UC-003: Desktop user switches away from Files or collapses the right panel; the file-explorer live connection is released.
- UC-004: Mobile user opens the Files panel and receives live file updates only while that panel is active.
- UC-005: Skill detail view with an embedded file explorer receives live updates while the skill workspace view is mounted.
- UC-006: Search, folder expansion, file opening, and file mutations work even when no live watcher was previously active.
- UC-007: Agent-generated files created while the file explorer is closed become visible after the explorer is opened and refreshed.
- UC-008: Backend file watchers are shared safely by multiple visible consumers for the same workspace and stop after the last consumer disconnects.
- UC-009: User opens a historical agent run and sees conversation/activity/config quickly without backend workspace initialization or file-tree traversal.
- UC-010: User opens a historical team/member run and sees historical data quickly without eagerly initializing each member workspace.
- UC-011: User then opens Files, Terminal, resume/rerun, or context picker from a historical run; the workspace is resolved/activated at that action boundary with a visible loading/error state as needed.

## Out of Scope

- Changing Codex CLI behavior.
- Changing GPT-5.5 or model selection behavior.
- Changing prompts or agent definitions.
- Replacing the full file explorer UI.
- Replacing `chokidar` wholesale.
- Fixing unrelated `spawn codex ENOENT` PATH/configuration errors.
- Redesigning run-file artifact tracking that is independent from the file explorer tree.
- Increasing process/file-descriptor limits as the primary solution.

## Functional Requirements

- REQ-001: Workspace creation/fetch/register paths must not automatically open a file-explorer WebSocket or start a recursive filesystem watcher.
- REQ-002: Frontend file-explorer visibility must be the primary trigger for opening a live file-explorer stream.
- REQ-003: Frontend file-explorer hidden/closed/unmounted/workspace-switched states must release the live stream interest for the prior workspace.
- REQ-004: The frontend must support multiple visible file-explorer consumers for the same workspace without opening duplicate backend streams or prematurely disconnecting while another consumer remains active.
- REQ-004A: Mobile `RightSideTabs` in the `tools` panel must not render the `files` tab or `FileExplorerLayout`; the dedicated mobile `explorer` panel is the only mobile file-explorer live consumer.
- REQ-005: Opening a file explorer must refresh the current tree snapshot before or alongside live update delivery so files changed while the explorer was closed become visible.
- REQ-006: The UI must expose an acceptable loading/refreshing state while the snapshot refresh or live stream connection is starting.
- REQ-007: Backend workspace initialization must not unconditionally start a persistent recursive watcher or background full-tree watcher subscription.
- REQ-008: Backend filename indexing/search must not require a permanent watcher; it must use snapshot/on-demand indexing and/or bounded search strategy execution.
- REQ-009: Backend file-explorer streaming must acquire a watcher lease when a stream session starts and release it on disconnect, setup failure, or stream failure.
- REQ-009A: The file-explorer WebSocket route/handler contract must clean up correctly when the socket closes before async `connect()` resolves or before a `sessionId` is assigned.
- REQ-009B: If setup fails after watcher lease acquisition but before a usable session is returned to the route, the backend must release that lease and close any partially registered session.
- REQ-010: Backend watcher leases must be reference-counted or equivalently lifecycle-governed so the first active session starts the watcher and the final release stops it immediately or after a documented short idle timeout.
- REQ-011: Watcher stop must await underlying watcher close where available so file descriptors are actually released before the lifecycle is considered closed.
- REQ-012: File explorer file operations must still return explicit change events for self-initiated UI updates, even when no live watcher is active.
- REQ-013: Child-process spawn failures with `EBADF`/`EMFILE` must be logged with enough context to distinguish descriptor pressure from missing-command errors.
- REQ-014: Historical run open must not call frontend `workspaceStore.createWorkspace()` solely to display conversation/activity/config.
- REQ-015: Historical run open must not require backend `FileSystemWorkspace.initialize()` or `buildWorkspaceDirectoryTree(...)` solely to display historical data.
- REQ-016: Historical run hydration must preserve canonical `workspaceRootPath` as displayable metadata even when no live/current workspace is initialized.
- REQ-017: The system must provide a cheap filesystem workspace reference model plus centrally-owned activation state: the reference carries deterministic `workspaceId`, canonical `workspaceRootPath`, and display name without file-tree scanning; activation/initialization status lives in `WorkspaceStore`. A non-null `workspaceId` in run config means stable workspace identity/reference, not proof that `WorkspaceInfo` has been initialized.
- REQ-018: Workspace-dependent actions must explicitly obtain the feature-specific workspace handle they need before use: Files/Terminal/context picker require initialized workspace state; resume/rerun must at least use the canonical `workspaceRootPath` from the reference and must not initialize file trees solely to recover the path.
- REQ-019: Lazy workspace reference resolution must preserve one-to-one identity for a canonical filesystem root path.
- REQ-020: If a historical workspace path is missing/inaccessible, history viewing must still work; errors should surface only when a workspace-dependent action is attempted.
- REQ-021: Team history hydration must not eagerly initialize every member workspace merely to show team history.
- REQ-022: `AgentRunConfig`, `TeamRunConfig`, `AgentContext`, and team member contexts must carry workspace identity/reference with one clear meaning: `workspaceId` is stable deterministic identity; `workspaceReference` carries root path/display metadata; initialized workspace payload lives in `WorkspaceStore.workspaces`.
- REQ-023: Historical team hydration must build focused-member and sibling member shells with per-member workspace references without calling eager workspace activation for every member.

## Acceptance Criteria

- AC-001: `fetchAllWorkspaces()` and `createWorkspace()` no longer instantiate `FileExplorerStreamingService` or connect file-explorer WebSockets by default.
- AC-002: Opening the desktop Files tab with the right panel visible starts exactly one live file-explorer stream for the active workspace.
- AC-003: Switching from Files to another right-side tab or collapsing the right panel disconnects/releases the file-explorer stream for that visible consumer.
- AC-004: On mobile, the file-explorer stream exists only while the active mobile panel is `explorer`.
- AC-004A: In the mobile `tools` panel, `RightSideTabs` does not show the `files` tab and cannot mount `FileExplorerLayout`.
- AC-005: In skill detail view, mounting the embedded `FileExplorer` starts live streaming for that skill workspace and unmounting releases it.
- AC-006: Backend tests show `FileSystemWorkspace.initialize()` and filename index snapshot build do not start `FileSystemWatcher`.
- AC-007: Backend tests show two concurrent stream sessions for one workspace share one watcher and the watcher remains active until both sessions disconnect.
- AC-008: Backend tests show the final disconnect calls watcher close and clears the active watcher reference.
- AC-009: Repeated open/close cycles for file explorer do not monotonically increase server open descriptor count in a local executable probe.
- AC-010: A local child-process spawn probe still succeeds after repeated file-explorer open/close lifecycle cycles.
- AC-011: A Codex agent can start in `/Users/normy/autobyteus_org/autobyteus-tutorial-videos` after normal large-workspace use with the refactored lifecycle.
- AC-012: Files created while the file explorer is closed appear after reopening/refreshing the explorer.
- AC-013: Logs for `spawn EBADF` include command/cwd/runtime context and a descriptor-pressure hint, while `ENOENT` remains distinguishable as missing command/path.
- AC-014: A WebSocket close that occurs before file-explorer `connect()` resolves does not leave an active session or watcher lease after the connect promise settles.
- AC-015: A setup failure after watcher lease acquisition releases the lease and closes any partially registered session.
- AC-016: Opening a historical agent run with a workspace path not yet in frontend workspace state does not call `workspaceStore.createWorkspace()`.
- AC-017: Backend history projection/resume queries and frontend history hydration do not call `WorkspaceManager.createWorkspace()` or `FileSystemWorkspace.initialize()`.
- AC-018: Historical run UI can display workspace path/name even before workspace activation.
- AC-019: Opening Files after historical run selection lazily resolves/activates the workspace and loads the file explorer with a visible loading state.
- AC-020: Resuming/rerunning a historical run uses `workspaceReference.workspaceRootPath` without initializing file trees solely to recover the path; if that runtime path needs initialized workspace state, activation happens at resume/rerun time and errors are reported there.
- AC-021: Inaccessible/missing workspace path does not block historical conversation display.
- AC-022: Opening a historical team run with multiple member workspace paths does not initialize each member workspace.
- AC-023: Equivalent canonical workspace root paths map to one deterministic workspace identity.
- AC-024: Historical agent run context has `config.workspaceReference` and deterministic `config.workspaceId`, but `WorkspaceStore.workspaces[workspaceId]` may remain absent until activation.
- AC-025: Historical team run context has team-level primary workspace reference and per-member workspace references; `WorkspaceStore.workspaces` remains uninitialized for those references until a workspace-dependent action.
- AC-026: Focusing a sibling member in historical team history may hydrate that member projection but does not activate the member workspace.

## Constraints / Dependencies

- Frontend file explorer live stream currently lives in `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` and is owned by `autobyteus-web/stores/workspace.ts`.
- Desktop Files tab is rendered through `RightSideTabs.vue` -> `FileExplorerLayout.vue` -> `FileExplorer.vue`.
- Desktop right panel is currently hidden through `WorkspaceDesktopLayout.vue` `v-show`, so collapsed desktop panels can retain mounted tab content unless changed or explicitly gated.
- Mobile currently uses `v-show` for the dedicated explorer panel, which keeps the component mounted while hidden.
- Mobile also mounts `RightSideTabs` inside the `tools` panel through `v-show`; this nested right-side-tabs path can currently render `FileExplorerLayout` if the global active right-side tab is `files`.
- Backend watcher implementation uses `chokidar` in `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`.
- Backend `FileNameIndexer.start()` currently starts watcher monitoring.
- `WorkspaceManager` caches workspaces indefinitely.
- Packaged Electron/macOS runtime behavior is material to validation.
- `RunMetadataConfigPayload` already includes `workspaceRootPath`.
- `AgentRunConfig` and `TeamRunConfig` currently carry `workspaceId: string | null` without a companion root-path/display reference, which creates pressure to resolve or create workspace state during history hydration.
- Team history currently flows through `openTeamMemberRunFromHistory()` -> `openTeamRun()` -> `loadTeamRunContextHydrationPayload()` -> `buildTeamMemberContexts()`, and the helper calls `ensureWorkspaceByRootPath()` for each member workspace path.
- `WorkspaceIdMappingStore` already derives deterministic filesystem workspace ids with `buildFilesystemWorkspaceId(rootPath)` and persists id-to-root mappings.
- `WorkspaceInfo` currently mixes workspace metadata with a shallow file explorer snapshot, so using it for history workspace identity can accidentally trigger tree work.

## Assumptions

- It is acceptable to show a loading/refreshing state when opening file explorer.
- If the explorer is closed, the user is not consuming live file events; discovering changed files on next open is acceptable.
- File read/write/move/create/delete operations should remain available without a live watcher.
- A short idle timeout may be acceptable to avoid rapid start/stop thrashing, but the default should be bounded and test-injectable.
- Viewing historical runs is read-only and should not require current filesystem availability.
- Canonical root path is a valid unique identity for a local filesystem workspace from the server perspective.

## Risks / Open Questions

- Need choose exact event ordering during open: watcher-first + buffered events + snapshot refresh is safest.
- Need ensure mobile hidden panels do not keep `FileExplorer` mounted through `v-show`.
- Need suppress or explicitly gate the mobile tools `RightSideTabs` file tab so it cannot become a second hidden mobile file-explorer live consumer.
- Need ensure WebSocket route cleanup handles close-before-session-id and setup-failure-after-lease paths.
- Need ensure session close terminates event generator subscriptions immediately, not only on the next watcher event.
- Need decide whether search should rebuild snapshot index every query, use a TTL, or use ripgrep as primary fallback.
- Need split historical workspace reference from initialized workspace state without breaking active/live run and resume/rerun flows.
- Need validate the historical team hydration split so team row/member selection builds member workspace references without activating every member workspace.
- Need decide whether folder-scoped lazy file explorer loading belongs in this same remediation or remains a follow-up once history open is decoupled.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-006, UC-007
- REQ-002 -> UC-002, UC-004, UC-005
- REQ-003 -> UC-003, UC-004, UC-005
- REQ-004 -> UC-008
- REQ-004A -> UC-004
- REQ-005 -> UC-007
- REQ-006 -> UC-002, UC-004, UC-005, UC-007
- REQ-007 -> UC-001, UC-006
- REQ-008 -> UC-006
- REQ-009 -> UC-002, UC-003, UC-004, UC-005, UC-008
- REQ-009A -> UC-002, UC-003, UC-004, UC-005, UC-008
- REQ-009B -> UC-002, UC-003, UC-004, UC-005, UC-008
- REQ-010 -> UC-008
- REQ-011 -> UC-001, UC-008
- REQ-012 -> UC-006
- REQ-013 -> UC-001
- REQ-014 -> UC-009, UC-010
- REQ-015 -> UC-009, UC-010
- REQ-016 -> UC-009, UC-010
- REQ-017 -> UC-009, UC-011
- REQ-018 -> UC-011
- REQ-019 -> UC-009, UC-011
- REQ-020 -> UC-009, UC-010
- REQ-021 -> UC-010
- REQ-022 -> UC-009, UC-010, UC-011
- REQ-023 -> UC-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> verifies frontend no longer causes watchers just by loading workspaces.
- AC-002 -> verifies desktop open path.
- AC-003 -> verifies desktop close/hide path.
- AC-004 -> verifies mobile visibility ownership.
- AC-004A -> verifies mobile tools does not contain a hidden duplicate file-explorer path.
- AC-005 -> verifies skill workspace embedded explorer ownership.
- AC-006 -> verifies backend workspace/index no longer starts watchers implicitly.
- AC-007 -> verifies backend shared watcher lifecycle.
- AC-008 -> verifies descriptor release on final close.
- AC-009 -> catches descriptor leaks across repeated use.
- AC-010 -> catches recurrence of child-process spawn pressure.
- AC-011 -> confirms the original user-facing Codex scenario.
- AC-012 -> confirms snapshot refresh behavior after hidden period.
- AC-013 -> improves future diagnosis.
- AC-014 -> catches close-before-connect-resolves watcher/session leaks.
- AC-015 -> catches setup-failure-after-lease leaks.
- AC-016 -> verifies frontend history-open decoupling from workspace creation.
- AC-017 -> verifies backend/current workspace initialization is not part of history viewing.
- AC-018 -> verifies historical workspace metadata remains visible.
- AC-019 -> verifies lazy activation still supports file explorer.
- AC-020 -> verifies runtime actions use the reference root path and activate only when an initialized workspace handle is truly required.
- AC-021 -> verifies history viewing is resilient to missing local paths.
- AC-022 -> verifies team history does not multiply eager workspace initialization.
- AC-023 -> verifies root path identity remains stable.
- AC-024 -> verifies agent config/reference field split and initialized-state separation.
- AC-025 -> verifies team/member config/reference field split and initialized-state separation.
- AC-026 -> verifies member projection hydration remains separate from workspace activation.

## Approval Status

User approved the watcher refactoring direction on 2026-05-22. During release validation, user identified slow historical run opening as a same-ticket release blocker and approved folding lazy history workspace activation into the current ticket rather than creating a follow-up. Ready for revised architecture review.
