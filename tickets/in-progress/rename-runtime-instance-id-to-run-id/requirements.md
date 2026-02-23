# Requirements

## Status

- Current Status: `Refined` (design input confirmed)
- Previous Status: `Design-ready`

## Goal / Problem Statement

Current runtime naming mixes static definition concepts with per-execution runtime concepts. Runtime entities were historically named with `Instance` terminology (`agentInstanceId`, `agentTeamInstanceId`, `AgentInstanceManager`, etc.), while semantics are actually per-run execution IDs and managers.

Goal: standardize runtime terminology to `Run` across backend and frontend production code paths, while keeping definition terminology unchanged.

Refinement: memory index/view APIs currently expose runtime IDs as `agentId` even though they represent run folders (`memory/agents/<runId>`). This ticket must align those runtime memory surfaces to `runId`.

Refinement: runtime manager/graphql/frontend runtime module paths still include `instance` wording in production code paths. This ticket now includes targeted `Rename/Move` cleanup for those modules so runtime naming is consistent at symbol and module levels.

Refinement: frontend runtime internal store/component/event APIs still use `instance` terminology in agent/team run flows. This ticket now includes frontend runtime internal naming alignment to `run` semantics.
Refinement: active frontend/server runtime internals still contain `agentId`/`teamId` symbols that carry runtime run identifiers. This ticket now includes scoped internal symbol normalization to `runId` / `teamRunId` where semantics are runtime execution identity.
Refinement: agent artifact runtime persistence/query/store flows must use `runId` semantics end-to-end in frontend/server active paths, while protocol boundary wire keys from core remain isolated compatibility mappings.
Refinement: external-channel runtime dispatch/binding/receipt contracts must use `agentRunId`/`teamRunId` semantics across backend domain/services/providers/GraphQL setup/test paths, while persisted DB column names remain unchanged via ORM field mapping.

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-layer impact across backend domain/services, GraphQL schema/resolvers, runtime services, frontend GraphQL documents/stores/components, tests, and docs.
  - Public API/GraphQL operation name changes are breaking.
  - Requires consistency checks and validation across multiple repositories in the workspace.

## In-Scope Use Cases

- `UC-001`: Start or continue a single-agent execution using run terminology end-to-end.
- `UC-002`: Start or continue an agent-team execution using run terminology end-to-end.
- `UC-003`: Query and terminate active agent/agent-team executions through GraphQL using run terminology.
- `UC-004`: Persist and restore run history/continuation flows with manager/service names using run semantics.
- `UC-005`: Frontend runtime stores/components compile and execute against renamed GraphQL runtime fields and operations.
- `UC-006`: Memory index/view flows (backend GraphQL + frontend memory stores/components) use `runId` terminology for runtime selection and retrieval.
- `UC-007`: Runtime manager and GraphQL/frontend runtime module paths use `run` naming (no `agent-instance` / `agent-team-instance` module names in active production paths).
- `UC-008`: Frontend runtime internal APIs/events/state use run terminology (`selectedRunId`, `selectRun`, `createRunFromTemplate`, run-selected/run-created events, runId payload keys) for agent/team flows.
- `UC-009`: Frontend/server runtime internal state and orchestration symbols use run semantics for runtime identity (`runId`, `teamRunId`) instead of ambiguous `agentId`/`teamId` names where those values are execution IDs.
- `UC-010`: Agent artifact backend/frontend flows (repository/service/GraphQL query/store/component/stream handler) use run terminology (`runId`) for runtime identity in active code paths.
- `UC-011`: External-channel runtime contracts (dispatch target, binding target persistence, message receipt lookup, callback reply publishing) use run terminology (`agentRunId`, `teamRunId`) end-to-end in server active paths.

## Out Of Scope / Non-Goals

- No runtime lifecycle behavior change.
- No data model redesign beyond naming.
- No long-term backward compatibility aliases for `*Instance*` runtime names.
- No broad repo-wide wording cleanup outside runtime identity/module scope.
- Application-domain `instance` terminology is out-of-scope for this refinement pass unless explicitly expanded.

## Acceptance Criteria

1. Production code paths contain no runtime ID identifiers:
- `agentInstanceId`
- `agentTeamInstanceId`
- `AgentInstanceId`
- `AgentTeamInstanceId`

2. Runtime manager/service/API semantics use `Run` naming:
- `AgentRunManager`, `AgentTeamRunManager`
- methods such as `createAgentRun`, `restoreAgentRun`, `terminateAgentRun`, `createTeamRun`, `terminateTeamRun`, `listActiveRuns`

3. GraphQL runtime surface uses run terminology:
- runtime object/resolver/operation names for agent/team use `Run` naming.

4. Definition terminology remains unchanged where definition identity is intended:
- `agentDefinitionId`
- `teamDefinitionId` / `agentTeamDefinitionId`

5. Frontend runtime flows compile and run using renamed runtime GraphQL fields/operations without runtime regressions in targeted tests.

6. Docs and examples in impacted modules are aligned with actual code symbols and file paths.

7. Memory runtime APIs use run terminology end-to-end:
- backend memory domain models expose `runId` (not `agentId`) for runtime memory snapshots/views.
- GraphQL memory APIs expose `listRunMemorySnapshots` and `getRunMemoryView(runId: String!)`.
- frontend memory queries/stores/components use `runId` naming (`selectedRunId`, memory entry `runId`).

8. Non-runtime identity usages of `agentId` remain unchanged where they represent stable identity/ownership (not runtime run IDs).

9. Runtime server/frontend module paths for active runtime manager/GraphQL/document files are run-named (`*run*`) and imports are updated accordingly.
10. Frontend runtime agent/team internal APIs/events/state no longer use `instance` terminology in active production paths.
11. Frontend/server runtime internals no longer use ambiguous `agentId`/`teamId` symbols when those fields/variables represent runtime execution IDs.
12. Agent artifact runtime flows use `runId` naming in active frontend/server contracts (`agentArtifacts(runId)`, artifact store `runId` contract), with protocol wire-key mapping (`agent_id`) constrained to streaming boundary handlers only.
13. Backend runtime persistence models without FK coupling expose run semantics in ORM/domain contracts:
- Prisma runtime fields for token usage + artifacts use `runId` (mapped to existing DB columns), and active token-usage/artifact services/repositories/tests are aligned to `runId`.
14. Frontend conversation/event-monitor runtime props and local variables use `runId` naming (no runtime `agentId` labels in active conversation/workspace rendering paths).
15. External-channel runtime contracts use run semantics:
- server external-channel domain/service/provider/runtime symbols use `agentRunId` / `teamRunId`;
- external-channel GraphQL setup resolver mappings use run semantics internally;
- Prisma external-channel model fields expose `agentRunId` / `teamRunId` with DB column mapping preserved (`@map("agent_id")`, `@map("team_id")`).

## Constraints / Dependencies

- Breaking rename is acceptable for this ticket.
- Repositories in scope:
  - `autobyteus-server-ts`
  - `autobyteus-web`
  - `autobyteus-ts` (shared references when applicable)
- Frontend codegen/schema dependency must use a schema containing renamed operations.

## Assumptions

- Existing branch already contains primary rename implementation to validate and polish.
- Runtime module path rename scope is limited to active server/frontend runtime manager/GraphQL/document modules and related tests/docs.
- This refinement scope excludes application feature naming (`pages/applications/**`, `stores/application*`, `types/application/*`).
- This refinement scope excludes non-runtime stable identity fields where `agentId`/`teamId` mean ownership/entity identity rather than execution run identity.

## Open Questions / Risks

1. Should broad wording cleanup (`instance` labels in docs/UI that are not runtime-ID/API identifiers) be completed now or deferred?
2. GraphQL schema consumer/codegen environments may still point to pre-rename schema and fail until updated.
3. Existing baseline server typecheck/build issues can obscure rename regressions; targeted tests are primary signal.
4. GraphQL memory operation rename requires regenerating frontend GraphQL types; codegen depends on environment schema URL.
5. Renaming runtime module paths can require coordinated import updates in tests/docs and may expose hidden stale references.
6. Frontend runtime event payload key renames can ripple through parent-child component contracts and tests.
7. Runtime symbol normalization can unintentionally change semantics for non-runtime identifiers if scope boundaries are not enforced.

## Requirement IDs

- `R-001`: Runtime agent identifiers and manager/service APIs use `Run` terminology.
- `R-002`: Runtime team identifiers and manager/service APIs use `Run` terminology.
- `R-003`: GraphQL runtime types/resolvers/operations expose `Run` naming only.
- `R-004`: Frontend runtime queries/mutations/stores/components consume `Run` naming.
- `R-005`: Definition identifiers remain definition-scoped and unchanged.
- `R-006`: Impacted docs reflect implemented naming and valid paths.
- `R-007`: Memory runtime index/view identifiers and APIs use `runId` naming end-to-end.
- `R-008`: Runtime-ID rename does not spill into non-runtime `agentId` ownership/identity semantics.
- `R-009`: Runtime manager/GraphQL/frontend runtime module paths and callsites use `Run` semantics (`Rename/Move` where needed).
- `R-010`: Frontend runtime selection/context/component APIs/events use run semantics in active agent/team runtime flows.
- `R-011`: Frontend/server runtime internal symbols use run-oriented names for execution identity (`runId`, `teamRunId`) and keep non-runtime ownership IDs unchanged.
- `R-012`: Agent artifact runtime contracts and stores use run-oriented naming (`runId`) in active frontend/server paths; protocol wire compatibility keys remain boundary-only mappings.
- `R-013`: Runtime persistence models without FK constraints normalize execution identity naming to `runId` at ORM/domain/repository/provider boundaries (no physical DB column rename required).
- `R-014`: Frontend conversation rendering/runtime monitor surfaces use run-oriented naming (`runId`) in active component props/local state.
- `R-015`: External-channel runtime dispatch/binding/receipt/callback contracts expose run-oriented naming (`agentRunId`, `teamRunId`) in server active paths, with DB column compatibility preserved through ORM mapping.
