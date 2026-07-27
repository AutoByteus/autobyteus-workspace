<template>
  <section
    class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm"
    :data-testid="`gemini-option-${option}`"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-800">{{ optionLabel }}</h4>
      <div class="flex flex-wrap items-center justify-end gap-1.5">
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
          v-if="active"
          class="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
          :data-testid="`gemini-option-active-${option}`"
        >
          {{ $t('settings.components.settings.ProviderAPIKeyManager.active') }}
        </span>
        <button
          v-if="configured && !active"
          type="button"
          class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionsDisabled"
          :data-testid="`gemini-activate-${option}`"
          @click="emit('activate', option)"
        >
          {{ activating
            ? $t('settings.components.settings.ProviderAPIKeyManager.activating')
            : $t('settings.components.settings.ProviderAPIKeyManager.use_this_mode') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionsDisabled"
          :aria-expanded="expanded"
          :data-testid="`gemini-toggle-${option}`"
          @click="emit('toggle-expanded')"
        >
          {{ expanded
            ? $t('settings.components.settings.ProviderAPIKeyManager.collapse')
            : $t('settings.components.settings.ProviderAPIKeyManager.configure_option') }}
        </button>
      </div>
    </div>

    <div v-if="expanded" class="mt-3 border-t border-gray-100 pt-3">
      <div v-if="option === 'AI_STUDIO'" class="relative">
        <input
          ref="firstField"
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
          ref="firstField"
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
          ref="firstField"
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
          v-if="canSave && activeMode === null"
          type="button"
          class="flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionsDisabled"
          :data-testid="`gemini-save-and-activate-${option}`"
          @click="submitAndActivate"
        >
          {{ saving
            ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
            : $t('settings.components.settings.ProviderAPIKeyManager.save_and_use_mode') }}
        </button>
        <button
          v-if="canSave"
          type="button"
          class="flex items-center rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionsDisabled"
          :data-testid="`gemini-save-${option}`"
          @click="submit"
        >
          {{ saving
            ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
            : $t('settings.components.settings.ProviderAPIKeyManager.save_option') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
const geminiApiKey = ref('')
const vertexApiKey = ref('')
const vertexProject = ref('')
const vertexLocation = ref('')
const showApiKey = ref(false)
const firstField = ref<HTMLInputElement | null>(null)
const actionsDisabled = computed(() => props.disabled || props.saving || props.activating)

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

watch(
  () => props.expanded,
  async (expanded) => {
    if (!expanded) {
      geminiApiKey.value = ''
      vertexApiKey.value = ''
      showApiKey.value = false
      return
    }
    await nextTick()
    firstField.value?.focus()
  },
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

const buildInput = (): GeminiOptionSaveInput => {
  const input: GeminiOptionSaveInput = { option: props.option }
  if (props.option === 'AI_STUDIO') input.apiKey = geminiApiKey.value
  if (props.option === 'VERTEX_EXPRESS') input.apiKey = vertexApiKey.value
  if (props.option === 'VERTEX_PROJECT') {
    input.project = vertexProject.value
    input.location = vertexLocation.value
  }
  return input
}

const submit = () => emit('save', buildInput())
const submitAndActivate = () => emit('save-and-activate', buildInput())

</script>
