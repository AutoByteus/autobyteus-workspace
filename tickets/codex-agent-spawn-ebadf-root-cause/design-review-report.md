# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/investigation-notes.md`
- Upstream Root-Cause Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/root-cause-report.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-spec.md`
- Current Review Round: 2
- Trigger: Retry after round 1 Design Impact findings AR-001 and AR-002.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read the revised design spec and prior design review report; rechecked relevant current code paths in the task worktree for the previously failed areas: `autobyteus-web/components/layout/WorkspaceMobileLayout.vue`, `RightSideTabs.vue`, `WorkspaceDesktopLayout.vue`, `autobyteus-server-ts/src/api/websocket/file-explorer.ts`, and `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts`. Requirements and investigation/root-cause artifacts remain supporting context.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 2 | Fail | No | AR-001 mobile hidden `RightSideTabs` path and AR-002 pending WebSocket close race needed design updates. |
| 2 | Retry after revised design | AR-001, AR-002 | 0 | Pass | Yes | Prior findings are resolved; design is ready for implementation. |

## Reviewed Design Spec

The revised spec keeps the demand-driven file-explorer watcher direction and adds explicit coverage for the two round 1 gaps:

- Mobile file-explorer visibility: the dedicated mobile `explorer` panel is the only mobile live file-explorer surface; mobile-tools `RightSideTabs` must run in no-files/mobile-tools mode, filter `files`, disable auto-switch-to-files behavior, and make `FileExplorerLayout` unreachable.
- Backend pending WebSocket cleanup: `api/websocket/file-explorer.ts` owns raw socket/pending-connect cleanup before a session id exists; `FileExplorerStreamHandler.connect()` owns atomic lease/session setup and cleanup on setup/send failure; late session ids after early close are disconnected.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec explicitly classifies the work as Bug Fix + Refactor + Performance. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification remains Boundary Or Ownership Issue / Missing Invariant, backed by descriptor pressure, watcher-pressure reproduction, and code paths starting watchers from workspace fetch/indexing rather than visible demand. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is explicit; full workspace cache eviction is intentionally deferred with rationale that watcher descriptors are the direct `spawn EBADF` cause. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Concrete sections now cover frontend visibility ownership, backend watcher leases, pending route cleanup, snapshot/search split, removals, migration, and validation. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Revised design adds the mobile `RightSideTabs` path to current-state read, target decision, removal plan, subsystem allocation, file mapping, dependency rules, examples, and validation. It requires mobile-tools/no-files mode so `files` is filtered and `FileExplorerLayout` is unreachable outside the dedicated mobile explorer panel. | Meets AC-004 ownership intent. |
| 1 | AR-002 | Medium | Resolved | Revised design adds DS-007, route/handler ownership, pending connection state (`closed`, `connectPromise`, `sessionId`), early-close late-session disconnect, handler atomic setup cleanup, idempotent disconnect, and backend validation for close-before-connect-resolves and setup failure after lease acquisition. | Lifecycle race is now assigned to concrete owners. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace load without live monitoring | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Visible file explorer opens stream and refreshes snapshot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Active watcher event to frontend state | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Backend stream session to watcher lease lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Search/folder/file operation without watcher | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Spawn failure diagnostics | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | WebSocket attach / early close cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend workspace state | Pass | Pass | Pass | Pass | `WorkspaceStore` remains the right owner for per-workspace visible consumer counts and one stream per workspace. |
| Frontend file explorer UI/layouts | Pass | Pass | Pass | Pass | Desktop collapsed-panel ownership, dedicated mobile explorer ownership, and mobile-tools no-files ownership are all explicit. |
| Frontend stream transport | Pass | Pass | Pass | Pass | `FileExplorerStreamingService` remains transport-only. |
| Backend route/streaming/session | Pass | Pass | Pass | Pass | Route owns pre-session pending socket lifecycle; handler/session own lease/session setup and teardown. |
| Backend local file explorer | Pass | Pass | Pass | Pass | `LocalFileExplorer` is the watcher lease owner. |
| Backend search/index | Pass | Pass | Pass | Pass | Indexing/search no longer own persistent watchers by default. |
| Runtime diagnostics | Pass | Pass | Pass | Pass | Spawn boundary owns EBADF/EMFILE diagnostics. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend watcher lease shape | Pass | Pass | Pass | Pass | File-explorer-specific lease shape is appropriate. |
| Frontend visible consumer key | Pass | Pass | Pass | Pass | Consumer identity is not overloaded with workspace id. |
| Mobile right-tabs mode | Pass | Pass | Pass | Pass | Inline prop/mode in `RightSideTabs` is sufficient unless reuse grows. |
| Pending route connection context | Pass | Pass | Pass | Pass | Local route state is correctly not promoted into a generic WebSocket framework. |
| Spawn diagnostic formatter | Pass | Pass | Pass | Pass | Optional shared helper only if multiple spawn sites use it. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WatcherLease` | Pass | Pass | Pass | Pass | Pass | Minimal release/id/reason shape remains tight. |
| Frontend consumer id/key | Pass | Pass | Pass | Pass | Pass | Generated/component-surface identity is clear. |
| Mobile right-tabs mode | Pass | Pass | Pass | Pass | Pass | One explicit mode controls whether file tab can exist. |
| Pending route context | Pass | Pass | Pass | Pass | Pass | Local `closed`/`connectPromise`/`sessionId` state has one meaning per field. |
| Stream connection state vs consumer registry | Pass | Pass | Pass | Pass | Pass | Transport state and visible consumer counts remain separated. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace-store auto stream connection from create/fetch/register | Pass | Pass | Pass | Pass | Removed in this change. |
| Mobile tools `RightSideTabs` `files` tab / `FileExplorerLayout` path | Pass | Pass | Pass | Pass | Removed/suppressed in this change via mobile-tools no-files mode. |
| `FileNameIndexer.start()` live watcher startup | Pass | Pass | Pass | Pass | Removed in this change. |
| General public `ensureWatcherStarted()` usage | Pass | Pass | Pass | Pass | Replaced by watcher lease API. |
| Session close without generator cancellation | Pass | Pass | Pass | Pass | Async close/generator cancellation is in scope. |
| Route close handler that returns while `sessionId` is null | Pass | Pass | Pass | Pass | Replaced with pending connection cleanup. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Pass | Pass | Visible consumer registry and stream ownership fit existing workspace tree state owner. |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Pass | Pass | N/A | Pass | Visible consumer entrypoint is clear. |
| `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Pass | Pass | N/A | Pass | Desktop collapse visibility owner is explicit. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Pass | Pass | N/A | Pass | Context-aware rendering/no-files mode is a concrete responsibility. |
| `autobyteus-web/components/layout/WorkspaceMobileLayout.vue` | Pass | Pass | N/A | Pass | Dedicated explorer panel and mobile-tools no-files context are both owned here. |
| `autobyteus-web/components/skills/SkillDetail.vue` | Pass | Pass | N/A | Pass | Embedded visible explorer path remains valid. |
| `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | Pass | Pass | N/A | Pass | Transport-only. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Pass | Pass | Pass | Pass | Correct owner for pending socket/late-session cleanup before session id exists. |
| `autobyteus-server-ts/src/file-explorer/base-file-explorer.ts` | Pass | Pass | Pass | Pass | Correct abstract lease contract location. |
| `autobyteus-server-ts/src/file-explorer/local-file-explorer.ts` | Pass | Pass | Pass | Pass | Correct watcher lifecycle owner. |
| `autobyteus-server-ts/src/file-explorer/file-explorer.ts` | Pass | Pass | N/A | Pass | Correct concrete watcher holder. |
| `autobyteus-server-ts/src/file-explorer/watcher/file-system-watcher.ts` | Pass | Pass | N/A | Pass | Correct chokidar adapter/awaited close owner. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-stream-handler.ts` | Pass | Pass | Pass | Pass | Atomic lease/session setup and teardown responsibility is now explicit. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session.ts` | Pass | Pass | Pass | Pass | Correct event-generator cancellation owner. |
| `autobyteus-server-ts/src/services/file-explorer-streaming/file-explorer-session-manager.ts` | Pass | Pass | Pass | Pass | Correct session registry/awaited close owner. |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Pass | Pass | N/A | Pass | Shallow init/on-demand search responsibilities are clear. |
| `autobyteus-server-ts/src/file-explorer/file-name-indexer.ts` | Pass | Pass | Pass | Pass | Snapshot index owner, not watcher owner. |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Pass | Pass | N/A | Pass | Correct spawn diagnostics site. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend visible components -> `WorkspaceStore` | Pass | Pass | Pass | Pass | Components declare interest through store APIs. |
| `WorkspaceMobileLayout` / `WorkspaceDesktopLayout` -> `RightSideTabs` mode/visibility | Pass | Pass | Pass | Pass | Layouts own visibility context; `RightSideTabs` owns rendering guard. |
| `WorkspaceStore` -> `FileExplorerStreamingService` | Pass | Pass | Pass | Pass | Store owns policy; service owns transport. |
| WebSocket route -> stream handler/session lifecycle | Pass | Pass | Pass | Pass | Route calls connect/disconnect only; it does not touch watcher leases. |
| Backend stream handler -> `BaseFileExplorer.acquireWatcherLease` | Pass | Pass | Pass | Pass | Handler uses authoritative file-explorer boundary. |
| `FileNameIndexer` -> snapshot tree/search | Pass | Pass | Pass | Pass | Watcher startup is forbidden by default. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession` | Pass | Pass | Pass | Pass | Frontend live-session authority is clear. |
| `RightSideTabs` context/mode prop | Pass | Pass | Pass | Pass | Prevents mobile tools from bypassing mobile explorer ownership. |
| `api/websocket/file-explorer.ts` pending cleanup context | Pass | Pass | Pass | Pass | Route owns pre-session socket lifecycle without reaching into watcher internals. |
| `BaseFileExplorer.acquireWatcherLease` / `LocalFileExplorer` | Pass | Pass | Pass | Pass | Backend watcher authority is clear. |
| `FileExplorerStreamHandler` atomic setup | Pass | Pass | Pass | Pass | Handler/session own lease/session setup cleanup. |
| GraphQL file explorer resolver | Pass | Pass | Pass | Pass | Request/response operations remain watcher-free. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceStore.acquireFileExplorerLiveSession(workspaceId, consumerId)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceStore.releaseFileExplorerLiveSession(workspaceId, consumerId)` | Pass | Pass | Pass | Low | Pass |
| `RightSideTabs` mode/no-files prop | Pass | Pass | Pass | Low | Pass |
| `BaseFileExplorer.acquireWatcherLease(reason)` | Pass | Pass | Pass | Low | Pass |
| `WatcherLease.release()` | Pass | Pass | Pass | Low | Pass |
| Route pending connection cleanup | Pass | Pass | Pass | Low | Pass |
| `FileExplorerStreamHandler.connect(connection, workspaceId)` | Pass | Pass | Pass | Low | Pass |
| `folderChildren(workspaceId, folderPath)` | Pass | Pass | Pass | Low | Pass |
| `searchFiles(workspaceId, query)` | Pass | Pass | Pass | Low | Pass |
| `FileExplorerStreamingService.connect(workspaceId)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/workspace.ts` | Pass | Pass | Medium | Pass | Existing store breadth is acceptable for this bounded refactor. |
| `autobyteus-web/components/layout/*` | Pass | Pass | Medium | Pass | Layout files own visibility and right-tabs context. |
| `autobyteus-web/services/fileExplorerStreaming` | Pass | Pass | Low | Pass | Transport. |
| `autobyteus-server-ts/src/api/websocket/file-explorer.ts` | Pass | Pass | Low | Pass | Raw socket and pending-connect cleanup belong at the route boundary. |
| `autobyteus-server-ts/src/services/file-explorer-streaming` | Pass | Pass | Low | Pass | Established stream sessions and lease/session setup belong here. |
| `autobyteus-server-ts/src/file-explorer` | Pass | Pass | Medium | Pass | Good local filesystem/domain boundary. |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Workspace lifecycle does not own watcher consumer policy. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend live stream ownership | Pass | Pass | N/A | Pass | Extend `WorkspaceStore`. |
| Mobile/desktop layout visibility | Pass | Pass | N/A | Pass | Extend existing layout and right-tabs components. |
| WebSocket transport | Pass | Pass | N/A | Pass | Reuse `FileExplorerStreamingService`. |
| Backend route pending cleanup | Pass | Pass | N/A | Pass | Extend existing file-explorer websocket route. |
| Backend stream sessions | Pass | Pass | N/A | Pass | Extend existing streaming subsystem. |
| Backend watcher lifecycle | Pass | Pass | N/A | Pass | Extend `LocalFileExplorer` / `FileExplorer`. |
| Filename index | Pass | Pass | N/A | Pass | Extend/refine `FileNameIndexer`. |
| Runtime diagnostics | Pass | Pass | N/A | Pass | Extend Codex spawn boundary or shared spawn helper if repeated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Workspace-load stream auto-connect | No | Pass | Pass | Removed cleanly. |
| Mobile tools duplicate file-explorer tab/path | No | Pass | Pass | Suppressed by mobile-tools no-files mode. |
| Route session-id-only cleanup | No | Pass | Pass | Replaced by pending-connect cleanup. |
| `ensureWatcherStarted()` public use | No | Pass | Pass | Replacement is lease API. |
| `FileNameIndexer.start()` live monitoring | No | Pass | Pass | Snapshot/on-demand target is clean. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend lease foundation | Pass | Pass | Pass | Pass |
| Backend streaming and route pending cleanup | Pass | Pass | Pass | Pass |
| Backend implicit watcher removal | Pass | Pass | Pass | Pass |
| Frontend live-consumer migration | Pass | Pass | Pass | Pass |
| Diagnostics | Pass | Pass | Pass | Pass |
| Validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend visible consumer | Yes | Pass | Pass | Pass | Clear mount/release example. |
| Backend watcher lease | Yes | Pass | Pass | Pass | Clear try/finally lease example. |
| Mobile visibility | Yes | Pass | Pass | Pass | Now covers both dedicated explorer `v-if` and mobile-tools no-files `RightSideTabs`. |
| WebSocket early close | Yes | Pass | Pass | Pass | Route cleanup pseudocode is concrete enough for implementation. |
| Search without watcher | Yes | Pass | Pass | Pass | Clear snapshot/ripgrep path. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Full workspace cache eviction | Cached trees may still consume memory. | No action required for this task; watcher descriptor lifecycle is the direct `spawn EBADF` fix. Track only if memory pressure becomes a separate issue. | Accepted residual risk |
| Snapshot/live event ordering during open | Open-time races can leave a stale tree if buffering is incorrect. | Implement the specified buffering/refresh state and cover with tests where practical. | Non-blocking implementation risk |
| Packaged Electron/macOS descriptor behavior | The original failure depends on macOS/Electron resource state. | Run the local descriptor/spawn probe and original Codex scenario in validation. | Non-blocking validation risk |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no unresolved findings in round 2.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Full workspace cache eviction is deferred; this is acceptable because watcher descriptors are the immediate `spawn EBADF` root cause.
- Descriptor-count and Codex activation checks require local/macOS executable validation after implementation.
- Search/index freshness after removing live indexing should be watched during implementation, especially when choosing refresh-on-query versus ripgrep fallback behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Prior round findings AR-001 and AR-002 are resolved. The design now has clear frontend visibility ownership, backend watcher lease ownership, pending WebSocket cleanup ownership, removal scope, and validation coverage. Ready for implementation.
