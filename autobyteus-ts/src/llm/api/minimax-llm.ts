import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import { providerAddressThrough, type LLMEndpoint } from '../llm-endpoint.js';

export class MinimaxLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver?: ProviderApiKeyResolver, endpoint?: LLMEndpoint) {
    super(model, providerAddressThrough('https://api.minimax.io/v1', endpoint), config, apiKeyResolver, LLMProvider.MINIMAX);
  }
}
