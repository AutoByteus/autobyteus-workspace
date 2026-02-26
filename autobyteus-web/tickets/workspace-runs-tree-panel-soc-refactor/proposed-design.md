# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Proposed separation between view components and action orchestration for workspace/team run tree UI. | 1 |
| v2 | Round 1 findings | Added explicit action-controller boundary (`useRunTreeActions`) and removed formatting helpers from panel scope into utility/composable ownership. | 1 |
| v3 | Round 1 deep review write-back | Added explicit view-state composable (`useRunTreeViewState`) so expansion/avatar state leaves the root panel. | 1 |

## Summary

`WorkspaceAgentRunsTreePanel.vue` currently owns too many concerns: rendering tree sections, expansion UI state, async run/team actions, workspace creation flow, delete confirmation flow, avatar fallback logic, and path presentation logic. This design decomposes the panel into smaller view components and one orchestration composable while keeping existing behavior unchanged.

## Goals

- Enforce view-layer separation of concerns with clear component boundaries.
- Keep all current user-visible behavior and API contracts unchanged.
- Reduce cognitive load and test surface per file.
- Make team and agent history sections independently evolvable.

## Non-Goals

- No backend changes.
- No GraphQL schema or query changes.
- No behavior redesign for run/team lifecycle semantics.
- No visual redesign beyond structural extraction.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove monolithic in-component orchestration logic after extraction (no dual-path old/new handlers retained).

## Requirements And Use Cases

- UC-001: Initial mount fetches workspace list + run tree and renders workspace + team sections.
- UC-002: User can expand/collapse workspace, agent, teams section, and individual team nodes.
- UC-003: Selecting agent run or team member opens correct context and emits `run-selected`.
- UC-004: Terminate and delete actions (run/team) preserve current guards, loading flags, and toasts.
- UC-005: Create workspace path flow works for desktop picker and inline manual entry.
- UC-006: Presentation helpers (avatar fallback + workspace leaf display) remain deterministic and testable without action side effects.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Tree panel is the direct view entrypoint for run selection and run/team actions. | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onSelectRun`, `onSelectTeamMember`, `onTerminateRun`, `onTerminateTeam` | None |
| Current Naming Conventions | Store naming already migrated to `runTreeStore` (not `runHistoryStore` file names), but panel variable names still mixed. | `stores/runTreeStore.ts`, `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | None |
| Impacted Modules / Responsibilities | Single component currently mixes presentational and orchestration concerns; tests target the monolith. | `WorkspaceAgentRunsTreePanel.vue` (767 LOC), `__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Whether to split tests by subcomponent or keep one integration-heavy panel test |
| Data / Persistence / External IO | IO boundaries are in stores (GraphQL through stores), panel triggers actions only. | `stores/runTreeStore.ts`, `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts` | None |

## Current State (As-Is)

- One large SFC contains:
  - workspace/agent/team/member rendering,
  - expansion state maps,
  - action state maps (terminate/delete),
  - deletion modal coordination,
  - workspace creation UX,
  - utility formatting and avatar fallback tracking,
  - mount-time fetch orchestration.
- Panel directly coordinates multiple stores and composables.

## Target State (To-Be)

- `WorkspaceAgentRunsTreePanel.vue` becomes composition root only.
- Subcomponents handle rendering-only responsibilities:
  - `WorkspaceRunsSection.vue`
  - `TeamRunsSection.vue`
  - `WorkspaceCreateInlineForm.vue`
- New orchestration composable owns async actions + UI action state:
  - `composables/workspace/history/useRunTreeActions.ts`
- New view-state composable owns expansion maps + avatar fallback display state:
  - `composables/workspace/history/useRunTreeViewState.ts`
- New small utility helper module owns display helpers:
  - `utils/workspace/history/runTreeDisplay.ts`
- Panel wires data from store + controller outputs into subcomponents.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `components/workspace/history/WorkspaceRunsSection.vue` | Isolate workspace->agent->run rendering and events. | View SoC, template complexity | Pure presentational + event emit |
| C-002 | Add | N/A | `components/workspace/history/TeamRunsSection.vue` | Isolate teams section rendering and events. | Team view SoC | Includes member-row workspace label display |
| C-003 | Add | N/A | `components/workspace/history/WorkspaceCreateInlineForm.vue` | Isolate workspace input form logic from tree rendering. | Workspace create UX | Reused by root panel only |
| C-004 | Add | N/A | `composables/workspace/history/useRunTreeActions.ts` | Centralize terminate/delete/create/select async action handlers + busy state maps. | Action orchestration | Keeps existing store calls/toasts |
| C-005 | Add | N/A | `utils/workspace/history/runTreeDisplay.ts` | Move display-only helpers (`workspacePathLeafName`, initials key helpers). | Presentation purity, testability | No store access |
| C-006 | Modify | `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same path | Shrink to composition root; delegate to new modules. | Main panel maintainability | Emits unchanged |
| C-007 | Modify | `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | same path | Keep integration assertions for root wiring + add new component/composable focused specs. | Verification depth | Split-by-concern tests |
| C-008 | Add | N/A | `components/workspace/history/__tests__/WorkspaceRunsSection.spec.ts` + `TeamRunsSection.spec.ts` + `WorkspaceCreateInlineForm.spec.ts` + `composables/workspace/history/__tests__/useRunTreeActions.spec.ts` | Ensure decomposition retains behavior. | Regression safety | Bottom-up test coverage |
| C-009 | Add | N/A | `composables/workspace/history/useRunTreeViewState.ts` | Isolate expansion/avatar local state from the root panel. | View-state SoC | No store/network access |

## Architecture Overview

`WorkspaceAgentRunsTreePanel` (composition root)
- consumes store projections (`workspaceNodes`, `teamNodes`, selected ids)
- consumes `useRunTreeActions` (handlers + pending flags)
- consumes `useRunTreeViewState` (expansion + avatar display state)
- renders:
  - `WorkspaceCreateInlineForm`
  - `WorkspaceRunsSection`
  - `TeamRunsSection`
  - shared `ConfirmationModal`

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | Composition root and top-level layout only | emits `run-selected`, `run-created` | input: none; output: events | run tree store, selection store, new subcomponents/composable |
| `components/workspace/history/WorkspaceRunsSection.vue` | Add | Render workspace/agent/run nodes; emit user intents | props + emits (`select-run`, `toggle`, `create-run`, `terminate-run`, `delete-run`) | input: workspace nodes/state maps; output: UI intents | display helpers only |
| `components/workspace/history/TeamRunsSection.vue` | Add | Render team/member nodes; emit user intents | props + emits (`select-member`, `toggle-team`, `terminate-team`, `delete-team`) | input: team nodes/state maps; output: UI intents | display helpers only |
| `components/workspace/history/WorkspaceCreateInlineForm.vue` | Add | Render inline workspace path form | props + emits (`confirm`, `cancel`, `update:modelValue`) | input: draft/error/loading; output: form intents | none |
| `composables/workspace/history/useRunTreeActions.ts` | Add | Async action orchestration and transient busy states | `selectRun`, `selectTeamMember`, `terminateRun`, `terminateTeam`, `requestDeleteRun`, `requestDeleteTeam`, `confirmDelete`, `createWorkspace`, `createDraftRun` | input: stores/toast deps; output: handlers + state refs | runTreeStore, workspaceStore, run stores, toasts, picker |
| `composables/workspace/history/useRunTreeViewState.ts` | Add | Expansion state and avatar fallback state | `toggleWorkspace`, `toggleAgent`, `toggleTeam`, `showAgentAvatar`, `markAvatarBroken` | input keys; output reactive maps/helpers | none |
| `utils/workspace/history/runTreeDisplay.ts` | Add | Pure formatting + deterministic helper functions | `workspacePathLeafName`, `agentInitials`, avatar-key helpers | input strings; output formatted values | none |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `WorkspaceAgentRunsTreePanel.vue` (monolith) | same (composition root) | keep public entrypoint stable while reducing internals | no route/template breakage |
| File | N/A | `WorkspaceRunsSection.vue` | explicit scope: workspace + agent runs | presentational |
| File | N/A | `TeamRunsSection.vue` | explicit scope: team history subtree | presentational |
| Module | panel internal handlers | `useRunTreeActions` | explicit action orchestration boundary | composable, not store |
| Module | panel-local expansion/avatar refs | `useRunTreeViewState` | isolates local UI state mutations from root wiring | composable, no IO |
| Utility | panel-local path/avatar helpers | `runTreeDisplay.ts` | keeps UI formatting pure and reusable | testable without Vue mounting |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel.vue` | runTreeStore + selection + `useRunTreeActions` | workspace page layout | Low | root only; no per-row async logic |
| `WorkspaceRunsSection.vue` | root props/events | root panel | Low | no store access, emit-only |
| `TeamRunsSection.vue` | root props/events | root panel | Low | no store access, emit-only |
| `useRunTreeActions.ts` | runTreeStore/workspace/agentRun/agentTeamRun/toasts | root panel | Medium | centralize side effects in one composable, keep signatures typed |
| `useRunTreeViewState.ts` | none | root panel + sections | Low | keep strictly local-state only (no store calls) |
| `runTreeDisplay.ts` | none | sections + tests | Low | pure functions only |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Panel-local action handlers | Move to `useRunTreeActions`; delete old duplicated handler code in panel | no fallback branch kept | unit tests for composable + panel integration test |
| Panel-local display helpers | Move to `runTreeDisplay.ts`; remove inline helper duplication | no dual helper copies | utility unit tests + UI snapshots |
| Panel-local inline form markup | Move to `WorkspaceCreateInlineForm.vue`; remove old markup from root panel | single implementation retained | component spec + root integration test |
| Panel-local expansion/avatar refs | Move to `useRunTreeViewState`; remove local map mutation code from root panel | single state-owner boundary | composable spec + integration checks |

## Error Handling And Edge Cases

- Failed run/team terminate keeps existing toast/error semantics.
- Delete confirmation stays single-modal with pending target discriminator (`runId` vs `teamId`).
- Embedded mode folder picker fallback still supports inline input when picker unavailable.
- Workspace path leaf formatting handles `/`, Windows separators, and trailing slashes.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Initial mount render and fetch | Yes | N/A | Yes | UC-001 |
| UC-002 | Expand/collapse tree sections | Yes | N/A | N/A | UC-002 |
| UC-003 | Select run/team member and emit selection | Yes | N/A | Yes | UC-003 |
| UC-004 | Terminate/delete actions with pending state and modal | Yes | N/A | Yes | UC-004 |
| UC-005 | Create workspace via picker or inline path | Yes | Yes | Yes | UC-005 |
| UC-006 | Display helpers (workspace leaf/initials/avatar fallback) | Yes | N/A | N/A | UC-006 |

## Performance / Security Considerations

- Performance improvement expected from narrower re-render scopes in subcomponents.
- No new external IO or security surface introduced.
- Avoid repeated object spreads in hot paths where possible inside composable state updates.

## Migration / Rollout (If Needed)

- Single-PR refactor with no feature flag.
- Keep emitted event contracts unchanged to avoid parent integration churn.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | `WorkspaceRunsSection.spec.ts` + panel integration | Planned |
| C-002 | T-002 | `TeamRunsSection.spec.ts` + panel integration | Planned |
| C-003 | T-003 | `WorkspaceCreateInlineForm.spec.ts` | Planned |
| C-004 | T-004 | `useRunTreeActions.spec.ts` | Planned |
| C-005 | T-005 | `runTreeDisplay.spec.ts` | Planned |
| C-006 | T-006 | `WorkspaceAgentRunsTreePanel.spec.ts` | Planned |
| C-007 | T-007 | targeted vitest suite | Planned |
| C-008 | T-008 | manual smoke in workspace tree panel | Planned |
| C-009 | T-009 | `useRunTreeViewState.spec.ts` | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-16 | Review Round 1 | Controller boundary ambiguous between panel and subcomponents | Introduced explicit `useRunTreeActions` ownership map and removed panel-local helper ownership | Resolved |
| 2026-02-16 | Review Round 1 deep review | Root panel still managed expansion/avatar transient state | Added `useRunTreeViewState` boundary and updated change inventory/decommission plan | Resolved |

## Open Questions

- Should expanded/collapsed state persist across page reloads (currently in-memory only)?
- Should delete confirmation modal text differ for run vs team with more explicit context labels?
