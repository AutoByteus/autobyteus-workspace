import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';

export class KimiLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'kimi-latest',
        value: 'kimi-latest',
        canonicalName: 'kimi-latest',
        provider: LLMProvider.KIMI
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'KIMI_API_KEY', 'https://api.moonshot.cn/v1', config);
  }
}
