import { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentRunConfig, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { initializeRuntimeStatusState } from '~/services/runStatus/agentRuntimeStatusState'
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation'
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation'
import {
  buildActivitiesFromProjection,
  type RunProjectionActivityEntry,
} from '~/services/runHydration/runProjectionActivityHydration'
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator'
import { GetAgentOrgMemberRunProjection } from '~/graphql/queries/runHistoryQueries'
import { getApolloClient } from '~/utils/apolloClient'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import {
  AgentOrgExecutionContext,
  type AgentOrgContextEntry,
} from './agentOrgExecutionContext'

type LaunchConfiguration = AgentOrgExecutionViewDto['execution_tree']['rootOrg']['defaultLaunchConfiguration']

type AgentSeed = Readonly<{
  address: AgentTeamAddress
  agentRunId: string
  agentDefinitionId: string
  launch: LaunchConfiguration
}>

type Projection = Readonly<{
  agentRunId: string
  memberAddress: string
  conversation: RunProjectionConversationEntry[]
  activities: RunProjectionActivityEntry[]
  hasEarlierActiveTraceEvents: boolean
}>

const nameAt = (address: string): string =>
  address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') || address

const collectAgentSeeds = (view: AgentOrgExecutionViewDto): readonly AgentSeed[] =>
  [...new AgentOrgExecutionViewIndex(view).agents.values()].map((agent) => Object.freeze({
    address: agent.address, agentRunId: agent.agentRunId,
    agentDefinitionId: agent.source.agentDefinitionId, launch: agent.source.launchConfiguration,
  }))

const resolveWorkspaces = async (
  seeds: readonly AgentSeed[],
  active: boolean,
): Promise<ReadonlyMap<string, WorkspaceMetadata>> => {
  const history = useRunHistoryStore()
  const byRoot = new Map<string, Promise<WorkspaceMetadata | null>>()
  const resolve = (root: string): Promise<WorkspaceMetadata | null> => {
    const existing = byRoot.get(root)
    if (existing) return existing
    const pending = (async () => {
      if (active) await history.ensureWorkspaceByRootPath(root)
      return history.resolveWorkspaceMetadataByRootPath(root)
    })()
    byRoot.set(root, pending)
    return pending
  }
  await Promise.all(seeds.map(async (seed) => {
    if (seed.launch.workspaceRootPath) await resolve(seed.launch.workspaceRootPath)
  }))
  const output = new Map<string, WorkspaceMetadata>()
  for (const [root, pending] of byRoot) {
    const metadata = await pending
    if (metadata) output.set(root, metadata)
  }
  return output
}

const createAgentContext = (
  seed: AgentSeed,
  createdAt: string,
  workspace: WorkspaceMetadata | null,
): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: seed.agentDefinitionId,
    agentDefinitionName: nameAt(seed.address),
    llmModelIdentifier: seed.launch.llmModelIdentifier,
    runtimeKind: seed.launch.runtimeKind,
    workspaceId: workspace?.workspaceId ?? null,
    workspaceMetadata: workspace,
    autoExecuteTools: seed.launch.autoExecuteTools,
    skillAccessMode: seed.launch.skillAccessMode as SkillAccessMode,
    llmConfig: seed.launch.llmConfig ? structuredClone(seed.launch.llmConfig) : null,
    isLocked: true,
  }
  const state = new AgentRunState(seed.agentRunId, {
    id: seed.agentRunId,
    messages: [],
    createdAt,
    updatedAt: createdAt,
    agentDefinitionId: seed.agentDefinitionId,
    agentName: nameAt(seed.address),
    llmModelIdentifier: seed.launch.llmModelIdentifier,
  })
  initializeRuntimeStatusState(state, AgentStatus.Offline)
  return new AgentContext(config, state)
}

const fetchProjection = async (
  orgRunId: string,
  seed: AgentSeed,
): Promise<Projection> => {
  const response = await getApolloClient().query<{ getAgentOrgMemberRunProjection: Projection | null }>({
    query: GetAgentOrgMemberRunProjection,
    variables: { orgRunId, memberAddress: seed.address, agentRunId: seed.agentRunId },
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  })
  if (response.errors?.length) {
    throw new Error(response.errors.map((error: { message: string }) => error.message).join(', '))
  }
  const projection = response.data?.getAgentOrgMemberRunProjection ?? null
  if (projection && (projection.agentRunId !== seed.agentRunId || projection.memberAddress !== seed.address)) {
    throw new Error(`Projection identity mismatch for '${seed.agentRunId}'.`)
  }
  if (!projection) throw new Error(`Projection unavailable for '${seed.agentRunId}'.`)
  return projection
}

type PendingActivityReplacement = Readonly<{
  runId: string
  expectedRevision: number
  activities: ReturnType<typeof buildActivitiesFromProjection>
}>

const applyProjection = (
  context: AgentContext,
  seed: AgentSeed,
  projection: Projection,
): PendingActivityReplacement => {
  resetRecentEventMonitorBaseline(context)
  context.state.conversation = buildConversationFromProjection(
    seed.agentRunId,
    projection.conversation,
    {
      agentDefinitionId: seed.agentDefinitionId,
      agentName: nameAt(seed.address),
      llmModelIdentifier: seed.launch.llmModelIdentifier,
    },
  )
  context.state.hasEarlierActiveTraceEvents = projection.hasEarlierActiveTraceEvents === true
  primeRecentEventMonitorBaseline(context)
  const activities = useAgentActivityStore()
  return Object.freeze({
    runId: seed.agentRunId,
    expectedRevision: activities.getActivityContentRevision(seed.agentRunId),
    activities: buildActivitiesFromProjection(projection.activities),
  })
}

export const stageAgentOrgExecutionContext = async (input: Readonly<{
  orgRunId: string
  view: AgentOrgExecutionViewDto
  source: 'inspection' | 'stream'
  isCurrent?(): boolean
}>): Promise<{ context: AgentOrgExecutionContext; commitActivities(): void }> => {
  if (input.view.execution_tree.rootOrg.orgRunId !== input.orgRunId
    || input.view.task_records.orgRunId !== input.orgRunId
    || input.view.communication_messages.orgRunId !== input.orgRunId) {
    throw new Error(`AgentOrg snapshot correlation mismatch for '${input.orgRunId}'.`)
  }
  const seeds = collectAgentSeeds(input.view)
  const workspaces = await resolveWorkspaces(seeds, input.source === 'stream' && input.view.is_active)
  const hydrated = await Promise.all(seeds.map(async (seed) => {
    const rootPath = seed.launch.workspaceRootPath
    const context = createAgentContext(
      seed,
      input.view.execution_tree.createdAt,
      rootPath ? workspaces.get(rootPath) ?? null : null,
    )
    const activityReplacement = applyProjection(
      context,
      seed,
      await fetchProjection(input.orgRunId, seed),
    )
    return Object.freeze({
      entry: Object.freeze({
        agentRunId: seed.agentRunId,
        memberAddress: seed.address,
        context,
      }) satisfies AgentOrgContextEntry,
      activityReplacement,
    })
  }))
  if (input.isCurrent && !input.isCurrent()) throw new Error('AgentOrg hydration ownership released.')
  const context = new AgentOrgExecutionContext({
    ...input,
    entries: hydrated.map((item) => item.entry),
  })
  const replacements = hydrated.flatMap((item) =>
    item.activityReplacement ? [item.activityReplacement] : [])
  return { context, commitActivities: () => {
    if (replacements.length > 0
      && useAgentActivityStore().replaceProjectionActivitiesIfRevisions(replacements) === 'conflict') {
      throw new Error(`AgentOrg activity changed before '${input.orgRunId}' hydration could commit.`)
    }
  } }
}
