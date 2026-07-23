<template>
  <div class="space-y-4">
    <div class="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5">
      <p class="text-xs leading-5 text-blue-800">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.gemini_independent_options_help') }}
      </p>
      <p class="mt-1 text-xs font-medium text-blue-900" data-testid="gemini-effective-mode">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.gemini_effective_mode') }}:
        {{ optionLabel(geminiSetup.effectiveMode) }}
      </p>
    </div>

    <GeminiConfigurationOptionCard
      v-for="option in options"
      :key="option"
      :option="option"
      :configured="isConfigured(option)"
      :effective="geminiSetup.effectiveMode === option"
      :refresh-snapshot="geminiSetup"
      :vertex-project="geminiSetup.vertexProject"
      :vertex-location="geminiSetup.vertexLocation"
      :saving="saving"
      :removing="removing"
      :disabled="Boolean(disabled)"
      @save="emit('save', $event)"
      @remove="emit('remove', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import GeminiConfigurationOptionCard from './GeminiConfigurationOptionCard.vue'
import { useLocalization } from '~/composables/useLocalization'
import type {
  GeminiConfigurationOption,
  GeminiEffectiveMode,
  GeminiOptionSaveInput,
  GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

const props = defineProps<{
  geminiSetup: GeminiSetupConfigState
  saving: boolean
  removing: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'save', input: GeminiOptionSaveInput): void
  (event: 'remove', option: GeminiConfigurationOption): void
}>()

const { t } = useLocalization()
const options: GeminiConfigurationOption[] = ['AI_STUDIO', 'VERTEX_EXPRESS', 'VERTEX_PROJECT']

const optionLabel = (option: GeminiEffectiveMode): string => {
  if (option === 'AI_STUDIO') {
    return t('settings.components.settings.ProviderAPIKeyManager.ai_studio')
  }
  if (option === 'VERTEX_EXPRESS') {
    return t('settings.components.settings.ProviderAPIKeyManager.vertex_express')
  }
  if (option === 'VERTEX_PROJECT') {
    return t('settings.components.settings.ProviderAPIKeyManager.vertex_project')
  }
  return t('settings.components.settings.ProviderAPIKeyManager.unconfigured')
}

const isConfigured = (option: GeminiConfigurationOption): boolean => {
  if (option === 'AI_STUDIO') {
    return props.geminiSetup.aiStudioCredentialStatus.storageState === 'CONFIGURED'
  }
  if (option === 'VERTEX_EXPRESS') {
    return props.geminiSetup.vertexExpressCredentialStatus.storageState === 'CONFIGURED'
  }
  return props.geminiSetup.vertexProjectStatus === 'CONFIGURED'
}

</script>
