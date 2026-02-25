# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft after investigation | Defined large-scope run-id naming normalization architecture and change inventory across server/web. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/rename-runtime-instance-id-to-run-id/investigation-notes.md`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Normalize runtime execution identity naming from `instance` / ambiguous `agentId`/`teamId` to explicit run naming (`runId`, `agentRunId`, `teamRunId`) across active server and frontend runtime paths. Preserve stable definition identity naming and DB physical column names via ORM mapping. Remove instance-named runtime module paths and stale symbol names in active production code.

## Goals

- Remove runtime `Instance` naming from active runtime manager/resolver/module paths.
- Ensure GraphQL runtime operations and payload keys are run-oriented.
- Ensure frontend runtime selection/events/store contracts are run-oriented.
- Align memory, artifact, token-usage, and external-channel runtime contracts to run identity semantics.
- Keep behavior unchanged and avoid compatibility aliases.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/rename active instance-named runtime modules and delete stale imports/callsites in same ticket.

## Requirements And Use Cases

| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Agent runtime identifiers/managers use run naming | AC-1, AC-2 | UC-001, UC-003, UC-004, UC-007 |
| R-002 | Team runtime identifiers/managers use run naming | AC-1, AC-2 | UC-002, UC-003, UC-004, UC-007 |
| R-003 | GraphQL runtime surface uses run naming | AC-3 | UC-003, UC-006, UC-010, UC-011 |
| R-004 | Frontend runtime consumers use run naming | AC-5 | UC-005, UC-006, UC-008, UC-010 |
| R-005 | Definition IDs unchanged | AC-4 | UC-001, UC-002, UC-004 |
| R-006 | Docs aligned | AC-6 | UC-007, UC-010, UC-011 |
| R-007 | Memory APIs run-oriented | AC-7 | UC-006 |
| R-008 | Non-runtime ownership IDs unchanged | AC-8 | UC-009, UC-011 |
| R-009 | Runtime module paths run-named | AC-9 | UC-007 |
| R-010 | Frontend runtime selection/events run-oriented | AC-10 | UC-008 |
| R-011 | Internal runtime identity symbols normalized | AC-11 | UC-009 |
| R-012 | Artifact runtime contracts run-oriented | AC-12 | UC-010 |
| R-013 | Persistence contracts run-oriented with DB map preserved | AC-13 | UC-010 |
| R-014 | Conversation/runtime monitor props use run naming | AC-14 | UC-005, UC-008, UC-009 |
| R-015 | External-channel runtime contracts use agentRunId/teamRunId | AC-15 | UC-011 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Runtime creation/send/terminate enters via GraphQL runtime resolvers and run-history continuation services. | `autobyteus-server-ts/src/api/graphql/types/agent-instance.ts`, `agent-team-instance.ts`, `agent-run-history.ts`, `team-run-history.ts`, `run-continuation-service.ts`, `team-run-continuation-service.ts` | None blocking |
| Current Naming Conventions | Runtime semantics are mixed: `instance`, `agentId`, `teamId` often represent run identity. | `agent-instance-manager.ts`, `agentSelectionStore.ts`, run/memory/artifact GraphQL docs | Need careful ownership vs runtime disambiguation in external-channel |
| Impacted Modules / Responsibilities | Server runtime manager + GraphQL + persistence + external-channel + frontend runtime stores/components/docs are all impacted. | See investigation-notes source list | Generated GraphQL refresh may reveal additional consumer sites |
| Data / Persistence / External IO | DB columns currently `agent_id`/`team_id` in affected models; must keep physical columns. | `autobyteus-server-ts/prisma/schema.prisma` | Ensure Prisma client consumers remain type-safe after field rename |

## Current State (As-Is)

- Active manager modules and resolver files still use `instance` names.
- GraphQL run-history/memory/artifact contracts expose runtime IDs as `agentId`/`teamId`.
- Frontend runtime selection/events use `selectedInstanceId`, `selectInstance`, `instance-selected`, `instance-created`.
- External-channel runtime contracts and SQL provider fields use `agentId`/`teamId` as runtime execution identifiers.

## Target State (To-Be)

- Runtime manager, resolver, converter, and schema modules use `Run` naming (`agent-run`, `agent-team-run`, `AgentRunManager`, `AgentTeamRunManager`).
- GraphQL runtime surfaces use explicit run naming (`runId`, `teamRunId`, `agentRunId`) while keeping definition IDs unchanged.
- Memory API uses `listRunMemorySnapshots`, `getRunMemoryView(runId)` and frontend uses same.
- Artifact/token usage runtime contracts use `runId` at domain/repository/provider boundaries with `@map("agent_id")` in Prisma.
- External-channel runtime dispatch/binding/receipt/reply contracts use `agentRunId`/`teamRunId` with DB column mapping preserved.
- Frontend runtime selection/events/components use `selectedRunId`, `selectRun`, `run-selected`, `run-created` and runId payload keys.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Keep` current high-level layering, apply `Rename/Move` and boundary contract normalization.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - Complexity: avoids large runtime behavior rewrite.
  - Testability: explicit run identity names reduce confusion and test ambiguity.
  - Operability: logs and runtime traces become semantically clear.
  - Evolution cost: lower long-term drift by eliminating mixed runtime identity vocabulary.
- Layering fitness assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep + Move/Rename + Remove obsolete instance modules`

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep old names + wrappers/aliases | Lower immediate churn | Violates no-legacy policy; prolongs ambiguity | Rejected | Conflicts with mandatory modernization policy |
| B | Full runtime architecture rewrite | Potentially cleaner reset | High risk and scope blowup for naming ticket | Rejected | Not required for ticket goals |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Rename/Move | `src/agent-execution/services/agent-instance-manager.ts` | `src/agent-execution/services/agent-run-manager.ts` | Runtime manager naming alignment | server runtime core | class + method rename to run semantics |
| C-002 | Rename/Move | `src/agent-team-execution/services/agent-team-instance-manager.ts` | `src/agent-team-execution/services/agent-team-run-manager.ts` | Team runtime manager alignment | server team runtime | preserve runtime behavior |
| C-003 | Rename/Move | `src/api/graphql/types/agent-instance.ts`, `agent-team-instance.ts` | `src/api/graphql/types/agent-run.ts`, `agent-team-run.ts` | GraphQL module/path naming alignment | server GraphQL runtime | resolver/type names move to Run |
| C-004 | Rename/Move | `src/api/graphql/converters/agent-instance-converter.ts`, `agent-team-instance-converter.ts` | `src/api/graphql/converters/agent-run-converter.ts`, `agent-team-run-converter.ts` | Converter naming alignment | server GraphQL converter layer | update schema imports |
| C-005 | Modify | `src/api/graphql/types/agent-run-history.ts`, `team-run-history.ts` | same | run-history GraphQL args/payload keys use run names | server GraphQL history | `agentId` -> `runId`, `teamId` -> `teamRunId` where runtime identity |
| C-006 | Modify | `src/api/graphql/types/memory-index.ts`, `memory-view.ts`; web memory docs/stores/types | same | memory APIs use run naming | server+web memory | `listRunMemorySnapshots`, `getRunMemoryView(runId)` |
| C-007 | Modify | `src/api/graphql/types/agent-artifact.ts`, web `agentArtifactQueries.ts` | same | artifact runtime contracts use runId | server+web artifact | GraphQL argument and payload names |
| C-008 | Modify | token/artifact domain + repositories + Prisma model fields | same | normalize runtime identity naming at persistence boundary | server persistence | keep physical columns via `@map` |
| C-009 | Modify | external-channel domain/services/providers/runtime setup | same | runtime contracts use `agentRunId`/`teamRunId` | server external-channel | preserve callback/dispatch behavior |
| C-010 | Modify | web `graphql/queries/*.ts`, `graphql/mutations/*.ts` for runtime paths | same | frontend query/mutation contract alignment | web data layer | includes run-history/memory/artifact |
| C-011 | Modify | `web/stores/agentSelectionStore.ts` and consumers | same | runtime selection API naming alignment | web runtime state | `selectedRunId`, `selectRun` |
| C-012 | Modify | `web/components/AppLeftPanel.vue`, `WorkspaceAgentRunsTreePanel.vue`, `RunningAgentsPanel.vue` and tests | same | runtime event naming alignment | web UI boundary | `run-selected`, `run-created` |
| C-013 | Modify | `web/generated/graphql.ts` | same | keep generated types aligned with renamed schema/docs | web typing/codegen | regenerate after GraphQL doc updates |
| C-014 | Modify | impacted `docs/**/*.md` | same | docs sync to new names | server+web docs | no stale instance module names |
| C-015 | Remove | stale instance-named imports/calls/tests in active runtime path | removed | cleanup/decommission | server+web | no dual API paths |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Server Runtime Manager Layer | Create/restore/terminate active runs | run manager APIs + in-memory runtime lookup | GraphQL DTO naming concerns | Rename-only behavioral parity |
| Server GraphQL Boundary | Expose runtime operations and DTOs | run-oriented operation names/args/results | persistence internals | strict runtime terminology |
| Server Domain/Persistence | runtime artifact/token/external-channel identity storage contracts | runId/agentRunId/teamRunId model fields with DB maps | UI/event naming | map legacy DB columns only at ORM mapping layer |
| Frontend Data Layer | GraphQL docs + generated types + stores | run-oriented variables/fields and store contracts | server manager internals | no compatibility aliases |
| Frontend UI Boundary | emit/consume run-oriented events and props | run-selected/run-created payloads | server naming decisions | keep behavior same |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| server run managers | Rename/Move+Modify | Runtime manager | runtime lifecycle orchestration | `createAgentRun`, `restoreAgentRun`, `terminateAgentRun`, `listActiveRuns` | run config -> runtime ID | autobyteus-ts runtime factories |
| server runtime GraphQL types/resolvers | Rename/Move+Modify | GraphQL boundary | runtime API contract | `agentRun(s)`, `agentTeamRun(s)`, run args | GraphQL input/output | managers + run-history services |
| server memory/artifact/token usage modules | Modify | Domain/Persistence | runtime identity data and projection | run-oriented fields and methods | runId in/out | Prisma repositories + file stores |
| server external-channel modules | Modify | Integration boundary | runtime dispatch/binding/receipt/callback contracts | `agentRunId`/`teamRunId` target contracts | inbound envelope -> runtime dispatch target | runtime managers + SQL providers |
| web run selection and run tree stores | Modify | Frontend state boundary | selected run semantics and routing | `selectedRunId`, `selectRun` | run id state/events | GraphQL docs + run-open service |
| web runtime UI components | Modify | Frontend view boundary | emit run naming events/props | `run-selected`, `run-created` | user action -> route/store actions | run stores + selection store |
| web GraphQL docs/generated types | Modify | Frontend data boundary | schema-aligned typed operations | run-oriented operation fields | query vars -> typed data | server GraphQL schema/codegen |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: event and selection naming changes stay in component/store boundaries.
- Non-UI scope: runtime identity rename stays in runtime manager/service/repository boundaries.
- Integration scope: external-channel contracts are normalized in domain/service/provider boundaries without leaking DB column names.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `agent-instance-manager.ts` | `agent-run-manager.ts` | runtime execution identity is run | remove instance wording |
| File | `agent-team-instance-manager.ts` | `agent-team-run-manager.ts` | team runtime identity is team run | preserve behavior |
| File | `agent-instance.ts` | `agent-run.ts` | GraphQL runtime type naming clarity | path aligned with symbol names |
| File | `agent-team-instance.ts` | `agent-team-run.ts` | team runtime GraphQL clarity | path aligned with resolver name |
| API | `selectedInstanceId` | `selectedRunId` | frontend runtime identity clarity | state only |
| API | `selectInstance` | `selectRun` | action semantics | state action rename |
| Event | `instance-selected` | `run-selected` | explicit runtime event | UI contracts update together |
| Event | `instance-created` | `run-created` | explicit runtime event | UI contracts update together |
| API | `getAgentMemoryView(agentId)` | `getRunMemoryView(runId)` | memory path is run folder | end-to-end run semantics |
| API | `listAgentMemorySnapshots` | `listRunMemorySnapshots` | memory snapshots keyed by run | end-to-end run semantics |
| API | `agentArtifacts(agentId)` | `agentArtifacts(runId)` | artifacts belong to run execution | GraphQL/runtime rename |
| API | external target `agentId`/`teamId` | `agentRunId`/`teamRunId` | disambiguate runtime vs static identity | DB columns remain mapped |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| Agent runtime manager | per-run runtime lifecycle | No | Rename/Move | C-001 |
| Team runtime manager | per-team-run runtime lifecycle | No | Rename/Move | C-002 |
| Runtime GraphQL instance modules | runtime run query/mutation boundary | No | Rename/Move | C-003 |
| Memory GraphQL `agent*` operation names | run-memory snapshot/view | No | Rename | C-006 |
| Artifact runtime `agentId` field names | per-run artifact identity | No | Rename | C-007/C-008 |
| External-channel target ID fields | runtime dispatch target identity | No | Rename | C-009 |
| Frontend selection/event APIs | active run selection and creation | No | Rename | C-011/C-012 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep `instance` file names but rename only variables | High | Rename module paths and symbols together | Change | Avoid long-term naming drift and import confusion |
| Keep GraphQL arg names as `agentId/teamId` for compatibility | High | Rename boundary contracts to run semantics | Change | Ticket explicitly disallows legacy compatibility aliases |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Add alias wrappers (`agentInstance*` and `agentRun*`) | High | Replace with single run-named APIs and cleanup callsites | Reject shortcut | no legacy policy |
| Keep mixed event names with adapter translation in UI | Medium | Rename emitters/listeners consistently | Use structural fix | simpler and clearer |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Server run managers | autobyteus-ts runtime factories | GraphQL runtime resolvers, run-history services, external-channel deps | Medium | rename class+method+imports atomically |
| GraphQL runtime types/resolvers | run managers + run-history services | web GraphQL documents/codegen | High | do server GraphQL + web docs/codegen in same round |
| External-channel runtime contracts | domain models + providers + manager ports | callback/ingress services/tests | High | update domain types first, then services/providers, then resolver/setup/tests |
| Frontend selection store/events | run tree and workspace components | active context/runOpen services/tests | High | rename store API and events in one coordinated patch |

## Allowed Dependency Direction (Mandatory)

- UI components -> frontend stores -> GraphQL documents/generated types.
- GraphQL resolvers -> runtime managers/services -> repositories/providers.
- External-channel services -> runtime manager ports and provider interfaces.
- Persistence models/repositories do not depend on GraphQL/UI naming.

Temporary violations: none expected. Any detected cycle will be resolved by type alias cleanup in same patch.

## Decommission / Cleanup Plan

- Remove instance-named runtime files once run-named replacements are wired (`C-015`).
- Remove stale imports/calls in tests and docs.
- Remove stale GraphQL operation docs and generated symbol references.
- Keep only Prisma mapping compatibility (`@map`) and remove API-level compatibility aliases.

## Error Handling And Data Model Expectations

- Runtime behavior unchanged; only naming/boundary contracts change.
- External-channel lookup failures and callback no-op reasons unchanged.
- Prisma data storage schema remains physically compatible using mapped legacy column names.

## Use-Case Coverage Matrix

| use_case_id | primary path covered | fallback path covered | error path covered | mapped runtime call stack section |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-001` |
| UC-002 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-002` |
| UC-003 | Yes | N/A | Yes | `future-state-runtime-call-stack.md#uc-003` |
| UC-004 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-004` |
| UC-005 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-005` |
| UC-006 | Yes | N/A | Yes | `future-state-runtime-call-stack.md#uc-006` |
| UC-007 | Yes | N/A | Yes | `future-state-runtime-call-stack.md#uc-007` |
| UC-008 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-008` |
| UC-009 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-009` |
| UC-010 | Yes | N/A | Yes | `future-state-runtime-call-stack.md#uc-010` |
| UC-011 | Yes | Yes | Yes | `future-state-runtime-call-stack.md#uc-011` |

