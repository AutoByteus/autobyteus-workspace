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

          <div v-else class="flex-1 flex flex-col gap-4">
            <ProviderModelBrowser
              :providers="allProvidersWithModels"
              :selected-provider-id="selectedProviderId"
              :selected-provider-label="selectedProviderLabel"
              :selected-provider-configured="selectedProviderConfigured"
              :llm-models="selectedProviderLlmModels"
              :audio-models="selectedProviderAudioModels"
              :image-models="selectedProviderImageModels"
              :is-loading-models="isLoadingModels"
              :is-reloading-models="isReloadingModels"
              :is-reloading-selected-provider="isReloadingSelectedProvider"
              :can-reload-selected-provider="canReloadSelectedProvider"
              :is-provider-configured="isProviderConfigured"
              @select-provider="selectProvider"
              @reload-selected-provider="reloadSelectedProvider()"
            >
              <template #configuration>
                <div v-if="selectedProviderSummary?.isDraft" class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6">
                  <CustomProviderEditor
                    :draft="customProviderDraft"
                    :probing="isProbingCustomProvider"
                    :saving="isSavingCustomProvider"
                    :can-probe="canProbeCustomProvider"
                    :can-save="canSaveCustomProvider"
                    :is-probe-stale="isCustomProviderProbeStale"
                    @update:draft="updateCustomProviderDraft"
                    @probe="probeCustomProviderDraft"
                    @save="saveCustomProviderDraft"
                  />

                  <CustomProviderProbePreview
                    :probe-result="customProviderProbeResult"
                    :error="customProviderError"
                    :is-probe-stale="isCustomProviderProbeStale"
                  />
                </div>

                <CustomProviderDetailsCard
                  v-else-if="selectedProviderSummary?.isCustom"
                  :provider="selectedProviderSummary"
                  :deleting="isDeletingCustomProvider"
                  @delete="deleteCustomProvider(selectedProviderId)"
                />

                <GeminiSetupForm
                  v-else-if="selectedProviderId === 'GEMINI'"
                  :gemini-setup="geminiSetup"
                  :saving="saving"
                  @save="saveGeminiSetup"
                />
                <ProviderApiKeyEditor
                  v-else-if="selectedProviderId"
                  :configured="selectedProviderConfigured"
                  :saving="saving"
                  :reset-version="providerEditorResetVersion"
                  @save="saveProviderApiKey(selectedProviderId, $event)"
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
import CustomProviderEditor from '~/components/settings/providerApiKey/customProvider/CustomProviderEditor.vue'
import CustomProviderDetailsCard from '~/components/settings/providerApiKey/customProvider/CustomProviderDetailsCard.vue'
import CustomProviderProbePreview from '~/components/settings/providerApiKey/customProvider/CustomProviderProbePreview.vue'
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
  selectedProviderId,
  selectedProviderSummary,
  selectedProviderLabel,
  selectedProviderLlmModels,
  selectedProviderAudioModels,
  selectedProviderImageModels,
  selectedProviderConfigured,
  canReloadSelectedProvider,
  isReloadingSelectedProvider,
  isProviderConfigured,
  customProviderDraft,
  customProviderProbeResult,
  customProviderError,
  isProbingCustomProvider,
  isSavingCustomProvider,
  isDeletingCustomProvider,
  isCustomProviderProbeStale,
  canProbeCustomProvider,
  canSaveCustomProvider,
  initialize,
  selectProvider,
  reloadAllModels,
  reloadSelectedProvider,
  saveGeminiSetup,
  saveProviderApiKey,
  updateCustomProviderDraft,
  probeCustomProviderDraft,
  saveCustomProviderDraft,
  deleteCustomProvider,
} = useProviderApiKeySectionRuntime()

onMounted(() => {
  void initialize()
})
</script>
