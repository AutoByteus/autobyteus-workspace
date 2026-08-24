<template>
  <form
    class="qwen-setup overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    data-testid="qwen-setup-form"
    novalidate
    @submit.prevent="submit"
  >
    <div class="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">
            {{ $t('settings.components.settings.ProviderAPIKeyManager.qwen_configuration') }}
          </h3>
          <p class="mt-1 text-xs leading-5 text-gray-500">
            {{ $t('settings.components.settings.ProviderAPIKeyManager.qwen_configuration_description') }}
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          :class="setup.endpointSource === 'CONFIGURED'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
            : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'"
          data-testid="qwen-endpoint-source"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="setup.endpointSource === 'CONFIGURED' ? 'bg-emerald-500' : 'bg-amber-500'"
            aria-hidden="true"
          ></span>
          {{ setup.endpointSource === 'CONFIGURED'
            ? $t('settings.components.settings.ProviderAPIKeyManager.qwen_configured_endpoint')
            : $t('settings.components.settings.ProviderAPIKeyManager.qwen_using_default_endpoint') }}
        </span>
      </div>
    </div>

    <div class="space-y-5 p-5">
      <div>
        <label for="qwen-base-url" class="mb-1.5 block text-sm font-medium text-gray-700">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.base_url') }}
        </label>
        <input
          id="qwen-base-url"
          v-model="baseUrl"
          type="url"
          inputmode="url"
          autocomplete="url"
          class="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500"
          :disabled="saving"
          :aria-invalid="Boolean(validationMessage)"
          aria-describedby="qwen-endpoint-help qwen-validation-error"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.qwen_base_url_placeholder')"
          @input="emit('clear-error')"
          @blur="showValidation = true"
        >
        <p id="qwen-endpoint-help" class="mt-1.5 text-xs text-gray-500">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.qwen_endpoint_help') }}
        </p>
      </div>

      <div>
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label for="qwen-api-key" class="text-sm font-medium text-gray-700">
            {{ $t('settings.components.settings.ProviderAPIKeyManager.api_key') }}
          </label>
          <span
            v-if="setup.apiKeyConfigured"
            class="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"
            data-testid="qwen-api-key-configured"
          >
            <span class="i-heroicons-check-circle-20-solid h-4 w-4" aria-hidden="true"></span>
            {{ $t('settings.components.settings.ProviderAPIKeyManager.qwen_api_key_configured') }}
          </span>
        </div>
        <div class="relative">
          <input
            id="qwen-api-key"
            v-model="apiKey"
            :type="showApiKey ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 pr-11 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500"
            :disabled="saving"
            :aria-invalid="Boolean(validationMessage)"
            aria-describedby="qwen-validation-error"
            :placeholder="setup.apiKeyConfigured
              ? $t('settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update')
              : $t('settings.components.settings.ProviderAPIKeyManager.enter_api_key')"
            @input="emit('clear-error')"
            @blur="showValidation = true"
          >
          <button
            type="button"
            class="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="saving"
            :aria-label="$t('settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility')"
            @click="showApiKey = !showApiKey"
          >
            <span
              v-if="showApiKey"
              class="i-heroicons-eye-slash-20-solid h-5 w-5"
              aria-hidden="true"
            ></span>
            <span
              v-else
              class="i-heroicons-eye-20-solid h-5 w-5"
              aria-hidden="true"
            ></span>
          </button>
        </div>
      </div>

      <p
        v-if="validationMessage"
        id="qwen-validation-error"
        class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        role="alert"
      >
        {{ validationMessage }}
      </p>

      <p
        v-if="errorMessage"
        class="rounded-lg border px-3 py-2 text-sm"
        :class="errorCode === 'QWEN_CONFIGURATION_REPAIR_REQUIRED'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'"
        data-testid="qwen-save-error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end">
        <button
          type="submit"
          class="inline-flex min-w-40 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmit"
        >
          <span
            v-if="saving"
            class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-b-white"
            aria-hidden="true"
          ></span>
          {{ saving
            ? $t('settings.components.settings.ProviderAPIKeyManager.qwen_testing_and_saving')
            : $t('settings.components.settings.ProviderAPIKeyManager.qwen_save_configuration') }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { QwenConfigurationInput, QwenSetupStatus } from '~/stores/llmProviderConfig'

const props = defineProps<{
  setup: QwenSetupStatus
  saving: boolean
  resetVersion: number
  errorMessage?: string | null
  errorCode?: string | null
}>()

const emit = defineEmits<{
  (event: 'save', input: QwenConfigurationInput): void
  (event: 'clear-error'): void
}>()

const { t } = useLocalization()

const baseUrl = ref(props.setup.effectiveBaseUrl)
const apiKey = ref('')
const showApiKey = ref(false)
const showValidation = ref(false)

const validAbsoluteHttpUrl = computed(() => {
  try {
    const parsed = new URL(baseUrl.value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
})

const validationMessage = computed(() => {
  if (!showValidation.value) return null
  if (!baseUrl.value.trim() || !apiKey.value.trim()) {
    return t('settings.components.settings.ProviderAPIKeyManager.qwen_required_error')
  }
  if (!validAbsoluteHttpUrl.value) {
    return t('settings.components.settings.ProviderAPIKeyManager.qwen_invalid_url_error')
  }
  return null
})

const canSubmit = computed(() => Boolean(
  !props.saving
  && baseUrl.value.trim()
  && apiKey.value.trim()
  && validAbsoluteHttpUrl.value,
))

watch(
  () => props.resetVersion,
  () => {
    baseUrl.value = props.setup.effectiveBaseUrl
    apiKey.value = ''
    showApiKey.value = false
    showValidation.value = false
  },
)

watch(
  () => props.setup.effectiveBaseUrl,
  (value) => {
    if (!baseUrl.value.trim()) baseUrl.value = value
  },
)

const submit = () => {
  showValidation.value = true
  if (!canSubmit.value) return
  emit('save', { baseUrl: baseUrl.value.trim(), apiKey: apiKey.value.trim() })
}
</script>

<style scoped>
.qwen-setup {
  container-type: inline-size;
}
</style>
