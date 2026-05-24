# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Upstream Root-Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Upstream Same-Ticket Design-Impact Rework Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Current Review Round: 8
- Trigger: Architecture review after API/E2E Round 9 rerouted `E2E-TERMFD-002` for normal attached Terminal command-output sessions retaining `/dev/ptmx` / `(revoked)` descriptors after close.
- Prior Review Round Reviewed: 7
- Latest Authoritative Round: 8
- Current-State Evidence Basis: Reloaded the `architecture-reviewer` skill and design principles; reread the current requirements, investigation notes, design spec, root-cause report, design-impact rework artifact, previous review report, API/E2E Round 9 report, Terminal failure analysis, descriptor/timing JSON, final `lsof`, and current code paths. Independently inspected Terminal route/handler/manager/session ownership in `autobyteus-server-ts/src/api/websocket/terminal.ts`, `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`, `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`, `autobyteus-ts/src/tools/terminal/pty-session.ts`, `autobyteus-ts/src/tools/terminal/session-factory.ts`, and existing Terminal unit/E2E tests.

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
| 8 | API/E2E Round 9 `E2E-TERMFD-002` Terminal descriptor lifecycle design-impact rework | AR-001..AR-007 | 0 | Pass | Yes | Round 9 adds the missing normal-session Terminal descriptor-clean close invariant, owner split, rejection of fd-limit/session-count-only fixes, and descriptor-level validation. |

## Reviewed Design Spec

The revised design is architecture-ready.

The previously passed steady-state target remains authoritative:

```text
WorkspaceMetadata
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer
WorkspaceFileExplorer = internal tree/search/operation/watcher capability boundary
WorkspaceFileExplorerTree = file-explorer API/frontend projection
```

Round 9 adds a separate Terminal normal-session lifecycle invariant without weakening that target:

```text
Terminal close complete = socket cleanup + read-loop cleanup + manager removal + low-level PTY descriptor release
```

The addition is coherent because the new failure is not a workspace/file-explorer data-model problem and not a Terminal connect-latency problem. API/E2E evidence shows Terminal opens quickly but normal command-output close leaves Terminal-owned PTY descriptors after child processes and manager sessions are gone. The design therefore correctly extends Terminal lifecycle ownership instead of reopening workspace materialization or file-explorer watcher ownership.

Key readiness points:

- `WorkspaceManager` / `Workspace` remain metadata-oriented and file-explorer-lazy; history/runtime/Terminal paths still do not acquire `WorkspaceFileExplorer`.
- Desktop/mobile Terminal stay root-path/cwd features, not materialized-workspace or file-tree features.
- The Terminal route owns socket/pending-connect cleanup; `TerminalHandler` owns read-loop attach/detach; `PtySessionManager` owns registry close orchestration; `TerminalSession` in `autobyteus-ts` owns the PTY backend, child process, descriptors, disposables, pending reads/timers, and deep close semantics.
- The design distinguishes manager-map cleanup and child-process cleanup from descriptor cleanup, which is the precise gap exposed by `E2E-TERMFD-002`.
- The low-level file responsibility is mapped to `autobyteus-ts/src/tools/terminal/pty-session.ts` or a selected descriptor-safe `TerminalSession` backend. Because `autobyteus-server-ts` depends on `autobyteus-ts` as `workspace:*`, this is implementable in the current worktree/package boundary.
- The design explicitly rejects fd-limit increases, `PtySessionManager.sessionCount === 0`, and child-count-only checks as sufficient fixes.
- Validation now requires built-backend/macOS-realistic descriptor checks for normal attached command-output churn and avoids shell-echo false positives by requiring actual command output.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/design classify the ticket as bug fix + performance remediation + refactor; Round 9 explicitly adds normal Terminal descriptor lifecycle after API/E2E found `E2E-TERMFD-002`. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root-cause report states manager/session cleanup and child count cleanup are not equivalent to OS descriptor cleanup; investigation cites FD growth `37 -> 59` and final PTY/revoked descriptors after 8 normal sessions. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design keeps the previous workspace/file-explorer refactor and adds Terminal deep-close contract now because descriptor retention is release-blocking in the same ticket. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-013, ownership tables, interface mapping, file responsibility mapping, cleanup contracts, migration sequence, decommission plan, and validation plan all align to the Round 9 lifecycle invariant. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved and preserved | Design keeps dedicated mobile explorer as the only mobile file-explorer live surface and keeps mobile tools from rendering hidden Files. | No reopened issue. |
| 1 | AR-002 | Medium | Resolved and preserved | Design retains file-explorer route cleanup before async connect and handler/session lease cleanup. | No reopened issue. |
| 3 | AR-003 | High | Resolved and superseded by Round 8 | The cheap identity/display concept is now `WorkspaceMetadata`; old `WorkspaceReference` is migration/current-state only. | No reopened issue. |
| 3 | AR-004 | High | Resolved and preserved | Historical team hydration uses metadata/member shells and does not eagerly materialize every member workspace. | No reopened issue. |
| 5 | AR-005 | High | Resolved and preserved | `MobileTools.vue` / `MobileWorkContext` Terminal target derivation is explicitly root-path based and not initialized-workspace-gated. | No reopened issue. |
| 5 | AR-006 | High | Resolved and preserved | Terminal WebSocket pending cleanup, late PTY disconnect, pending message clearing, and partial setup failure cleanup are explicit. | No reopened issue. |
| 6 | AR-007 | High | Resolved and preserved | The design spec still states Round 8 is the only authoritative target and old names are legacy/current-state or migration aliases only. | No reopened contradiction. |
| API/E2E 9 | E2E-TERMFD-002 | Release-blocking validation failure | Incorporated into design | Requirements REQ-049..REQ-053 and AC-051..AC-055 plus DS-013 now cover normal attached Terminal command-output descriptor cleanup. | Not an unresolved architecture finding after this review; implementation must now fix and validate it. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace metadata create/list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone historical run open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team historical run/member focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Agent/runtime cwd | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Terminal desktop/mobile root-path open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006/DS-007 | Desktop/mobile Files open/close | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Skill file explorer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Context browser/search/read/write | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | File-explorer live updates | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | File-explorer pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 | Terminal pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-013 | Terminal normal-session descriptor cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` / `Workspace` metadata boundary | Pass | Pass | Pass | Pass | Preserves the good existing domain API while changing semantics to metadata-only creation/listing. |
| Backend `WorkspaceFileExplorer` capability | Pass | Pass | Pass | Pass | Explicit workspace-scoped file capability; unaffected by Round 9 Terminal descriptor issue. |
| Internal file-explorer collaborators | Pass | Pass | Pass | Pass | Internal split avoids a bloated capability without exposing new bypasses. |
| Frontend `workspaceStore` | Pass | Pass | Pass | Pass | Metadata-only state remains clear. |
| Frontend `fileExplorerStore` | Pass | Pass | Pass | Pass | Correct owner for tree/search/open-file/live state. |
| History/team hydration | Pass | Pass | Pass | Pass | Metadata-only history paths are clear. |
| Terminal route/handler/manager/session | Pass | Pass | Pass | Pass | Round 9 correctly adds the low-level `TerminalSession` descriptor owner instead of overloading the route or manager. |
| File-explorer WebSocket/session/watcher | Pass | Pass | Pass | Pass | Visible-consumer live update ownership remains clear. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceMetadata` | Pass | Pass | Pass | Pass | Tight shared identity/root/display/kind shape. |
| `WorkspaceFileExplorerTree` and related DTOs | Pass | Pass | Pass | Pass | File-explorer-specific projection, not general workspace metadata. |
| `WorkspaceFileTreeState` | Pass | Pass | Pass | Pass | Internal to `WorkspaceFileExplorer`. |
| `WorkspaceFileSearchIndex` | Pass | Pass | Pass | Pass | Internal owner for `FileNameIndexer`/search strategy. |
| `WorkspaceFileOperations` | Pass | Pass | Pass | Pass | Internal owner for validated file mutations/read. |
| `WorkspaceFileWatcherLeaseManager` | Pass | Pass | Pass | Pass | Internal watcher lifecycle owner. |
| `TerminalTarget` | Pass | Pass | Pass | Pass | Root-path terminal input shared across desktop/mobile/session. |
| Terminal close state/contract | Pass | N/A | Pass | Pass | The design keeps route state, handler read-loop ownership, manager registry ownership, and low-level session cleanup separate rather than introducing a generic cleanup layer. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkspaceMetadata` | Pass | Pass | Pass | Pass | Pass | No tree/status/resource state. |
| `Workspace` | Pass | Pass | Pass | Pass | Pass | Metadata plus lazy capability slot only. |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Pass | One coherent file capability subject. |
| `WorkspaceFileExplorerTree` | Pass | Pass | Pass | Pass | Pass | Projection-only tree payload. |
| `TerminalTarget` | Pass | Pass | Pass | N/A | Pass | Root path/cwd target is distinct from initialized workspace proof. |
| `WorkspaceReference` migration alias | Pass | Pass | Pass | N/A | Pass | Explicitly temporary/current-state only. |
| `WorkspaceInfo` migration alias | Pass | Pass | Pass | N/A | Pass | Allowed only if metadata-only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Auto file-explorer streams from workspace create/fetch/register | Pass | Pass | Pass | Pass | Replaced by visible file-explorer consumer/live state. |
| `WorkspaceInfo.fileExplorer` in general workspace response | Pass | Pass | Pass | Pass | Replaced by file-explorer-specific DTOs. |
| Frontend `workspaceStore` tree/open/search/live ownership | Pass | Pass | Pass | Pass | Replaced by `fileExplorerStore`. |
| Eager `FileSystemWorkspace.initialize()` tree/index/search on create | Pass | Pass | Pass | Pass | Replaced by metadata-only creation plus lazy acquisition. |
| Public/general `getFileExplorer()` / `searchFiles()` on workspace | Pass | Pass | Pass | Pass | Replaced by `Workspace.acquireFileExplorer()` and file-explorer methods. |
| `BaseFileExplorer` / `LocalFileExplorer` stack | Pass | Pass | Pass | Pass | Replaced by one `WorkspaceFileExplorer` capability. |
| Terminal workspace-id-only route/materialization gate | Pass | Pass | Pass | Pass | Replaced by root-path `TerminalTarget`. |
| Mobile Terminal initialized workspace lookup gate | Pass | Pass | Pass | Pass | Replaced by context/focused metadata root-path target. |
| Historical team eager member materialization | Pass | Pass | Pass | Pass | Replaced by metadata shells/projections. |
| Terminal session-count-only / child-count-only close acceptance | Pass | Pass | Pass | Pass | Replaced by deep close completion plus descriptor-level validation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Pass | Pass | Pass | Pass | Metadata registry/id mapping/create/get/list owner. |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Pass | Pass | Pass | Pass | Metadata-bearing workspace plus lazy `WorkspaceFileExplorer` slot. |
| `autobyteus-server-ts/src/workspaces/skill-workspace.ts` / `temp-workspace.ts` | Pass | Pass | Pass | Pass | Metadata specialization only. |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` or renamed equivalent | Pass | Pass | Pass | Pass | Single `WorkspaceFileExplorer` capability. |
| `workspace-file-tree-state.ts` | Pass | Pass | Pass | Pass | Internal tree/projection collaborator. |
| `workspace-file-search-index.ts` | Pass | Pass | Pass | Pass | Internal search/index collaborator. |
| `workspace-file-operations.ts` | Pass | Pass | Pass | Pass | Internal file operation collaborator. |
| `workspace-file-watcher-lease-manager.ts` | Pass | Pass | Pass | Pass | Internal watcher lease/lifecycle collaborator. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` / converter | Pass | Pass | Pass | Pass | Metadata-only response/conversion. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Pass | Pass | Pass | Pass | File-explorer-specific projections/actions. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Pass | Pass | Pass | Pass | Route-level pending cleanup and live-update session boundary. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Pass | Pass | Pass | Pass | Root-path/cwd validation and PTY pending-connect cleanup. |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Pass | Pass | N/A | Pass | Read-loop lifecycle and session attach/detach owner. |
| `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | Pass | Pass | N/A | Pass | Registry owner and close orchestration; must await low-level deep close. |
| `autobyteus-ts/src/tools/terminal/pty-session.ts` or selected `TerminalSession` backend | Pass | Pass | N/A | Pass | Low-level PTY descriptor/child/listener/read/timer cleanup owner. |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Pass | Pass | Metadata-only store. |
| `autobyteus-web/stores/fileExplorer.ts` | Pass | Pass | Pass | Pass | Tree/search/open-file/loading/live state owner. |
| `Terminal.vue` / `MobileTools.vue` / `useTerminalSession.ts` | Pass | Pass | Pass | Pass | Root-path `TerminalTarget` path is clear. |
| History/team hydration files | Pass | Pass | Pass | Pass | Metadata-only contexts/shells. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace metadata consumers | Pass | Pass | Pass | Pass | May depend on `WorkspaceManager`, `Workspace`, `WorkspaceMetadata`; no file-explorer state. |
| File-explorer consumers | Pass | Pass | Pass | Pass | Acquire through `Workspace.acquireFileExplorer(reason)`. |
| `WorkspaceFileExplorer` internals | Pass | Pass | Pass | Pass | Internal collaborators are not public bypass targets. |
| Terminal/runtime/history paths | Pass | Pass | Pass | Pass | Metadata/root path only; no file-explorer acquisition. |
| Terminal route/handler/manager/session | Pass | Pass | Pass | Pass | Higher layers rely on `TerminalSession.close()` as the low-level resource contract and must not substitute manager-map removal for cleanup. |
| General workspace API responses | Pass | Pass | Pass | Pass | Tree/search/watcher/loading fields forbidden. |
| Frontend store split | Pass | Pass | Pass | Pass | Metadata vs file-explorer state boundary is explicit. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` | Pass | Pass | Pass | Pass | No parallel metadata manager. |
| `Workspace` | Pass | Pass | Pass | Pass | Metadata plus lazy capability boundary. |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Internal collaborators stay internal. |
| `workspaceStore` | Pass | Pass | Pass | Pass | Metadata-only frontend boundary. |
| `fileExplorerStore` | Pass | Pass | Pass | Pass | File-explorer state owner. |
| File-explorer WebSocket route/handler | Pass | Pass | Pass | Pass | Route pending cleanup and session/lease cleanup are separated. |
| Terminal route | Pass | Pass | Pass | Pass | Socket/pending-connect cleanup stays at route boundary. |
| `TerminalHandler` | Pass | Pass | Pass | Pass | Read-loop ownership does not bypass manager/session cleanup. |
| `PtySessionManager` | Pass | Pass | Pass | Pass | Registry owner delegates low-level OS resources to `TerminalSession.close()`. |
| `TerminalSession` backend | Pass | Pass | Pass | Pass | Low-level descriptor lifecycle is correctly below the manager boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager.createWorkspace(input)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceManager.getOrCreateWorkspace(idOrRoot)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceManager.ensureWorkspaceByRootPath(rootPath)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `createWorkspace` / `workspaces` / metadata resolver | Pass | Pass | Pass | Low | Pass |
| `Workspace.acquireFileExplorer(reason)` | Pass | Pass | Pass | Low | Pass |
| File-explorer GraphQL folder/tree/search/file operations | Pass | Pass | Pass | Low | Pass |
| File-explorer WebSocket | Pass | Pass | Pass | Low | Pass |
| Terminal WebSocket | Pass | Pass | Pass | Low | Pass |
| `TerminalHandler.connect/disconnect` | Pass | Pass | Pass | Low | Pass |
| `PtySessionManager.closeSession(sessionId)` | Pass | Pass | Pass | Low | Pass |
| `TerminalSession.close()` | Pass | Pass | Pass | Low | Pass |
| Run/team history hydration | Pass | Pass | Pass | Low | Pass |
| Runtime cwd resolver | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Correct home for workspace metadata/domain objects. |
| `autobyteus-server-ts/src/file-explorer` | Pass | Pass | Medium | Pass | Correct home for `WorkspaceFileExplorer` and internal collaborators. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Pass | Pass | Low | Pass | Metadata API boundary. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Pass | Pass | Low | Pass | File-explorer API boundary. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Pass | Pass | Low | Pass | Route-level WebSocket owner. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Pass | Pass | Low | Pass | Handler/manager terminal streaming owner. |
| `autobyteus-ts/src/tools/terminal` | Pass | Pass | Low | Pass | Correct existing package/folder for low-level `TerminalSession` backends. |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Low | Pass | Metadata store only. |
| `autobyteus-web/stores/fileExplorer.ts` | Pass | Pass | Low | Pass | File-explorer UI state. |
| Terminal frontend/backend paths | Pass | Pass | Low | Pass | Existing subsystem reuse is appropriate. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace metadata and top-level API | Pass | Pass | N/A | Pass | Reuses `WorkspaceManager`; avoids duplicate metadata owner. |
| Workspace file browsing/search/mutation/watch | Pass | Pass | Pass | Pass | Recasts existing file-explorer area as `WorkspaceFileExplorer`. |
| Internal file-explorer collaborators | Pass | Pass | Pass | Pass | Justified to keep capability cohesive but not bloated. |
| Frontend metadata/file-explorer state split | Pass | Pass | N/A | Pass | Reuses `workspaceStore` and `fileExplorerStore` with clarified responsibilities. |
| Terminal/mobile tools | Pass | Pass | N/A | Pass | Existing surfaces are extended, not replaced. |
| Terminal low-level session backend | Pass | Pass | N/A | Pass | Reuses `autobyteus-ts` `TerminalSession` abstraction and allows backend/close-sequence change only if needed to satisfy the descriptor contract. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceManager` API names | Yes, intentionally preserved | Pass | Pass | Preservation is semantic correction, not legacy dual path. |
| `WorkspaceReference` alias | Temporary only | Pass | Pass | Not steady-state. |
| `WorkspaceInfo` name | Temporary only if metadata-only | Pass | Pass | Tree-bearing payload forbidden. |
| `BaseFileExplorer` / `LocalFileExplorer` | No steady-state retention | Pass | Pass | Removed/collapsed. |
| Terminal workspace-id-only route | No steady-state retention | Pass | Pass | Root-path target replaces it. |
| History/team eager materialization | No steady-state retention | Pass | Pass | Metadata-only history replaces it. |
| Auto file-explorer live stream startup | No steady-state retention | Pass | Pass | Visible file-explorer consumers replace it. |
| Terminal close success with retained PTY descriptors | No steady-state retention | Pass | Pass | Explicitly rejected by Round 9 design. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Metadata-only workspace API | Pass | Pass | Pass | Pass |
| Lazy `WorkspaceFileExplorer` extraction | Pass | Pass | Pass | Pass |
| Internal collaborator extraction | Pass | Pass | Pass | Pass |
| API/DTO split | Pass | Pass | Pass | Pass |
| Frontend store split | Pass | Pass | Pass | Pass |
| Files/skill/context acquisition paths | Pass | Pass | Pass | Pass |
| History/team/Terminal/runtime metadata-only paths | Pass | Pass | Pass | Pass |
| WebSocket pending cleanup validation | Pass | Pass | Pass | Pass |
| Terminal normal-session deep close | Pass | Pass | Pass | Pass |
| Temporary alias deletion | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Metadata-only create/list | Yes | Pass | Pass | Pass | DS-001 and invariants are clear. |
| Metadata-only history/team/runtime/Terminal | Yes | Pass | Pass | Pass | DS-002..DS-005 distinguish non-file-explorer spans. |
| Files/skill/context acquisition | Yes | Pass | Pass | Pass | DS-006..DS-010 distinguish file-explorer acquisition spans. |
| WebSocket early cleanup | Yes | Pass | Pass | Pass | File-explorer and Terminal cleanup contracts are concrete. |
| Terminal normal-session deep close | Yes | Pass | Pass | Pass | DS-013 plus cleanup contract distinguishes socket, read-loop, manager, child, and descriptor cleanup. |
| Legacy naming boundary | Yes | Pass | Pass | Pass | AR-007 note and terminology table are clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The design now covers original watcher descriptor pressure, workspace metadata/file-explorer separation, lazy history/team hydration, desktop/mobile Terminal root-path open, file-explorer visible consumers, skill/context file explorer, WebSocket pending cleanup, and normal Terminal descriptor-clean close. | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation rework.

## Findings

None.

## Classification

- Overall classification: N/A — no blocking design-review findings in round 8.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- API/E2E Round 9 remains a real validation failure until implementation fixes and revalidates `E2E-TERMFD-002`; this review only confirms the revised requirements/design are sufficient to proceed.
- `TerminalSession.close()` may require changing `node-pty` close ordering, wrapper behavior, or backend selection. If implementation switches backend behavior rather than tightening `PtySession`, code review and API/E2E must verify interactive Terminal semantics and descriptor cleanup together.
- Descriptor validation must remain macOS-realistic/built-backend and command-output-based; manager `sessionCount`, child process count, or shell-input echo are insufficient proof.
- Implementation must still preserve the Round 8 workspace/file-explorer split while addressing Terminal descriptors; do not regress to workspace materialization or file-explorer acquisition for Terminal.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 9 `E2E-TERMFD-002` design additions are architecturally sufficient. The design is coherent, actionable, and ready for implementation rework focused on Terminal normal-session descriptor cleanup while preserving the passed workspace/file-explorer architecture.
