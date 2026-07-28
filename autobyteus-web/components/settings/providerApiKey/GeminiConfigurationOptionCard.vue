<template>
  <section
    class="relative px-4 py-3 transition-colors"
    :class="[
      active ? 'bg-blue-50/60' : 'bg-white',
      disabled ? 'opacity-70' : '',
    ]"
    :data-testid="`gemini-option-${option}`"
    :data-active="active ? 'true' : 'false'"
    :aria-labelledby="`gemini-option-heading-${option}`"
    :aria-describedby="`gemini-option-description-${option}`"
  >
    <span
      v-if="active"
      class="absolute inset-y-0 left-0 w-1 bg-blue-600"
      aria-hidden="true"
    ></span>

    <div class="gemini-option-summary flex flex-col gap-3">
      <h4
        :id="`gemini-option-heading-${option}`"
        class="min-w-0 truncate text-sm font-semibold text-gray-900"
      >
        {{ optionLabel }}
      </h4>
      <span
        :id="`gemini-option-description-${option}`"
        class="sr-only"
        :data-testid="`gemini-option-description-${option}`"
      >
        {{ optionDescription }}
      </span>

      <div class="gemini-option-actions flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1.5">
          <span
            v-if="configured"
            class="inline-flex h-5 w-5 items-center justify-center"
            :data-testid="`gemini-option-status-${option}`"
            :title="$t('settings.components.settings.ProviderAPIKeyManager.configured')"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
            <span class="sr-only">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.configured') }}
            </span>
          </span>
          <span
            v-else
            class="text-xs font-medium text-gray-500"
            :data-testid="`gemini-option-status-${option}`"
          >
            {{ $t('settings.components.settings.ProviderAPIKeyManager.not_configured') }}
          </span>
          <span
            v-if="active"
            class="inline-flex min-h-11 items-center rounded-full bg-emerald-100 px-3 text-sm font-semibold text-emerald-700"
            :data-testid="`gemini-option-active-${option}`"
            :title="$t('settings.components.settings.ProviderAPIKeyManager.active')"
          >
            <span aria-hidden="true">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.active') }}
            </span>
            <span class="sr-only">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.active') }}
            </span>
          </span>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <button
            v-if="configured && !active"
            type="button"
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="actionsDisabled"
            :data-testid="`gemini-activate-${option}`"
            :title="$t('settings.components.settings.ProviderAPIKeyManager.use_this_mode')"
            :aria-label="`${$t('settings.components.settings.ProviderAPIKeyManager.use_this_mode')}: ${optionLabel}`"
            @click="emit('activate', option)"
          >
            <span
              v-if="activating"
              class="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
              aria-hidden="true"
            ></span>
            <span v-if="activating">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.activating') }}
            </span>
            <span v-else>
              {{ $t('settings.components.settings.ProviderAPIKeyManager.activate_mode') }}
            </span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="actionsDisabled"
            :aria-expanded="expanded"
            :aria-controls="`gemini-option-editor-${option}`"
            :aria-label="`${expanded
              ? $t('settings.components.settings.ProviderAPIKeyManager.collapse')
              : $t('settings.components.settings.ProviderAPIKeyManager.configure_option')}: ${optionLabel}`"
            :title="expanded
              ? $t('settings.components.settings.ProviderAPIKeyManager.collapse')
              : $t('settings.components.settings.ProviderAPIKeyManager.configure_option')"
            :data-testid="`gemini-toggle-${option}`"
            @click="emit('toggle-expanded')"
          >
            <svg
              v-if="expanded"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487ZM19.5 7.125V18.75A2.25 2.25 0 0 1 17.25 21H5.25A2.25 2.25 0 0 1 3 18.75V6.75A2.25 2.25 0 0 1 5.25 4.5h11.625"
              />
            </svg>
            <span class="sr-only">
              {{ expanded
                ? $t('settings.components.settings.ProviderAPIKeyManager.collapse')
                : $t('settings.components.settings.ProviderAPIKeyManager.configure_option') }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <GeminiConfigurationOptionEditor
      v-if="expanded"
      :option="option"
      :active-mode="activeMode"
      :refresh-snapshot="refreshSnapshot"
      :initial-project="vertexProject"
      :initial-location="vertexLocation"
      :saving="saving"
      :activating="activating"
      :disabled="disabled"
      @save="emit('save', $event)"
      @save-and-activate="emit('save-and-activate', $event)"
    />

    <p class="sr-only" role="status" aria-live="polite">
      {{ saving
        ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
        : activating
          ? $t('settings.components.settings.ProviderAPIKeyManager.activating')
          : '' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GeminiConfigurationOptionEditor from './GeminiConfigurationOptionEditor.vue'
import { useLocalization } from '~/composables/useLocalization'
import type {
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
  GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

const props = defineProps<{
  option: GeminiConfigurationOption
  expanded: boolean
  configured: boolean
  active: boolean
  activeMode: GeminiConfigurationOption | null
  refreshSnapshot: GeminiSetupConfigState
  vertexProject: string | null
  vertexLocation: string | null
  saving: boolean
  activating: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-expanded'): void
  (event: 'save', input: GeminiOptionSaveInput): void
  (event: 'save-and-activate', input: GeminiOptionSaveInput): void
  (event: 'activate', option: GeminiConfigurationOption): void
}>()

const { t } = useLocalization()
const actionsDisabled = computed(() => props.disabled || props.saving || props.activating)

const optionLabel = computed(() => {
  if (props.option === 'AI_STUDIO') {
    return t('settings.components.settings.ProviderAPIKeyManager.ai_studio')
  }
  if (props.option === 'VERTEX_EXPRESS') {
    return t('settings.components.settings.ProviderAPIKeyManager.vertex_express')
  }
  return t('settings.components.settings.ProviderAPIKeyManager.vertex_project')
})

const optionDescription = computed(() => {
  if (props.option === 'AI_STUDIO') {
    return t('settings.components.settings.ProviderAPIKeyManager.ai_studio_description')
  }
  if (props.option === 'VERTEX_EXPRESS') {
    return t('settings.components.settings.ProviderAPIKeyManager.vertex_express_description')
  }
  return t('settings.components.settings.ProviderAPIKeyManager.vertex_project_description')
})

</script>

<style scoped>
@container (min-width: 400px) {
  .gemini-option-summary {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .gemini-option-actions {
    flex-shrink: 0;
    justify-content: flex-end;
  }
}

</style>
