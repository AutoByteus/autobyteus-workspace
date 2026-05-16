import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { DeepSeekChatRenderer } from '../prompt-renderers/deepseek-chat-renderer.js';

export class DeepSeekLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'deepseek-v4-flash',
        value: 'deepseek-v4-flash',
        canonicalName: 'deepseek-v4-flash',
        provider: LLMProvider.DEEPSEEK
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'DEEPSEEK_API_KEY', 'https://api.deepseek.com', config);
    this._renderer = new DeepSeekChatRenderer();
  }
}
