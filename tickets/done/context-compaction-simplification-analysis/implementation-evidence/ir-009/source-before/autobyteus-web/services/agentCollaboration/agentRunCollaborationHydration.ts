import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { createChildContext } from './agentRunCollaborationChildContextFactory'
import {
  AgentRootExecutionViewDtoSchema,
  type AgentRunCollaborationViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { buildConversationFromProjection, type RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation'
import { buildActivitiesFromProjection, type RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration'
import { primeRecentEventMonitorBaseline, resetRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator'
import { GetAgentRunCollaboration, GetAgentRunCollaborationMemberProjection } from '~/graphql/queries/collaboratorQueries'
import { getApolloClient } from '~/utils/apolloClient'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { AgentRunCollaborationIndex, type AgentRootChildAgent } from './agentRunCollaborationIndex'
import { AgentRunCollaborationContext } from './agentRunCollaborationContext'

type Projection = Readonly<{
  agentRunId: string
  memberAddress: string
  conversation: RunProjectionConversationEntry[]
  activities: RunProjectionActivityEntry[]
  hasEarlierActiveTraceEvents: boolean
}>

const nameAt = memberDisplayName

/** The stored or live view of a standalone run's collaboration root; null when it has none. Never restores. */
export const readAgentRunCollaboration = async (hostRunId: string): Promise<AgentRunCollaborationViewDto | null> => {
  const result = await getApolloClient().query<{ agentRunCollaboration: unknown }>({
    query: GetAgentRunCollaboration, variables: { runId: hostRunId },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
  const raw = result.data?.agentRunCollaboration
  if (!raw) return null
  const envelope = AgentRootExecutionViewDtoSchema.parse(raw)
  if (envelope.root_run_id !== hostRunId) throw new Error('Agent collaboration root mismatch.')
  return envelope.root_agent
}

const fetchProjection = async (hostRunId: string, child: AgentRootChildAgent): Promise<Projection> => {
  const result = await getApolloClient().query<{ agentRunCollaborationMemberProjection: Projection | null }>({
    query: GetAgentRunCollaborationMemberProjection,
    variables: { hostRunId, memberAddress: child.address, agentRunId: child.agentRunId },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
  const projection = result.data?.agentRunCollaborationMemberProjection
  if (!projection || projection.agentRunId !== child.agentRunId || projection.memberAddress !== child.address) {
    throw new Error(`Projection identity mismatch for '${child.agentRunId}'.`)
  }
  return projection
}

const resolveWorkspace = async (root: string | null, active: boolean): Promise<WorkspaceMetadata | null> => {
  if (!root) return null
  const history = useRunHistoryStore()
  if (active) await history.ensureWorkspaceByRootPath(root)
  return history.resolveWorkspaceMetadataByRootPath(root)
}


/**
 * Builds the client context of an Agent root from a view: one AgentContext per child with its
 * stored conversation. Activities are committed only when the caller publishes the context.
 */
export const stageAgentRunCollaborationContext = async (input: Readonly<{
  hostRunId: string
  view: AgentRunCollaborationViewDto
  isCurrent?(): boolean
}>): Promise<{ context: AgentRunCollaborationContext; commitActivities(): void }> => {
  const index = new AgentRunCollaborationIndex(input.view.execution_tree)
  const workspaces = new Map<string, Promise<WorkspaceMetadata | null>>()
  const workspaceFor = (root: string | null) => {
    if (!root) return Promise.resolve(null)
    if (!workspaces.has(root)) workspaces.set(root, resolveWorkspace(root, input.view.is_active))
    return workspaces.get(root)!
  }
  const staged = await Promise.all([...index.agents.values()].map(async (child) => {
    const context = createChildContext(child, input.view.execution_tree.createdAt,
      await workspaceFor(child.source.launchConfiguration.workspaceRootPath))
    const projection = await fetchProjection(input.hostRunId, child)
    resetRecentEventMonitorBaseline(context)
    context.state.conversation = buildConversationFromProjection(child.agentRunId, projection.conversation, {
      agentDefinitionId: child.source.agentDefinitionId,
      agentName: nameAt(child.address),
      llmModelIdentifier: child.source.launchConfiguration.llmModelIdentifier,
    })
    context.state.hasEarlierActiveTraceEvents = projection.hasEarlierActiveTraceEvents === true
    primeRecentEventMonitorBaseline(context)
    return {
      entry: Object.freeze({ agentRunId: child.agentRunId, memberAddress: child.address, context }),
      activities: Object.freeze({
        runId: child.agentRunId,
        expectedRevision: useAgentActivityStore().getActivityContentRevision(child.agentRunId),
        activities: buildActivitiesFromProjection(projection.activities),
      }),
    }
  }))
  if (input.isCurrent && !input.isCurrent()) throw new Error('Agent collaboration hydration ownership released.')
  const context = new AgentRunCollaborationContext({ hostRunId: input.hostRunId, view: input.view, entries: staged.map((item) => item.entry) })
  const replacements = staged.map((item) => item.activities)
  return {
    context,
    commitActivities: () => {
      if (replacements.length && useAgentActivityStore().replaceProjectionActivitiesIfRevisions(replacements) === 'conflict') {
        throw new Error(`Agent collaboration activity changed before '${input.hostRunId}' hydration could commit.`)
      }
    },
  }
}
