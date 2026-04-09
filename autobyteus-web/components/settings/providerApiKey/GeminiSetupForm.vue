<template>
  <div class="space-y-3">
    <p class="text-xs text-gray-500">
      {{ $t('settings.components.settings.ProviderAPIKeyManager.gemini_setup_choose_a_mode_and') }}
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="modeOption in geminiModeOptions"
        :key="modeOption.value"
        type="button"
        class="px-3 py-1.5 text-xs rounded-full border transition-colors"
        :class="mode === modeOption.value
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
        @click="mode = modeOption.value"
      >
        {{ modeOption.label }}
      </button>
    </div>

    <div v-if="mode === 'AI_STUDIO'" class="relative">
      <input
        v-model="geminiApiKey"
        :type="showApiKey ? 'text' : 'password'"
        class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key')"
      />
      <button
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        type="button"
        @click="showApiKey = !showApiKey"
      >
        <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
        <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
      </button>
    </div>

    <div v-if="mode === 'VERTEX_EXPRESS'" class="relative">
      <input
        v-model="vertexApiKey"
        :type="showApiKey ? 'text' : 'password'"
        class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key')"
      />
      <button
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        type="button"
        @click="showApiKey = !showApiKey"
      >
        <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
        <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
      </button>
    </div>

    <div v-if="mode === 'VERTEX_PROJECT'" class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input
        v-model="vertexProject"
        type="text"
        class="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_project_id')"
      />
      <input
        v-model="vertexLocation"
        type="text"
        class="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1')"
      />
    </div>

    <button
      class="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
      :disabled="!canSave || saving"
      @click="submit"
    >
      <span
        v-if="saving"
        class="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"
      ></span>
      {{ saving
        ? $t('settings.components.settings.ProviderAPIKeyManager.saving')
        : $t('settings.components.settings.ProviderAPIKeyManager.save_gemini_setup') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { GeminiSetupConfigInput, GeminiSetupMode, GeminiSetupConfigState } from '~/stores/llmProviderConfig'

const props = defineProps<{
  geminiSetup: GeminiSetupConfigState
  saving: boolean
}>()

const emit = defineEmits<{
  (event: 'save', input: GeminiSetupConfigInput): void
}>()

const { t } = useLocalization()
const mode = ref<GeminiSetupMode>('AI_STUDIO')
const geminiApiKey = ref('')
const vertexApiKey = ref('')
const vertexProject = ref('')
const vertexLocation = ref('')
const showApiKey = ref(false)

const geminiModeOptions = computed<Array<{ value: GeminiSetupMode; label: string }>>(() => [
  { value: 'AI_STUDIO', label: t('settings.components.settings.ProviderAPIKeyManager.ai_studio') },
  { value: 'VERTEX_EXPRESS', label: t('settings.components.settings.ProviderAPIKeyManager.vertex_express') },
  { value: 'VERTEX_PROJECT', label: t('settings.components.settings.ProviderAPIKeyManager.vertex_project') },
])

watch(
  () => props.geminiSetup,
  (setup) => {
    mode.value = setup?.mode ?? 'AI_STUDIO'
    vertexProject.value = setup?.vertexProject ?? ''
    vertexLocation.value = setup?.vertexLocation ?? ''
    geminiApiKey.value = ''
    vertexApiKey.value = ''
    showApiKey.value = false
  },
  { immediate: true, deep: true },
)

const canSave = computed(() => {
  if (mode.value === 'VERTEX_PROJECT') {
    return Boolean(vertexProject.value.trim() && vertexLocation.value.trim())
  }
  if (mode.value === 'VERTEX_EXPRESS') {
    return Boolean(vertexApiKey.value.trim())
  }
  return Boolean(geminiApiKey.value.trim())
})

const submit = () => {
  emit('save', {
    mode: mode.value,
    geminiApiKey: mode.value === 'AI_STUDIO' ? geminiApiKey.value : null,
    vertexApiKey: mode.value === 'VERTEX_EXPRESS' ? vertexApiKey.value : null,
    vertexProject: mode.value === 'VERTEX_PROJECT' ? vertexProject.value : null,
    vertexLocation: mode.value === 'VERTEX_PROJECT' ? vertexLocation.value : null,
  })
}
</script>
