import { LLMConfig } from './utils/llm-config.js';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import type { CustomLlmProviderRecord } from './custom-llm-provider-config.js';
import type { OpenAICompatibleEndpointDiscoveredModel } from './openai-compatible-endpoint-discovery.js';
import { OpenAICompatibleEndpointLLM } from './api/openai-compatible-endpoint-llm.js';
import type { ResolvedModelMetadata } from './metadata/model-metadata-resolver.js';

export const buildOpenAICompatibleEndpointModelIdentifier = (
  providerId: string,
  modelName: string,
): string => `openai-compatible:${providerId}:${modelName}`;

export type OpenAICompatibleEndpointModelIdentifier = {
  providerId: string;
  modelName: string;
};

const OPENAI_COMPATIBLE_MODEL_PREFIX = 'openai-compatible:';

export const parseOpenAICompatibleEndpointModelIdentifier = (
  identifier: string,
): OpenAICompatibleEndpointModelIdentifier | null => {
  if (!identifier.startsWith(OPENAI_COMPATIBLE_MODEL_PREFIX)) return null;
  const remainder = identifier.slice(OPENAI_COMPATIBLE_MODEL_PREFIX.length);
  const separatorIndex = remainder.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === remainder.length - 1) return null;
  return {
    providerId: remainder.slice(0, separatorIndex),
    modelName: remainder.slice(separatorIndex + 1),
  };
};

export type OpenAICompatibleEndpointModelInput = {
  endpoint: CustomLlmProviderRecord;
  discoveredModel: OpenAICompatibleEndpointDiscoveredModel;
  resolvedModelMetadata: ResolvedModelMetadata;
};

export class OpenAICompatibleEndpointModel extends LLMModel {
  readonly endpointId: string;
  readonly endpointDisplayName: string;
  readonly endpointBaseUrl: string;

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
      defaultConfig: new LLMConfig(),
      modelIdentifierOverride: modelId,
      maxContextTokens: input.resolvedModelMetadata.maxContextTokens.value,
      maxInputTokens: input.resolvedModelMetadata.maxInputTokens.value,
      maxOutputTokens: input.resolvedModelMetadata.maxOutputTokens.value,
      resolvedModelMetadata: input.resolvedModelMetadata,
    });

    this.endpointId = endpoint.id;
    this.endpointDisplayName = endpoint.name;
    this.endpointBaseUrl = endpoint.baseUrl;
  }
}
