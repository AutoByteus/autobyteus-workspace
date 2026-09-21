import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, shallowReactive } from 'vue'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import CollaborationOverviewPanel from '../CollaborationOverviewPanel.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
const mocks = vi.hoisted(() => ({ execute: vi.fn(), query: vi.fn() }))
vi.mock('~/composables/useWorkspaceHistorySubjectActions', () => ({ useWorkspaceHistorySubjectActions: () => ({ execute: mocks.execute }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  ensureWorkspaceByRootPath: vi.fn(), resolveWorkspaceMetadataByRootPath: vi.fn(),
}) }))
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  mocks.query.mockImplementation(async ({ variables }) => ({ data: { getAgentOrgMemberRunProjection: {
    ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
  } } }))
})
describe('shared participant Tasks inspection', () => {
  it('exposes Tasks for a direct Org Agent and navigates by the actual task run rather than source address', async () => {
    const context = shallowReactive(await hydrateAgentOrgExecutionContext({ orgRunId: 'org-run', view: taskBearingView(), }))
    context.select('/director')
    const target = computed(() => context.selectedTarget()!)
    mocks.execute.mockImplementation(async ({ agentRunId }) => context.select({ kind: 'agent_execution', agentRunId }))
    const Harness = defineComponent({ components: { CollaborationOverviewPanel }, setup: () => ({ target }),
      template: '<CollaborationOverviewPanel :messages="target.collaborationMessages" :tasks="target.collaborationTasks" />' })
    const wrapper = mount(Harness, { global: { mocks: { $t: (key: string, params?: any) => localizationRuntime.translate(key, params) } } })
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('2 tasks')
    const taskLink = wrapper.get('[data-test="task-direction-agent"][title="/worker · agent-worker-task"]')
    expect(taskLink.attributes('title')).toContain('agent-worker-task')
    expect(wrapper.find('nav').exists()).toBe(false)
    await taskLink.trigger('click'); await flushPromises()
    expect(mocks.execute).toHaveBeenCalledWith({ rootSubjectKind: 'agent_org', rootRunId: 'org-run', action: 'inspect',
      agentRunId: 'agent-worker-task', memberAddress: '/worker' })
    expect(context.selection).toEqual({ kind: 'agent_execution', agentRunId: 'agent-worker-task' })
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task')
    expect(wrapper.text()).toContain('Task task-agent')
    expect(wrapper.text()).not.toContain('Task task-team')
    wrapper.unmount()
  })
})

async function hydrateAgentOrgExecutionContext(input: Omit<Parameters<typeof stageAgentOrgExecutionContext>[0], 'source'>) {
  const staged = await stageAgentOrgExecutionContext({ ...input, source: 'stream' })
  staged.commitActivities()
  return staged.context
}
