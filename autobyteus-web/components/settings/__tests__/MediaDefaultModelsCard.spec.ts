import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import MediaDefaultModelsCard from '../MediaDefaultModelsCard.vue'
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_MODEL_IDENTIFIER,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_MODEL_IDENTIFIER,
} from '../mediaDefaultModelSettings'
import { useLLMProviderConfigStore, type ProviderWithModels } from '~/stores/llmProviderConfig'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const SearchableGroupedSelectStub = defineComponent({
  name: 'SearchableGroupedSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    options: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  methods: {
    onChange(event: Event) {
      this.$emit('update:modelValue', (event.target as HTMLSelectElement).value)
    },
  },
  template: `
    <div v-bind="$attrs">
      <select :value="modelValue" :disabled="disabled || loading" @change="onChange">
        <optgroup v-for="group in options" :key="group.label" :label="group.label">
          <option v-for="item in group.items" :key="item.id" :value="item.id">
            {{ item.selectedLabel || item.name }}
          </option>
        </optgroup>
      </select>
    </div>
  `,
})

const provider = (id: string, name: string) => ({
  id,
  name,
  providerType: 'OPENAI' as any,
  isCustom: false,
  apiKeyConfigured: true,
  status: 'READY' as const,
})

const model = (modelIdentifier: string, providerId: string, providerName: string) => ({
  modelIdentifier,
  name: modelIdentifier,
  value: modelIdentifier,
  canonicalName: modelIdentifier,
  providerId,
  providerName,
  providerType: 'OPENAI' as any,
  runtime: 'autobyteus',
})

const imageProvidersWithModels: ProviderWithModels[] = [
  {
    provider: provider('openai-image', 'OpenAI Images'),
    models: [
      model(DEFAULT_IMAGE_MODEL_IDENTIFIER, 'openai-image', 'OpenAI Images'),
      model('openai/new-image-model', 'openai-image', 'OpenAI Images'),
    ],
  },
]

const audioProvidersWithModels: ProviderWithModels[] = [
  {
    provider: provider('gemini-audio', 'Gemini Audio'),
    models: [
      model(DEFAULT_SPEECH_MODEL_IDENTIFIER, 'gemini-audio', 'Gemini Audio'),
      model('gemini/new-speech-model', 'gemini-audio', 'Gemini Audio'),
    ],
  },
]

const setting = (key: string, value: string): ServerSetting => ({
  key,
  value,
  description: 'desc',
  isEditable: true,
  isDeletable: false,
})

const mountComponent = async (settings: ServerSetting[] = []) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings,
        isUpdating: false,
      },
      llmProviderConfig: {
        imageProvidersWithModels,
        audioProvidersWithModels,
        providersWithModels: [],
        isLoadingModels: false,
        isReloadingModels: false,
        hasFetchedProviders: true,
        modelRuntimeKind: 'autobyteus',
      },
    },
  })
  setActivePinia(pinia)

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const modelCatalogStore = useLLMProviderConfigStore()
  modelCatalogStore.fetchProvidersWithModels = vi.fn().mockResolvedValue([])

  const wrapper = mount(MediaDefaultModelsCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
        SearchableGroupedSelect: SearchableGroupedSelectStub,
      },
    },
  })

  await flushPromises()
  return { wrapper, serverSettingsStore, modelCatalogStore }
}

const selectorFor = (wrapper: ReturnType<typeof mount>, key: string) =>
  wrapper.get(`[data-testid="media-default-model-select-${key}"] select`)

describe('MediaDefaultModelsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the autobyteus media catalogs and displays tool fallback defaults when settings are absent', async () => {
    const { wrapper, modelCatalogStore } = await mountComponent()

    expect(modelCatalogStore.fetchProvidersWithModels).toHaveBeenCalledWith('autobyteus')
    expect(wrapper.text()).toContain('Default media models')
    expect(selectorFor(wrapper, DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY).element).toHaveProperty(
      'value',
      DEFAULT_IMAGE_MODEL_IDENTIFIER,
    )
    expect(selectorFor(wrapper, DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY).element).toHaveProperty(
      'value',
      DEFAULT_IMAGE_MODEL_IDENTIFIER,
    )
    expect(selectorFor(wrapper, DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY).element).toHaveProperty(
      'value',
      DEFAULT_SPEECH_MODEL_IDENTIFIER,
    )
  })

  it('preserves an explicit current model identifier that is not in the loaded catalog', async () => {
    const staleModelIdentifier = 'nano-banana-pro-app-rpa@host'
    const { wrapper } = await mountComponent([
      setting(DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY, staleModelIdentifier),
    ])

    expect(selectorFor(wrapper, DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY).element).toHaveProperty(
      'value',
      staleModelIdentifier,
    )
    expect(wrapper.text()).toContain(`Current: ${staleModelIdentifier}`)
    expect(wrapper.find(`[data-testid="media-default-model-stale-${DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY}"]`).exists()).toBe(true)
  })

  it('saves only changed model defaults through the server settings store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()

    await selectorFor(wrapper, DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY).setValue('openai/new-image-model')
    await wrapper.get('[data-testid="media-default-models-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledTimes(1)
    expect(serverSettingsStore.updateServerSetting).toHaveBeenCalledWith(
      DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
      'openai/new-image-model',
    )
    expect(wrapper.find('[data-testid="media-default-models-success"]').text()).toContain('Default media models saved')
  })

  it('preserves unsaved local selections when server settings refresh', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent([
      setting(DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY, DEFAULT_IMAGE_MODEL_IDENTIFIER),
    ])

    await selectorFor(wrapper, DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY).setValue('openai/new-image-model')
    await wrapper.vm.$nextTick()

    serverSettingsStore.$patch({
      settings: [setting(DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY, DEFAULT_IMAGE_MODEL_IDENTIFIER)],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(selectorFor(wrapper, DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY).element).toHaveProperty(
      'value',
      'openai/new-image-model',
    )
  })
})
