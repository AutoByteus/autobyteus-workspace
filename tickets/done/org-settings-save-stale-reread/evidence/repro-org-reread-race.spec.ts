// TEMPORARY reproduction probe (autobyteus-265); not committed.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { shallowReactive } from 'vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'

const io = vi.hoisted(() => ({ query: vi.fn(), read: vi.fn(), save: vi.fn(), metadata: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/runConfigEditing/agentOrgRunConfigClient', () => ({ readAgentOrgRunConfig: io.read, updateStoppedAgentOrgRunConfig: io.save }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  resolveWorkspaceMetadataByRootPath: io.metadata, applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistoryItem: vi.fn(async () => undefined),
}) }))
vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}))
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  io.query.mockImplementation(async ({ variables }: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
    conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }))
})
const live = async () => {
  const view = JSON.parse(JSON.stringify(taskBearingView())); view.is_active = true
  return shallowReactive((await stageAgentOrgExecutionContext({ source: 'stream', orgRunId: 'org-run', view })).context)
}
describe('probe: live Org re-read while the stream republishes the view', () => {
  it('reads the canonical settings although a checkpoint snapshot replaced the view mid-read', async () => {
    const store = useAgentOrgContextsStore()
    const first = await live(); store.contexts['org-run'] = first
    let resolve!: (v: any) => void
    io.read.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const pending = store.readRunConfig('org-run')
    const second = await live(); second.adoptLocalContexts(first); store.contexts['org-run'] = second  // stream publish after reconnect
    resolve({ orgRunId: 'org-run', executionTree: first.executionTree, isActive: true, editability: { editable: false, reason: null } })
    await expect(pending).resolves.toMatchObject({ orgRunId: 'org-run' })
  })
})
