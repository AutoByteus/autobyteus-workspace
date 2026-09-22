import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { toRaw } from 'vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const mocks = vi.hoisted(() => ({
  applyAgentOrgActivity: vi.fn(),
  instances: [] as Array<Record<string, any>>,
  refreshAgentOrgHistory: vi.fn(async () => undefined),
}))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async ({ variables }: any) => variables.agentRunId
  ? { data: { getAgentOrgMemberRunProjection: { ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
  : (() => {
    const orgRunId = variables.orgRunId
    const view = structuredClone(taskBearingView())
    view.execution_tree.rootOrg.orgRunId = orgRunId
    view.task_records.orgRunId = orgRunId
    view.communication_messages.orgRunId = orgRunId
    return { data: { getAgentOrgRunInspection: {
      schema_version: 1, root_subject_kind: 'agent_org', root_run_id: orgRunId, root_org: view,
    } } }
  })(),
}) }))

vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({
  AgentOrgStreamingService: class {
    readonly connect = vi.fn()
    readonly disconnect = vi.fn()
    readonly isReady = vi.fn(() => true)

    constructor(readonly options: Record<string, any>) {
      mocks.instances.push(this)
    }
  },
}))

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => ({ refreshAgentOrgHistory: mocks.refreshAgentOrgHistory, applyAgentOrgActivity: mocks.applyAgentOrgActivity }),
}))

import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'

describe('agentOrgContextsStore lifecycle ownership', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.instances.length = 0
    vi.clearAllMocks()
  })

  it('injects one authoritative AgentOrg-family refresh callback into the stream owner', async () => {
    const store = useAgentOrgContextsStore()
    await store.openForInspection('org-run')

    expect(mocks.instances).toHaveLength(1)
    expect(mocks.instances[0]?.options.orgRunId).toBe('org-run')
    await mocks.instances[0]?.options.onAcceptedExternalUserMessage({
      orgRunId: 'org-run',
      agentRunId: 'agent-run',
      commandId: 'command-1',
    })

    expect(mocks.refreshAgentOrgHistory).toHaveBeenCalledTimes(1)
    mocks.applyAgentOrgActivity.mockClear()
    mocks.instances[0]?.options.onInactive()
    expect(mocks.applyAgentOrgActivity).toHaveBeenCalledExactlyOnceWith('org-run', false)
    expect(mocks.refreshAgentOrgHistory).toHaveBeenCalledTimes(1)
    store.releaseContext('org-run')
  })

  it('retains isolated member drafts across root navigation until the exact root is explicitly released', async () => {
    const store = useAgentOrgContextsStore()
    await store.openForInspection('org-a')
    store.select('org-a', '/director')
    const orgA = store.contextFor('org-a')!
    const memberA = orgA.getAgentContext('agent-director')!
    memberA.requirement = 'Draft for Org A'
    memberA.contextFilePaths = [{
      kind: 'workspace_path', id: 'org-a-file', locator: '/tmp/org-a.txt',
      displayName: 'org-a.txt', type: 'Text',
    }]

    await store.openForInspection('org-b')
    store.select('org-b', '/worker')
    const orgB = store.contextFor('org-b')!
    const memberB = orgB.getAgentContext('agent-worker-configured')!
    memberB.requirement = 'Draft for Org B'
    memberB.contextFilePaths = [{
      kind: 'workspace_path', id: 'org-b-file', locator: '/tmp/org-b.txt',
      displayName: 'org-b.txt', type: 'Text',
    }]

    await store.openForInspection('org-a')

    expect(toRaw(store.contextFor('org-a')!.getAgentContext('agent-director'))).toBe(toRaw(memberA))
    expect(memberA.requirement).toBe('Draft for Org A')
    expect(memberA.contextFilePaths.map((file) => file.id)).toEqual(['org-a-file'])
    expect(toRaw(store.contextFor('org-b')!.getAgentContext('agent-worker-configured'))).toBe(toRaw(memberB))
    expect(memberB.requirement).toBe('Draft for Org B')
    expect(memberB.contextFilePaths.map((file) => file.id)).toEqual(['org-b-file'])
    const orgBService = mocks.instances.find((instance) => instance.options.orgRunId === 'org-b')!
    const currentOrgAService = mocks.instances.filter((instance) => instance.options.orgRunId === 'org-a').at(-1)!

    store.releaseContext('org-a')

    expect(store.contextFor('org-a')).toBeNull()
    expect(store.contextFor('org-b')?.getAgentContext('agent-worker-configured')?.requirement).toBe('Draft for Org B')
    expect(currentOrgAService.disconnect).toHaveBeenCalledOnce()
    expect(orgBService.disconnect).not.toHaveBeenCalled()
    store.releaseContext('org-b')
  })
})
