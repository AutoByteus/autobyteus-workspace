# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Upstream Root-Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Upstream Same-Ticket Design-Impact Rework Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Current Review Round: 7
- Trigger: Fresh architecture review after AR-007 reconciliation of the full design spec to one authoritative Round 8 `WorkspaceMetadata` / `WorkspaceFileExplorer` / `WorkspaceFileExplorerTree` target.
- Prior Review Round Reviewed: 6
- Latest Authoritative Round: 7
- Current-State Evidence Basis: Reloaded `architecture-reviewer` skill guidance and shared design principles; reread the current requirements, investigation notes, design spec, root-cause report, design-impact rework artifact, and prior review report. Independently rechecked relevant current code evidence with `rg`: backend eager workspace/file-explorer state in `workspace-manager.ts`, `filesystem-workspace.ts`, `workspace-converter.ts`, GraphQL workspace/file-explorer resolvers, `BaseFileExplorer`, `LocalFileExplorer`, `FileNameIndexer`, file-explorer streaming; frontend tree-in-workspace and legacy target evidence in `stores/workspace.ts`, `stores/workspaceReferenceActions.ts`, `stores/fileExplorer.ts`, `Terminal.vue`, `MobileTools.vue`, workspace GraphQL operations, and current tests/types.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial watcher lifecycle design review | N/A | 2 | Fail | No | AR-001 mobile hidden `RightSideTabs` path and AR-002 pending WebSocket close race required design updates. |
| 2 | Retry after revised watcher/visibility design | AR-001, AR-002 | 0 | Pass | No | Watcher ownership, mobile visibility, and file-explorer pending WebSocket cleanup were ready. |
| 3 | Late same-ticket history-open lazy workspace design-impact rework | AR-001, AR-002 | 2 | Fail | No | Lazy-history direction was sound, but config data-model and historical team hydration flow were underspecified. |
| 4 | Fresh review after AR-003/AR-004 revisions | AR-001, AR-002, AR-003, AR-004 | 0 | Pass | No | Revised lazy-history design was ready before the Terminal release blocker was found. |
| 5 | Superseding Terminal root-path/cwd design-impact revision | AR-001..AR-004 | 2 | Fail | No | Desktop Terminal direction was sound, but mobile Terminal and Terminal pending-connect cleanup were omitted. |
| 6 | Fresh full review of user-approved Round 8 WorkspaceMetadata / WorkspaceFileExplorer concept separation | AR-001..AR-006 | 1 | Fail | No | Round 8 concept was sound, but the design spec still contained contradictory pre-Round-8 authoritative sections. |
| 7 | AR-007 reconciliation review | AR-007 plus AR-001..AR-006 | 0 | Pass | Yes | The spec is now internally consistent and implementation-ready. |

## Reviewed Design Spec

The reconciled design is architecture-ready.

The design now has one authoritative target:

```text
WorkspaceMetadata
Workspace = WorkspaceMetadata + optional lazy WorkspaceFileExplorer
WorkspaceFileExplorer = internal tree/search/operation/watcher capability boundary
WorkspaceFileExplorerTree = file-explorer API/frontend projection
```

The spec explicitly marks `WorkspaceReference`, `WorkspaceActivationState`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, and `ensureWorkspaceInitialized(reference)` as legacy/current-state or temporary migration aliases only. The old contradictory “final” mapping and migration sections have been removed/replaced. This resolves AR-007.

The resulting architecture is coherent:

- `WorkspaceManager` remains the authoritative workspace owner for metadata registration, root-path canonicalization/id mapping, create/list/get-or-create, and workspace object lookup.
- Workspace creation and metadata queries are cheap and do not build file trees, create `FileNameIndexer`, initialize search, create a `WorkspaceFileExplorer`, open live streams, or start watchers.
- `Workspace` owns an optional lazy `WorkspaceFileExplorer` capability slot/factory, but non-file-explorer paths use only metadata/root path.
- `WorkspaceFileExplorer` owns file browsing/search/mutation/watch concerns and may coordinate internal concrete collaborators: `WorkspaceFileTreeState`, `WorkspaceFileSearchIndex`, `WorkspaceFileOperations`, and `WorkspaceFileWatcherLeaseManager`.
- Those collaborators stay internal; callers use `Workspace.acquireFileExplorer(reason)` only when they are file-explorer consumers.
- API responses are split: metadata APIs return `WorkspaceMetadata`; file-explorer APIs return `WorkspaceFileExplorerTree`, folder, search, or file-operation projections.
- Frontend `workspaceStore` becomes metadata-only; `fileExplorerStore` owns tree projections, folder/open-file/search/loading/error/live-stream state by workspace id.
- History, team history, Terminal desktop/mobile, runtime cwd, resume/rerun, sidebars, and workspace list/create are explicitly forbidden from acquiring `WorkspaceFileExplorer`.
- Files desktop/mobile, skill file explorer, context browser/search/read/write, and file-explorer WebSocket are the normal acquisition paths.
- File-explorer WebSocket and Terminal WebSocket pending-connect cleanup contracts are explicit.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design states bug fix + performance remediation + architecture refactor. It covers `spawn EBADF`, slow history open, slow Terminal open, mobile Terminal, and WebSocket resource races. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The design classifies boundary/ownership issue, missing lifecycle invariant, shared data-model looseness, and file responsibility drift; current-code evidence in investigation/root-cause artifacts supports this. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is required now because current workspace/file-explorer coupling creates descriptor pressure and latency for metadata/cwd-only flows. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The target invariant, spines, data model, interface mapping, file mapping, dependency rules, cleanup contracts, decommission plan, migration sequence, and validation plan all support the refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved and preserved | Design keeps dedicated mobile explorer as the only mobile file-explorer live surface and keeps mobile tools from rendering hidden Files. | No reopened issue. |
| 1 | AR-002 | Medium | Resolved and preserved | Design retains file-explorer route cleanup before async connect and handler/session lease cleanup. | No reopened issue. |
| 3 | AR-003 | High | Resolved and superseded by Round 8 | The cheap identity/display concept is now `WorkspaceMetadata`; old `WorkspaceReference` is migration/current-state only. | Stronger target than prior fix. |
| 3 | AR-004 | High | Resolved and preserved | Historical team hydration uses metadata/member shells and does not eagerly materialize every member workspace. | No reopened issue. |
| 5 | AR-005 | High | Resolved and preserved | `MobileTools.vue` / `MobileWorkContext` Terminal target derivation is explicitly mapped as root-path based and not initialized-workspace-gated. | No reopened issue. |
| 5 | AR-006 | High | Resolved and preserved | Terminal WebSocket pending cleanup, late PTY disconnect, pending message clearing, and partial setup failure cleanup are explicit. | No reopened issue. |
| 6 | AR-007 | High | Resolved | The design spec now states Round 8 is the only authoritative target; old names are legacy/current-state or migration aliases only; final mappings/interfaces/dependencies/migration/validation are aligned to `WorkspaceMetadata`, `WorkspaceFileExplorer`, and `WorkspaceFileExplorerTree`. | No remaining blocking contradiction. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace metadata create/list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone historical run open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team historical run/member focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Agent/runtime cwd | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Terminal desktop/mobile | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006/DS-007 | Desktop/mobile Files open/close | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Skill file explorer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Context browser/search/read/write | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | File-explorer live updates | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | File-explorer pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 | Terminal pending cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` / `Workspace` metadata boundary | Pass | Pass | Pass | Pass | Preserves good existing domain boundary while fixing semantics. |
| Backend `WorkspaceFileExplorer` capability | Pass | Pass | Pass | Pass | Explicit workspace-scoped file capability; avoids vague generic object. |
| Internal file-explorer collaborators | Pass | Pass | Pass | Pass | Internal split avoids a bloated `WorkspaceFileExplorer` without exposing a new stack. |
| Frontend `workspaceStore` | Pass | Pass | Pass | Pass | Metadata-only state is clear. |
| Frontend `fileExplorerStore` | Pass | Pass | Pass | Pass | Correct owner for tree/search/open-file/live state. |
| History/team hydration | Pass | Pass | Pass | Pass | Metadata-only history paths are clear. |
| Terminal desktop/mobile/session/backend | Pass | Pass | Pass | Pass | Root-path/cwd and PTY cleanup ownership is clear. |
| File-explorer WebSocket/session/watcher | Pass | Pass | Pass | Pass | Visible-consumer live update ownership is clear. |

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
| Pending WebSocket route state | Pass | Pass | Pass | Pass | Kept local to file-explorer and terminal routes, not over-generalized. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkspaceMetadata` | Pass | Pass | Pass | Pass | Pass | No tree/status/resource state. |
| `Workspace` | Pass | Pass | Pass | Pass | Pass | Metadata plus lazy capability slot only. |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Pass | One coherent file capability subject. |
| `WorkspaceFileExplorerTree` | Pass | Pass | Pass | Pass | Pass | Projection-only tree payload. |
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

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `workspaces/workspace-manager.ts` | Pass | Pass | Pass | Pass | Metadata registry/id mapping/create/get/list owner. |
| `workspaces/filesystem-workspace.ts` | Pass | Pass | Pass | Pass | Metadata-bearing workspace plus lazy `WorkspaceFileExplorer` slot. |
| `workspaces/skill-workspace.ts` / `temp-workspace.ts` | Pass | Pass | Pass | Pass | Metadata specialization only. |
| `file-explorer/file-explorer.ts` or renamed equivalent | Pass | Pass | Pass | Pass | Single `WorkspaceFileExplorer` capability. |
| `workspace-file-tree-state.ts` | Pass | Pass | Pass | Pass | Internal tree/projection collaborator. |
| `workspace-file-search-index.ts` | Pass | Pass | Pass | Pass | Internal search/index collaborator. |
| `workspace-file-operations.ts` | Pass | Pass | Pass | Pass | Internal file operation collaborator. |
| `workspace-file-watcher-lease-manager.ts` | Pass | Pass | Pass | Pass | Internal watcher lease/lifecycle collaborator. |
| `api/graphql/types/workspace.ts` / converter | Pass | Pass | Pass | Pass | Metadata-only response/conversion. |
| `api/graphql/types/file-explorer.ts` | Pass | Pass | Pass | Pass | File-explorer-specific projections/actions. |
| `api/websocket/file-explorer.ts` | Pass | Pass | Pass | Pass | Route-level pending cleanup and live-update session boundary. |
| `api/websocket/terminal.ts` | Pass | Pass | Pass | Pass | Root-path/cwd and PTY pending cleanup. |
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
| Terminal route/session | Pass | Pass | Pass | Pass | Route pending cleanup and PTY session lifecycle are separated. |

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
| Run/team history hydration | Pass | Pass | Pass | Low | Pass |
| Runtime cwd resolver | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Correct home for workspace metadata/domain objects. |
| `autobyteus-server-ts/src/file-explorer` | Pass | Pass | Medium | Pass | Correct home for `WorkspaceFileExplorer` and internal collaborators. |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Pass | Pass | Low | Pass | Metadata API boundary. |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Pass | Pass | Low | Pass | File-explorer API boundary. |
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
| WebSocket cleanup validation | Pass | Pass | Pass | Pass |
| Temporary alias deletion | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Metadata-only create/list | Yes | Pass | Pass | Pass | DS-001 and invariants are clear. |
| Metadata-only history/team/runtime/Terminal | Yes | Pass | Pass | Pass | DS-002..DS-005 distinguish non-file-explorer spans. |
| Files/skill/context acquisition | Yes | Pass | Pass | Pass | DS-006..DS-010 distinguish file-explorer acquisition spans. |
| WebSocket early cleanup | Yes | Pass | Pass | Pass | File-explorer and Terminal cleanup contracts are concrete. |
| Legacy naming boundary | Yes | Pass | Pass | Pass | AR-007 note and terminology table are clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The reconciled design covers original descriptor pressure, workspace metadata/file-explorer separation, lazy history/team hydration, desktop/mobile Terminal, file-explorer visible consumers, skill/context file explorer, WebSocket cleanup, migration, and validation. | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

- Overall classification: N/A — no blocking design-review findings in round 7.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The branch is behind `origin/personal` by 4 commits; implementation/delivery should refresh/integrate at the appropriate later workflow stage per team process.
- The design spec status line still references user-review gating, while the handoff says future solution-designer revisions are automatically approved for downstream architecture review. This is process wording only, not an architecture blocker; implementation can proceed from the approved handoff.
- Implementation must remove or tightly scope temporary aliases in the same change. Leaving `WorkspaceReference`, `WorkspaceInfo.fileExplorer`, `BaseFileExplorer`, `LocalFileExplorer`, or `ensureWorkspaceInitialized(reference)` as steady-state target concepts would violate the passed design.
- Because the current code has many existing tests and callers around `WorkspaceInfo.fileExplorer` / `workspaceStore.workspaces`, code review should verify the state split with static/build evidence, not only runtime behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: AR-007 is resolved. The reconciled Round 8 design is coherent, actionable, and ready for implementation rework.
