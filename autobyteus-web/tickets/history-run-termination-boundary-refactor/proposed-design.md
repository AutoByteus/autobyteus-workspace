# Proposed Design Document

## Design Version

- Current Version: `v6`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Added terminate button + store action concept and boundary map. | 1 |
| v2 | Round 1 findings | Moved termination orchestration ownership from `runHistoryStore` to `agentRunStore`. | 1 |
| v3 | Round 2 findings | Added strict GraphQL business-result validation (`success` check). | 2 |
| v4 | Round 4 hardening | Changed persisted termination to backend-confirmed teardown; unified `closeAgent` terminate path through `terminateRun`; removed stale test mock. | 4 |
| v5 | Round 5 deep review | Documented residual non-blocking gaps: user-facing error feedback and missing temp-run terminate unit test coverage. | 5 |
| v6 | Implementation follow-up completion | Implemented user-facing terminate failure toast using shared `useToasts`; added explicit temp-run terminate unit test coverage. | N/A |

## Summary

Run termination now follows runtime-owned orchestration with confirmed backend success before local teardown for persisted runs, while keeping historical rows in the left panel.

## Goals

- Keep run rows visible after termination (history-first UX).
- Show live status indicator only for active runs.
- Provide a small per-row terminate control for active runs.
- Enforce clean separation of concerns:
  - `runHistoryStore`: projection/state for history tree.
  - `agentRunStore`: runtime lifecycle + termination orchestration.
- Prevent false-success UI updates when backend termination returns `success: false`.
- Prevent local/runtime teardown for persisted runs when backend termination fails.
- Use existing shared toast pattern (`useToasts`) for terminate failure UX.

## Non-Goals

- Redesign of right-side running panel behavior.
- Team run termination redesign.
- Historical data retention policy changes beyond current tree refresh behavior.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `runHistoryStore.terminateRun` orchestration path and duplicate terminate logic in `closeAgent`.

## Requirements And Use Cases

- UC-001: User terminates an active persisted run from left history panel; row remains and status dot disappears.
- UC-002: User terminates an active draft run; row remains and status dot disappears with no backend call.
- UC-003: Backend termination returns business failure; UI must not falsely mark run as terminated.
- UC-004: `closeAgent(..., { terminate: true })` must not remove context when backend termination fails.
- UC-005: Terminate failure is visible to user via global toast notification.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Left panel run rows render from history tree projection and dispatch terminate action. | `components/AppLeftPanel.vue`, `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | None |
| Current Naming Conventions | Store actions are verb-style and concern-scoped (`markRunAsInactive`, `closeAgent`, `terminateRun`). | `stores/runHistoryStore.ts`, `stores/agentRunStore.ts` | None |
| Impacted Modules / Responsibilities | Runtime termination ownership is now in `agentRunStore`; history store is projection-oriented. | `stores/agentRunStore.ts:terminateRun`, `stores/runHistoryStore.ts` | None |
| Data / Persistence / External IO | Termination uses GraphQL `terminateAgentInstance`; history projection updates local + quiet refresh. | `graphql/mutations/agentMutations.ts`, `stores/runHistoryStore.ts:refreshTreeQuietly` | None |

## Current State (As-Is)

- Left panel supports selecting runs, creating draft runs, and terminating active runs.
- Termination from left panel calls `agentRunStore.terminateRun`.
- Persisted-run local teardown happens only after backend confirms success.
- `closeAgent(..., { terminate: true })` reuses `terminateRun` and now preserves context on failure.

## Target State (To-Be)

- Preserve current ownership boundaries and confirmed-termination sequencing.
- Keep `runHistoryStore` free of runtime lifecycle teardown.
- Keep single termination authority in `agentRunStore` for both panel terminate and close-with-terminate flows.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | `stores/agentRunStore.ts` | `stores/agentRunStore.ts` | Introduce `terminateRun` runtime owner action. | runtime termination path | Includes strict mutation result validation. |
| C-002 | Remove | `stores/runHistoryStore.ts` | `stores/runHistoryStore.ts` | Remove orchestration from history store. | store boundary | Keep projection helpers only. |
| C-003 | Modify | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Wire terminate button to runtime store. | left panel interaction | Preserve row; active-only status dot. |
| C-004 | Modify | `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | same | Align tests with new owner store. | test coverage | Validate no accidental run selection on terminate click. |
| C-005 | Modify | `stores/agentRunStore.ts:closeAgent` | same | Remove duplicate termination logic; delegate to `terminateRun`. | runtime termination and close flow | Prevent remove-on-failed-terminate regression. |
| C-006 | Remove | `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | same | Remove stale `runHistoryStoreMock.terminateRun` mock property. | test hygiene | Eliminates dead mock path. |
| C-007 | Modify | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Add user-facing terminate failure toast via shared composable. | left panel feedback UX | Uses `useToasts().addToast(...)`. |
| C-008 | Modify | `stores/__tests__/agentRunStore.spec.ts` | same | Add explicit temp-run terminate unit test coverage. | test coverage | Prevent regressions in draft terminate path. |

## Architecture Overview

`WorkspaceAgentRunsTreePanel` -> `agentRunStore.terminateRun` -> (backend terminate for persisted runs) -> local runtime teardown -> `runHistoryStore.markRunAsInactive` + `refreshTreeQuietly`.

`closeAgent(..., { terminate: true })` -> `agentRunStore.terminateRun` -> on success remove instance; on failure keep instance.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `stores/agentRunStore.ts` | Modify | Runtime orchestration owner for terminate/close flows | `terminateRun(runId)`, `closeAgent(id,{terminate})` | runId + options -> boolean/side effects | Apollo mutate, contexts store, runHistory store |
| `stores/runHistoryStore.ts` | Modify/Remove | History tree projection and persistence sync | `markRunAsInactive`, `getTreeNodes`, `fetchTree` | projection snapshots | query layer, projection utils |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | UI event routing for history run rows | `onTerminateRun` | click -> action dispatch | `agentRunStore`, `runHistoryStore` |
| `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Modify/Remove | Contract tests + test hygiene | test cases | assertions | mocked stores |
| `composables/useToasts.ts` | Reuse | Shared global toast mechanism | `addToast(message, type)` | message/type -> transient notification | `ToastContainer` in app shell |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API | `runHistoryStore.terminateRun` | removed | Wrong ownership boundary. | Runtime owner API retained. |
| API | `agentRunStore.terminateRun` | unchanged | Correct runtime ownership. | Reused by `closeAgent` terminate flow. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `runHistoryStore` | Apollo query + projection utilities | left panel, open-run flows | Low | Projection-only write APIs; no teardown logic. |
| `agentRunStore` | contexts store + Apollo mutation + runHistoryStore updates | workspace views + left panel terminate + closeAgent terminate | Medium | Single terminate owner API; avoid duplicated mutation logic. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| `runHistoryStore.terminateRun` | Delete action and mutation import from history store. | No compatibility shim retained. | Targeted tests + source scan. |
| Duplicate close terminate logic | Delegate `closeAgent` terminate path to `terminateRun`. | No dual-path logic retained. | Targeted tests for failure path. |
| Stale panel-spec mock property | Remove `runHistoryStoreMock.terminateRun`. | Dead test fixture removed. | Panel spec pass. |
| Console-only terminate feedback path | Replace with shared toast feedback at panel boundary. | Avoid bespoke notification logic. | Panel spec + targeted tests. |

## Error Handling And Edge Cases

- Temporary/draft run IDs (`temp-*`) terminate locally only, no mutation.
- Persisted run IDs require mutation success; if `success=false`, no local teardown is performed.
- In-flight terminate calls are guarded by per-run lock in UI.
- `closeAgent(..., { terminate: true })` does not remove context if terminate fails.
- Terminate failures surface user-visible toast via `useToasts` in the panel.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Terminate active persisted run from left panel | Yes | N/A | Yes | UC-001 |
| UC-002 | Terminate active draft run from left panel | Yes | N/A | N/A | UC-002 |
| UC-003 | Backend terminate returns success=false or error | Yes | N/A | Yes | UC-003 |
| UC-004 | Close-with-terminate keeps context on failure | Yes | N/A | Yes | UC-004 |
| UC-005 | Terminate failure shows user-visible toast | Yes | N/A | Yes | UC-005 |

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | store + panel tests | Completed |
| C-002 | T-002 | source scan + targeted tests | Completed |
| C-003 | T-003 | panel interaction tests | Completed |
| C-004 | T-004 | vitest targeted run | Completed |
| C-005 | T-005 | agentRunStore tests | Completed |
| C-006 | T-006 | panel spec pass | Completed |
| C-007 | T-007 | panel feedback test | Completed |
| C-008 | T-008 | agentRun temp-path unit test | Completed |

## Open Questions

- Should right-side running list adopt same keep-row behavior later? (out of scope)
