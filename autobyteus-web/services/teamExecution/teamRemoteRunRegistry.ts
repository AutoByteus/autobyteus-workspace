import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useRemoteRunsStore, type RemoteRunRetryAdapter } from '~/stores/remoteRunsStore'
import {
  ensureAuthoritativeTeamMemberProjection,
  isTeamMemberProjectionAuthoritative,
} from '~/services/runHydration/teamMemberProjectionHydrationService'

/**
 * autobyteus-278: a Team root's remote runs in the window's registry, from the Team's stream snapshot or its stored
 * view, with this Team's mechanisms for the store's one Retry rule (SR-008): its stream, its focused member, and a
 * member's authoritative projection as "loaded".
 */
export const registerTeamRemoteRuns = (teamRunId: string, executions: readonly RemoteTaskExecutionDto[]): void => {
  const remoteRuns = useRemoteRunsStore()
  const adapter = teamRemoteRetryAdapter(teamRunId)
  executions.forEach((execution) => remoteRuns.register(execution, adapter))
}

/**
 * autobyteus-278 (CRR-006 F-006): the one lazy read of a remote Team member's conversation from its node. A Team view
 * focuses a remote member first and reads it after; a failed read shows only as its run's reachability (the read
 * marks it), never as a Team open or inspection error. `false` when nothing starts (the member is loaded).
 */
export const readRemoteTeamMember = (team: AgentTeamContext, agentRunId: string): boolean => {
  if (isTeamMemberProjectionAuthoritative(team, agentRunId)) return false
  void ensureAuthoritativeTeamMemberProjection({ team, agentRunId })
    .catch((cause) => console.warn(`[agentTeam] Could not load '${agentRunId}' of '${team.view.getRootTeamRunId()}'.`, cause))
  return true
}

const teamRemoteRetryAdapter = (teamRunId: string): RemoteRunRetryAdapter => {
  const team = () => useAgentTeamContextsStore().getTeamContextById(teamRunId)
  const isLoaded = (agentRunId: string): boolean => {
    const current = team()
    return current ? isTeamMemberProjectionAuthoritative(current, agentRunId) : false
  }
  return Object.freeze({
    refreshOnStream: () => useAgentTeamRunStore().refreshTeamRemote(teamRunId),
    selectedAgent: () => team()?.view.getFocusedAgentRunId() ?? null,
    isLoaded,
    rereadAgent: (agentRunId: string) => {
      const current = team()
      return current ? readRemoteTeamMember(current, agentRunId) : false
    },
  })
}
