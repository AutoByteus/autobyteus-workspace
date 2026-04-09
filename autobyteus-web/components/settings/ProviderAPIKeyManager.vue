<template>
  <div class="provider-api-key-manager flex-1 flex flex-col h-full overflow-hidden">
    <div class="flex-1 flex flex-col h-full min-h-0">
      <div class="flex items-center justify-between px-8 pt-8 pb-4">
        <div class="flex flex-col">
          <h2 class="text-xl font-semibold text-gray-900">{{ $t('settings.components.settings.ProviderAPIKeyManager.api_key_management') }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ $t('settings.components.settings.ProviderAPIKeyManager.manage_provider_keys_and_reload_available') }}</p>
        </div>
        <button
          class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          :title="$t('settings.components.settings.ProviderAPIKeyManager.reload_all_models')"
          :disabled="isLoadingModels || isReloadingModels"
          @click="reloadAllModels"
        >
          <span
            class="i-heroicons-arrow-path-20-solid w-5 h-5 mr-2 text-gray-500 group-hover:text-gray-700"
            :class="{ 'animate-spin': isLoadingModels || isReloadingModels }"
          ></span>{{ $t('settings.components.settings.ProviderAPIKeyManager.reload_models') }}
        </button>
      </div>

      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else class="flex-1 flex flex-col overflow-auto px-8 pb-8">
        <div class="flex-1 flex flex-col">
          <div
            v-if="isLoadingModels || isReloadingModels"
            class="flex justify-center items-center py-6"
          >
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <p class="text-gray-600">
              {{ isReloadingModels
                ? $t('settings.components.settings.ProviderAPIKeyManager.reloading_and_discovering_models')
                : $t('settings.components.settings.ProviderAPIKeyManager.loading_available_models') }}
            </p>
          </div>

          <div v-else-if="!hasAnyModels" class="bg-gray-50 rounded-lg p-6 text-center">
            <span class="i-heroicons-cube-transparent-20-solid w-10 h-10 text-gray-400 mx-auto mb-3"></span>
            <p class="text-gray-600">{{ $t('settings.components.settings.ProviderAPIKeyManager.no_models_available') }}</p>
          </div>

          <div v-else class="flex-1 flex flex-col gap-4">
            <ProviderModelBrowser
              :providers="allProvidersWithModels"
              :selected-provider="selectedModelProvider"
              :selected-provider-configured="selectedProviderConfigured"
              :llm-models="selectedProviderLlmModels"
              :audio-models="selectedProviderAudioModels"
              :image-models="selectedProviderImageModels"
              :is-loading-models="isLoadingModels"
              :is-reloading-models="isReloadingModels"
              :is-reloading-selected-provider="isReloadingSelectedProvider"
              :is-provider-configured="isProviderConfigured"
              @select-provider="selectProvider"
              @reload-selected-provider="reloadSelectedProvider()"
            >
              <template #configuration>
                <GeminiSetupForm
                  v-if="selectedModelProvider === 'GEMINI'"
                  :gemini-setup="geminiSetup"
                  :saving="saving"
                  @save="saveGeminiSetup"
                />
                <ProviderApiKeyEditor
                  v-else-if="selectedModelProvider"
                  :configured="selectedProviderConfigured"
                  :saving="saving"
                  :reset-version="providerEditorResetVersion"
                  @save="saveProviderApiKey(selectedModelProvider, $event)"
                />
              </template>
            </ProviderModelBrowser>
          </div>
        </div>
      </div>

      <div
        v-if="notification"
        class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
        :class="notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import GeminiSetupForm from '~/components/settings/providerApiKey/GeminiSetupForm.vue'
import ProviderApiKeyEditor from '~/components/settings/providerApiKey/ProviderApiKeyEditor.vue'
import ProviderModelBrowser from '~/components/settings/providerApiKey/ProviderModelBrowser.vue'
import { useProviderApiKeySectionRuntime } from '~/components/settings/providerApiKey/useProviderApiKeySectionRuntime'

const {
  loading,
  saving,
  notification,
  providerEditorResetVersion,
  isLoadingModels,
  isReloadingModels,
  geminiSetup,
  allProvidersWithModels,
  hasAnyModels,
  selectedModelProvider,
  selectedProviderLlmModels,
  selectedProviderAudioModels,
  selectedProviderImageModels,
  selectedProviderConfigured,
  isReloadingSelectedProvider,
  isProviderConfigured,
  initialize,
  selectProvider,
  reloadAllModels,
  reloadSelectedProvider,
  saveGeminiSetup,
  saveProviderApiKey,
} = useProviderApiKeySectionRuntime()

onMounted(() => {
  void initialize()
})
</script>
