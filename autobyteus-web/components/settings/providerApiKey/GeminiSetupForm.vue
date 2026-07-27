<template>
  <div class="gemini-setup overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div
      class="flex min-h-12 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-2.5"
      data-testid="gemini-connection-header"
    >
      <div
        class="flex min-w-0 flex-1 items-center justify-between gap-3"
        data-testid="gemini-active-mode"
      >
        <span class="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
          <span class="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true"></span>
          {{ $t('settings.components.settings.ProviderAPIKeyManager.gemini_active_mode') }}
        </span>
        <p class="truncate text-sm font-semibold text-blue-700">
          {{ optionLabel(geminiSetup.activeMode) }}
        </p>
      </div>
    </div>

    <div class="divide-y divide-gray-200">
      <GeminiConfigurationOptionCard
        v-for="option in options"
        :key="option"
        :option="option"
        :expanded="expandedOption === option"
        :configured="isConfigured(option)"
        :active="geminiSetup.activeMode === option"
        :active-mode="geminiSetup.activeMode"
        :refresh-snapshot="geminiSetup"
        :vertex-project="geminiSetup.vertexProject?.project ?? null"
        :vertex-location="geminiSetup.vertexProject?.location ?? null"
        :saving="saving"
        :activating="activating"
        :disabled="Boolean(disabled) || optionUnavailable(option)"
        @toggle-expanded="toggleExpanded(option)"
        @save="emit('save', $event)"
        @save-and-activate="emit('save-and-activate', $event)"
        @activate="emit('activate', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import GeminiConfigurationOptionCard from './GeminiConfigurationOptionCard.vue'
import { useLocalization } from '~/composables/useLocalization'
import { ref } from 'vue'
import type {
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
  GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'
import {
  isGeminiOptionAvailable,
  isGeminiOptionConfigured,
} from '~/stores/llmProviderConfig'

const props = defineProps<{
  geminiSetup: GeminiSetupConfigState
  saving: boolean
  activating: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'save', input: GeminiOptionSaveInput): void
  (event: 'save-and-activate', input: GeminiOptionSaveInput): void
  (event: 'activate', option: GeminiConfigurationOption): void
}>()

const { t } = useLocalization()
const options: GeminiConfigurationOption[] = ['AI_STUDIO', 'VERTEX_EXPRESS', 'VERTEX_PROJECT']
const expandedOption = ref<GeminiConfigurationOption | null>(null)

const toggleExpanded = (option: GeminiConfigurationOption): void => {
  expandedOption.value = expandedOption.value === option ? null : option
}

const optionLabel = (option: GeminiConfigurationOption | null): string => {
  if (option === 'AI_STUDIO') return t('settings.components.settings.ProviderAPIKeyManager.ai_studio')
  if (option === 'VERTEX_EXPRESS') return t('settings.components.settings.ProviderAPIKeyManager.vertex_express')
  if (option === 'VERTEX_PROJECT') return t('settings.components.settings.ProviderAPIKeyManager.vertex_project')
  return t('settings.components.settings.ProviderAPIKeyManager.not_selected')
}

const isConfigured = (option: GeminiConfigurationOption): boolean => {
  return isGeminiOptionConfigured(props.geminiSetup, option)
}

const optionUnavailable = (option: GeminiConfigurationOption): boolean => {
  return !isGeminiOptionAvailable(props.geminiSetup, option)
}
</script>

<style scoped>
.gemini-setup {
  container-type: inline-size;
}
</style>
