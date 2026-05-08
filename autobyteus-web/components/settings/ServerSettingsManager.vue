<template>
  <div class="server-settings-manager h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto p-8 pt-6 bg-slate-50">
      <div v-if="store.isLoading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="store.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ store.error }}</p>
      </div>

      <ServerSettingsBasicsPanel v-else-if="activeTab === 'quick'" />

      <div v-else class="space-y-4">
        <div class="px-1 pt-1 pb-2">
          <div class="flex items-center gap-8">
            <button
              type="button"
              class="pb-2 text-lg border-b-2 transition-colors"
              :class="advancedPanel === 'raw-settings' ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'"
              @click="advancedPanel = 'raw-settings'"
            >{{ $t('settings.components.settings.ServerSettingsManager.all_settings') }}</button>
            <button
              v-if="canAccessEmbeddedDiagnostics"
              type="button"
              class="pb-2 text-lg border-b-2 transition-colors"
              :class="advancedPanel === 'server-status' ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'"
              @click="advancedPanel = 'server-status'"
            >{{ $t('settings.components.settings.ServerSettingsManager.server_status_and_logs') }}</button>
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
                      :readonly="!isEditableSetting(setting)"
                      :data-testid="`server-setting-value-${setting.key}`"
                      :class="getSettingValueInputClass(setting)"
                      :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_value')"
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
                        v-if="isEditableSetting(setting)"
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
                      :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_new_setting_key')"
                      class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    >
                  </td>
                  <td class="px-6 py-4 align-middle">
                    <input
                      v-model="newSetting.value"
                      type="text"
                      :placeholder="$t('settings.components.settings.ServerSettingsManager.enter_value')"
                      class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    >
                  </td>
                  <td class="px-6 py-4 align-middle">
                    <div class="text-sm text-gray-500 italic">{{ $t('settings.components.settings.ServerSettingsManager.custom_user_defined_setting') }}</div>
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
import { useServerSettingsStore, type ServerSetting as ServerSettingRecord } from '~/stores/serverSettings'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import ServerMonitor from '~/components/server/ServerMonitor.vue'
import ServerSettingsBasicsPanel from '~/components/settings/ServerSettingsBasicsPanel.vue'

type SettingsTab = 'quick' | 'advanced'
type AdvancedPanel = 'raw-settings' | 'server-status'

const saveButtonClass =
  'inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150'
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

const newSetting = reactive({ key: '', value: '' })
const newSettingError = ref('')
const isAddingNewSetting = ref(false)

const isNewSettingValid = computed(() => {
  newSettingError.value = ''
  if (!newSetting.key.trim()) return false
  const keyExists = store.settings.some(setting => setting.key === newSetting.key)
  if (keyExists) {
    newSettingError.value = 'Setting with this key already exists'
    return false
  }
  return true
})

const isSettingChanged = (key: string) => editedSettings[key] !== originalSettings[key]
const isDeletableSetting = (setting: ServerSettingRecord) => setting.isDeletable
const isEditableSetting = (setting: ServerSettingRecord) => setting.isEditable

const getSettingValueInputClass = (setting: ServerSettingRecord) => (
  setting.isEditable
    ? 'w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors duration-150 text-gray-900 placeholder-gray-500'
    : 'w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-default select-text'
)

watch(
  () => props.sectionMode,
  (newMode) => {
    activeTab.value = newMode
  },
)

watch(
  () => store.settings,
  (newSettings) => {
    if (!Array.isArray(newSettings)) return
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
      if (!(setting.key in isUpdating)) isUpdating[setting.key] = false
      if (!(setting.key in isRemoving)) isRemoving[setting.key] = false
    })

    Object.keys(editedSettings).forEach((key) => {
      if (!seenRawKeys.has(key)) {
        delete editedSettings[key]
        delete originalSettings[key]
        delete isUpdating[key]
        delete isRemoving[key]
      }
    })
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    await store.fetchServerSettings()
  } catch (error) {
    console.error('Failed to load server settings:', error)
    showNotification('Failed to load server settings', 'error')
  }
})

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type }
  setTimeout(() => {
    notification.value = null
  }, 3000)
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

    store.settings.forEach((setting) => {
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
