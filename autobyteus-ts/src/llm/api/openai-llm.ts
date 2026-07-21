import { OpenAIResponsesLLM } from './openai-responses-llm.js';
import { LLMModel } from '../models.js';
import type { LLMConstructionContext } from '../llm-construction-context.js';

export class OpenAILLM extends OpenAIResponsesLLM {
  constructor(model: LLMModel, context: LLMConstructionContext) {
    super(model, 'https://api.openai.com/v1', context);
  }
}
