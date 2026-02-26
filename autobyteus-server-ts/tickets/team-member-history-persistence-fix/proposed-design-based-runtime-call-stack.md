# Proposed-Design-Based Runtime Call Stack - team-member-history-persistence-fix

## UC-1: Lazy create and first send
1. `api/graphql/types/agent-team-run.ts:sendMessageToTeam(input)`
2. Branch `!teamId && teamDefinitionId/memberConfigs provided`.
3. Generate `teamId` up front.
4. Resolve member runtime configs (`memberRouteKey`, deterministic `memberAgentId`).
5. `AgentTeamRunManager.createTeamRunWithId(teamId, teamDefinitionId, resolvedMemberConfigs)`.
6. Build manifest from same resolved configs.
7. `TeamRunHistoryService.upsertTeamRunHistoryRow(teamId, manifest, ...)`.
8. Dispatch user message.
9. `TeamRunHistoryService.onTeamEvent(teamId, ACTIVE)`.

## UC-2: Explicit createAgentTeamRun
1. `api/graphql/types/agent-team-run.ts:createAgentTeamRun(input)`
2. Generate `teamId`.
3. Resolve member runtime configs with deterministic IDs.
4. Create runtime with `createTeamRunWithId(...)`.
5. Persist manifest with same IDs.

## UC-3: Continue/restore run
1. `run-history/services/team-run-continuation-service.ts:continueTeamRun(input)`
2. Load manifest via `getTeamRunResumeConfig(teamId)`.
3. Build member configs from manifest.
4. `createTeamRunWithId(teamId, teamDefinitionId, memberConfigs)` without forcing divergent member memoryDir.
5. Dispatch message and update history.
