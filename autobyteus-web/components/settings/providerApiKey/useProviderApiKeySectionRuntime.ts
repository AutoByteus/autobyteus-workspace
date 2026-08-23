import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  PROVIDER_SETTINGS_RUNTIME_KIND,
  QwenConfigurationMutationError,
  useLLMProviderConfigStore,
  type CustomLlmProviderDraftInput,
  type CustomLlmProviderProbeResult,
  type ProviderCredentialSetting,
} from '~/stores/llmProviderConfig'
import { createGeminiConfigurationActions } from './providerApiKeyGeminiActions'

export interface ProviderSummary {
  id: string
  name: string
  label: string
  totalModels: number | null
  isCustom: boolean
  isDraft?: boolean
  providerType: string
  baseUrl?: string | null
  apiKeyConfigured: boolean
  catalogMode: ProviderCredentialSetting['provider']['catalogMode']
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
    providerCredentialSettings,
    geminiSetup,
    qwenSetup,
  } = storeToRefs(store)

  const loading = ref(import.meta.env.MODE !== 'test')
  const credentialError = ref<string | null>(null)
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

  const catalog = computed(() => store.catalogSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND))
  const selectedCatalog = computed(() =>
    store.providerSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND, selectedProviderId.value))
  const selectedSources = computed(() => selectedCatalog.value?.sources ?? [])
  const isLoadingModels = computed(() => selectedSources.value.some(source => source.state === 'LOADING')
    || (!selectedCatalog.value && catalog.value.state === 'loading'))
  const isRefreshingModels = computed(() =>
    selectedSources.value.some(source => source.state === 'REFRESHING'))
  const modelErrorMessage = computed(() => selectedSources.value
    .find(source => source.safeMessage)?.safeMessage ?? catalog.value.errorMessage)
  const hasCurrentModelRows = computed(() => selectedSources.value.some(source =>
    (source.state === 'READY' || source.state === 'PARTIAL') && source.modelCount > 0))
  const hasStaleModelRows = computed(() => selectedSources.value.some(source =>
    source.state === 'STALE_ERROR' && source.modelCount > 0))
  const hasModelSourceProblem = computed(() => selectedSources.value.some(source =>
    source.state === 'PARTIAL' || source.state === 'ERROR' || source.state === 'STALE_ERROR'))
  const hasPartialModelResult = computed(() => selectedSources.value.some(source =>
    source.state === 'PARTIAL') || (hasCurrentModelRows.value && hasModelSourceProblem.value))
  const hasStaleModelResult = computed(() => !hasPartialModelResult.value
    && !hasCurrentModelRows.value
    && hasStaleModelRows.value)
  const hasUnavailableModelSource = computed(() => !hasCurrentModelRows.value
    && !hasStaleModelRows.value
    && selectedSources.value.some(source =>
      source.state === 'ERROR' || source.state === 'STALE_ERROR'))
  const selectedCatalogHasTerminalPayload = computed(() => Boolean(selectedCatalog.value)
    && (selectedSources.value.length === 0
      || selectedSources.value.every(source =>
        source.state === 'READY' || source.state === 'PARTIAL' || source.state === 'STALE_ERROR')))
  const selectedRequestKey = computed(() =>
    `${PROVIDER_SETTINGS_RUNTIME_KIND}:${selectedProviderId.value}`)
  const isReloadingSelectedProvider = computed(() =>
    store.providerRequestModeByKey[selectedRequestKey.value] === 'reload')

  const getDraftProviderLabel = () => t('settings.components.settings.ProviderAPIKeyManager.new_custom_provider')
  const buildCustomProviderFingerprint = (value: CustomLlmProviderDraftInput): string =>
    JSON.stringify({
      name: value.name.trim(),
      baseUrl: value.baseUrl.trim(),
      apiKey: value.apiKey.trim(),
    })
  const modelsForProvider = (providerId: string, kind: 'llm' | 'audio' | 'image' | 'video') => {
    const snapshot = store.providerSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
    if (!snapshot) return []
    if (kind === 'llm') return snapshot.llmModels
    if (kind === 'audio') return snapshot.audioModels
    if (kind === 'image') return snapshot.imageModels
    return snapshot.videoModels
  }
  const modelCountForProvider = (providerId: string): number | null => {
    const snapshot = store.providerSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
    if (!snapshot) return null
    if (snapshot.sources.some(source =>
      source.state === 'IDLE' || source.state === 'LOADING' || source.state === 'ERROR')) return null
    return modelsForProvider(providerId, 'llm').length
      + modelsForProvider(providerId, 'audio').length
      + modelsForProvider(providerId, 'image').length
      + modelsForProvider(providerId, 'video').length
  }

  const allProvidersWithModels = computed<ProviderSummary[]>(() => {
    const providers = providerCredentialSettings.value.map(setting => ({
      id: setting.provider.id,
      name: setting.provider.name,
      label: setting.provider.name,
      totalModels: modelCountForProvider(setting.provider.id),
      isCustom: setting.provider.isCustom,
      providerType: setting.provider.providerType,
      baseUrl: setting.provider.baseUrl ?? null,
      apiKeyConfigured: setting.apiKeyConfigured,
      catalogMode: setting.provider.catalogMode,
    })).sort((left, right) => left.label.localeCompare(right.label))
    providers.push({
      id: NEW_CUSTOM_PROVIDER_ID,
      name: getDraftProviderLabel(),
      label: getDraftProviderLabel(),
      totalModels: null,
      isCustom: true,
      isDraft: true,
      providerType: CUSTOM_PROVIDER_TYPE,
      baseUrl: null,
      apiKeyConfigured: false,
      catalogMode: 'STATIC',
    })
    return providers
  })

  const selectedProviderSummary = computed(() =>
    allProvidersWithModels.value.find(({ id }) => id === selectedProviderId.value) ?? null)
  const selectedProviderLabel = computed(() =>
    selectedProviderSummary.value?.label ?? selectedProviderId.value)
  const selectedProviderLlmModels = computed(() => modelsForProvider(selectedProviderId.value, 'llm'))
  const selectedProviderAudioModels = computed(() => modelsForProvider(selectedProviderId.value, 'audio'))
  const selectedProviderImageModels = computed(() => modelsForProvider(selectedProviderId.value, 'image'))
  const selectedProviderVideoModels = computed(() => modelsForProvider(selectedProviderId.value, 'video'))
  const selectedProviderConfigured = computed(() => selectedProviderSummary.value?.apiKeyConfigured === true)
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
    selectedProviderSummary.value?.catalogMode === 'DISCOVERED'
      && selectedProviderSummary.value?.isDraft !== true)

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

  const loadSelectedSpecialtySetup = async (providerId: string) => {
    if (providerId === 'GEMINI') await store.fetchGeminiSetupConfig()
    if (providerId === 'QWEN') await store.fetchQwenSetupStatus()
  }

  const ensureSelectedDynamicProvider = async (providerId: string) => {
    if (!providerId || providerId === NEW_CUSTOM_PROVIDER_ID) return
    await store.fetchProvidersWithModels(PROVIDER_SETTINGS_RUNTIME_KIND)
    const snapshot = store.providerSnapshot(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
    if (snapshot?.ownerProvider.catalogMode !== 'DISCOVERED') return
    if (!snapshot.sources.some(source => source.state === 'IDLE')) return
    await store.ensureProviderModelCatalog(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
  }

  const initialize = async () => {
    loading.value = true
    credentialError.value = null
    const catalogRequest = store.fetchProvidersWithModels(PROVIDER_SETTINGS_RUNTIME_KIND)
    try {
      await store.fetchProviderCredentialSettings()
      selectedProviderId.value = resolvePreferredProviderId()
      void loadSelectedSpecialtySetup(selectedProviderId.value).catch(() => undefined)
      void catalogRequest
        .then(() => ensureSelectedDynamicProvider(selectedProviderId.value))
        .catch(() => undefined)
    } catch (error) {
      credentialError.value = error instanceof Error ? error.message : String(error)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models'), 'error')
    } finally {
      loading.value = false
    }
  }

  const selectProvider = async (providerId: string) => {
    if (selectedProviderId.value !== providerId) providerEditorResetVersion.value += 1
    selectedProviderId.value = providerId
    try {
      await Promise.all([
        loadSelectedSpecialtySetup(providerId),
        ensureSelectedDynamicProvider(providerId),
      ])
    } catch (error) {
      showNotification(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  const reloadSelectedProvider = async (providerId = selectedProviderId.value) => {
    if (!providerId || providerId === NEW_CUSTOM_PROVIDER_ID) return
    const providerLabel = allProvidersWithModels.value.find(({ id }) => id === providerId)?.label ?? providerId
    try {
      await store.reloadProvider(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider', { provider: providerLabel }), 'success')
    } catch (error) {
      showNotification(t('settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider', { provider: providerLabel }), 'error')
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
      saving.value = false
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully',
        { provider: providerLabel },
      ), 'success')
      if (providerId === 'AUTOBYTEUS') {
        void store.ensureProviderModelCatalog(PROVIDER_SETTINGS_RUNTIME_KIND, providerId)
          .catch(() => undefined)
      }
      return true
    } catch (error) {
      console.error('Failed to save API key:', error)
      showNotification(t(
        'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key',
        { provider: providerLabel },
      ), 'error')
      saving.value = false
      return false
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
      const setting = await store.createCustomProvider({ ...customProviderDraft })
      selectedProviderId.value = setting.provider.id
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
    credentialError,
    saving,
    activating,
    notification,
    selectedProviderId,
    selectedProviderSummary,
    selectedProviderLabel,
    providerEditorResetVersion,
    isLoadingModels,
    isRefreshingModels,
    modelErrorMessage,
    hasPartialModelResult,
    hasStaleModelResult,
    hasUnavailableModelSource,
    catalogHasSuccessfulPayload: selectedCatalogHasTerminalPayload,
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
