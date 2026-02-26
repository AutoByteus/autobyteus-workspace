# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined status-semantics gap (`Idle` shown for inactive history runs) and proposed mapping inactive hydration to `ShutdownComplete` for offline UX. | 1 |
| v2 | Round 1 findings | Added explicit ownership boundary notes and clarified no backend schema change; hardened use-case/error coverage. | 1 |
| v3 | Round 2 findings | Added dedicated regression test requirements for inactive open path + no-stream-connect expectation. | 2 |
| v4 | Round 4 deep review | Documented residual non-blocking UX risk: mobile `Running` list may still include offline contexts because it groups all in-memory contexts. | 4 |

## Summary

Inactive history runs currently hydrate with runtime status `Idle`, so the workspace header can incorrectly look live. The design aligns status semantics so opening a non-active history run shows `Offline` (`AgentStatus.ShutdownComplete`) while preserving resume behavior.

## Goals

- Ensure non-active history runs render as `Offline` when opened.
- Preserve active-run behavior and stream connection flow.
- Keep history row retention/status-dot behavior unchanged.
- Keep separation of concerns:
  - `runHistoryStore`: history projection + run-open entrypoint.
  - `runOpenCoordinator`: hydration strategy + initial runtime status selection.
  - `AgentStatusDisplay/useStatusVisuals`: presentation mapping.

## Non-Goals

- Expanding backend run-history enum beyond `ACTIVE | IDLE | ERROR`.
- Redesigning left tree status taxonomy.
- Introducing a new `AgentStatus` enum value.
- Filtering mobile `Running` panel membership to active-only contexts.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove/replace incorrect semantics directly.`
- Required action: remove inactive-hydration-to-`Idle` behavior in open flow.

## Requirements And Use Cases

- UC-001: Opening a history run where `resumeConfig.isActive=false` must show `Offline` in workspace header.
- UC-002: Opening a history run where `resumeConfig.isActive=true` must keep live behavior (`Uninitialized` + stream attach).
- UC-003: Continuing an inactive history run after open must still succeed and transition to active flow.
- UC-004: Left history tree row behavior remains unchanged (no active dot for inactive runs).

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | History-row click routes through `selectTreeRun` -> `openRun` -> `openRunWithCoordinator`. | `stores/runHistoryStore.ts:513`, `stores/runHistoryStore.ts:226`, `services/runOpen/runOpenCoordinator.ts:247` | None |
| Current Naming Conventions | Runtime statuses use `AgentStatus.*`; UI maps those to labels/colors in composables. | `types/agent/AgentStatus.ts`, `composables/useStatusVisuals.ts` | None |
| Impacted Modules / Responsibilities | Inactive open currently assigns `AgentStatus.Idle` directly in coordinator. | `services/runOpen/runOpenCoordinator.ts:348` | None |
| Data / Persistence / External IO | Backend run-history status remains coarse (`ACTIVE/IDLE/ERROR`), plus `isActive` in resume config. | `server-ts/src/run-history/domain/models.ts:5`, `graphql/queries/runHistoryQueries.ts` | None |

## Current State (As-Is)

- For inactive history runs (`resumeConfig.isActive=false`), open hydration sets status to `AgentStatus.Idle`.
- Header status widget renders `Idle` as green/lively.
- `Offline` label is only shown for `AgentStatus.ShutdownComplete`.

## Target State (To-Be)

- Inactive history run hydration uses `AgentStatus.ShutdownComplete`.
- Header status shows `Offline` immediately for opened inactive runs.
- Active runs keep `Uninitialized` initialization path and stream attach.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `services/runOpen/runOpenCoordinator.ts` | same | Replace inactive hydration status from `Idle` to `ShutdownComplete`. | status semantics, workspace header | Active path unchanged. |
| C-002 | Modify | `stores/__tests__/runHistoryStore.spec.ts` | same | Add regression test for inactive open status hydration and no stream connection. | test coverage | Prevent semantic regression. |
| C-003 | Modify | `tickets/history-run-inactive-offline-status-alignment/*` | same | Capture final status contract and call-stack validation. | workflow artifacts | Implementation gate evidence. |

## Architecture Overview

`WorkspaceAgentRunsTreePanel` -> `runHistoryStore.selectTreeRun(history)` -> `runHistoryStore.openRun` -> `openRunWithCoordinator` -> `agentContextsStore.upsertProjectionContext(status = ShutdownComplete when !isActive)` -> `AgentWorkspaceView` renders `AgentStatusDisplay` -> `useStatusVisuals` -> `Offline`.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `services/runOpen/runOpenCoordinator.ts` | Modify | Assign initial runtime status during run hydration | `openRunWithCoordinator(...)` | resume config + projection -> hydrated context | apollo, stores |
| `stores/runHistoryStore.ts` | No functional change | Entry to open flow, history projection | `openRun`, `selectTreeRun` | run row -> open action | runOpen coordinator |
| `composables/useStatusVisuals.ts` | Reuse | Present status text and color | `useStatusVisuals(statusRef)` | status -> visual label | `AgentStatus` enum |
| `stores/__tests__/runHistoryStore.spec.ts` | Modify | Validate run-open semantics | vitest cases | mocked queries/stores -> assertions | mocks |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Runtime status assignment | `status: isActive ? Uninitialized : Idle` | `status: isActive ? Uninitialized : ShutdownComplete` | Matches user-facing meaning for inactive opened history run. | No API rename needed. |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `runOpenCoordinator` | GraphQL resume/projection queries, context store | runHistory open flow, workspace header display | Low | Keep status decision in coordinator only; do not spread special cases. |
| `runHistoryStore.spec.ts` | mocked open flow dependencies | regression safety for coordinator behavior | Low | Add focused inactive-open test assertions. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Inactive->`Idle` hydration branch | Replace with inactive->`ShutdownComplete` | No compatibility fallback retained. | unit tests + manual UI check |

## Error Handling And Edge Cases

- If `GetRunResumeConfig` fails, open flow remains unchanged (existing error path).
- If inactive run is later continued, `sendUserInputAndSubscribe` path remains valid and should re-enter active lifecycle.
- Left tree still uses run-history `isActive` and merged overlays; dot visibility rules unchanged.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Open inactive history run and show offline | Yes | N/A | Yes | UC-001 |
| UC-002 | Open active history run and preserve live flow | Yes | N/A | Yes | UC-002 |
| UC-003 | Continue previously inactive run after open | Yes | N/A | Yes | UC-003 |
| UC-004 | Left tree inactive visual behavior unchanged | Yes | N/A | N/A | UC-004 |

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | runHistoryStore unit tests + manual UI | Completed |
| C-002 | T-002 | vitest targeted run | Completed |
| C-003 | T-003 | artifact review completeness | Completed |

## Open Questions

- Should we later introduce explicit UI term `Inactive` instead of `Offline` for opened historical snapshots? (out of current scope)
- Should mobile `Running` panel exclude `ShutdownComplete` contexts to avoid showing offline entries under a running-only label?
