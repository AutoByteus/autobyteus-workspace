# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined — Round 8 requirements unchanged; AR-007 design-spec reconciliation ready for user review

## Goal / Problem Statement

Prevent rare `spawn EBADF` failures that block prepared agent runs from activating after the AutoByteus Electron backend accumulates too many workspace watcher/file descriptors. Refactor file-explorer live monitoring so recursive filesystem watchers exist only while a user-facing file explorer is actively visible/connected, not for every loaded workspace. The current-ticket release is also blocked by late-discovered performance regressions where read-only or cwd-only actions eagerly materialize workspaces: opening a historical run can create/initialize the run workspace and scan a shallow file tree before the user opens Files, and opening Terminal currently follows the same materialized-workspace path even though Terminal only needs a cwd/root path. These must be fixed in the same ticket because the current build is not releasable if history or Terminal opening is too slow.

## Investigation Findings

The selected `Codex` run fails before activation: `startedAt` and `platformAgentRunId` remain `null`, and `SEND_MESSAGE` is rejected with `[ACTIVATION_FAILED] spawn EBADF`.

The failure reproduces through the same backend path used by the frontend send button (`prepareAgentRun` + `/ws/agent/:runId` + `SEND_MESSAGE`). It also reproduces for a fresh Codex run in the tutorial workspace and a tiny `/tmp` workspace while the current Electron server process is descriptor-saturated. A run in `autobyteus-workspace-superrepo` can still work because an existing Codex app-server child already exists for that cwd and avoids a new spawn.

The embedded server has about 11k `lsof` rows, dominated by workspace file watcher descriptors. A standalone Node watcher-pressure probe reproduced the same `spawn EBADF` exception without Codex, GPT-5.5, or agent code.

At initial root-cause investigation, code started watcher-heavy flows too early:

- `autobyteus-web/stores/workspace.ts` connects a file-explorer WebSocket in `createWorkspace()`, `fetchAllWorkspaces()`, and `registerSkillWorkspace()`.
- `WorkspaceMobileLayout.vue` has two mobile file-explorer routes today: a dedicated mobile `explorer` panel and a `RightSideTabs` instance inside the mobile `tools` panel. Because the mobile tools panel is mounted through `v-show`, `RightSideTabs` can render `FileExplorerLayout` when its global active tab is `files`, even while the dedicated mobile explorer panel is not active.
- `FileSystemWorkspace.initialize()` starts a background full scan.
- `FileNameIndexer.start()` calls `fileExplorer.ensureWatcherStarted()` and subscribes to live watcher events.
- `WorkspaceManager` caches workspaces indefinitely.
- File-explorer streaming disconnect closes sessions but does not release an explicit backend watcher lease.

Late-release-blocker findings after the watcher lifecycle implementation:

- Opening a historical run still calls `loadRunContextHydrationPayload()` -> `ensureWorkspaceByRootPath(resumeConfig.metadataConfig.workspaceRootPath)` before the run can display.
- `ensureRunHistoryWorkspaceByRootPath()` may call `workspaceStore.fetchAllWorkspaces()` and then `workspaceStore.createWorkspace({ root_path })`.
- Backend `WorkspaceManager.createWorkspace()` awaits `FileSystemWorkspace.initialize()`, and `initialize()` calls `fileExplorer.buildWorkspaceDirectoryTree(1)`.
- Therefore history viewing is still coupled to current workspace materialization/tree scanning even though the historical payload already contains `workspaceRootPath` and viewing conversation/activity/config does not require an initialized workspace.
- Opening Terminal currently calls `Terminal.vue` -> `ensureWorkspaceForTerminal()` -> `workspaceStore.ensureWorkspaceInitialized(reference)` -> `workspaceStore.createWorkspace({ root_path })` before connecting `/ws/terminal/:workspaceId/:sessionId`.
- Backend Terminal currently rejects unless `workspaceManager.getWorkspaceById(workspaceId)` returns an already materialized workspace, then uses `workspace.getBasePath()` as cwd.
- Therefore Terminal is incorrectly coupled to materialized workspace/file-tree initialization even though the terminal feature only needs a validated cwd/root path.
- Mobile Terminal has a second frontend surface in `autobyteus-web/components/mobile/MobileTools.vue`. It currently computes `workspaceFromContext` from initialized `WorkspaceInfo`/`workspaceStore.allWorkspaces` and renders `<Terminal :workspace-id="terminalWorkspaceId" />`, so mobile can keep the old initialized-workspace gate even if desktop Terminal is fixed.
- Backend Terminal WebSocket has the same close-before-connect race shape as the earlier file-explorer route: messages and close handlers are registered around `connectedSessionId`, and an early close before `handler.connect()` resolves can leave a late PTY session unless the terminal route tracks `closed`, `connectPromise`, and late cleanup explicitly.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Refactor + Performance
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Missing Invariant / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Watcher lifetime is owned implicitly by workspace loading and filename indexing rather than by visible file-explorer consumers. Current frontend auto-connects streams for every loaded workspace. Current backend watcher creation is triggered from index startup, not explicit UI demand. Late validation found history-run opening still requires eager workspace root-path-to-workspace-id resolution through workspace creation/initialization, which can scan the file tree before the user opens Files. A further same-ticket finding shows Terminal also calls workspace initialization before starting a PTY, even though Terminal only needs cwd/root path.
- Requirement or scope impact: The fix must change frontend connection ownership, backend watcher lifecycle, historical-run workspace identity/materialization ownership, and Terminal's cwd/session boundary across desktop and mobile, plus Terminal WebSocket pending-connect cleanup. A Codex-only retry, fd-limit increase, watcher-only fix, or history-only fix is insufficient for a releasable user experience.

## Recommendations

Make live filesystem monitoring demand-driven:

1. Treat the watcher as a **frontend file-explorer live subscription**, not as a workspace property.
2. Remove automatic file-explorer WebSocket connection from workspace creation/fetch/register paths.
3. Activate a live file-explorer session only when the file explorer panel/component is visible.
4. On mobile, make the dedicated `explorer` panel the only mobile file-explorer live surface; suppress the `files` tab / `FileExplorerLayout` inside mobile `RightSideTabs`.
5. Refresh a snapshot when the explorer opens; showing a loading state is acceptable.
6. Release the frontend connection and backend watcher lease when the explorer closes, hides, switches workspace, or unmounts.
7. Keep file search and click-to-open on-demand and independent from persistent watchers.
8. Treat canonical `workspaceRootPath` as the historical run workspace identity for viewing and as the cwd input for Terminal/resume/rerun on both desktop and mobile. Materialize/initialize a workspace lazily only when the user opens Files, file-tree browsing, context picker file browsing, or another feature that truly needs `WorkspaceInfo`/file-explorer state.

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
- UC-011: User then opens Files or context picker file browsing from a historical run; the workspace is resolved/materialized at that action boundary with a visible loading/error state as needed.
- UC-012: User opens Terminal from a historical or non-materialized run; Terminal starts in the referenced `workspaceRootPath` without materializing the workspace or loading a file tree.
- UC-013: Mobile user opens Tools -> Terminal from an agent-run, team-run, or workspace mobile context; Terminal derives a root-path target from `MobileWorkContext`/focused member reference and starts without requiring initialized `WorkspaceInfo`.
- UC-014: Terminal WebSocket closes before async connect resolves or setup fails after PTY/session creation; no retained PTY session remains.

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
- REQ-017: The system must provide a cheap filesystem workspace reference model plus centrally-owned materialization state: the reference carries deterministic `workspaceId`, canonical `workspaceRootPath`, and display name without file-tree scanning; materialization/initialization status lives in `WorkspaceStore`. A non-null `workspaceId` in run config means stable workspace identity/reference, not proof that `WorkspaceInfo` has been initialized.
- REQ-018: Workspace-dependent actions must explicitly obtain the feature-specific handle they need before use: Files and context picker file browsing require materialized workspace/file-tree state; Terminal and resume/rerun require only the canonical `workspaceRootPath` as cwd/launch root and must not initialize file trees solely to recover or use that path.
- REQ-019: Lazy workspace reference resolution must preserve one-to-one identity for a canonical filesystem root path.
- REQ-020: If a historical workspace path is missing/inaccessible, history viewing must still work; errors should surface only when a workspace-dependent action is attempted.
- REQ-021: Team history hydration must not eagerly initialize every member workspace merely to show team history.
- REQ-022: `AgentRunConfig`, `TeamRunConfig`, `AgentContext`, and team member contexts must carry workspace identity/reference with one clear meaning: `workspaceId` is stable deterministic identity; `workspaceReference` carries root path/display metadata; initialized workspace payload lives in `WorkspaceStore.workspaces`.
- REQ-023: Historical team hydration must build focused-member and sibling member shells with per-member workspace references without calling eager workspace materialization for every member.
- REQ-024: Terminal must support a root-path/cwd-based connection path that does not require `WorkspaceStore.workspaces[workspaceId]`, frontend `workspaceStore.createWorkspace()`, backend `WorkspaceManager.createWorkspace()`, or `FileSystemWorkspace.initialize()` for ordinary filesystem workspaces.
- REQ-025: Backend Terminal must validate/canonicalize the requested cwd/root path and start the PTY from that cwd without building a file explorer tree or acquiring file-explorer watcher resources.
- REQ-026: Mobile Terminal must derive a `TerminalTarget` from `MobileWorkContext` root-path data and/or the focused team member `WorkspaceReference`; it must not gate Terminal rendering on `WorkspaceStore.workspaces`, `WorkspaceStore.allWorkspaces`, or an initialized `WorkspaceInfo`.
- REQ-027: `Terminal.vue` must accept an explicit root-path `TerminalTarget`/`WorkspaceReference` from mobile and must not expose an initialized-workspace-id-only contract as the required Terminal entrypoint.
- REQ-028: Backend Terminal WebSocket route must register close/error cleanup before auth/connect, track `closed`, `cleanupStarted`, `connectPromise`, and `connectedSessionId`, disconnect late sessions when close wins the race, and clear pending messages after early close.
- REQ-029: `TerminalHandler.connect()` / `PtySessionManager` setup must close any partially created PTY session if setup fails after session creation but before route ownership is established.

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
- AC-018: Historical run UI can display workspace path/name even before workspace materialization.
- AC-019: Opening Files after historical run selection lazily resolves/materializes the workspace and loads the file explorer with a visible loading state.
- AC-020: Resuming/rerunning a historical run uses `workspaceReference.workspaceRootPath` without initializing file trees solely to recover the path; if that runtime path needs materialized workspace state, materialization happens at resume/rerun time and errors are reported there.
- AC-021: Inaccessible/missing workspace path does not block historical conversation display.
- AC-022: Opening a historical team run with multiple member workspace paths does not initialize each member workspace.
- AC-023: Equivalent canonical workspace root paths map to one deterministic workspace identity.
- AC-024: Historical agent run context has `config.workspaceReference` and deterministic `config.workspaceId`, but `WorkspaceStore.workspaces[workspaceId]` may remain absent until materialization.
- AC-025: Historical team run context has team-level primary workspace reference and per-member workspace references; `WorkspaceStore.workspaces` remains uninitialized for those references until a file-tree-dependent materialization action.
- AC-026: Focusing a sibling member in historical team history may hydrate that member projection but does not materialize the member workspace.
- AC-027: Opening Terminal from a historical/non-materialized filesystem workspace does not call `workspaceStore.createWorkspace()`, backend `WorkspaceManager.createWorkspace()`, or `FileSystemWorkspace.initialize()`.
- AC-028: Backend Terminal starts the PTY with cwd equal to the canonical `workspaceRootPath` from the selected workspace reference and logs/returns errors at Terminal connection time for missing/inaccessible paths.
- AC-029: Opening Mobile Tools -> Terminal from agent-run/team-run/workspace contexts does not call `workspaceStore.createWorkspace()`, does not require `workspaceStore.workspaces[workspaceId]`, and passes a root-path Terminal target into `Terminal.vue` / `useTerminalSession`.
- AC-030: A Terminal WebSocket close/error before `handler.connect()` resolves disconnects any late-created PTY session and leaves `PtySessionManager.sessionCount` unchanged after cleanup settles.
- AC-031: A Terminal setup failure after PTY/session creation closes the partial session and leaves no retained read loop/session record.

## Constraints / Dependencies

- Frontend file explorer live stream currently lives in `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` and is owned by `autobyteus-web/stores/workspace.ts`.
- Desktop Files tab is rendered through `RightSideTabs.vue` -> `FileExplorerLayout.vue` -> `FileExplorer.vue`.
- Desktop right panel is currently hidden through `WorkspaceDesktopLayout.vue` `v-show`, so collapsed desktop panels can retain mounted tab content unless changed or explicitly gated.
- Mobile currently uses `v-show` for the dedicated explorer panel, which keeps the component mounted while hidden.
- Mobile also mounts `RightSideTabs` inside the `tools` panel through `v-show`; this nested right-side-tabs path can currently render `FileExplorerLayout` if the global active right-side tab is `files`.
- Backend watcher implementation uses `chokidar` in `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts`.
- Initial backend `FileNameIndexer.start()` path started watcher monitoring; the target remains no implicit watcher startup.
- `WorkspaceManager` caches workspaces indefinitely.
- Packaged Electron/macOS runtime behavior is material to validation.
- `RunMetadataConfigPayload` already includes `workspaceRootPath`.
- Terminal frontend currently lives in `autobyteus-web/components/workspace/tools/Terminal.vue` and `autobyteus-web/composables/useTerminalSession.ts`; it currently expects a `workspaceId` WebSocket target.
- Backend Terminal currently lives in `autobyteus-server-ts/src/api/websocket/terminal.ts`, `services/terminal-streaming/terminal-handler.ts`, and `pty-session-manager.ts`; the route currently requires an active workspace id and obtains cwd through `workspaceManager.getWorkspaceById(workspaceId).getBasePath()`.
- Mobile Terminal currently lives in `autobyteus-web/components/mobile/MobileTools.vue`; it receives `MobileWorkContext`, computes `workspaceFromContext`, and passes `:workspace-id` to `Terminal.vue`.
- `MobileWorkContext` currently carries root-path data for `agent-run`, `team-run`, and `workspace` contexts; this is sufficient to create a Terminal cwd target without materializing `WorkspaceInfo`.
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
- Need validate the historical team hydration split so team row/member selection builds member workspace references without materializing every member workspace.
- Need decide whether folder-scoped lazy file explorer loading belongs in this same remediation or remains a follow-up once history open is decoupled.
- Need validate mobile Terminal target derivation for agent-run, team-run focused member, and workspace contexts without `WorkspaceInfo` lookup.
- Need validate Terminal route early-close/setup-failure cleanup does not retain PTY sessions or read loops.

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
- REQ-018 -> UC-011, UC-012
- REQ-019 -> UC-009, UC-011
- REQ-020 -> UC-009, UC-010
- REQ-021 -> UC-010
- REQ-022 -> UC-009, UC-010, UC-011
- REQ-023 -> UC-010
- REQ-024 -> UC-012, UC-013
- REQ-025 -> UC-012, UC-013
- REQ-026 -> UC-013
- REQ-027 -> UC-013
- REQ-028 -> UC-014
- REQ-029 -> UC-014

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
- AC-019 -> verifies lazy materialization still supports file explorer.
- AC-020 -> verifies runtime actions use the reference root path and materialize only when an initialized workspace handle is truly required.
- AC-021 -> verifies history viewing is resilient to missing local paths.
- AC-022 -> verifies team history does not multiply eager workspace initialization.
- AC-023 -> verifies root path identity remains stable.
- AC-024 -> verifies agent config/reference field split and initialized-state separation.
- AC-025 -> verifies team/member config/reference field split and initialized-state separation.
- AC-026 -> verifies member projection hydration remains separate from workspace materialization.
- AC-027 -> verifies Terminal no longer materializes workspace state merely to open.
- AC-028 -> verifies Terminal root-path/cwd validation and error ownership.
- AC-029 -> verifies mobile Terminal no longer depends on initialized workspace payload.
- AC-030 -> verifies Terminal route close-before-connect cleanup.
- AC-031 -> verifies Terminal setup-failure partial session cleanup.

## Approval Status

User approved the watcher refactoring direction on 2026-05-22. During release validation, user identified slow historical run opening as a same-ticket release blocker and approved folding lazy history workspace materialization into the current ticket rather than creating a follow-up. On 2026-05-23, user identified that Terminal follows the old materialized-workspace path and confirmed Terminal should use root path/cwd only, like history/resume, rather than materializing the file-explorer workspace. Architecture review round 5 identified mobile Terminal and Terminal WebSocket pending-cleanup gaps; artifacts were revised in-place. User then requested the cleaner WorkspaceMetadata + lazy WorkspaceFileExplorer design; artifacts are paused for user review before another architecture-review round.

## Round 6 Requirement Revision: WorkspaceMetadata + Lazy Single FileExplorer

User clarified the preferred mental model on 2026-05-23:

- Workspace is cheap metadata plus an optional lazy file-explorer capability.
- The cheap object should be called `WorkspaceMetadata`, not `WorkspaceReference`.
- There is only one local filesystem file-explorer capability; remove the speculative `BaseFileExplorer` / `LocalFileExplorer` split and keep one concrete workspace-scoped `WorkspaceFileExplorer`.
- `createWorkspace()` / `getOrCreateWorkspace()` must never create the internal FileExplorer. FileExplorer creation is initiated only by frontend file-explorer consumers.

Additional in-scope use cases:

- UC-015: User creates/selects a workspace path for agent/team configuration; backend/frontend store only metadata and do not create a file tree or file explorer.
- UC-016: User opens desktop Files, mobile Files, skill file explorer, or context file browser/search; the system creates/acquires the FileExplorer lazily and releases it when the visible consumer closes.
- UC-017: Agent runtime, Codex/Claude/AutoByteus cwd resolution, Terminal, history, resume, and rerun operate using `WorkspaceMetadata.rootPath` only and never acquire FileExplorer.

Additional requirements:

- REQ-030: Target shared type must be `WorkspaceMetadata` rather than `WorkspaceReference`; it must contain stable `workspaceId`, canonical `rootPath`, display name, and workspace kind/source metadata, with no file tree, watcher, search index, or materialization status.
- REQ-031: Backend `WorkspaceManager.createWorkspace()`, `ensureWorkspaceByRootPath()`, and `getOrCreateWorkspace()` must create/return workspace metadata only and must not instantiate FileExplorer, build a directory tree, create `FileNameIndexer`, start watchers, or initialize search state.
- REQ-032: Backend file explorer implementation must collapse to one concrete local filesystem `WorkspaceFileExplorer`; `BaseFileExplorer` and `LocalFileExplorer` must be removed/decommissioned in the target design because no remote/alternate file explorer exists.
- REQ-033: FileExplorer creation/acquisition must be explicit and demand-driven from file-explorer consumers only: desktop Files, mobile Files, skill file explorer, and context file browser/search/read/write.
- REQ-034: Agent runtime, Codex/Claude/AutoByteus workspace resolvers, history hydration, Terminal, resume, and rerun must depend only on `WorkspaceMetadata.rootPath`/metadata and must not call FileExplorer acquisition APIs.
- REQ-035: Workspace list/create GraphQL/API responses must not include a `fileExplorer` tree payload as part of general workspace metadata. File tree data belongs to FileExplorer-specific queries/responses.
- REQ-036: Frontend workspace state must separate workspace metadata from FileExplorer tree/open-file/search/live-stream state; `WorkspaceInfo.fileExplorer` must not remain the general workspace shape.

Additional acceptance criteria:

- AC-032: Backend tests prove `WorkspaceManager.createWorkspace()` and `getOrCreateWorkspace()` do not instantiate FileExplorer, build trees, create `FileNameIndexer`, or start watchers.
- AC-033: Static/type tests or build checks prove `BaseFileExplorer` and `LocalFileExplorer` are removed or no longer imported; watcher lease logic lives in the single concrete WorkspaceFileExplorer owner.
- AC-034: Backend tests prove file tree/search/read/write GraphQL resolvers and file-explorer WebSocket are the only backend paths that create/acquire FileExplorer.
- AC-035: Backend runtime tests prove agent prepare/activation/restore and Codex/Claude/AutoByteus cwd resolution use `WorkspaceMetadata.rootPath` and do not call FileExplorer acquisition.
- AC-036: Frontend tests prove workspace metadata list/create state contains no `TreeNode`/`fileExplorer` payload and Files/Skill/Context browser owns tree state separately.
- AC-037: Desktop Files, mobile Files, skill file explorer, and context file browser/search acquire FileExplorer on open and release it on close/unmount/final consumer release.
- AC-038: History open, desktop Terminal, mobile Terminal, resume, and rerun do not acquire FileExplorer or create file-tree state.

Round 6 coverage additions:

- REQ-030 -> UC-015, UC-017
- REQ-031 -> UC-015, UC-017
- REQ-032 -> UC-016
- REQ-033 -> UC-016
- REQ-034 -> UC-017
- REQ-035 -> UC-015, UC-016
- REQ-036 -> UC-015, UC-016, UC-017
- AC-032 -> verifies metadata-only backend workspace creation.
- AC-033 -> verifies single concrete WorkspaceFileExplorer capability architecture.
- AC-034 -> verifies FileExplorer creation is isolated to file-explorer paths.
- AC-035 -> verifies runtime/cwd features use metadata only.
- AC-036 -> verifies frontend metadata/tree split.
- AC-037 -> verifies visible-consumer FileExplorer lifecycle.
- AC-038 -> verifies non-file-explorer features remain metadata-only.


## Round 7 Requirement Revision: Preserve Workspace APIs, Correct Workspace Semantics

User clarified on 2026-05-23 that many existing top-level workspace APIs are conceptually correct. The refactor should not churn API names merely to work around an eager implementation. The target is to preserve the `WorkspaceManager` / `Workspace` domain boundary where practical while changing the creation contract to be metadata-only and moving file-explorer state behind explicit lazy acquisition.

Additional/clarified requirements:

- REQ-037: `WorkspaceManager` remains the authoritative backend owner for workspace objects and workspace metadata. Do not introduce a steady-state parallel `WorkspaceMetadataManager` that fragments ownership.
- REQ-038: `WorkspaceManager.createWorkspace()`, `WorkspaceManager.getOrCreateWorkspace()`, and `WorkspaceManager.ensureWorkspaceByRootPath()` may keep their current top-level names, but their semantic contract is metadata-only workspace creation/resolution. They must not create FileExplorer, `FileNameIndexer`, search strategy, tree snapshot, live stream, or watcher resources.
- REQ-039: `Workspace`, `FileSystemWorkspace`, `SkillWorkspace`, and `TempWorkspace` remain valid domain objects, but their constructors/creation paths create metadata plus a lazy capability container only. FileExplorer creation must happen through an explicit file-explorer-named method such as `workspace.acquireFileExplorer(reason)`.
- REQ-040: API/schema names may remain `createWorkspace`, `workspaces`, or `WorkspaceInfo` only if the payload is metadata-only and the contract is documented accordingly. Any tree-bearing field such as `WorkspaceInfo.fileExplorer` must move to file-explorer-specific state/query responses or be renamed to make the FileExplorer subject explicit.
- REQ-041: File search/indexing belongs to FileExplorer. Workspace-level APIs must not expose `searchFiles()` as a general workspace capability unless the implementation internally acquires FileExplorer through the explicit file-explorer path and the API is classified as a file-explorer consumer.
- REQ-042: Existing callers that only need `workspaceId`, display name, or root path—history, terminal, runtime cwd resolution, run/team config, resume/rerun, and sidebars—must continue to use workspace APIs cheaply without paying FileExplorer initialization cost.

Additional acceptance criteria:

- AC-039: Existing `WorkspaceManager.createWorkspace()` and `getOrCreateWorkspace()` callers that only read metadata/root path still work after the refactor and do not observe or require file tree data.
- AC-040: No new steady-state manager/facade duplicates `WorkspaceManager` ownership of workspace metadata; implementation review shows one authoritative workspace boundary.
- AC-041: GraphQL/API responses for general workspace creation/listing contain metadata fields only; no shallow tree payload is emitted from the workspace converter.
- AC-042: FileExplorer consumers are identifiable by explicit acquisition calls or file-explorer-specific resolver/session entrypoints; no caller relies on workspace creation side effects to obtain tree/search state.
- AC-043: Workspace constructor/creation tests assert that `FileExplorer`, `FileNameIndexer`, search strategy, tree snapshot, and watcher state are absent until a file-explorer consumer acquires them.
- AC-044: File search validation proves search creation/use occurs under FileExplorer ownership and not during workspace creation/listing/history/terminal/runtime flows.

Round 7 coverage additions:

- REQ-037 -> UC-015, UC-016, UC-017
- REQ-038 -> UC-015, UC-017
- REQ-039 -> UC-015, UC-016
- REQ-040 -> UC-015, UC-016
- REQ-041 -> UC-016
- REQ-042 -> UC-017
- AC-039 -> verifies API-preserving metadata-only workspace semantics.
- AC-040 -> verifies the authoritative workspace boundary is preserved instead of replaced by a parallel manager.
- AC-041 -> verifies workspace API payload cleanup.
- AC-042 -> verifies explicit FileExplorer acquisition boundaries.
- AC-043 -> verifies workspace creation has no FileExplorer side effects.
- AC-044 -> verifies search/index ownership belongs to FileExplorer.


## Round 8 Requirement Revision: WorkspaceFileExplorer Capability And WorkspaceFileExplorerTree Projection

User further clarified on 2026-05-23 that the target should make the file-explorer subject explicit on both backend and frontend. The system should not merely move index/tree/search/watcher fields from `Workspace` into one overgrown generic `FileExplorer`. Instead, the target concept is:

```text
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer capability
WorkspaceFileExplorer = tree state + search/index + file operations + watcher/live lifecycle
WorkspaceFileExplorerTree = serializable/UI projection of the loaded file tree
```

Additional/clarified requirements:

- REQ-043: Backend `Workspace` must own at most an optional lazy `WorkspaceFileExplorer` capability, not eager file tree/search/watcher state. The capability must not be constructed during `WorkspaceManager.createWorkspace()`, `getOrCreateWorkspace()`, `ensureWorkspaceByRootPath()`, workspace listing, history hydration, Terminal opening, or runtime cwd resolution.
- REQ-044: Backend `WorkspaceFileExplorer` must be the explicit owner of file-tree state, folder children loading, `FileNameIndexer`, file search, file read/write/move/delete/create operations for file-explorer consumers, watcher lease lifecycle, and live file update fanout.
- REQ-045: Backend `WorkspaceFileExplorer` may be internally decomposed into concrete owned collaborators such as `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, and `WorkspaceFileWatcherLeaseManager`; these collaborators must remain internal to the WorkspaceFileExplorer capability boundary and must not become a speculative `BaseFileExplorer`/`LocalFileExplorer` abstraction stack.
- REQ-046: API responses that send tree data to the frontend must use file-explorer-specific DTO/projection shapes such as `WorkspaceFileExplorerTree`, `WorkspaceFileTreeNode`, `WorkspaceFolderChildrenResult`, or equivalent. General `WorkspaceMetadata`/workspace list/create responses must never carry tree data.
- REQ-047: Frontend `workspaceStore` must own only `WorkspaceMetadata` and workspace selection metadata. Frontend file tree, loaded folder children, expanded folders, open file state, search results, loading/error status, and live stream status must be owned by a FileExplorer-specific store/state keyed by `workspaceId`.
- REQ-048: Naming in the target design and implementation should make the subject clear: `WorkspaceMetadata` answers “what workspace is this?”, `WorkspaceFileExplorer` answers “how do we browse/search/mutate/watch this workspace’s files?”, and `WorkspaceFileExplorerTree` answers “what file tree projection is currently loaded for UI display?”.

Additional acceptance criteria:

- AC-045: Backend code review/build checks show tree/search/index/file-operation/watcher fields are not stored directly on `Workspace`/`FileSystemWorkspace`; they live under `WorkspaceFileExplorer` or its internal collaborators.
- AC-046: Backend tests prove `WorkspaceFileExplorer` is constructed only by explicit acquisition from file-explorer consumers and not by workspace metadata creation/list/history/Terminal/runtime paths.
- AC-047: Backend tests or static checks prove `WorkspaceFileTreeState`, search/index, operations, and watcher lease manager are internal to the `WorkspaceFileExplorer` capability and are not accessed directly by non-file-explorer consumers.
- AC-048: GraphQL/API schema review shows workspace metadata responses and file-explorer tree responses are separate shapes; no `WorkspaceMetadata`/general workspace type includes a tree payload.
- AC-049: Frontend tests prove tree/search/open-file/loading/live-stream state is stored in FileExplorer-specific state keyed by `workspaceId`, while `workspaceStore` remains metadata-only.
- AC-050: Data-flow validation for history, terminal, runtime, and sidebars shows no dependency on `WorkspaceFileExplorerTree` or `WorkspaceFileExplorer` state.

Round 8 coverage additions:

- REQ-043 -> UC-015, UC-016, UC-017
- REQ-044 -> UC-016
- REQ-045 -> UC-016
- REQ-046 -> UC-016
- REQ-047 -> UC-015, UC-016, UC-017
- REQ-048 -> UC-015, UC-016, UC-017
- AC-045 -> verifies backend ownership separation.
- AC-046 -> verifies lazy capability construction.
- AC-047 -> verifies internal collaborator boundaries.
- AC-048 -> verifies API DTO/projection split.
- AC-049 -> verifies frontend store/state split.
- AC-050 -> verifies non-file-explorer flows stay metadata/root-path only.
