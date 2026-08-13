import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import { resolveQwenBaseUrl } from '../qwen-provider-config.js';

export class QwenLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, resolveQwenBaseUrl(), config, apiKeyResolver, LLMProvider.QWEN);
  }
}
