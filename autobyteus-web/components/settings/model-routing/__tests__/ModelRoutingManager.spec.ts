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
/**
 * The app's model catalog (autobyteus-313), synthesized: catalog labels for some models, and the Codex model's schema
 * with a reasoning effort (thinking) and a Fast option (another model option).
 */
const catalog = vi.hoisted(() => {
  const labels: Record<string, string> = { 'codex_app_server:gpt-sol': 'GPT Sol', 'claude_agent_sdk:sonnet': 'Claude Sonnet', 'claude_agent_sdk:opus': 'Claude Opus' }
  const codexSchema = {
    reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
    service_tier: { type: 'string', enum: ['fast'], title: 'Fast mode' },
  }
  return {
    codexSchema,
    ensureCatalog: vi.fn(),
    modelLabel: (runtimeKind: string, id: string) => labels[`${runtimeKind}:${id}`] ?? id,
    findModel: (runtimeKind: string, id: string) => (labels[`${runtimeKind}:${id}`] ? { label: labels[`${runtimeKind}:${id}`] } : null),
    schemaFor: (runtimeKind: string, id: string | null | undefined) => (runtimeKind === 'codex_app_server' && id ? codexSchema : null),
  }
})
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => catalog }))

import ModelRoutingManager from '../ModelRoutingManager.vue'
import type { ModelRoutingStatus, RoutingDecisionPage, RoutingDecisionRecord, RoutingStatistics } from '~/types/modelRouting'
import { explicitChatModelConfig } from '~/utils/runSettings/explicitModelConfig'

/** The app's launch controls, stubbed to their props and events (their own behavior is the chat components' specs). */
const ChatModelMenu = {
  name: 'ChatModelMenu',
  props: ['runtimeKind', 'llmModelIdentifier', 'modelLabel', 'placement', 'align'],
  emits: ['select'],
  template: '<button type="button" data-testid="stub-model-menu" @click="$emit(\'select\', { runtimeKind: \'codex_app_server\', llmModelIdentifier: \'gpt-sol\' })">{{ modelLabel }}</button>',
}
const ChatThinkingControl = {
  name: 'ChatThinkingControl', props: ['schema', 'llmConfig', 'placement', 'align'], emits: ['update'],
  template: '<button type="button" data-testid="stub-thinking" @click="$emit(\'update\', { ...(llmConfig || {}), reasoning_effort: \'high\' })">thinking</button>',
}
const ChatModelOptionControl = {
  name: 'ChatModelOptionControl', props: ['option', 'placement', 'align'], emits: ['update'],
  template: '<button type="button" :data-testid="`stub-option-${option.key}`" @click="$emit(\'update\', option.onValue)">{{ option.title }}</button>',
}

/**
 * autobyteus-32 REQ-010 / UI/UX specification UIS-001..003, TR-001..013: the Model Routing page against the server's
 * JSON answers (synthesized). The Runtimes tab is `AgentRuntimesNowSection.spec.ts`.
 */
const status = (overrides: Partial<ModelRoutingStatus> = {}): ModelRoutingStatus => ({
  enabled: true, routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: { reasoning_effort: 'medium' } }, active: true,
  reasonCode: null, reasonParams: {}, reasonText: null, agentRunId: 'router_run_1', ...overrides,
})
const record = (overrides: Partial<RoutingDecisionRecord>): RoutingDecisionRecord => ({
  recordedAt: new Date().toISOString(), taskId: 'task_1', taskKey: 'autobyteus-303', projectId: 'project_1', taskTitle: 'Agent runtimes tool',
  delegatingRunId: 'pm_run', delegatingAgentName: 'project_task_manager', fromNode: null, copyAddress: '/software_engineering_team',
  copyKind: 'agent_team', agentAddress: '/software_engineering_team/implementation_engineer', runtimeKind: 'codex_app_server',
  llmModelIdentifier: 'gpt-sol', source: 'model_router', taskKind: 'implementation', choiceReason: 'Codex fits a server change.',
  routerFailure: null, skipped: [], ...overrides,
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
  wrapper = mount(ModelRoutingManager, { attachTo: document.body, global: { stubs: {
    NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, ChatModelMenu, ChatThinkingControl, ChatModelOptionControl,
  } } })
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
    // autobyteus-313: the launch controls are present but not usable while Model Routing is off.
    expect(get('model-routing-router-row').attributes('aria-disabled')).toBe('true')
    expect(get('model-routing-router-row').attributes('inert')).toBeDefined()
    expect(get('model-routing-open-conversation').attributes('disabled')).toBeDefined()
    expect(has('model-routing-status')).toBe(false)
    await get('model-routing-switch').trigger('click')
    await flushPromises()
    expect(io.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { enabled: true } }))
    expect(get('model-routing-switch').attributes('aria-checked')).toBe('true')
  })

  it('VIS-003 / AC-001, AC-002: on but not set: the app\'s model menu (no native select) saves runtime, model and the model\'s settings made explicit', async () => {
    current = status({ routerLaunch: null, active: false, reasonCode: 'ROUTER_NOT_SET' })
    await mountPage()
    expect(get('model-routing-status').text()).toContain('choose a runtime and model for the router.')
    expect(get('model-routing-setup').find('select').exists()).toBe(false)
    expect(get('model-routing-router-row').attributes('aria-disabled')).toBeUndefined()
    const menu = wrapper!.getComponent(ChatModelMenu)
    expect(menu.props()).toMatchObject({ runtimeKind: '', llmModelIdentifier: '', modelLabel: '', placement: 'auto', align: 'left' })
    await get('stub-model-menu').trigger('click')
    await flushPromises()
    expect(io.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: explicitChatModelConfig(catalog.codexSchema, null),
    } }))
  })

  it('AC-001, AC-002: the saved launch shows in the menu, thinking and option controls; each change saves the launch with the new settings', async () => {
    route.query.tab = 'setup'
    await mountPage()
    expect(wrapper!.getComponent(ChatModelMenu).props()).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', modelLabel: 'GPT Sol' })
    expect(wrapper!.getComponent(ChatThinkingControl).props()).toMatchObject({ schema: catalog.codexSchema, llmConfig: { reasoning_effort: 'medium' } })
    expect(catalog.ensureCatalog).toHaveBeenCalledWith('codex_app_server')
    await get('stub-thinking').trigger('click')
    await flushPromises()
    expect(io.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ variables: {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: { reasoning_effort: 'high' },
    } }))
    await get('stub-option-service_tier').trigger('click')
    await flushPromises()
    expect(io.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ variables: {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: { reasoning_effort: 'high', service_tier: 'fast' },
    } }))
  })

  it('a refused save shows the server\'s message and keeps the saved launch', async () => {
    route.query.tab = 'setup'
    await mountPage()
    io.mutate.mockRejectedValueOnce(new Error('The model settings are invalid: reasoning_effort must be one of low, medium, high'))
    await get('stub-thinking').trigger('click')
    await flushPromises()
    expect(get('model-routing-error').text()).toBe('The model settings are invalid: reasoning_effort must be one of low, medium, high')
    expect(wrapper!.getComponent(ChatThinkingControl).props('llmConfig')).toEqual({ reasoning_effort: 'medium' })
  })

  it('VIS-004 / AC-004: the router\'s model blocked: the problem line names it as the model menu does and says until when', async () => {
    current = status({ routerLaunch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: null }, active: false, reasonCode: 'MODEL_BLOCKED',
      reasonParams: { runtime: 'codex_app_server', model: 'gpt-sol', until: '2026-10-27T04:00:00.000Z', limit: '5-hour' } })
    route.query.tab = 'setup'
    await mountPage()
    expect(get('model-routing-status').text()).toMatch(/GPT Sol Codex is blocked until .+ \(5-hour\)\./)
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
    // AC-004: models are named as the model menu names them, with the runtime's short name.
    expect(wrapper!.findAll('[data-testid="model-routing-decision-launch"]').map((row) => row.text().replace(/\s+/g, ' '))).toEqual(['Claude Sonnet Claude SDK', 'GPT Sol Codex', 'Claude Sonnet Claude SDK'])
    expect(get('model-routing-decision-skipped').text()).toContain('Agent default Claude Opus Claude SDK was not used: opus is blocked until 2026-10-28 09:00 UTC (weekly).')
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
    expect(get('model-routing-overview-models-implementation').text().replace(/\s+/g, ' ')).toContain('GPT Sol Codex')
    // AC-004: a runtime on its own has the app's full name.
    expect(get('model-routing-overview-runtime-legend').text()).toContain('Codex App Server')
    expect(get('model-routing-overview-runtime-legend').text()).toContain('Claude Agent SDK')
    await get('model-routing-period-7d').trigger('click')
    await flushPromises()
    expect(io.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { period: 'DAYS_7' } }))
  })
})
