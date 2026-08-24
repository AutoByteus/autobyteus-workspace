<template>
  <div class="space-y-3">
    <MobileLaunchTargetPicker
      :model-value="modelValue"
      label="Workspace"
      placeholder="Choose a workspace intentionally"
      :items="items"
      test-id="mobile-run-workspace-select"
      item-noun="workspace"
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <section class="rounded-2xl border border-blue-200 bg-white p-3 text-sm" data-testid="mobile-run-workspace-path-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <label class="font-bold text-blue-950" for="mobile-run-workspace-path-input">
            Load workspace by server path
          </label>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">
            Enter an absolute path on the paired AutoByteus node, not this phone.
          </p>
        </div>
        <span v-if="isRefreshing" class="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
          Refreshing…
        </span>
      </div>

      <div class="mt-3 flex gap-2">
        <input
          id="mobile-run-workspace-path-input"
          v-model="pathDraft"
          class="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
          data-testid="mobile-run-workspace-path-input"
          placeholder="/srv/autobyteus/project"
          autocomplete="off"
          :disabled="isLoadingPath"
          @keydown.enter.prevent="submitLoadPath"
        />
        <button
          type="button"
          class="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="mobile-run-workspace-load"
          :disabled="!pathDraft.trim() || isLoadingPath"
          @click="submitLoadPath"
        >
          {{ isLoadingPath ? 'Loading…' : 'Load' }}
        </button>
      </div>

      <p v-if="errorMessage" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700" data-testid="mobile-run-workspace-error">
        {{ errorMessage }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MobileLaunchTargetPicker from '~/components/mobile/MobileLaunchTargetPicker.vue'
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch'

withDefaults(defineProps<{
  modelValue: string
  items: MobileLaunchPickerItem[]
  isRefreshing?: boolean
  isLoadingPath?: boolean
  errorMessage?: string | null
}>(), {
  isRefreshing: false,
  isLoadingPath: false,
  errorMessage: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'load-path': [path: string]
}>()

const pathDraft = ref('')

function submitLoadPath(): void {
  const path = pathDraft.value.trim()
  if (!path) {
    return
  }
  emit('load-path', path)
}
</script>
