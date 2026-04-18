import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLocalization } from '~/composables/useLocalization'
import {
  useLLMProviderConfigStore,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type GeminiSetupConfigInput,
  type LlmProviderStatus,
} from '~/stores/llmProviderConfig'

type ProviderConfigState = { apiKeyConfigured?: boolean }

export interface ProviderSummary {
  id: string
  name: string
  label: string
  totalModels: number
  isCustom: boolean
  isDraft?: boolean
  providerType: string
  baseUrl?: string | null
  apiKeyConfigured: boolean
  status: LlmProviderStatus
  statusMessage?: string | null
}

export interface ProviderSectionNotification {
  type: 'success' | 'error'
  message: string
}

const NEW_CUSTOM_PROVIDER_ID = '__new_custom_provider__'
const CUSTOM_PROVIDER_TYPE = 'OPENAI_COMPATIBLE'

export function useProviderApiKeySectionRuntime() {
  const store = useLLMProviderConfigStore()
  const { t } = useLocalization()
  const {
    isLoadingModels,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providersWithModels,
    audioProvidersWithModels,
    imageProvidersWithModels,
    geminiSetup,
  } = storeToRefs(store)

  const loading = ref(import.meta.env.MODE === 'test' ? false : true)
  const saving = ref(false)
  const notification = ref<ProviderSectionNotification | null>(null)
  const providerConfigs = ref<Record<string, ProviderConfigState>>({})
  const selectedProviderId = ref('')
  const providerEditorResetVersion = ref(0)
  const customProviderDraft = reactive<CustomLlmProviderDraftInput>({
    name: '',
    providerType: CUSTOM_PROVIDER_TYPE,
    baseUrl: '',
    apiKey: '',
  })
  const isProbingCustomProvider = ref(false)
  const isSavingCustomProvider = ref(false)
  const isDeletingCustomProvider = ref(false)
  const customProviderProbeResult = ref<CustomLlmProviderProbeResult | null>(null)
  const customProviderError = ref<string | null>(null)
  const lastCustomProviderProbeFingerprint = ref<string | null>(null)
  let notificationTimer: ReturnType<typeof setTimeout> | null = null

  const getDraftProviderLabel = () => t('settings.components.settings.ProviderAPIKeyManager.new_custom_provider')
  const buildCustomProviderFingerprint = (value: CustomLlmProviderDraftInput): string =>
    JSON.stringify({
      name: value.name.trim(),
      baseUrl: value.baseUrl.trim(),
      apiKey: value.apiKey.trim(),
    })

  const allProvidersWithModels = computed<ProviderSummary[]>(() => {
    const providerMap = new Map<string, ProviderSummary>()

    for (const providerGroup of providersWithModels.value || []) {
      providerMap.set(providerGroup.provider.id, {
        id: providerGroup.provider.id,
        name: providerGroup.provider.name,
        label: providerGroup.provider.name,
        totalModels: providerGroup.models?.length || 0,
        isCustom: providerGroup.provider.isCustom,
        providerType: providerGroup.provider.providerType,
        baseUrl: providerGroup.provider.baseUrl ?? null,
        apiKeyConfigured: providerGroup.provider.apiKeyConfigured,
        status: providerGroup.provider.status,
        statusMessage: providerGroup.provider.statusMessage ?? null,
      })
    }

    const addModels = (providerId: string, count: number) => {
      const existing = providerMap.get(providerId)
      if (!existing) return
      providerMap.set(providerId, {
        ...existing,
        totalModels: existing.totalModels + count,
      })
    }

    for (const providerGroup of audioProvidersWithModels.value || []) {
      addModels(providerGroup.provider.id, providerGroup.models?.length || 0)
    }

    for (const providerGroup of imageProvidersWithModels.value || []) {
      addModels(providerGroup.provider.id, providerGroup.models?.length || 0)
    }

    const providers = Array.from(providerMap.values()).sort((left, right) => left.label.localeCompare(right.label))
    providers.push({
      id: NEW_CUSTOM_PROVIDER_ID,
      name: getDraftProviderLabel(),
      label: getDraftProviderLabel(),
      totalModels: 0,
      isCustom: true,
      isDraft: true,
      providerType: CUSTOM_PROVIDER_TYPE,
      baseUrl: null,
      apiKeyConfigured: false,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    })
    return providers
  })

  const selectedProviderSummary = computed(() =>
    allProvidersWithModels.value.find((provider) => provider.id === selectedProviderId.value) ?? null,
  )
  const selectedProviderLabel = computed(() => selectedProviderSummary.value?.label ?? selectedProviderId.value)
  const selectedProviderLlmModels = computed(() => {
    if (!selectedProviderId.value || selectedProviderId.value === NEW_CUSTOM_PROVIDER_ID) return []
    return providersWithModels.value.find((provider) => provider.provider.id === selectedProviderId.value)?.models || []
  })
  const selectedProviderAudioModels = computed(() => {
    if (!selectedProviderId.value || selectedProviderId.value === NEW_CUSTOM_PROVIDER_ID) return []
    return audioProvidersWithModels.value.find((provider) => provider.provider.id === selectedProviderId.value)?.models || []
  })
  const selectedProviderImageModels = computed(() => {
    if (!selectedProviderId.value || selectedProviderId.value === NEW_CUSTOM_PROVIDER_ID) return []
    return imageProvidersWithModels.value.find((provider) => provider.provider.id === selectedProviderId.value)?.models || []
  })
  const customProviderDraftFingerprint = computed(() => buildCustomProviderFingerprint(customProviderDraft))
  const isCustomProviderProbeStale = computed(
    () =>
      Boolean(lastCustomProviderProbeFingerprint.value) &&
      lastCustomProviderProbeFingerprint.value !== customProviderDraftFingerprint.value,
  )
  const canProbeCustomProvider = computed(
    () => Boolean(customProviderDraft.name.trim() && customProviderDraft.baseUrl.trim() && customProviderDraft.apiKey.trim()),
  )
  const canSaveCustomProvider = computed(
    () => Boolean(customProviderProbeResult.value) && !isCustomProviderProbeStale.value && !isSavingCustomProvider.value,
  )

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

  const isProviderConfigured = (providerId: string): boolean => {
    if (!providerId || providerId === NEW_CUSTOM_PROVIDER_ID) return false
    if (providerId === 'GEMINI') return isGeminiConfigured.value

    const provider = allProvidersWithModels.value.find((entry) => entry.id === providerId)
    if (provider) return provider.apiKeyConfigured
    return Boolean(providerConfigs.value[providerId]?.apiKeyConfigured)
  }

  const selectedProviderConfigured = computed(() =>
    selectedProviderId.value ? isProviderConfigured(selectedProviderId.value) : false,
  )
  const canReloadSelectedProvider = computed(
    () => Boolean(selectedProviderSummary.value) && selectedProviderSummary.value?.isDraft !== true,
  )
  const isReloadingSelectedProvider = computed(
    () =>
      Boolean(selectedProviderId.value) &&
      selectedProviderId.value !== NEW_CUSTOM_PROVIDER_ID &&
      isReloadingProviderModels.value &&
      reloadingProvider.value === selectedProviderId.value,
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

  const resetCustomProviderProbeState = () => {
    customProviderProbeResult.value = null
    customProviderError.value = null
    lastCustomProviderProbeFingerprint.value = null
  }

  const resetCustomProviderDraft = () => {
    customProviderDraft.name = ''
    customProviderDraft.providerType = CUSTOM_PROVIDER_TYPE
    customProviderDraft.baseUrl = ''
    customProviderDraft.apiKey = ''
    resetCustomProviderProbeState()
  }

  const updateCustomProviderDraft = (value: CustomLlmProviderDraftInput) => {
    customProviderDraft.name = value.name
    customProviderDraft.providerType = CUSTOM_PROVIDER_TYPE
    customProviderDraft.baseUrl = value.baseUrl
    customProviderDraft.apiKey = value.apiKey
    if (
      lastCustomProviderProbeFingerprint.value &&
      lastCustomProviderProbeFingerprint.value !== buildCustomProviderFingerprint(value)
    ) {
      customProviderError.value = null
    }
  }

  const refreshGeminiSetup = async () => {
    try {
      await store.fetchGeminiSetupConfig()
    } catch (error) {
      console.error('Failed to refresh Gemini setup config:', error)
    }
  }

  const hydrateProviderConfigs = async () => {
    const nextConfigs: Record<string, ProviderConfigState> = {}
    for (const provider of providersWithModels.value || []) {
      nextConfigs[provider.provider.id] = {
        apiKeyConfigured: provider.provider.apiKeyConfigured,
      }
    }
    providerConfigs.value = nextConfigs
  }

  const resolvePreferredProviderId = (): string => {
    const realProviders = allProvidersWithModels.value.filter((provider) => !provider.isDraft)
    if (realProviders.length === 0) {
      return NEW_CUSTOM_PROVIDER_ID
    }

    const configuredProvider = realProviders.find((provider) => isProviderConfigured(provider.id))
    return configuredProvider?.id ?? realProviders[0]?.id ?? NEW_CUSTOM_PROVIDER_ID
  }

  const initialize = async () => {
    loading.value = true
    try {
      await store.fetchProvidersWithModels()
      await store.fetchGeminiSetupConfig()
      await hydrateProviderConfigs()
      selectedProviderId.value = resolvePreferredProviderId()
    } catch (error) {
      console.error('Failed to load providers or models:', error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models'), 'error')
    } finally {
      loading.value = false
    }
  }

  const selectProvider = async (providerId: string) => {
    selectedProviderId.value = providerId
    if (providerId === 'GEMINI') {
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

  const reloadSelectedProvider = async (providerId = selectedProviderId.value) => {
    if (!providerId || providerId === NEW_CUSTOM_PROVIDER_ID) return

    try {
      await store.reloadModelsForProvider(providerId)
      const providerLabel = allProvidersWithModels.value.find((provider) => provider.id === providerId)?.label ?? providerId
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider', { provider: providerLabel }),
        'success',
      )
    } catch (error) {
      console.error('Failed to reload provider models:', error)
      const providerLabel = allProvidersWithModels.value.find((provider) => provider.id === providerId)?.label ?? providerId
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider', { provider: providerLabel }),
        'error',
      )
    }
  }

  const saveGeminiSetup = async (input: GeminiSetupConfigInput) => {
    saving.value = true
    try {
      await store.setGeminiSetupConfig(input)
      providerConfigs.value.GEMINI = { apiKeyConfigured: isGeminiConfigured.value }
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

  const saveProviderApiKey = async (providerId: string, apiKey: string) => {
    if (!providerId || !apiKey.trim()) {
      return false
    }

    saving.value = true
    try {
      await store.setLLMProviderApiKey(providerId, apiKey)
      providerConfigs.value[providerId] = { apiKeyConfigured: true }
      providerEditorResetVersion.value += 1
      const providerLabel = allProvidersWithModels.value.find((provider) => provider.id === providerId)?.label ?? providerId
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully', { provider: providerLabel }),
        'success',
      )
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      const providerLabel = allProvidersWithModels.value.find((provider) => provider.id === providerId)?.label ?? providerId
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key', { provider: providerLabel }),
        'error',
      )
      return false
    } finally {
      saving.value = false
    }
  }

  const probeCustomProviderDraft = async () => {
    if (!canProbeCustomProvider.value) return

    isProbingCustomProvider.value = true
    customProviderError.value = null
    try {
      customProviderProbeResult.value = await store.probeCustomProvider({
        ...customProviderDraft,
        providerType: CUSTOM_PROVIDER_TYPE,
      })
      lastCustomProviderProbeFingerprint.value = customProviderDraftFingerprint.value
    } catch (error) {
      customProviderProbeResult.value = null
      lastCustomProviderProbeFingerprint.value = null
      customProviderError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isProbingCustomProvider.value = false
    }
  }

  const saveCustomProviderDraft = async () => {
    if (!canSaveCustomProvider.value) return false

    isSavingCustomProvider.value = true
    customProviderError.value = null
    try {
      const provider = await store.createCustomProvider(
        {
          ...customProviderDraft,
          providerType: CUSTOM_PROVIDER_TYPE,
        },
        'autobyteus',
      )
      await hydrateProviderConfigs()
      selectedProviderId.value = provider.id
      resetCustomProviderDraft()
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.custom_provider_saved_successfully'), 'success')
      return true
    } catch (error) {
      console.error('Failed to save custom provider:', error)
      customProviderError.value = error instanceof Error ? error.message : String(error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_custom_provider'), 'error')
      return false
    } finally {
      isSavingCustomProvider.value = false
    }
  }

  const deleteCustomProvider = async (providerId = selectedProviderId.value) => {
    const provider = allProvidersWithModels.value.find((entry) => entry.id === providerId)
    if (!provider || !provider.isCustom || provider.isDraft) {
      return false
    }

    isDeletingCustomProvider.value = true
    try {
      await store.deleteCustomProvider(providerId, 'autobyteus')
      await hydrateProviderConfigs()
      selectedProviderId.value = resolvePreferredProviderId()
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.custom_provider_deleted_successfully', { provider: provider.label }),
        'success',
      )
      return true
    } catch (error) {
      console.error('Failed to delete custom provider:', error)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.failed_to_delete_custom_provider', { provider: provider.label }),
        'error',
      )
      return false
    } finally {
      isDeletingCustomProvider.value = false
    }
  }

  onBeforeUnmount(clearNotificationTimer)

  return {
    loading,
    saving,
    notification,
    providerConfigs,
    selectedProviderId,
    selectedProviderSummary,
    selectedProviderLabel,
    providerEditorResetVersion,
    isLoadingModels,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providersWithModels,
    audioProvidersWithModels,
    imageProvidersWithModels,
    geminiSetup,
    allProvidersWithModels,
    selectedProviderLlmModels,
    selectedProviderAudioModels,
    selectedProviderImageModels,
    selectedProviderConfigured,
    canReloadSelectedProvider,
    isReloadingSelectedProvider,
    isProviderConfigured,
    customProviderDraft,
    customProviderProbeResult,
    customProviderError,
    isProbingCustomProvider,
    isSavingCustomProvider,
    isDeletingCustomProvider,
    isCustomProviderProbeStale,
    canProbeCustomProvider,
    canSaveCustomProvider,
    initialize,
    selectProvider,
    reloadAllModels,
    reloadSelectedProvider,
    saveGeminiSetup,
    saveProviderApiKey,
    updateCustomProviderDraft,
    probeCustomProviderDraft,
    saveCustomProviderDraft,
    deleteCustomProvider,
  }
}
