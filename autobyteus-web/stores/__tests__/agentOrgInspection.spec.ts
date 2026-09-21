import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
const mocks = vi.hoisted(() => ({ query: vi.fn(), instances: [] as any[] }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({ AgentOrgStreamingService: class {
  connect = vi.fn(); disconnect = vi.fn(); isReady = () => true
  constructor(readonly options: any) { mocks.instances.push(this) }
} }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyAgentOrgActivity: vi.fn(), refreshAgentOrgHistory: vi.fn(), ensureWorkspaceByRootPath: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(),
}) }))
import { useAgentOrgContextsStore } from '../agentOrgContextsStore'
const projection = (variables: any) => ({ data: { getAgentOrgMemberRunProjection: { ...variables,
  conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
} } })
const inspection = (active = false) => {
  const view = taskBearingView(); view.is_active = active
  if (!active) view.agent_statuses = []
  return { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } } }
}
beforeEach(() => { setActivePinia(createPinia()); mocks.instances.length = 0; mocks.query.mockReset() })
afterEach(() => useAgentOrgContextsStore().disconnect('org-run'))
describe('same-owner read-only Org inspection', () => {
  it('publishes strict retained contexts and exact selection without creating a transport', async () => {
    mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection())
    const store = useAgentOrgContextsStore()
    store.select('org-run', { kind: 'agent_execution', agentRunId: 'agent-task-lead' })
    await store.openForInspection('org-run')
    expect(store.errorFor('org-run')).toBeNull()
    expect(store.contextFor('org-run')?.selectedTarget()).toMatchObject({ access: 'read_only', kind: 'agent_org_task_team_member',
      context: { state: { runId: 'agent-task-lead' } } })
    expect(mocks.instances).toHaveLength(0)
  })
  it('retires pending hydration on disposal, without stale publication', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    mocks.query.mockImplementation(async ({ variables }) => {
      if (!variables.agentRunId) return inspection()
      await gate; return projection(variables)
    })
    const store = useAgentOrgContextsStore()
    const pending = store.openForInspection('org-run')
    await flushPromises()
    expect(mocks.query.mock.calls.length).toBeGreaterThan(1)
    store.disconnect('org-run')
    release(); await pending
    expect(store.contextFor('org-run')).toBeNull()
    expect(store.errorFor('org-run')).toBeNull()
    expect(mocks.instances).toHaveLength(0)
  })
  it('coalesces concurrent inspection requests under the one publication owner', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    mocks.query.mockImplementation(async ({ variables }) => {
      if (!variables.agentRunId) { await gate; return inspection() }
      return projection(variables)
    })
    const store = useAgentOrgContextsStore()
    const first = store.openForInspection('org-run')
    const second = store.openForInspection('org-run')
    expect(mocks.query).toHaveBeenCalledOnce()
    release(); await Promise.all([first, second])
    expect(store.contextFor('org-run')?.phase).toBe('historical')
    expect(mocks.query.mock.calls.filter(([{ variables }]) => !variables.agentRunId)).toHaveLength(1)
  })
  it('hands active inspection back to the one strict stream owner instead of publishing disk data', async () => {
    mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId ? projection(variables) : inspection(true))
    const store = useAgentOrgContextsStore(); await store.openForInspection('org-run')
    expect(mocks.instances).toHaveLength(1)
    expect(mocks.instances[0].connect).toHaveBeenCalledOnce()
    expect(store.contextFor('org-run')?.phase).toBe('reopen_required')
    expect(store.activeTargetFor('org-run')).toBeNull()
    expect(mocks.query.mock.calls.length).toBeGreaterThan(1)
  })
  it('keeps unavailable projection distinct from an empty historical conversation', async () => {
    mocks.query.mockImplementation(async ({ variables }) => variables.agentRunId
      ? { data: { getAgentOrgMemberRunProjection: null } } : inspection())
    const store = useAgentOrgContextsStore(); await expect(store.openForInspection('org-run')).rejects.toThrow('Projection unavailable')
    expect(store.contextFor('org-run')).toBeNull()
    expect(store.errorFor('org-run')).toContain('Projection unavailable')
    expect(mocks.instances).toHaveLength(0)
  })
})
