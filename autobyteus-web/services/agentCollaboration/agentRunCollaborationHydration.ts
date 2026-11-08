import { createChildContext, createRemoteChildContext } from './agentRunCollaborationChildContextFactory'
import {
  AgentRootExecutionViewDtoSchema,
  type AgentRunCollaborationViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { compactionRecoveryBlockSchema } from '@autobyteus/agent-presentation-contracts'
import { GetAgentRunCollaboration, GetAgentRunCollaborationStatuses } from '~/graphql/queries/collaboratorQueries'
import type { GetAgentRunCollaborationStatusesQuery } from '~/generated/graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { AgentRunCollaborationIndex } from './agentRunCollaborationIndex'
import { AgentRunCollaborationContext, type CollaborationChildStatus } from './agentRunCollaborationContext'

/** One listed run's answer to the history poll's status read (autobyteus-426 D-09). */
export type AgentRunCollaborationStatusesAnswer = Readonly<{
  runId: string
  isActive: boolean
  statuses: readonly CollaborationChildStatus[]
}>

/** The children's states of the given runs (states only, never the view), in the order asked. Never restores. */
export const readAgentRunCollaborationStatuses = async (runIds: readonly string[]): Promise<AgentRunCollaborationStatusesAnswer[]> => {
  const result = await getApolloClient().query<GetAgentRunCollaborationStatusesQuery>({
    query: GetAgentRunCollaborationStatuses, variables: { runIds: [...runIds] },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
  return (result.data?.agentRunCollaborationStatuses ?? []).map((answer) => ({
    runId: answer.runId,
    isActive: answer.isActive,
    statuses: answer.statuses.map((status) => ({
      agentRunId: status.agentRunId,
      memberAddress: status.memberAddress,
      status: status.status,
      recoverableBlock: compactionRecoveryBlockSchema.nullable().parse(status.recoverableBlock ?? null),
    })),
  }))
}

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

const resolveWorkspace = async (root: string | null, active: boolean): Promise<WorkspaceMetadata | null> => {
  if (!root) return null
  const history = useRunHistoryStore()
  if (active) await history.ensureWorkspaceByRootPath(root)
  return history.resolveWorkspaceMetadataByRootPath(root)
}

/**
 * Builds the client context of an Agent root from its view alone: the index and one Offline
 * AgentContext per child, with statuses and input states from the view. No child's details are
 * fetched; a child is loaded when it is selected (`hydrateAgentRunCollaborationChild`).
 */
export const buildAgentRunCollaborationContext = async (input: Readonly<{
  hostRunId: string
  view: AgentRunCollaborationViewDto
}>): Promise<AgentRunCollaborationContext> => {
  const index = new AgentRunCollaborationIndex(input.view.execution_tree, input.view.remote_task_executions)
  const workspaces = new Map<string, Promise<WorkspaceMetadata | null>>()
  const workspaceFor = (root: string | null) => {
    if (!root) return Promise.resolve(null)
    if (!workspaces.has(root)) workspaces.set(root, resolveWorkspace(root, input.view.is_active))
    return workspaces.get(root)!
  }
  const entries = await Promise.all([...index.agents.values()].map(async (child) => Object.freeze({
    agentRunId: child.agentRunId,
    memberAddress: child.address,
    context: createChildContext(child, input.view.execution_tree.createdAt,
      await workspaceFor(child.source.launchConfiguration.workspaceRootPath)),
  })))
  // autobyteus-278: the agents of the runs this root delegated to other nodes, held like its copies.
  const remote = [...index.remoteAgents.values()].map((child) => Object.freeze({
    agentRunId: child.agentRunId, memberAddress: child.address, context: createRemoteChildContext(child, child.execution.started_at),
  }))
  return new AgentRunCollaborationContext({ hostRunId: input.hostRunId, view: input.view, entries: [...entries, ...remote] })
}
