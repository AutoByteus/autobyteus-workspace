import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import type { CustomLlmProviderRecord } from './custom-llm-provider-config.js';
import type { OpenAICompatibleEndpointDiscoveredModel } from './openai-compatible-endpoint-discovery.js';
import { OpenAICompatibleEndpointLLM } from './api/openai-compatible-endpoint-llm.js';

export const buildOpenAICompatibleEndpointModelIdentifier = (
  providerId: string,
  modelName: string,
): string => `openai-compatible:${providerId}:${modelName}`;

export type OpenAICompatibleEndpointModelInput = {
  endpoint: CustomLlmProviderRecord;
  discoveredModel: OpenAICompatibleEndpointDiscoveredModel;
};

export class OpenAICompatibleEndpointModel extends LLMModel {
  readonly endpointId: string;
  readonly endpointDisplayName: string;
  readonly endpointBaseUrl: string;
  readonly endpointApiKey: string;

  constructor(input: OpenAICompatibleEndpointModelInput) {
    const { endpoint, discoveredModel } = input;
    const modelId = buildOpenAICompatibleEndpointModelIdentifier(endpoint.id, discoveredModel.id);

    super({
      name: discoveredModel.name,
      value: discoveredModel.value,
      canonicalName: discoveredModel.canonicalName,
      provider: LLMProvider.OPENAI_COMPATIBLE,
      providerId: endpoint.id,
      providerName: endpoint.name,
      runtime: LLMRuntime.OPENAI_COMPATIBLE,
      llmClass: OpenAICompatibleEndpointLLM,
      hostUrl: endpoint.baseUrl,
      defaultConfig: new LLMConfig({
        pricingConfig: new TokenPricingConfig({
          inputTokenPricing: 0.0,
          outputTokenPricing: 0.0,
        }),
      }),
      modelIdentifierOverride: modelId,
    });

    this.endpointId = endpoint.id;
    this.endpointDisplayName = endpoint.name;
    this.endpointBaseUrl = endpoint.baseUrl;
    this.endpointApiKey = endpoint.apiKey;
  }
}
