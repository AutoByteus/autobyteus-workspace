<template>
  <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div class="px-5 py-4 border-b border-gray-100">
      <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_probe_preview') }}</h3>
      <p class="text-xs text-gray-500 mt-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_probe_preview_description') }}</p>
    </div>

    <div class="p-5">
      <p v-if="error" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-3">
        {{ error }}
      </p>

      <div v-else-if="probeResult" class="space-y-3">
        <p v-if="isProbeStale" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.custom_provider_probe_stale') }}
        </p>

        <div class="flex items-center justify-between text-sm text-gray-700">
          <span>{{ probeResult.name }}</span>
          <span class="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1 border border-blue-100">
            {{ $t('settings.components.settings.ProviderAPIKeyManager.models_count', { count: probeResult.discoveredModels.length }) }}
          </span>
        </div>

        <div v-if="probeResult.discoveredModels.length === 0" class="text-sm text-gray-500">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.no_models_discovered') }}
        </div>

        <div v-else class="grid grid-cols-1 gap-2 max-h-64 overflow-auto">
          <div
            v-for="model in probeResult.discoveredModels"
            :key="model.id"
            class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800"
          >
            {{ model.name }}
          </div>
        </div>
      </div>

      <p v-else class="text-sm text-gray-500">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.no_probe_result') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CustomLlmProviderProbeResult } from '~/stores/llmProviderConfig'

defineProps<{
  probeResult: CustomLlmProviderProbeResult | null
  error: string | null
  isProbeStale: boolean
}>()
</script>
