<template>
  <section class="relative flex-1 overflow-y-auto bg-gray-50/30 px-5 py-4" aria-labelledby="provider-model-section-title">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 id="provider-model-section-title" class="text-sm font-semibold text-gray-900">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.models') }}
        </h3>
        <p
          v-if="isLoading"
          class="mt-1 flex items-center gap-2 text-sm text-gray-600"
          role="status"
          aria-live="polite"
        >
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-blue-600"></span>
          {{ $t('settings.components.settings.ProviderAPIKeyManager.loading_models') }}
        </p>
        <p
          v-else-if="isRefreshing"
          class="mt-1 flex items-center gap-2 text-sm text-gray-600"
          role="status"
          aria-live="polite"
        >
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-blue-600"></span>
          {{ $t('settings.components.settings.ProviderAPIKeyManager.refreshing_models') }}
        </p>
      </div>
    </div>

    <div
      v-if="hasPartialResult && hasModels"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      role="status"
    >
      {{ $t('settings.components.settings.ProviderAPIKeyManager.some_model_sources_unavailable') }}
    </div>

    <div
      v-else-if="hasStaleResult && hasModels"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      role="status"
    >
      {{ $t('settings.components.settings.ProviderAPIKeyManager.showing_last_known_models') }}
    </div>

    <div v-if="hasModels" class="space-y-6">
      <ModelGroup
        v-if="llmModels.length"
        :title="$t('settings.components.settings.ProviderAPIKeyManager.llm_models')"
        prefix="llm"
        :models="llmModels"
        accent-class="hover:border-blue-200"
      />
      <ModelGroup
        v-if="audioModels.length"
        :title="$t('settings.components.settings.ProviderAPIKeyManager.audio_models')"
        prefix="audio"
        :models="audioModels"
        accent-class="hover:border-purple-200"
      />
      <ModelGroup
        v-if="imageModels.length"
        :title="$t('settings.components.settings.ProviderAPIKeyManager.image_models')"
        prefix="image"
        :models="imageModels"
        accent-class="hover:border-amber-200"
      />
      <ModelGroup
        v-if="videoModels.length"
        :title="$t('settings.components.settings.ProviderAPIKeyManager.video_models')"
        prefix="video"
        :models="videoModels"
        accent-class="hover:border-indigo-200"
      />
    </div>

    <div
      v-else-if="isUnavailable"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-5 py-10 text-center"
      role="alert"
    >
      <div class="mb-3 rounded-full bg-white p-3 shadow-sm">
        <Icon icon="heroicons:exclamation-triangle-20-solid" class="h-7 w-7 text-amber-500" />
      </div>
      <h4 class="mb-1 font-medium text-gray-900">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.models_unavailable') }}
      </h4>
      <p class="max-w-sm text-sm text-gray-600">
        {{ hasPartialResult
          ? $t('settings.components.settings.ProviderAPIKeyManager.some_model_sources_unavailable')
          : $t('settings.components.settings.ProviderAPIKeyManager.models_unavailable_description') }}
      </p>
    </div>

    <div
      v-else-if="hasSuccessfulPayload && !isLoading"
      class="flex flex-col items-center justify-center py-10 text-center"
      role="status"
    >
      <div class="mb-3 rounded-full bg-gray-50 p-4">
        <Icon icon="heroicons:cube-transparent-20-solid" class="h-8 w-8 text-gray-300" />
      </div>
      <h4 class="mb-1 font-medium text-gray-900">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.no_models_found') }}
      </h4>
      <p class="mx-auto max-w-xs text-sm text-gray-500">
        {{ $t('settings.components.settings.ProviderAPIKeyManager.this_provider_doesn_t_have_any') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import ModelGroup from './ProviderModelSectionGroup.vue'

interface ModelInfo {
  modelIdentifier: string
  name?: string | null
  providerType?: string | null
}

const props = withDefaults(defineProps<{
  llmModels: ModelInfo[]
  audioModels: ModelInfo[]
  imageModels: ModelInfo[]
  videoModels?: ModelInfo[]
  isLoading: boolean
  isRefreshing: boolean
  hasSuccessfulPayload: boolean
  hasPartialResult: boolean
  hasStaleResult: boolean
  hasUnavailableSource: boolean
  errorMessage?: string | null
}>(), {
  videoModels: () => [],
  errorMessage: null,
})

const hasModels = computed(() =>
  props.llmModels.length + props.audioModels.length + props.imageModels.length + props.videoModels.length > 0)
const isUnavailable = computed(() =>
  !props.isLoading && !hasModels.value
  && (props.hasPartialResult || Boolean(props.errorMessage) || props.hasUnavailableSource))
</script>
