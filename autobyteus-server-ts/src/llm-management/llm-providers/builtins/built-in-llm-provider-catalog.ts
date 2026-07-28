import { BUILT_IN_LLM_PROVIDER_IDS, getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { LlmProviderRecord } from '../domain/models.js';

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
      apiKeyConfigured: false,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    };
  }

  isBuiltInProviderId(providerId: string): providerId is LLMProvider {
    return BUILT_IN_LLM_PROVIDER_IDS.includes(providerId as LLMProvider);
  }
}

let cachedBuiltInLlmProviderCatalog: BuiltInLlmProviderCatalog | null = null;

export const getBuiltInLlmProviderCatalog = (): BuiltInLlmProviderCatalog => {
  if (!cachedBuiltInLlmProviderCatalog) {
    cachedBuiltInLlmProviderCatalog = new BuiltInLlmProviderCatalog();
  }
  return cachedBuiltInLlmProviderCatalog;
};
