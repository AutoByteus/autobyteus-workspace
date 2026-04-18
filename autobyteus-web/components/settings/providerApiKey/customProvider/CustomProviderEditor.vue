<template>
  <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div class="px-5 py-4 border-b border-gray-100">
      <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.ProviderAPIKeyManager.add_custom_provider') }}</h3>
      <p class="text-xs text-gray-500 mt-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.add_custom_provider_description') }}</p>
    </div>

    <div class="p-5 space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_name') }}</label>
        <input
          :value="draft.name"
          type="text"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.custom_provider_name_placeholder')"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.base_url') }}</label>
        <input
          :value="draft.baseUrl"
          type="text"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.base_url_placeholder')"
          @input="updateField('baseUrl', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.api_key') }}</label>
        <input
          :value="draft.apiKey"
          type="password"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          :placeholder="$t('settings.components.settings.ProviderAPIKeyManager.api_key_placeholder')"
          @input="updateField('apiKey', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canProbe || probing"
          @click="emit('probe')"
        >
          <span v-if="probing" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></span>
          <span v-else class="i-heroicons-signal-20-solid w-4 h-4 mr-2"></span>
          {{ $t('settings.components.settings.ProviderAPIKeyManager.load_models') }}
        </button>

        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSave || saving"
          @click="emit('save')"
        >
          <span v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></span>
          <span v-else class="i-heroicons-check-20-solid w-4 h-4 mr-2"></span>
          {{ $t('settings.components.settings.ProviderAPIKeyManager.save_custom_provider') }}
        </button>
      </div>

      <p v-if="isProbeStale" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_probe_stale') }}
      </p>
      <p v-else-if="!canSave" class="text-xs text-gray-500">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_save_requires_probe') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CustomLlmProviderDraftInput } from '~/stores/llmProviderConfig'

const props = defineProps<{
  draft: CustomLlmProviderDraftInput
  probing: boolean
  saving: boolean
  canProbe: boolean
  canSave: boolean
  isProbeStale: boolean
}>()

const emit = defineEmits<{
  (event: 'update:draft', value: CustomLlmProviderDraftInput): void
  (event: 'probe'): void
  (event: 'save'): void
}>()

const updateField = (field: keyof CustomLlmProviderDraftInput, value: string) => {
  emit('update:draft', {
    ...props.draft,
    [field]: value,
  })
}
</script>
