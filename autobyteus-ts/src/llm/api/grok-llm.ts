import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';

export class GrokLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'grok-4-1-fast-reasoning',
        value: 'grok-4-1-fast-reasoning',
        canonicalName: 'grok-4-1-fast-reasoning',
        provider: LLMProvider.GROK
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'GROK_API_KEY', 'https://api.x.ai/v1', config);
  }
}
