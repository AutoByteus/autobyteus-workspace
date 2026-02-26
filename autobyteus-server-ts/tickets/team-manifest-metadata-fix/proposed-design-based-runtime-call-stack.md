# Proposed-Design-Based Runtime Call Stack (v1)

## Use Case UC-1: Lazy Team Creation Persists Correct Team Metadata
Coverage: primary=Yes, fallback=Yes, error=Yes

1. `src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(...)`
2. Branch: `teamId` absent -> lazy create path.
3. `AgentTeamRunManager.createTeamRun(teamDefinitionId, memberConfigs)`
4. `AgentTeamRunResolver.resolveTeamDefinitionMetadata(teamDefinitionId)`
5. `AgentTeamDefinitionService.getDefinitionById(teamDefinitionId)`
6. `AgentTeamRunResolver.buildTeamRunManifest({ teamId, teamDefinitionId, teamDefinitionName, coordinatorMemberName, memberConfigs })`
7. For each member config: normalize route key + compute memberAgentId.
8. Set manifest `teamDefinitionName` from resolved definition name (fallback: `teamDefinitionId`).
9. Set `coordinatorMemberRouteKey` from coordinator member route (fallback: first binding).
10. `TeamRunHistoryService.upsertTeamRunHistoryRow({ teamId, manifest, ... })`
11. `TeamCommandIngressService.dispatchUserMessage(...)`
12. Return GraphQL success.

Fallback path:
- If definition lookup returns null, fallback metadata uses `teamDefinitionId` + first binding coordinator key.

Error path:
- Team creation failure or ingress failure returns GraphQL failure payload.

## Use Case UC-2: Explicit Team Creation Persists Correct Team Metadata
Coverage: primary=Yes, fallback=Yes, error=Yes

1. `src/api/graphql/types/agent-team-run.ts:createAgentTeamRun(...)`
2. `AgentTeamRunManager.createTeamRun(...)`
3. `AgentTeamRunResolver.resolveTeamDefinitionMetadata(teamDefinitionId)`
4. `AgentTeamDefinitionService.getDefinitionById(teamDefinitionId)`
5. `AgentTeamRunResolver.buildTeamRunManifest(...)`
6. `TeamRunHistoryService.upsertTeamRunHistoryRow(...)`
7. Return GraphQL success.

Fallback path:
- Missing definition metadata uses same safe fallback as UC-1.

Error path:
- Creation error returns GraphQL failure payload.
