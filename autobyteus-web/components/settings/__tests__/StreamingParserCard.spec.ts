import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import StreamingParserCard from '../StreamingParserCard.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const STREAM_PARSER_SETTING_KEY = 'AUTOBYTEUS_STREAM_PARSER'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async (settings: ServerSetting[] = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(StreamingParserCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, serverSettingsStore }
}

const isXmlParserChecked = (wrapper: ReturnType<typeof mount>): boolean =>
  wrapper.get('[data-testid="streaming-parser-toggle"]').attributes('aria-checked') === 'true'

const streamParserSetting = (value: string): ServerSetting => ({
  key: STREAM_PARSER_SETTING_KEY,
  value,
  description: 'stream parser',
  isEditable: true,
  isDeletable: false,
})

describe('StreamingParserCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one XML parser override toggle without exposing all parser strategies as Basic choices', async () => {
    const { wrapper } = await mountComponent([streamParserSetting('api_tool_call')])

    expect(wrapper.text()).toContain('Streaming parser')
    expect(wrapper.text()).toContain('force the XML parser override')
    expect(wrapper.text()).toContain('Use XML streaming parser')
    expect(wrapper.text()).toContain('Saving with this toggle off stores provider-native API tool calls')
    expect(wrapper.text()).toContain('Applies to new streamed agent responses')
    expect(wrapper.find('[data-testid="streaming-parser-toggle"]').attributes('role')).toBe('switch')
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('json')
    expect(wrapper.text()).not.toContain('sentinel')
  })

  it.each([
    ['absent setting', [], false],
    ['invalid setting', [streamParserSetting('yaml')], false],
    ['blank setting', [streamParserSetting('   ')], false],
    ['api_tool_call setting', [streamParserSetting('api_tool_call')], false],
    ['json setting', [streamParserSetting('json')], false],
    ['sentinel setting', [streamParserSetting('sentinel')], false],
    ['xml setting', [streamParserSetting('xml')], true],
    ['trimmed uppercase xml setting', [streamParserSetting(' XML ')], true],
  ])('initializes checked state for %s', async (_name, settings, expectedChecked) => {
    const { wrapper } = await mountComponent(settings as ServerSetting[])

    expect(isXmlParserChecked(wrapper)).toBe(expectedChecked)
    expect(wrapper.find('[data-testid="streaming-parser-dirty"]').exists()).toBe(false)
  })

  it('preserves unsaved local edits when settings refresh from the store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([streamParserSetting('api_tool_call')])

    await wrapper.get('[data-testid="streaming-parser-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    serverSettingsStore.$patch({
      settings: [streamParserSetting('api_tool_call')],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(isXmlParserChecked(wrapper)).toBe(true)
    expect(wrapper.find('[data-testid="streaming-parser-dirty"]').exists()).toBe(true)
  })

  it('saves xml when the toggle is turned on', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([streamParserSetting('api_tool_call')])

    await wrapper.get('[data-testid="streaming-parser-toggle"]').trigger('click')
    await wrapper.get('[data-testid="streaming-parser-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      STREAM_PARSER_SETTING_KEY,
      'xml',
    )
  })

  it('saves api_tool_call when the toggle is turned off', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([streamParserSetting('xml')])

    await wrapper.get('[data-testid="streaming-parser-toggle"]').trigger('click')
    await wrapper.get('[data-testid="streaming-parser-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      STREAM_PARSER_SETTING_KEY,
      'api_tool_call',
    )
  })
})
