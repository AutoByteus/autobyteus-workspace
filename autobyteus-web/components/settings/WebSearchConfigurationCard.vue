<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
      <div>
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.web_search_configuration') }}</h3>
        <p class="text-sm text-gray-500 mt-1">{{ $t('settings.components.settings.ServerSettingsManager.integrate_web_search_with_your_models') }}</p>
      </div>
      <button
        type="button"
        :class="iconSaveButtonClass"
        :disabled="!canSaveSearchConfig || isSavingSearchConfig"
        :aria-label="$t('settings.components.settings.ServerSettingsManager.save_web_search_configuration')"
        :title="$t('settings.components.settings.ServerSettingsManager.save_web_search_configuration')"
        @click="saveSearchConfig"
      >
        <span
          v-if="isSavingSearchConfig"
          class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 inline-block"
        ></span>
        <Icon v-else icon="heroicons:check" class="w-4 h-4" />
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <select
          v-model="selectedSearchProvider"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          data-testid="search-provider-select"
          @blur="markSearchFormTouched"
        >
          <option value="">{{ $t('settings.components.settings.ServerSettingsManager.choose_a_provider') }}</option>
          <option v-for="option in searchProviderOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div v-if="selectedSearchProvider === 'serper'" class="space-y-2">
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.serper_api_key') }}</label>
        <input
          v-model="searchForm.serperApiKey"
          type="password"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_serper_api_key')"
          data-testid="search-serper-api-key"
          @blur="markSearchFormTouched"
        >
        <p v-if="store.searchConfig.serperApiKeyConfigured" class="text-xs text-gray-500">{{ $t('settings.components.settings.ServerSettingsManager.a_serper_api_key_is_already') }}</p>
      </div>

      <div v-if="selectedSearchProvider === 'serpapi'" class="space-y-2">
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.serpapi_api_key') }}</label>
        <input
          v-model="searchForm.serpapiApiKey"
          type="password"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_serpapi_api_key')"
          data-testid="search-serpapi-api-key"
          @blur="markSearchFormTouched"
        >
        <p v-if="store.searchConfig.serpapiApiKeyConfigured" class="text-xs text-gray-500">{{ $t('settings.components.settings.ServerSettingsManager.a_serpapi_api_key_is_already') }}</p>
      </div>

      <div v-if="selectedSearchProvider === 'google_cse'" class="space-y-2">
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.google_cse_api_key') }}</label>
        <input
          v-model="searchForm.googleCseApiKey"
          type="password"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_google_cse_api_key')"
          data-testid="search-google-cse-api-key"
          @blur="markSearchFormTouched"
        >
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.google_cse_id') }}</label>
        <input
          v-model="searchForm.googleCseId"
          type="text"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_google_cse_id')"
          data-testid="search-google-cse-id"
          @blur="markSearchFormTouched"
        >
        <p v-if="store.searchConfig.googleCseApiKeyConfigured" class="text-xs text-gray-500">{{ $t('settings.components.settings.ServerSettingsManager.a_google_cse_api_key_is') }}</p>
      </div>

      <div v-if="selectedSearchProvider === 'vertex_ai_search'" class="space-y-2">
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.vertex_ai_search_api_key') }}</label>
        <input
          v-model="searchForm.vertexAiSearchApiKey"
          type="password"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_vertex_ai_search_api_key')"
          data-testid="search-vertex-ai-api-key"
          @blur="markSearchFormTouched"
        >
        <label class="block text-sm font-medium text-gray-900">{{ $t('settings.components.settings.ServerSettingsManager.serving_config_path') }}</label>
        <input
          v-model="searchForm.vertexAiSearchServingConfig"
          type="text"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          :placeholder="$t('settings.components.settings.ServerSettingsManager.projects_locations_collections_engines_servingco')"
          data-testid="search-vertex-serving-config"
          @blur="markSearchFormTouched"
        >
        <p v-if="store.searchConfig.vertexAiSearchApiKeyConfigured" class="text-xs text-gray-500">{{ $t('settings.components.settings.ServerSettingsManager.a_vertex_ai_search_api_key') }}</p>
      </div>

      <p v-if="displayedSearchConfigValidationError" class="text-sm text-red-600">
        {{ displayedSearchConfigValidationError }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useServerSettingsStore, type SearchProvider } from '~/stores/serverSettings'

type NotificationPayload = { type: 'success' | 'error'; message: string }
const emit = defineEmits<{ notify: [payload: NotificationPayload] }>()

const searchProviderOptions: Array<{ value: SearchProvider; label: string }> = [
  { value: 'serper', label: 'Serper' },
  { value: 'serpapi', label: 'SerpApi' },
  { value: 'google_cse', label: 'Google CSE' },
  { value: 'vertex_ai_search', label: 'Vertex AI Search' },
]

const store = useServerSettingsStore()
const isSavingSearchConfig = ref(false)
const hasAttemptedSearchSave = ref(false)
const isSearchFormTouched = ref(false)
const selectedSearchProvider = ref<SearchProvider | ''>('')
const searchForm = reactive({
  serperApiKey: '',
  serpapiApiKey: '',
  googleCseApiKey: '',
  googleCseId: '',
  vertexAiSearchApiKey: '',
  vertexAiSearchServingConfig: '',
})

const searchConfigValidationError = computed(() => {
  const provider = selectedSearchProvider.value
  if (!provider) return 'Please select a search provider.'

  const hasSerperKey = Boolean(searchForm.serperApiKey.trim()) || store.searchConfig.serperApiKeyConfigured
  const hasSerpapiKey = Boolean(searchForm.serpapiApiKey.trim()) || store.searchConfig.serpapiApiKeyConfigured
  const hasGoogleApiKey = Boolean(searchForm.googleCseApiKey.trim()) || store.searchConfig.googleCseApiKeyConfigured
  const hasGoogleId = Boolean(searchForm.googleCseId.trim())
  const hasVertexApiKey = Boolean(searchForm.vertexAiSearchApiKey.trim()) || store.searchConfig.vertexAiSearchApiKeyConfigured
  const hasVertexServingConfig = Boolean(searchForm.vertexAiSearchServingConfig.trim())

  if (provider === 'serper' && !hasSerperKey) return 'Serper API key is required.'
  if (provider === 'serpapi' && !hasSerpapiKey) return 'SerpApi API key is required.'
  if (provider === 'google_cse' && (!hasGoogleApiKey || !hasGoogleId)) return 'Google CSE API key and Google CSE ID are required.'
  if (provider === 'vertex_ai_search' && (!hasVertexApiKey || !hasVertexServingConfig)) {
    return 'Vertex AI Search API key and serving config path are required.'
  }

  return ''
})

const hasSearchConfigChanges = computed(() => {
  const existingProvider = store.searchConfig.provider
  if (!selectedSearchProvider.value) return false
  if (selectedSearchProvider.value !== existingProvider) return true
  if (searchForm.serperApiKey.trim() || searchForm.serpapiApiKey.trim()) return true
  if (searchForm.googleCseApiKey.trim() || searchForm.vertexAiSearchApiKey.trim()) return true
  if (searchForm.googleCseId.trim() !== (store.searchConfig.googleCseId ?? '')) return true
  return searchForm.vertexAiSearchServingConfig.trim() !== (store.searchConfig.vertexAiSearchServingConfig ?? '')
})

const canSaveSearchConfig = computed(() =>
  Boolean(selectedSearchProvider.value) &&
  !searchConfigValidationError.value &&
  hasSearchConfigChanges.value,
)

const iconSaveButtonClass = computed(() => [
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:ring-0',
  canSaveSearchConfig.value && !isSavingSearchConfig.value
    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-200 hover:border-blue-700 hover:bg-blue-700'
    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-200 hover:bg-white',
])

const displayedSearchConfigValidationError = computed(() => {
  if (!hasAttemptedSearchSave.value && !isSearchFormTouched.value) return ''
  return searchConfigValidationError.value
})

const markSearchFormTouched = () => {
  isSearchFormTouched.value = true
}

const applySearchConfigToForm = () => {
  selectedSearchProvider.value = store.searchConfig.provider
  searchForm.serperApiKey = ''
  searchForm.serpapiApiKey = ''
  searchForm.googleCseApiKey = ''
  searchForm.googleCseId = store.searchConfig.googleCseId ?? ''
  searchForm.vertexAiSearchApiKey = ''
  searchForm.vertexAiSearchServingConfig = store.searchConfig.vertexAiSearchServingConfig ?? ''
  isSearchFormTouched.value = false
  hasAttemptedSearchSave.value = false
}

onMounted(async () => {
  try {
    await store.fetchSearchConfig()
    applySearchConfigToForm()
  } catch (error: any) {
    emit('notify', { message: error.message || 'Failed to load search configuration', type: 'error' })
  }
})

const saveSearchConfig = async () => {
  hasAttemptedSearchSave.value = true
  if (!canSaveSearchConfig.value || !selectedSearchProvider.value) return

  isSavingSearchConfig.value = true
  try {
    await store.setSearchConfig({
      provider: selectedSearchProvider.value,
      serperApiKey: searchForm.serperApiKey.trim() || null,
      serpapiApiKey: searchForm.serpapiApiKey.trim() || null,
      googleCseApiKey: searchForm.googleCseApiKey.trim() || null,
      googleCseId: searchForm.googleCseId.trim() || null,
      vertexAiSearchApiKey: searchForm.vertexAiSearchApiKey.trim() || null,
      vertexAiSearchServingConfig: searchForm.vertexAiSearchServingConfig.trim() || null,
    })
    applySearchConfigToForm()
    emit('notify', { message: 'Search configuration saved successfully', type: 'success' })
  } catch (error: any) {
    emit('notify', { message: error.message || 'Failed to save search configuration', type: 'error' })
  } finally {
    isSavingSearchConfig.value = false
  }
}
</script>
