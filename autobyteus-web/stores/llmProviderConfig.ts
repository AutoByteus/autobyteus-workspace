import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { 
  GET_LLM_PROVIDER_API_KEY, 
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_GEMINI_SETUP_CONFIG
} from '~/graphql/queries/llm_provider_queries'
import { 
  SET_LLM_PROVIDER_API_KEY,
  RELOAD_LLM_MODELS,
  RELOAD_LLM_PROVIDER_MODELS,
  SET_GEMINI_SETUP_CONFIG
} from '~/graphql/mutations/llm_provider_mutations'
import type { LLMProvider } from '~/types/llm'
import { LLMProvider as LLMProviderEnum } from '~/types/llm'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema';

interface LLMProviderConfig {
  apiKey?: string
}

interface ModelInfo {
  modelIdentifier: string;
  name: string;
  value: string;
  canonicalName: string;
  provider: string;
  runtime: string;
  hostUrl?: string | null;
  configSchema?: Record<string, unknown> | null;  // ParameterSchema for model-specific config
}

interface ProviderWithModels {
  provider: string;
  models: ModelInfo[];
}

export type GeminiSetupMode = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT';

export interface GeminiSetupConfigState {
  mode: GeminiSetupMode;
  geminiApiKeyConfigured: boolean;
  vertexApiKeyConfigured: boolean;
  vertexProject: string | null;
  vertexLocation: string | null;
}

export interface GeminiSetupConfigInput {
  mode: GeminiSetupMode;
  geminiApiKey?: string | null;
  vertexApiKey?: string | null;
  vertexProject?: string | null;
  vertexLocation?: string | null;
}

const defaultGeminiSetup = (): GeminiSetupConfigState => ({
  mode: 'AI_STUDIO',
  geminiApiKeyConfigured: false,
  vertexApiKeyConfigured: false,
  vertexProject: null,
  vertexLocation: null,
});

export const useLLMProviderConfigStore = defineStore('llmProviderConfig', {
  state: () => ({
    providersWithModels: [] as ProviderWithModels[],
    audioProvidersWithModels: [] as ProviderWithModels[],
    imageProvidersWithModels: [] as ProviderWithModels[],
    providerConfigs: {} as Record<string, LLMProviderConfig>,
    isLoadingModels: false,
    isReloadingModels: false,
    isReloadingProviderModels: false,
    reloadingProvider: null as string | null,
    hasFetchedProviders: false,
    geminiSetup: defaultGeminiSetup(),
  }),
  getters: {
    providers(state): string[] {
      return state.providersWithModels.map(p => p.provider);
    },
    models(state): string[] {
      return state.providersWithModels.flatMap(p => p.models.map(m => m.modelIdentifier));
    },
    audioModels(state): string[] {
      return state.audioProvidersWithModels.flatMap(p => p.models.map(m => m.modelIdentifier));
    },
    imageModels(state): string[] {
      return state.imageProvidersWithModels.flatMap(p => p.models.map(m => m.modelIdentifier));
    },
    providersWithModelsForSelection(state): ProviderWithModels[] {
      return state.providersWithModels.filter(p => p.models && p.models.length > 0);
    },
    modelConfigSchemaByIdentifier(state): (modelIdentifier: string | null | undefined) => UiModelConfigSchema | null {
      return (modelIdentifier: string | null | undefined) => {
        if (!modelIdentifier) return null;
        for (const provider of state.providersWithModels) {
          const model = provider.models.find(m => m.modelIdentifier === modelIdentifier);
          if (model?.configSchema) {
            const normalized = normalizeModelConfigSchema(model.configSchema);
            if (normalized && Object.keys(normalized).length > 0) {
              return normalized;
            }
          }
        }
        return null;
      };
    },
    /**
     * Getter for a sorted list of unique canonical model names, with "default" as the first option.
     */
    canonicalModels(state): string[] {
      const canonicalSet = new Set<string>();
      state.providersWithModels.forEach(provider => {
        provider.models.forEach(model => {
          if (model.canonicalName) {
            canonicalSet.add(model.canonicalName);
          }
        });
      });
      const models = Array.from(canonicalSet).sort();
      // Add 'default' as a special option at the top of the list.
      models.unshift('default');
      return models;
    },
  },
  actions: {
    getProviderForModel(modelIdentifier: string): LLMProvider | null {
      if (!modelIdentifier || !this.providersWithModels) {
        return null;
      }
    
      for (const providerGroup of this.providersWithModels) {
        if (providerGroup.models.some(m => m.modelIdentifier === modelIdentifier)) {
          const providerKey = providerGroup.provider.toUpperCase() as keyof typeof LLMProviderEnum;
          if (Object.values(LLMProviderEnum).includes(providerKey as LLMProvider)) {
            return providerKey as LLMProvider;
          }
        }
      }
      
      return null; // Model not found in any provider list
    },
    
    getModelValue(modelIdentifier: string): string | null {
      for (const providerGroup of this.providersWithModels) {
        const model = providerGroup.models.find(m => m.modelIdentifier === modelIdentifier);
        if (model) {
          return model.value;
        }
      }
      return null;
    },
    
    getModelIdentifierByValue(value: string): string | null {
      for (const providerGroup of this.providersWithModels) {
        const model = providerGroup.models.find(m => m.value === value);
        if (model) {
          return model.modelIdentifier;
        }
      }
      return null;
    },

    async fetchProvidersWithModels() {
      if (this.hasFetchedProviders) return;
      this.isLoadingModels = true;
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
          // Use default 'cache-first' policy
        });

        this.providersWithModels = data?.availableLlmProvidersWithModels ?? [];
        this.audioProvidersWithModels = data?.availableAudioProvidersWithModels ?? [];
        this.imageProvidersWithModels = data?.availableImageProvidersWithModels ?? [];
        this.hasFetchedProviders = true;
        return this.providersWithModels;
      } catch (error) {
        console.error('Failed to fetch providers and models:', error);
        this.providersWithModels = [];
        this.audioProvidersWithModels = [];
        this.imageProvidersWithModels = [];
        throw error;
      } finally {
        this.isLoadingModels = false;
      }
    },

    async reloadProvidersWithModels(options: { showLoading?: boolean } = {}) {
      const { showLoading = true } = options;
      if (showLoading) {
        this.isReloadingModels = true;
      }
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
          fetchPolicy: 'network-only' // Force network fetch, bypassing cache
        });

        this.providersWithModels = data?.availableLlmProvidersWithModels ?? [];
        this.audioProvidersWithModels = data?.availableAudioProvidersWithModels ?? [];
        this.imageProvidersWithModels = data?.availableImageProvidersWithModels ?? [];
        this.hasFetchedProviders = true;
        return this.providersWithModels;
      } catch (error) {
        console.error('Failed to reload providers and models:', error);
        this.providersWithModels = [];
        this.audioProvidersWithModels = [];
        this.imageProvidersWithModels = [];
        throw error;
      } finally {
        if (showLoading) {
          this.isReloadingModels = false;
        }
      }
    },

    async reloadModels() {
      this.isReloadingModels = true;
      
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: RELOAD_LLM_MODELS,
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const responseMessage = data?.reloadLlmModels;
        
        if (responseMessage && responseMessage.includes("successfully")) {
          // After successful reload, fetch the updated models
          await this.reloadProvidersWithModels();
          return true;
        }
        
        throw new Error(responseMessage || 'Failed to reload models');
      } catch (error) {
        console.error('Failed to reload models:', error);
        throw error;
      } finally {
        this.isReloadingModels = false;
      }
    },

    async reloadModelsForProvider(provider: string) {
      if (!provider) {
        throw new Error('Provider is required to reload models.');
      }

      this.isReloadingProviderModels = true;
      this.reloadingProvider = provider;

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: RELOAD_LLM_PROVIDER_MODELS,
          variables: { provider },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const responseMessage = data?.reloadLlmProviderModels;

        if (responseMessage && responseMessage.includes("successfully")) {
          await this.reloadProvidersWithModels({ showLoading: false });
          return true;
        }

        throw new Error(responseMessage || 'Failed to reload provider models');
      } catch (error) {
        console.error(`Failed to reload models for provider ${provider}:`, error);
        throw error;
      } finally {
        this.isReloadingProviderModels = false;
        this.reloadingProvider = null;
      }
    },

    async setLLMProviderApiKey(provider: string, apiKey: string) {
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate({
          mutation: SET_LLM_PROVIDER_API_KEY,
          variables: { provider, apiKey },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        
        const responseMessage = data?.setLlmProviderApiKey;
        
        if (responseMessage && responseMessage.includes("successfully")) {
          if (!this.providerConfigs[provider]) {
            this.providerConfigs[provider] = {}
          }
          this.providerConfigs[provider].apiKey = apiKey
          
          // Only auto-reload for AUTOBYTEUS to discover internal service models
          if (provider === 'AUTOBYTEUS') {
            await this.reloadModels()
          }
          return true
        }
        
        throw new Error(responseMessage || 'Failed to set API key');
      } catch (error) {
        console.error('Failed to set provider API key:', error)
        throw error
      }
    },

    async getLLMProviderApiKey(provider: string) {
      const client = getApolloClient()
      
      try {
        const { data } = await client.query({
          query: GET_LLM_PROVIDER_API_KEY,
          variables: { provider },
        });

        if (data && data.getLlmProviderApiKey) {
          const apiKey = data.getLlmProviderApiKey;
          if (!this.providerConfigs[provider]) {
            this.providerConfigs[provider] = {};
          }
          this.providerConfigs[provider].apiKey = apiKey;
          return apiKey;
        } else {
          if (this.providerConfigs[provider]) {
            delete this.providerConfigs[provider].apiKey;
          }
          return '';
        }
      } catch (error) {
        console.error(`Failed to get provider API key for ${provider}:`, error);
        throw error;
      }
    },

    async fetchGeminiSetupConfig() {
      const client = getApolloClient()

      try {
        const { data } = await client.query({
          query: GET_GEMINI_SETUP_CONFIG,
          fetchPolicy: 'network-only',
        });

        this.geminiSetup = data?.getGeminiSetupConfig ?? defaultGeminiSetup();
        return this.geminiSetup;
      } catch (error) {
        console.error('Failed to fetch Gemini setup config:', error);
        this.geminiSetup = defaultGeminiSetup();
        throw error;
      }
    },

    async setGeminiSetupConfig(input: GeminiSetupConfigInput) {
      const client = getApolloClient()

      try {
        const { data, errors } = await client.mutate({
          mutation: SET_GEMINI_SETUP_CONFIG,
          variables: {
            mode: input.mode,
            geminiApiKey: input.geminiApiKey ?? null,
            vertexApiKey: input.vertexApiKey ?? null,
            vertexProject: input.vertexProject ?? null,
            vertexLocation: input.vertexLocation ?? null,
          },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const responseMessage = data?.setGeminiSetupConfig;
        if (!responseMessage || !responseMessage.includes('successfully')) {
          throw new Error(responseMessage || 'Failed to save Gemini setup');
        }

        await this.fetchGeminiSetupConfig();
        return true;
      } catch (error) {
        console.error('Failed to set Gemini setup config:', error);
        throw error;
      }
    }
  }
})
