import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick, onMounted } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentOrgRunConfigPanel from '../AgentOrgRunConfigPanel.vue'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentOrgRunConfigStore } from '~/stores/agentOrgRunConfigStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const { route, replace } = vi.hoisted(() => ({
  route: { query: { definitionId: 'delivery-org' } as Record<string, string> },
  replace: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
}))

const PassiveField = defineComponent({
  name: 'RuntimeModelConfigFields',
  props: ['idPrefix', 'runtimeHelpText', 'modelLabel', 'modelHelpText'],
  emits: ['schema-state', 'update:runtimeKind', 'update:llmModelIdentifier', 'update:llmConfig'],
  setup(_, { emit }) {
    onMounted(() => emit('schema-state', { status: 'ready', message: null }))
  },
  template: '<div data-test="runtime-fields" :data-id-prefix="idPrefix" />',
})
const PassiveWorkspace = defineComponent({
  name: 'WorkspaceSelector',
  props: ['model'],
  emits: ['update:modelValue'],
  template: '<div data-test="workspace-selector" />',
})
const AgentEditor = defineComponent({
  name: 'MemberOverrideItem',
  props: ['node'],
  emits: ['update:override', 'schema-state'],
  setup(props, { emit }) {
    onMounted(() => emit('schema-state', props.node.address, { status: 'ready', message: null }))
  },
  template: '<div data-test="agent-editor" :data-address="node.address">{{ node.isCoordinator ? "Coordinator" : "Agent" }}</div>',
})

const org = {
  id: 'delivery-org', name: 'Delivery Org', description: '', instructions: '', revision: '1', handoffs: [],
  defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-root', llmConfig: null },
  members: [
    { memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT' as const, refScope: 'SHARED' as const },
    { memberName: 'product', ref: 'product-team', refType: 'AGENT_TEAM' as const, refScope: 'SHARED' as const },
    { memberName: 'software', ref: 'software-team', refType: 'AGENT_TEAM' as const, refScope: 'SHARED' as const },
  ],
}
const teams = [{
  id: 'product-team', name: 'Product Design', description: '', instructions: '', coordinatorMemberName: 'designer',
  nodes: [{ memberName: 'designer', ref: 'designer-agent' }, { memberName: 'prototyper', ref: 'prototyper-agent' }],
}, {
  id: 'software-team', name: 'Software Engineering', description: '', instructions: '', coordinatorMemberName: 'architect',
  nodes: [{ memberName: 'architect', ref: 'architect-agent' }, { memberName: 'implementer', ref: 'implementer-agent' }],
}]

const mountedPanels: Array<ReturnType<typeof mount>> = []
const mountPanel = async () => {
  const wrapper = mount(AgentOrgRunConfigPanel, {
    global: {
      stubs: {
        RuntimeModelConfigFields: PassiveField,
        WorkspaceSelector: PassiveWorkspace,
        MemberOverrideItem: AgentEditor,
        Icon: true,
      },
    },
  })
  mountedPanels.push(wrapper)
  await flushPromises()
  return wrapper
}

const prepareRunnableWorkspace = async () => {
  useAgentOrgRunConfigStore().setWorkspaceSelection({
    mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/root',
  })
  await nextTick()
}

describe('AgentOrgRunConfigPanel mounted-Team hierarchy', () => {
  afterEach(() => {
    mountedPanels.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    const orgStore = useAgentOrgDefinitionStore()
    orgStore.definitions = [org]
    const teamStore = useAgentTeamDefinitionStore()
    teamStore.agentTeamDefinitions = teams
    const agentStore = useAgentDefinitionStore()
    agentStore.agentDefinitions = [{
      id: 'requirements-agent', name: 'Requirements Engineer', description: '', instructions: '',
      toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [],
      toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [],
    }]
    for (const id of ['designer-agent', 'prototyper-agent', 'architect-agent', 'implementer-agent']) {
      agentStore.agentDefinitions.push({ ...agentStore.agentDefinitions[0]!, id, name: id })
    }
    useWorkspaceStore().workspacesFetched = true
  })

  it('starts with the exact Agent count collapsed, then keeps each mounted Team independently collapsed', async () => {
    const wrapper = await mountPanel()
    const outer = wrapper.get('[data-test="org-member-overrides-toggle"]')
    expect(outer.text()).toContain('Member overrides (5)')
    expect(outer.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#org-member-overrides-panel').attributes('style')).toContain('display: none')

    await outer.trigger('click')
    const scopes = wrapper.findAllComponents(TeamScopeConfigEditor)
    expect(scopes.map((scope) => scope.props('scope').address)).toEqual(['/product', '/software'])
    expect(scopes.map((scope) => scope.get('button[aria-expanded]').attributes('aria-expanded'))).toEqual(['false', 'false'])
    expect(scopes[1]!.props('teamModelHelpText')).toBe('Agents in this Team inherit this value unless customized.')
    expect(wrapper.text()).toContain('Requirements Engineer')

    await scopes[1]!.get('button[aria-expanded]').trigger('click')
    expect(scopes[1]!.get('button[aria-expanded]').attributes('aria-expanded')).toBe('true')
    expect(scopes[0]!.get('button[aria-expanded]').attributes('aria-expanded')).toBe('false')
    expect(scopes[1]!.findAll('[data-test="agent-editor"]').map((node) => node.attributes('data-address')))
      .toEqual(['/software/architect', '/software/implementer'])
    expect(scopes[1]!.text()).toContain('Coordinator')
  })

  it('keeps Team and Agent patches independent and preserves them across collapse/reopen', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-test="org-member-overrides-toggle"]').trigger('click')
    let software = wrapper.findAllComponents(TeamScopeConfigEditor)[1]!
    await software.get('button[aria-expanded]').trigger('click')
    software.vm.$emit('update-override', { runtimeKind: 'codex_app_server' })
    await nextTick()

    software = wrapper.findAllComponents(TeamScopeConfigEditor)[1]!
    expect(software.props('scope')).toEqual(expect.objectContaining({ isCustomized: true }))
    await software.get('button[aria-expanded]').trigger('click')
    await software.get('button[aria-expanded]').trigger('click')
    expect(wrapper.findAllComponents(TeamScopeConfigEditor)[1]!.props('scope')).toEqual(expect.objectContaining({
      isCustomized: true,
      override: expect.objectContaining({ runtimeKind: 'codex_app_server' }),
    }))

    const configStore = useAgentOrgRunConfigStore()
    configStore.setAgentOverride('/software/implementer', { llmModelIdentifier: 'gpt-member' })
    configStore.setAgentOverride('/requirements_engineer', { autoExecuteTools: true })
    configStore.resetTeamOverride('/software')
    await nextTick()
    software = wrapper.findAllComponents(TeamScopeConfigEditor)[1]!
    expect(software.props('scope')).toEqual(expect.objectContaining({ isCustomized: false, override: null }))
    expect(configStore.agentOverrides['/software/implementer']).toEqual({
      llmModelIdentifier: 'gpt-member', llmConfig: null,
    }, { flush: 'sync' })
    expect(wrapper.get('[data-test="org-placement-/requirements_engineer"]').text()).toContain('Overridden')
  })

  it('keeps Org Team AGY default on through one runtime-selection event batch, then accepts explicit off', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-test="org-member-overrides-toggle"]').trigger('click')
    let software = wrapper.findAllComponents(TeamScopeConfigEditor)[1]!
    const runtime = software.getComponent(PassiveField)
    runtime.vm.$emit('update:runtimeKind', 'antigravity_cli')
    runtime.vm.$emit('update:llmModelIdentifier', '')
    runtime.vm.$emit('update:llmConfig', null)
    await nextTick()

    const store = useAgentOrgRunConfigStore()
    expect(store.intent.teamOverrides['/software']).toMatchObject({ runtimeKind: 'antigravity_cli', autoExecuteTools: true })
    software = wrapper.findAllComponents(TeamScopeConfigEditor)[1]!
    expect(software.props('scope').effectiveConfig.autoExecuteTools).toBe(true)

    await software.get('button[aria-expanded]').trigger('click')
    await software.get('[role="switch"]').trigger('click')
    await nextTick()
    expect(store.intent.teamOverrides['/software']?.autoExecuteTools).toBeUndefined()
    expect(wrapper.findAllComponents(TeamScopeConfigEditor)[1]!.props('scope').effectiveConfig.autoExecuteTools).toBe(false)
  })

  it('maps exact sparse Team and Agent patches to the unchanged AgentOrg launch command', async () => {
    const wrapper = await mountPanel()
    const configStore = useAgentOrgRunConfigStore()
    configStore.setWorkspaceSelection({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/root' })
    configStore.setTeamOverride('/software', { runtimeKind: 'codex_app_server', autoExecuteTools: true })
    configStore.setAgentOverride('/software/implementer', { llmModelIdentifier: 'gpt-member' })
    await wrapper.get('[data-test="org-member-overrides-toggle"]').trigger('click')
    wrapper.findAllComponents(TeamScopeConfigEditor)[1]!.vm.$emit(
      'update:workspace-selection', '/software',
      { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/software' },
    )
    const workspaceStore = useWorkspaceStore()
    vi.spyOn(workspaceStore, 'createWorkspace').mockResolvedValue('workspace-root')
    const runStore = useAgentOrgRunStore()
    vi.spyOn(runStore, 'launch').mockResolvedValue('org-run-1')
    vi.spyOn(useRunHistoryStore(), 'refreshTreeQuietly').mockResolvedValue(undefined)
    await nextTick()

    await wrapper.get('[data-test="run-agent-org"]').trigger('click')
    await flushPromises()

    expect(runStore.launch).toHaveBeenCalledWith(expect.objectContaining({
      agentOrgDefinitionId: 'delivery-org',
      rootConfiguration: expect.objectContaining({ workspaceRootPath: '/workspace/root' }),
      teamOverrides: [{
        address: '/software',
        configuration: {
          runtimeKind: 'codex_app_server', autoExecuteTools: true,
          llmConfig: null,
          workspaceRootPath: '/workspace/software',
        },
      }],
      agentOverrides: [{
        address: '/software/implementer',
        configuration: { llmModelIdentifier: 'gpt-member', llmConfig: null },
      }],
    }))
    expect(workspaceStore.createWorkspace).toHaveBeenCalledWith({ root_path: '/workspace/software' })
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ orgRunId: 'org-run-1', rootSubjectKind: 'agent_org' }),
    }))
  })

  it('selects the catalog Temp Workspace once for a fresh Org root and projects inheritance', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.workspaces.temp_ws_default = {
      workspaceId: 'temp_ws_default',
      name: 'Temp Workspace',
      workspaceConfig: { root_path: '/workspace/temp' },
      absolutePath: '/workspace/temp',
      workspaceRootPath: '/workspace/temp',
      kind: 'temp',
      isTemp: true,
    }

    const wrapper = await mountPanel()
    const configStore = useAgentOrgRunConfigStore()
    expect(configStore.rootWorkspaceSelectionSource).toBe('defaulted')
    expect(configStore.workspaceSelection).toEqual({
      mode: 'existing', existingWorkspaceId: 'temp_ws_default', newWorkspacePath: '',
    })
    const scopes = wrapper.findAllComponents(TeamScopeConfigEditor)
    expect(scopes).toHaveLength(2)
    expect(scopes.every((scope) => scope.props('scope').effectiveConfig.workspaceRootPath === '/workspace/temp')).toBe(true)
    expect(scopes.every((scope) => scope.props('scope').override === null)).toBe(true)
    expect(configStore.teamWorkspaceSelections).toEqual({})
    expect(configStore.agentOverrides).toEqual({})

    configStore.setWorkspaceSelection({
      mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/explicit',
    })
    delete workspaceStore.workspaces.temp_ws_default
    workspaceStore.workspaces.replacement_temp = {
      workspaceId: 'replacement_temp',
      name: 'Replacement Temp',
      workspaceConfig: { root_path: '/workspace/replacement' },
      absolutePath: '/workspace/replacement',
      workspaceRootPath: '/workspace/replacement',
      kind: 'temp',
      isTemp: true,
    }
    await nextTick()

    expect(configStore.rootWorkspaceSelectionSource).toBe('explicit')
    expect(configStore.workspaceSelection.newWorkspacePath).toBe('/workspace/explicit')
    expect(wrapper.findAllComponents(TeamScopeConfigEditor).every(
      (scope) => scope.props('scope').effectiveConfig.workspaceRootPath === '/workspace/explicit',
    )).toBe(true)
  })

  it('fails closed and disables Run when a referenced Team is unavailable', async () => {
    useAgentTeamDefinitionStore().agentTeamDefinitions = teams.filter((team) => team.id !== 'software-team')
    const wrapper = await mountPanel()
    expect(wrapper.get('[data-test="org-config-reference-diagnostic"]').text()).toContain('Unable to load organization members: software-team')
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="org-member-overrides-toggle"]').exists()).toBe(false)
  })

  it('blocks the root invalid schema state with an exact accessible diagnostic until ready', async () => {
    const wrapper = await mountPanel()
    await prepareRunnableWorkspace()
    const configStore = useAgentOrgRunConfigStore()
    const begin = vi.spyOn(configStore, 'begin')
    expect(configStore.workspaceSelection.newWorkspacePath).toBe('/workspace/root')
    const rootFields = wrapper.findAllComponents(PassiveField)
      .find((field) => field.props('idPrefix') === 'org-run')!

    rootFields.vm.$emit('schema-state', { status: 'invalid', message: 'Value must be at least 1.' })
    await nextTick()

    const diagnostic = wrapper.get('[data-test="org-config-schema-diagnostic"]')
    expect(diagnostic.attributes('role')).toBe('alert')
    expect(diagnostic.text()).toContain('/')
    expect(diagnostic.text()).toContain('Value must be at least 1.')
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('aria-describedby')).toBe('org-model-schema-status')

    rootFields.vm.$emit('schema-state', { status: 'ready', message: null })
    await flushPromises()
    expect(begin).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="org-config-schema-diagnostic"]').exists()).toBe(false)
    expect(configStore.firstModelSchemaBlock).toBeNull()
    expect(configStore.workspaceSelection.newWorkspacePath).toBe('/workspace/root')
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeUndefined()
  })

  it('blocks the exact mounted Team schema state until that Team becomes ready', async () => {
    const wrapper = await mountPanel()
    await prepareRunnableWorkspace()
    const teamFields = wrapper.findAllComponents(PassiveField)
      .find((field) => field.props('idPrefix') === 'team-scope-software')!

    teamFields.vm.$emit('schema-state', { status: 'invalid', message: 'Value must be at most 10.' })
    await nextTick()

    expect(wrapper.get('[data-test="org-config-schema-diagnostic"]').text())
      .toContain("Model configuration for /software is not ready: Value must be at most 10.")
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()

    teamFields.vm.$emit('schema-state', { status: 'ready', message: null })
    await flushPromises()
    expect(wrapper.find('[data-test="org-config-schema-diagnostic"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeUndefined()
  })

  it('forwards a direct Agent schema state and blocks only until the exact Agent is ready', async () => {
    const wrapper = await mountPanel()
    await prepareRunnableWorkspace()
    const directAgent = wrapper.findAllComponents(AgentEditor)
      .find((editor) => editor.props('node').address === '/requirements_engineer')!

    directAgent.vm.$emit('schema-state', '/requirements_engineer', {
      status: 'unavailable', message: 'Model options could not be loaded.',
    })
    await nextTick()

    const diagnostic = wrapper.get('[data-test="org-config-schema-diagnostic"]')
    expect(diagnostic.attributes('role')).toBe('alert')
    expect(diagnostic.text()).toContain('/requirements_engineer')
    expect(diagnostic.text()).toContain('Model options could not be loaded.')
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()

    directAgent.vm.$emit('schema-state', '/requirements_engineer', { status: 'ready', message: null })
    await nextTick()
    expect(wrapper.find('[data-test="org-config-schema-diagnostic"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeUndefined()
  })

  it('cannot launch stale Agent state and admits the committed default after a failed choice is abandoned', async () => {
    const wrapper = await mountPanel()
    await prepareRunnableWorkspace()
    const runStore = useAgentOrgRunStore()
    const launch = vi.spyOn(runStore, 'launch').mockResolvedValue('org-run-runtime')
    vi.spyOn(useWorkspaceStore(), 'createWorkspace').mockResolvedValue('workspace-root')
    const member = wrapper.findAllComponents(AgentEditor)
      .find((editor) => editor.props('node').address === '/software/implementer')!

    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeUndefined()
    member.vm.$emit('schema-state', '/software/implementer', { status: 'loading', message: null })
    await nextTick()

    expect(wrapper.get('[data-test="org-config-schema-diagnostic"]').text())
      .toContain('Validating model configuration for /software/implementer')
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="run-agent-org"]').trigger('click')
    expect(launch).not.toHaveBeenCalled()
    expect(useAgentOrgRunConfigStore().agentOverrides['/software/implementer']).toBeUndefined()

    member.vm.$emit('schema-state', '/software/implementer', {
      status: 'unavailable', message: 'Claude catalog is offline.',
    })
    await nextTick()
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeDefined()

    member.vm.$emit('schema-state', '/software/implementer', { status: 'ready', message: null })
    await nextTick()
    expect(wrapper.get('[data-test="run-agent-org"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-test="run-agent-org"]').trigger('click')
    await flushPromises()
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({
      agentOverrides: [],
    }))
  })

  it('renders the Agent Org launch controls through the Simplified Chinese catalog', async () => {
    await localizationRuntime.setPreference('zh-CN')
    try {
      const wrapper = await mountPanel()
      const rootFields = wrapper.findAllComponents(PassiveField)
        .find((field) => field.props('idPrefix') === 'org-run')!

      expect(rootFields.props()).toMatchObject({
        runtimeHelpText: '选择此组织运行所使用的运行时。',
        modelLabel: '默认大语言模型',
        modelHelpText: '应用于整个组织，除非某个位置已自定义。',
      })
      expect(wrapper.get('[data-test="run-agent-org"]').text()).toBe('运行智能体组织')
    } finally {
      await localizationRuntime.setPreference('en')
    }
  })
})
