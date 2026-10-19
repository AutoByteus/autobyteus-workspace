import { expect } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { liveProviderTest } from '../../../../../test-support/test-vault/test-vault.js';

const live = liveProviderTest('OpenAI');

live.describe('OpenAICompatibleLLM Integration', () => {
  live.it('resolves its API key from the default key source (the test vault)', async () => {
    const model = new LLMModel({
      name: 'gpt-5.4',
      value: 'gpt-5.4',
      canonicalName: 'gpt-5.4',
      provider: LLMProvider.OPENAI
    });
    const llm = new OpenAICompatibleLLM(
      model,
      'https://api.openai.com/v1',
      new LLMConfig(),
      undefined,
      LLMProvider.OPENAI,
    );
    try {
      await expect((llm as any).getClient()).resolves.toBeDefined();
    } finally {
      await llm.cleanup();
    }
  });
});
