import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const io = vi.hoisted(() => ({ reads: [] as string[], streamReady: true, refreshes: 0 }))
const remoteAgent = {
  kind: 'agent' as const, address: '/publisher', agent_run_id: 'publisher-run', node_id: 'srv_docker', node_name: 'docker',
  delegator_agent_run_id: 'agent-director', started_at: '2999-01-01T00:00:00.000Z',
}

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async ({ variables }: any) => {
  if (variables.agentRunId) {
    if (variables.agentRunId === remoteAgent.agent_run_id) io.reads.push(variables.agentRunId)
    return { data: { getAgentOrgMemberRunProjection: { ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
  }
  const view = structuredClone(taskBearingView()) as any
  view.execution_tree.rootOrg.orgRunId = variables.orgRunId
  view.communication_messages.orgRunId = variables.orgRunId
  view.remote_task_executions = [remoteAgent]
  return { data: { getAgentOrgRunInspection: { root_subject_kind: 'agent_org', root_run_id: variables.orgRunId, root_org: view } } }
} }) }))
vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({
  AgentOrgStreamingService: class {
    readonly connect = vi.fn()
    readonly disconnect = vi.fn()
    readonly isReady = vi.fn(() => io.streamReady)
    readonly refreshRemote = vi.fn(() => { if (!io.streamReady) return false; io.refreshes += 1; return true })
    constructor(readonly options: Record<string, any>) {}
  },
}))
vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ refreshAgentOrgHistoryItem: vi.fn(async () => undefined), applyAgentOrgActivity: vi.fn() }),
}))

import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }

/**
 * autobyteus-278 SR-008: an Org root's adapter for the one Retry rule. Its stream, its selected agent, and a remote
 * agent read into the context as "loaded". Against IR-003: after a refresh with nothing selected, the first agent not
 * loaded is read too; an agent already loaded is not read again.
 */
describe("an Org root's remote-run Retry", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.assign(io, { reads: [], streamReady: true, refreshes: 0 })
  })

  it('on a live stream with nothing selected: refreshes and reads the first agent not loaded; once loaded, only refreshes', async () => {
    const store = useAgentOrgContextsStore()
    await store.openForInspection('org-run')
    const remoteRuns = useRemoteRunsStore()
    remoteRuns.retry('publisher-run'); await flush()
    expect(io.refreshes).toBe(1)
    expect(io.reads).toEqual(['publisher-run'])
    remoteRuns.retry('publisher-run'); await flush()
    expect(io.refreshes).toBe(2)
    expect(io.reads).toEqual(['publisher-run'])
    expect(remoteRuns.run('publisher-run')?.checking).toBe(true)
  })

  it('without a stream: a loaded selected agent is not read again, and Retry settles at once', async () => {
    const store = useAgentOrgContextsStore()
    await store.openForInspection('org-run')
    store.select('org-run', { kind: 'agent_execution', agentRunId: 'publisher-run' } as never); await flush()
    expect(io.reads).toEqual(['publisher-run'])
    io.streamReady = false
    const remoteRuns = useRemoteRunsStore()
    remoteRuns.retry('publisher-run'); await flush()
    expect(io.reads).toEqual(['publisher-run'])
    expect(remoteRuns.run('publisher-run')?.checking).toBe(false)
  })
})
