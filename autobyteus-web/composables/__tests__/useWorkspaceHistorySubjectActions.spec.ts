import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceHistorySubjectActions } from '../useWorkspaceHistorySubjectActions'

const mocks = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> }, push: vi.fn(), replace: vi.fn(),
  active: false, phase: 'historical',
  history: { agentOrgHistory: [] as any[] },
  contexts: { select: vi.fn(), openForInspection: vi.fn(), stopAndInspect: vi.fn(), contextFor: vi.fn() },
  clear: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => mocks.history }))
vi.mock('~/stores/agentOrgContextsStore', () => ({ useAgentOrgContextsStore: () => mocks.contexts }))
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => ({
    beginSelectionIntent: () => ({ isCurrent: () => true }), clearSelection: mocks.clear }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.route.query = {}
  mocks.active = false; mocks.phase = 'historical'
  mocks.contexts.openForInspection.mockResolvedValue(undefined)
  mocks.contexts.stopAndInspect.mockResolvedValue(undefined)
  mocks.contexts.contextFor.mockImplementation(() => ({ isActive: mocks.active, phase: mocks.phase,
    index: { agents: new Map([['task-exact', { agentRunId: 'task-exact', address: '/team/coordinator' }]]),
      configured: new Map([['/team', {}], ['/team/coordinator', {}]]) },
  }))
  mocks.history.agentOrgHistory = [{ rootRunId: 'org-run', isActive: true,
    executionTree: { rootOrg: { orgDefinitionId: 'org-def' } } }]
})

describe('Org browse is inspection and Stop retains the same exact route', () => {
  it.each(['open', 'select', 'inspect'] as const)('uses observed inactive truth, not stale active row, for %s', async (action) => {
    await useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action,
      memberAddress: '/team/coordinator', agentRunId: 'task-exact' })
    expect(mocks.contexts.openForInspection).toHaveBeenCalledExactlyOnceWith('org-run', expect.objectContaining({ isCurrent: expect.any(Function) }))
    expect(mocks.contexts.stopAndInspect).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith({ path: '/workspace', query: {
      rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-run', mode: 'history',
      ...(action === 'open' ? {} : { memberAddress: '/team/coordinator' }),
      ...(action === 'inspect' ? { agentRunId: 'task-exact' } : {}),
    } })
  })
  it('browses a Team through its exact configured address after coherent active inspection', async () => {
    mocks.active = true
    await useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'select', memberAddress: '/team' })
    expect(mocks.contexts.select).toHaveBeenCalledWith('org-run', '/team')
    expect(mocks.push.mock.calls[0][0].query.mode).toBe('active')
  })
  it('preserves selection and route if strict inspection or exact placement fails', async () => {
    mocks.contexts.openForInspection.mockRejectedValueOnce(new Error('unavailable'))
    const actions = useWorkspaceHistorySubjectActions()
    await expect(actions.execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'select', memberAddress: '/team' })).rejects.toThrow('unavailable')
    await expect(actions.execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'inspect', agentRunId: 'task-exact', memberAddress: '/wrong' })).rejects.toThrow('unavailable')
    expect(mocks.clear).not.toHaveBeenCalled(); expect(mocks.contexts.select).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled()
  })
  it.each([false, true])('keeps latest exact selection/history mode after confirmed Stop, even if final read fails=%s', async (fails) => {
    mocks.route.query = { rootSubjectKind: 'agent_org', orgRunId: 'org-run', mode: 'active', memberAddress: '/team/coordinator', agentRunId: 'task-exact' }
    mocks.contexts.stopAndInspect.mockImplementation(async () => { if (fails) throw new Error('final read unavailable') })
    const pending = useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'stop' })
    if (fails) await expect(pending).rejects.toThrow('final read unavailable'); else await pending
    expect(mocks.contexts.stopAndInspect).toHaveBeenCalledWith('org-run')
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/workspace', query: { ...mocks.route.query, mode: 'history' } })
    expect(mocks.push).not.toHaveBeenCalled()
  })
  it('does not steal a different current root on background Stop completion', async () => {
    mocks.route.query = { rootSubjectKind: 'agent_org', orgRunId: 'other', mode: 'active' }
    await useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'stop' })
    expect(mocks.replace).not.toHaveBeenCalled(); expect(mocks.clear).not.toHaveBeenCalled()
  })
})
