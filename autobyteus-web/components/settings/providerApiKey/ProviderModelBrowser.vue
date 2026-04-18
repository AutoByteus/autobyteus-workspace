<template>
  <div class="flex gap-6 items-stretch flex-1">
    <div class="w-64 flex-shrink-0 bg-gray-50/50 rounded-xl overflow-hidden border border-gray-200 flex flex-col">
      <div class="px-4 py-3 border-b border-gray-200/60 bg-gray-50">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {{ $t('settings.components.settings.ProviderAPIKeyManager.providers') }}
        </span>
      </div>
      <div class="p-2 space-y-0.5 flex-1 overflow-y-auto">
        <button
          v-for="provider in providers"
          :key="`sidebar-${provider.id}`"
          class="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-all duration-200"
          :class="selectedProviderId === provider.id
            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'"
          @click="emit('select-provider', provider.id)"
        >
          <div class="flex items-center min-w-0">
            <span
              class="w-2 h-2 rounded-full mr-3 flex-shrink-0 transition-colors"
              :class="isProviderConfigured(provider.id)
                ? (selectedProviderId === provider.id ? 'bg-green-500' : 'bg-green-400')
                : 'bg-gray-300'"
            ></span>
            <span class="truncate font-medium text-sm">{{ provider.label || provider.name }}</span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <span
              class="text-xs py-0.5 px-2 rounded-full transition-colors font-medium border"
              :class="selectedProviderId === provider.id
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-gray-100 text-gray-400 border-transparent group-hover:bg-white group-hover:border-gray-200'"
            >
              {{ provider.totalModels }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div class="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div class="px-5 py-4 border-b flex items-center justify-between bg-white">
        <div class="flex items-center gap-3">
          <span class="text-lg font-semibold text-gray-900">{{ selectedProviderLabelText }}</span>
          <span
            class="text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5"
            :class="selectedProviderConfigured
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-gray-50 text-gray-500 border-gray-100'"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="selectedProviderConfigured ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
            {{ selectedProviderConfigured
              ? $t('settings.components.settings.ProviderAPIKeyManager.configured')
              : $t('settings.components.settings.ProviderAPIKeyManager.not_configured') }}
          </span>
        </div>
        <button
          class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          :disabled="!canReloadSelectedProvider || isLoadingModels || isReloadingModels || isReloadingSelectedProvider"
          :title="$t('settings.components.settings.ProviderAPIKeyManager.reload_models_for_selected_provider')"
          @click="emit('reload-selected-provider')"
        >
          <span
            class="i-heroicons-arrow-path-20-solid w-4 h-4 mr-2 text-blue-600"
            :class="{ 'animate-spin': isReloadingModels || isReloadingSelectedProvider }"
          ></span>{{ $t('settings.components.settings.ProviderAPIKeyManager.reload_models') }}
        </button>
      </div>

      <div class="px-5 py-4 border-b border-gray-100 bg-white">
        <slot name="configuration" />
      </div>

      <div class="px-5 py-4 bg-gray-50/30 flex-1 overflow-y-auto relative">
        <div
          v-if="isReloadingSelectedProvider"
          class="absolute inset-0 bg-white flex items-center justify-center z-10"
        >
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></span>
            {{ $t('settings.components.settings.ProviderAPIKeyManager.reloading_models') }}
          </div>
        </div>

        <div class="space-y-6">
          <div v-if="llmModels.length > 0">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.llm_models') }}
            </h4>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div
                v-for="model in llmModels"
                :key="`panel-llm-${model.modelIdentifier}`"
                class="py-2.5 px-3 bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
              >
                <span class="break-all font-medium text-gray-900">{{ getDisplayedModelLabel(model) }}</span>
              </div>
            </div>
          </div>

          <div v-if="audioModels.length > 0">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.audio_models') }}
            </h4>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div
                v-for="model in audioModels"
                :key="`panel-audio-${model.modelIdentifier}`"
                class="py-2.5 px-3 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
              >
                <span class="break-all font-medium text-gray-900">{{ getDisplayedModelLabel(model) }}</span>
              </div>
            </div>
          </div>

          <div v-if="imageModels.length > 0">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.image_models') }}
            </h4>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div
                v-for="model in imageModels"
                :key="`panel-image-${model.modelIdentifier}`"
                class="py-2.5 px-3 bg-white border border-gray-100 hover:border-amber-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
              >
                <span class="break-all font-medium text-gray-900">{{ getDisplayedModelLabel(model) }}</span>
              </div>
            </div>
          </div>

          <div v-if="!hasModels" class="flex flex-col items-center justify-center py-12 text-center">
            <div class="bg-gray-50 p-4 rounded-full mb-3">
              <span class="i-heroicons-cube-transparent-20-solid w-8 h-8 text-gray-300"></span>
            </div>
            <h4 class="text-gray-900 font-medium mb-1">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.no_models_found') }}
            </h4>
            <p class="text-sm text-gray-500 max-w-xs mx-auto">
              {{ $t('settings.components.settings.ProviderAPIKeyManager.this_provider_doesn_t_have_any') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig'
import { getModelSelectionOptionLabel } from '~/utils/modelSelectionLabel'

interface ProviderSummary {
  id: string
  name: string
  label?: string
  totalModels: number
  isDraft?: boolean
}

interface ModelInfo {
  modelIdentifier: string
  name?: string | null
  providerType?: string | null
}

const props = defineProps<{
  providers: ProviderSummary[]
  selectedProviderId: string
  selectedProviderLabel?: string
  selectedProviderConfigured: boolean
  llmModels: ModelInfo[]
  audioModels: ModelInfo[]
  imageModels: ModelInfo[]
  isLoadingModels: boolean
  isReloadingModels: boolean
  isReloadingSelectedProvider: boolean
  canReloadSelectedProvider: boolean
  isProviderConfigured: (providerId: string) => boolean
}>()

const emit = defineEmits<{
  (event: 'select-provider', providerId: string): void
  (event: 'reload-selected-provider'): void
}>()

const hasModels = computed(
  () => props.llmModels.length > 0 || props.audioModels.length > 0 || props.imageModels.length > 0,
)
const selectedProviderLabelText = computed(() => props.selectedProviderLabel || props.selectedProviderId)
const getDisplayedModelLabel = (model: ModelInfo): string =>
  getModelSelectionOptionLabel(model, DEFAULT_AGENT_RUNTIME_KIND)
</script>
