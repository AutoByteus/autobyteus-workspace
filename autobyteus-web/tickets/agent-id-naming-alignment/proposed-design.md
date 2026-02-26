# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Scoped rename from agent `runId` to `agentId` across backend run-history API and frontend consumers. | 1 |
| v2 | Round 1 deep review write-back | Added explicit boundary rule preserving distributed `teamRunId` as execution identity and tightened rename inventory to avoid partial/ambiguous naming. | 1 |

## Summary

Agent history currently uses `runId` for an identity that is functionally the same as `agentId`. This creates naming ambiguity in backend services, GraphQL payloads, and frontend stores. This design aligns single-agent identity naming to `agentId` end-to-end while preserving team distributed execution identity (`teamRunId`) as a distinct concept.

## Goals

- Replace single-agent `runId` naming with `agentId` in backend domain, API, and frontend state orchestration.
- Keep behavior unchanged for create/continue/restore/delete agent history flows.
- Preserve team-history persistence naming (`teamId`) and distributed execution naming (`teamRunId`) without flattening those concepts.
- Eliminate dual naming in the same boundary (no mixed `runId`/`agentId` for the same payload contract).

## Non-Goals

- No change to team distributed runtime semantics (`teamRunId`, `runVersion`, sequence fencing).
- No change to memory folder layout (`memory/agents/<agentId>`, `memory/agent_teams/<teamId>/...`).
- No change to user-facing team history behavior.
- No introduction of backward-compatibility alias fields.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove legacy `runId` agent-history naming in GraphQL contracts, frontend store payloads, and backend run-history domain types in this ticket.

## Requirements And Use Cases

- UC-001: List/open agent history rows using `agentId` identity naming end-to-end.
- UC-002: Continue existing agent conversation and restore inactive agent using `agentId` input/output naming.
- UC-003: Delete agent history using `agentId` naming and unchanged delete semantics.
- UC-004: Team history and distributed event flow remain stable and continue using `teamId` + `teamRunId` semantics.
- UC-005: Generated GraphQL types and tests reflect new naming without mixed legacy fields.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Agent history API boundary currently exposes `runId` fields/args; frontend uses those directly in queries/mutations and stores. | `autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts`, `autobyteus-web/graphql/queries/runHistoryQueries.ts`, `autobyteus-web/graphql/mutations/runHistoryMutations.ts`, `autobyteus-web/stores/runTreeStore.ts` | Whether external non-web clients depend on current schema naming |
| Current Naming Conventions | Agent runtime core uses `agentId`, while run-history domain for agents still uses `runId`; team history already uses `teamId`. | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`, `autobyteus-server-ts/src/run-history/domain/models.ts`, `autobyteus-server-ts/src/run-history/domain/team-models.ts` | None |
| Impacted Modules / Responsibilities | Rename touches backend run-history domain/services/stores, GraphQL resolver types, frontend history query/mutation docs, run-open orchestration, tree store, and tests. | `autobyteus-server-ts/src/run-history/**`, `autobyteus-web/stores/runTreeStore.ts`, `autobyteus-web/services/runOpen/runOpenCoordinator.ts`, `autobyteus-web/stores/agentRunStore.ts` | Codegen regeneration order for `autobyteus-web/generated/graphql.ts` |
| Data / Persistence / External IO | Persistence path is key-based folder under `memory/agents/<id>` and currently accessed via `runId` variables that already map to agent run id. | `autobyteus-server-ts/src/run-history/store/run-manifest-store.ts`, `autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts`, `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts` | None |

## Current State (As-Is)

- Single-agent history domain models use `runId` (`RunHistoryIndexRow`, `RunResumeConfig`, projection payloads).
- Backend continuation logic already treats `runId` as the agent run identifier when restoring (`restoreAgentRun({ agentId: runId, ... })`).
- Frontend uses `runId` throughout run tree and run-open flows while context state internally stores `state.agentId`.
- Team distributed flow uses a separate `teamRunId` for event aggregation, stale-token rejection, and sequence ordering.

## Target State (To-Be)

- Single-agent history identity is named `agentId` in backend domain models, service method signatures, GraphQL payloads, and frontend state contracts.
- Agent history GraphQL queries/mutations and input objects use `agentId` consistently.
- Frontend run tree store and run-open coordinator use `agentId` naming for selected/resume/projection state.
- Team history continues to use `teamId` for persistence and `teamRunId` for distributed execution envelope and fencing.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/run-history/domain/models.ts` | same path | Rename single-agent history identity fields/types from `runId` to `agentId`. | Backend domain typing | Team models unchanged |
| C-002 | Modify | `autobyteus-server-ts/src/run-history/store/run-history-index-store.ts` | same path | Rename index row APIs (`getRow/updateRow/removeRow` input + key fields) to `agentId`. | Backend persistence API | File format key name updated |
| C-003 | Modify | `autobyteus-server-ts/src/run-history/store/run-manifest-store.ts` | same path | Rename method parameters from `runId` to `agentId` while keeping path semantics. | Backend persistence API | No folder layout change |
| C-004 | Modify | `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | same path | Rename public methods/payloads to `agentId` and keep behavior identical. | Backend service boundary | Includes delete/terminate/event callbacks |
| C-005 | Modify | `autobyteus-server-ts/src/run-history/services/run-continuation-service.ts` + `run-projection-service.ts` | same path | Rename continuation/projection input/output fields to `agentId`. | Backend orchestration | Restore behavior unchanged |
| C-006 | Modify | `autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts` | same path | Rename GraphQL fields/args/input from `runId` to `agentId`. | Public API contract | No dual legacy fields |
| C-007 | Modify | `autobyteus-web/graphql/queries/runHistoryQueries.ts` + `graphql/mutations/runHistoryMutations.ts` | same path | Consume renamed GraphQL schema fields (`agentId`). | Frontend API docs | Regenerate types afterwards |
| C-008 | Modify | `autobyteus-web/services/runOpen/runOpenCoordinator.ts` | same path | Rename coordinator payload contracts from `runId` to `agentId`. | Frontend orchestration | Behavior and branch policy unchanged |
| C-009 | Modify | `autobyteus-web/stores/runTreeStore.ts` + `stores/agentRunStore.ts` + `stores/agentContextsStore.ts` | same path | Align store state/getters/actions naming to `agentId` for agent history subtree. | Frontend state boundary | Team keys remain `teamId` |
| C-010 | Modify | `autobyteus-web/utils/runTreeProjection.ts` + `utils/runTreeLiveStatusMerge.ts` | same path | Align projection row identity fields to `agentId`. | Frontend derived-model pipeline | Update related tests |
| C-011 | Modify | `autobyteus-web/generated/graphql.ts` | same path | Regenerate codegen after schema/query changes. | Type safety boundary | Auto-generated change |
| C-012 | Modify | `autobyteus-web/stores/__tests__/*.spec.ts`, `autobyteus-web/utils/__tests__/*.spec.ts`, backend run-history tests | same path(s) | Update assertions and fixtures to new naming. | Verification | No behavior expectation changes |
| C-013 | N/A (Guardrail) | `autobyteus-server-ts/src/distributed/**`, `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | unchanged | Preserve `teamRunId` distributed execution naming. | Distributed routing/event ordering | Explicit no-change boundary |

## Architecture Overview

Identity naming boundaries after alignment:

- Agent history/persistence boundary: `agentId`
- Team persistence boundary: `teamId`
- Team distributed execution boundary: `teamRunId` + `runVersion`

No boundary may reuse a different term for the same identity in the same API contract.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/domain/models.ts` | Modify | Single-agent run-history data contracts | interfaces/types | `agentId` keyed contracts | run-history services/stores |
| `autobyteus-server-ts/src/run-history/services/run-history-service.ts` | Modify | Agent history listing/resume/delete/event updates | `listRunHistory`, `getRunResumeConfig`, etc. (signature identity renamed) | `agentId` in payloads | index store, manifest store, memory store |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts` | Modify | GraphQL boundary for agent history | queries/mutations args and payload fields | `agentId` contract | run-history services |
| `autobyteus-web/stores/runTreeStore.ts` | Modify | Workspace run-tree aggregation and selection | getters/actions for agent rows | agent row identity now `agentId` | Apollo + stores + runOpen coordinator |
| `autobyteus-web/services/runOpen/runOpenCoordinator.ts` | Modify | Agent history open/hydration orchestration | `openRunWithCoordinator` (renamed input/output fields) | `agentId` | queries + context stores |
| `autobyteus-web/stores/agentRunStore.ts` | Modify | Continue-run orchestration and streaming connect | send/subscribe action payload mapping | uses `agentId` for existing instance | mutation + contexts store |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | N/A (Guardrail) | Team stream envelope sequence gating | unchanged | keeps `team_run_id` | distributed semantics |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API Field | `runId` (agent history GraphQL) | `agentId` | Represents persisted/restored agent run identity. | Applied to input + output fields |
| Domain Field | `RunHistoryIndexRow.runId` | `RunHistoryIndexRow.agentId` | Remove mixed terminology inside single identity domain. | Backend internal contract |
| Store State Key | `resumeConfigByRunId` | `resumeConfigByAgentId` | Prevent accidental mixing with team run concepts. | Frontend state clarity |
| Action Name | `openRun(runId)` | `openAgentHistory(agentId)` or `openRun(agentId)` with typed arg name | Keep concept readable while aligning parameter semantics. | Final function naming chosen during implementation |
| Distributed Field | `teamRunId` | unchanged | Separate execution identity needed for sequence/idempotency/fencing. | Explicit guardrail |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Backend GraphQL agent-history resolver | run-history services | web GraphQL consumers | High | Apply schema rename + web query/mutation updates in same change set |
| Backend run-history services/stores | domain model contracts | resolver + tests | Medium | Rename types first, then service/store signatures, then resolver |
| Web run tree store | GraphQL docs + runOpen coordinator + context stores | workspace tree UI | High | Introduce one canonical agent-row identity type and update utilities/tests together |
| Web generated GraphQL types | schema + query docs | stores/services | Medium | Run codegen only after schema and docs converge |
| Distributed runtime modules | team run locator/orchestrator | team stream + policies | Medium | No-change boundary enforced; rename excluded |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Agent GraphQL `runId` fields/args | Rename to `agentId`; remove old fields | No alias dual-path retained | GraphQL compile + web typecheck |
| Frontend `*ByRunId` agent maps | Rename to `*ByAgentId` and adjust accessors | Remove all agent-side `runId` keys in affected modules | unit/integration tests |
| Agent history utility row identities | Replace `runId` field with `agentId` | keep team row identity unchanged | run-tree projection tests |
| Legacy test fixtures using agent `runId` keys | Rewrite fixture contracts and expected payloads | No compatibility fixture branch | vitest suites pass |

## Error Handling And Edge Cases

- Reject empty/whitespace `agentId` where `runId` validation existed previously.
- Ensure draft/temp IDs (`temp-*`) continue to work for pre-first-message contexts.
- Ensure no accidental rename touches team distributed tokens (`teamRunId` in approval tokens, envelopes, sequence map keys).
- Ensure delete/terminate active-state guards remain unchanged in behavior.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | List/open agent history rows using `agentId` | Yes | N/A | Yes | UC-001 |
| UC-002 | Continue/restore agent run using `agentId` contracts | Yes | Yes | Yes | UC-002 |
| UC-003 | Delete agent history with aligned naming | Yes | N/A | Yes | UC-003 |
| UC-004 | Preserve team distributed runtime identity semantics | Yes | N/A | Yes | UC-004 |
| UC-005 | Type and test sync after rename | Yes | N/A | Yes | UC-005 |

## Performance / Security Considerations

- No expected runtime performance regression; change is naming-contract refactor.
- Security behavior unchanged; existing path-safety checks for delete remain required.
- Distributed stale-token protections remain intact by preserving `teamRunId` + `runVersion` fencing.

## Migration / Rollout (If Needed)

- Single coordinated rollout in the same repository workspace:
  1. backend domain/service/store/API rename,
  2. frontend query/mutation/store/service rename,
  3. regenerate GraphQL types,
  4. run test suites.
- No compatibility window is planned in this ticket.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001..C-006 | T-001..T-004 | backend unit + integration | Planned |
| C-007..C-011 | T-005..T-008 | frontend unit + integration + typecheck | Planned |
| C-012 | T-009 | targeted regression suites | Planned |
| C-013 | T-010 | distributed guardrail tests | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-16 | Review Round 1 | Ambiguity risk between agent identity rename and distributed team execution identity rename | Added explicit no-change guardrail for `teamRunId` modules and use-case UC-004. | Resolved |

## Open Questions

- Should query/mutation operation names (`GetRunProjection`, `ContinueRun`) also be renamed now (`GetAgentProjection`, `ContinueAgent`) or only payload field naming in this ticket?
