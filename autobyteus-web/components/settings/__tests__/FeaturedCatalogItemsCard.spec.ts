import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import FeaturedCatalogItemsCard from '../FeaturedCatalogItemsCard.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useServerSettingsStore } from '~/stores/serverSettings'
import {
  FEATURED_CATALOG_ITEMS_SETTING_KEY,
  serializeFeaturedCatalogItemsSetting,
} from '~/utils/catalog/featuredCatalogItems'

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'settings.components.settings.FeaturedCatalogItemsCard.duplicateError': 'Duplicate featured catalog entries are not allowed.',
        'settings.components.settings.FeaturedCatalogItemsCard.emptyDefinitionError': 'Select a definition for every featured row.',
        'settings.components.settings.FeaturedCatalogItemsCard.unresolvedDefinition': `Unresolved: ${String(params?.id ?? '')}`,
      }
      return messages[key] ?? key
    },
  }),
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async (options?: {
  initialValue?: string | null
  agents?: Array<{ id: string; name: string }>
  teams?: Array<{ id: string; name: string }>
}) => {
  const settings = options?.initialValue === undefined || options.initialValue === null
    ? []
    : [{
        key: FEATURED_CATALOG_ITEMS_SETTING_KEY,
        value: options.initialValue,
        description: 'Featured catalog items',
        isEditable: true,
        isDeletable: false,
      }]

  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      serverSettings: {
        settings,
        isUpdating: false,
      },
      agentDefinition: {
        agentDefinitions: (options?.agents ?? [
          { id: 'agent-a', name: 'Agent A' },
          { id: 'agent-b', name: 'Agent B' },
        ]),
      },
      agentTeamDefinition: {
        agentTeamDefinitions: (options?.teams ?? [
          { id: 'team-a', name: 'Team A' },
        ]),
      },
    },
  })
  setActivePinia(pinia)

  const settingsStore = useServerSettingsStore()
  const agentStore = useAgentDefinitionStore()
  const teamStore = useAgentTeamDefinitionStore()

  ;(settingsStore.fetchServerSettings as any).mockResolvedValue(settings)
  ;(settingsStore.updateServerSetting as any).mockImplementation(async (key: string, value: string) => {
    settingsStore.settings = [{
      key,
      value,
      description: 'Featured catalog items',
      isEditable: true,
      isDeletable: false,
    }]
    return true
  })
  ;(agentStore.fetchAllAgentDefinitions as any).mockResolvedValue(undefined)
  ;(teamStore.fetchAllAgentTeamDefinitions as any).mockResolvedValue(undefined)

  const wrapper = mount(FeaturedCatalogItemsCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: { template: '<span />' },
      },
    },
  })

  await flushPromises()
  await wrapper.vm.$nextTick()
  return { wrapper, settingsStore }
}

describe('FeaturedCatalogItemsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds agent and team rows, reorders them, and saves deterministic sort order', async () => {
    const { wrapper, settingsStore } = await mountComponent()

    await wrapper.get('[data-testid="featured-catalog-add-agent"]').trigger('click')
    await wrapper.get('[data-testid="featured-catalog-add-team"]').trigger('click')
    await wrapper.vm.$nextTick()

    const firstRowButtons = wrapper.get('[data-testid="featured-catalog-row-0"]').findAll('button')
    await firstRowButtons[1].trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.get('[data-testid="featured-catalog-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledWith(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      serializeFeaturedCatalogItemsSetting([
        { resourceKind: 'AGENT_TEAM', definitionId: 'team-a', sortOrder: 10 },
        { resourceKind: 'AGENT', definitionId: 'agent-a', sortOrder: 20 },
      ]),
    )
  })

  it('blocks saving duplicate rows before they reach the server', async () => {
    const { wrapper, settingsStore } = await mountComponent({
      agents: [{ id: 'agent-a', name: 'Agent A' }],
    })

    await wrapper.get('[data-testid="featured-catalog-add-agent"]').trigger('click')
    await wrapper.get('[data-testid="featured-catalog-add-agent"]').trigger('click')
    await wrapper.vm.$nextTick()

    const selects = wrapper.findAll('select')
    await selects[3].setValue('agent-a')
    await wrapper.vm.$nextTick()

    const saveButton = wrapper.get('[data-testid="featured-catalog-save"]')
    expect(saveButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Duplicate featured catalog entries are not allowed.')

    await saveButton.trigger('click')
    expect(settingsStore.updateServerSetting).not.toHaveBeenCalled()
  })

  it('keeps unresolved configured ids visible so operators can remove them', async () => {
    const initialValue = serializeFeaturedCatalogItemsSetting([
      { resourceKind: 'AGENT', definitionId: 'missing-agent', sortOrder: 10 },
    ])
    const { wrapper, settingsStore } = await mountComponent({
      initialValue,
      agents: [],
    })

    expect(wrapper.text()).toContain('Unresolved: missing-agent')

    const firstRowButtons = wrapper.get('[data-testid="featured-catalog-row-0"]').findAll('button')
    await firstRowButtons[2].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="featured-catalog-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledWith(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      serializeFeaturedCatalogItemsSetting([]),
    )
  })
})
