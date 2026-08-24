<template>
  <div class="flex flex-1 flex-col items-stretch gap-4 lg:flex-row lg:gap-6">
    <nav class="flex max-h-72 w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 lg:max-h-none lg:w-64" :aria-label="$t('settings.components.settings.ProviderAPIKeyManager.providers')">
      <div class="border-b border-gray-200/60 bg-gray-50 px-4 py-3">
        <span class="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.providers') }}
        </span>
      </div>
      <div class="flex-1 space-y-0.5 overflow-y-auto p-2">
        <button
          v-for="provider in providers"
          :key="`sidebar-${provider.id}`"
          class="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-200"
          :class="selectedProviderId === provider.id
            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'"
          type="button"
          @click="emit('select-provider', provider.id)"
        >
          <span class="flex min-w-0 items-center">
            <span
              class="mr-3 h-2 w-2 flex-shrink-0 rounded-full"
              :class="isProviderConfigured(provider.id) ? 'bg-green-500' : 'bg-gray-300'"
            ></span>
            <span class="truncate text-sm font-medium">{{ provider.label || provider.name }}</span>
          </span>
          <span
            class="ml-2 flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium"
            :class="selectedProviderId === provider.id
              ? 'border-blue-100 bg-blue-50 text-blue-600'
              : 'border-transparent bg-gray-100 text-gray-400 group-hover:border-gray-200 group-hover:bg-white'"
            :aria-label="provider.totalModels === null ? $t('settings.components.settings.ProviderAPIKeyManager.model_count_loading') : undefined"
          >
            {{ provider.totalModels === null ? '—' : provider.totalModels }}
          </span>
        </button>
      </div>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-4">
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <span class="text-lg font-semibold text-gray-900">{{ selectedProviderLabelText }}</span>
          <span
            class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="selectedProviderConfigured
              ? 'border-green-100 bg-green-50 text-green-700'
              : 'border-gray-100 bg-gray-50 text-gray-500'"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="selectedProviderConfigured ? 'bg-green-500' : 'bg-gray-400'"></span>
            {{ selectedProviderConfigured
              ? $t('settings.components.settings.ProviderAPIKeyManager.configured')
              : $t('settings.components.settings.ProviderAPIKeyManager.not_configured') }}
          </span>
        </div>
        <button
          v-if="canReloadSelectedProvider"
          class="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isLoadingModels || isRefreshingModels || isReloadingSelectedProvider"
          :title="$t('settings.components.settings.ProviderAPIKeyManager.reload_models_for_selected_provider')"
          type="button"
          @click="emit('reload-selected-provider')"
        >
          <Icon
            icon="heroicons:arrow-path-20-solid"
            class="mr-2 h-4 w-4"
            :class="{ 'animate-spin': isReloadingSelectedProvider }"
          />
          {{ hasUnavailableSource || hasStaleResult
            ? $t('settings.components.settings.ProviderAPIKeyManager.retry')
            : $t('settings.components.settings.ProviderAPIKeyManager.reload_models') }}
        </button>
      </div>

      <div class="border-b border-gray-100 bg-white px-5 py-4">
        <slot name="configuration" />
      </div>

      <ProviderModelSection
        :llm-models="llmModels"
        :audio-models="audioModels"
        :image-models="imageModels"
        :video-models="videoModels"
        :is-loading="isLoadingModels"
        :is-refreshing="isRefreshingModels || isReloadingSelectedProvider"
        :has-successful-payload="hasSuccessfulPayload"
        :has-partial-result="hasPartialResult"
        :has-stale-result="hasStaleResult"
        :has-unavailable-source="hasUnavailableSource"
        :error-message="modelErrorMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import ProviderModelSection from './ProviderModelSection.vue'

interface ProviderSummary {
  id: string
  name: string
  label?: string
  totalModels: number | null
  isDraft?: boolean
}
interface ModelInfo {
  modelIdentifier: string
  name?: string | null
  providerType?: string | null
}

const props = withDefaults(defineProps<{
  providers: ProviderSummary[]
  selectedProviderId: string
  selectedProviderLabel?: string
  selectedProviderConfigured: boolean
  llmModels: ModelInfo[]
  audioModels: ModelInfo[]
  imageModels: ModelInfo[]
  videoModels?: ModelInfo[]
  isLoadingModels: boolean
  isRefreshingModels: boolean
  isReloadingSelectedProvider: boolean
  canReloadSelectedProvider: boolean
  hasSuccessfulPayload: boolean
  hasPartialResult: boolean
  hasStaleResult: boolean
  hasUnavailableSource: boolean
  modelErrorMessage?: string | null
  isProviderConfigured: (providerId: string) => boolean
}>(), {
  videoModels: () => [],
  modelErrorMessage: null,
})

const emit = defineEmits<{
  (event: 'select-provider', providerId: string): void
  (event: 'reload-selected-provider'): void
}>()
const selectedProviderLabelText = computed(() => props.selectedProviderLabel || props.selectedProviderId)
</script>
