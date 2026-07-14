import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import CompactionConfigCard from '../CompactionConfigCard.vue'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { useWorkingContextCompactionStrategyCatalogStore } from '~/stores/workingContextCompactionStrategyCatalog'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const universalSettings = [
  {
    key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
    value: '0.75',
    description: 'ratio',
    isEditable: true,
    isDeletable: false,
  },
  {
    key: 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',
    value: '4096',
    description: 'override',
    isEditable: true,
    isDeletable: false,
  },
  {
    key: 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
    value: 'true',
    description: 'logs',
    isEditable: true,
    isDeletable: false,
  },
]

const applyAuthoritativeSetting = (
  settingsStore: ReturnType<typeof useServerSettingsStore>,
  key: string,
  value: string,
): void => {
  if (key === 'AUTOBYTEUS_COMPACTION_STRATEGY') {
    settingsStore.effectiveWorkingContextCompactionStrategyId = value
    return
  }
  settingsStore.settings = settingsStore.settings.map((setting) =>
    setting.key === key ? { ...setting, value } : setting,
  )
}

const mountComponent = async (options: {
  effectiveStrategyId?: string
  strategies?: Array<{ id: string; name: string }>
  catalogError?: string | null
} = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings: universalSettings,
        settingsBindingRevision: 0,
        effectiveWorkingContextCompactionStrategyId:
          options.effectiveStrategyId ?? 'structured-json',
      },
      workingContextCompactionStrategyCatalog: {
        strategies: options.strategies ?? [
          { id: 'structured-json', name: 'Structured JSON' },
          { id: 'future-test', name: 'Future Test' },
        ],
        bindingRevision: options.catalogError ? null : 0,
        error: options.catalogError ?? null,
      },
    },
  })
  setActivePinia(pinia)

  const settingsStore = useServerSettingsStore()
  settingsStore.updateServerSetting = vi.fn().mockImplementation(async (key: string, value: string) => {
    applyAuthoritativeSetting(settingsStore, key, value)
    return true
  })
  const catalogStore = useWorkingContextCompactionStrategyCatalogStore()
  if (options.catalogError) {
    catalogStore.fetchStrategies = vi.fn().mockRejectedValue(new Error(options.catalogError))
  }

  const wrapper = mount(CompactionConfigCard, {
    global: {
      plugins: [pinia],
      stubs: { Icon: true },
    },
  })
  await flushPromises()
  return { wrapper, settingsStore, catalogStore }
}

describe('CompactionConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the registry-backed strategy first and preserves universal controls', async () => {
    const { wrapper } = await mountComponent()

    const strategy = wrapper.get('[data-testid="compaction-strategy-select"]')
    expect((strategy.element as HTMLSelectElement).value).toBe('structured-json')
    expect(strategy.findAll('option').map((option) => option.text())).toEqual([
      'Structured JSON',
      'Future Test',
    ])
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('75')
    expect((wrapper.get('[data-testid="compaction-context-override-input"]').element as HTMLInputElement).value).toBe('4096')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('aria-label')).toBe(
      'Save compaction configuration',
    )
  })

  it('treats the server-effective default as clean and does not write strategy for an unrelated save', async () => {
    const { wrapper, settingsStore } = await mountComponent()
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledOnce()
    expect(settingsStore.updateServerSetting).toHaveBeenCalledWith(
      'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
      '0.6',
    )
  })

  it('persists catalog ids in deterministic strategy-first patch order', async () => {
    const { wrapper, settingsStore } = await mountComponent()

    await wrapper.get('[data-testid="compaction-strategy-select"]').setValue('future-test')
    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('65')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledTimes(3)
    expect(settingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      1,
      'AUTOBYTEUS_COMPACTION_STRATEGY',
      'future-test',
    )
    expect(settingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      2,
      'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
      '0.65',
    )
    expect(settingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      3,
      'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
      'false',
    )
  })

  it('shows an explicit unavailable state for an unknown configured id and allows deliberate recovery', async () => {
    const { wrapper, settingsStore } = await mountComponent({
      effectiveStrategyId: 'removed-strategy',
    })

    expect(wrapper.get('[data-testid="compaction-strategy-unknown"]').text()).toContain(
      'not available on this server',
    )
    expect((wrapper.get('[data-testid="compaction-strategy-select"]').element as HTMLSelectElement).value).toBe(
      'removed-strategy',
    )

    await wrapper.get('[data-testid="compaction-strategy-select"]').setValue('structured-json')
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledWith(
      'AUTOBYTEUS_COMPACTION_STRATEGY',
      'structured-json',
    )
  })

  it('keeps strategy disabled and offers retry when catalog authority fails', async () => {
    const { wrapper, catalogStore } = await mountComponent({
      catalogError: 'catalog offline',
      strategies: [],
    })

    expect(wrapper.get('[data-testid="compaction-strategy-select"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="compaction-strategy-error"]').text()).toContain(
      'Compaction strategies could not be loaded',
    )
    await wrapper.get('[data-testid="compaction-strategy-error"] button').trigger('click')
    expect(catalogStore.fetchStrategies).toHaveBeenCalled()
  })

  it('blocks invalid universal values with field-level feedback', async () => {
    const { wrapper } = await mountComponent()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('101')
    expect(wrapper.get('[data-testid="compaction-ratio-error"]').text()).toContain('1 to 100')
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('50')
    const overrideInput = wrapper.get('[data-testid="compaction-context-override-input"]')
    await overrideInput.setValue('-1')
    expect((overrideInput.element as HTMLInputElement).value).toBe('-1')
    expect(wrapper.get('[data-testid="compaction-override-error"]').text()).toContain('positive whole number')
  })

  it('shows authoritative clean values after every changed setting succeeds', async () => {
    const { wrapper, settingsStore } = await mountComponent()

    await wrapper.get('[data-testid="compaction-strategy-select"]').setValue('future-test')
    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('65')
    await wrapper.get('[data-testid="compaction-context-override-input"]').setValue('8192')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledTimes(4)
    expect((wrapper.get('[data-testid="compaction-strategy-select"]').element as HTMLSelectElement).value).toBe('future-test')
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('65')
    expect((wrapper.get('[data-testid="compaction-context-override-input"]').element as HTMLInputElement).value).toBe('8192')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="compaction-status-message"]').exists()).toBe(false)
  })

  it('stops on a first-key failure and keeps every draft value dirty', async () => {
    const { wrapper, settingsStore } = await mountComponent()
    settingsStore.updateServerSetting = vi.fn().mockRejectedValue(new Error('strategy rejected by server'))

    await wrapper.get('[data-testid="compaction-strategy-select"]').setValue('future-test')
    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledOnce()
    expect(settingsStore.updateServerSetting).toHaveBeenCalledWith(
      'AUTOBYTEUS_COMPACTION_STRATEGY',
      'future-test',
    )
    expect(wrapper.get('[data-testid="compaction-status-message"]').attributes('role')).toBe('alert')
    expect(wrapper.get('[data-testid="compaction-status-message"]').text()).toContain('strategy rejected by server')
    expect((wrapper.get('[data-testid="compaction-strategy-select"]').element as HTMLSelectElement).value).toBe('future-test')
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('60')
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps earlier same-node writes and retries only failed or unsent values after a later failure', async () => {
    const { wrapper, settingsStore } = await mountComponent()
    settingsStore.updateServerSetting = vi.fn().mockImplementation(async (key: string, value: string) => {
      if (key === 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO') {
        throw new Error('ratio rejected by server')
      }
      applyAuthoritativeSetting(settingsStore, key, value)
      return true
    })

    await wrapper.get('[data-testid="compaction-strategy-select"]').setValue('future-test')
    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledTimes(2)
    expect(settingsStore.effectiveWorkingContextCompactionStrategyId).toBe('future-test')
    expect(wrapper.get('[data-testid="compaction-status-message"]').text()).toContain('ratio rejected by server')
    expect(wrapper.get('[data-testid="compaction-status-message"]').text()).not.toContain('Saved on this server')
    expect((wrapper.get('[data-testid="compaction-ratio-input"]').element as HTMLInputElement).value).toBe('60')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeUndefined()

    settingsStore.updateServerSetting = vi.fn().mockImplementation(async (key: string, value: string) => {
      applyAuthoritativeSetting(settingsStore, key, value)
      return true
    })
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(settingsStore.updateServerSetting).toHaveBeenCalledTimes(2)
    expect(settingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      1,
      'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
      '0.6',
    )
    expect(settingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      2,
      'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
      'false',
    )
    expect(wrapper.get('[data-testid="compaction-config-save"]').attributes('disabled')).toBeDefined()
  })
})
