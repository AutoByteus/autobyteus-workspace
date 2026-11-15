import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import type { TeamWorkspaceContextView } from '~/types/workspace/activeAgentWorkspaceTarget'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService'

/** A team run's own view, as its focused member's workspace shows it: its members, its focus and its coordinator. */
export const teamWorkspaceContextViewOf = (team: AgentTeamContext): TeamWorkspaceContextView => {
  const view = team.view
  const tree = view.getExecutionTree()
  const focusedContext = view.getFocusedAgentContext()
  if (!focusedContext) throw new Error('Standalone Team has no focused Agent context.')
  const entries = view.listAgentContextEntries()
  return Object.freeze({
    rootKind: 'agent_team', rootRunId: view.getRootTeamRunId(),
    teamRunId: view.getRootTeamRunId(), teamAddress: parseAgentTeamAddress('/'),
    teamDefinitionName: view.getTeamDefinitionName(),
    coordinatorAddress: parseAgentTeamAddress(tree.root_team.coordinator_address),
    focusedMemberAddress: view.getFocusedMemberAddress(),
    focusedAgentRunId: view.getFocusedAgentRunId(), focusedAgentContext: focusedContext,
    isFocusedProjectionAuthoritative: () => isTeamMemberProjectionAuthoritative(team, view.getFocusedAgentRunId()),
    listMembers: () => Object.freeze(entries.map((entry) => Object.freeze({
      address: entry.memberAddress, agentRunId: entry.agentRunId,
      context: entry.agentContext, coordinator: entry.memberAddress === tree.root_team.coordinator_address,
    }))),
  })
}
