<template>
  <div
    :id="`gemini-option-editor-${option}`"
    class="mt-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4"
  >
    <div v-if="option === 'AI_STUDIO'">
      <label :for="`gemini-api-key-${option}`" class="mb-1.5 block text-xs font-semibold text-gray-700">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.api_key') }}
      </label>
      <div class="relative">
        <input
          :id="`gemini-api-key-${option}`"
          ref="firstField"
          v-model="geminiApiKey"
          :disabled="actionsDisabled"
          :type="showApiKey ? 'text' : 'password'"
          class="w-full rounded-lg border border-gray-300 bg-white p-2.5 pr-12 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key')"
          data-testid="gemini-ai-studio-key"
        />
        <GeminiKeyVisibilityButton
          :show-api-key="showApiKey"
          :disabled="actionsDisabled"
          @toggle="showApiKey = !showApiKey"
        />
      </div>
    </div>

    <div v-else-if="option === 'VERTEX_EXPRESS'">
      <label :for="`gemini-api-key-${option}`" class="mb-1.5 block text-xs font-semibold text-gray-700">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.api_key') }}
      </label>
      <div class="relative">
        <input
          :id="`gemini-api-key-${option}`"
          ref="firstField"
          v-model="vertexApiKey"
          :disabled="actionsDisabled"
          :type="showApiKey ? 'text' : 'password'"
          class="w-full rounded-lg border border-gray-300 bg-white p-2.5 pr-12 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key')"
          data-testid="gemini-vertex-express-key"
        />
        <GeminiKeyVisibilityButton
          :show-api-key="showApiKey"
          :disabled="actionsDisabled"
          @toggle="showApiKey = !showApiKey"
        />
      </div>
    </div>

    <div v-else class="gemini-project-fields grid grid-cols-1 gap-3">
      <div>
        <label :for="`gemini-project-${option}`" class="mb-1.5 block text-xs font-semibold text-gray-700">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.vertex_project_id') }}
        </label>
        <input
          :id="`gemini-project-${option}`"
          ref="firstField"
          v-model="vertexProject"
          :disabled="actionsDisabled"
          type="text"
          class="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_project_id')"
          data-testid="gemini-vertex-project"
        />
      </div>
      <div>
        <label :for="`gemini-location-${option}`" class="mb-1.5 block text-xs font-semibold text-gray-700">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.vertex_location') }}
        </label>
        <input
          :id="`gemini-location-${option}`"
          v-model="vertexLocation"
          :disabled="actionsDisabled"
          type="text"
          class="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1')"
          data-testid="gemini-vertex-location"
        />
      </div>
    </div>

    <div v-if="canSave" class="gemini-editor-actions mt-4 flex flex-col-reverse gap-2">
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="actionsDisabled"
        :data-testid="`gemini-save-${option}`"
        @click="emit('save', buildInput())"
      >
        {{ saving
          ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
          : $t('settings.components.settings.ProviderAPIKeyManager.save_option') }}
      </button>
      <button
        v-if="activeMode === null"
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="actionsDisabled"
        :data-testid="`gemini-save-and-activate-${option}`"
        @click="emit('save-and-activate', buildInput())"
      >
        {{ saving
          ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
          : $t('settings.components.settings.ProviderAPIKeyManager.save_and_use_mode') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import GeminiKeyVisibilityButton from './GeminiKeyVisibilityButton.vue'
import type {
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
  GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

const props = defineProps<{
  option: GeminiConfigurationOption
  activeMode: GeminiConfigurationOption | null
  refreshSnapshot: GeminiSetupConfigState
  initialProject: string | null
  initialLocation: string | null
  saving: boolean
  activating: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  (event: 'save', input: GeminiOptionSaveInput): void
  (event: 'save-and-activate', input: GeminiOptionSaveInput): void
}>()

const geminiApiKey = ref('')
const vertexApiKey = ref('')
const vertexProject = ref('')
const vertexLocation = ref('')
const showApiKey = ref(false)
const firstField = ref<HTMLInputElement | null>(null)
const actionsDisabled = computed(() => props.disabled || props.saving || props.activating)
const canSave = computed(() => {
  if (props.option === 'AI_STUDIO') return Boolean(geminiApiKey.value.trim())
  if (props.option === 'VERTEX_EXPRESS') return Boolean(vertexApiKey.value.trim())
  return Boolean(vertexProject.value.trim() && vertexLocation.value.trim())
})

watch(
  () => props.refreshSnapshot,
  () => {
    vertexProject.value = props.initialProject ?? ''
    vertexLocation.value = props.initialLocation ?? ''
    geminiApiKey.value = ''
    vertexApiKey.value = ''
    showApiKey.value = false
  },
  { immediate: true },
)

onMounted(async () => {
  await nextTick()
  firstField.value?.focus()
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

</script>

<style scoped>
@container (min-width: 560px) {
  .gemini-editor-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .gemini-project-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
