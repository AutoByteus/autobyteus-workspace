<template>
  <div class="server-settings-manager h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto p-8 pt-6 bg-slate-50">
      <div v-if="store.isLoading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="store.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ store.error }}</p>
      </div>

      <div v-else class="space-y-6">
        <div v-if="activeTab === 'quick'" class="space-y-6 max-w-7xl mx-auto rounded-3xl bg-white/70 p-4 md:p-5">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section
              v-for="field in quickSetupFields"
              :key="field.key"
              class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
              :data-testid="`quick-setting-card-${field.key}`"
            >
              <div class="flex items-start justify-between gap-3 mb-4">
                <div class="min-w-0">
                  <p class="text-2xl font-semibold leading-tight text-gray-900">{{ field.label }}</p>
                  <p class="mt-1 text-sm text-gray-500">{{ field.description }}</p>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    :class="iconActionButtonClass"
                    :data-testid="`quick-setting-add-row-${field.key}`"
                    aria-label="Add endpoint"
                    title="Add endpoint"
                    @click="addQuickEndpointRow(field.key)"
                  >
                    <Icon icon="heroicons:plus" class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :class="iconSaveButtonClass"
                    :disabled="isQuickSettingSaveBlocked(field.key)"
                    :data-testid="`quick-setting-save-${field.key}`"
                    aria-label="Save endpoints"
                    title="Save endpoints"
                    @click="saveQuickSetting(field.key)"
                  >
                    <span
                      v-if="isQuickSettingUpdating(field.key)"
                      class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 inline-block"
                    ></span>
                    <Icon v-else icon="heroicons:check" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="space-y-2.5">
                <div
                  v-for="row in quickEndpointRows[field.key]"
                  :key="row.id"
                  class="grid gap-2"
                >
                  <div v-if="field.format === 'url'" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <select
                      v-model="row.protocol"
                      class="sm:col-span-3 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      :data-testid="`quick-row-protocol-${field.key}-${row.id}`"
                      @change="onQuickEndpointRowChange(field.key)"
                    >
                      <option v-for="protocol in getProtocolOptions(field)" :key="protocol" :value="protocol">
                        {{ protocol }}
                      </option>
                    </select>

                    <input
                      v-model="row.host"
                      type="text"
                      class="sm:col-span-6 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Host"
                      :data-testid="`quick-row-host-${field.key}-${row.id}`"
                      @input="onQuickEndpointRowChange(field.key)"
                    >

                    <input
                      v-model="row.port"
                      type="text"
                      class="sm:col-span-2 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Port"
                      :data-testid="`quick-row-port-${field.key}-${row.id}`"
                      @input="onQuickEndpointRowChange(field.key)"
                    >

                    <button
                      type="button"
                      class="sm:col-span-1 h-11 inline-flex items-center justify-center rounded-lg border border-transparent text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors"
                      :data-testid="`quick-row-remove-${field.key}-${row.id}`"
                      @click="removeQuickEndpointRow(field.key, row.id)"
                    >
                      <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                    </button>
                  </div>

                  <div v-else class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      v-model="row.host"
                      type="text"
                      class="sm:col-span-8 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Host"
                      :data-testid="`quick-row-host-${field.key}-${row.id}`"
                      @input="onQuickEndpointRowChange(field.key)"
                    >

                    <input
                      v-model="row.port"
                      type="text"
                      class="sm:col-span-3 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Port"
                      :data-testid="`quick-row-port-${field.key}-${row.id}`"
                      @input="onQuickEndpointRowChange(field.key)"
                    >

                    <button
                      type="button"
                      class="sm:col-span-1 h-11 inline-flex items-center justify-center rounded-lg border border-transparent text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors"
                      :data-testid="`quick-row-remove-${field.key}-${row.id}`"
                      @click="removeQuickEndpointRow(field.key, row.id)"
                    >
                      <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-4 border-t border-gray-100 pt-3 flex min-h-[1.25rem] items-center justify-end gap-2">
                <p v-if="isQuickSettingChanged(field.key) && hasQuickSettingValidationErrors(field.key)" class="text-sm text-red-600">
                  Complete host and use a valid port (1-65535).
                </p>
                <p v-else-if="isQuickSettingChanged(field.key)" class="text-sm text-slate-500">
                  Unsaved changes
                </p>
              </div>

              <input
                :value="quickEditedSettings[field.key]"
                type="text"
                class="sr-only"
                :data-testid="`quick-setting-value-${field.key}`"
                readonly
                tabindex="-1"
                aria-hidden="true"
              >
            </section>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h3 class="text-2xl font-semibold leading-tight text-gray-900">Web Search Configuration</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    Integrate web search with your models
                  </p>
                </div>
                <button
                  type="button"
                  :class="iconSaveButtonClass"
                  :disabled="!canSaveSearchConfig || isSavingSearchConfig"
                  aria-label="Save web search configuration"
                  title="Save web search configuration"
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
                    <option value="">Choose a provider...</option>
                    <option v-for="option in searchProviderOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>

                <div v-if="selectedSearchProvider === 'serper'" class="space-y-2">
                  <label class="block text-sm font-medium text-gray-900">Serper API Key</label>
                  <input
                    v-model="searchForm.serperApiKey"
                    type="password"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter Serper API key"
                    data-testid="search-serper-api-key"
                    @blur="markSearchFormTouched"
                  >
                  <p v-if="store.searchConfig.serperApiKeyConfigured" class="text-xs text-gray-500">
                    A Serper API key is already configured.
                  </p>
                </div>

                <div v-if="selectedSearchProvider === 'serpapi'" class="space-y-2">
                  <label class="block text-sm font-medium text-gray-900">SerpApi API Key</label>
                  <input
                    v-model="searchForm.serpapiApiKey"
                    type="password"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter SerpApi API key"
                    data-testid="search-serpapi-api-key"
                    @blur="markSearchFormTouched"
                  >
                  <p v-if="store.searchConfig.serpapiApiKeyConfigured" class="text-xs text-gray-500">
                    A SerpApi API key is already configured.
                  </p>
                </div>

                <div v-if="selectedSearchProvider === 'google_cse'" class="space-y-2">
                  <label class="block text-sm font-medium text-gray-900">Google CSE API Key</label>
                  <input
                    v-model="searchForm.googleCseApiKey"
                    type="password"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter Google CSE API key"
                    data-testid="search-google-cse-api-key"
                    @blur="markSearchFormTouched"
                  >
                  <label class="block text-sm font-medium text-gray-900">Google CSE ID</label>
                  <input
                    v-model="searchForm.googleCseId"
                    type="text"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter Google CSE ID"
                    data-testid="search-google-cse-id"
                    @blur="markSearchFormTouched"
                  >
                  <p v-if="store.searchConfig.googleCseApiKeyConfigured" class="text-xs text-gray-500">
                    A Google CSE API key is already configured.
                  </p>
                </div>

                <div v-if="selectedSearchProvider === 'vertex_ai_search'" class="space-y-2">
                  <label class="block text-sm font-medium text-gray-900">Vertex AI Search API Key</label>
                  <input
                    v-model="searchForm.vertexAiSearchApiKey"
                    type="password"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter Vertex AI Search API key"
                    data-testid="search-vertex-ai-api-key"
                    @blur="markSearchFormTouched"
                  >
                  <label class="block text-sm font-medium text-gray-900">Serving Config Path</label>
                  <input
                    v-model="searchForm.vertexAiSearchServingConfig"
                    type="text"
                    class="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="projects/{project}/locations/{location}/collections/{collection}/engines/{engine}/servingConfigs/{servingConfig}"
                    data-testid="search-vertex-serving-config"
                    @blur="markSearchFormTouched"
                  >
                  <p v-if="store.searchConfig.vertexAiSearchApiKeyConfigured" class="text-xs text-gray-500">
                    A Vertex AI Search API key is already configured.
                  </p>
                </div>

                <p v-if="displayedSearchConfigValidationError" class="text-sm text-red-600">
                  {{ displayedSearchConfigValidationError }}
                </p>
              </div>
            </section>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="px-1 pt-1 pb-2">
            <div class="flex items-center gap-8">
              <button
                type="button"
                class="pb-2 text-lg border-b-2 transition-colors"
                :class="advancedPanel === 'raw-settings' ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'"
                @click="advancedPanel = 'raw-settings'"
              >
                All Settings
              </button>
              <button
                v-if="canAccessEmbeddedDiagnostics"
                type="button"
                class="pb-2 text-lg border-b-2 transition-colors"
                :class="advancedPanel === 'server-status' ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'"
                @click="advancedPanel = 'server-status'"
              >
                Server Status & Logs
              </button>
            </div>
          </div>

          <div v-if="canAccessEmbeddedDiagnostics && advancedPanel === 'server-status'" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <ServerMonitor />
          </div>

          <div v-else class="overflow-x-auto">
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-blue-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider" style="width: 25%">Setting</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider" style="width: 25%">Value</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider" style="width: 40%">Description</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase tracking-wider" style="width: 10%">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="setting in store.settings" :key="setting.key" class="hover:bg-gray-50 transition-colors duration-150">
                    <td class="px-6 py-4 align-middle">
                      <div class="text-sm font-medium text-gray-900 break-all" :title="setting.key">{{ setting.key }}</div>
                    </td>
                    <td class="px-6 py-4 align-middle">
                      <input
                        v-model="editedSettings[setting.key]"
                        type="text"
                        :data-testid="`server-setting-value-${setting.key}`"
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors duration-150 text-gray-900 placeholder-gray-500"
                        placeholder="Enter value"
                      >
                    </td>
                    <td class="px-6 py-4 align-middle">
                      <div class="text-sm text-gray-700">{{ setting.description }}</div>
                    </td>
                    <td class="px-6 py-4 text-right align-middle">
                      <div class="inline-flex items-center justify-end gap-2">
                        <button
                          v-if="isDeletableSetting(setting)"
                          @click="deleteIndividualSetting(setting.key)"
                          :disabled="isRemoving[setting.key] || store.isUpdating"
                          :data-testid="`server-setting-remove-${setting.key}`"
                          :class="iconRemoveButtonClass"
                          :aria-label="`Remove ${setting.key}`"
                          :title="`Remove ${setting.key}`"
                        >
                          <span v-if="isRemoving[setting.key]" class="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 inline-block"></span>
                          <Icon v-else icon="heroicons:trash" class="w-4 h-4" />
                        </button>
                        <button
                          @click="saveIndividualSetting(setting.key)"
                          :disabled="!isSettingChanged(setting.key) || store.isUpdating"
                          :data-testid="`server-setting-save-${setting.key}`"
                          :class="iconSaveButtonClass"
                          :aria-label="`Save ${setting.key}`"
                          :title="`Save ${setting.key}`"
                        >
                          <span v-if="isUpdating[setting.key]" class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 inline-block"></span>
                          <Icon v-else icon="heroicons:check" class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr class="bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
                    <td class="px-6 py-4 align-middle">
                      <input
                        v-model="newSetting.key"
                        type="text"
                        placeholder="Enter new setting key"
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      >
                    </td>
                    <td class="px-6 py-4 align-middle">
                      <input
                        v-model="newSetting.value"
                        type="text"
                        placeholder="Enter value"
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      >
                    </td>
                    <td class="px-6 py-4 align-middle">
                      <div class="text-sm text-gray-500 italic">Custom user-defined setting</div>
                    </td>
                    <td class="px-6 py-4 text-right align-middle">
                      <button
                        @click="addNewSetting"
                        :disabled="!isNewSettingValid || isAddingNewSetting"
                        :class="saveButtonClass"
                      >
                        <span v-if="isAddingNewSetting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 inline-block"></span>
                        <span v-else class="i-heroicons-check-20-solid w-4 h-4"></span>
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="advancedPanel === 'raw-settings' && newSettingError" class="mt-2 text-sm text-red-600">
            {{ newSettingError }}
          </div>
        </div>
      </div>

      <div
        v-if="notification"
        class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
        :class="notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useServerSettingsStore, type SearchProvider } from '~/stores/serverSettings'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import ServerMonitor from '~/components/server/ServerMonitor.vue'

type SettingsTab = 'quick' | 'advanced'
type AdvancedPanel = 'raw-settings' | 'server-status'
type QuickFieldFormat = 'url' | 'hostPort'

interface QuickSetupField {
  key: string
  label: string
  description: string
  format: QuickFieldFormat
  defaultProtocol: string
}

interface QuickEndpointRow {
  id: string
  protocol: string
  host: string
  port: string
  path: string
}

const VNC_HOSTS_KEY = 'AUTOBYTEUS_VNC_SERVER_HOSTS'

const quickSetupFields: QuickSetupField[] = [
  {
    key: 'LMSTUDIO_HOSTS',
    label: 'LM Studio',
    description: 'Local LLM inference server',
    format: 'url',
    defaultProtocol: 'http',
  },
  {
    key: 'OLLAMA_HOSTS',
    label: 'Ollama',
    description: 'Run open-source models locally',
    format: 'url',
    defaultProtocol: 'http',
  },
  {
    key: 'AUTOBYTEUS_LLM_SERVER_HOSTS',
    label: 'AutoByteus LLM Hosts',
    description: 'Remote language model providers',
    format: 'url',
    defaultProtocol: 'https',
  },
  {
    key: VNC_HOSTS_KEY,
    label: 'AutoByteus VNC Hosts',
    description: 'Remote desktop access',
    format: 'hostPort',
    defaultProtocol: 'ws',
  },
]

const searchProviderOptions: Array<{ value: SearchProvider; label: string }> = [
  { value: 'serper', label: 'Serper' },
  { value: 'serpapi', label: 'SerpApi' },
  { value: 'google_cse', label: 'Google CSE' },
  { value: 'vertex_ai_search', label: 'Vertex AI Search' },
]

const saveButtonClass =
  'inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150'
const iconActionButtonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-100 transition-colors duration-150'
const iconSaveButtonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150'
const iconRemoveButtonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150'

const props = withDefaults(defineProps<{ sectionMode?: SettingsTab }>(), {
  sectionMode: 'quick',
})

const store = useServerSettingsStore()
const windowNodeContextStore = useWindowNodeContextStore()
const canAccessEmbeddedDiagnostics = computed(() => windowNodeContextStore.isEmbeddedWindow)
const activeTab = ref<SettingsTab>(props.sectionMode)
const advancedPanel = ref<AdvancedPanel>('raw-settings')
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const editedSettings = reactive<Record<string, string>>({})
const originalSettings = reactive<Record<string, string>>({})
const isUpdating = reactive<Record<string, boolean>>({})
const isRemoving = reactive<Record<string, boolean>>({})

const quickEditedSettings = reactive<Record<string, string>>({})
const quickOriginalSettings = reactive<Record<string, string>>({})
const quickIsUpdating = reactive<Record<string, boolean>>({})
const quickEndpointRows = reactive<Record<string, QuickEndpointRow[]>>({})
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

const newSetting = reactive({
  key: '',
  value: '',
})
const newSettingError = ref('')
const isAddingNewSetting = ref(false)

const quickFieldByKey = computed(() => {
  const map = new Map<string, QuickSetupField>()
  quickSetupFields.forEach(field => map.set(field.key, field))
  return map
})

const protocolOptionsByFormat: Record<QuickFieldFormat, string[]> = {
  url: ['http', 'https'],
  hostPort: ['ws', 'wss'],
}

const getQuickField = (key: string): QuickSetupField => {
  const field = quickFieldByKey.value.get(key)
  if (!field) {
    throw new Error(`Unknown quick setup field: ${key}`)
  }
  return field
}

const createEndpointRowId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const createQuickEndpointRow = (field: QuickSetupField): QuickEndpointRow => ({
  id: createEndpointRowId(),
  protocol: field.defaultProtocol,
  host: '',
  port: '',
  path: '',
})

const splitEndpointTokens = (rawValue: string): string[] =>
  rawValue
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)

const normalizePath = (path: string): string => {
  const trimmed = path.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const parseUrlTokenToRow = (field: QuickSetupField, token: string): QuickEndpointRow => {
  const match = token.match(/^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/i)
  if (!match) {
    return {
      ...createQuickEndpointRow(field),
      host: token,
    }
  }

  return {
    ...createQuickEndpointRow(field),
    protocol: (match[1] ?? field.defaultProtocol).toLowerCase(),
    host: match[2] ?? '',
    port: match[3] ?? '',
    path: match[4] ?? '',
  }
}

const parseHostPortTokenToRow = (field: QuickSetupField, token: string): QuickEndpointRow => {
  const match = token.match(/^(?:(ws|wss):\/\/)?([^/:]+)(?::(\d+))?$/i)
  if (!match) {
    return {
      ...createQuickEndpointRow(field),
      host: token,
    }
  }

  return {
    ...createQuickEndpointRow(field),
    protocol: (match[1] ?? field.defaultProtocol).toLowerCase(),
    host: match[2] ?? '',
    port: match[3] ?? '',
  }
}

const parseQuickSettingValue = (key: string, rawValue: string): QuickEndpointRow[] => {
  const field = getQuickField(key)
  const tokens = splitEndpointTokens(rawValue)

  if (tokens.length === 0) {
    return [createQuickEndpointRow(field)]
  }

  const rows = tokens.map(token => (
    field.format === 'url'
      ? parseUrlTokenToRow(field, token)
      : parseHostPortTokenToRow(field, token)
  ))

  return rows.length > 0 ? rows : [createQuickEndpointRow(field)]
}

const quickRowHasAnyValue = (_field: QuickSetupField, row: QuickEndpointRow): boolean => {
  return Boolean(row.host.trim()) || Boolean(row.port.trim()) || Boolean(row.path.trim())
}

const isValidPort = (port: string): boolean => {
  const trimmed = port.trim()
  if (!/^\d+$/.test(trimmed)) return false
  const numeric = Number(trimmed)
  return numeric >= 1 && numeric <= 65535
}

const quickRowIsInvalid = (field: QuickSetupField, row: QuickEndpointRow): boolean => {
  if (!quickRowHasAnyValue(field, row)) return false
  if (!row.host.trim()) return true
  if (!isValidPort(row.port)) return true
  if (field.format === 'url' && !row.protocol.trim()) return true
  return false
}

const serializeQuickRows = (key: string): string => {
  const field = getQuickField(key)
  const rows = quickEndpointRows[key] ?? []

  const serializedRows = rows
    .filter(row => quickRowHasAnyValue(field, row))
    .map((row) => {
      const protocol = row.protocol.trim() || field.defaultProtocol
      const host = row.host.trim() || 'localhost'
      const port = row.port.trim()

      if (field.format === 'url') {
        const path = normalizePath(row.path)
        let endpoint = `${protocol}://${host}`
        if (port) endpoint += `:${port}`
        endpoint += path
        return endpoint
      }

      return port ? `${host}:${port}` : host
    })

  return serializedRows.join(',')
}

const syncQuickRowsFromValue = (key: string, rawValue: string) => {
  quickEndpointRows[key] = parseQuickSettingValue(key, rawValue)
}

const onQuickEndpointRowChange = (key: string) => {
  quickEditedSettings[key] = serializeQuickRows(key)
}

const addQuickEndpointRow = (key: string) => {
  const field = getQuickField(key)
  if (!Array.isArray(quickEndpointRows[key])) {
    quickEndpointRows[key] = []
  }
  quickEndpointRows[key].push(createQuickEndpointRow(field))
  onQuickEndpointRowChange(key)
}

const removeQuickEndpointRow = (key: string, rowId: string) => {
  const field = getQuickField(key)
  const existingRows = quickEndpointRows[key] ?? []
  const remainingRows = existingRows.filter(row => row.id !== rowId)
  quickEndpointRows[key] = remainingRows.length > 0 ? remainingRows : [createQuickEndpointRow(field)]
  onQuickEndpointRowChange(key)
}

const hasQuickSettingValidationErrors = (key: string): boolean => {
  const field = getQuickField(key)
  const rows = quickEndpointRows[key] ?? []
  return rows.some(row => quickRowIsInvalid(field, row))
}

const getProtocolOptions = (field: QuickSetupField): string[] => protocolOptionsByFormat[field.format]

const isNewSettingValid = computed(() => {
  newSettingError.value = ''

  if (!newSetting.key.trim()) {
    return false
  }

  const keyExists = store.settings.some(setting => setting.key === newSetting.key)
  if (keyExists) {
    newSettingError.value = 'Setting with this key already exists'
    return false
  }

  return true
})

const CUSTOM_SETTING_DESCRIPTION = 'Custom user-defined setting'
const isSettingChanged = (key: string) => editedSettings[key] !== originalSettings[key]
const isQuickSettingChanged = (key: string) => quickEditedSettings[key] !== quickOriginalSettings[key]
const isQuickSettingUpdating = (key: string) => quickIsUpdating[key] === true
const isDeletableSetting = (setting: { description: string }) => setting.description === CUSTOM_SETTING_DESCRIPTION

const isQuickSettingSaveBlocked = (key: string) =>
  !isQuickSettingChanged(key) || isQuickSettingUpdating(key) || hasQuickSettingValidationErrors(key)

const searchConfigValidationError = computed(() => {
  const provider = selectedSearchProvider.value
  if (!provider) return 'Please select a search provider.'

  const hasSerperKey = Boolean(searchForm.serperApiKey.trim()) || store.searchConfig.serperApiKeyConfigured
  const hasSerpapiKey = Boolean(searchForm.serpapiApiKey.trim()) || store.searchConfig.serpapiApiKeyConfigured
  const hasGoogleApiKey =
    Boolean(searchForm.googleCseApiKey.trim()) || store.searchConfig.googleCseApiKeyConfigured
  const hasGoogleId = Boolean(searchForm.googleCseId.trim())
  const hasVertexApiKey =
    Boolean(searchForm.vertexAiSearchApiKey.trim()) || store.searchConfig.vertexAiSearchApiKeyConfigured
  const hasVertexServingConfig = Boolean(searchForm.vertexAiSearchServingConfig.trim())

  if (provider === 'serper' && !hasSerperKey) {
    return 'Serper API key is required.'
  }
  if (provider === 'serpapi' && !hasSerpapiKey) {
    return 'SerpApi API key is required.'
  }
  if (provider === 'google_cse' && (!hasGoogleApiKey || !hasGoogleId)) {
    return 'Google CSE API key and Google CSE ID are required.'
  }
  if (provider === 'vertex_ai_search' && (!hasVertexApiKey || !hasVertexServingConfig)) {
    return 'Vertex AI Search API key and serving config path are required.'
  }

  return ''
})

const hasSearchConfigChanges = computed(() => {
  const existingProvider = store.searchConfig.provider
  if (!selectedSearchProvider.value) return false

  if (selectedSearchProvider.value !== existingProvider) {
    return true
  }

  if (searchForm.serperApiKey.trim() || searchForm.serpapiApiKey.trim()) {
    return true
  }
  if (searchForm.googleCseApiKey.trim() || searchForm.vertexAiSearchApiKey.trim()) {
    return true
  }
  if (searchForm.googleCseId.trim() !== (store.searchConfig.googleCseId ?? '')) {
    return true
  }
  if (
    searchForm.vertexAiSearchServingConfig.trim() !== (store.searchConfig.vertexAiSearchServingConfig ?? '')
  ) {
    return true
  }

  return false
})

const canSaveSearchConfig = computed(() =>
  Boolean(selectedSearchProvider.value) &&
  !searchConfigValidationError.value &&
  hasSearchConfigChanges.value,
)

const displayedSearchConfigValidationError = computed(() => {
  if (!hasAttemptedSearchSave.value && !isSearchFormTouched.value) {
    return ''
  }
  return searchConfigValidationError.value
})

const markSearchFormTouched = () => {
  isSearchFormTouched.value = true
}

watch(
  () => props.sectionMode,
  (newMode) => {
    activeTab.value = newMode
  },
)

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

watch(
  () => store.settings,
  (newSettings) => {
    if (!Array.isArray(newSettings)) return

    const settingsMap = new Map(newSettings.map(setting => [setting.key, setting.value]))
    const seenRawKeys = new Set<string>()

    newSettings.forEach((setting) => {
      seenRawKeys.add(setting.key)

      const hasEditedValue = Object.prototype.hasOwnProperty.call(editedSettings, setting.key)
      const currentEdited = editedSettings[setting.key]
      const currentOriginal = originalSettings[setting.key]

      if (!hasEditedValue || currentEdited === currentOriginal) {
        editedSettings[setting.key] = setting.value
      }

      originalSettings[setting.key] = setting.value

      if (!(setting.key in isUpdating)) {
        isUpdating[setting.key] = false
      }
      if (!(setting.key in isRemoving)) {
        isRemoving[setting.key] = false
      }
    })

    Object.keys(editedSettings).forEach((key) => {
      if (!seenRawKeys.has(key)) {
        delete editedSettings[key]
        delete originalSettings[key]
        delete isUpdating[key]
        delete isRemoving[key]
      }
    })

    quickSetupFields.forEach((field) => {
      const currentValue = settingsMap.get(field.key) ?? ''
      const hasEditedValue = Object.prototype.hasOwnProperty.call(quickEditedSettings, field.key)
      const currentEdited = quickEditedSettings[field.key]
      const currentOriginal = quickOriginalSettings[field.key]

      if (!hasEditedValue || currentEdited === currentOriginal) {
        quickEditedSettings[field.key] = currentValue
        syncQuickRowsFromValue(field.key, currentValue)
      } else if (!Array.isArray(quickEndpointRows[field.key]) || quickEndpointRows[field.key].length === 0) {
        syncQuickRowsFromValue(field.key, currentEdited)
      }

      quickOriginalSettings[field.key] = currentValue

      if (!(field.key in quickIsUpdating)) {
        quickIsUpdating[field.key] = false
      }
    })
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    await store.fetchServerSettings()
    await store.fetchSearchConfig()
    applySearchConfigToForm()
  } catch (error) {
    console.error('Failed to load server settings or search config:', error)
    showNotification('Failed to load quick setup configuration', 'error')
  }
})

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

const saveQuickSetting = async (key: string) => {
  if (!isQuickSettingChanged(key) || hasQuickSettingValidationErrors(key)) return

  quickIsUpdating[key] = true
  try {
    await store.updateServerSetting(key, quickEditedSettings[key])
    quickOriginalSettings[key] = quickEditedSettings[key]
    showNotification(`Setting "${key}" saved successfully`, 'success')
  } catch (error: any) {
    showNotification(error.message || `Failed to save setting "${key}"`, 'error')
  } finally {
    quickIsUpdating[key] = false
  }
}

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
    showNotification('Search configuration saved successfully', 'success')
  } catch (error: any) {
    showNotification(error.message || 'Failed to save search configuration', 'error')
  } finally {
    isSavingSearchConfig.value = false
  }
}

const saveIndividualSetting = async (key: string) => {
  if (!isSettingChanged(key)) return

  isUpdating[key] = true

  try {
    await store.updateServerSetting(key, editedSettings[key])
    originalSettings[key] = editedSettings[key]
    showNotification(`Setting "${key}" saved successfully`, 'success')
  } catch (error: any) {
    showNotification(error.message || `Failed to save setting "${key}"`, 'error')
  } finally {
    isUpdating[key] = false
  }
}

const deleteIndividualSetting = async (key: string) => {
  isRemoving[key] = true

  try {
    await store.deleteServerSetting(key)
    showNotification(`Setting "${key}" removed successfully`, 'success')
  } catch (error: any) {
    showNotification(error.message || `Failed to remove setting "${key}"`, 'error')
  } finally {
    isRemoving[key] = false
  }
}

const addNewSetting = async () => {
  if (!isNewSettingValid.value) return

  isAddingNewSetting.value = true

  try {
    await store.updateServerSetting(newSetting.key, newSetting.value)
    await store.fetchServerSettings()

    store.settings.forEach(setting => {
      if (!(setting.key in editedSettings)) {
        editedSettings[setting.key] = setting.value
        originalSettings[setting.key] = setting.value
        isUpdating[setting.key] = false
        isRemoving[setting.key] = false
      }
    })

    newSetting.key = ''
    newSetting.value = ''
    showNotification('Custom setting added successfully', 'success')
  } catch (error: any) {
    newSettingError.value = error.message || 'Failed to add custom setting'
    showNotification(error.message || 'Failed to add custom setting', 'error')
  } finally {
    isAddingNewSetting.value = false
  }
}
</script>
