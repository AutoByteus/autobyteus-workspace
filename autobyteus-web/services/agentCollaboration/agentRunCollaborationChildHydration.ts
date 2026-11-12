import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation'
import type { RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration'
import type { MemberLoadTarget } from '~/services/runHydration/memberLoader'
import { GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { fetchRunFileChanges } from '~/services/runHydration/runFileChangeHydrationService'
import { getApolloClient } from '~/utils/apolloClient'
import type { AgentRootChildAgent } from './agentRunCollaborationIndex'
import { remoteTaskExecutionRunIdOf } from '@autobyteus/agent-presentation-contracts'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import type { AgentRunCollaborationContext } from './agentRunCollaborationContext'

type Projection = Readonly<{
  agentRunId: string
  memberAddress: string
  conversation: RunProjectionConversationEntry[]
  activities: RunProjectionActivityEntry[]
  hasEarlierActiveTraceEvents: boolean
}>

const queryErrors = (errors: readonly { message: string }[] | undefined): void => {
  if (errors?.length) throw new Error(errors.map((error) => error.message).join(', '))
}

const fetchProjection = async (hostRunId: string, child: Pick<AgentRootChildAgent, 'agentRunId' | 'address'>): Promise<Projection> => {
  const result = await getApolloClient().query<{ agentRunCollaborationMemberProjection: Projection | null }>({
    query: GetAgentRunCollaborationMemberProjection,
    variables: { hostRunId, memberAddress: child.address, agentRunId: child.agentRunId },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  queryErrors(result.errors)
  const projection = result.data?.agentRunCollaborationMemberProjection
  if (!projection || projection.agentRunId !== child.agentRunId || projection.memberAddress !== child.address) {
    throw new Error(`Projection identity mismatch for '${child.agentRunId}'.`)
  }
  return projection
}

/**
 * What the member loader reads to load one child of a hub's published collaboration context: the child's stored
 * conversation and activities, and its files (read inside its hub only). A remote child's conversation is read from
 * its node by this node's server (autobyteus-278); its files stay there, and a failed read marks its node unreachable.
 * Null when the child is not in the context.
 */
export const hubChildLoadTarget = (input: Readonly<{
  hostRunId: string
  collaboration: AgentRunCollaborationContext
  agentRunId: string
  /** Whether the hub's live stream is ready, so live tool decisions win over the stored projection. */
  liveToolAuthority(): boolean
}>): MemberLoadTarget | null => {
  const local = input.collaboration.getChild(input.agentRunId)
  const remote = local ? null : input.collaboration.getRemoteChild(input.agentRunId)
  const child = local ?? remote
  const agent = input.collaboration.getAgentContext(input.agentRunId)
  if (!child || !agent) return null
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
        const projection = await fetchProjection(input.hostRunId, child)
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, true)
        return projection
      } catch (cause) {
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, false)
        throw cause
      }
    },
    fetchFileChanges: () => remote ? Promise.resolve([]) : fetchRunFileChanges({
      kind: 'standaloneMember', hostRunId: input.hostRunId, memberAddress: child.address, agentRunId: child.agentRunId,
    }),
    liveToolAuthority: input.liveToolAuthority,
  })
}
