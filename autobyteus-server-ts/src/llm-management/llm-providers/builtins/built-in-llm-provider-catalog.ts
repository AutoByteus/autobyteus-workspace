import { BUILT_IN_LLM_PROVIDER_IDS, getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import type { LlmProviderRecord } from '../domain/models.js';

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const isGeminiConfigured = (): boolean => {
  const config = appConfigProvider.config;
  const geminiApiKey = normalizeText(config.get('GEMINI_API_KEY'));
  const vertexApiKey = normalizeText(config.get('VERTEX_AI_API_KEY'));
  const vertexProject = normalizeText(config.get('VERTEX_AI_PROJECT'));
  const vertexLocation = normalizeText(config.get('VERTEX_AI_LOCATION'));

  if (vertexApiKey) {
    return true;
  }

  if (vertexProject && vertexLocation) {
    return true;
  }

  return Boolean(geminiApiKey);
};

export class BuiltInLlmProviderCatalog {
  listProviders(): LlmProviderRecord[] {
    return BUILT_IN_LLM_PROVIDER_IDS.map((providerId) => this.getProvider(providerId));
  }

  getProvider(providerId: LLMProvider): LlmProviderRecord {
    return {
      id: providerId,
      name: getLlmProviderDisplayName(providerId),
      providerType: providerId,
      isCustom: false,
      baseUrl: null,
      apiKeyConfigured: this.isProviderConfigured(providerId),
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    };
  }

  isBuiltInProviderId(providerId: string): providerId is LLMProvider {
    return BUILT_IN_LLM_PROVIDER_IDS.includes(providerId as LLMProvider);
  }

  private isProviderConfigured(providerId: LLMProvider): boolean {
    if (providerId === 'GEMINI') {
      return isGeminiConfigured();
    }

    return Boolean(normalizeText(appConfigProvider.config.getLlmApiKey(providerId)));
  }
}

let cachedBuiltInLlmProviderCatalog: BuiltInLlmProviderCatalog | null = null;

export const getBuiltInLlmProviderCatalog = (): BuiltInLlmProviderCatalog => {
  if (!cachedBuiltInLlmProviderCatalog) {
    cachedBuiltInLlmProviderCatalog = new BuiltInLlmProviderCatalog();
  }
  return cachedBuiltInLlmProviderCatalog;
};
