# Implementation Plan

## Stage
- Stage: `Finalized`
- Scope: `Small`

## Tasks
1. Add avatar rendering to workspace team rows in `WorkspaceAgentRunsTreePanel.vue`.
2. Add avatar rendering to workspace team member rows in `WorkspaceAgentRunsTreePanel.vue`.
3. Add helper logic for team/member avatar URL resolution and broken-image fallback keys.
4. Keep existing team/member interactions unchanged.
5. Extend `WorkspaceAgentRunsTreePanel.spec.ts` with team and team-member avatar tests.
6. Pass focused member `agentName/agentAvatarUrl` from `AgentTeamEventMonitor` into `AgentEventMonitor`.
7. Extend `AgentTeamEventMonitor.spec.ts` to validate focused member avatar/name pass-through.
8. Replace team header emoji with focused-member avatar + fallback initials in `TeamWorkspaceView`.
9. Add agent-header definition fallback for avatar resolution in `AgentWorkspaceView`.
10. Extend `TeamWorkspaceView.spec.ts` and add `AgentWorkspaceView.spec.ts`.
11. Run focused component tests.

## Verification Command
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web test:nuxt components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts --run`
