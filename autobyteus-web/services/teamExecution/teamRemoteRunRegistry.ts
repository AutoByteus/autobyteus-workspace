import { remoteTaskExecutionRunIdOf, type RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import {
  ensureAuthoritativeTeamMemberProjection,
  isTeamMemberProjectionAuthoritative,
} from '~/services/runHydration/teamMemberProjectionHydrationService'

/**
 * autobyteus-278: a Team root's remote runs in the window's registry, from the Team's stream snapshot or its stored
 * view. Retry asks the run's node again: on the Team's stream when it is ready (the answers arrive there); without a
 * stream, by reading the run's first agent not yet loaded from its node. A Team member whose read failed is not
 * focused, so selecting it again reads it.
 */
export const registerTeamRemoteRuns = (teamRunId: string, executions: readonly RemoteTaskExecutionDto[]): void => {
  const remoteRuns = useRemoteRunsStore()
  executions.forEach((execution) => {
    const runId = remoteTaskExecutionRunIdOf(execution)
    remoteRuns.register(execution, () => retryTeamRemoteRun(teamRunId, runId))
  })
}

const retryTeamRemoteRun = (teamRunId: string, runId: string): boolean => {
  if (useAgentTeamRunStore().refreshTeamRemote(teamRunId)) return true
  const team = useAgentTeamContextsStore().getTeamContextById(teamRunId)
  const agentRunId = team ? useRemoteRunsStore().run(runId)?.agentRunIds.find((id) => !isTeamMemberProjectionAuthoritative(team, id)) : null
  if (!team || !agentRunId) return false
  void ensureAuthoritativeTeamMemberProjection({ team, agentRunId })
    .catch((cause) => console.warn(`[agentTeam] Could not load '${agentRunId}' of '${teamRunId}'.`, cause))
  return true
}
