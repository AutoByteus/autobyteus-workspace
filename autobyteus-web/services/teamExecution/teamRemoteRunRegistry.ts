import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
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
      if (!current || isLoaded(agentRunId)) return false
      void ensureAuthoritativeTeamMemberProjection({ team: current, agentRunId })
        .catch((cause) => console.warn(`[agentTeam] Could not load '${agentRunId}' of '${teamRunId}'.`, cause))
      return true
    },
  })
}
