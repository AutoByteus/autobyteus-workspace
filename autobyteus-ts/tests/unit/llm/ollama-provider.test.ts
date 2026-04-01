import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOllamaList = vi.hoisted(() => vi.fn());
const MockOllama = vi.hoisted(
  () =>
    class {
      list = mockOllamaList;
    },
);

vi.mock('ollama', () => ({
  Ollama: MockOllama,
}));

import { OllamaModelProvider } from '../../../src/llm/ollama-provider.js';
import { LLMProvider } from '../../../src/llm/providers.js';

describe('OllamaModelProvider', () => {
  const originalHosts = process.env.OLLAMA_HOSTS;

  beforeEach(() => {
    process.env.OLLAMA_HOSTS = 'http://127.0.0.1:11434';
    mockOllamaList.mockReset();
  });

  afterEach(() => {
    if (originalHosts === undefined) {
      delete process.env.OLLAMA_HOSTS;
    } else {
      process.env.OLLAMA_HOSTS = originalHosts;
    }
  });

  it('keeps discovered Ollama models in the OLLAMA provider bucket', async () => {
    mockOllamaList.mockResolvedValue({
      models: [{ model: 'qwen3.5:35b-a3b-coding-nvfp4' }],
    });

    const models = await OllamaModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe(LLMProvider.OLLAMA);
    expect(models[0]?.modelIdentifier).toBe(
      'qwen3.5:35b-a3b-coding-nvfp4:ollama@127.0.0.1:11434',
    );
  });
});
