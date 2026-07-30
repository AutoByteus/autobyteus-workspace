import { computed, defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApplicationTeamLaunchProfileEditor from '../ApplicationTeamLaunchProfileEditor.vue'

const { loadRuntimeProviderGroupsForSelectionMock } = vi.hoisted(() => ({
  loadRuntimeProviderGroupsForSelectionMock: vi.fn(async (runtimeKind: string) => ([
    {
      provider: { name: runtimeKind },
      models: [{
        modelIdentifier: runtimeKind === 'claude_agent_sdk'
          ? 'claude-sonnet'
          : 'gpt-5.6-luna',
      }],
    },
  ])),
}))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel': 'Default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime': 'Use application default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.mixedInheritedRuntime': 'Mixed inherited runtimes',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp': 'Runtime help',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelLabel': 'Default model',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder': 'Select model',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelHelp': 'Model help',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel': 'Workspace root',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp': 'Workspace help',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.loadingMembers': 'Loading current team members for this resource…',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHeading': 'Team member overrides',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHelp': 'Override help',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.staleOverrideLocked': 'Saved topology is stale.',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.replaceStaleTopology': 'Replace with current topology',
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/components/agentTeams/SearchableGroupedSelect.vue', () => ({
  default: defineComponent({
    name: 'SearchableGroupedSelect',
    props: ['modelValue', 'options', 'disabled', 'placeholder', 'searchPlaceholder'],
    emits: ['update:modelValue'],
    template: '<div data-testid="model-select-stub"></div>',
  }),
}))

vi.mock('~/components/applications/setup/ApplicationWorkspaceRootSelector.vue', () => ({
  default: defineComponent({
    name: 'ApplicationWorkspaceRootSelector',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div class="workspace-root-selector-stub"></div>',
  }),
}))

vi.mock('~/components/applications/setup/ApplicationTeamMemberOverrideItem.vue', () => ({
  default: defineComponent({
    name: 'ApplicationTeamMemberOverrideItem',
    props: [
      'member',
      'globalRuntimeKind',
      'globalLlmModelIdentifier',
      'inheritedRuntimeKind',
      'inheritedLlmModelIdentifier',
      'allowRuntimeOverride',
      'allowModelOverride',
      'disabled',
    ],
    emits: ['update:member'],
    template: '<div class="team-member-override-item-stub"></div>',
  }),
}))

vi.mock('~/composables/useRuntimeScopedModelSelection', () => ({
  loadRuntimeProviderGroupsForSelection: loadRuntimeProviderGroupsForSelectionMock,
  useRuntimeScopedModelSelection: ({
    runtimeKind,
    inheritedRuntimeKind,
  }: {
    runtimeKind: { value: string | null | undefined }
    inheritedRuntimeKind: { value: string | null | undefined }
  }) => ({
    availableProviderGroups: computed(() => (
      runtimeKind.value || inheritedRuntimeKind.value
        ? [{ provider: { name: 'provider' }, models: [{ modelIdentifier: 'model' }] }]
        : []
    )),
    groupedModelOptions: computed(() => []),
    normalizedStoredRuntimeKind: computed(() => runtimeKind.value || ''),
    runtimeOptions: computed(() => ([
      { value: 'autobyteus', label: 'AutoByteus', enabled: true },
      { value: 'codex_app_server', label: 'Codex app server', enabled: true },
      { value: 'claude_agent_sdk', label: 'Claude Agent SDK', enabled: true },
    ])),
  }),
}))

const slot = {
  slotKey: 'draftingTeam',
  name: 'Drafting Team',
  allowedExecutionResourceKinds: ['AGENT_TEAM'],
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      llmConfig: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
        llmConfig: true,
      },
    },
  },
}

const inheritedProfiles = [
  {
    memberRouteKey: 'researcher',
    memberName: 'researcher',
    agentDefinitionId: 'bundle-agent__researcher',
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: null,
    provenance: {
      runtimeKind: { kind: 'SELECTED_RESOURCE_AGENT_DEFAULT', agentDefinitionId: 'bundle-agent__researcher' },
      llmModelIdentifier: { kind: 'SELECTED_RESOURCE_AGENT_DEFAULT', agentDefinitionId: 'bundle-agent__researcher' },
      llmConfig: null,
    },
  },
  {
    memberRouteKey: 'writer',
    memberName: 'writer',
    agentDefinitionId: 'bundle-agent__writer-new',
    runtimeKind: 'claude_agent_sdk',
    llmModelIdentifier: 'claude-sonnet',
    llmConfig: null,
    provenance: {
      runtimeKind: { kind: 'SELECTED_RESOURCE_AGENT_DEFAULT', agentDefinitionId: 'bundle-agent__writer-new' },
      llmModelIdentifier: { kind: 'SELECTED_RESOURCE_AGENT_DEFAULT', agentDefinitionId: 'bundle-agent__writer-new' },
      llmConfig: null,
    },
  },
] as const

describe('ApplicationTeamLaunchProfileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps a blank team-wide runtime as per-member inheritance for a mixed-runtime team', async () => {
    const wrapper = mount(ApplicationTeamLaunchProfileEditor, {
      props: {
        slot,
        inheritedProfiles,
        draft: {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: '',
            llmModelIdentifier: '',
            workspaceRootPath: '',
          },
          memberProfiles: inheritedProfiles.map((profile) => ({
            memberRouteKey: profile.memberRouteKey,
            memberName: profile.memberName,
            agentDefinitionId: profile.agentDefinitionId,
            runtimeKind: '',
            llmModelIdentifier: '',
          })),
        },
      },
    })
    await flushPromises()

    const runtimeSelect = wrapper.get('select')
    expect(runtimeSelect.element.value).toBe('')
    expect(runtimeSelect.text()).toContain('Mixed inherited runtime')
    expect(wrapper.getComponent({ name: 'SearchableGroupedSelect' }).props()).toMatchObject({
      disabled: true,
      placeholder: 'Mixed inherited runtime',
    })
    const memberEditors = wrapper.findAllComponents({ name: 'ApplicationTeamMemberOverrideItem' })
    expect(memberEditors.map((editor) => ({
      inheritedRuntimeKind: editor.props('inheritedRuntimeKind'),
      inheritedLlmModelIdentifier: editor.props('inheritedLlmModelIdentifier'),
    }))).toEqual([
      {
        inheritedRuntimeKind: 'codex_app_server',
        inheritedLlmModelIdentifier: 'gpt-5.6-luna',
      },
      {
        inheritedRuntimeKind: 'claude_agent_sdk',
        inheritedLlmModelIdentifier: 'claude-sonnet',
      },
    ])
    expect(loadRuntimeProviderGroupsForSelectionMock).toHaveBeenCalledWith('codex_app_server')
    expect(loadRuntimeProviderGroupsForSelectionMock).toHaveBeenCalledWith('claude_agent_sdk')
    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toEqual({
      isReady: true,
      blockingReason: null,
      hasEffectiveResource: true,
    })
  })

  it('preserves stale topology until explicit replacement, then carries only exact member identity matches', async () => {
    const wrapper = mount(ApplicationTeamLaunchProfileEditor, {
      props: {
        slot,
        inheritedProfiles,
        preserveInvalidSavedOverride: true,
        draft: {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: '',
            llmModelIdentifier: '',
            workspaceRootPath: '/tmp/workspace',
          },
          memberProfiles: [
            {
              memberRouteKey: 'researcher',
              memberName: 'researcher',
              agentDefinitionId: 'bundle-agent__researcher',
              runtimeKind: 'codex_app_server',
              llmModelIdentifier: 'gpt-5.6-luna',
            },
            {
              memberRouteKey: 'writer',
              memberName: 'writer',
              agentDefinitionId: 'bundle-agent__writer-old',
              runtimeKind: 'autobyteus',
              llmModelIdentifier: 'old-writer-model',
            },
          ],
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="application-stale-team-override-lock"]').exists()).toBe(true)
    expect(wrapper.emitted('update:draft')).toBeUndefined()
    expect(wrapper.emitted('readiness-change')?.at(-1)?.[0]).toEqual({
      isReady: false,
      blockingReason: 'Saved topology is stale.',
      hasEffectiveResource: true,
    })

    await wrapper.get('[data-testid="application-replace-stale-team-topology"]').trigger('click')

    expect(wrapper.emitted('update:draft')?.at(-1)?.[0]).toEqual({
      kind: 'AGENT_TEAM',
      defaults: {
        runtimeKind: '',
        llmModelIdentifier: '',
        workspaceRootPath: '/tmp/workspace',
      },
      memberProfiles: [
        {
          memberRouteKey: 'researcher',
          memberName: 'researcher',
          agentDefinitionId: 'bundle-agent__researcher',
          runtimeKind: 'codex_app_server',
          llmModelIdentifier: 'gpt-5.6-luna',
        },
        {
          memberRouteKey: 'writer',
          memberName: 'writer',
          agentDefinitionId: 'bundle-agent__writer-new',
          runtimeKind: '',
          llmModelIdentifier: '',
        },
      ],
    })
  })
})
