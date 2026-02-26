import { describe, it, expect } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

runIntegration('OpenAICompatibleLLM Integration', () => {
  it('initializes with environment API key', () => {
    const model = new LLMModel({
      name: 'gpt-5.2',
      value: 'gpt-5.2',
      canonicalName: 'gpt-5.2',
      provider: LLMProvider.OPENAI
    });
    const llm = new OpenAICompatibleLLM(model, 'OPENAI_API_KEY', 'https://api.openai.com/v1');
    expect(llm).toBeDefined();
  });
});
