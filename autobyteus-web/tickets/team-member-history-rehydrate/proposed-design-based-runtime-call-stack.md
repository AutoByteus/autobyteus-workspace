# Proposed-Design-Based Runtime Call Stack - team-member-history-rehydrate

## Design Basis (Small Scope)
- Source: `tickets/team-member-history-rehydrate/implementation-plan.md` solution sketch.
- Target: Team history open hydrates conversation from run projections before adding team context.

## UC-1: Open historical team member row renders history
1. `stores/runTreeStore.ts:selectTreeRun(row)`
2. Branch `team row && no localTeamContext` -> `await openTeamMemberRun(teamId, memberRouteKey)`
3. `stores/runTreeStore.ts:openTeamMemberRun(...)`
4. `await getApolloClient().query(GetTeamRunResumeConfig)`
5. Parse team manifest and member bindings.
6. For each member binding with `memberAgentId`:
7. `await getApolloClient().query(GetRunProjection(agentId=memberAgentId))`
8. `services/runOpen/runOpenCoordinator.ts:buildConversationFromProjection(...)`
9. Build `AgentContext` with hydrated conversation and member config.
10. Add all members into `agentTeamContextsStore.addTeamContext(...)`.
11. Select team and focused member.
12. UI renders focused member conversation from hydrated store state.

## UC-2: Switch focused member in loaded team shows that member history
1. `stores/runTreeStore.ts:selectTreeRun(row)`
2. Branch `team row && localTeamContext exists`.
3. `agentTeamContextsStore.setFocusedMember(memberRouteKey)`
4. Keep existing context; no re-fetch required.
5. UI switches to already-hydrated member conversation.

## UC-3: Projection fetch failure fallback
1. `openTeamMemberRun` attempts `GetRunProjection` per member.
2. Query errors for one member are caught and logged.
3. Member context falls back to empty conversation.
4. Team open proceeds for remaining members and selected member when possible.
