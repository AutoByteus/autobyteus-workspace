import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';

export class QwenLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'qwen3-max-preview',
        value: 'qwen3-max-preview',
        canonicalName: 'qwen3-max-preview',
        provider: LLMProvider.QWEN
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'DASHSCOPE_API_KEY', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', config);
  }
}
