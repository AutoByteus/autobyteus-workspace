import { OpenAIResponsesLLM } from './openai-responses-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';

export class OpenAILLM extends OpenAIResponsesLLM {
  constructor(
    model: LLMModel,
    llmConfig?: LLMConfig,
    apiKeyDefault?: string
  ) {
    const effectiveConfig = llmConfig ?? new LLMConfig();
    super(model, 'OPENAI_API_KEY', 'https://api.openai.com/v1', effectiveConfig, apiKeyDefault);
  }
}
