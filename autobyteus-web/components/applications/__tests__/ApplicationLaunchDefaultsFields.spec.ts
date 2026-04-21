import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationLaunchDefaultsFields from '../ApplicationLaunchDefaultsFields.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLabel': 'Tool execution',
        'applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionDescription': 'Auto execute tools is always on.',
        'applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLockedOn': 'Locked on',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel': 'Default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime': 'Use application default runtime',
        'applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp': 'Runtime help',
        'applications.components.applications.ApplicationLaunchSetupPanel.selectResourceFirst': 'Select resource first',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelLabel': 'Default model',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelHelp': 'Model help',
        'applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder': 'Select model',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel': 'Workspace root',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathPlaceholder': '/workspace',
        'applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp': 'Workspace help',
        'applications.components.applications.ApplicationLaunchSetupPanel.noAdditionalDefaults': 'No additional defaults',
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('~/components/agentTeams/SearchableGroupedSelect.vue', () => ({
  default: {
    name: 'SearchableGroupedSelect',
    template: '<div class="searchable-select-stub"></div>',
    props: ['modelValue', 'disabled', 'options', 'placeholder', 'searchPlaceholder'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn(),
}))

vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: vi.fn(),
}))

describe('ApplicationLaunchDefaultsFields', () => {
  let llmStore: any
  let runtimeAvailabilityStore: any

  const slotBase = {
    slotKey: 'draftingTeam',
    name: 'Drafting team',
    allowedResourceKinds: ['AGENT_TEAM'],
  }

  beforeEach(() => {
    llmStore = {
      providersWithModels: [
        {
          provider: {
            id: 'OPENAI',
            name: 'OpenAI',
            providerType: 'OPENAI',
            isCustom: false,
            baseUrl: null,
            apiKeyConfigured: true,
            status: 'NOT_APPLICABLE',
            statusMessage: null,
          },
          models: [
            {
              modelIdentifier: 'gpt-4',
              name: 'GPT-4',
              value: 'gpt-4',
              canonicalName: 'gpt-4',
              providerId: 'OPENAI',
              providerName: 'OpenAI',
              providerType: 'OPENAI',
              runtime: 'api',
            },
          ],
        },
      ],
      providersWithModelsForSelection: [],
      get models() {
        return llmStore.providersWithModels.flatMap((provider: any) =>
          provider.models.map((model: any) => model.modelIdentifier),
        )
      },
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
    }
    llmStore.providersWithModelsForSelection = llmStore.providersWithModels

    runtimeAvailabilityStore = {
      hasFetched: true,
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
      ],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilities.find((availability: any) => availability.runtimeKind === runtimeKind) ?? null,
      ),
      isRuntimeEnabled: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilityByKind(runtimeKind)?.enabled ?? runtimeKind === 'autobyteus',
      ),
      runtimeReason: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilityByKind(runtimeKind)?.reason ?? null,
      ),
    }

    ;(useLLMProviderConfigStore as any).mockReturnValue(llmStore)
    ;(useRuntimeAvailabilityStore as any).mockReturnValue(runtimeAvailabilityStore)
  })

  it('renders all supported launch-default fields and loads models for the effective runtime', async () => {
    const wrapper = mount(ApplicationLaunchDefaultsFields, {
      props: {
        slot: {
          ...slotBase,
          supportedLaunchDefaults: {
            runtimeKind: true,
            llmModelIdentifier: true,
            workspaceRootPath: true,
          },
        },
        draft: {
          selection: 'bundle:AGENT_TEAM:brief-studio-team',
          runtimeKind: '',
          llmModelIdentifier: 'gpt-4',
          workspaceRootPath: '/workspace/brief-studio',
        },
        hasEffectiveResource: true,
      },
    })

    expect(wrapper.find('select#application-slot-draftingTeam-runtime-kind').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-checked="true"][disabled]').exists()).toBe(true)
    expect(runtimeAvailabilityStore.fetchRuntimeAvailabilities).toHaveBeenCalledTimes(1)
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('autobyteus')

    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')
    expect(options[0].label).toBe('OpenAI')
    expect(options[0].items[0].selectedLabel).toBe('OpenAI / gpt-4')
  })

  it('keeps field-presence policy app-owned for model-only slots', () => {
    const wrapper = mount(ApplicationLaunchDefaultsFields, {
      props: {
        slot: {
          ...slotBase,
          supportedLaunchDefaults: {
            llmModelIdentifier: true,
          },
        },
        draft: {
          selection: 'bundle:AGENT_TEAM:brief-studio-team',
          runtimeKind: '',
          llmModelIdentifier: '',
          workspaceRootPath: '',
        },
        hasEffectiveResource: true,
      },
    })

    expect(wrapper.find('select#application-slot-draftingTeam-runtime-kind').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('skips runtime/model store activity for workspace-only slots', () => {
    const wrapper = mount(ApplicationLaunchDefaultsFields, {
      props: {
        slot: {
          ...slotBase,
          supportedLaunchDefaults: {
            workspaceRootPath: true,
          },
        },
        draft: {
          selection: 'bundle:AGENT_TEAM:brief-studio-team',
          runtimeKind: '',
          llmModelIdentifier: '',
          workspaceRootPath: '/workspace/brief-studio',
        },
        hasEffectiveResource: true,
      },
    })

    expect(wrapper.find('select#application-slot-draftingTeam-runtime-kind').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).exists()).toBe(false)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(runtimeAvailabilityStore.fetchRuntimeAvailabilities).not.toHaveBeenCalled()
    expect(llmStore.fetchProvidersWithModels).not.toHaveBeenCalled()
  })

  it('shows the no-additional-defaults state without runtime/model store activity when the slot declares none', () => {
    const wrapper = mount(ApplicationLaunchDefaultsFields, {
      props: {
        slot: {
          ...slotBase,
          supportedLaunchDefaults: null,
        },
        draft: {
          selection: 'bundle:AGENT_TEAM:brief-studio-team',
          runtimeKind: '',
          llmModelIdentifier: '',
          workspaceRootPath: '',
        },
        hasEffectiveResource: true,
      },
    })

    expect(wrapper.find('select#application-slot-draftingTeam-runtime-kind').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).exists()).toBe(false)
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('No additional defaults')
    expect(runtimeAvailabilityStore.fetchRuntimeAvailabilities).not.toHaveBeenCalled()
    expect(llmStore.fetchProvidersWithModels).not.toHaveBeenCalled()
  })
})
