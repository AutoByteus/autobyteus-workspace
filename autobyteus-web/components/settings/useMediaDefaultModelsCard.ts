import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue'
import {
  MEDIA_DEFAULT_MODEL_SETTINGS,
  type MediaDefaultModelSettingKey,
  type MediaDefaultModelSettingSpec,
} from '~/components/settings/mediaDefaultModelSettings'
import { useLocalization } from '~/composables/useLocalization'
import { useLLMProviderConfigStore, type ModelInfo, type ProviderWithModels } from '~/stores/llmProviderConfig'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { getModelSelectionOptionLabel, getModelSelectionSelectedLabel } from '~/utils/modelSelectionLabel'

const MEDIA_MODEL_RUNTIME_KIND = 'autobyteus'

const normalizeSettingValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const useMediaDefaultModelsCard = () => {
  const serverSettingsStore = useServerSettingsStore()
  const modelCatalogStore = useLLMProviderConfigStore()
  const { t } = useLocalization()

  const draftValues = reactive<Record<MediaDefaultModelSettingKey, string>>({
    DEFAULT_IMAGE_EDIT_MODEL: '',
    DEFAULT_IMAGE_GENERATION_MODEL: '',
    DEFAULT_SPEECH_GENERATION_MODEL: '',
  })
  const originalValues = reactive<Record<MediaDefaultModelSettingKey, string>>({
    DEFAULT_IMAGE_EDIT_MODEL: '',
    DEFAULT_IMAGE_GENERATION_MODEL: '',
    DEFAULT_SPEECH_GENERATION_MODEL: '',
  })

  const isSaving = ref(false)
  const catalogErrorMessage = ref('')
  const saveErrorMessage = ref('')
  const successMessage = ref('')

  const isCatalogLoading = computed(() => modelCatalogStore.isLoadingModels || modelCatalogStore.isReloadingModels)
  const hasCatalogLoadResult = computed(() => modelCatalogStore.hasFetchedProviders || Boolean(catalogErrorMessage.value))
  const changedSettings = computed(() =>
    MEDIA_DEFAULT_MODEL_SETTINGS.filter((setting) => draftValues[setting.key] !== originalValues[setting.key]),
  )
  const isDirty = computed(() => changedSettings.value.length > 0)
  const displayErrorMessage = computed(() => saveErrorMessage.value || catalogErrorMessage.value)

  const explicitSettingValue = (key: MediaDefaultModelSettingKey): string =>
    normalizeSettingValue(serverSettingsStore.getSettingByKey(key)?.value)

  const effectiveSettingValue = (setting: MediaDefaultModelSettingSpec): string =>
    explicitSettingValue(setting.key) || setting.fallbackModelIdentifier

  const syncFromStore = (): void => {
    for (const setting of MEDIA_DEFAULT_MODEL_SETTINGS) {
      const currentValue = effectiveSettingValue(setting)
      if (!draftValues[setting.key] || draftValues[setting.key] === originalValues[setting.key]) {
        draftValues[setting.key] = currentValue
      }
      originalValues[setting.key] = currentValue
    }
  }

  const providerGroupsForSetting = (setting: MediaDefaultModelSettingSpec): ProviderWithModels[] => (
    setting.catalogKind === 'audio'
      ? modelCatalogStore.audioProvidersWithModels
      : modelCatalogStore.imageProvidersWithModels
  )

  const optionForModel = (providerName: string, model: ModelInfo) => ({
    id: model.modelIdentifier,
    name: getModelSelectionOptionLabel(model, MEDIA_MODEL_RUNTIME_KIND),
    selectedLabel: getModelSelectionSelectedLabel(providerName, model, MEDIA_MODEL_RUNTIME_KIND),
  })

  const catalogOptionsForSetting = (setting: MediaDefaultModelSettingSpec): GroupedOption[] =>
    providerGroupsForSetting(setting)
      .filter((providerGroup) => Array.isArray(providerGroup.models) && providerGroup.models.length > 0)
      .map((providerGroup) => ({
        label: providerGroup.provider.name,
        items: providerGroup.models.map((model) => optionForModel(providerGroup.provider.name, model)),
      }))

  const catalogContainsModel = (setting: MediaDefaultModelSettingSpec, modelIdentifier: string | null | undefined): boolean => {
    const normalizedIdentifier = normalizeSettingValue(modelIdentifier)
    if (!normalizedIdentifier) return false
    return providerGroupsForSetting(setting).some((providerGroup) =>
      providerGroup.models.some((model) => model.modelIdentifier === normalizedIdentifier),
    )
  }

  const isMissingFromCatalog = (setting: MediaDefaultModelSettingSpec, modelIdentifier: string | null | undefined): boolean => {
    const normalizedIdentifier = normalizeSettingValue(modelIdentifier)
    return Boolean(normalizedIdentifier && hasCatalogLoadResult.value && !catalogContainsModel(setting, normalizedIdentifier))
  }

  const currentOptionLabel = (setting: MediaDefaultModelSettingSpec, modelIdentifier: string): string => {
    const labelKey = explicitSettingValue(setting.key)
      ? 'settings.components.settings.MediaDefaultModelsCard.currentOptionLabel'
      : 'settings.components.settings.MediaDefaultModelsCard.fallbackOptionLabel'
    return t(labelKey, { value: modelIdentifier })
  }

  const optionsForSetting = (setting: MediaDefaultModelSettingSpec): GroupedOption[] => {
    const catalogOptions = catalogOptionsForSetting(setting)
    const currentValue = normalizeSettingValue(draftValues[setting.key] || originalValues[setting.key])
    if (!currentValue || catalogContainsModel(setting, currentValue)) return catalogOptions

    return [
      {
        label: t('settings.components.settings.MediaDefaultModelsCard.currentSettingGroup'),
        items: [{ id: currentValue, name: currentOptionLabel(setting, currentValue), selectedLabel: currentOptionLabel(setting, currentValue) }],
      },
      ...catalogOptions,
    ]
  }

  const save = async (): Promise<void> => {
    if (!isDirty.value || isSaving.value) return
    isSaving.value = true
    saveErrorMessage.value = ''
    successMessage.value = ''

    try {
      for (const setting of changedSettings.value) {
        const value = draftValues[setting.key]
        await serverSettingsStore.updateServerSetting(setting.key, value)
        originalValues[setting.key] = value
      }
      successMessage.value = t('settings.components.settings.MediaDefaultModelsCard.saveSuccess')
    } catch (error: any) {
      saveErrorMessage.value = error?.message || t('settings.components.settings.MediaDefaultModelsCard.saveFailed')
    } finally {
      isSaving.value = false
    }
  }

  watch(() => serverSettingsStore.settings, syncFromStore, { deep: true, immediate: true })
  onMounted(() => {
    void modelCatalogStore.fetchProvidersWithModels(MEDIA_MODEL_RUNTIME_KIND)
      .then(() => { catalogErrorMessage.value = '' })
      .catch((error: any) => {
        catalogErrorMessage.value = error?.message || t('settings.components.settings.MediaDefaultModelsCard.catalogLoadFailed')
      })
  })

  return {
    MEDIA_DEFAULT_MODEL_SETTINGS,
    draftValues,
    isSaving,
    isCatalogLoading,
    isDirty,
    successMessage,
    displayErrorMessage,
    optionsForSetting,
    isMissingFromCatalog,
    save,
    t,
  }
}
