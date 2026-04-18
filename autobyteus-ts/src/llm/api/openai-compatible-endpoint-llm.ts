import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import type { LLMConfig } from '../utils/llm-config.js';
import { LLMModel } from '../models.js';
import { OpenAICompatibleEndpointModel } from '../openai-compatible-endpoint-model.js';

export class OpenAICompatibleEndpointLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, llmConfig?: LLMConfig) {
    if (!(model instanceof OpenAICompatibleEndpointModel)) {
      throw new Error('OpenAICompatibleEndpointLLM requires an OpenAICompatibleEndpointModel.');
    }

    super(
      model,
      'OPENAI_COMPATIBLE_ENDPOINT_API_KEY',
      model.endpointBaseUrl,
      llmConfig,
      model.endpointApiKey,
    );
  }
}
