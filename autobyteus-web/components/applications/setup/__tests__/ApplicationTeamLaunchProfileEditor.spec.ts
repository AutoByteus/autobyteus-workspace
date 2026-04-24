import { computed, defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApplicationTeamLaunchProfileEditor from '../ApplicationTeamLaunchProfileEditor.vue'

const { teamDefinitionStoreMock, loadRuntimeProviderGroupsForSelectionMock } = vi.hoisted(() => ({
  teamDefinitionStoreMock: {
    fetchAllAgentTeamDefinitions: vi.fn(),
    getAgentTeamDefinitionById: vi.fn(),
  },
  loadRuntimeProviderGroupsForSelectionMock: vi.fn(async () => ([
    {
      provider: { name: 'OpenAI' },
      models: [{ modelIdentifier: 'gpt-5' }],
    },
  ])),
}))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel': 'Default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime': 'Use application default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp': 'Runtime help',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelLabel': 'Default model',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder': 'Select model',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelHelp': 'Model help',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel': 'Workspace root',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp': 'Workspace help',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.loadingMembers': 'Loading current team members for this resource…',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHeading': 'Team member overrides',
        'applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHelp': 'Override help',
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
    template: '<div class="searchable-grouped-select-stub"></div>',
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
    props: ['member', 'globalRuntimeKind', 'globalLlmModelIdentifier', 'allowRuntimeOverride', 'allowModelOverride', 'disabled'],
    emits: ['update:member'],
    template: '<div class="team-member-override-item-stub"></div>',
  }),
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => teamDefinitionStoreMock,
}))

vi.mock('~/composables/useRuntimeScopedModelSelection', () => ({
  loadRuntimeProviderGroupsForSelection: loadRuntimeProviderGroupsForSelectionMock,
  normalizeScopedRuntimeKind: (runtimeKind: string | null | undefined, allowBlankRuntime = false) => {
    const normalized = (runtimeKind || '').trim()
    return normalized || (allowBlankRuntime ? '' : 'autobyteus')
  },
  useRuntimeScopedModelSelection: ({ runtimeKind }: { runtimeKind: { value: string | null | undefined } }) => ({
    availableProviderGroups: computed(() => (
      runtimeKind.value ? [{ provider: { name: 'OpenAI' }, models: [{ modelIdentifier: 'gpt-5' }] }] : []
    )),
    groupedModelOptions: computed(() => []),
    normalizedStoredRuntimeKind: computed(() => runtimeKind.value || ''),
    runtimeOptions: computed(() => ([
      { value: 'autobyteus', label: 'AutoByteus', enabled: true },
      { value: 'lmstudio', label: 'LM Studio', enabled: true },
      { value: 'claude_agent_sdk', label: 'Claude Agent SDK', enabled: true },
    ])),
  }),
}))

const buildSlot = () => ({
  slotKey: 'draftingTeam',
  name: 'Drafting Team',
  allowedResourceKinds: ['AGENT_TEAM'],
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
      },
    },
  },
})

const buildSelectedResource = () => ({
  owner: 'bundle' as const,
  kind: 'AGENT_TEAM' as const,
  localId: 'brief-studio-team',
  definitionId: 'team-1',
  name: 'Bundled Brief Team',
  applicationId: 'app-1',
})

describe('ApplicationTeamLaunchProfileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    teamDefinitionStoreMock.fetchAllAgentTeamDefinitions.mockResolvedValue(undefined)
    teamDefinitionStoreMock.getAgentTeamDefinitionById.mockImplementation((id: string) => {
      if (id !== 'team-1') {
        return null
      }
      return {
        id: 'team-1',
        name: 'Drafting Team',
        coordinatorMemberName: 'researcher',
        nodes: [
          { memberName: 'researcher', refType: 'AGENT', ref: 'bundle-agent__researcher' },
          { memberName: 'writer', refType: 'AGENT', ref: 'bundle-agent__writer-new' },
        ],
      }
    })
  })

  it('repairs stale saved member overrides by exact route/id match and drops stale carry-forward overrides', async () => {
    const wrapper = mount(ApplicationTeamLaunchProfileEditor, {
      props: {
        slot: buildSlot(),
        selectedResource: buildSelectedResource(),
        draft: {
          kind: 'AGENT_TEAM',
          defaults: {
            runtimeKind: 'autobyteus',
            llmModelIdentifier: 'gpt-5',
            workspaceRootPath: '/tmp/workspace',
          },
          memberProfiles: [
            {
              memberRouteKey: 'researcher',
              memberName: 'researcher',
              agentDefinitionId: 'bundle-agent__researcher',
              runtimeKind: 'claude_agent_sdk',
              llmModelIdentifier: 'claude-sonnet',
            },
            {
              memberRouteKey: 'writer',
              memberName: 'writer',
              agentDefinitionId: 'bundle-agent__writer-old',
              runtimeKind: 'lmstudio',
              llmModelIdentifier: 'old-writer-model',
            },
            {
              memberRouteKey: 'editor',
              memberName: 'editor',
              agentDefinitionId: 'bundle-agent__editor',
              runtimeKind: 'lmstudio',
              llmModelIdentifier: 'editor-model',
            },
          ],
        },
      },
    })

    await flushPromises()

    const repairedDraftEvent = (wrapper.emitted('update:draft') ?? [])
      .map(([payload]) => payload)
      .find((payload) => payload.memberProfiles?.length === 2 && payload.memberProfiles[1]?.agentDefinitionId === 'bundle-agent__writer-new')

    expect(repairedDraftEvent).toEqual({
      kind: 'AGENT_TEAM',
      defaults: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5',
        workspaceRootPath: '/tmp/workspace',
      },
      memberProfiles: [
        {
          memberRouteKey: 'researcher',
          memberName: 'researcher',
          agentDefinitionId: 'bundle-agent__researcher',
          runtimeKind: 'claude_agent_sdk',
          llmModelIdentifier: 'claude-sonnet',
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
    expect(teamDefinitionStoreMock.fetchAllAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(loadRuntimeProviderGroupsForSelectionMock).toHaveBeenCalled()
  })
})
