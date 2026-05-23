# Design Impact Rework: Lazy Historical Workspace Materialization And Root-Path Terminal

Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
Date: 2026-05-22
Last updated: 2026-05-23
Status: Ready for user review after AR-007 full-spec reconciliation; architecture resend is intentionally paused until user approval

## Trigger

During delivery validation of the current-ticket packaged Electron build, the user observed that opening historical run rows was very slow. The user clarified this blocks release of the current ticket; it is not a follow-up.

During subsequent validation on 2026-05-23, the user observed that opening the `Terminal` tab can also be slow. Code inspection confirmed Terminal is still using the old materialized-workspace path. This is part of the same release blocker because the current ticket is not releasable if history rows are fast but Terminal still materializes/scans workspace state just to obtain cwd.

## Historical Run Finding

History-run opening currently requires eager workspace materialization:

```text
openHistoricalRun
-> openAgentRun
-> loadRunContextHydrationPayload
-> ensureWorkspaceByRootPath(workspaceRootPath)
-> workspaceStore.createWorkspace / backend WorkspaceManager.createWorkspace
-> FileSystemWorkspace.initialize
-> buildWorkspaceDirectoryTree(1)
```

This is unnecessary for read-only history viewing because run history already stores `workspaceRootPath` in the resume metadata.

## Terminal Finding

Terminal opening currently requires the same materialized-workspace boundary:

```text
Terminal.vue connectTerminal()
-> ensureWorkspaceForTerminal()
-> workspaceStore.ensureWorkspaceInitialized(reference)
-> workspaceStore.createWorkspace({ root_path })
-> backend WorkspaceManager.createWorkspace()
-> FileSystemWorkspace.initialize()
-> useTerminalSession.connect(workspaceId)
-> /ws/terminal/:workspaceId/:sessionId
-> workspaceManager.getWorkspaceById(workspaceId).getBasePath()
-> PtySessionManager.start(cwd)
```

This is unnecessary because Terminal only needs a validated cwd/root path, not `WorkspaceInfo.fileExplorer`, folder children, search index, live file-explorer streams, or watcher leases.

## Same-Ticket Design Decision

Fold lazy historical workspace materialization and Terminal root-path sessions into the current EBADF/file-explorer lifecycle ticket:

- Historical run viewing uses canonical `workspaceRootPath` and a cheap `WorkspaceReference`.
- Cheap reference resolution may derive deterministic `workspaceId` and display name but must not initialize `FileSystemWorkspace` or build file trees.
- Files, context picker file browsing, and similar file-tree actions explicitly materialize/initialize workspace at their own action boundary.
- Terminal and resume/rerun use `workspaceReference.workspaceRootPath` directly as cwd/launch root unless a future runtime path truly requires file-tree state.
- Missing/inaccessible workspace paths do not block viewing stored history; errors surface when the user requests the current workspace functionality that needs the path.

## Updated Artifacts

- Requirements updated with UC-009 through UC-014, REQ-014 through REQ-029, and AC-016 through AC-031.
- Investigation notes updated with code-path evidence and root-cause refinement for watcher descriptors, lazy history, historical teams, Terminal root-path sessions, mobile Terminal target derivation, and Terminal pending-connect cleanup.
- Design spec updated with DS-008 through DS-014, workspace reference/materialization ownership, Terminal root-path ownership, mobile Terminal target ownership, Terminal pending-cleanup ownership, removal plan, file mappings, dependency rules, interface mappings, migration sequence, and validation plan.
- Root-cause report updated with the same release-blocking refinements.

## Round 3 Design-Impact Revision

Architecture review round 3 accepted the lazy-history direction but required two concrete design additions before implementation rework:

1. `WorkspaceReference` must be integrated into the real run/team config and context data model.
2. Historical team/member hydration must be designed through its actual code path instead of covered only by a validation bullet.

Updated same-ticket target:

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` mean deterministic workspace reference id only; they are not proof of an initialized `WorkspaceInfo`.
- `AgentRunConfig` and `TeamRunConfig` carry `workspaceReference` as the root-path/display companion.
- `WorkspaceStore` owns `workspaceReferencesById`, materialization state, `activeWorkspaceReference`, and initialized `workspaces`; `activeWorkspace` stays initialized-only.
- Historical team hydration splits live member materialization from historical member shell/reference building.
- Team historical open builds `primaryWorkspaceReference` and `memberWorkspaceReferencesByRouteKey`; it does not call `ensureWorkspaceByRootPath()` for every member.
- Focused/sibling historical team projection hydration remains projection-only. Files/context file-tree actions materialize the focused member reference when the user actually requests file-tree functionality; Terminal uses the focused member reference root path directly.

## Terminal Root-Path Revision

The 2026-05-23 design revision adds DS-012:

- `Terminal.vue` resolves the active/focused `WorkspaceReference` and passes `{ workspaceRootPath, workspaceId? }` to `useTerminalSession`.
- `useTerminalSession.ts` builds an authenticated terminal WebSocket from the root-path terminal target, not from an initialized workspace-id-only target.
- `api/websocket/terminal.ts` authorizes, canonicalizes, and validates cwd/root path with lightweight filesystem checks, then calls `TerminalHandler.connect()` with cwd.
- `TerminalHandler` / `PtySessionManager` start PTY sessions from validated cwd and optional workspace grouping metadata; they do not call `WorkspaceManager.createWorkspace()`, `WorkspaceManager.getOrCreateWorkspace()`, `FileSystemWorkspace.initialize()`, file explorer APIs, or watcher APIs for ordinary filesystem workspaces.
- The Terminal UI reports connection/loading/errors from Terminal session state, not from workspace materialization state, and does not display `Connected` before the WebSocket is actually open.

## Round 5 Design-Impact Revision: Mobile Terminal And Terminal Cleanup

Architecture review round 5 accepted the desktop/root-path Terminal direction but found two remaining same-ticket design gaps:

1. `MobileTools.vue` is a second Terminal surface and still uses the old initialized `WorkspaceInfo` path (`workspaceFromContext` -> `terminalWorkspaceId` -> `<Terminal :workspace-id>`).
2. `api/websocket/terminal.ts` has a close-before-connect race analogous to the file-explorer route; close/error cleanup must handle the period before `connectedSessionId` is assigned and must clean up late/partial PTY sessions.

Updated same-ticket target:

- Mobile Tools computes `TerminalTarget` from `MobileWorkContext` root-path fields and already-hydrated focused member `WorkspaceReference` when available.
- Mobile Tools must not call `workspaceStore.createWorkspace()`, `ensureWorkspaceInitialized()`, or search `workspaceStore.allWorkspaces` as a gate to open Terminal.
- `Terminal.vue` accepts root-path `TerminalTarget` from mobile and desktop/focused-run contexts; initialized `workspaceId` is not the required Terminal contract for ordinary filesystem workspaces.
- Terminal route cleanup tracks `closed`, `cleanupStarted`, `connectPromise`, `connectedSessionId`, and pending messages, registers cleanup before auth/connect, disconnects late returned session ids, and clears queued input on early close.
- Terminal handler/session manager cleanup closes any PTY session created before a setup failure, so `PtySessionManager.sessionCount` returns to baseline after early close or setup failure validation.

## Round 6 Design-Impact Revision: WorkspaceMetadata And Single Lazy FileExplorer

The user clarified a cleaner target architecture before architecture review resend:

- `WorkspaceReference` should be renamed/recast to `WorkspaceMetadata` because the object is cheap metadata, not a live reference/handle.
- Workspace may conceptually contain a FileExplorer, but FileExplorer is an optional lazy capability and is never created by `createWorkspace()` / `getOrCreateWorkspace()`.
- The backend has only one local filesystem FileExplorer; remove `BaseFileExplorer` and `LocalFileExplorer` and keep one concrete `FileExplorer` owner.
- File search belongs to FileExplorer, not Workspace.

Updated same-ticket target:

- Workspace metadata creation/list/config/history/runtime paths are metadata-only.
- FileExplorer is created/acquired only by desktop Files, mobile Files, skill file explorer, context file browser/search/read/write, and live file-explorer WebSocket.
- Agent runtime, Codex/Claude/AutoByteus cwd resolution, Terminal, history, resume, and rerun are forbidden from acquiring FileExplorer.
- Design spec now includes a canonical data-flow span table for every major case and marks whether FileExplorer can be created.


## Round 7 Design-Impact Revision: API-Preserving Workspace Semantics

The user clarified that the existing high-level workspace APIs are mostly good and should not be discarded simply because their current implementation is too eager.

Updated same-ticket target:

- Keep `WorkspaceManager` as the authoritative owner of workspace objects/metadata.
- Keep `createWorkspace()` / `getOrCreateWorkspace()` names where practical, but change their contract to metadata-only workspace creation/resolution.
- Keep `Workspace`, `FileSystemWorkspace`, `SkillWorkspace`, and `TempWorkspace` as domain concepts, but make them cheap metadata plus lazy capability containers.
- Move `FileNameIndexer`, file search, tree snapshot, file operations, and watcher leases under the single concrete `FileExplorer` owner.
- Replace implicit `workspace.getFileExplorer()` side effects with explicit file-explorer acquisition from file-explorer consumers.
- Do not introduce a steady-state `WorkspaceMetadataManager`; that would split ownership and weaken the existing workspace boundary.

The design spec now treats API preservation as a deliberate implementation strategy: a moderate refactor that corrects semantics and ownership without a greenfield rename of otherwise good product APIs.


## Round 8 Design-Impact Revision: WorkspaceFileExplorer And Tree Projection Split

The user proposed naming the lazy file capability and tree projection explicitly so the architecture does not merely move old workspace-owned state into an unclear generic file explorer.

Updated same-ticket target:

- Backend `Workspace` is `WorkspaceMetadata` plus optional lazy `WorkspaceFileExplorer` capability.
- Backend `WorkspaceFileExplorer` owns tree state, folder loading, file search/index, file operations, watcher leases, and live update fanout.
- Backend `WorkspaceFileExplorer` may decompose internally into `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, and `WorkspaceFileWatcherLeaseManager` to avoid becoming bloated.
- `BaseFileExplorer`/`LocalFileExplorer` remain out of scope as steady-state abstractions; there is one local filesystem capability boundary, not a speculative hierarchy.
- API/frontend tree payloads use a separate file-explorer projection such as `WorkspaceFileExplorerTree`; workspace metadata responses remain tree-free.
- Frontend `workspaceStore` holds `WorkspaceMetadata`; frontend FileExplorer-specific state holds `WorkspaceFileExplorerTree`, folder/search/open-file/loading/live-stream state by `workspaceId`.

This is the clean concept separation the implementation should follow before the ticket returns to architecture review.


## AR-007 Design-Spec Reconciliation

Architecture review round 6 accepted the Round 8 concept but failed the artifact because earlier sections still presented superseded names and ownership as final target guidance. The design spec has now been rewritten from `## Intended Change` onward to make Round 8 the only authoritative target.

Reconciled steady-state target:

- `WorkspaceManager` remains the authoritative workspace metadata/object owner.
- `Workspace` is `WorkspaceMetadata` plus optional lazy `WorkspaceFileExplorer` capability.
- `WorkspaceFileExplorer` owns tree state, folder loading, search/index, file operations, watcher leases, and live update fanout through internal collaborators.
- `WorkspaceFileExplorerTree` and related file-explorer DTOs carry tree/search/file projections to the frontend.
- Frontend `workspaceStore` is metadata-only; FileExplorer-specific state owns tree/search/open-file/loading/live-stream data by `workspaceId`.
- `WorkspaceReference`, `WorkspaceActivationState`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, and `ensureWorkspaceInitialized(reference)` are now explicitly legacy/current-state or temporary migration names only.
