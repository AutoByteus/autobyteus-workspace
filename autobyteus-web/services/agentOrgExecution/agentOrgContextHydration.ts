import { AgentOrgExecutionViewIndex } from './agentOrgExecutionViewIndex'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
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
  commitMemberRunStates,
  fetchMemberRunState,
  type MemberRunState,
  type MemberRunStateCommit,
} from '~/services/runHydration/memberRunStateHydration'
import { fetchRunFileChanges } from '~/services/runHydration/runFileChangeHydrationService'
import { createRemoteAgentContext } from '~/services/remoteRuns/remoteAgentContext'
import { remoteTaskExecutionRunIdOf } from '@autobyteus/agent-presentation-contracts'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import {
  AgentOrgExecutionContext,
  type AgentOrgContextEntry,
} from './agentOrgExecutionContext'
import type { OrgWorkspaceSelection } from './agentOrgExecutionViewIndex'
import type { MemberLoadTarget } from '~/services/runHydration/memberLoader'

type LaunchConfiguration = AgentOrgExecutionViewDto['execution_tree']['rootOrg']['defaultLaunchConfiguration']

export type { AgentSeed } from './agentOrgMemberContextFactory'
import { createAgentContext, type AgentSeed } from './agentOrgMemberContextFactory'

type Projection = Readonly<{
  agentRunId: string
  memberAddress: string
  conversation: RunProjectionConversationEntry[]
  activities: RunProjectionActivityEntry[]
  hasEarlierActiveTraceEvents: boolean
}>

const nameAt = memberDisplayName

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

const applyProjection = (
  context: AgentContext,
  seed: AgentSeed,
  { projection, fileChanges }: MemberRunState<Projection>,
  expectedActivityRevision: number,
): MemberRunStateCommit => {
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
  return Object.freeze({
    runId: seed.agentRunId,
    expectedActivityRevision,
    activities: buildActivitiesFromProjection(projection.activities),
    fileChanges,
  })
}

/**
 * Builds an Org run's context from its view and stages the member it will show (`focus`) only (autobyteus-358,
 * DS-003): every other member is loaded by the member loader when it is selected, and the Team tab loads its
 * messages when it is shown. `commit()` writes the staged member's state and answers its run ID (null when none).
 */
export const stageAgentOrgExecutionContext = async (input: Readonly<{
  orgRunId: string
  view: AgentOrgExecutionViewDto
  source: 'inspection' | 'stream'
  /** The selection the published context will show (a configured address resolves through the view). */
  focus: OrgWorkspaceSelection | string | null
  isCurrent?(): boolean
}>): Promise<{ context: AgentOrgExecutionContext; commit(): string | null }> => {
  if (input.view.execution_tree.rootOrg.orgRunId !== input.orgRunId) {
    throw new Error(`AgentOrg snapshot correlation mismatch for '${input.orgRunId}'.`)
  }
  const index = new AgentOrgExecutionViewIndex(input.view)
  const seeds = collectAgentSeeds(input.view)
  const workspaces = await resolveWorkspaces(seeds, input.source === 'stream' && input.view.is_active)
  const local = seeds.map((seed) => {
    const rootPath = seed.launch.workspaceRootPath
    const context = createAgentContext(seed, input.view.execution_tree.createdAt, rootPath ? workspaces.get(rootPath) ?? null : null)
    return Object.freeze({ seed, entry: Object.freeze({ agentRunId: seed.agentRunId, memberAddress: seed.address, context }) satisfies AgentOrgContextEntry })
  })
  const focus = typeof input.focus === 'string' ? index.configuredSelection(input.focus) : input.focus
  const focused = local.find((item) => item.seed.agentRunId === index.selectedAgent(focus)?.agentRunId) ?? null
  const expectedActivityRevision = focused ? useAgentActivityStore().getActivityContentRevision(focused.seed.agentRunId) : 0
  const staged = focused ? applyProjection(focused.entry.context, focused.seed, await fetchMemberRunState({
    fetchProjection: () => fetchProjection(input.orgRunId, focused.seed),
    fetchFileChanges: () => fetchRunFileChanges({
      kind: 'agentOrgMember', orgRunId: input.orgRunId, memberAddress: focused.seed.address, agentRunId: focused.seed.agentRunId,
    }),
  }), expectedActivityRevision) : null
  if (input.isCurrent && !input.isCurrent()) throw new Error('AgentOrg hydration ownership released.')
  // autobyteus-278: the agents of the runs this Org delegated to other nodes; each is read from its node when selected.
  const remote = [...index.remoteAgents.values()].map((agent) => Object.freeze({ agentRunId: agent.agentRunId, memberAddress: agent.address,
    context: createRemoteAgentContext(agent.agentRunId, agent.address, agent.execution.started_at) }) satisfies AgentOrgContextEntry)
  const context = new AgentOrgExecutionContext({ ...input, entries: [...local.map((item) => item.entry), ...remote] })
  // Commits the staged member's state (activities, then artifacts) when the caller publishes the context.
  return { context, commit: () => {
    if (!staged) return null
    if (commitMemberRunStates([staged]) === 'conflict') {
      throw new Error(`AgentOrg activity changed before '${input.orgRunId}' hydration could commit.`)
    }
    return staged.runId
  } }
}

/**
 * What the member loader reads to load one member of a published Org context: its stored conversation and
 * activities, and its files. A remote member's conversation is read from its node by this node's server
 * (autobyteus-278, the same member-projection query); its files stay there, and a failed read marks its node
 * unreachable. Null when the member is not in the context.
 */
export const orgMemberLoadTarget = (input: Readonly<{
  orgRunId: string
  context: AgentOrgExecutionContext
  agentRunId: string
  liveToolAuthority(): boolean
}>): MemberLoadTarget | null => {
  const agent = input.context.getAgentContext(input.agentRunId)
  const local = input.context.index.agents.get(input.agentRunId)
  const remote = local ? null : input.context.index.remoteAgents.get(input.agentRunId)
  if (!agent || !(local || remote)) return null
  const seed: AgentSeed = local
    ? Object.freeze({ address: local.address, agentRunId: local.agentRunId, agentDefinitionId: local.source.agentDefinitionId, launch: local.source.launchConfiguration })
    : Object.freeze({ address: remote!.address, agentRunId: remote!.agentRunId, agentDefinitionId: '',
      launch: { runtimeKind: 'autobyteus', llmModelIdentifier: '', llmConfig: null, autoExecuteTools: true, workspaceRootPath: null } as AgentSeed['launch'] })
  const remoteRunId = remote ? remoteTaskExecutionRunIdOf(remote.execution) : null
  return Object.freeze({
    agent,
    conversationDefaults: { agentDefinitionId: seed.agentDefinitionId, agentName: nameAt(seed.address), llmModelIdentifier: seed.launch.llmModelIdentifier },
    fetchProjection: async () => {
      try {
        const projection = await fetchProjection(input.orgRunId, seed)
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, true)
        return projection
      } catch (cause) {
        if (remoteRunId) useRemoteRunsStore().markReachable(remoteRunId, false)
        throw cause
      }
    },
    fetchFileChanges: () => remote ? Promise.resolve([]) : fetchRunFileChanges({
      kind: 'agentOrgMember', orgRunId: input.orgRunId, memberAddress: seed.address, agentRunId: seed.agentRunId,
    }),
    liveToolAuthority: input.liveToolAuthority,
  })
}
