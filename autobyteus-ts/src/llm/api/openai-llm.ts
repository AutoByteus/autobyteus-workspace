import { OpenAIResponsesLLM } from './openai-responses-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

export class OpenAILLM extends OpenAIResponsesLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, 'https://api.openai.com/v1', config, apiKeyResolver, LLMProvider.OPENAI);
  }
}
