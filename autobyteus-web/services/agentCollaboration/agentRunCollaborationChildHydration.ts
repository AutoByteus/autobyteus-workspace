import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation'
import type { RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration'
import type { MemberLoadTarget } from '~/services/runHydration/memberLoader'
import { GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
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
 * What the member loader reads to load one child of a hub's published collaboration context, when the child is a run on
 * a peer node (autobyteus-278): its stored conversation and activities, read from its node by this node's server; its
 * files stay there, and a failed read marks its node unreachable. A delegated run on this node is opened as its own run
 * (autobyteus-461 rule 2), never through its delegator: null for it, as for a child not in the context.
 */
export const hubChildLoadTarget = (input: Readonly<{
  hostRunId: string
  collaboration: AgentRunCollaborationContext
  agentRunId: string
  /** Whether the hub's live stream is ready, so live tool decisions win over the stored projection. */
  liveToolAuthority(): boolean
}>): MemberLoadTarget | null => {
  const remote = input.collaboration.getRemoteChild(input.agentRunId)
  const agent = input.collaboration.getAgentContext(input.agentRunId)
  if (!remote || !agent) return null
  const remoteRunId = remoteTaskExecutionRunIdOf(remote.execution)
  return Object.freeze({
    agent,
    conversationDefaults: { agentDefinitionId: '', agentName: memberDisplayName(remote.address), llmModelIdentifier: '' },
    fetchProjection: async () => {
      try {
        const projection = await fetchProjection(input.hostRunId, remote)
        useRemoteRunsStore().markReachable(remoteRunId, true)
        return projection
      } catch (cause) {
        useRemoteRunsStore().markReachable(remoteRunId, false)
        throw cause
      }
    },
    // Its files stay on its node.
    fetchFileChanges: () => Promise.resolve([]),
    liveToolAuthority: input.liveToolAuthority,
  })
}
