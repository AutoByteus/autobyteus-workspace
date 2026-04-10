import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLocalization } from '~/composables/useLocalization'
import {
  useLLMProviderConfigStore,
  type GeminiSetupConfigInput,
} from '~/stores/llmProviderConfig'

type ProviderConfigMask = { apiKey?: string }

export interface ProviderSummary {
  name: string
  totalModels: number
}

export interface ProviderSectionNotification {
  type: 'success' | 'error'
  message: string
}

const MASKED_API_KEY = '********'

export function useProviderApiKeySectionRuntime() {
  const store = useLLMProviderConfigStore()
  const { t } = useLocalization()
  const {
    isLoadingModels,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providers,
    providersWithModels,
    audioProvidersWithModels,
    imageProvidersWithModels,
    geminiSetup,
  } = storeToRefs(store)

  const loading = ref(import.meta.env.MODE === 'test' ? false : true)
  const saving = ref(false)
  const notification = ref<ProviderSectionNotification | null>(null)
  const providerConfigs = ref<Record<string, ProviderConfigMask>>({})
  const selectedModelProvider = ref('')
  const providerEditorResetVersion = ref(0)
  let notificationTimer: ReturnType<typeof setTimeout> | null = null

  const allProvidersWithModels = computed<ProviderSummary[]>(() => {
    const providerMap = new Map<string, number>()

    for (const provider of providers.value || []) {
      providerMap.set(provider, 0)
    }

    for (const providerGroup of providersWithModels.value || []) {
      providerMap.set(
        providerGroup.provider,
        (providerMap.get(providerGroup.provider) || 0) + (providerGroup.models?.length || 0),
      )
    }

    for (const providerGroup of audioProvidersWithModels.value || []) {
      providerMap.set(
        providerGroup.provider,
        (providerMap.get(providerGroup.provider) || 0) + (providerGroup.models?.length || 0),
      )
    }

    for (const providerGroup of imageProvidersWithModels.value || []) {
      providerMap.set(
        providerGroup.provider,
        (providerMap.get(providerGroup.provider) || 0) + (providerGroup.models?.length || 0),
      )
    }

    return Array.from(providerMap.entries())
      .map(([name, totalModels]) => ({ name, totalModels }))
      .sort((left, right) => left.name.localeCompare(right.name))
  })

  const hasAnyModels = computed(() => allProvidersWithModels.value.some((provider) => provider.totalModels > 0))

  const selectedProviderLlmModels = computed(() => {
    if (!selectedModelProvider.value) return []
    return (
      providersWithModels.value.find((provider) => provider.provider === selectedModelProvider.value)?.models || []
    )
  })

  const selectedProviderAudioModels = computed(() => {
    if (!selectedModelProvider.value) return []
    return (
      audioProvidersWithModels.value.find((provider) => provider.provider === selectedModelProvider.value)?.models || []
    )
  })

  const selectedProviderImageModels = computed(() => {
    if (!selectedModelProvider.value) return []
    return (
      imageProvidersWithModels.value.find((provider) => provider.provider === selectedModelProvider.value)?.models || []
    )
  })

  const isGeminiConfigured = computed(() => {
    const setup = geminiSetup.value
    if (!setup) return false
    if (setup.mode === 'VERTEX_EXPRESS') {
      return setup.vertexApiKeyConfigured
    }
    if (setup.mode === 'VERTEX_PROJECT') {
      return Boolean((setup.vertexProject ?? '').trim() && (setup.vertexLocation ?? '').trim())
    }
    return setup.geminiApiKeyConfigured
  })

  const isProviderConfigured = (provider: string): boolean => {
    if (provider === 'GEMINI') {
      return isGeminiConfigured.value
    }
    return Boolean(providerConfigs.value[provider]?.apiKey)
  }

  const selectedProviderConfigured = computed(() =>
    selectedModelProvider.value ? isProviderConfigured(selectedModelProvider.value) : false,
  )

  const isReloadingSelectedProvider = computed(
    () =>
      Boolean(selectedModelProvider.value) &&
      isReloadingProviderModels.value &&
      reloadingProvider.value === selectedModelProvider.value,
  )

  const clearNotificationTimer = () => {
    if (notificationTimer) {
      clearTimeout(notificationTimer)
      notificationTimer = null
    }
  }

  const showNotification = (message: string, type: ProviderSectionNotification['type']) => {
    clearNotificationTimer()
    notification.value = { message, type }
    notificationTimer = setTimeout(() => {
      notification.value = null
      notificationTimer = null
    }, 3000)
  }

  const refreshGeminiSetup = async () => {
    try {
      await store.fetchGeminiSetupConfig()
    } catch (error) {
      console.error('Failed to refresh Gemini setup config:', error)
    }
  }

  const hydrateProviderConfigs = async () => {
    const providerNames = new Set<string>()
    for (const provider of allProvidersWithModels.value) {
      providerNames.add(provider.name)
    }
    for (const provider of providers.value || []) {
      providerNames.add(provider)
    }

    const hydrationEntries = Array.from(providerNames)
    await Promise.all(
      hydrationEntries.map(async (provider) => {
        if (provider === 'GEMINI') {
          providerConfigs.value[provider] = {}
          return
        }

        try {
          const apiKey = await store.getLLMProviderApiKey(provider)
          providerConfigs.value[provider] =
            apiKey && typeof apiKey === 'string' && apiKey.trim() !== '' ? { apiKey: MASKED_API_KEY } : {}
        } catch (error) {
          console.error(`Failed to load API key for ${provider}:`, error)
          providerConfigs.value[provider] = {}
        }
      }),
    )
  }

  const initializeSelectedProvider = () => {
    if (allProvidersWithModels.value.length === 0) {
      selectedModelProvider.value = ''
      return
    }

    const configuredProvider = allProvidersWithModels.value.find((provider) => isProviderConfigured(provider.name))
    selectedModelProvider.value = configuredProvider?.name ?? allProvidersWithModels.value[0]?.name ?? ''
  }

  const initialize = async () => {
    loading.value = true
    try {
      await store.fetchProvidersWithModels()
      await store.fetchGeminiSetupConfig()
      await hydrateProviderConfigs()
      initializeSelectedProvider()
    } catch (error) {
      console.error('Failed to load providers or models:', error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models'), 'error')
    } finally {
      loading.value = false
    }
  }

  const selectProvider = async (providerName: string) => {
    selectedModelProvider.value = providerName
    if (providerName === 'GEMINI') {
      await refreshGeminiSetup()
    }
  }

  const reloadAllModels = async () => {
    try {
      await store.reloadModels()
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully'), 'success')
    } catch (error) {
      console.error('Failed to reload models:', error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models'), 'error')
    }
  }

  const reloadSelectedProvider = async (provider = selectedModelProvider.value) => {
    if (!provider) return

    try {
      await store.reloadModelsForProvider(provider)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider', { provider }),
        'success',
      )
    } catch (error) {
      console.error('Failed to reload provider models:', error)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider', { provider }),
        'error',
      )
    }
  }

  const saveGeminiSetup = async (input: GeminiSetupConfigInput) => {
    saving.value = true
    try {
      await store.setGeminiSetupConfig(input)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.gemini_setup_saved_successfully'), 'success')
      return true
    } catch (error) {
      console.error('Failed to save Gemini setup:', error)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key', { provider: 'GEMINI' }),
        'error',
      )
      return false
    } finally {
      saving.value = false
    }
  }

  const saveProviderApiKey = async (provider: string, apiKey: string) => {
    if (!provider || !apiKey.trim()) {
      return false
    }

    saving.value = true
    try {
      await store.setLLMProviderApiKey(provider, apiKey)
      providerConfigs.value[provider] = { apiKey: MASKED_API_KEY }
      providerEditorResetVersion.value += 1
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully', { provider }),
        'success',
      )
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key', { provider }),
        'error',
      )
      return false
    } finally {
      saving.value = false
    }
  }

  onBeforeUnmount(clearNotificationTimer)

  return {
    loading,
    saving,
    notification,
    providerConfigs,
    selectedModelProvider,
    providerEditorResetVersion,
    isLoadingModels,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providers,
    providersWithModels,
    audioProvidersWithModels,
    imageProvidersWithModels,
    geminiSetup,
    allProvidersWithModels,
    hasAnyModels,
    selectedProviderLlmModels,
    selectedProviderAudioModels,
    selectedProviderImageModels,
    selectedProviderConfigured,
    isReloadingSelectedProvider,
    isProviderConfigured,
    initialize,
    selectProvider,
    reloadAllModels,
    reloadSelectedProvider,
    saveGeminiSetup,
    saveProviderApiKey,
  }
}
