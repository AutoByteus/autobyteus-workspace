<template>
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
            :aria-label="$t('settings.components.settings.ServerSettingsManager.add_endpoint')"
            :title="$t('settings.components.settings.ServerSettingsManager.add_endpoint')"
            @click="addQuickEndpointRow(field.key)"
          >
            <Icon icon="heroicons:plus" class="w-4 h-4" />
          </button>
          <button
            type="button"
            :class="iconSaveButtonClass"
            :disabled="isQuickSettingSaveBlocked(field.key)"
            :data-testid="`quick-setting-save-${field.key}`"
            :aria-label="$t('settings.components.settings.ServerSettingsManager.save_endpoints')"
            :title="$t('settings.components.settings.ServerSettingsManager.save_endpoints')"
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
              :placeholder="$t('settings.components.settings.ServerSettingsManager.host')"
              :data-testid="`quick-row-host-${field.key}-${row.id}`"
              @input="onQuickEndpointRowChange(field.key)"
            >

            <input
              v-model="row.port"
              type="text"
              class="sm:col-span-2 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              :placeholder="$t('settings.components.settings.ServerSettingsManager.port')"
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
              :placeholder="$t('settings.components.settings.ServerSettingsManager.host')"
              :data-testid="`quick-row-host-${field.key}-${row.id}`"
              @input="onQuickEndpointRowChange(field.key)"
            >

            <input
              v-model="row.port"
              type="text"
              class="sm:col-span-3 h-11 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              :placeholder="$t('settings.components.settings.ServerSettingsManager.port')"
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

      <div
        v-if="isQuickSettingChanged(field.key)"
        class="mt-3"
        :data-testid="`quick-setting-status-${field.key}`"
      >
        <p v-if="hasQuickSettingValidationErrors(field.key)" class="text-sm text-red-600">{{ $t('settings.components.settings.ServerSettingsManager.complete_host_and_use_a_valid') }}</p>
        <p v-else class="text-sm text-slate-500">{{ $t('settings.components.settings.ServerSettingsManager.unsaved_changes') }}</p>
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
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, reactive, watch } from 'vue'
import { useServerSettingsStore } from '~/stores/serverSettings'

type NotificationPayload = { type: 'success' | 'error'; message: string }
const emit = defineEmits<{ notify: [payload: NotificationPayload] }>()

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
  { key: 'LMSTUDIO_HOSTS', label: 'LM Studio', description: 'Local LLM inference server', format: 'url', defaultProtocol: 'http' },
  { key: 'OLLAMA_HOSTS', label: 'Ollama', description: 'Run open-source models locally', format: 'url', defaultProtocol: 'http' },
  { key: 'AUTOBYTEUS_LLM_SERVER_HOSTS', label: 'AutoByteus LLM Hosts', description: 'Remote language model providers', format: 'url', defaultProtocol: 'https' },
  { key: VNC_HOSTS_KEY, label: 'AutoByteus VNC Hosts', description: 'Remote desktop access', format: 'hostPort', defaultProtocol: 'ws' },
]

const iconActionButtonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-100 transition-colors duration-150'
const iconSaveButtonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150'

const store = useServerSettingsStore()
const quickEditedSettings = reactive<Record<string, string>>({})
const quickOriginalSettings = reactive<Record<string, string>>({})
const quickIsUpdating = reactive<Record<string, boolean>>({})
const quickEndpointRows = reactive<Record<string, QuickEndpointRow[]>>({})

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
  if (!field) throw new Error(`Unknown quick setup field: ${key}`)
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
  rawValue.split(',').map(token => token.trim()).filter(Boolean)

const normalizePath = (path: string): string => {
  const trimmed = path.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const parseUrlTokenToRow = (field: QuickSetupField, token: string): QuickEndpointRow => {
  const match = token.match(/^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/i)
  if (!match) return { ...createQuickEndpointRow(field), host: token }
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
  if (!match) return { ...createQuickEndpointRow(field), host: token }
  return {
    ...createQuickEndpointRow(field),
    protocol: (match[1] ?? field.defaultProtocol).toLowerCase(),
    host: match[2] ?? '',
    port: match[3] ?? '',
    path: '',
  }
}

const parseQuickSettingValue = (key: string, rawValue: string): QuickEndpointRow[] => {
  const field = getQuickField(key)
  const tokens = splitEndpointTokens(rawValue)
  if (tokens.length === 0) return [createQuickEndpointRow(field)]
  const rows = tokens.map(token => field.format === 'url' ? parseUrlTokenToRow(field, token) : parseHostPortTokenToRow(field, token))
  return rows.length > 0 ? rows : [createQuickEndpointRow(field)]
}

const quickRowHasAnyValue = (_field: QuickSetupField, row: QuickEndpointRow): boolean =>
  Boolean(row.host.trim()) || Boolean(row.port.trim()) || Boolean(row.path.trim())

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
  return rows
    .filter(row => quickRowHasAnyValue(field, row))
    .map((row) => {
      const protocol = row.protocol.trim() || field.defaultProtocol
      const host = row.host.trim() || 'localhost'
      const port = row.port.trim()
      if (field.format === 'url') {
        const path = normalizePath(row.path)
        return `${protocol}://${host}${port ? `:${port}` : ''}${path}`
      }
      return port ? `${host}:${port}` : host
    })
    .join(',')
}

const syncQuickRowsFromValue = (key: string, rawValue: string) => {
  quickEndpointRows[key] = parseQuickSettingValue(key, rawValue)
}

const onQuickEndpointRowChange = (key: string) => {
  quickEditedSettings[key] = serializeQuickRows(key)
}

const addQuickEndpointRow = (key: string) => {
  const field = getQuickField(key)
  if (!Array.isArray(quickEndpointRows[key])) quickEndpointRows[key] = []
  quickEndpointRows[key].push(createQuickEndpointRow(field))
  onQuickEndpointRowChange(key)
}

const removeQuickEndpointRow = (key: string, rowId: string) => {
  const field = getQuickField(key)
  const remainingRows = (quickEndpointRows[key] ?? []).filter(row => row.id !== rowId)
  quickEndpointRows[key] = remainingRows.length > 0 ? remainingRows : [createQuickEndpointRow(field)]
  onQuickEndpointRowChange(key)
}

const hasQuickSettingValidationErrors = (key: string): boolean => {
  const field = getQuickField(key)
  const rows = quickEndpointRows[key] ?? []
  return rows.some(row => quickRowIsInvalid(field, row))
}

const getProtocolOptions = (field: QuickSetupField): string[] => protocolOptionsByFormat[field.format]
const isQuickSettingChanged = (key: string) => quickEditedSettings[key] !== quickOriginalSettings[key]
const isQuickSettingUpdating = (key: string) => quickIsUpdating[key] === true
const isQuickSettingSaveBlocked = (key: string) =>
  !isQuickSettingChanged(key) || isQuickSettingUpdating(key) || hasQuickSettingValidationErrors(key)

watch(
  () => store.settings,
  (newSettings) => {
    if (!Array.isArray(newSettings)) return
    const settingsMap = new Map(newSettings.map(setting => [setting.key, setting.value]))

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
      if (!(field.key in quickIsUpdating)) quickIsUpdating[field.key] = false
    })
  },
  { immediate: true },
)

const saveQuickSetting = async (key: string) => {
  if (!isQuickSettingChanged(key) || hasQuickSettingValidationErrors(key)) return
  quickIsUpdating[key] = true
  try {
    await store.updateServerSetting(key, quickEditedSettings[key])
    quickOriginalSettings[key] = quickEditedSettings[key]
    emit('notify', { message: `Setting "${key}" saved successfully`, type: 'success' })
  } catch (error: any) {
    emit('notify', { message: error.message || `Failed to save setting "${key}"`, type: 'error' })
  } finally {
    quickIsUpdating[key] = false
  }
}
</script>
