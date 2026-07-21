import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import type { LLMConstructionContext } from '../llm-construction-context.js';

export class QwenLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, context: LLMConstructionContext) {
    super(model, 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', context);
  }
}
