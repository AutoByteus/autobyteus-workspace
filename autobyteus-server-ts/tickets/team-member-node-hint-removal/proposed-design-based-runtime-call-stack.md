# Proposed-Design-Based Runtime Call Stack (v1)

## UC1-create-team-definition
1. `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue:handleSubmit(...)`
   - Emits payload with member `homeNodeId` only.
2. `autobyteus-web/stores/agentTeamDefinitionStore.ts:createAgentTeamDefinition(...)`
   - Sends GraphQL `CreateAgentTeamDefinition` mutation.
3. `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:createAgentTeamDefinition(...)`
   - Maps GraphQL node input -> `DomainTeamMember(homeNodeId)`.
4. `autobyteus-server-ts/src/agent-team-definition/converters/prisma-converter.ts:toCreateInput(...)`
   - Serializes nodes with `home_node_id` only.

Error branch:
- Missing/blank `homeNodeId` fails at resolver `normalizeRequiredString(...)`.

## UC2-update-team-definition
1. `autobyteus-web/stores/agentTeamDefinitionStore.ts:updateAgentTeamDefinition(...)`
2. `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:updateAgentTeamDefinition(...)`
3. `autobyteus-server-ts/src/agent-team-definition/converters/prisma-converter.ts:toUpdateInput(...)`

Primary outcome:
- Updated definition persists ownership-only nodes.

## UC3-start-distributed-team-run
1. `autobyteus-server-ts/src/distributed/team-run-orchestrator/team-run-orchestrator.ts:startRunIfMissing(...)`
2. `autobyteus-server-ts/src/distributed/member-placement/member-placement-resolver.ts:resolvePlacement(...)`
   - Canonicalizes `homeNodeId` (`embedded-local` -> default node id when available).
   - Calls ownership validation policy.
   - Selects home node when available and healthy.
   - Falls back to default placement policy only when home is absent (legacy/corrupt) or unresolved.
3. `autobyteus-server-ts/src/distributed/dependency-hydration/dependency-hydration-service.ts:ensureMemberDependenciesAvailable(...)`
4. `autobyteus-server-ts/src/distributed/routing/team-routing-port-adapter.ts:dispatch*...`

Error branches:
- Unknown/unhealthy `homeNodeId` -> policy throws ownership error.
- No eligible node -> default placement throws `NoPlacementCandidateError`.

## UC4-load-legacy-json-with-hints
1. `autobyteus-server-ts/src/agent-team-definition/converters/prisma-converter.ts:parseNodes(...)`
   - Reads node payload, ignores legacy hint keys if present.
   - Produces domain `TeamMember` with `homeNodeId` only.
2. Subsequent create/update/run paths use ownership-only model.
