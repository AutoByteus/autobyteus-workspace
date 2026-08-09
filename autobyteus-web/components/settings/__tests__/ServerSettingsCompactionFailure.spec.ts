import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ServerSettingsManager from '../ServerSettingsManager.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkingContextCompactionStrategyCatalogStore } from '~/stores/workingContextCompactionStrategyCatalog'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

const RATIO_KEY = 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO'
const OVERRIDE_KEY = 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE'
const LOGS_KEY = 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS'

const flushPromises = async (): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const settingsAt = (ratio: string, override: string, logs: string): ServerSetting[] => [
  {
    key: RATIO_KEY,
    value: ratio,
    description: 'ratio',
    isEditable: true,
    isDeletable: false,
  },
  {
    key: OVERRIDE_KEY,
    value: override,
    description: 'override',
    isEditable: true,
    isDeletable: false,
  },
  {
    key: LOGS_KEY,
    value: logs,
    description: 'logs',
    isEditable: true,
    isDeletable: false,
  },
]

const settingsResponse = (ratio: string, override: string, logs: string) => ({
  data: {
    getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
    getEffectiveStreamingContentFlushIntervalMs: 500,
    getServerSettings: settingsAt(ratio, override, logs),
  },
})

describe('Server settings Compaction failure journey', () => {
  let pinia: ReturnType<typeof createPinia>

  const mountManager = () => mount(ServerSettingsManager, {
    props: { sectionMode: 'quick' },
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
        ServerSettingsEndpointCards: true,
        ApplicationsFeatureToggleCard: true,
        SkillImprovementFeatureToggleCard: true,
        MediaDefaultModelsCard: true,
        CodexFullAccessCard: true,
        LiveResponseStreamingCard: true,
        FeaturedCatalogItemsCard: true,
        WebSearchConfigurationCard: true,
      },
    },
  })

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    const windowNodeContextStore = useWindowNodeContextStore()
    vi.spyOn(windowNodeContextStore, 'waitForBoundBackendReady').mockResolvedValue(true)

    const settingsStore = useServerSettingsStore()
    settingsStore.settings = settingsAt('0.75', '4096', 'true')
    settingsStore.settingsBindingRevision = 0
    settingsStore.effectiveWorkingContextCompactionStrategyId = 'structured-json'

    const catalogStore = useWorkingContextCompactionStrategyCatalogStore()
    catalogStore.strategies = [
      { id: 'structured-json', name: 'Structured JSON' },
      { id: 'future-test', name: 'Future Test' },
    ]
    catalogStore.bindingRevision = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the loaded card mounted after a later mutation failure and retries only failed or unsent changes', async () => {
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({
        data: { updateServerSetting: `Server setting '${RATIO_KEY}' has been updated successfully.` },
      })
      .mockResolvedValueOnce({
        data: { updateServerSetting: 'forced override rejection' },
      })
      .mockResolvedValueOnce({
        data: { updateServerSetting: `Server setting '${OVERRIDE_KEY}' has been updated successfully.` },
      })
      .mockResolvedValueOnce({
        data: { updateServerSetting: `Server setting '${LOGS_KEY}' has been updated successfully.` },
      })
    const query = vi
      .fn()
      .mockResolvedValueOnce(settingsResponse('0.6', '4096', 'true'))
      .mockResolvedValueOnce(settingsResponse('0.6', '8192', 'true'))
      .mockResolvedValueOnce(settingsResponse('0.6', '8192', 'false'))
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountManager()
    await flushPromises()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-context-override-input"]').setValue('8192')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    const settingsStore = useServerSettingsStore()
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      variables: { key: RATIO_KEY, value: '0.6' },
    }))
    expect(mutate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      variables: { key: OVERRIDE_KEY, value: '8192' },
    }))
    expect(settingsStore.getSettingByKey(RATIO_KEY)?.value).toBe('0.6')
    expect(settingsStore.error).toBe('forced override rejection')
    expect(wrapper.find('[data-testid="server-settings-initial-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="compaction-config-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="compaction-status-message"]').text()).toContain('forced override rejection')
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('60')
    expect((wrapper.get('[data-testid="compaction-context-override-input"]').element as HTMLInputElement).value).toBe('8192')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(mutate).toHaveBeenCalledTimes(4)
    expect(mutate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      variables: { key: OVERRIDE_KEY, value: '8192' },
    }))
    expect(mutate).toHaveBeenNthCalledWith(4, expect.objectContaining({
      variables: { key: LOGS_KEY, value: 'false' },
    }))
    expect(query).toHaveBeenCalledTimes(3)
    expect(wrapper.find('[data-testid="compaction-config-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="compaction-status-message"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
  })

  it('recovers an initial settings/effective read and then mounts the real Compaction card', async () => {
    const settingsStore = useServerSettingsStore()
    settingsStore.$reset()
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('initial settings unavailable'))
      .mockResolvedValueOnce(settingsResponse('0.75', '4096', 'true'))
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountManager()
    await flushPromises()

    expect(wrapper.get('[data-testid="server-settings-initial-error"]').text()).toContain(
      'initial settings unavailable',
    )
    const retry = wrapper.get('[data-testid="server-settings-initial-retry"]')
    expect(retry.attributes('aria-label')).toBe('Retry')
    expect(wrapper.find('[data-testid="compaction-config-card"]').exists()).toBe(false)

    await retry.trigger('click')
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="server-settings-initial-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="compaction-config-card"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Failed to load server settings')
    expect((wrapper.get('[data-testid="compaction-strategy-select"]').element as HTMLSelectElement).value).toBe(
      'structured-json',
    )
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('75')
  })
})
