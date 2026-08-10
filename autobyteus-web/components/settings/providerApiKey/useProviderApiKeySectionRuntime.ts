import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  PROVIDER_SETTINGS_RUNTIME_KIND,
  QwenConfigurationMutationError,
  useLLMProviderConfigStore,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type ProviderSettingsGroup,
} from '~/stores/llmProviderConfig'
import { createGeminiConfigurationActions } from './providerApiKeyGeminiActions'

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
  status: ProviderSettingsGroup['provider']['status']
  statusMessage?: string | null
}

export interface ProviderSectionNotification {
  type: 'success' | 'warning' | 'error'
  message: string
}

const NEW_CUSTOM_PROVIDER_ID = '__new_custom_provider__'
const CUSTOM_PROVIDER_TYPE = 'OPENAI_COMPATIBLE'

export function useProviderApiKeySectionRuntime() {
  const store = useLLMProviderConfigStore()
  const { t } = useLocalization()
  const {
    isLoadingProviderSettings,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providerSettingsGroups,
    geminiSetup,
    qwenSetup,
  } = storeToRefs(store)

  const loading = ref(import.meta.env.MODE !== 'test')
  const saving = ref(false)
  const activating = ref(false)
  const notification = ref<ProviderSectionNotification | null>(null)
  const selectedProviderId = ref('')
  const providerEditorResetVersion = ref(0)
  const qwenFormResetVersion = ref(0)
  const qwenSaveErrorMessage = ref<string | null>(null)
  const qwenSaveErrorCode = ref<string | null>(null)
  const customProviderDraft = reactive<CustomLlmProviderDraftInput>({ name: '', baseUrl: '', apiKey: '' })
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
    const providers: ProviderSummary[] = providerSettingsGroups.value.map((group) => ({
      id: group.provider.id,
      name: group.provider.name,
      label: group.provider.name,
      totalModels: group.llmModels.length
        + group.audioModels.length
        + group.imageModels.length
        + group.videoModels.length,
      isCustom: group.provider.isCustom,
      providerType: group.provider.providerType,
      baseUrl: group.provider.baseUrl ?? null,
      apiKeyConfigured: group.provider.apiKeyConfigured,
      status: group.provider.status,
      statusMessage: group.provider.statusMessage ?? null,
    })).sort((left, right) => left.label.localeCompare(right.label))
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
    allProvidersWithModels.value.find(({ id }) => id === selectedProviderId.value) ?? null)
  const selectedProviderLabel = computed(() =>
    selectedProviderSummary.value?.label ?? selectedProviderId.value)
  const selectedProviderGroup = computed(() =>
    providerSettingsGroups.value.find(({ provider }) => provider.id === selectedProviderId.value) ?? null)
  const selectedProviderLlmModels = computed(() => selectedProviderGroup.value?.llmModels ?? [])
  const selectedProviderAudioModels = computed(() => selectedProviderGroup.value?.audioModels ?? [])
  const selectedProviderImageModels = computed(() => selectedProviderGroup.value?.imageModels ?? [])
  const selectedProviderVideoModels = computed(() => selectedProviderGroup.value?.videoModels ?? [])
  const selectedProviderConfigured = computed(() =>
    selectedProviderSummary.value?.apiKeyConfigured === true)

  const isProviderConfigured = (providerId: string): boolean =>
    allProvidersWithModels.value.find(({ id }) => id === providerId)?.apiKeyConfigured === true

  const customProviderDraftFingerprint = computed(() => buildCustomProviderFingerprint(customProviderDraft))
  const isCustomProviderProbeStale = computed(() => Boolean(
    lastCustomProviderProbeFingerprint.value
    && lastCustomProviderProbeFingerprint.value !== customProviderDraftFingerprint.value,
  ))
  const canProbeCustomProvider = computed(() => Boolean(
    customProviderDraft.name.trim()
    && customProviderDraft.baseUrl.trim()
    && customProviderDraft.apiKey.trim(),
  ))
  const canSaveCustomProvider = computed(() => Boolean(
    customProviderProbeResult.value
    && !isCustomProviderProbeStale.value
    && !isSavingCustomProvider.value,
  ))
  const canReloadSelectedProvider = computed(() =>
    Boolean(selectedProviderSummary.value) && selectedProviderSummary.value?.isDraft !== true)
  const isReloadingSelectedProvider = computed(() => Boolean(
    selectedProviderId.value
    && selectedProviderId.value !== NEW_CUSTOM_PROVIDER_ID
    && isReloadingProviderModels.value
    && reloadingProvider.value === selectedProviderId.value,
  ))

  const clearNotificationTimer = () => {
    if (notificationTimer) clearTimeout(notificationTimer)
    notificationTimer = null
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
    customProviderDraft.baseUrl = ''
    customProviderDraft.apiKey = ''
    resetCustomProviderProbeState()
  }
  const updateCustomProviderDraft = (value: CustomLlmProviderDraftInput) => {
    customProviderDraft.name = value.name
    customProviderDraft.baseUrl = value.baseUrl
    customProviderDraft.apiKey = value.apiKey
    if (lastCustomProviderProbeFingerprint.value
      && lastCustomProviderProbeFingerprint.value !== buildCustomProviderFingerprint(value)) {
      customProviderError.value = null
    }
  }

  const resolvePreferredProviderId = (): string => {
    const realProviders = allProvidersWithModels.value.filter(({ isDraft }) => !isDraft)
    return realProviders.find(({ apiKeyConfigured }) => apiKeyConfigured)?.id
      ?? realProviders[0]?.id
      ?? NEW_CUSTOM_PROVIDER_ID
  }

  const initialize = async () => {
    loading.value = true
    try {
      await Promise.all([
        store.fetchProviderSettings(),
        store.fetchGeminiSetupConfig(),
        store.fetchQwenSetupStatus(),
      ])
      selectedProviderId.value = resolvePreferredProviderId()
    } catch (error) {
      console.error('Failed to load provider settings:', error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models'), 'error')
    } finally {
      loading.value = false
    }
  }

  const selectProvider = async (providerId: string) => {
    selectedProviderId.value = providerId
    if (providerId === 'GEMINI') await store.fetchGeminiSetupConfig()
    if (providerId === 'QWEN') await store.fetchQwenSetupStatus()
  }

  const reloadAllModels = async () => {
    try {
      await store.reloadModels(PROVIDER_SETTINGS_RUNTIME_KIND)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully'), 'success')
    } catch (error) {
      console.error('Failed to reload models:', error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models'), 'error')
    }
  }

  const reloadSelectedProvider = async (providerId = selectedProviderId.value) => {
    if (!providerId || providerId === NEW_CUSTOM_PROVIDER_ID) return
    const providerLabel = allProvidersWithModels.value.find(({ id }) => id === providerId)?.label ?? providerId
    try {
      await store.reloadModelsForProvider(providerId, PROVIDER_SETTINGS_RUNTIME_KIND)
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider',
        { provider: providerLabel },
      ), 'success')
    } catch (error) {
      console.error('Failed to reload provider models:', error)
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider',
        { provider: providerLabel },
      ), 'error')
    }
  }

  const geminiActions = createGeminiConfigurationActions({
    saving,
    activating,
    saveOption: (input, activateAfterSave) =>
      store.saveGeminiConfigurationOption(input, activateAfterSave),
    activateOption: (option) => store.activateGeminiConfigurationOption(option),
    translate: t,
    notify: showNotification,
  })

  const saveProviderApiKey = async (providerId: string, apiKey: string) => {
    if (saving.value || !providerId || !apiKey.trim()) return false
    saving.value = true
    const providerLabel = allProvidersWithModels.value.find(({ id }) => id === providerId)?.label ?? providerId
    try {
      await store.setLLMProviderApiKey(providerId, apiKey)
      providerEditorResetVersion.value += 1
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully',
        { provider: providerLabel },
      ), 'success')
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key',
        { provider: providerLabel },
      ), 'error')
      return false
    } finally {
      saving.value = false
    }
  }

  const clearQwenSaveError = () => {
    qwenSaveErrorMessage.value = null
    qwenSaveErrorCode.value = null
  }

  const saveQwenConfiguration = async (input: { baseUrl: string; apiKey: string }) => {
    if (saving.value || !input.baseUrl.trim() || !input.apiKey.trim()) return false
    saving.value = true
    clearQwenSaveError()
    try {
      await store.saveQwenConfiguration(input)
    } catch (error) {
      const code = error instanceof QwenConfigurationMutationError ? error.code : null
      const message = code === 'QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED'
        ? t('settings.components.settings.ProviderAPIKeyManager.qwen_previous_configuration_active')
        : code === 'QWEN_CONFIGURATION_REPAIR_REQUIRED'
          ? t('settings.components.settings.ProviderAPIKeyManager.qwen_configuration_repair_required')
          : error instanceof Error && error.message
            ? error.message
            : t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_qwen_configuration')
      qwenSaveErrorCode.value = code
      qwenSaveErrorMessage.value = message
      showNotification(message, 'error')
      saving.value = false
      return false
    }

    qwenFormResetVersion.value += 1
    saving.value = false
    showNotification(
      t('settings.components.settings.ProviderAPIKeyManager.qwen_configuration_saved'),
      'success',
    )
    try {
      await store.refreshProviderDataAfterQwenSave()
    } catch (error) {
      console.error('Qwen configuration saved, but provider data refresh failed:', error)
      showNotification(
        t('settings.components.settings.ProviderAPIKeyManager.qwen_configuration_saved_refresh_failed'),
        'warning',
      )
    }
    return true
  }

  const probeCustomProviderDraft = async () => {
    if (!canProbeCustomProvider.value) return
    isProbingCustomProvider.value = true
    customProviderError.value = null
    try {
      customProviderProbeResult.value = await store.probeCustomProvider({ ...customProviderDraft })
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
      const providerId = await store.createCustomProvider({ ...customProviderDraft })
      selectedProviderId.value = providerId
      resetCustomProviderDraft()
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.custom_provider_saved_successfully'), 'success')
      return true
    } catch (error) {
      customProviderError.value = error instanceof Error ? error.message : String(error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_save_custom_provider'), 'error')
      return false
    } finally {
      isSavingCustomProvider.value = false
    }
  }

  const deleteCustomProvider = async (providerId = selectedProviderId.value) => {
    const provider = allProvidersWithModels.value.find(({ id }) => id === providerId)
    if (!provider?.isCustom || provider.isDraft) return false
    isDeletingCustomProvider.value = true
    try {
      await store.deleteCustomProvider(providerId)
      selectedProviderId.value = resolvePreferredProviderId()
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.custom_provider_deleted_successfully',
        { provider: provider.label },
      ), 'success')
      return true
    } catch (error) {
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.failed_to_delete_custom_provider',
        { provider: provider.label },
      ), 'error')
      return false
    } finally {
      isDeletingCustomProvider.value = false
    }
  }

  onBeforeUnmount(clearNotificationTimer)

  return {
    loading,
    saving,
    activating,
    notification,
    selectedProviderId,
    selectedProviderSummary,
    selectedProviderLabel,
    providerEditorResetVersion,
    isLoadingModels: isLoadingProviderSettings,
    isReloadingModels,
    isReloadingProviderModels,
    reloadingProvider,
    providerSettingsGroups,
    geminiSetup,
    qwenSetup,
    qwenFormResetVersion,
    qwenSaveErrorMessage,
    qwenSaveErrorCode,
    allProvidersWithModels,
    selectedProviderLlmModels,
    selectedProviderAudioModels,
    selectedProviderImageModels,
    selectedProviderVideoModels,
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
    ...geminiActions,
    saveProviderApiKey,
    saveQwenConfiguration,
    clearQwenSaveError,
    updateCustomProviderDraft,
    probeCustomProviderDraft,
    saveCustomProviderDraft,
    deleteCustomProvider,
  }
}
