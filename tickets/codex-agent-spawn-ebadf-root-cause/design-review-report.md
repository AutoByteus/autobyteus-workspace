# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Upstream Root-Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Upstream Same-Ticket Design-Impact Rework Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Current Review Round: 10, reviewing the Round 11 FileExplorer close/quiescence design revision
- Trigger: Full fresh architecture review after the user clarified that FileExplorer and Terminal are distinct features and the design was revised so FileExplorer inactive/final visible-consumer release is a first-class quiescence boundary.
- Prior Review Round Reviewed: 9
- Latest Authoritative Round: 10
- Current-State Evidence Basis: Reloaded the `architecture-reviewer` skill and design principles for this review; reread the current requirements, investigation notes, design spec, root-cause report, design-impact rework artifact, prior design-review report, and downstream validation context. Independently inspected current Round 11-relevant code in `autobyteus-web/components/layout/RightSideTabs.vue`, `FileExplorerLayout.vue`, `FileExplorer.vue`, `FileExplorerTabs.vue`, `FileItem.vue`, `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts`, `autobyteus-web/stores/fileExplorerTreeActions.ts`, `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts`, `autobyteus-server-ts/src/file-explorer/file-explorer.ts`, and `autobyteus-server-ts/src/file-explorer/directory-traversal.ts`.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial watcher lifecycle design review | N/A | 2 | Fail | No | AR-001 mobile hidden `RightSideTabs` path and AR-002 pending WebSocket close race required design updates. |
| 2 | Retry after revised watcher/visibility design | AR-001, AR-002 | 0 | Pass | No | Watcher ownership, mobile visibility, and file-explorer pending WebSocket cleanup were ready. |
| 3 | Late same-ticket history-open lazy workspace design-impact rework | AR-001, AR-002 | 2 | Fail | No | Lazy-history direction was sound, but config data-model and historical team hydration flow were underspecified. |
| 4 | Fresh review after AR-003/AR-004 revisions | AR-001, AR-002, AR-003, AR-004 | 0 | Pass | No | Revised lazy-history design was ready before the Terminal release blocker was found. |
| 5 | Superseding Terminal root-path/cwd design-impact revision | AR-001..AR-004 | 2 | Fail | No | Desktop Terminal direction was sound, but mobile Terminal and Terminal pending-connect cleanup were omitted. |
| 6 | Fresh full review of user-approved Round 8 WorkspaceMetadata / WorkspaceFileExplorer concept separation | AR-001..AR-006 | 1 | Fail | No | Round 8 concept was sound, but the design spec still contained contradictory pre-Round-8 authoritative sections. |
| 7 | AR-007 reconciliation review | AR-007 plus AR-001..AR-006 | 0 | Pass | No | The spec was internally consistent and implementation-ready for the Round 8 workspace/file-explorer split. |
| 8 | API/E2E Round 9 `E2E-TERMFD-002` Terminal descriptor lifecycle design-impact rework | AR-001..AR-007 | 0 | Pass | No | Round 9 added the missing normal-session Terminal descriptor-clean close invariant, owner split, rejection of fd-limit/session-count-only fixes, and descriptor-level validation. |
| 9 | Round 10 Files-to-Terminal responsiveness revision | AR-001..AR-007 plus `E2E-TERMFD-002` | 0 | Pass | No | Round 10 introduced lazy-before-first-use / cached-inactive Files behavior, but the user later clarified the real symptom is backend shell readiness, not just local first paint. |
| 10 | Round 11 FileExplorer inactive close/quiescence revision | AR-001..AR-007 plus Round 9/10 lifecycle findings | 0 | Pass | Yes | Round 11 completes the FileExplorer close contract: inactive means no live WS/watcher, no active snapshot/folder/search work, no active global listeners, no stale late mutations, bounded backend folder projection, and no Terminal/FileExplorer coupling. |

## Reviewed Design Spec

The reconciled Round 11 design is architecture-ready.

The previously accepted steady-state model remains intact:

```text
WorkspaceMetadata
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer
WorkspaceFileExplorer = tree/search/operation/watcher capability boundary
WorkspaceFileExplorerTree = file-explorer API/frontend projection
```

Round 11 correctly treats the latest release blocker as a FileExplorer lifecycle/resource problem, not as a reason to couple Terminal to FileExplorer. The design preserves these separate spines:

```text
Terminal = WorkspaceMetadata.rootPath -> TerminalTarget -> Terminal WS -> PTY
FileExplorer = visible Files/skill/context surface -> WorkspaceFileExplorer -> tree/search/ops/watcher
FileExplorer close = active=false/final consumer release -> abort/generation-suppress refresh/search -> release live WS/watcher -> quiesced inert cache
```

The design now distinguishes three things that must not be conflated:

- `FileExplorer` component existence/cache is not live resource ownership.
- Browser WebSocket open or local xterm text is not backend PTY readiness or first shell output.
- Terminal root-path readiness must not wait on FileExplorer tree teardown, watcher cleanup, folder refresh, or search work.

Current code evidence supports the problem statement: Files can be cached after first selection, but current file-explorer live actions still start snapshot refreshes without generation/abort ownership; `fetchFolderChildren()` uses a network-only GraphQL query with no abort/generation guard before `replaceFolderChildren`; backend `folderChildren()` can call `buildWorkspaceDirectoryTree()` as a normal fallback; and directory traversal can perform broad filesystem work. Round 11 addresses those exact gaps by requiring FileExplorer active/inactive generation ownership, abortable or generation-suppressed folder/search responses, explicit listener suspension, observable live/watcher cleanup, and bounded/lazy/cancellable backend folder projection under `WorkspaceFileExplorer`.

This is the correct architectural split: FileExplorer must quiesce itself when hidden or fully released, while Terminal stays root-path-only and never asks FileExplorer whether it is clean.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design states same-ticket release-blocking scope across original watcher descriptor pressure, lazy history, root-path Terminal, Terminal descriptor cleanup, Files-to-Terminal shell readiness, and Round 11 FileExplorer inactive quiescence. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Requirements, investigation notes, root-cause report, and DS-014/DS-015 distinguish direct Terminal/FileExplorer dependencies from shared-process resource overlap caused by hidden FileExplorer work. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor remains required now; the user explicitly rejected follow-up handling while the packaged build remains unreleasable. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-006/DS-007, DS-014, DS-015, interface mapping, file responsibility mapping, dependency rules, route/handler cleanup contracts, migration steps 13-15/17/22, and validation AC-064..AC-068 all support the decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved and preserved | Dedicated mobile explorer remains the only mobile file-explorer live surface; mobile tools `RightSideTabs` must suppress Files. | No reopened issue. |
| 1 | AR-002 | Medium | Resolved and preserved | File-explorer route pending cleanup and stream/session lease cleanup remain in the cleanup contracts. | No reopened issue. |
| 3 | AR-003 | High | Resolved and superseded by Round 8 | Cheap workspace identity/display is `WorkspaceMetadata`; `WorkspaceReference` is legacy/migration-only. | No reopened issue. |
| 3 | AR-004 | High | Resolved and preserved | Historical team/member hydration uses metadata/member shells and avoids eager member workspace materialization. | No reopened issue. |
| 5 | AR-005 | High | Resolved and preserved | Mobile Tools Terminal remains root-path `TerminalTarget` based, not initialized-workspace-gated. | No reopened issue. |
| 5 | AR-006 | High | Resolved and preserved | Terminal WebSocket pending-connect cleanup remains explicit. | No reopened issue. |
| 6 | AR-007 | High | Resolved and preserved | The design spec retains one authoritative Round 8 workspace/file-explorer target and labels old terms as legacy/migration-only. | No reopened contradiction. |
| API/E2E 9 | E2E-TERMFD-002 | Release-blocking validation failure | Still incorporated | DS-013 and validation requirements still require descriptor-level proof after normal command-output Terminal sessions. | Implementation/API-E2E must still prove this. |
| 9 review | Files-to-Terminal latency | Release-blocking design-impact revision | Refined by Round 11 | Round 10 first-paint design is now tightened to backend shell-readiness and FileExplorer quiescence requirements. | No design gap remains. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace metadata create/list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone historical run open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team historical run/member focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Agent/runtime cwd | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Terminal desktop/mobile root-path open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006/DS-007 | Files open/close | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Skill file explorer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Context browser/search/read/write | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | File-explorer live updates | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | File-explorer pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 | Terminal pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-013 | Terminal normal-session descriptor cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-014 | Desktop Files -> Terminal shell readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-015 | FileExplorer inactive quiescence | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` / `Workspace` metadata boundary | Pass | Pass | Pass | Pass | Existing domain API remains, with metadata-only semantics. |
| Backend `WorkspaceFileExplorer` capability | Pass | Pass | Pass | Pass | Owns tree/search/ops/watcher and now bounded folder projection/quiescence implications. |
| Internal file-explorer collaborators | Pass | Pass | Pass | Pass | `WorkspaceFileTreeState`, search, operations, and watcher lease manager stay internal. |
| Frontend `workspaceStore` | Pass | Pass | Pass | Pass | Metadata-only owner; no tree/search/live stream state. |
| Frontend `fileExplorerStore` | Pass | Pass | Pass | Pass | Correct owner for tree/open/search/loading/live/cache state and generation-guarded mutation. |
| Right-side tab lifecycle | Pass | Pass | Pass | Pass | Correct owner for lazy-before-first-use and cached-inactive Files body, not Terminal. |
| FileExplorer visible/quiescence lifecycle | Pass | Pass | Pass | Pass | Correct owner for active generation, abort controllers, live consumer release, and listener suspension. |
| Terminal route/handler/manager/session | Pass | Pass | Pass | Pass | Terminal remains root-path/PTY-only and descriptor-clean. |
| History/team/runtime cwd paths | Pass | Pass | Pass | Pass | Metadata/root-path only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceMetadata` | Pass | Pass | Pass | Pass | Stable workspace identity/root/display/kind, not a live handle. |
| `WorkspaceFileExplorerTree` / folder projection DTOs | Pass | Pass | Pass | Pass | File-explorer-specific API/frontend projection. |
| FileExplorer active generation / abort lifecycle | Pass | N/A | Pass | Pass | Owned by FileExplorer visible lifecycle/live actions, not global workspace state. |
| `WorkspaceFileTreeState` | Pass | Pass | Pass | Pass | Internal owner for loaded folder/cache state. |
| `WorkspaceFileSearchIndex` | Pass | Pass | Pass | Pass | Internal owner for filename index/search refresh. |
| `WorkspaceFileOperations` | Pass | Pass | Pass | Pass | Internal owner for local file operations. |
| `WorkspaceFileWatcherLeaseManager` | Pass | Pass | Pass | Pass | Internal owner for lease counts and watcher close. |
| `TerminalTarget` | Pass | Pass | Pass | Pass | Root-path/cwd input shared across desktop/mobile Terminal. |
| Terminal readiness timing/status | Pass | N/A | Pass | Pass | Belongs to Terminal transport/session path, not FileExplorer. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkspaceMetadata` | Pass | Pass | Pass | Pass | Pass | No tree/search/watcher/loading fields. |
| `Workspace` | Pass | Pass | Pass | Pass | Pass | Metadata plus optional lazy capability. |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Pass | One workspace-scoped file capability. |
| `WorkspaceFileExplorerTree` / `WorkspaceFolderChildrenResult` | Pass | Pass | Pass | Pass | Pass | File-explorer projection only. |
| FileExplorer active/cache/quiescence state | Pass | Pass | Pass | N/A | Pass | Cache existence, active visibility, and live resource ownership are distinct. |
| `TerminalTarget` | Pass | Pass | Pass | N/A | Pass | Root-path target, not initialized workspace proof. |
| Terminal backend readiness / first output | Pass | Pass | Pass | N/A | Pass | Explicitly separate from WebSocket open/local xterm initialization. |
| Legacy `WorkspaceReference` / `WorkspaceActivationState` aliases | Pass | Pass | Pass | N/A | Pass | Legacy/current-state or migration-only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Auto file-explorer streams from workspace create/fetch/register | Pass | Pass | Pass | Pass | Replaced by visible file-explorer consumers. |
| Tree-bearing general `WorkspaceInfo` / workspace responses | Pass | Pass | Pass | Pass | Replaced by metadata responses plus file-explorer DTOs. |
| Frontend `workspaceStore` tree/search/open/live ownership | Pass | Pass | Pass | Pass | Replaced by `fileExplorerStore`. |
| Eager `FileSystemWorkspace.initialize()` tree/index/search on create | Pass | Pass | Pass | Pass | Replaced by metadata-only creation and lazy acquisition. |
| Public/general workspace file-explorer bypass paths | Pass | Pass | Pass | Pass | Replaced by `Workspace.acquireFileExplorer(reason)`. |
| `BaseFileExplorer` / `LocalFileExplorer` stack | Pass | Pass | Pass | Pass | Collapsed into `WorkspaceFileExplorer`. |
| Terminal workspace-id/materialized-workspace route | Pass | Pass | Pass | Pass | Replaced by root-path `TerminalTarget`. |
| Historical/team eager materialization | Pass | Pass | Pass | Pass | Replaced by metadata shells/projections. |
| Terminal session-count-only close success | Pass | Pass | Pass | Pass | Replaced by descriptor-clean close acceptance. |
| Mount-only hidden FileExplorer live/listener lifecycle | Pass | Pass | Pass | Pass | Replaced by active/quiescence lifecycle. |
| Unbounded full-tree rebuild as ordinary `folderChildren` path | Pass | Pass | Pass | Pass | Replaced by bounded/lazy/cancellable FileExplorer-owned folder projection. |
| Stale late folder/search mutation after inactive | Pass | Pass | Pass | Pass | Replaced by abort/generation checks. |
| Hidden live Terminal sessions as tab-switch optimization | Pass | Pass | Pass | Pass | Explicitly rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Pass | Pass | Pass | Pass | Metadata registry/id mapping/create/get/list owner. |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Pass | Pass | Pass | Pass | Metadata-bearing workspace plus lazy `WorkspaceFileExplorer` slot. |
| `autobyteus-server-ts/src/workspaces/skill-workspace.ts` / `temp-workspace.ts` | Pass | Pass | Pass | Pass | Metadata specialization only. |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` or renamed equivalent | Pass | Pass | Pass | Pass | Workspace file capability owner; must expose bounded/lazy folder projection and watcher lease cleanup. |
| `workspace-file-tree-state.ts` | Pass | Pass | Pass | Pass | Internal folder/tree projection owner. |
| `workspace-file-search-index.ts` | Pass | Pass | Pass | Pass | Internal search/index refresh owner. |
| `workspace-file-operations.ts` | Pass | Pass | Pass | Pass | Internal validated file operation owner. |
| `workspace-file-watcher-lease-manager.ts` | Pass | Pass | Pass | Pass | Internal watcher lifecycle owner with observable close. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` / converter | Pass | Pass | Pass | Pass | Metadata-only API/conversion. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Pass | Pass | Pass | Pass | File-explorer resolvers; `folderChildren` must not normal-path full rebuild. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Pass | Pass | Pass | Pass | Route-level pending cleanup and session disconnect boundary. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Pass | Pass | Pass | Pass | Root-path cwd validation, Terminal WS lifecycle, no FileExplorer call. |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Pass | Pass | N/A | Pass | Read-loop/session attach-detach owner. |
| `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | Pass | Pass | N/A | Pass | Registry and close orchestration; must await low-level close. |
| `autobyteus-ts/src/tools/terminal/pty-session.ts` or selected Terminal backend | Pass | Pass | N/A | Pass | Low-level PTY child/descriptor/listener/read/timer cleanup owner. |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Pass | Pass | Metadata-only store. |
| `autobyteus-web/stores/fileExplorer.ts` | Pass | Pass | Pass | Pass | Tree/search/open-file/live/loading/cache state owner. |
| `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts` | Pass | Pass | N/A | Pass | Visible consumer acquire/release plus snapshot refresh generation/abort timing owner. |
| `autobyteus-web/stores/fileExplorerTreeActions.ts` | Pass | Pass | N/A | Pass | FolderChildren request/result application must be abort/generation guarded. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Pass | Pass | N/A | Pass | Right-tab cache/active policy; no Terminal/FileExplorer coordinator role. |
| `autobyteus-web/components/fileExplorer/FileExplorerLayout.vue` | Pass | Pass | N/A | Pass | Passes active boundary into tree and tabs. |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Pass | Pass | Pass | Pass | Visible FileExplorer lifecycle owner: acquire/release, abort/generation, listener suspension. |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | Pass | Pass | N/A | Pass | Active-state-gated global input/editor/viewer behavior. |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | Pass | Pass | N/A | Pass | Recursive node UI; per-node global listeners must be inactive-safe or consolidated. |
| `components/workspace/tools/Terminal.vue`, `MobileTools.vue`, `useTerminalSession.ts` | Pass | Pass | Pass | Pass | Root-path `TerminalTarget`; readiness state separate from local/socket-open state. |
| History/team hydration files | Pass | Pass | Pass | Pass | Metadata-only contexts/shells. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace metadata consumers | Pass | Pass | Pass | Pass | Metadata/root path only. |
| File-explorer consumers | Pass | Pass | Pass | Pass | Acquire `WorkspaceFileExplorer` only through visible file-explorer paths. |
| `WorkspaceFileExplorer` internals | Pass | Pass | Pass | Pass | Internal collaborators not public bypasses. |
| FileExplorer visible/quiescence lifecycle | Pass | Pass | Pass | Pass | Active state owns generation/abort/listener/live resource lifecycle. |
| Right-side tab lifecycle | Pass | Pass | Pass | Pass | May cache Files UI, but cache must be inert while inactive. |
| Terminal/runtime/history paths | Pass | Pass | Pass | Pass | Must not import/call FileExplorer, folder tree APIs, watcher status, or quiescence state. |
| Terminal route/handler/manager/session | Pass | Pass | Pass | Pass | May depend only on cwd validation and PTY services. |
| Backend folder projection | Pass | Pass | Pass | Pass | `folderChildren` remains under FileExplorer and must be bounded/lazy/cancellable. |
| General workspace API responses | Pass | Pass | Pass | Pass | Tree/search/watcher/loading state forbidden. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` | Pass | Pass | Pass | Pass | No parallel metadata manager. |
| `Workspace` | Pass | Pass | Pass | Pass | Metadata plus lazy file-explorer capability. |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Internal tree/search/ops/watcher managers stay internal. |
| `workspaceStore` | Pass | Pass | Pass | Pass | Metadata-only frontend boundary. |
| `fileExplorerStore` | Pass | Pass | Pass | Pass | FileExplorer state/mutation owner. |
| FileExplorer visible/quiescence lifecycle | Pass | Pass | Pass | Pass | Hidden cleanup lives with FileExplorer, not Terminal. |
| File-explorer WS route/handler | Pass | Pass | Pass | Pass | Pending route cleanup and session/lease cleanup are separated. |
| Terminal route | Pass | Pass | Pass | Pass | Root-path WS route, no FileExplorer dependency. |
| `TerminalHandler` / `PtySessionManager` / `TerminalSession` | Pass | Pass | Pass | Pass | Layered Terminal lifecycle remains clear. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager.createWorkspace(input)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceManager.getOrCreateWorkspace(idOrRoot)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceManager.ensureWorkspaceByRootPath(rootPath)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `createWorkspace` / `workspaces` / metadata resolver | Pass | Pass | Pass | Low | Pass |
| `Workspace.acquireFileExplorer(reason)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `folderChildren(workspaceId,path)` | Pass | Pass | Pass | Medium | Pass |
| File-explorer GraphQL search/read/write/move/delete | Pass | Pass | Pass | Low | Pass |
| File-explorer WebSocket | Pass | Pass | Pass | Low | Pass |
| FileExplorer active/quiesce lifecycle input | Pass | Pass | Pass | Low | Pass |
| RightSideTabs Files cache/active state | Pass | Pass | Pass | Low | Pass |
| Terminal WebSocket | Pass | Pass | Pass | Low | Pass |
| Terminal backend ready/status and first-output instrumentation | Pass | Pass | Pass | Low | Pass |
| `PtySessionManager.closeSession(sessionId)` | Pass | Pass | Pass | Low | Pass |
| `TerminalSession.close()` | Pass | Pass | Pass | Low | Pass |
| Run/team history hydration | Pass | Pass | Pass | Low | Pass |
| Runtime cwd resolver | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Workspace metadata/domain objects. |
| `autobyteus-server-ts/src/file-explorer` | Pass | Pass | Medium | Pass | Correct home for `WorkspaceFileExplorer` and internal collaborators. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Pass | Pass | Low | Pass | Metadata API boundary. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Pass | Pass | Low | Pass | FileExplorer API boundary including bounded folder projection. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Pass | Pass | Low | Pass | Live file updates/pending cleanup. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Pass | Pass | Low | Pass | Terminal WS route. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Pass | Pass | Low | Pass | Terminal handler/manager. |
| `autobyteus-ts/src/tools/terminal` | Pass | Pass | Low | Pass | Low-level TerminalSession backend. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Pass | Pass | Low | Pass | Right tab lifecycle owner. |
| `autobyteus-web/components/fileExplorer` | Pass | Pass | Low | Pass | FileExplorer UI active/quiescence owner. |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Low | Pass | Metadata store. |
| `autobyteus-web/stores/fileExplorer.ts` and file-explorer actions | Pass | Pass | Low | Pass | FileExplorer state/request owner. |
| Terminal frontend paths | Pass | Pass | Low | Pass | Root-path Terminal target/readiness owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace metadata and top-level API | Pass | Pass | N/A | Pass | Preserve `WorkspaceManager`/`Workspace` APIs with corrected semantics. |
| Workspace file browsing/search/mutation/watch | Pass | Pass | Pass | Pass | Existing file-explorer subsystem becomes `WorkspaceFileExplorer`; internal collaborators are justified. |
| FileExplorer quiescence | Pass | Pass | N/A | Pass | Extends existing FileExplorer components/stores/actions rather than adding a cross-feature coordinator. |
| Frontend metadata/file-explorer state split | Pass | Pass | N/A | Pass | Reuses `workspaceStore` and `fileExplorerStore` with clarified boundaries. |
| Right-side tab lifecycle | Pass | Pass | N/A | Pass | Extends `RightSideTabs.vue`; no new generic tab-cache subsystem needed. |
| Terminal/mobile tools | Pass | Pass | N/A | Pass | Existing Terminal surfaces become root-path/readiness-based. |
| Terminal low-level session backend | Pass | Pass | N/A | Pass | Reuses or changes close sequence/backend only as needed to satisfy descriptor contract. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceManager` API names | Yes, intentionally preserved | Pass | Pass | Preservation is semantic correction, not dual ownership. |
| `WorkspaceReference` / `WorkspaceActivationState` | Temporary only | Pass | Pass | Not steady-state target names. |
| `WorkspaceInfo` name | Temporary only if metadata-only | Pass | Pass | Tree-bearing payload forbidden. |
| `BaseFileExplorer` / `LocalFileExplorer` | No steady-state retention | Pass | Pass | Removed/collapsed. |
| Terminal workspace-id/materialized route | No steady-state retention | Pass | Pass | Root-path target replaces it. |
| History/team eager materialization | No steady-state retention | Pass | Pass | Metadata-only history replaces it. |
| Auto file-explorer live stream startup | No steady-state retention | Pass | Pass | Visible consumers replace it. |
| Terminal close success with retained PTY descriptors | No steady-state retention | Pass | Pass | Explicitly rejected. |
| Mount-only hidden FileExplorer lifecycle | No steady-state retention | Pass | Pass | Explicitly rejected by Round 11. |
| Unbounded ordinary `folderChildren` full-tree rebuild | No steady-state retention | Pass | Pass | Explicitly rejected for ordinary folder loads. |
| Hidden live Terminal sessions for tab-switch speed | No steady-state retention | Pass | Pass | Explicitly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Metadata-only workspace API | Pass | Pass | Pass | Pass |
| Lazy `WorkspaceFileExplorer` extraction | Pass | Pass | Pass | Pass |
| Internal collaborator extraction | Pass | Pass | Pass | Pass |
| API/DTO split | Pass | Pass | Pass | Pass |
| Frontend store split | Pass | Pass | Pass | Pass |
| Files/skill/context acquisition paths | Pass | Pass | Pass | Pass |
| Right-side Files cache/active lifecycle | Pass | Pass | Pass | Pass |
| FileExplorer abort/generation quiescence | Pass | Pass | Pass | Pass |
| Bounded/lazy backend folder projection | Pass | Pass | Pass | Pass |
| History/team/Terminal/runtime metadata-only paths | Pass | Pass | Pass | Pass |
| WebSocket pending cleanup validation | Pass | Pass | Pass | Pass |
| Terminal normal-session deep close | Pass | Pass | Pass | Pass |
| Temporary alias deletion | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Metadata-only create/list | Yes | Pass | Pass | Pass | DS-001 and invariant are clear. |
| Metadata-only history/team/runtime/Terminal | Yes | Pass | Pass | Pass | DS-002..DS-005 distinguish non-FileExplorer spans. |
| Files/skill/context acquisition | Yes | Pass | Pass | Pass | DS-006..DS-010 distinguish FileExplorer acquisition spans. |
| WebSocket pending cleanup | Yes | Pass | Pass | Pass | FileExplorer and Terminal cleanup contracts are concrete. |
| Terminal normal-session deep close | Yes | Pass | Pass | Pass | DS-013 separates socket/read-loop/manager/session/descriptor ownership. |
| Files-to-Terminal shell readiness | Yes | Pass | Pass | Pass | DS-014 separates local UI, backend PTY readiness, first shell output, and FileExplorer work. |
| FileExplorer inactive quiescence | Yes | Pass | Pass | Pass | DS-015 and the close path explicitly show generation invalidation, abort/suppression, watcher cleanup, and inert cache. |
| Legacy naming boundary | Yes | Pass | Pass | Pass | AR-007 note and terminology boundaries remain clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The design now covers original watcher descriptor pressure, metadata/FileExplorer separation, lazy history/team hydration, desktop/mobile root-path Terminal, FileExplorer visible consumers, skill/context FileExplorer, WS pending cleanup, Terminal descriptor-clean close, Files-to-Terminal shell readiness, and FileExplorer inactive quiescence. | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation rework.

## Findings

None.

## Classification

- Overall classification: N/A — no blocking design-review findings in round 10.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Client-side abort/generation suppression alone is not sufficient if backend `folderChildren()` still performs broad work after the user leaves Files. The design covers this by requiring bounded/lazy/cancellable backend folder projection; implementation and code review should verify the server path, not just the frontend stale-response guard.
- Terminal readiness must be measured from backend PTY ready and/or first real shell output, not from local xterm initialization or WebSocket `onopen`. UI wording and E2E timing must enforce that distinction.
- Round 9 Terminal descriptor validation remains required; manager-map cleanup, child-process count, or local UI close are not enough proof of OS descriptor cleanup.
- Files -> Terminal validation should record FileExplorer quiescence timing and Terminal PTY/first-output timing separately so failures are attributable rather than hidden behind a generic “Terminal slow” symptom.
- The branch is currently behind `origin/personal`; delivery must refresh/integrate before finalization as required by the team workflow.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The Round 11 FileExplorer close/quiescence refinement is consistent with the established `WorkspaceMetadata` / lazy `WorkspaceFileExplorer` / root-path Terminal / Terminal descriptor lifecycle architecture. It is concrete enough for implementation and validation, and it avoids introducing Terminal/FileExplorer coupling.
