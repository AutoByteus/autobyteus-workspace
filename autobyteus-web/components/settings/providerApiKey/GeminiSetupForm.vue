<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <h3 class="text-sm font-semibold text-gray-900">Gemini</h3>
      <p class="text-xs font-medium text-gray-700" data-testid="gemini-active-mode">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.gemini_active_mode') }}:
        <span class="text-blue-700">{{ optionLabel(geminiSetup.activeMode) }}</span>
      </p>
    </div>

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
