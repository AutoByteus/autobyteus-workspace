# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Upstream Root-Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Current Review Round: 4
- Trigger: Fresh architecture review of the revised same-ticket lazy historical workspace activation design after round-3 blockers AR-003 and AR-004.
- Prior Review Round Reviewed: 3
- Latest Authoritative Round: 4
- Current-State Evidence Basis: Freshly reloaded `architecture-reviewer` guidance, shared design principles, the current requirements, investigation notes, design spec, root-cause report, design-impact rework artifact, and prior review report. Independently inspected the ticket worktree code paths for current evidence: `autobyteus-web/stores/runHistoryLoadActions.ts`, `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `autobyteus-web/stores/runHistorySelectionActions.ts`, `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`, `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`, `autobyteus-web/stores/runHistoryTeamHelpers.ts`, `autobyteus-web/utils/teamRunConfigUtils.ts`, `autobyteus-web/types/agent/AgentRunConfig.ts`, `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/types/agent/AgentTeamContext.ts`, `autobyteus-web/stores/workspace.ts`, `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue`, `autobyteus-web/components/layout/WorkspaceMobileLayout.vue`, `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/components/fileExplorer/FileExplorer.vue`, `autobyteus-web/components/workspace/tools/Terminal.vue`, `autobyteus-web/components/workspace/config/RunConfigPanel.vue`, `autobyteus-web/stores/agentRunStore.ts`, `autobyteus-server-ts/src/workspaces/workspace-id-mapping-store.ts`, `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts`, `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, and representative backend watcher/session files.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial watcher lifecycle design review | N/A | 2 | Fail | No | AR-001 mobile hidden `RightSideTabs` path and AR-002 pending WebSocket close race required design updates. |
| 2 | Retry after revised watcher/visibility design | AR-001, AR-002 | 0 | Pass | No | Watcher ownership, mobile visibility, and pending WebSocket cleanup were ready for implementation. |
| 3 | Late same-ticket history-open lazy workspace design-impact rework | AR-001, AR-002 | 2 | Fail | No | Lazy-history direction was sound, but the design lacked concrete run/team config data-model integration and concrete historical team hydration flow. |
| 4 | Fresh review after AR-003/AR-004 revisions | AR-001, AR-002, AR-003, AR-004 | 0 | Pass | Yes | Revised design now defines `WorkspaceReference`/activation semantics and team historical hydration ownership concretely enough for implementation rework. |

## Reviewed Design Spec

The current design spec is architecture-ready. It keeps the previously approved watcher lifecycle refactor and now folds the same-ticket late release blocker into the design with a concrete reference/activation split.

The important corrected shape is:

- Historical viewing is read-only and depends on stored projections/resume/file-change data plus a cheap `WorkspaceReference` derived from canonical `workspaceRootPath`.
- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` are deterministic reference ids only; they are not proof that `WorkspaceStore.workspaces[workspaceId]` is initialized.
- `workspaceReference` is the root-path/display companion required when a filesystem `workspaceId` exists.
- Initialized `WorkspaceInfo` and activation state belong only to `WorkspaceStore`.
- Files, Terminal, context browsing, and any runtime path that truly needs initialized workspace state must activate explicitly at that feature boundary.
- Standalone historical agent hydration and historical team/member hydration are separate spines with separate file mappings and removal targets.

Current code evidence confirms the design is addressing the real blockers:

- Standalone history currently passes `ensureWorkspaceByRootPath` from `openHistoricalRun()` into `openAgentRun()` and `loadRunContextHydrationPayload()` (`runHistoryLoadActions.ts` and `runContextHydrationService.ts`), and that hydration path calls the resolver before creating `AgentRunConfig`.
- The fallback resolver currently can call `workspaceStore.createWorkspace({ root_path })`, which reaches backend workspace initialization.
- Team history currently passes `ensureWorkspaceByRootPath` through `openTeamMemberRunFromHistory()` / `openTeamRun()` into `loadHistoricalTeamRunContextHydrationPayload()`, which calls `buildTeamMemberContexts()`. That helper iterates all members and calls `ensureWorkspaceByRootPath(member.workspaceRootPath)`.
- Shared config types currently expose only `workspaceId`, which explains the ambiguity fixed by the new design.

The watcher lifecycle portions are still architecturally sound. The current branch already contains earlier watcher refactor implementation in several files, so the migration sequence should be treated as the full target sequence rather than evidence that every step remains unimplemented.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec identifies Bug Fix + Refactor + Performance, including the original `spawn EBADF` descriptor-pressure bug and the same-ticket historical-open performance blocker. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Boundary Or Ownership Issue / Missing Invariant / Shared Structure Looseness and ties that to watcher ownership plus `workspaceId`/`WorkspaceInfo` identity-vs-activation ambiguity. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now; full workspace cache eviction and folder-scoped traversal can be deferred only after watcher release and history-open decoupling are satisfied. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Concrete spines, data model, team hydration flow, file mappings, removal plan, dependency rules, migration sequence, and validation plan all support the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved and preserved | Design keeps the dedicated mobile `explorer` panel as the only mobile file-explorer live surface and requires mobile-tools `RightSideTabs` to filter out `files` and prevent `FileExplorerLayout` mounting. Current code also shows `WorkspaceMobileLayout.vue` passing `mode="mobile-tools"` and `RightSideTabs.vue` suppressing the files tab in that mode. | No reopened issue. |
| 1 | AR-002 | Medium | Resolved and preserved | Design assigns pending async WebSocket attach cleanup to `api/websocket/file-explorer.ts` and atomic lease/session setup cleanup to `FileExplorerStreamHandler.connect()`. Current backend code has `closed`/`sessionId`/`connectPromise` route tracking and handler lease cleanup patterns. | No reopened issue. |
| 3 | AR-003 | High | Resolved | Design now has a dedicated `Workspace Reference And Run Context Data Model` section defining `WorkspaceReference`, `AgentRunConfig.workspaceReference`, `TeamRunConfig.workspaceReference`, `WorkspaceStore.workspaceReferencesById`, activation state, `activeWorkspaceReference`, and `ensureWorkspaceInitialized(reference)`. It also names display/action consumers and field invariants. | Implementation still must update all call sites; no design blocker remains. |
| 3 | AR-004 | High | Resolved | Design now adds DS-010/DS-011, a historical team hydration flow through `openTeamMemberRunFromHistory -> openTeamRun -> loadTeamRunContextHydrationPayload -> loadHistoricalTeamRunContextHydrationPayload -> buildHistoricalTeamMemberContextShells`, live-vs-historical helper split, `primaryWorkspaceReference`, per-member references, focused/sibling behavior, file mappings, and validation. | Implementation still must split the existing generic helper; no design blocker remains. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace load without live monitoring | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Visible file explorer opens live stream and refreshes snapshot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Active watcher event to frontend state | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Backend stream session to watcher lease lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Search/folder/file operation without persistent watcher | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Spawn failure diagnostics | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | WebSocket attach / early close cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Historical standalone agent run renders with workspace reference and no activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Workspace-dependent action activates reference only when needed | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Historical team/member row renders focused projection and member shells with references | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | Historical team sibling focus hydrates projection without workspace activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend workspace state/reference | Pass | Pass | Pass | Pass | `WorkspaceStore` owns initialized workspace payload, cheap reference cache, activation state, live-session registry, and selectors. |
| Frontend file explorer/layouts | Pass | Pass | Pass | Pass | FileExplorer declares visible interest; desktop/mobile layout owners prevent hidden live consumers. |
| Backend file-explorer streaming/watcher | Pass | Pass | Pass | Pass | Route, stream handler, session, `LocalFileExplorer`, and watcher adapter have distinct lifecycle responsibilities. |
| Backend search/index | Pass | Pass | Pass | Pass | `FileNameIndexer` is snapshot/on-demand search index owner, not watcher owner. |
| Standalone run history hydration/opening | Pass | Pass | Pass | Pass | Existing hydration/opening subsystem is extended to resolve references instead of activation. |
| Team run history hydration/opening | Pass | Pass | Pass | Pass | Existing team path is extended with live-vs-historical split and historical shell/reference builder. |
| Run/team config data model | Pass | Pass | Pass | Pass | Configs carry deterministic reference id plus `workspaceReference`; contexts do not own activation. |
| Workspace identity/reference backend | Pass | Pass | Pass | Pass | Existing canonical path and id mapping owners are extended for cheap reference resolution. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceReference` | Pass | Pass | Pass | Pass | Shared between config, store, hydration, and GraphQL/DTO mapping; no file tree or activation state included. |
| `WorkspaceActivationState` | Pass | Pass | Pass | Pass | Centralized in `WorkspaceStore` instead of duplicated into configs/contexts. |
| Team member workspace reference map | Pass | Pass | Pass | Pass | Belongs in `HistoricalTeamHydrationState`, keyed by member route key. |
| Watcher lease | Pass | Pass | Pass | Pass | Minimal lease shape remains owned by backend file explorer boundary. |
| Frontend visible consumer key | Pass | Pass | Pass | Pass | Store-owned consumer registry is sufficient; no generic UI visibility framework introduced. |
| Pending WebSocket route context | Pass | Pass | Pass | Pass | Local route state is appropriate and avoids over-generalization. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkspaceReference` | Pass | Pass | Pass | Pass | Minimal metadata-only identity shape: id, canonical root path, display name, kind. |
| `AgentRunConfig.workspaceId` | Pass | Pass | Pass | N/A | Target meaning is deterministic reference id only, not initialized workspace proof. |
| `AgentRunConfig.workspaceReference` | Pass | Pass | Pass | N/A | Required companion whenever filesystem `workspaceId` exists. |
| `TeamRunConfig.workspaceId` | Pass | Pass | Pass | N/A | Target meaning is primary/team deterministic reference id only. |
| `TeamRunConfig.workspaceReference` | Pass | Pass | Pass | N/A | Primary display/reference value selected from coordinator/focused/first member reference. |
| `HistoricalTeamHydrationState.memberWorkspaceReferencesByRouteKey` | Pass | Pass | Pass | N/A | Per-member references only; not a workspace payload cache. |
| `WorkspaceStore.workspaces` vs `workspaceReferencesById` | Pass | Pass | Pass | Pass | Initialized payload and cheap reference cache are separate authoritative structures. |
| `WorkspaceInfo` | Pass | Pass | Pass | N/A | Explicitly rejected as metadata-only history display shape because it includes tree/snapshot payload. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace-load auto file-explorer stream connection | Pass | Pass | Pass | Pass | Replaced by visible-consumer live-session acquisition. |
| Mobile tools `RightSideTabs` files path | Pass | Pass | Pass | Pass | Replaced by dedicated mobile explorer panel and mobile-tools no-files mode. |
| `FileNameIndexer.start()` live watcher startup | Pass | Pass | Pass | Pass | Replaced by snapshot/on-demand indexing. |
| Direct `ensureWatcherStarted()` public caller usage | Pass | Pass | Pass | Pass | Replaced by `acquireWatcherLease(reason)` and async release. |
| Route close handler that ignores null `sessionId` | Pass | Pass | Pass | Pass | Replaced by pending connection cleanup. |
| Standalone history hydration requiring `ensureWorkspaceByRootPath()` | Pass | Pass | Pass | Pass | Replaced by `WorkspaceReference` resolution and feature-action activation. |
| Generic historical team `buildTeamMemberContexts({ ensureWorkspaceByRootPath })` | Pass | Pass | Pass | Pass | Replaced by `buildLiveTeamMemberContexts` vs `buildHistoricalTeamMemberContextShells`. |
| `firstWorkspaceId` as team config handoff | Pass | Pass | Pass | Pass | Replaced by `primaryWorkspaceReference` / `firstWorkspaceReference`. |
| Run config display from initialized `WorkspaceStore.workspaces` only | Pass | Pass | Pass | Pass | Replaced by display from `config.workspaceReference` first. |
| `WorkspaceInfo` as history workspace identity shape | Pass | Pass | Pass | Pass | Replaced by metadata-only reference. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Pass | Pass | Owns live session registry, references, activation state, and initialized workspace payloads. |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Pass | Pass | Pass | Pass | Visible explorer entrypoint; target activation before folder/live stream use is clear. |
| `WorkspaceDesktopLayout.vue`, `WorkspaceMobileLayout.vue`, `RightSideTabs.vue` | Pass | Pass | Pass | Pass | Visibility semantics and mobile no-files mode are explicitly assigned. |
| `runContextHydrationService.ts` | Pass | Pass | Pass | Pass | Standalone historical hydration produces `AgentRunConfig{workspaceId, workspaceReference}` without eager activation. |
| `runHistoryLoadActions.ts` | Pass | Pass | Pass | Pass | Removes history-only workspace creation fallback. |
| `AgentRunConfig.ts` | Pass | Pass | Pass | Pass | Adds `workspaceReference` and documents `workspaceId` as reference id. |
| `TeamRunConfig.ts` | Pass | Pass | Pass | Pass | Adds primary `workspaceReference` and documents `workspaceId` as reference id. |
| `AgentContext.ts` / `AgentTeamContext.ts` | Pass | Pass | Pass | Pass | Contexts carry reference through config; team historical state carries per-member references. |
| `runHistorySelectionActions.ts` | Pass | Pass | Pass | Pass | Team history entry passes reference resolver, not activation, for historical branch. |
| `teamRunOpenCoordinator.ts` | Pass | Pass | Pass | Pass | Consumes `primaryWorkspaceReference` instead of ambiguous `firstWorkspaceId`. |
| `teamRunContextHydrationService.ts` | Pass | Pass | Pass | Pass | Owns live-vs-historical split and historical projection/reference flow. |
| `runHistoryTeamHelpers.ts` | Pass | Pass | Pass | Pass | Splits live member activation from historical shell/reference building. |
| `teamRunConfigUtils.ts` | Pass | Pass | Pass | Pass | Reconstructs team config from primary reference and derives id from reference. |
| `RunConfigPanel.vue` | Pass | Pass | Pass | Pass | Displays path/name from reference before initialized workspace lookup. |
| `Terminal.vue` | Pass | Pass | Pass | Pass | Target explicitly activates focused reference before terminal connection. |
| `agentRunStore.ts` | Pass | Pass | Pass | Pass | Target uses reference root path for resume/rerun and avoids initialization solely to recover path. |
| Backend watcher/session files | Pass | Pass | Pass | Pass | Existing boundaries remain aligned with watcher lease design. |
| `workspace-id-mapping-store.ts` / workspace GraphQL type area | Pass | Pass | Pass | Pass | Correct owner for deterministic id/canonical root reference API. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| UI visibility -> `WorkspaceStore` live-session API | Pass | Pass | Pass | Pass | Components must not instantiate `FileExplorerStreamingService` directly. |
| WebSocket route -> stream handler | Pass | Pass | Pass | Pass | Route owns pending raw socket cleanup; handler owns lease/session setup. |
| Stream handler -> `BaseFileExplorer.acquireWatcherLease` | Pass | Pass | Pass | Pass | Handler must not construct watchers directly. |
| FileNameIndexer/search -> file tree/index | Pass | Pass | Pass | Pass | Search must not start persistent watchers by default. |
| History hydration -> workspace reference resolver | Pass | Pass | Pass | Pass | History may resolve cheap references but must not create/initialize workspaces. |
| Config/context -> workspace identity/reference | Pass | Pass | Pass | Pass | Configs carry identity/display only; `WorkspaceStore` owns activation and initialized payload. |
| Files/Terminal/context actions -> workspace activation | Pass | Pass | Pass | Pass | Feature action owns activation loading/error; history display remains independent. |
| Historical team hydration -> member references/shells | Pass | Pass | Pass | Pass | Historical branch must not use live activation helper or `ensureWorkspaceByRootPath`. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession` | Pass | Pass | Pass | Pass | Encapsulates frontend live-consumer registry and transport use. |
| `RightSideTabs` mode/context | Pass | Pass | Pass | Pass | Encapsulates desktop vs mobile-tools file-tab availability. |
| `api/websocket/file-explorer.ts` pending cleanup | Pass | Pass | Pass | Pass | Encapsulates close/error/connect race before session id exists. |
| `BaseFileExplorer.acquireWatcherLease` / `LocalFileExplorer` | Pass | Pass | Pass | Pass | Encapsulates watcher refcount/start/stop. |
| Workspace reference resolver | Pass | Pass | Pass | Pass | Encapsulates canonical path/id/display without tree initialization. |
| Run/team config workspace fields | Pass | Pass | Pass | Pass | Field semantics are explicit; no initialized-state implication. |
| Team historical hydration boundary | Pass | Pass | Pass | Pass | Historical member shells/projections are separated from live workspace activation. |
| Workspace activation boundary | Pass | Pass | Pass | Pass | Activation is the only path to initialized `WorkspaceInfo`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession` / release | Pass | Pass | Pass | Low | Pass |
| `BaseFileExplorer.acquireWatcherLease` / `WatcherLease.release` | Pass | Pass | Pass | Low | Pass |
| `resolveWorkspaceReferenceByRootPath` | Pass | Pass | Pass | Low | Pass |
| Optional `resolveWorkspaceReferencesByRootPaths` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceStore.ensureWorkspaceInitialized(reference)` | Pass | Pass | Pass | Low | Pass |
| `loadRunContextHydrationPayload` | Pass | Pass | Pass | Low | Pass |
| `loadTeamRunContextHydrationPayload` | Pass | Pass | Pass | Medium | Pass |
| `buildHistoricalTeamMemberContextShells` | Pass | Pass | Pass | Low | Pass |
| `buildLiveTeamMemberContexts` | Pass | Pass | Pass | Low | Pass |
| `reconstructTeamRunConfigFromMetadata({ primaryWorkspaceReference })` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Medium | Pass | Store remains a broad owner, but the design keeps concerns named and bounded. |
| `autobyteus-web/components/layout/*` | Pass | Pass | Low | Pass | Layout owns visibility/rendering gates only. |
| `autobyteus-web/services/runHydration` | Pass | Pass | Medium | Pass | Agent and team hydration are separated by explicit helper contracts. |
| `autobyteus-web/services/runOpen` | Pass | Pass | Low | Pass | Team open coordinator owns team config reconstruction handoff. |
| `autobyteus-web/stores/runHistory*` | Pass | Pass | Medium | Pass | History entry/helper files have concrete responsibilities. |
| `autobyteus-web/types/workspace` / `types/agent` | Pass | Pass | Low | Pass | Shared reference and config types belong with their domain types. |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Workspace identity/activation backend boundaries stay under workspace ownership. |
| `autobyteus-server-ts/src/file-explorer` | Pass | Pass | Medium | Pass | Watcher/search/filesystem concerns remain bounded by lease and index responsibilities. |
| `autobyteus-server-ts/src/services/file-explorer-streaming` | Pass | Pass | Low | Pass | Session/streaming layer owns established sessions and leases, not raw pending socket state. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Cheap workspace identity | Pass | Pass | Pass | Pass | Reuse/extend `WorkspaceIdMappingStore`, path utils, and workspace GraphQL area. |
| Frontend workspace activation/reference state | Pass | Pass | Pass | Pass | Extend `WorkspaceStore`; no new global state owner needed. |
| Agent history hydration | Pass | Pass | N/A | Pass | Existing hydration service is the right owner. |
| Team history hydration | Pass | Pass | N/A | Pass | Existing team-specific hydration/open/helper files are the right owners. |
| Watcher live lifecycle | Pass | Pass | N/A | Pass | Existing file-explorer streaming and backend explorer boundaries remain appropriate. |
| Spawn diagnostics | Pass | Pass | Pass | Pass | Add only at spawn boundary, utility only if repeated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Workspace auto live-stream startup | No intended retention | Pass | Pass | Removed in favor of visible consumer registry. |
| Direct watcher start API usage | No intended retention | Pass | Pass | Replaced by watcher leases. |
| FileNameIndexer watcher startup | No intended retention | Pass | Pass | Replaced by snapshot/on-demand search indexing. |
| Mobile tools files tab | No intended retention | Pass | Pass | Removed from mobile-tools mode. |
| Eager standalone history workspace activation | No intended retention | Pass | Pass | Replaced by reference hydration. |
| Eager historical team member workspace activation | No intended retention | Pass | Pass | Replaced by historical member shell/reference builder. |
| Ambiguous team `firstWorkspaceId` handoff | No intended retention | Pass | Pass | Replaced by primary workspace reference. |
| History display using `WorkspaceInfo` tree payload | No intended retention | Pass | Pass | Replaced by `WorkspaceReference`. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend watcher lease and stream migration | Pass | Pass | Pass | Pass |
| Frontend visible-consumer migration | Pass | Pass | Pass | Pass |
| Historical standalone workspace reference migration | Pass | Pass | Pass | Pass |
| Historical team workspace reference migration | Pass | Pass | Pass | Pass |
| Workspace-dependent action activation migration | Pass | Pass | Pass | Pass |
| Validation sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend visible consumer | Yes | Pass | Pass | Pass | Good and bad shapes are concrete. |
| Backend watcher lease | Yes | Pass | Pass | Pass | Release obligation is clear. |
| Mobile visibility | Yes | Pass | Pass | Pass | Dedicated mobile explorer and mobile-tools no-files mode are clear. |
| WebSocket early close | Yes | Pass | Pass | Pass | Pending `connectPromise` cleanup example is concrete. |
| Historical standalone open | Yes | Pass | Pass | Pass | Reference path vs create/init/tree path is clear. |
| Config identity split | Yes | Pass | Pass | Pass | Example states `workspaceId` reference id and absent `WorkspaceStore.workspaces` is valid. |
| Historical team open/focus | Yes | Pass | Pass | Pass | Team member reference shells and sibling projection-only focus are clear. |
| Search without watcher | Yes | Pass | Pass | Pass | Snapshot/ripgrep alternative is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | The current design covers the original watcher descriptor-pressure failure, WebSocket cleanup races, slow historical standalone run opening, slow historical team/member run opening, display of workspace metadata before activation, and workspace-dependent action activation. | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation rework.

## Findings

None.

## Classification

- Overall classification: N/A — no blocking design-review findings in round 4.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must adapt the full migration sequence to the current branch state because parts of the watcher lifecycle refactor are already implemented from earlier rounds.
- Any UI gate that currently depends on `activeWorkspace` or `WorkspaceStore.workspaces[workspaceId]` must become reference-aware where it controls opening Files/Terminal/context from historical selections; the design’s `activeWorkspaceReference` and action-boundary activation rules cover this, but implementation needs targeted tests.
- Packaged Electron timing evidence remains essential because the user-observed slow history opening is build/runtime sensitive.
- Folder-scoped file explorer traversal can remain deferred only if history opening is fully decoupled from workspace creation/initialization/tree traversal.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Prior watcher/visibility/pending WebSocket findings remain resolved. The revised lazy historical workspace activation design now has sufficient data-model, ownership, team-hydration, file-mapping, removal, migration, and validation detail for implementation rework to proceed.
