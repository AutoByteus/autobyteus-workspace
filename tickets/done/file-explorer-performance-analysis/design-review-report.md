# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/design-spec.md`
- Current Review Round: 3
- Trigger: User-directed scope reduction removing `VAL-FE-006` semantic event reconciliation from this ticket and returning to the original Files -> Terminal performance root cause.
- Prior Review Round Reviewed: Round 2 (`Fail`) in this canonical report path.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Updated requirements, updated design spec, scope-reduction response, prior round 2 findings, investigation timing artifacts, implementation handoff, code review report, API/E2E validation report, and spot-checks of current watcher/event-stream design intent against current `FileSystemWatcher`, `EventBatcher`, and frontend reconnect-resync behavior.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design package handoff | N/A | 0 | Pass | No | Child-process watcher isolation, search close cancellation, event bounds, and diagnostics were ready for implementation. |
| 2 | `VAL-FE-006` semantic event reconciliation design-impact reroute | Round 1 had no unresolved findings. | 4 | Fail | No | Semantic reconciliation direction was plausible but not implementation-ready due owner, stream mapping, move proof, and stale-scope ambiguities. |
| 3 | Scope reduction removing semantic reconciliation from this ticket | `DR-FE-VAL006-001` through `DR-FE-VAL006-004` | 0 | Pass | Yes | Prior findings are resolved by removing the semantic subsystem from scope. The simplified design is ready for implementation continuation against the original root cause. |

## Reviewed Design Spec

Reviewed the updated design spec after user-directed scope reduction. The design now cleanly targets the measured root cause: parent-process chokidar `watcher.close()` synchronously blocking the backend event loop and delaying Terminal route acceptance. It explicitly keeps child-process watcher runtime isolation, logical parent close, generation/stale-message rejection, child force-kill timeout, search abort/detach, existing `WatchdogHandler`, lightweight `EventBatcher`, bounded queue overflow, and frontend reconnect/snapshot refresh. It explicitly removes `SemanticFileEventReconciler`, targeted invalidation/resync protocol, filesystem identity proofing, stale-scope gating, and semantic merge validation from this ticket.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design states performance bug fix plus targeted runtime-boundary refactor; semantic event reconciliation is deferred/removed. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design ties the fix to the measured ~21.36s synchronous chokidar close and Terminal route acceptance being serialized behind it. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is required for watcher runtime isolation and close/search safeguards; semantic event reconciliation is explicitly not in scope. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, file mapping, removal plan, lifecycle contract, migration sequence, and validation plan all support the child-runtime/logical-close target. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `DR-FE-VAL006-001` | High | Resolved by scope removal | The design no longer introduces `SemanticFileEventReconciler`; `FileSystemWatcher`, `WatchdogHandler`, pending unlink timers, and `EventBatcher` remain the existing event path. | No owner contradiction remains because there is no second semantic owner. |
| 2 | `DR-FE-VAL006-002` | High | Resolved by scope removal | The design preserves existing `FILE_SYSTEM_CHANGE` stream semantics and explicitly forbids new invalidation/resync message types in this ticket. | No per-session sequence or typed outcome mapping is needed. |
| 2 | `DR-FE-VAL006-003` | High | Resolved by scope removal | The design no longer adds new watcher-derived move/rename proofing rules; existing behavior is preserved and future identity-proof work is deferred. | This is acceptable because the user narrowed scope to the measured close-latency root cause. |
| 2 | `DR-FE-VAL006-004` | High | Resolved by scope removal | The design removes targeted invalidation/stale-scope gating from this ticket. | Parent tree stale-scope invariants are no longer part of the target behavior. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Live watcher startup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Child raw event to frontend update | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Files close / watcher release | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Watcher child physical close | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Files -> Terminal switch after fix | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Search refresh cancellation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Lightweight bounded event delivery | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend File Explorer domain | Pass | Pass | Pass | Pass | `WorkspaceFileExplorer` remains authoritative for tree, leases, file ops, path validation, search, and subscriber boundary. |
| Parent watcher controller | Pass | Pass | Pass | Pass | `FileSystemWatcher` owns generation validation, suppression, pending unlink timers, `WatchdogHandler` path, queues, and logical stop; no direct chokidar. |
| Watcher child runtime | Pass | Pass | Pass | Pass | Child owns native chokidar start/raw/error/physical stop only. |
| Search snapshot lifecycle | Pass | Pass | Pass | Pass | Controller extraction is appropriate for abort/detach safeguards. |
| File Explorer streaming | Pass | Pass | Pass | Pass | Existing stream/session behavior is preserved; reconnect refresh remains the failure/overflow recovery path. |
| Semantic event reconciliation | Pass | Pass | N/A | Pass | Correctly removed/deferred because it is not supported by the reproduced root-cause evidence. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Watcher runtime IPC protocol | Pass | Pass | Pass | Pass | Parent/child shared protocol remains necessary. |
| Runtime diagnostics | Pass | Pass | Pass | Pass | Structured lifecycle diagnostics are scoped to watcher runtime. |
| Workspace ignore strategy factory | Pass | Pass | Pass | Pass | Parent/child ignore consistency is useful and bounded. |
| Search abort/generation state | Pass | Pass | Pass | Pass | Controller owns the refresh generation/abort invariant. |
| Event batching | Pass | Pass | Pass | Pass | Existing `EventBatcher` remains lightweight and non-semantic. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WatcherRuntimeCommand` / `WatcherRuntimeMessage` | Pass | Pass | Pass | Pass | Pass | Discriminated parent/child protocol with explicit watcher/generation identity. |
| Raw child event payload | Pass | Pass | Pass | N/A | Pass | Raw watcher event remains distinct from frontend change DTOs. |
| Existing `FileSystemChangeEvent` payload | Pass | Pass | Pass | N/A | Pass | Existing `FILE_SYSTEM_CHANGE` contract is preserved. |
| Search refresh generation state | Pass | Pass | Pass | N/A | Pass | Internal to search controller. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Parent direct chokidar import/use | Pass | Pass | Pass | Pass | Replaced by child runtime. |
| Parent hot-path await of physical watcher close | Pass | Pass | Pass | Pass | Replaced by logical stop plus background child close/force-kill. |
| Investigation-only private chokidar instrumentation | Pass | Pass | Pass | Pass | Durable diagnostics use public counts/timings. |
| Production in-process chokidar fallback | Pass | Pass | Pass | Pass | Explicitly rejected. |
| Close waiting on uncancelable search refresh | Pass | Pass | Pass | Pass | Replaced by search abort/detach controller. |
| Prior semantic event-reconciliation proposal | Pass | Pass | Pass | Pass | Removed from this change; future metrics-backed design only. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/file-explorer/file-explorer.ts` | Pass | Pass | Pass | Pass | Main File Explorer owner; delegates watcher runtime and search lifecycle details. |
| `src/file-explorer/watcher/file-system-watcher.ts` | Pass | Pass | Pass | Pass | Parent watcher controller; no native chokidar. |
| `src/file-explorer/watcher/watchdog-handler.ts` | Pass | Pass | N/A | Pass | Existing tree-event adapter remains in scope. |
| `src/file-explorer/watcher/event-batcher.ts` | Pass | Pass | N/A | Pass | Lightweight composite batching only; no semantic reconciliation responsibility. |
| `src/file-explorer/watcher/runtime/*` | Pass | Pass | N/A | Pass | Child runtime and IPC responsibilities are separated. |
| `src/file-explorer/search-snapshot/workspace-search-snapshot-controller.ts` | Pass | Pass | N/A | Pass | Search close/abort owner. |
| `src/services/file-explorer-streaming/*` | Pass | Pass | N/A | Pass | Existing session/stream lifecycle and failure handling remain. |
| `autobyteus-web/stores/workspaceFileExplorerLiveActions.ts` | Pass | Pass | N/A | Pass | Reconnect/snapshot refresh behavior is the right frontend recovery owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceFileExplorer` | Pass | Pass | Pass | Pass | Public domain boundary remains authoritative. |
| `FileSystemWatcher` | Pass | Pass | Pass | Pass | Depends on runtime client, `WatchdogHandler`, and event batcher; must not import chokidar. |
| `WatcherRuntimeClient` / child runtime | Pass | Pass | Pass | Pass | Owns process/IPC only; no File Explorer tree mutation. |
| File Explorer streaming/session | Pass | Pass | Pass | Pass | Uses `WorkspaceFileExplorer` public lease/subscription API only. |
| Terminal | Pass | Pass | Pass | Pass | No File Explorer dependency. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceFileExplorer.acquireWatcherLease()` / `subscribe()` | Pass | Pass | Pass | Pass | Stream/session callers do not bypass to watcher runtime. |
| `FileSystemWatcher.start/stop/events/suppressPaths` | Pass | Pass | Pass | Pass | Parent controller encapsulates runtime client and event queues. |
| `WatcherRuntimeClient` | Pass | Pass | Pass | Pass | Child process details stay internal to watcher controller. |
| `WorkspaceSearchSnapshotController.search/close` | Pass | Pass | Pass | Pass | Search refresh cancellation remains behind File Explorer. |
| Frontend reconnect/snapshot refresh | Pass | Pass | Pass | Pass | Existing store recovery path remains explicit. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceFileExplorer.acquireWatcherLease()` | Pass | Pass | Pass | Low | Pass |
| `FileSystemWatcher.start()` / `stop()` / `events()` | Pass | Pass | Pass | Low | Pass |
| `WatcherRuntimeClient.start()` / `requestStop()` | Pass | Pass | Pass | Low | Pass |
| Child raw event message | Pass | Pass | Pass | Low | Pass |
| `WorkspaceSearchSnapshotController.search/refresh/close` | Pass | Pass | Pass | Low | Pass |
| Existing `FILE_SYSTEM_CHANGE` stream payload | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `file-explorer/watcher/runtime/` | Pass | Pass | Low | Pass | Correct child-runtime sub-area. |
| `file-explorer/watcher/file-system-watcher.ts` | Pass | Pass | Low | Pass | Parent controller remains in watcher area. |
| `file-explorer/watcher/event-batcher.ts` | Pass | Pass | Low | Pass | Existing delivery helper stays local and simple. |
| `file-explorer/search-snapshot/` | Pass | Pass | Low | Pass | Search lifecycle extraction is appropriate. |
| `services/file-explorer-streaming/` | Pass | Pass | Low | Pass | Existing transport/session owner. |
| `autobyteus-web/stores/` | Pass | Pass | Low | Pass | Frontend recovery stays in store live actions. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File Explorer domain ownership | Pass | Pass | N/A | Pass | Existing owner remains correct. |
| Native watcher isolation | Pass | Pass | Pass | Pass | New child runtime is justified by root-cause evidence. |
| Event delivery | Pass | Pass | N/A | Pass | Existing batcher/reconnect path is adequate for this narrowed ticket. |
| Search cancellation | Pass | Pass | Pass | Pass | Search snapshot controller is justified. |
| Semantic reconciliation | Pass | Pass | N/A | Pass | Properly deferred rather than added speculatively. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Parent in-process chokidar production path | No target retention | Pass | Pass | Clean-cut replacement remains explicit. |
| Worker-thread production alternative | No | Pass | Pass | Rejected. |
| In-process fallback feature flag | No | Pass | Pass | Rejected. |
| Prior semantic event subsystem | No | Pass | Pass | Removed from ticket scope by user direction. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Watcher runtime protocol/child runtime | Pass | Pass | Pass | Pass |
| Runtime client/registry and force-kill | Pass | Pass | Pass | Pass |
| `FileSystemWatcher` parent-controller conversion | Pass | Pass | Pass | Pass |
| Watcher lease logical-close semantics | Pass | Pass | Pass | Pass |
| Search snapshot extraction/abort | Pass | Pass | Pass | Pass |
| EventBatcher/reconnect preservation | Pass | Pass | Pass | Pass |
| Removed semantic scope | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Parent/child watcher ownership | Yes | Pass | Pass | Pass | Spine and forbidden shortcuts are clear. |
| Logical vs physical close | Yes | Pass | Pass | Pass | Hot-path behavior is explicit. |
| Event delivery scope reduction | Yes | Pass | Pass | Pass | The design clearly states what is retained and what is not added. |
| Search close/abort | Yes | Pass | N/A | Pass | Contract is actionable. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Semantic event reconciliation | Could be useful if future non-ignored event storms are proven. | Treat as separate metrics-backed follow-up, not current implementation. | Not blocking. |
| Built runtime child entrypoint | Incorrect path would make watcher unavailable. | Covered by validation plan. | Not blocking. |
| Child orphan cleanup | Prevents leaked watcher child processes. | Covered by force-kill/process-scan validation. | Not blocking. |

## Review Decision

- `Pass`: the scope-reduced design is ready for implementation continuation.

## Findings

None.

## Classification

N/A — no blocking architecture findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- If future profiling shows significant non-ignored event storms, semantic reconciliation should be designed as a separate focused ticket with new evidence and acceptance criteria.
- Event queue overflow still intentionally uses fail-close/reconnect/snapshot refresh rather than targeted invalidation; API/E2E must keep validating that recovery path.
- Built packaged/runtime child entrypoint and child orphan cleanup remain important validation targets.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Prior round 2 findings are resolved by removing the semantic reconciliation expansion from this ticket. The design is again focused on the measured Files -> Terminal root cause and is architecture-ready for implementation continuation.
