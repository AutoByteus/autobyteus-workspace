import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: (options: any) => mocks.query(options) }) }))
vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({ AgentOrgStreamingService: class {
  connect = vi.fn(); disconnect = vi.fn(); isReady = () => true
} }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistoryItem: vi.fn(), ensureWorkspaceByRootPath: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(),
}) }))
vi.mock('~/stores/delegatedRunsStore', async () => ({ useDelegatedRunsStore: (await import('~/test-support/delegatedRunsFake')).fakeDelegatedRunsStore }))

import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
import { useRunTreeStore } from '../runTreeStore'
import { ownRuns } from '~/test-support/delegatedRunsFake'

/**
 * autobyteus-461 CR-461-102 (F-77): the Org's route names an agent (its tree row's inspect action, a Task card, a link).
 * One of the Org's own agents is selected in the Org; a run the Org delegated, on this node or a peer's, is selected by its
 * tree row and opens as its own run (rule 2). Base kept the Org's own selection only, so a delegated run showed "Choose an
 * Agent or Team".
 */
const ORG = 'org-run'
const inspection = () => ({ data: { getAgentOrgRunInspection: { root_subject_kind: 'agent_org', root_run_id: ORG, root_org: { ...taskBearingView(), is_active: false, agent_statuses: [] } } } })
const projection = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } })
const row = (key: string, parentKey: string | null, kind: RunTreeRowDto['kind'], address: string, openTarget: RunTreeRowDto['openTarget'], extra: Partial<RunTreeRowDto> = {}): RunTreeRowDto =>
  ({ key, parentKey, depth: parentKey ? 1 : 0, kind, name: address, address, openTarget, statusIds: [openTarget?.agentRunId ?? key], ...extra })
const orgTree = (): RunTreeRowDto[] => [
  row(`org_agent:${ORG}:agent-worker-configured`, null, 'org_agent', '/worker', { runKind: 'agent_org', runId: ORG, agentRunId: 'agent-worker-configured' }),
  row('agent:delegated-agent', `org_agent:${ORG}:agent-worker-configured`, 'agent', '/helper', { runKind: 'agent', runId: 'delegated-agent', agentRunId: 'delegated-agent' }),
  row('team:delegated-team', `org_agent:${ORG}:agent-worker-configured`, 'team', '/studio', { runKind: 'agent_team', runId: 'delegated-team', agentRunId: 'delegated-lead' }),
  row('team_member:delegated-team:delegated-lead', 'team:delegated-team', 'team_member', '/studio/lead', { runKind: 'agent_team', runId: 'delegated-team', agentRunId: 'delegated-lead' }),
  row('peer_agent:peer-agent', `org_agent:${ORG}:agent-worker-configured`, 'peer_agent', '/publisher',
    { runKind: 'agent', runId: 'peer-agent', agentRunId: 'peer-agent', nodeId: 'node-b' },
    { peer: { nodeId: 'node-b', nodeName: 'Node B', title: null, reachable: true } }),
]

beforeEach(async () => {
  setActivePinia(createPinia())
  ownRuns.reset()
  mocks.query.mockReset()
  mocks.query.mockImplementation(async ({ variables }: any) => variables?.agentRunId ? projection(variables) : inspection())
  await useAgentOrgContextsStore().openForInspection(ORG)
})
afterEach(() => useAgentOrgContextsStore().releaseContext(ORG))

describe('the Org route\'s agent (CR-461-102)', () => {
  it('an agent the Org delegated is selected by its tree row and opens as its own run; the route applied again keeps it', () => {
    const store = useAgentOrgContextsStore()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    expect(store.selectedRowKey(ORG)).toBe('agent:delegated-agent')
    expect(ownRuns.ensureOpen).toHaveBeenLastCalledWith({ kind: 'agent', agentRunId: 'delegated-agent' })
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    expect(store.selectedRowKey(ORG)).toBe('agent:delegated-agent')
    expect(ownRuns.ensureOpen).toHaveBeenCalledTimes(1)
  })

  it('a Team the Org delegated opens at its coordinator, as a member of that Team run', () => {
    const store = useAgentOrgContextsStore()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'delegated-lead', '')
    expect(store.selectedRowKey(ORG)).toBe('team_member:delegated-team:delegated-lead')
    expect(ownRuns.ensureOpen).toHaveBeenLastCalledWith({ kind: 'team_member', teamRunId: 'delegated-team', agentRunId: 'delegated-lead' })
  })

  it('a peer row the Org delegated opens on its node, by its own identity', () => {
    const store = useAgentOrgContextsStore()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'peer-agent', '/publisher')
    expect(store.selectedRowKey(ORG)).toBe('peer_agent:peer-agent')
    expect(ownRuns.ensureOpen).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'peer', nodeId: 'node-b', runId: 'peer-agent', agentRunId: 'peer-agent' }))
  })

  it('a delegated run whose row has not arrived selects nothing until the tree lists it', () => {
    const store = useAgentOrgContextsStore()
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    expect(store.selectedRowKey(ORG)).toBeNull()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    expect(store.selectedRowKey(ORG)).toBe('agent:delegated-agent')
  })

  it('one of the Org\'s own agents is selected in the Org, and leaves a delegated row', () => {
    const store = useAgentOrgContextsStore()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    store.selectRouteAgent(ORG, 'agent-worker-configured', '/worker')
    expect(store.selectedRowKey(ORG)).toBeNull()
    expect(store.contextFor(ORG)?.selectedTarget()).toMatchObject({ context: { state: { runId: 'agent-worker-configured' } } })
  })

  it('CR-461-109: when the shown delegated row leaves the tree (its Task closed), the view returns to the Org agent that delegated it', async () => {
    const store = useAgentOrgContextsStore()
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: ORG }, orgTree())
    store.selectRouteAgent(ORG, 'delegated-agent', '/helper')
    expect(store.selectedRowKey(ORG)).toBe('agent:delegated-agent')
    useRunTreeStore().streamChange({ kind: 'agent_org', runId: ORG }, { added: [], removed: ['agent:delegated-agent'], updated: [] })
    await nextTick()
    expect(store.selectedRowKey(ORG)).toBeNull()
    expect(store.contextFor(ORG)?.selectedTarget()).toMatchObject({ context: { state: { runId: 'agent-worker-configured' } } })
  })
})
