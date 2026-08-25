import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import type { ResolvedTeamRunLaunchConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

const translations: Record<string, string> = {
  auto_approve: 'Auto approve tools',
  auto_approve_tools: 'Auto approve tools',
  auto_approve_tools_help: 'High-trust mode for Codex team members.',
  auto_help: 'Inherited by descendant scopes without an override.',
  customized: 'Customized',
  default_llm_model_global: 'Default LLM Model (Global)',
  inherited: 'Inherited',
  model_help: 'Nested Teams and Agents inherit this value unless customized.',
  reset: 'Reset',
  retry: 'Retry',
  runtime_help: 'Runtime used by this Team scope.',
  selects_the_runtime_backend_used_by: 'Selects the runtime backend used by this team run.',
  team_default_model: 'Default LLM Model',
  team_marker: 'Team',
  this_model_will_be_used_by: 'This model will be used by all members unless overridden.',
}

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const name = key.split('.').at(-1) || key
      if (name === 'reset_aria') return `Reset settings for ${params?.name} (${params?.address})`
      if (name === 'catalog_loading') return `Loading models for ${params?.address}…`
      if (name === 'catalog_error') return `Could not load models for ${params?.address}: ${params?.error}`
      return translations[name] || name
    },
  }),
}))

const RuntimeModelConfigFieldsStub = defineComponent({
  name: 'RuntimeModelConfigFields',
  props: {
    runtimeKind: String,
    llmModelIdentifier: String,
    llmConfig: Object,
    disabled: Boolean,
    readOnly: Boolean,
    runtimeSelectionLocked: Boolean,
    runtimeHelpText: String,
    modelLabel: String,
    modelHelpText: String,
    idPrefix: String,
    advancedInitiallyExpanded: Boolean,
    controlVariant: String,
    historicalModelConfig: Boolean,
  },
  emits: ['update:runtimeKind', 'update:llmModelIdentifier', 'update:llmConfig'],
  template: '<div data-test="runtime-model-fields" />',
})

const WorkspaceSelectorStub = defineComponent({
  name: 'WorkspaceSelector',
  props: {
    model: Object,
    disabled: Boolean,
    autoSelectDefault: Boolean,
    controlVariant: String,
  },
  emits: ['update:modelValue'],
  template: '<div data-test="workspace-selector" />',
})

const inheritedConfig: ResolvedTeamRunLaunchConfig = {
  runtimeKind: 'codex_app_server',
  workspaceId: 'temp-workspace',
  workspaceMetadata: {
    workspaceId: 'temp-workspace',
    workspaceRootPath: '/tmp/autobyteus',
    displayName: 'Temp Workspace',
    kind: 'filesystem',
  },
  workspaceRootPath: '/tmp/autobyteus',
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: { reasoning_effort: 'high' },
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
}

const workspaceSelection: WorkspaceSelectionState = {
  mode: 'existing',
  existingWorkspaceId: 'temp-workspace',
  newWorkspacePath: '',
}

const mountEditor = (props: Record<string, unknown> = {}) => mount(TeamScopeConfigEditor, {
  props: {
    scope: {
      mode: 'editable',
      address: '/StudentStudyGroup',
      displayName: 'StudentStudyGroup',
      effectiveConfig: inheritedConfig,
      isCustomized: false,
      workspaceSelection,
      inheritedConfig,
      override: null,
      workspaceOperation: { status: 'idle', error: null },
      runtimeCatalogState: { status: 'idle', error: null },
    },
    ...props,
  },
  global: {
    stubs: {
      RuntimeModelConfigFields: RuntimeModelConfigFieldsStub,
      WorkspaceSelector: WorkspaceSelectorStub,
    },
  },
})

describe('TeamScopeConfigEditor presentation', () => {
  it('renders the root as the original quiet field sequence without hierarchy chrome', async () => {
    const wrapper = mountEditor({
      scope: {
        mode: 'editable',
        address: '/',
        displayName: 'Nested Classroom',
        effectiveConfig: inheritedConfig,
        isCustomized: false,
        workspaceSelection,
        inheritedConfig: null,
        override: null,
        workspaceOperation: { status: 'idle', error: null },
        runtimeCatalogState: { status: 'idle', error: null },
      },
      isRoot: true,
    })
    const root = wrapper.get('[data-test="root-team-config-fields"]')
    const runtime = wrapper.getComponent(RuntimeModelConfigFieldsStub)
    const workspace = wrapper.getComponent(WorkspaceSelectorStub)

    expect(wrapper.find('[data-test="team-scope-config-editor"]').exists()).toBe(false)
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Root Team defaults')
    expect(wrapper.text()).not.toContain('Effective')
    expect(wrapper.text()).not.toContain('Customized fields')
    expect(wrapper.text()).not.toContain('/')
    expect(runtime.props()).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.6-sol',
      llmConfig: { reasoning_effort: 'high' },
      runtimeHelpText: 'Selects the runtime backend used by this team run.',
      modelLabel: 'Default LLM Model (Global)',
      modelHelpText: 'This model will be used by all members unless overridden.',
      controlVariant: 'quiet',
    }))
    expect(workspace.props()).toEqual(expect.objectContaining({
      model: expect.objectContaining({ mode: 'editable', selection: workspaceSelection }),
      autoSelectDefault: true,
      controlVariant: 'quiet',
    }))
    expect(wrapper.get('[data-test="team-auto-approve-row"]').text()).toContain('Auto approve tools')
    expect(Array.from(root.element.querySelectorAll('[data-test]')).map((element) => element.getAttribute('data-test'))).toEqual([
      'runtime-model-fields',
      'workspace-selector',
      'team-auto-approve-row',
    ])

    runtime.vm.$emit('update:llmModelIdentifier', 'gpt-5.5')
    workspace.vm.$emit('update:modelValue', { ...workspaceSelection, existingWorkspaceId: 'next' })
    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('update-root')).toEqual([
      ['model', 'gpt-5.5'],
      ['auto', true],
    ])
    expect(wrapper.emitted('update:workspace-selection')).toEqual([
      ['/', { ...workspaceSelection, existingWorkspaceId: 'next' }],
    ])
  })

  it('keeps nested Team identity visible and its effective controls collapsed by default', async () => {
    const wrapper = mountEditor()
    const disclosure = wrapper.get('button[aria-controls="team-scope-StudentStudyGroup-panel"]')
    const panel = wrapper.get('#team-scope-StudentStudyGroup-panel')

    expect(disclosure.attributes('aria-expanded')).toBe('false')
    expect(disclosure.text()).toContain('StudentStudyGroup')
    expect(disclosure.text()).toContain('Team')
    expect(disclosure.text()).toContain('/StudentStudyGroup')
    expect(disclosure.text()).toContain('Inherited')
    expect(wrapper.find('[data-test="reset-team-scope"]').exists()).toBe(false)
    expect(panel.attributes('style')).toContain('display: none')
    expect(wrapper.find('[data-test="team-scope-effective-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="team-scope-explicit-fields"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Effective')
    expect(wrapper.text()).not.toContain('Customized fields')

    await disclosure.trigger('click')

    expect(disclosure.attributes('aria-expanded')).toBe('true')
    expect(panel.attributes('style')).toBeUndefined()
    expect(wrapper.getComponent(RuntimeModelConfigFieldsStub).props()).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.6-sol',
      llmConfig: { reasoning_effort: 'high' },
      modelLabel: 'Default LLM Model',
      runtimeHelpText: 'Runtime used by this Team scope.',
      controlVariant: 'quiet',
    }))
    expect(wrapper.getComponent(WorkspaceSelectorStub).props()).toEqual(expect.objectContaining({
      model: expect.objectContaining({ mode: 'editable', selection: workspaceSelection }),
      autoSelectDefault: false,
      controlVariant: 'quiet',
    }))
  })

  it('shows actionable customized/reset state and keeps the disclosure open after reset', async () => {
    const override: TeamScopeConfigOverride = { autoExecuteTools: true }
    const wrapper = mountEditor({
      scope: {
        mode: 'editable',
        address: '/StudentStudyGroup',
        displayName: 'StudentStudyGroup',
        effectiveConfig: { ...inheritedConfig, autoExecuteTools: true },
        isCustomized: true,
        workspaceSelection,
        inheritedConfig,
        override,
        workspaceOperation: { status: 'idle', error: null },
        runtimeCatalogState: { status: 'idle', error: null },
      },
    })
    const disclosure = wrapper.get('button[aria-controls="team-scope-StudentStudyGroup-panel"]')
    const reset = wrapper.get('[data-test="reset-team-scope"]')

    expect(disclosure.text()).toContain('Customized')
    expect(reset.text()).toBe('Reset')
    expect(reset.attributes('aria-label')).toBe('Reset settings for StudentStudyGroup (/StudentStudyGroup)')

    await disclosure.trigger('click')
    await reset.trigger('click')
    expect(wrapper.emitted('reset')).toEqual([[]])

    await wrapper.setProps({
      scope: {
        ...wrapper.props('scope'),
        effectiveConfig: inheritedConfig,
        override: null,
        isCustomized: false,
      },
    })
    expect(disclosure.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-test="reset-team-scope"]').exists()).toBe(false)
    expect(disclosure.text()).toContain('Inherited')
  })

  it('preserves exact-address edits and scoped catalog error recovery', async () => {
    const wrapper = mountEditor({
      scope: {
        mode: 'editable',
        address: '/StudentStudyGroup',
        displayName: 'StudentStudyGroup',
        effectiveConfig: inheritedConfig,
        isCustomized: false,
        workspaceSelection,
        inheritedConfig,
        override: null,
        runtimeCatalogState: { status: 'error', error: 'catalog offline' },
        workspaceOperation: { status: 'error', error: 'workspace registration failed' },
      },
    })
    const alert = wrapper.get('[data-test="team-runtime-catalog-error"]')

    expect(alert.isVisible()).toBe(true)
    expect(alert.text()).toContain('/StudentStudyGroup')
    expect(alert.text()).toContain('catalog offline')
    await alert.get('button').trigger('click')
    expect(wrapper.emitted('retry-runtime-catalog')).toEqual([['codex_app_server']])

    const runtime = wrapper.getComponent(RuntimeModelConfigFieldsStub)
    const workspace = wrapper.getComponent(WorkspaceSelectorStub)
    runtime.vm.$emit('update:runtimeKind', 'claude_agent_sdk')
    workspace.vm.$emit('update:modelValue', {
      mode: 'new',
      existingWorkspaceId: 'temp-workspace',
      newWorkspacePath: '/tmp/study',
    })

    expect(wrapper.emitted('update-override')).toEqual([
      [{ runtimeKind: 'claude_agent_sdk' }],
    ])
    expect(wrapper.emitted('update:workspace-selection')).toEqual([
      ['/StudentStudyGroup', {
        mode: 'new',
        existingWorkspaceId: 'temp-workspace',
        newWorkspacePath: '/tmp/study',
      }],
    ])
    expect(workspace.props()).toEqual(expect.objectContaining({
      model: expect.objectContaining({ error: 'workspace registration failed', isLoading: false }),
    }))

    await wrapper.setProps({
      scope: {
        ...wrapper.props('scope'),
        runtimeCatalogState: { status: 'loading', error: null },
        workspaceOperation: { status: 'loading', error: null },
      },
    })
    expect(wrapper.get('[data-test="team-runtime-catalog-loading"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-test="team-runtime-catalog-loading"]').text()).toContain('/StudentStudyGroup')
    expect(workspace.props('model')).toEqual(expect.objectContaining({ isLoading: true }))
  })

  it('keeps disclosure access while disabling nested edits and omitting stored Reset', async () => {
    const wrapper = mountEditor({
      disabled: true,
      scope: {
        mode: 'stored',
        address: '/StudentStudyGroup',
        displayName: 'StudentStudyGroup',
        effectiveConfig: { ...inheritedConfig, autoExecuteTools: true },
        isCustomized: true,
        storedWorkspace: {
          workspaceId: 'temp-workspace',
          displayName: 'Temp Workspace',
          rootPath: '/tmp/autobyteus',
          availability: 'available',
        },
      },
    })
    const disclosure = wrapper.get('button[aria-controls="team-scope-StudentStudyGroup-panel"]')

    expect(disclosure.attributes('disabled')).toBeUndefined()
    await disclosure.trigger('click')
    expect(disclosure.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-test="reset-team-scope"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="team-runtime-catalog-error"]').exists()).toBe(false)
    expect(wrapper.getComponent(RuntimeModelConfigFieldsStub).props()).toEqual(expect.objectContaining({
      disabled: true,
      readOnly: true,
      runtimeSelectionLocked: true,
    }))
    expect(wrapper.getComponent(WorkspaceSelectorStub).props('disabled')).toBe(true)
    expect(wrapper.getComponent(WorkspaceSelectorStub).props('model')).toEqual(expect.objectContaining({ mode: 'stored' }))
    expect(wrapper.get('[role="switch"]').attributes('disabled')).toBeDefined()
  })
})
