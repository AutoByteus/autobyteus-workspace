# Proposed Design Document

## Design Version

- Current Version: `v6`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Added hard-delete concept (history row remove + disk memory purge) with frontend icon entrypoint and backend mutation proposal. | 1 |
| v2 | Round 1 findings | Added active-run guard contract and explicit irreversible delete semantics. | 1 |
| v3 | Round 2 findings | Added local-context cleanup requirements and focused test inventory. | 2 |
| v4 | Round 1 (this cycle) findings | Added explicit run-history index removal API (`removeRow`) and stale-index reconciliation rules. | 1 |
| v5 | Round 2 (this cycle) findings | Added strict runId/path safety contract and clarified UI delete-eligibility boundaries (history+inactive only). | 2 |
| v6 | Round 4 deep-review findings | Refined runId safety from separator blacklist wording to resolved-path containment rule to keep deletion safe without assuming strict runId character policy. | 4 |

## Summary

Add a small delete icon for non-active history runs that permanently removes the selected run from history and deletes its on-disk memory folder (`memory/agents/<runId>`). The operation is irreversible, blocked for active runs, and does not affect draft (`temp-*`) rows.

## Goals

- Provide a small per-row delete icon in history tree for non-active persisted runs.
- Permanently remove run memory files from disk when user confirms delete.
- Remove deleted run from left history list without full-page reload.
- Reject deletion of active runs at backend boundary.
- Keep clear separation of concerns between runtime termination (`agentRunStore`) and historical hard-delete (`runHistoryStore`).

## Non-Goals

- Deleting active runs in one click (must terminate first).
- Soft-delete/trash/recycle-bin behavior.
- Recovering deleted memory folders.
- Deleting draft (`temp-*`) client-only runs through this action.
- Team run history deletion.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; no dual behavior between soft-delete and hard-delete.`
- Required action: no compatibility flags, no hidden soft-delete fallback branch, and no duplicate legacy delete API.

## Requirements And Use Cases

- UC-001: User clicks delete on an inactive persisted run and confirms. Row disappears and run memory folder is removed.
- UC-002: User attempts to delete an active run. Backend rejects with clear message; row remains unchanged.
- UC-003: User deletes a run currently opened as offline context. Local context and selection state are cleaned up.
- UC-004: Backend delete fails (IO/path/unknown). UI surfaces error toast and row remains.
- UC-005: Repeated clicks are guarded by per-run delete-in-flight lock.
- UC-006: User cancels confirmation. No backend call is made.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Left history rows are rendered in `WorkspaceAgentRunsTreePanel`; active rows currently expose terminate action only. | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onTerminateRun`, `onSelectRun` | None |
| Current Naming Conventions | Run-history GraphQL operations are grouped under `runHistoryQueries` + `runHistoryMutations`; run lifecycle teardown is in `agentRunStore`; history projection stays in `runHistoryStore`. | `autobyteus-web/graphql/mutations/runHistoryMutations.ts`, `autobyteus-web/stores/agentRunStore.ts`, `autobyteus-web/stores/runHistoryStore.ts` | None |
| Impacted Modules / Responsibilities | Run history API boundary is `RunHistoryResolver`; persistence and grouping logic is `RunHistoryService`; index persistence is `RunHistoryIndexStore`; memory files live in `memory/agents/<runId>`. | `autobyteus-server-ts/src/api/graphql/types/run-history.ts`, `autobyteus-server-ts/src/run-history/services/run-history-service.ts`, `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts`, `autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts` | None |
| Data / Persistence / External IO | Run list reads from `run_history_index.json`; run content reads from per-run memory files; list rebuild currently scans `memory/agents/*`. | `run-history-index-store.ts:listRows`, `run-history-service.ts:rebuildIndexFromDisk`, `memory-file-store.ts:listAgentDirs` | None |

## Current State (As-Is)

- History rows can be opened and active rows can be terminated.
- No explicit run-history delete API exists in frontend or backend.
- Backend termination (`terminateAgentInstance`) marks history as IDLE but does not delete memory folder.
- `runHistoryStore` has no delete action and no local cleanup path for hard-delete.

## Target State (To-Be)

- Inactive history rows (`run.source === 'history' && !run.isActive`) show a small delete icon.
- Clicking delete opens confirmation; cancel exits with no side effects.
- Confirmed delete calls new GraphQL mutation `deleteRunHistory(runId)`.
- Backend delete contract:
  - rejects active runs,
  - rejects invalid/non-safe run IDs,
  - removes `memory/agents/<runId>` recursively,
  - removes run row from `run_history_index.json` (or leaves absent if already missing),
  - returns structured success/failure message.
- Frontend success path removes local context/selection artifacts and refreshes tree.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | same | Add `deleteRunHistory(runId)` mutation + result payload object. | GraphQL API boundary | Return `success` + `message`. |
| C-002 | Modify | `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | same | Add hard-delete orchestration (active guard + resolved-path containment safety + disk remove + index row remove). | backend service + IO | Authoritative delete owner. |
| C-003 | Modify | `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts` | same | Add `removeRow(runId)` atomic queued write API. | persistence boundary | Avoid full rebuild on each delete. |
| C-004 | Modify | `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | same | Add `DeleteRunHistory` mutation document. | frontend GraphQL client | Keep naming aligned with resolver. |
| C-005 | Modify | `autobyteus-web/stores/runHistoryStore.ts` | same | Add `deleteRun(runId)` action with mutation + local context/selection cleanup + quiet refresh. | frontend state boundary | No runtime teardown responsibility. |
| C-006 | Modify | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Add tiny delete icon + confirm + per-run lock + toast feedback. | UI interaction | Only for inactive history rows. |
| C-007 | Modify | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | same | Add delete icon visibility + cancel + success/failure behavior tests. | test coverage | Must verify no row-select side effect. |
| C-008 | Modify | `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | same | Add delete action tests (success/failure/local cleanup). | test coverage | Includes selected-run cleanup assertions. |
| C-009 | Modify | `autobyteus-server-ts/tests/unit/api/graphql/types/run-history-resolver.test.ts` | same | Add resolver delete mutation delegation tests. | test coverage | success + failure propagation. |
| C-010 | Modify | `autobyteus-server-ts/tests/unit/run-history/run-history-service.test.ts` | same | Add service delete tests (inactive success, active reject, invalid id reject, missing dir/index handling). | test coverage | Assert fs side effects + index behavior. |
| C-011 | Modify | `autobyteus-server-ts/tests/unit/run-history/run-history-index-store.test.ts` | same | Add `removeRow` behavior tests. | test coverage | row deletion idempotency. |

## Architecture Overview

`WorkspaceAgentRunsTreePanel` delete icon -> `runHistoryStore.deleteRun(runId)` -> GraphQL `deleteRunHistory` -> `RunHistoryResolver.deleteRunHistory` -> `RunHistoryService.deleteRunHistory` -> validate run state + validate resolved deletion target remains under `<memoryDir>/agents` and is not agents root + remove `memory/agents/<runId>` + `RunHistoryIndexStore.removeRow(runId)` -> return mutation result -> frontend cleanup (`resumeConfigByRunId`, `selectedRunId`, `agentContextsStore.removeInstance`, selection clear when needed) -> `refreshTreeQuietly`.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Add/Modify | GraphQL boundary for run-history hard delete | `deleteRunHistory(runId)` | runId -> success/message | `RunHistoryService` |
| `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | Modify | Authoritative hard-delete rules and IO execution | `deleteRunHistory(runId)` | runId -> `{ success, message }` | `AgentInstanceManager`, `RunHistoryIndexStore`, `MemoryFileStore`, `fs/promises` |
| `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts` | Modify | Persistent row removal API with write queue semantics | `removeRow(runId)` | runId -> void | local index file |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | Modify | GraphQL operation documents | `DeleteRunHistory` | gql doc | Apollo client |
| `autobyteus-web/stores/runHistoryStore.ts` | Modify | Frontend delete orchestration and local state cleanup | `deleteRun(runId)` | runId -> boolean | Apollo mutate, selection/context stores |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | UI action dispatch and user confirmations | `onDeleteRun(runId)` | click -> delete action | runHistoryStore, `useToasts` |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| GraphQL mutation | N/A | `deleteRunHistory` | Domain clear and consistent with resolver/service scope. | Avoid ambiguous `deleteRun`. |
| Backend service API | N/A | `runHistoryService.deleteRunHistory(runId)` | Keeps delete semantics in run-history domain boundary. | Distinct from runtime terminate APIs. |
| Frontend store API | N/A | `runHistoryStore.deleteRun(runId)` | UI-friendly action name under existing store concern. | Hard-delete semantics documented in code comment/title strings. |
| Index store API | N/A | `removeRow(runId)` | Simple persistence intent, complements `upsertRow`/`updateRow`. | Queue-safe write path. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `RunHistoryService` | `AgentInstanceManager`, index store, memory store, fs | `RunHistoryResolver` | Medium | Keep all delete guards in service so resolver/UI cannot bypass safety checks. |
| `RunHistoryIndexStore` | index file IO | `RunHistoryService` | Low | Add focused API (`removeRow`) instead of service editing index file directly. |
| `runHistoryStore` | Apollo mutate, contexts/selection stores | history panel | Medium | Centralize local cleanup in one action to avoid duplicated UI cleanup logic. |
| `WorkspaceAgentRunsTreePanel` | runHistoryStore, toasts | left panel shell | Low | UI dispatch only; no direct GraphQL or file semantics in component. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| N/A | N/A | This is a net-new hard-delete flow; no legacy delete path to preserve. | N/A |

## Data Models (If Needed)

- New GraphQL mutation result payload:
  - `success: boolean`
  - `message: string`
- No persistence schema version bump needed; `run_history_index.json` keeps same schema and row structure.

## Error Handling And Edge Cases

- Active run deletion returns `success=false` with message: terminate first.
- Invalid runId/path-safety failure returns `success=false`; no file deletion attempted.
- Missing folder with existing index row: treated as success after index row removal.
- Folder exists with missing index row: treated as success after folder removal (idempotent cleanup).
- Mutation/network failure must not mutate frontend state as success.
- Double-click delete is prevented by per-run in-flight lock in panel component.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Delete inactive persisted run and purge disk memory | Yes | N/A | Yes | UC-001 |
| UC-002 | Active run deletion attempt rejected | Yes | N/A | Yes | UC-002 |
| UC-003 | Delete currently opened offline run context | Yes | N/A | Yes | UC-003 |
| UC-004 | Backend delete failure keeps row and shows error | Yes | N/A | Yes | UC-004 |
| UC-005 | Per-run lock prevents duplicate delete dispatch | Yes | N/A | N/A | UC-005 |
| UC-006 | User cancels confirmation | Yes | N/A | N/A | UC-006 |

## Performance / Security Considerations

- Performance:
  - Prefer `RunHistoryIndexStore.removeRow` over full `rebuildIndexFromDisk` for normal delete path.
  - Keep tree refresh best-effort (`refreshTreeQuietly`) and scoped to existing fetch limit.
- Security:
  - Never pass unchecked `runId` directly to recursive delete.
  - Resolve `targetPath = path.resolve(<memoryDir>/agents, runId)` and validate it stays under `agentsRoot = path.resolve(<memoryDir>/agents)`.
  - Reject deletion when `targetPath === agentsRoot` (never delete root agents folder).
  - Reject empty `runId` and traversal-like payloads that escape `agentsRoot`; do not rely on separator blacklists alone.

## Migration / Rollout (If Needed)

- No data migration required.
- Deploy backend mutation + service first (or together), then frontend icon/action.
- If frontend deploys first by mistake, mutation failure path already maps to visible error toast.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | resolver unit tests | Planned |
| C-002 | T-002 | service unit tests | Planned |
| C-003 | T-003 | index-store unit tests | Planned |
| C-004 | T-004 | compile + store tests | Planned |
| C-005 | T-005 | store unit tests | Planned |
| C-006 | T-006 | panel unit tests + manual UX check | Planned |
| C-007 | T-007 | panel vitest | Planned |
| C-008 | T-008 | store vitest | Planned |
| C-009 | T-009 | resolver vitest | Planned |
| C-010 | T-010 | service vitest | Planned |
| C-011 | T-011 | index-store vitest | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-13 | Review Round 1 | Full index rebuild on delete was unnecessary and widened IO blast radius. | Added index-store row removal API (`C-003`) and removed rebuild-from-delete default path. | Applied |
| 2026-02-13 | Review Round 2 | Deletion path did not explicitly state runId/path safety invariants. | Added path-safety contract in service requirements and security section. | Applied |
| 2026-02-13 | Review Round 4 | Prior wording implied separator blacklist enforcement, which may over-constrain valid historical IDs and is weaker as a primary safety model. | Updated safety contract to resolved-path containment + root-delete guard. | Applied |

## Open Questions

- None blocking for implementation.
