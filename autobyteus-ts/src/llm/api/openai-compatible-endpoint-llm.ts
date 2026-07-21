import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import type { LLMConstructionContext } from '../llm-construction-context.js';
import { LLMModel } from '../models.js';
import { OpenAICompatibleEndpointModel } from '../openai-compatible-endpoint-model.js';

export class OpenAICompatibleEndpointLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, context: LLMConstructionContext) {
    if (!(model instanceof OpenAICompatibleEndpointModel)) {
      throw new Error('OpenAICompatibleEndpointLLM requires an OpenAICompatibleEndpointModel.');
    }

    super(
      model,
      model.endpointBaseUrl,
      context,
    );
  }
}
