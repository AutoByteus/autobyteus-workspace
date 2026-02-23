# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define runtime `Instance -> Run` rename architecture and cleanup scope | 1 |
| v2 | Requirements refinement | Add memory index/view runtime ID alignment (`agentId -> runId`) across backend GraphQL/domain and frontend memory stores/components | 3 |
| v3 | Requirements refinement | Add targeted runtime module/file `Rename/Move` scope for server manager/graphql modules and frontend runtime GraphQL documents | 6 |
| v4 | Requirements refinement | Add frontend runtime internal API/event/state naming cleanup (`instance` -> `run`) for agent/team flows | 9 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/rename-runtime-instance-id-to-run-id/investigation-notes.md`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md`
- Requirements Status: `Refined`

## Summary

Standardize runtime execution naming from `Instance` to `Run` across backend services, GraphQL runtime APIs, frontend runtime usage, and impacted docs, without changing runtime behavior. This refinement also aligns memory runtime APIs from `agentId` to `runId`, removes residual `instance` wording from runtime module/file paths, and now aligns frontend runtime internal selection/context/component/event naming to run semantics.

## Goals

- Make runtime-vs-definition terminology unambiguous.
- Ensure all runtime execution identifiers/managers/mutations/queries use `Run` naming.
- Ensure memory runtime selectors and payload identity fields use `runId` naming.
- Ensure runtime manager/graphql/frontend runtime module paths are run-named.
- Ensure frontend runtime internal APIs/events/state use run semantics (`runId`, `selectedRunId`, `selectRun`, etc.) in agent/team flows.
- Keep definition IDs unchanged (`agentDefinitionId`, `teamDefinitionId`, `agentTeamDefinitionId`).
- Treat rename as breaking and remove runtime legacy aliases in production paths.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove runtime `*Instance*` identifiers/types/method names in production code paths.

## Requirements And Use Cases

| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Agent runtime APIs use `Run` naming | Agent runtime manager/methods and IDs are run-scoped | UC-001, UC-003 |
| R-002 | Team runtime APIs use `Run` naming | Team runtime manager/methods and IDs are run-scoped | UC-002, UC-003 |
| R-003 | GraphQL runtime APIs expose `Run` names | runtime queries/mutations/types are run-named | UC-003 |
| R-004 | Frontend runtime usage aligned to renamed GraphQL | stores/components/tests use run operations/fields | UC-005 |
| R-005 | Definition IDs remain unchanged | definition identifiers are not renamed | UC-001, UC-002, UC-004 |
| R-006 | Docs align with implementation | impacted docs reference valid symbols/paths | UC-004, UC-005 |
| R-007 | Memory runtime index/view APIs use run naming | backend+GraphQL+frontend memory runtime IDs use `runId` | UC-006 |
| R-008 | Non-runtime `agentId` semantics are preserved | ownership/identity fields that are not runtime-run IDs remain `agentId` | UC-001, UC-002, UC-005, UC-006 |
| R-009 | Runtime module/path naming uses run semantics | runtime manager/graphql/frontend runtime doc modules are run-named | UC-007 |
| R-010 | Frontend runtime internal APIs/events/state use run semantics | selection/context/component/event contracts in agent/team flows are run-named | UC-008 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | GraphQL resolvers call runtime managers; WS stream handlers consume runtime IDs; run-history services bridge runtime + persistence | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`, `autobyteus-server-ts/src/services/agent-streaming/*`, `autobyteus-server-ts/src/run-history/services/*` | External schema consumers alignment timing |
| Current Naming Conventions | Backend runtime module names are now run-aligned; frontend runtime internals still expose `instance` terms in selection/context/component/event APIs | `autobyteus-web/stores/agentSelectionStore.ts`, `autobyteus-web/stores/agentContextsStore.ts`, `autobyteus-web/components/workspace/running/RunningInstanceRow.vue`, `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Scope boundary for application-domain `instance` naming |
| Impacted Modules / Responsibilities | Backend runtime managers, GraphQL runtime types/resolvers, frontend runtime stores/graphql docs, tests/docs | modified file set in `autobyteus-server-ts` + `autobyteus-web` | None blocking for implementation |
| Data / Persistence / External IO | Run history manifest/index rely on run IDs and manager lookups; no schema storage redesign needed | `run-history-service.ts`, `team-run-history-service.ts`, continuation services | Schema/codegen endpoint update process outside this workspace |
| Memory Runtime Surface | Memory storage is run-folder based, but API fields/args/store names still expose `agentId` | `autobyteus-server-ts/src/agent-memory-view/**`, `autobyteus-server-ts/src/api/graphql/types/memory-*.ts`, `autobyteus-web/graphql/queries/agentMemory*.ts`, `autobyteus-web/stores/agentMemory*.ts` | Whether to rename query operation names now (decision: yes) |

## Current State (As-Is)

- Runtime execution historically used `Instance` terminology in identifiers/managers/APIs.
- Current branch already converted most runtime code symbols/APIs to `Run`.
- Memory index/view contracts still expose runtime identifiers as `agentId` in backend GraphQL/domain/frontend memory UI.
- Frontend runtime internal agent/team flow still uses `instance` naming in selection/context/component/event contracts.
- Some docs contain stale path references due partial rename sweeps.

## Target State (To-Be)

- Runtime execution naming is consistently `Run` for IDs, types, managers, methods, resolvers, and GraphQL operations.
- Memory runtime APIs expose `runId` consistently (`listRunMemorySnapshots`, `getRunMemoryView(runId)`).
- Definition identifiers remain unchanged and scoped to definition entities.
- Production code paths contain no `agentInstanceId` / `agentTeamInstanceId` runtime identifiers.
- Active runtime manager/graphql/frontend runtime document modules are run-named; imports/callsites align.
- Frontend runtime internal agent/team contracts are run-named (`selectedRunId`, `selectRun`, `createRunFromTemplate`, `removeRun`, run events/payload keys).

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts` | same path | Export/class/method runtime naming changed to `Run` semantics | Backend runtime management | Keep path stable per scope |
| C-002 | Modify | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts` | same path | Team runtime manager/method naming changed to `Run` | Backend team runtime management | Keep path stable per scope |
| C-003 | Modify | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | same path | Runtime GraphQL type/resolver/queries/mutations use run naming | Public GraphQL runtime API | Breaking API rename |
| C-004 | Modify | `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | same path | Team runtime GraphQL type/resolver/mutations use run naming | Public GraphQL runtime API | Breaking API rename |
| C-005 | Modify | `autobyteus-server-ts/src/run-history/services/*.ts` | same paths | manager/service callsites updated to `Run` methods | Runtime continuation/history | No behavior change intended |
| C-006 | Modify | `autobyteus-web/graphql/**` + `autobyteus-web/stores/**` + `autobyteus-web/components/agents/RunningAgentCard.vue` | same paths | Frontend runtime operations/types updated to run naming | Frontend runtime UX/data flow | Ensure generated types/schema alignment |
| C-007 | Modify | impacted tests in server/web | same paths | update test fixtures/assertions to renamed runtime APIs | Verification | target tests pass |
| C-008 | Modify | impacted docs under `autobyteus-server-ts/docs` and `autobyteus-web/docs` | same paths | docs terminology/path correctness sync | Documentation quality | required post-implementation sync |
| C-009 | Modify | `autobyteus-server-ts/src/agent-memory-view/**`, `autobyteus-server-ts/src/api/graphql/types/memory-*.ts`, converters | same paths | Memory runtime domain/service/GraphQL contract rename from `agentId` to `runId` | Backend memory APIs | Breaking GraphQL rename for memory queries |
| C-010 | Modify | `autobyteus-web/graphql/queries/agentMemory*.ts`, memory stores/components/types/tests, generated typings | same paths | Frontend memory query variables/state/UI identity fields aligned to `runId` naming | Frontend memory UX/data flow | Requires GraphQL codegen refresh |
| C-011 | Rename/Move | `autobyteus-server-ts/src/agent-execution/services/agent-instance-manager.ts` | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Remove runtime module path drift and align with exported `AgentRunManager` | Backend runtime orchestration + imports/tests/docs | No behavior change |
| C-012 | Rename/Move | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts` | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Remove runtime module path drift and align with exported `AgentTeamRunManager` | Backend team runtime orchestration + imports/tests/docs | No behavior change |
| C-013 | Rename/Move | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `agent-team-run.ts`, converters | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `agent-team-run.ts`, converters `agent-run-converter.ts`, `agent-team-run-converter.ts` | Align GraphQL runtime module paths to run semantics | Backend GraphQL runtime layer + schema imports/tests/docs | Breaking for import paths only (internal) |
| C-014 | Rename/Move | `autobyteus-web/graphql/queries/agentRunQueries.ts`, `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts` | `autobyteus-web/graphql/queries/agentRunQueries.ts`, `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts` | Align frontend runtime GraphQL module names with operation semantics | Frontend stores/components/tests/docs | No operation payload behavior change |
| C-015 | Modify | frontend runtime components/stores/tests with residual `*Instance` method calls/events in run paths | same paths | Align runtime interaction naming (`terminateTeamRun`, create/select/delete run handlers) | Frontend runtime UI/store consistency | No behavior change |
| C-016 | Modify | `autobyteus-web/stores/agentSelectionStore.ts`, dependent stores/components/tests | same paths | Rename runtime selection state/API from instance terms to run terms | Frontend runtime selection contracts | `selectedInstanceId -> selectedRunId`, `selectInstance -> selectRun` |
| C-017 | Modify | `autobyteus-web/stores/agentContextsStore.ts`, `agentTeamContextsStore.ts`, dependent runtime paths | same paths | Rename runtime context store APIs to run semantics | Frontend runtime context contracts | `createInstanceFromTemplate -> createRunFromTemplate`, `removeInstance -> removeRun`, `activeInstance -> activeRun`, `instancesByDefinition -> runsByDefinition` |
| C-018 | Rename/Move | `autobyteus-web/components/workspace/running/RunningInstanceRow.vue` + tests | `autobyteus-web/components/workspace/running/RunningRunRow.vue` + tests | Remove remaining runtime component file-name drift | Frontend runtime UI component tree | behavior unchanged |
| C-019 | Modify | runtime panel/history component event contracts and payload keys | same paths | Rename emitted/listened event naming from `instance-*` to `run-*` in runtime flows | Frontend component interaction contracts | `instance-selected/created` -> `run-selected/created`; payload key `instanceId -> runId` |
| C-020 | Modify | frontend runtime docs and in-scope tests | same paths | Keep docs/tests aligned to run-named runtime internals | Documentation and verification | excludes application-domain `instance` |

## Architecture Overview

- Entrypoint layer:
  - GraphQL runtime resolvers expose run-named operations.
- Orchestration layer:
  - `AgentRunManager` / `AgentTeamRunManager` own runtime creation, restore, lookup, termination.
- History/continuation layer:
  - run history services use run manager APIs for active checks and restoration.
- Memory inspection layer:
  - memory index/view services and GraphQL resolvers resolve data by runtime `runId`.
- Frontend runtime layer:
  - runtime stores invoke run-named GraphQL operations and manage stream subscriptions by run/team IDs.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Rename/Move | Single-agent runtime orchestration | `AgentRunManager` + run methods | run config in -> run ID out | definitions, prompts, workspace, LLM, tools |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Rename/Move | Team runtime orchestration | `AgentTeamRunManager` + run methods | team/member config in -> team ID out | team definitions, agent defs, workspace |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | Rename/Move | Agent runtime GraphQL contract | `agentRun(s)`, `terminateAgentRun` | GraphQL -> runtime manager | `AgentRunManager`, run history |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | Rename/Move | Team runtime GraphQL contract | `agentTeamRun(s)`, `createAgentTeamRun`, `terminateAgentTeamRun` | GraphQL -> runtime manager | `AgentTeamRunManager`, team history |
| `autobyteus-server-ts/src/run-history/services/*` | Modify | run/team continuation + history persistence | `continueRun`, `continueTeamRun`, list/delete/history APIs | run/team IDs + manifests | managers, stores, workspace |
| `autobyteus-web/graphql/queries/agentRunQueries.ts` + `autobyteus-web/graphql/mutations/agentTeamRunMutations.ts` + runtime stores/components | Rename/Move | Frontend runtime query/mutation + orchestration | run/team run operations | UI action -> GraphQL + WS | generated gql types, backend schema |
| `autobyteus-server-ts/src/agent-memory-view/**` | Modify | runtime memory indexing/view by run ID | `listSnapshots`, `getRunMemoryView` (service/resolver surface) | run ID in -> memory payload out | filesystem memory store, transformers |
| `autobyteus-server-ts/src/api/graphql/types/memory-index.ts`, `memory-view.ts` | Modify | memory GraphQL contract | `listRunMemorySnapshots`, `getRunMemoryView(runId)` | GraphQL -> memory services | converters, memory services |
| `autobyteus-web/graphql/queries/agentMemory*.ts`, memory stores/components | Modify | memory UI query/state orchestration | query vars/state keys use `runId` | UI action -> GraphQL + store state | generated gql types |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: stores remain orchestration boundaries; components consume store/state only.
- Non-UI scope: runtime managers remain orchestrators; resolvers map transport <-> domain.
- Integration scope: run-history stores persist manifests/index; continuation services bridge persistence/runtime.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Module API | `AgentInstanceManager` | `AgentRunManager` | Runtime entity is per-run, not durable instance blueprint | Applied |
| Module API | `AgentTeamInstanceManager` | `AgentTeamRunManager` | Same rationale for team runtime | Applied |
| Method | `createAgentInstance` | `createAgentRun` | semantic clarity | Applied |
| Method | `createTeamInstance` | `createTeamRun` | semantic clarity | Applied |
| GraphQL type | `AgentInstance` | `AgentRun` | public API consistency | Applied |
| GraphQL type | `AgentTeamInstance` | `AgentTeamRun` | public API consistency | Applied |
| GraphQL operation | `agentInstances` | `agentRuns` | runtime vocabulary consistency | Applied |
| GraphQL operation | `listAgentMemorySnapshots` | `listRunMemorySnapshots` | memory entry identity is runtime run | Planned in v2 |
| GraphQL operation | `getAgentMemoryView(agentId)` | `getRunMemoryView(runId)` | remove runtime terminology mismatch | Planned in v2 |
| Domain field | `MemorySnapshotSummary.agentId` | `MemorySnapshotSummary.runId` | runtime ID semantics | Planned in v2 |
| Store state | `selectedAgentId` (memory view) | `selectedRunId` | avoid runtime concept ambiguity in UI state | Planned in v2 |
| File path | `agent-instance-*` / `agent-team-instance-*` runtime modules | `agent-run-*` / `agent-team-run-*` runtime modules | remove naming drift between module names and runtime semantics | Applied in v3 scope |
| Store state | `selectedInstanceId` (runtime selection) | `selectedRunId` | make runtime selection terminology consistent | Planned in v4 |
| Store API | `selectInstance(...)` | `selectRun(...)` | explicit run semantic for selection contract | Planned in v4 |
| Store API | `createInstanceFromTemplate()` | `createRunFromTemplate()` | explicit runtime run creation wording | Planned in v4 |
| Store API | `removeInstance(id)` | `removeRun(id)` | explicit runtime run lifecycle wording | Planned in v4 |
| UI event | `instance-selected`, `instance-created` | `run-selected`, `run-created` | remove runtime event naming drift | Planned in v4 |
| UI payload key | `instanceId` | `runId` | payload semantics reflect runtime run identity | Planned in v4 |
| File path | `RunningInstanceRow.vue` | `RunningRunRow.vue` | align component name with runtime run concept | Planned in v4 |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `agent-instance-manager.ts` file path | runtime run manager | No (path wording lags symbol) | Rename | C-011 |
| `agent-team-instance-manager.ts` file path | team runtime run manager | No (path wording lags symbol) | Rename | C-012 |
| GraphQL `agent-run.ts` / `agent-team-run.ts` paths | runtime run resolver/types | No (path wording lags symbol) | Rename | C-013 |
| Frontend runtime GraphQL document module paths | runtime run operations | No (`agentRunQueries` / `agentTeamRunMutations`) | Rename | C-014 |
| Memory GraphQL `memory-view.ts` argument name | runtime memory view selector | No (`agentId` currently) | Rename | C-009 |
| Memory frontend selection store key | runtime memory selected ID | No (`selectedAgentId` currently) | Rename | C-010 |
| Frontend runtime selection/context/event contracts | runtime run selection + lifecycle UI flow | No (`selectedInstanceId`, `selectInstance`, `instance-*`) | Rename | C-016,C-017,C-019 |
| Runtime row component filename | runtime list row for agent runs | No (`RunningInstanceRow.vue`) | Rename/Move | C-018 |
| Runtime exported APIs | run orchestration | Yes | N/A | C-001..C-015 |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Agent runtime manager | definitions/prompts/workspace/services | resolvers, history services, stream handlers | Medium | keep API rename atomic and compile-checked |
| Team runtime manager | team defs + agent defs + workspace | team resolver/history/stream handlers | Medium | keep method rename atomic + targeted tests |
| GraphQL runtime resolvers | managers + converters + history | frontend documents/stores | High | update frontend GraphQL docs + tests in same ticket |
| Frontend runtime stores | GraphQL docs/generated types | runtime components/views | High | keep operation names and generated typings aligned |
| Memory resolvers/services | filesystem memory store + converters | memory frontend stores/components | High | rename resolver operations + args and update frontend queries/stores/tests atomically |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| runtime `*InstanceId` identifiers | remove all production usages and replace with `*RunId` | no alias retained | ripgrep scan on production paths |
| runtime manager/method `*Instance*` names | replace callsites and exports with `*Run*` | breaking rename by design | typecheck + targeted tests |
| memory runtime `agentId` selectors | replace memory runtime identity fields/args/state with `runId` | no alias retained | schema/type/test scans |
| stale docs path references | sync docs to real paths and symbols | avoid stale architecture guidance | manual doc scan |

## Data Models (If Needed)

- No persistence schema redesign required.
- Run history manifests/index remain keyed by run/team IDs and definition IDs.

## Error Handling And Edge Cases

- API rename breaks external callers unless schema clients update concurrently.
- If frontend codegen uses outdated schema endpoint, generated types can fail.
- Memory query rename (`listRunMemorySnapshots`, `getRunMemoryView`) is breaking for any stale clients.
- Runtime module path renames increase import churn risk; mitigated with full ripgrep import sweep and targeted tests.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001,R-005 | Create/continue single-agent run | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-001 |
| UC-002 | R-002,R-005 | Create/continue team run | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-002 |
| UC-003 | R-001,R-002,R-003 | Query/terminate active runs via GraphQL | Yes | N/A | Yes | `future-state-runtime-call-stack.md` UC-003 |
| UC-004 | R-001,R-002,R-005 | Restore runs from history/manifest | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-004 |
| UC-005 | R-004,R-006 | Frontend runtime stores use renamed operations | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-005 |
| UC-006 | R-007,R-008 | Memory index/view uses runtime `runId` end-to-end | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-006 |
| UC-007 | R-009 | Runtime module/path rename propagation | Yes | N/A | Yes | `future-state-runtime-call-stack.md` UC-007 |
| UC-008 | R-010 | Frontend runtime internal run naming alignment | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-008 |

## Performance / Security Considerations

- Rename-only changes should not alter computational complexity.
- Security posture unchanged; same auth/transport boundaries apply.

## Migration / Rollout (If Needed)

- Breaking rollout: backend GraphQL and frontend client updates must ship together.
- No compatibility alias planned in code.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/E2E/Manual) | Status |
| --- | --- | --- | --- |
| C-001..C-010 | T-001..T-010 | targeted server tests + targeted frontend tests + grep + doc verification | Completed |
| C-011..C-015 | T-011..T-015 | import/path scans + targeted server/frontend runtime tests + docs updates | Completed |
| C-016..C-020 | T-016..T-020 | targeted frontend runtime store/component/history tests + scans + docs updates | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-02-23 | User scope preference (initial) | Local Fix | Path-level rename churn risk for this ticket | No | Yes (initially constrained to symbol/API rename) | Closed |
| 2026-02-23 | Memory API investigation | Requirement Gap | Runtime memory APIs still used `agentId` naming for run identity | Yes | Yes (`v2` memory API rename scope) | Closed |
| 2026-02-23 | Follow-up investigation on runtime module drift | Design Impact | Runtime server/frontend module paths still carried `instance` naming despite run semantics | Yes | Yes (`v3` adds C-011..C-015 `Rename/Move` scope) | Closed |
| 2026-02-23 | Follow-up investigation on frontend runtime internals | Design Impact | Frontend runtime selection/context/event APIs still carried `instance` naming | Yes | Yes (`v4` adds C-016..C-020 scope) | Closed |

## Open Questions

1. Should application-domain `instance` naming (`pages/applications/**`, `stores/application*`) be intentionally kept separate from agent/team runtime naming?
