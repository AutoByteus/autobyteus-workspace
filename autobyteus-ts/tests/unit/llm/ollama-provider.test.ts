import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOllamaList = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
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
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalHosts === undefined) {
      delete process.env.OLLAMA_HOSTS;
    } else {
      process.env.OLLAMA_HOSTS = originalHosts;
    }
  });

  it('keeps discovered Ollama models in the OLLAMA provider bucket and captures context metadata', async () => {
    mockOllamaList.mockResolvedValue({
      models: [{ model: 'qwen3.5:35b-a3b-coding-nvfp4' }],
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              model: 'qwen3.5:35b-a3b-coding-nvfp4',
              context_length: 16384,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parameters: 'num_ctx 8192',
          model_info: {
            'qwen.context_length': 262144,
          },
        }),
      });

    const models = await OllamaModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe(LLMProvider.OLLAMA);
    expect(models[0]?.modelIdentifier).toBe(
      'qwen3.5:35b-a3b-coding-nvfp4:ollama@127.0.0.1:11434',
    );
    expect(models[0]?.maxContextTokens).toBe(262144);
    expect(models[0]?.activeContextTokens).toBe(16384);
  });

  it('falls back to configured num_ctx when the model is not currently running', async () => {
    mockOllamaList.mockResolvedValue({
      models: [{ model: 'gemma3:12b' }],
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parameters: 'num_ctx 4096',
          model_info: {
            'gemma.context_length': 131072,
          },
        }),
      });

    const models = await OllamaModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBe(131072);
    expect(models[0]?.activeContextTokens).toBe(4096);
  });

  it('keeps the listed model when detail enrichment fails and leaves metadata unknown', async () => {
    mockOllamaList.mockResolvedValue({
      models: [{ model: 'llama3.3:70b' }],
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              model: 'llama3.3:70b',
              context_length: 24576,
            },
          ],
        }),
      })
      .mockRejectedValueOnce(new Error('show failed'));

    const models = await OllamaModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.modelIdentifier).toBe('llama3.3:70b:ollama@127.0.0.1:11434');
    expect(models[0]?.maxContextTokens).toBeNull();
    expect(models[0]?.activeContextTokens).toBe(24576);
  });
});
