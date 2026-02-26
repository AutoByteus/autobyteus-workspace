# Proposed-Design-Based Runtime Call Stack - team-member-deregistration-on-team-terminate

## UC1 - Terminate team, then recreate with same deterministic member IDs
1. `src/agent-team/factory/agent-team-factory.ts:removeTeam(teamId)`
2. `src/agent-team/agent-team.ts:stop(timeout)`
3. `src/agent-team/runtime/agent-team-runtime.ts:stop(timeout)`
4. `src/agent-team/runtime/agent-team-worker.ts:asyncRun() -> finally`
5. `src/agent-team/shutdown-steps/agent-team-shutdown-orchestrator.ts:run(context)`
6. `src/agent-team/shutdown-steps/agent-team-shutdown-step.ts:execute(context)`
7. `src/agent-team/context/team-manager.ts:shutdownManagedAgents(timeout)`
8. `src/agent/factory/agent-factory.ts:removeAgent(memberAgentId, timeout)`
9. `src/agent/runtime/agent-runtime.ts:stop(timeout)` and context unregister
10. Later recreate:
11. `src/agent-team/factory/agent-team-factory.ts:createTeamWithId(teamId, config)`
12. `src/agent-team/context/team-manager.ts:ensureCoordinatorIsReady(...)`
13. `src/agent-team/context/team-manager.ts:ensureNodeIsReady(...)`
14. `src/agent/factory/agent-factory.ts:createAgentWithId(memberAgentId, config)` succeeds (no stale active entry)
15. `src/agent-team/utils/wait-for-idle.ts:waitForTeamToBeIdle(...)` resolves to idle.

## Error/Fallback Path
- If `removeAgent` returns `false` (unexpected unregistered state), `shutdownManagedAgents` attempts direct `agent.stop(timeout)` and still clears local caches (`nodesCache`, `agentIdToNameMap`) to avoid stale intra-team references.
