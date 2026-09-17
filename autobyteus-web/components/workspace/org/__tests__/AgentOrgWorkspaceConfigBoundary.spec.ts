import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AgentOrgWorkspaceView from '../AgentOrgWorkspaceView.vue'
import ExistingRunConfigEditor from '~/components/workspace/config/ExistingRunConfigEditor.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const state = reactive({ context: null as any, target: null as any })
const inspect = vi.fn().mockResolvedValue(undefined)
const disconnect = vi.fn()
const push = vi.fn().mockResolvedValue(undefined)
const readOrg = vi.fn()
const saveOrg = vi.fn()
const center = reactive({
  mode: 'chat' as 'chat' | 'config',
  get isConfigMode() { return this.mode === 'config' },
  showChat: vi.fn(() => { center.mode = 'chat' }),
  showConfig: vi.fn(() => { center.mode = 'config' }),
})
const route = reactive({ query: {
  rootSubjectKind: 'agent_org', definitionId: 'org-def', orgRunId: 'org-run', mode: 'history',
} })

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push, replace: push }),
}))
vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    get activeWorkspaceTarget() { return state.target },
    inspectAgentOrg: inspect,
    selectAgentOrg: vi.fn(),
    disconnectAgentOrg: disconnect,
    agentOrgContextFor: () => state.context,
    agentOrgErrorFor: () => null,
  }),
}))
vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => center,
}))
vi.mock('~/stores/agentOrgContextsStore', () => ({
  useAgentOrgContextsStore: () => ({ readRunModelConfig: readOrg, saveRunModelConfigs: saveOrg }),
}))
vi.mock('~/services/runConfigEditing/existingRunModelOptionsClient', () => ({
  loadExistingRunModelOptions: vi.fn().mockResolvedValue({}),
}))

const directTarget = {
  kind: 'agent_org_direct_agent', access: 'continuable',
  root: { orgRunId: 'org-run' }, address: '/writer',
  context: { state: { runId: 'agent-run' } },
}
const mountedTeamTarget = {
  kind: 'agent_org_team_member', access: 'continuable',
  root: { orgRunId: 'org-run' }, address: '/delivery/reviewer',
  context: { state: { runId: 'mounted-agent-run' } },
}

const reprojectTarget = () => {
  const current = state.target
  state.target = { ...current, root: { ...current.root },
    context: { ...current.context, state: { ...current.context.state } } }
}

const mountBoundary = () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AgentOrgWorkspaceView, { global: { plugins: [pinia], stubs: {
    Icon: true,
    AgentWorkspaceSurface: {
      emits: ['edit-config'],
      template: '<button data-test="direct-settings" @click="$emit(\'edit-config\')" />',
    },
    TeamWorkspaceSurface: {
      emits: ['edit-config'],
      template: '<button data-test="mounted-settings" @click="$emit(\'edit-config\')" />',
    },
    AgentRunConfigForm: true,
    TeamRunConfigForm: true,
    AgentOrgRunConfigForm: {
      props: ['existingModel'],
      template: '<div data-test="rendered-whole-org-form">{{ existingModel.root.address }}</div>',
    },
  } } })
}

describe('AgentOrg workspace configuration boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query.orgRunId = 'org-run'
    route.query.mode = 'history'
    center.mode = 'chat'
    state.context = {
      phase: 'historical', error: null,
      executionTree: { rootOrg: { orgDefinitionId: 'org-def', orgRunId: 'org-run' } },
    }
    readOrg.mockImplementation(async (orgRunId: string) => {
      const tree = structuredClone(taskBearingView().execution_tree)
      tree.rootOrg.orgRunId = orgRunId
      // Mirror canonical read publication: the active target is reprojected with new object identity.
      reprojectTarget()
      state.context = { ...state.context, executionTree: tree }
      return { orgRunId, executionTree: tree, isActive: false,
        editability: { editable: true, reason: null } }
    })
  })

  it.each([
    ['direct', directTarget, '[data-test="direct-settings"]'],
    ['mounted', mountedTeamTarget, '[data-test="mounted-settings"]'],
  ] as const)('stabilizes the real %s Settings parent/editor boundary after canonical publication', async (_placement, target, selector) => {
    state.target = structuredClone(target)
    const wrapper = mountBoundary()
    await wrapper.get(selector).trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="rendered-whole-org-form"]').exists()).toBe(true))
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(readOrg).toHaveBeenCalledTimes(1)
    expect(readOrg).toHaveBeenCalledWith('org-run')
    expect(wrapper.get('[data-test="agent-org-run-config-editor"] [aria-busy]').attributes('aria-busy')).toBe('false')
    expect(wrapper.get('[data-test="rendered-whole-org-form"]').text()).toBe('/')
    wrapper.unmount()
  })

  it('reloads the real editor once when the semantic Org subject actually changes', async () => {
    state.target = structuredClone(directTarget)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(ExistingRunConfigEditor, {
      props: { target: { kind: 'agent_org', orgRunId: 'org-run' } },
      global: { plugins: [pinia], stubs: {
        AgentRunConfigForm: true,
        TeamRunConfigForm: true,
        AgentOrgRunConfigForm: {
          props: ['existingModel'],
          template: '<div data-test="rendered-whole-org-form">{{ existingModel.root.address }}</div>',
        },
      } },
    })
    await vi.waitFor(() => expect(readOrg).toHaveBeenCalledTimes(1))

    await wrapper.setProps({ target: { kind: 'agent_org', orgRunId: 'org-run-next' } })
    await vi.waitFor(() => expect(readOrg).toHaveBeenCalledTimes(2))
    expect(readOrg.mock.calls.map(([id]) => id)).toEqual(['org-run', 'org-run-next'])
    expect(wrapper.get('[data-test="rendered-whole-org-form"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
