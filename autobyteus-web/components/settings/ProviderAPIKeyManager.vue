<template>
  <div class="provider-api-key-manager flex-1 flex flex-col h-full overflow-hidden">
    <div class="flex-1 flex flex-col h-full min-h-0">
      <div class="flex items-center justify-between px-8 pt-8 pb-4">
        <div class="flex flex-col">
          <h2 class="text-xl font-semibold text-gray-900">
            API Key Management
          </h2>
          <p class="text-sm text-gray-500 mt-1">Manage provider keys and reload available models</p>
        </div>
        <button
          @click="refreshModels"
          class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          title="Reload all models"
          :disabled="isLoadingModels || isReloadingModels"
        >
          <span
            class="i-heroicons-arrow-path-20-solid w-5 h-5 mr-2 text-gray-500 group-hover:text-gray-700"
            :class="{ 'animate-spin': isLoadingModels || isReloadingModels }"
          ></span>
          Reload Models
        </button>
      </div>

      <div v-if="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
      </div>

      <div v-else class="flex-1 flex flex-col overflow-auto px-8 pb-8">
        <!-- Provider Sidebar + Details Panel (includes API key config and models) -->
        <div class="flex-1 flex flex-col">
          
          <!-- Loading state for models -->
          <div
            v-if="isLoadingModels || isReloadingModels"
            class="flex justify-center items-center py-6"
          >
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"
            ></div>
            <p class="text-gray-600">
              {{
                isReloadingModels
                  ? "Reloading and discovering models..."
                  : "Loading available models..."
              }}
            </p>
          </div>
          <div
            v-else-if="!hasAnyModels"
            class="bg-gray-50 rounded-lg p-6 text-center"
          >
            <span
              class="i-heroicons-cube-transparent-20-solid w-10 h-10 text-gray-400 mx-auto mb-3"
            ></span>
            <p class="text-gray-600">
              No models available. Configure at least one provider API key to
              see available models.
            </p>
          </div>
          
          <!-- Two-column layout: Provider Sidebar + Model Panel -->
          <div v-else class="flex gap-6 items-stretch flex-1">
            <!-- Left Sidebar: Provider List -->
            <div class="w-64 flex-shrink-0 bg-gray-50/50 rounded-xl overflow-hidden border border-gray-200 flex flex-col">
              <div class="px-4 py-3 border-b border-gray-200/60 bg-gray-50">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Providers</span>
              </div>
              <div class="p-2 space-y-0.5 flex-1 overflow-y-auto">
                <button
                  v-for="provider in allProvidersWithModels"
                  :key="`sidebar-${provider.name}`"
                  @click="selectProviderForModels(provider.name)"
                  class="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-all duration-200"
                  :class="selectedModelProvider === provider.name 
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'"
                >
                  <div class="flex items-center min-w-0">
                    <span
                      class="w-2 h-2 rounded-full mr-3 flex-shrink-0 transition-colors"
                      :class="isProviderConfigured(provider.name) 
                        ? (selectedModelProvider === provider.name ? 'bg-green-500' : 'bg-green-400')
                        : 'bg-gray-300'"
                    ></span>
                    <span class="truncate font-medium text-sm">{{ provider.name }}</span>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                    <span 
                      class="text-xs py-0.5 px-2 rounded-full transition-colors font-medium border"
                      :class="selectedModelProvider === provider.name
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-gray-100 text-gray-400 border-transparent group-hover:bg-white group-hover:border-gray-200'"
                    >
                      {{ provider.totalModels }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Right Panel: Models for Selected Provider -->
            <div class="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <!-- Panel Header -->
              <div 
                class="px-5 py-4 border-b flex items-center justify-between bg-white"
              >
                <div class="flex items-center gap-3">
                  <span 
                    class="text-lg font-semibold text-gray-900"
                  >{{ selectedModelProvider }}</span>
                  
                  <span 
                    class="text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5"
                    :class="isProviderConfigured(selectedModelProvider) 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-gray-50 text-gray-500 border-gray-100'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="isProviderConfigured(selectedModelProvider) ? 'bg-green-500' : 'bg-gray-400'"></span>
                    {{ isProviderConfigured(selectedModelProvider) ? 'Configured' : 'Not Configured' }}
                  </span>
                </div>
                <button
                  @click="reloadSelectedProviderModels"
                  :disabled="!selectedModelProvider || isLoadingModels || isReloadingModels || isReloadingProviderModels"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Reload models for selected provider"
                >
                  <span
                    class="i-heroicons-arrow-path-20-solid w-4 h-4 mr-2 text-blue-600"
                    :class="{ 'animate-spin': isReloadingModels || isReloadingSelectedProvider }"
                  ></span>
                  Reload Models
                </button>
              </div>

              <!-- API Key Configuration Section -->
              <div class="px-5 py-4 border-b border-gray-100 bg-white">
                <div v-if="selectedModelProvider === 'GEMINI'" class="space-y-3">
                  <p class="text-xs text-gray-500">
                    Gemini setup: choose a mode and fill only required fields.
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="modeOption in geminiModeOptions"
                      :key="modeOption.value"
                      type="button"
                      class="px-3 py-1.5 text-xs rounded-full border transition-colors"
                      :class="geminiSetupMode === modeOption.value
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                      @click="geminiSetupMode = modeOption.value"
                    >
                      {{ modeOption.label }}
                    </button>
                  </div>

                  <div v-if="geminiSetupMode === 'AI_STUDIO'" class="relative">
                    <input
                      v-model="geminiApiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="Enter Gemini API key..."
                    />
                    <button
                      @click="toggleApiKeyVisibility"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
                      <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
                    </button>
                  </div>

                  <div v-if="geminiSetupMode === 'VERTEX_EXPRESS'" class="relative">
                    <input
                      v-model="vertexApiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="Enter Vertex API key..."
                    />
                    <button
                      @click="toggleApiKeyVisibility"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
                      <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
                    </button>
                  </div>

                  <div v-if="geminiSetupMode === 'VERTEX_PROJECT'" class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      v-model="vertexProject"
                      type="text"
                      class="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="Vertex project id"
                    />
                    <input
                      v-model="vertexLocation"
                      type="text"
                      class="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="Vertex location (e.g. us-central1)"
                    />
                  </div>

                  <button
                    @click="saveApiKeyForSelectedProvider"
                    :disabled="!canSaveGeminiSetup || saving"
                    class="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
                  >
                    <span
                      v-if="saving"
                      class="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"
                    ></span>
                    {{ saving ? 'Saving...' : 'Save Gemini Setup' }}
                  </button>
                </div>

                <div v-else class="flex gap-2">
                  <div class="relative flex-1">
                    <input
                      v-model="apiKey"
                      :type="showApiKey ? 'text' : 'password'"
                      class="w-full p-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      :placeholder="isProviderConfigured(selectedModelProvider) ? 'Enter new key to update...' : 'Enter API key...'"
                    />
                    <button
                      @click="toggleApiKeyVisibility"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <span v-if="showApiKey" class="i-heroicons-eye-slash-20-solid w-4 h-4"></span>
                      <span v-else class="i-heroicons-eye-20-solid w-4 h-4"></span>
                    </button>
                  </div>
                  <button
                    @click="saveApiKeyForSelectedProvider"
                    :disabled="!apiKey || saving"
                    class="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
                  >
                    <span
                      v-if="saving"
                      class="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"
                    ></span>
                    {{ saving ? 'Saving...' : 'Save Key' }}
                  </button>
                </div>
              </div>

              <!-- Panel Content: Models by Type -->
              <div class="px-5 py-4 bg-gray-50/30 flex-1 overflow-y-auto relative">
                <div
                  v-if="isReloadingSelectedProvider"
                  class="absolute inset-0 bg-white flex items-center justify-center z-10"
                >
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></span>
                    Reloading models...
                  </div>
                </div>
                
                <div v-if="selectedProviderLlmModels.length > 0 || selectedProviderAudioModels.length > 0 || selectedProviderImageModels.length > 0" class="mb-2"></div>

                <div class="space-y-6">
                  <!-- LLM Models -->
                  <div v-if="selectedProviderLlmModels.length > 0">
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      LLM Models
                    </h4>
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      <div 
                        v-for="model in selectedProviderLlmModels" 
                        :key="`panel-llm-${model.modelIdentifier}`"
                        class="py-2.5 px-3 bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
                      >
                        <span class="break-all font-medium text-gray-900">{{ model.modelIdentifier }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Audio Models -->
                  <div v-if="selectedProviderAudioModels.length > 0">
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Audio Models
                    </h4>
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      <div 
                        v-for="model in selectedProviderAudioModels" 
                        :key="`panel-audio-${model.modelIdentifier}`"
                        class="py-2.5 px-3 bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
                      >
                        <span class="break-all font-medium text-gray-900">{{ model.modelIdentifier }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Image Models -->
                  <div v-if="selectedProviderImageModels.length > 0">
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Image Models
                    </h4>
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      <div 
                        v-for="model in selectedProviderImageModels" 
                        :key="`panel-image-${model.modelIdentifier}`"
                        class="py-2.5 px-3 bg-white border border-gray-100 hover:border-amber-200 hover:shadow-sm rounded-lg text-sm transition-all duration-200"
                      >
                        <span class="break-all font-medium text-gray-900">{{ model.modelIdentifier }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Empty state for selected provider -->
                  <div 
                    v-if="selectedProviderLlmModels.length === 0 && selectedProviderAudioModels.length === 0 && selectedProviderImageModels.length === 0"
                    class="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div class="bg-gray-50 p-4 rounded-full mb-3">
                      <span class="i-heroicons-cube-transparent-20-solid w-8 h-8 text-gray-300"></span>
                    </div>
                    <h4 class="text-gray-900 font-medium mb-1">No Models Found</h4>
                    <p class="text-sm text-gray-500 max-w-xs mx-auto">
                      This provider doesn't have any models available yet. Try checking your API key configuration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div
        v-if="notification"
        class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
        :class="
          notification.type === 'success'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        "
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useLLMProviderConfigStore, type GeminiSetupMode } from "~/stores/llmProviderConfig";

const store = useLLMProviderConfigStore();
// Use storeToRefs for reactive state properties
const {
  isLoadingModels,
  isReloadingModels,
  isReloadingProviderModels,
  reloadingProvider,
  providers,
  providersWithModels,
  audioProvidersWithModels,
  imageProvidersWithModels,
  geminiSetup,
} = storeToRefs(store);

// Computed properties for provider groups with models (filter out empty ones)
const llmProvidersWithModels = computed(() => 
  (providersWithModels.value || []).filter(p => p.models && p.models.length > 0)
);

// Track expanded state for each provider section
// Key format: `${modelType}-${provider}` e.g., "llm-ANTHROPIC"
const expandedProviders = ref<Record<string, boolean>>({});

// Initialize expansion state - configured providers expanded by default
const initializeExpansionState = () => {
  const allProviderGroups = [
    ...(providersWithModels.value || []).map(p => ({ type: 'llm', provider: p.provider })),
    ...(audioProvidersWithModels.value || []).map(p => ({ type: 'audio', provider: p.provider })),
    ...(imageProvidersWithModels.value || []).map(p => ({ type: 'image', provider: p.provider })),
  ];
  
  allProviderGroups.forEach(({ type, provider }) => {
    const key = `${type}-${provider}`;
    // Only set if not already set (preserve user's expansion state)
    if (expandedProviders.value[key] === undefined) {
      expandedProviders.value[key] = isProviderConfigured(provider);
    }
  });
};

const isProviderExpanded = (modelType: string, provider: string): boolean => {
  const key = `${modelType}-${provider}`;
  // Default to expanded for configured providers, collapsed for unconfigured
  if (expandedProviders.value[key] === undefined) {
    return isProviderConfigured(provider);
  }
  return expandedProviders.value[key];
};

const toggleProviderExpansion = (modelType: string, provider: string) => {
  const key = `${modelType}-${provider}`;
  expandedProviders.value[key] = !isProviderExpanded(modelType, provider);
};

const loading = ref(import.meta.env.MODE === "test" ? false : true);
const saving = ref(false);
const apiKey = ref("");
const showApiKey = ref(false);
const notification = ref<{ type: "success" | "error"; message: string } | null>(
  null
);

const providerConfigs = ref<Record<string, { apiKey?: string }>>({});

const geminiModeOptions: Array<{ value: GeminiSetupMode; label: string }> = [
  { value: 'AI_STUDIO', label: 'AI Studio' },
  { value: 'VERTEX_EXPRESS', label: 'Vertex Express' },
  { value: 'VERTEX_PROJECT', label: 'Vertex Project' },
];

const geminiSetupMode = ref<GeminiSetupMode>('AI_STUDIO');
const geminiApiKey = ref('');
const vertexApiKey = ref('');
const vertexProject = ref('');
const vertexLocation = ref('');

const applyGeminiSetupToForm = () => {
  const setup = geminiSetup.value;
  geminiSetupMode.value = setup.mode ?? 'AI_STUDIO';
  vertexProject.value = setup.vertexProject ?? '';
  vertexLocation.value = setup.vertexLocation ?? '';
  geminiApiKey.value = '';
  vertexApiKey.value = '';
};

const isGeminiConfigured = computed(() => {
  const setup = geminiSetup.value;
  if (!setup) return false;
  if (setup.mode === 'VERTEX_EXPRESS') {
    return setup.vertexApiKeyConfigured;
  }
  if (setup.mode === 'VERTEX_PROJECT') {
    return Boolean((setup.vertexProject ?? '').trim() && (setup.vertexLocation ?? '').trim());
  }
  return setup.geminiApiKeyConfigured;
});

const isProviderConfigured = (provider: string): boolean => {
  if (provider === 'GEMINI') {
    return isGeminiConfigured.value;
  }
  return !!providerConfigs.value[provider]?.apiKey;
};

const canSaveGeminiSetup = computed(() => {
  if (geminiSetupMode.value === 'VERTEX_PROJECT') {
    return Boolean(vertexProject.value.trim() && vertexLocation.value.trim());
  }
  if (geminiSetupMode.value === 'VERTEX_EXPRESS') {
    return Boolean(vertexApiKey.value.trim());
  }
  return Boolean(geminiApiKey.value.trim());
});

// Computed property to check if we have any models
const hasAnyModels = computed(
  () =>
    llmProvidersWithModels.value.length > 0 ||
    (audioProvidersWithModels.value || []).some(p => p.models && p.models.length > 0) ||
    (imageProvidersWithModels.value || []).some(p => p.models && p.models.length > 0)
);

// ============ Provider Sidebar + Model Panel State ============

// Track which provider is selected in the Available Models section
const selectedModelProvider = ref<string>("");

// Combined list of ALL providers with their model counts
// Each entry has: name, totalModels (across all types)
interface ProviderSummary {
  name: string;
  totalModels: number;
}

const allProvidersWithModels = computed<ProviderSummary[]>(() => {
  const providerMap = new Map<string, number>();
  
  // First, ensure ALL providers from the providers list are included
  (providers.value || []).forEach(p => {
    providerMap.set(p, 0);
  });
  
  // Count LLM models per provider
  (providersWithModels.value || []).forEach(p => {
    const count = p.models?.length || 0;
    providerMap.set(p.provider, (providerMap.get(p.provider) || 0) + count);
  });
  
  // Count Audio models per provider  
  (audioProvidersWithModels.value || []).forEach(p => {
    const count = p.models?.length || 0;
    providerMap.set(p.provider, (providerMap.get(p.provider) || 0) + count);
  });
  
  // Count Image models per provider
  (imageProvidersWithModels.value || []).forEach(p => {
    const count = p.models?.length || 0;
    providerMap.set(p.provider, (providerMap.get(p.provider) || 0) + count);
  });
  
  // Convert to array - include ALL providers (even with 0 models)
  return Array.from(providerMap.entries())
    .map(([name, totalModels]) => ({ name, totalModels }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

// Get LLM models for the selected provider
const selectedProviderLlmModels = computed(() => {
  if (!selectedModelProvider.value) return [];
  const providerGroup = (providersWithModels.value || []).find(
    p => p.provider === selectedModelProvider.value
  );
  return providerGroup?.models || [];
});

// Get Audio models for the selected provider
const selectedProviderAudioModels = computed(() => {
  if (!selectedModelProvider.value) return [];
  const providerGroup = (audioProvidersWithModels.value || []).find(
    p => p.provider === selectedModelProvider.value
  );
  return providerGroup?.models || [];
});

// Get Image models for the selected provider
const selectedProviderImageModels = computed(() => {
  if (!selectedModelProvider.value) return [];
  const providerGroup = (imageProvidersWithModels.value || []).find(
    p => p.provider === selectedModelProvider.value
  );
  return providerGroup?.models || [];
});

const isReloadingSelectedProvider = computed(() => {
  if (!selectedModelProvider.value) return false;
  return (
    isReloadingProviderModels.value &&
    reloadingProvider.value === selectedModelProvider.value
  );
});

// Select a provider to view its models
const selectProviderForModels = async (providerName: string) => {
  selectedModelProvider.value = providerName;
  if (providerName === 'GEMINI') {
    try {
      await store.fetchGeminiSetupConfig();
      applyGeminiSetupToForm();
    } catch (error) {
      console.error('Failed to refresh Gemini setup config:', error);
    }
  }
};

// Auto-select first configured provider (or first provider if none configured)
const initializeSelectedProvider = () => {
  if (allProvidersWithModels.value.length === 0) return;
  
  // Try to find first configured provider
  const configuredProvider = allProvidersWithModels.value.find(
    p => isProviderConfigured(p.name)
  );
  
  if (configuredProvider) {
    selectedModelProvider.value = configuredProvider.name;
  } else {
    // Fall back to first provider
    selectedModelProvider.value = allProvidersWithModels.value[0].name;
  }
};

const refreshModels = async () => {
  try {
    // Call reloadModels to force backend to rediscover models first
    await store.reloadModels();
    showNotification("Models reloaded and refreshed successfully", "success");
  } catch (error) {
    console.error("Failed to reload models:", error);
    showNotification("Failed to reload models", "error");
  }
};

const reloadSelectedProviderModels = async () => {
  if (!selectedModelProvider.value) return;

  try {
    await store.reloadModelsForProvider(selectedModelProvider.value);
    showNotification(
      `Models reloaded for ${selectedModelProvider.value}`,
      "success"
    );
  } catch (error) {
    console.error("Failed to reload provider models:", error);
    showNotification(
      `Failed to reload models for ${selectedModelProvider.value}`,
      "error"
    );
  }
};

onMounted(async () => {
  try {
    await store.fetchProvidersWithModels();
    await store.fetchGeminiSetupConfig();
    applyGeminiSetupToForm();

    // Load existing configurations in parallel
    const keyFetchPromises = providers.value.map(async (provider) => {
      if (provider === 'GEMINI') {
        providerConfigs.value[provider] = {};
        return;
      }
      try {
        const apiKey = await store.getLLMProviderApiKey(provider);
        // Check specifically for non-empty strings to determine if configured
        if (apiKey && typeof apiKey === "string" && apiKey.trim() !== "") {
          providerConfigs.value[provider] = { apiKey: "********" };
        } else {
          // Ensure provider exists in providerConfigs but without apiKey property
          providerConfigs.value[provider] = {};
        }
      } catch (error) {
        console.error(`Failed to load API key for ${provider}:`, error);
        // Ensure provider exists in providerConfigs but without apiKey property
        providerConfigs.value[provider] = {};
      }
    });

    await Promise.all(keyFetchPromises);
    
    // Initialize the selected provider for the models panel
    initializeSelectedProvider();
  } catch (error) {
    console.error("Failed to load providers or models:", error);
    showNotification("Failed to load providers and models", "error");
  } finally {
    loading.value = false;
  }
});

const toggleApiKeyVisibility = () => {
  showApiKey.value = !showApiKey.value;
};

const showNotification = (message: string, type: "success" | "error") => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};

const saveApiKeyForSelectedProvider = async () => {
  if (!selectedModelProvider.value) return;

  saving.value = true;
  try {
    if (selectedModelProvider.value === "GEMINI") {
      const payload = {
        mode: geminiSetupMode.value,
        geminiApiKey: geminiSetupMode.value === 'AI_STUDIO' ? geminiApiKey.value : null,
        vertexApiKey: geminiSetupMode.value === 'VERTEX_EXPRESS' ? vertexApiKey.value : null,
        vertexProject: geminiSetupMode.value === 'VERTEX_PROJECT' ? vertexProject.value : null,
        vertexLocation: geminiSetupMode.value === 'VERTEX_PROJECT' ? vertexLocation.value : null,
      };

      await store.setGeminiSetupConfig(payload);
      applyGeminiSetupToForm();
      showNotification("Gemini setup saved successfully", "success");
      return;
    }

    if (!apiKey.value) return;
    await store.setLLMProviderApiKey(selectedModelProvider.value, apiKey.value);
    providerConfigs.value[selectedModelProvider.value] = { apiKey: "********" };

    showNotification(
      `API key for ${selectedModelProvider.value} saved successfully`,
      "success"
    );
    apiKey.value = "";
  } catch (error) {
    console.error("Failed to save API key or reload models:", error);
    showNotification(
      `Failed to save API key for ${selectedModelProvider.value}`,
      "error"
    );
  } finally {
    saving.value = false;
  }
};

defineExpose({
  loading,
  selectedModelProvider,
});
</script>
