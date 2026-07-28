import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { OpenAICompatibleEndpointModel } from '../openai-compatible-endpoint-model.js';

export class OpenAICompatibleEndpointLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    if (!(model instanceof OpenAICompatibleEndpointModel)) {
      throw new Error('OpenAICompatibleEndpointLLM requires an OpenAICompatibleEndpointModel.');
    }

    super(
      model,
      model.endpointBaseUrl,
      config,
      apiKeyResolver,
      model.providerId,
    );
  }
}
