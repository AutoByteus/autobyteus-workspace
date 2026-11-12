import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { MemberLoadTarget } from '~/services/runHydration/memberLoader'
import { agentRunAgentReadSubject, readsOf } from '~/services/runHydration/agentReads'
import { remoteTaskExecutionRunIdOf } from '@autobyteus/agent-presentation-contracts'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import type { AgentRunCollaborationContext } from './agentRunCollaborationContext'

/**
 * What the member loader reads to load one child of a standalone run's published view: the child's stored
 * conversation, activities and files, through the subject its view kind's owner gives it (autobyteus-461 CR-461-022): a
 * child on this node by its own identity, a child on a peer node through this run (its node keeps its files; a failed
 * read marks its node unreachable, autobyteus-278). Null when the child is not in the view.
 */
export const hubChildLoadTarget = (input: Readonly<{
  hostRunId: string
  collaboration: AgentRunCollaborationContext
  agentRunId: string
  /** Whether the run's live stream is ready, so live tool decisions win over the stored projection. */
  liveToolAuthority(): boolean
}>): MemberLoadTarget | null => {
  const local = input.collaboration.getChild(input.agentRunId)
  const remote = local ? null : input.collaboration.getRemoteChild(input.agentRunId)
  const child = local ?? remote
  const agent = input.collaboration.getAgentContext(input.agentRunId)
  if (!child || !agent) return null
  const reads = readsOf(agentRunAgentReadSubject(input.hostRunId, input.collaboration.index, input.agentRunId))
  const remoteRunId = remote ? remoteTaskExecutionRunIdOf(remote.execution) : null
  return Object.freeze({
    agent,
    conversationDefaults: {
      agentDefinitionId: local?.source.agentDefinitionId ?? '',
      agentName: memberDisplayName(child.address),
      llmModelIdentifier: local?.source.launchConfiguration.llmModelIdentifier ?? '',
    },
    fetchProjection: async () => {
      try {
        const projection = await reads.fetchProjection()
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, true)
        return projection
      } catch (cause) {
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, false)
        throw cause
      }
    },
    fetchFileChanges: reads.fetchFileChanges,
    liveToolAuthority: input.liveToolAuthority,
  })
}
