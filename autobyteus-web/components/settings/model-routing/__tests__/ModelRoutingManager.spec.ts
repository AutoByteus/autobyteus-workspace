import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
const nav = vi.hoisted(() => ({ push: vi.fn(async () => undefined), replace: vi.fn(async () => undefined) }))
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => nav }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ isEmbeddedWindow: true, entryId: 'embedded-local', bindingRevision: 0, lastReadyError: null, waitForBoundBackendReady: async () => true }),
}))
vi.mock('~/stores/nodeStore', () => ({ useNodeStore: () => ({ getEntryById: () => ({ name: 'Embedded Node' }) }) }))

import ModelRoutingManager from '../ModelRoutingManager.vue'
import type { ModelRoutingStatus, RoutingDecisionPage, RoutingDecisionRecord, RoutingStatistics } from '~/types/modelRouting'

/**
 * autobyteus-32 REQ-010 / UI/UX specification UIS-001..003, TR-001..013: the Model Routing page against the server's
 * JSON answers (synthesized). The Runtimes tab is `AgentRuntimesNowSection.spec.ts`.
 */
const status = (overrides: Partial<ModelRoutingStatus> = {}): ModelRoutingStatus => ({
  enabled: true, routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol' }, active: true,
  reasonCode: null, reasonParams: {}, reasonText: null, agentRunId: 'router_run_1', ...overrides,
})
const report = {
  checkedAt: '2026-10-26T09:00:00.000Z',
  agentRuntimes: [
    { runtime: 'codex_app_server', name: 'Codex', limits: 'not reported',
      models: [{ id: 'gpt-sol', name: 'GPT Sol' }, { id: 'gpt-mini', name: 'GPT Mini', blocked: { until: '2026-10-27T04:00:00.000Z', by: '5-hour' } }] },
    { runtime: 'claude_agent_sdk', name: 'Claude', limits: 'not reported', models: [{ id: 'sonnet', name: 'Sonnet' }] },
  ],
}
const record = (overrides: Partial<RoutingDecisionRecord>): RoutingDecisionRecord => ({
  recordedAt: new Date().toISOString(), taskId: 'task_1', taskKey: 'autobyteus-303', projectId: 'project_1', taskTitle: 'Agent runtimes tool',
  delegatingRunId: 'pm_run', delegatingAgentName: 'project_task_manager', fromNode: null, copyAddress: '/software_engineering_team',
  copyKind: 'agent_team', agentAddress: '/software_engineering_team/implementation_engineer', runtimeKind: 'codex_app_server',
  llmModelIdentifier: 'gpt-sol', source: 'model_router', taskKind: 'implementation', choiceReason: 'Codex fits a server change.',
  routerFailure: null, skipped: [], notes: [], ...overrides,
})
const teamDelegation = (records: RoutingDecisionRecord[]) => ({
  recordedAt: records[0]!.recordedAt, delegatingRunId: 'pm_run', delegatingAgentName: 'project_task_manager', fromNode: null,
  copyAddress: '/software_engineering_team', copyKind: 'agent_team' as const, records,
})
const decisions = (): RoutingDecisionPage => {
  const records = [
    record({ agentAddress: '/software_engineering_team/solution_designer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet',
      source: 'agent_default', taskKind: null, choiceReason: null }),
    record({ skipped: [{ layer: 'agent_default', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', detail: 'opus is blocked until 2026-10-28 09:00 UTC (weekly).' }] }),
  ]
  return { totalTasks: 2, groups: [
    { taskId: 'task_1', taskKey: 'autobyteus-303', projectId: 'project_1', taskTitle: 'Agent runtimes tool', latestAt: records[0]!.recordedAt,
      delegations: [teamDelegation(records)] },
    { taskId: 'ad_hoc_task_1', taskKey: null, projectId: null, taskTitle: 'Write the release notes', latestAt: '2026-10-20T09:00:00.000Z',
      delegations: [{ recordedAt: '2026-10-20T09:00:00.000Z', delegatingRunId: 'pm_run', delegatingAgentName: 'project_task_manager', fromNode: null,
        copyAddress: '/writer', copyKind: 'agent', records: [record({ recordedAt: '2026-10-20T09:00:00.000Z', copyAddress: '/writer', copyKind: 'agent',
          agentAddress: '/writer', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', source: 'inherited', taskKind: null, choiceReason: null,
          routerFailure: 'no valid answer within 40 seconds' })] }] },
  ] }
}
const statistics = (): RoutingStatistics => ({
  totalAgents: 3, sources: { model_router: 1, agent_default: 1, team_default: 0, inherited: 1 }, routerFailures: 1,
  taskKinds: [{ taskKind: 'implementation', count: 1, runtimes: [{ runtimeKind: 'codex_app_server', count: 1 }],
    models: [{ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', count: 1 }] }],
  notRouted: { count: 2, runtimes: [{ runtimeKind: 'claude_agent_sdk', count: 2 }], models: [{ runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', count: 2 }] },
})

let current: ModelRoutingStatus
let wrapper: VueWrapper | null = null
const mountPage = async () => {
  wrapper = mount(ModelRoutingManager, { attachTo: document.body, global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
  return wrapper
}
const get = (id: string) => wrapper!.get(`[data-testid="${id}"]`)
const has = (id: string) => wrapper!.find(`[data-testid="${id}"]`).exists()
const queryNames = () => io.query.mock.calls.map(([options]) => options.query.definitions[0].name.value)

describe('Settings → Model Routing (autobyteus-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = reactive({})
    current = status()
    io.query.mockImplementation(async ({ query, variables }) => {
      const name = query.definitions[0].name.value
      if (name === 'ModelRoutingStatus') return { data: { modelRoutingStatus: current } }
      if (name === 'AvailableAgentRuntimes') return { data: { availableAgentRuntimes: report } }
      if (name === 'ModelRoutingDecisions') {
        const page = decisions()
        const groups = variables.source === 'ROUTER' ? page.groups.slice(0, 1) : page.groups
        return { data: { modelRoutingDecisions: { totalTasks: groups.length, groups: variables.before ? [] : groups } } }
      }
      if (name === 'ModelRoutingStatistics') return { data: { modelRoutingStatistics: statistics() } }
      throw new Error(`unexpected query ${name}`)
    })
    io.mutate.mockImplementation(async ({ mutation, variables }) => {
      const name = mutation.definitions[0].name.value
      if (name === 'SetModelRoutingEnabled') { current = status({ enabled: variables.enabled }); return { data: { setModelRoutingEnabled: current } } }
      if (name === 'SetModelRouterLaunch') { current = status({ routerLaunch: variables }); return { data: { setModelRouterLaunch: current } } }
      if (name === 'OpenModelRouterAgent') return { data: { openModelRouterAgent: 'router_run_1' } }
      throw new Error(`unexpected mutation ${name}`)
    })
  })
  afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = '' })

  it('VIS-002 / TR-001: off, the page opens on Configuration with its fields and Talk to the router disabled; the switch turns it on', async () => {
    current = status({ enabled: false, active: false, reasonCode: 'OFF', reasonText: 'Model Routing is off' })
    await mountPage()
    expect(get('model-routing-switch').attributes('aria-checked')).toBe('false')
    expect(get('model-routing-tab-setup').attributes('aria-selected')).toBe('true')
    expect(get('model-routing-router-runtime').attributes('disabled')).toBeDefined()
    expect(get('model-routing-open-conversation').attributes('disabled')).toBeDefined()
    expect(has('model-routing-status')).toBe(false)
    await get('model-routing-switch').trigger('click')
    await flushPromises()
    expect(io.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { enabled: true } }))
    expect(get('model-routing-switch').attributes('aria-checked')).toBe('true')
  })

  it('VIS-003 / TR-003: on but not set: the problem line asks for a runtime and model; choosing both saves them together', async () => {
    current = status({ routerLaunch: null, active: false, reasonCode: 'ROUTER_NOT_SET' })
    await mountPage()
    expect(get('model-routing-status').text()).toContain('choose a runtime and model for the router.')
    await get('model-routing-router-runtime').setValue('claude_agent_sdk')
    expect(io.mutate).not.toHaveBeenCalled()
    await get('model-routing-router-model').setValue('sonnet')
    await flushPromises()
    expect(io.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet' } }))
  })

  it('VIS-004: the router\'s model blocked: the problem line says until when, the model list marks blocked models', async () => {
    current = status({ routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-mini' }, active: false, reasonCode: 'MODEL_BLOCKED',
      reasonParams: { runtime: 'codex_app_server', model: 'gpt-mini', until: '2026-10-27T04:00:00.000Z', limit: '5-hour' } })
    route.query.tab = 'setup'
    await mountPage()
    expect(get('model-routing-status').text()).toMatch(/Codex · gpt-mini is blocked until .+ \(5-hour\)\./)
    expect(get('model-routing-router-model').findAll('option').map((option) => option.text())).toContainEqual(expect.stringMatching(/^GPT Mini · blocked until /))
  })

  it('TR-005: Talk to the router opens the Model Router agent\'s run by its ID', async () => {
    route.query.tab = 'setup'
    await mountPage()
    await get('model-routing-open-conversation').trigger('click')
    await flushPromises()
    expect(nav.push).toHaveBeenCalledWith({ path: '/chat', query: { id: 'router_run_1' } })
  })

  it('VIS-005..008: on and set, Decisions shows Task blocks; a team is folded until opened; the failure and skipped notes show', async () => {
    await mountPage()
    expect(get('model-routing-tab-decisions').attributes('aria-selected')).toBe('true')
    expect(get('model-routing-task-autobyteus-303').text()).toContain('Agent runtimes tool')
    const team = get('model-routing-delegation-/software_engineering_team')
    expect(team.attributes('aria-expanded')).toBe('false')
    expect(team.text()).toContain('2 agents')
    await team.trigger('click')
    expect(get('model-routing-decision-reason').text()).toBe('Codex fits a server change.')
    expect(get('model-routing-decision-skipped').text()).toContain('Agent default Claude · opus was not used: opus is blocked until 2026-10-28 09:00 UTC (weekly).')
    expect(get('model-routing-decision-failure').text()).toBe("The Model Router could not choose: no valid answer within 40 seconds. The agents started on the delegating run's runtime and model.")
    expect(wrapper!.text()).toContain('No Project Task')
    expect(wrapper!.text()).toContain('Showing 2 of 2 Tasks')
  })

  it('TR-007: the source filter asks the server again (applied before paging)', async () => {
    await mountPage()
    await get('model-routing-filter-router').trigger('click')
    await flushPromises()
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ source: 'ROUTER' }) }))
    expect(wrapper!.text()).toContain('Showing 1 of 1 Tasks')
  })

  it('TR-013: View decision opens Decisions at that delegation, its team open', async () => {
    route.query = reactive({ tab: 'decisions', decisionRun: 'pm_run', decisionCopy: '/software_engineering_team', decisionAgent: '/software_engineering_team/implementation_engineer' })
    await mountPage()
    expect(get('model-routing-delegation-/software_engineering_team').attributes('aria-expanded')).toBe('true')
  })

  it('VIS-012 / TR-011: Overview shows the total, the sources, a row per task kind and Not routed; Details lists models', async () => {
    route.query.tab = 'overview'
    await mountPage()
    expect(queryNames()).toContain('ModelRoutingStatistics')
    expect(get('model-routing-overview-sources').text()).toContain('3 delegated agents in this period')
    expect(get('model-routing-overview-source-legend').text()).toContain('Model Router 1')
    expect(get('model-routing-overview-kind-list').text()).toContain('Implementation')
    expect(get('model-routing-overview-kind-list').text()).toContain('Not routed')
    await get('model-routing-overview-details-implementation').trigger('click')
    expect(get('model-routing-overview-models-implementation').text()).toContain('Codex · gpt-sol')
    await get('model-routing-period-7d').trigger('click')
    await flushPromises()
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { period: 'DAYS_7' } }))
  })
})
