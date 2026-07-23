<template>
  <section
    class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm"
    :data-testid="`gemini-option-${option}`"
  >
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-800">{{ optionLabel }}</h4>
      <div class="flex items-center gap-1.5">
        <span
          class="rounded-full px-2 py-0.5 text-[11px] font-medium"
          :class="configured
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-gray-100 text-gray-600'"
          :data-testid="`gemini-option-status-${option}`"
        >
          {{ configured
            ? $t('settings.components.settings.ProviderAPIKeyManager.configured')
            : $t('settings.components.settings.ProviderAPIKeyManager.not_configured') }}
        </span>
        <span
          v-if="effective"
          class="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
          :data-testid="`gemini-option-effective-${option}`"
        >
          {{ $t('settings.components.settings.ProviderAPIKeyManager.effective') }}
        </span>
      </div>
    </div>

    <div v-if="option === 'AI_STUDIO'" class="relative">
      <input
        v-model="geminiApiKey"
        :disabled="actionsDisabled"
        :type="showApiKey ? 'text' : 'password'"
        class="w-full rounded-lg border border-gray-300 p-2.5 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key')"
        data-testid="gemini-ai-studio-key"
      />
      <button
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        :disabled="actionsDisabled"
        :aria-label="$t('settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility')"
        @click="showApiKey = !showApiKey"
      >
        <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid h-4 w-4"></span>
        <span v-else class="i-heroicons-eye-20-solid h-4 w-4"></span>
      </button>
    </div>

    <div v-else-if="option === 'VERTEX_EXPRESS'" class="relative">
      <input
        v-model="vertexApiKey"
        :disabled="actionsDisabled"
        :type="showApiKey ? 'text' : 'password'"
        class="w-full rounded-lg border border-gray-300 p-2.5 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key')"
        data-testid="gemini-vertex-express-key"
      />
      <button
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        :disabled="actionsDisabled"
        :aria-label="$t('settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility')"
        @click="showApiKey = !showApiKey"
      >
        <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid h-4 w-4"></span>
        <span v-else class="i-heroicons-eye-20-solid h-4 w-4"></span>
      </button>
    </div>

    <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <input
        v-model="vertexProject"
        :disabled="actionsDisabled"
        type="text"
        class="w-full rounded-lg border border-gray-300 p-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_project_id')"
        data-testid="gemini-vertex-project"
      />
      <input
        v-model="vertexLocation"
        :disabled="actionsDisabled"
        type="text"
        class="w-full rounded-lg border border-gray-300 p-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1')"
        data-testid="gemini-vertex-location"
      />
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="actionsDisabled || !canSave"
        :data-testid="`gemini-save-${option}`"
        @click="submit"
      >
        <span v-if="saving" class="mr-1.5 h-3 w-3 animate-spin rounded-full border-b-2 border-white"></span>
        {{ saving
          ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
          : $t('settings.components.settings.ProviderAPIKeyManager.save_option') }}
      </button>
      <button
        v-if="configured"
        type="button"
        class="flex items-center rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="actionsDisabled"
        :data-testid="`gemini-remove-${option}`"
        @click="emit('remove', option)"
      >
        <span v-if="removing" class="mr-1.5 h-3 w-3 animate-spin rounded-full border-b-2 border-red-500"></span>
        {{ removing
          ? $t('settings.components.settings.ProviderAPIKeyManager.removing')
          : $t('settings.components.settings.ProviderAPIKeyManager.remove_option') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type {
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
  GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

const props = defineProps<{
  option: GeminiConfigurationOption
  configured: boolean
  effective: boolean
  refreshSnapshot: GeminiSetupConfigState
  vertexProject: string | null
  vertexLocation: string | null
  saving: boolean
  removing: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  (event: 'save', input: GeminiOptionSaveInput): void
  (event: 'remove', option: GeminiConfigurationOption): void
}>()

const { t } = useLocalization()
const geminiApiKey = ref('')
const vertexApiKey = ref('')
const vertexProject = ref('')
const vertexLocation = ref('')
const showApiKey = ref(false)
const actionsDisabled = computed(() => props.disabled || props.saving || props.removing)

watch(
  () => props.refreshSnapshot,
  () => {
    vertexProject.value = props.vertexProject ?? ''
    vertexLocation.value = props.vertexLocation ?? ''
    geminiApiKey.value = ''
    vertexApiKey.value = ''
    showApiKey.value = false
  },
  { immediate: true },
)

const optionLabel = computed(() => {
  if (props.option === 'AI_STUDIO') {
    return t('settings.components.settings.ProviderAPIKeyManager.ai_studio')
  }
  if (props.option === 'VERTEX_EXPRESS') {
    return t('settings.components.settings.ProviderAPIKeyManager.vertex_express')
  }
  return t('settings.components.settings.ProviderAPIKeyManager.vertex_project')
})

const canSave = computed(() => {
  if (props.option === 'AI_STUDIO') return Boolean(geminiApiKey.value.trim())
  if (props.option === 'VERTEX_EXPRESS') return Boolean(vertexApiKey.value.trim())
  return Boolean(vertexProject.value.trim() && vertexLocation.value.trim())
})

const submit = () => {
  const input: GeminiOptionSaveInput = { option: props.option }
  if (props.option === 'AI_STUDIO') input.geminiApiKey = geminiApiKey.value
  if (props.option === 'VERTEX_EXPRESS') input.vertexApiKey = vertexApiKey.value
  if (props.option === 'VERTEX_PROJECT') {
    input.vertexProject = vertexProject.value
    input.vertexLocation = vertexLocation.value
  }
  emit('save', input)
}
</script>
