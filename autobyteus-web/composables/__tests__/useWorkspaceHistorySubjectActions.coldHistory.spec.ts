import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, shallowReactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useWorkspaceHistorySubjectActions } from '../useWorkspaceHistorySubjectActions'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { taskBearingView, taskRecord } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { ListCollaborationRootHistory } from '~/graphql/queries/collaborationRootHistoryQueries'
import { GetAgentOrgMemberRunProjection, GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import CollaborationDelegatedTasksSection from '~/components/workspace/collaboration/CollaborationDelegatedTasksSection.vue'

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), instances: [] as any[], ready: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query, mutate: mocks.mutate }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: mocks.ready }) }))
vi.mock('~/services/agentOrgExecution/agentOrgStreamingService', () => ({ AgentOrgStreamingService: class {
  connect = vi.fn(); disconnect = vi.fn(); isReady = () => true
  constructor(readonly options: any) { mocks.instances.push(this) }
} }))

const retainedView = (active: boolean) => {
  const view = taskBearingView()
  view.is_active = active
  const first = view.execution_tree.rootOrg.taskExecutions[1]
  if (!('teamRunId' in first)) throw new Error('Expected task Team fixture')
  const second = structuredClone(first)
  second.teamRunId = 'same-name-team-two'
  second.members.forEach(member => { member.agentRunId += '-two' })
  second.settledAt = first.settledAt = '2026-09-01T00:05:00.000Z'
  view.execution_tree.rootOrg.taskExecutions.push(second)
  view.task_records.records.push(taskRecord('task-team-two', '/team', { teamRunId: second.teamRunId }))
  for (const task of view.task_records.records.filter(task => 'teamRunId' in task.taskExecution)) {
    task.status = 'accepted'
    task.updates = [
      { submissionId: `result-${task.taskId}`, message: 'Retained result', referenceFiles: [], createdAt: '2026-09-01T00:03:00.000Z' },
      { reviewId: `review-${task.taskId}`, reviewedSubmissionId: `result-${task.taskId}`, decision: 'accept', comment: null, referenceFiles: [], createdAt: '2026-09-01T00:04:00.000Z' },
    ]
  }
  view.agent_statuses = active ? view.agent_statuses.filter(status => !status.agent_run_id.startsWith('agent-task-')) : []
  return view
}
const historyResponse = (view: ReturnType<typeof retainedView>) => ({ data: { listCollaborationRootHistory: [{
  root_subject_kind: 'agent_org', root_run_id: 'org-run', is_active: view.is_active,
  created_at: view.execution_tree.createdAt, archived_at: null, summary: 'Mixed Org', org: view.execution_tree,
}] } })
let wrapper: VueWrapper | undefined
beforeEach(() => {
  setActivePinia(createPinia()); mocks.query.mockReset(); mocks.mutate.mockReset(); mocks.ready.mockResolvedValue(true)
  mocks.instances.length = 0
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; useAgentOrgContextsStore().disconnect('org-run') })

const setup = async (active = true) => {
  const view = retainedView(active)
  mocks.query.mockImplementation(async ({ query, variables }) => {
    if (query === ListCollaborationRootHistory) return historyResponse(view)
    if (query === GetAgentOrgRunInspection) return { data: { getAgentOrgRunInspection: {
      schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view,
    } } }
    if (query === GetAgentOrgMemberRunProjection) return { data: { getAgentOrgMemberRunProjection: {
      ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } }
    throw new Error('Unexpected query')
  })
  // Model the already hydrated current route, without mounting the history drawer.
  const context = shallowReactive(await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view,
  }))
  context.select('/director')
  const contexts = useAgentOrgContextsStore()
  if (active) {
    await contexts.openForInspection('org-run')
    await flushPromises()
    contexts.contexts['org-run'] = context
  } else contexts.contexts['org-run'] = context
  const history = useRunHistoryStore()
  // Isolate the action's unloaded family-read boundary from initial context publication.
  // The current exact context is valid; the drawer's history slice is not prepared.
  history.agentOrgHistory = []
  mocks.query.mockClear()
  expect(history.agentOrgHistory).toEqual([])
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workspace', component: { template: '<div />' } }] })
  await router.push({ path: '/workspace', query: { rootSubjectKind: 'agent_org', orgRunId: 'org-run', memberAddress: '/director', mode: active ? 'active' : 'history' } })
  let execute!: ReturnType<typeof useWorkspaceHistorySubjectActions>['execute']
  // Real component -> real action -> real Pinia read/strict parser -> real router/context selection.
  wrapper = mount(defineComponent({ setup() {
    execute = useWorkspaceHistorySubjectActions().execute
    const tasks = context.selectedTarget()!.collaborationTasks
    return () => h(CollaborationDelegatedTasksSection, { tasks })
  } }), { global: { plugins: [router], stubs: {
    Icon: { template: '<span />' }, MarkdownRenderer: { props: ['content'], template: '<article>{{ content }}</article>' },
  } } })
  const push = vi.spyOn(router, 'push')
  return { context, contexts, history, router, push, execute, view }
}
const inspect = (agentRunId = 'agent-task-worker') => ({ rootSubjectKind: 'agent_org' as const, rootRunId: 'org-run',
  action: 'inspect' as const, agentRunId, memberAddress: '/team/worker' })
const historyQueries = () => mocks.query.mock.calls.filter(([{ query }]) => query === ListCollaborationRootHistory)

describe('exact Org task inspection independent of history drawer initialization', () => {
  it('awaits the canonical cold read, then opens the settled non-coordinator; warm same-name links keep exact identity', async () => {
    const { context, history, router, push, view } = await setup()
    let release!: (result: unknown) => void
    mocks.query.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
    await wrapper!.findAll('[data-test="team-delegated-task-summary-row"]')[1].trigger('click')
    await wrapper!.get('[data-test="task-direction-team"]').trigger('click')
    await wrapper!.get('[data-test="task-identity-detail"]').findAll('[data-test="task-identity-agent"]')[2].trigger('click')
    await flushPromises()
    expect(historyQueries()).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
    expect(context.selectedAddress).toBe('/director')
    release(historyResponse(view)); await flushPromises()
    expect(history.agentOrgHistory).toHaveLength(1)
    expect(router.currentRoute.value.query).toMatchObject({ rootSubjectKind: 'agent_org', orgRunId: 'org-run',
      definitionId: 'org-definition', mode: 'active', agentRunId: 'agent-task-worker', memberAddress: '/team/worker' })
    expect(context.selectedTarget()).toMatchObject({ access: 'read_only', context: { state: { runId: 'agent-task-worker' } } })
    await wrapper!.findAll('[data-test="team-delegated-task-summary-row"]')[2].trigger('click')
    await wrapper!.get('[data-test="task-direction-team"]').trigger('click')
    await wrapper!.get('[data-test="task-identity-detail"]').findAll('[data-test="task-identity-agent"]')[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.agentRunId).toBe('agent-task-worker-two')
    expect(context.selectedTarget()).toMatchObject({ access: 'read_only', context: { state: { runId: 'agent-task-worker-two' } } })
    expect(historyQueries()).toHaveLength(1)
    expect(mocks.instances).toHaveLength(1)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('resolves inactive history through the same read owner and inspects without Restore, transport or activation', async () => {
    const { execute, contexts, router } = await setup(false)
    await execute(inspect('agent-task-worker-two'))
    expect(router.currentRoute.value.query).toMatchObject({ mode: 'history', agentRunId: 'agent-task-worker-two' })
    expect(contexts.contextFor('org-run')?.selectedTarget()).toMatchObject({ access: 'read_only', context: { state: { runId: 'agent-task-worker-two' } } })
    expect(historyQueries()).toHaveLength(1)
    expect(mocks.query.mock.calls.some(([{ query }]) => query === GetAgentOrgRunInspection)).toBe(false) // coherent retained context is reusable
    expect(mocks.instances).toHaveLength(0)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it.each(['network', 'graphql', 'schema', 'missing'] as const)('retains strict %s unavailability without inferring root activity from the current context', async (failure) => {
    const { execute, context, history, push, view } = await setup()
    const response = historyResponse(view)
    if (failure === 'network') mocks.query.mockRejectedValueOnce(new Error('History read failed'))
    if (failure === 'graphql') mocks.query.mockResolvedValueOnce({ errors: [{ message: 'History denied' }] })
    if (failure === 'schema') { response.data.listCollaborationRootHistory[0].root_run_id = 'wrong-root'; mocks.query.mockResolvedValueOnce(response) }
    if (failure === 'missing') mocks.query.mockResolvedValueOnce({ data: { listCollaborationRootHistory: [] } })
    await expect(execute(inspect())).rejects.toThrow(failure === 'network' ? 'History read failed'
      : failure === 'graphql' ? 'History denied' : failure === 'schema' ? 'does not match' : "history run 'org-run' is unavailable")
    expect(push).not.toHaveBeenCalled()
    expect(context.selectedAddress).toBe('/director')
    expect(history.agentOrgHistory).toEqual([])
    expect(history.historyFamilyErrors.agentOrg === null).toBe(failure === 'missing')
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(mocks.instances).toHaveLength(1)
  })

  it('does not substitute a configured or same-address execution for an unknown exact AgentRun', async () => {
    const { execute, context, router } = await setup()
    await expect(execute(inspect('missing-agent-run'))).rejects.toThrow('unavailable')
    expect(router.currentRoute.value.query.agentRunId).toBeUndefined()
    expect(context.selectedTarget()?.context.state.runId).toBe('agent-director')
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('retains the exact AgentRun requirement before issuing navigation', async () => {
    const { execute, push } = await setup()
    await expect(execute({ ...inspect(), agentRunId: undefined })).rejects.toThrow('Exact task Agent execution is unavailable')
    expect(push).not.toHaveBeenCalled()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source'>) {
  const staged = await stageAgentOrgExecutionContext({ ...input, source: 'stream' })
  staged.commitActivities()
  return staged.context
}
