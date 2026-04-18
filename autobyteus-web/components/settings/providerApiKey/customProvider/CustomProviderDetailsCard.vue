<template>
  <section class="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-4" data-testid="custom-provider-details-card">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">{{ provider.name }}</h3>
        <p class="text-xs text-gray-500 mt-1">{{ provider.baseUrl }}</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="deleting"
        data-testid="delete-custom-provider-button"
        @click="emit('delete')"
      >
        <span v-if="deleting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></span>
        <span v-else class="i-heroicons-trash-20-solid w-4 h-4 mr-2"></span>
        {{ $t('settings.components.settings.ProviderAPIKeyManager.remove_custom_provider') }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <span class="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
        {{ provider.providerType }}
      </span>
      <span class="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.models_count', { count: provider.totalModels }) }}
      </span>
      <span
        class="rounded-full border px-2.5 py-1 font-medium"
        :class="provider.status === 'READY'
          ? 'border-green-100 bg-green-50 text-green-700'
          : provider.status === 'STALE_ERROR'
            ? 'border-amber-100 bg-amber-50 text-amber-700'
            : 'border-red-100 bg-red-50 text-red-700'"
      >
        {{ provider.status }}
      </span>
    </div>

    <p v-if="provider.statusMessage" class="text-xs text-gray-600">
      {{ provider.statusMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type { ProviderSummary } from '~/components/settings/providerApiKey/useProviderApiKeySectionRuntime'

defineProps<{
  provider: ProviderSummary
  deleting: boolean
}>()

const emit = defineEmits<{
  (event: 'delete'): void
}>()
</script>
