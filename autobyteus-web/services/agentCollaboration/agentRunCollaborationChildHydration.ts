import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { buildConversationFromProjection, type RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation'
import { buildActivitiesFromProjection, type RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration'
import { reconcileTeamMemberToolState } from '~/services/runHydration/teamMemberToolStateReconciliation'
import { commitMemberRunStates, fetchMemberRunState, type MemberRunState } from '~/services/runHydration/memberRunStateHydration'
import { primeRecentEventMonitorBaseline, resetRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator'
import { overlayPendingUserMessages } from '~/services/agentStreaming/handlers/userMessageProjection'
import { GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { fetchRunFileChanges } from '~/services/runHydration/runFileChangeHydrationService'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { getApolloClient } from '~/utils/apolloClient'
import type { AgentRootChildAgent } from './agentRunCollaborationIndex'
import type { AgentRunCollaborationContext } from './agentRunCollaborationContext'

type Projection = Readonly<{
  agentRunId: string
  memberAddress: string
  conversation: RunProjectionConversationEntry[]
  activities: RunProjectionActivityEntry[]
  hasEarlierActiveTraceEvents: boolean
}>

export type AgentRunCollaborationChildHydrationOutcome = 'hydrated' | 'superseded'

const MAX_CONFLICT_ATTEMPTS = 3

const queryErrors = (errors: readonly { message: string }[] | undefined): void => {
  if (errors?.length) throw new Error(errors.map((error) => error.message).join(', '))
}

const fetchProjection = async (hostRunId: string, child: AgentRootChildAgent): Promise<Projection> => {
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
 * Loads one child's stored conversation, activities and artifacts into one published collaboration
 * context (the `collaboration` input) and commits them there.
 *
 * - Superseded: once `isPublished()` is false the load ends with `superseded`, writes nothing and does
 *   not retry. It is checked after the fetch and again synchronously right before the commit, so it
 *   never writes into an AgentContext that adoption handed to a newer context.
 * - Conflict: a live event or a shown local message during the fetch (presentation or activity
 *   revision changed), or an activity commit conflict, retries against the same context, at most 3
 *   attempts; then it throws.
 * - Holds no dedupe state: the caller (the store) owns in-flight loads.
 */
export const hydrateAgentRunCollaborationChild = async (input: Readonly<{
  hostRunId: string
  collaboration: AgentRunCollaborationContext
  agentRunId: string
  isPublished(): boolean
  /** Whether the hub's live stream is ready, so live tool decisions win over the stored projection. */
  liveToolAuthority(): boolean
}>): Promise<AgentRunCollaborationChildHydrationOutcome> => {
  const child = input.collaboration.getChild(input.agentRunId)
  const agent = input.collaboration.getAgentContext(input.agentRunId)
  if (!child || !agent) throw new Error(`AgentRun '${input.agentRunId}' is not a child of Agent run '${input.hostRunId}'.`)
  const activityStore = useAgentActivityStore()
  for (let attempt = 0; attempt < MAX_CONFLICT_ATTEMPTS; attempt += 1) {
    if (!input.isPublished()) return 'superseded'
    const expectedPresentationRevision = agent.state.eventMonitorPresentationRevision
    const expectedActivityRevision = activityStore.getActivityContentRevision(child.agentRunId)
    let fetched: MemberRunState<Projection>
    try {
      fetched = await fetchMemberRunState({
        fetchProjection: () => fetchProjection(input.hostRunId, child),
        // The child's artifacts, read inside its hub only.
        fetchFileChanges: () => fetchRunFileChanges({
          kind: 'standaloneMember', hostRunId: input.hostRunId, memberAddress: child.address, agentRunId: child.agentRunId,
        }),
      })
    } catch (cause) {
      if (!input.isPublished()) return 'superseded'
      throw cause
    }
    if (!input.isPublished()) return 'superseded'
    if (agent.state.eventMonitorPresentationRevision !== expectedPresentationRevision
      || activityStore.getActivityContentRevision(child.agentRunId) !== expectedActivityRevision) continue

    // Synchronous from here to the end of the attempt: nothing can republish in between.
    let conversation = buildConversationFromProjection(child.agentRunId, fetched.projection.conversation, {
      agentDefinitionId: child.source.agentDefinitionId,
      agentName: memberDisplayName(child.address),
      llmModelIdentifier: child.source.launchConfiguration.llmModelIdentifier,
    })
    let activities = buildActivitiesFromProjection(fetched.projection.activities)
    if (input.liveToolAuthority()) {
      ({ conversation, activities } = reconcileTeamMemberToolState({ agentRunId: child.agentRunId,
        currentConversation: agent.state.conversation, currentActivities: activityStore.getActivities(child.agentRunId),
        projectedConversation: conversation, projectedActivities: activities }))
    }
    if (commitMemberRunStates([{
      runId: child.agentRunId, expectedActivityRevision, activities, fileChanges: fetched.fileChanges,
    }]) === 'conflict') continue
    // Held or queued input the view or the stream already showed stays shown (it may not be stored yet).
    overlayPendingUserMessages(conversation, agent.state.conversation)
    resetRecentEventMonitorBaseline(agent)
    agent.state.conversation = conversation
    agent.state.hasEarlierActiveTraceEvents = fetched.projection.hasEarlierActiveTraceEvents === true
    agent.state.markEventMonitorPresentationChanged()
    primeRecentEventMonitorBaseline(agent)
    input.collaboration.markChildHydrated(child.agentRunId)
    return 'hydrated'
  }
  throw new Error(`Agent collaboration child '${input.agentRunId}' of '${input.hostRunId}' changed while it was loading.`)
}
