<template>
  <div class="space-y-3">
    <div class="flex rounded-lg bg-slate-100 p-1" role="tablist">
      <button
        type="button"
        class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        :class="mode === 'existing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        :disabled="disabled || existingOptions.length === 0"
        @click="mode = 'existing'"
      >
        {{ $t('applications.components.applications.ApplicationWorkspaceRootSelector.loadedWorkspaces') }}
      </button>
      <button
        type="button"
        class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        :class="mode === 'custom' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        :disabled="disabled"
        @click="mode = 'custom'"
      >
        {{ $t('applications.components.applications.ApplicationWorkspaceRootSelector.customPath') }}
      </button>
    </div>

    <div v-if="mode === 'existing'" class="space-y-2">
      <SearchableSelect
        :model-value="selectedExistingPath"
        :options="existingOptions"
        :disabled="disabled || existingOptions.length === 0"
        :placeholder="$t('applications.components.applications.ApplicationWorkspaceRootSelector.selectWorkspacePlaceholder')"
        :search-placeholder="$t('applications.components.applications.ApplicationWorkspaceRootSelector.searchWorkspacePlaceholder')"
        :empty-message="$t('applications.components.applications.ApplicationWorkspaceRootSelector.noLoadedWorkspaces')"
        @update:model-value="selectExistingPath"
      />
      <p class="text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationWorkspaceRootSelector.loadedWorkspaceHelp') }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <div class="flex gap-2">
        <input
          v-model="customPath"
          type="text"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          :disabled="disabled"
          :placeholder="$t('applications.components.applications.ApplicationWorkspaceRootSelector.customPathPlaceholder')"
          @input="emitCustomPath"
        >
        <button
          v-if="isEmbeddedWindow"
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          :disabled="disabled"
          @click="browseForFolder"
        >
          <span class="i-heroicons-folder-open-20-solid h-5 w-5"></span>
        </button>
      </div>
      <p class="text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationWorkspaceRootSelector.customPathHelp') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SearchableSelect from '~/components/common/SearchableSelect.vue'
import { pickFolderPath } from '~/composables/useNativeFolderDialog'
import { useLocalization } from '~/composables/useLocalization'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkspaceStore } from '~/stores/workspace'

const props = withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { t: $t } = useLocalization()
const workspaceStore = useWorkspaceStore()
const windowNodeContextStore = useWindowNodeContextStore()
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore)

const mode = ref<'existing' | 'custom'>('custom')
const customPath = ref(props.modelValue)

void workspaceStore.fetchAllWorkspaces().catch(() => undefined)

const existingOptions = computed(() => workspaceStore.allWorkspaces
  .filter((workspace) => Boolean(workspace.absolutePath))
  .map((workspace) => ({
    id: workspace.absolutePath as string,
    name: workspace.name,
    description: workspace.absolutePath as string,
  })))

const selectedExistingPath = computed(() => {
  const normalizedValue = props.modelValue.trim()
  return existingOptions.value.some((option) => option.id === normalizedValue)
    ? normalizedValue
    : null
})

watch(
  () => props.modelValue,
  (value) => {
    customPath.value = value
    mode.value = existingOptions.value.some((option) => option.id === value.trim()) ? 'existing' : 'custom'
  },
  { immediate: true },
)

watch(existingOptions, (options) => {
  if (options.length === 0) {
    mode.value = 'custom'
    return
  }
  if (selectedExistingPath.value) {
    mode.value = 'existing'
  }
})

const selectExistingPath = (value: string) => {
  emit('update:modelValue', value)
}

const emitCustomPath = () => {
  emit('update:modelValue', customPath.value)
}

const browseForFolder = async () => {
  const selectedPath = await pickFolderPath()
  if (!selectedPath) {
    return
  }
  customPath.value = selectedPath
  emit('update:modelValue', selectedPath)
}
</script>
