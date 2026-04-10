import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LMStudioModelProvider } from '../../../src/llm/lmstudio-provider.js';
import { LLMProvider } from '../../../src/llm/providers.js';

const mockFetch = vi.hoisted(() => vi.fn());

describe('LMStudioModelProvider', () => {
  const originalHosts = process.env.LMSTUDIO_HOSTS;

  beforeEach(() => {
    process.env.LMSTUDIO_HOSTS = 'http://127.0.0.1:1234';
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalHosts === undefined) {
      delete process.env.LMSTUDIO_HOSTS;
    } else {
      process.env.LMSTUDIO_HOSTS = originalHosts;
    }
  });

  it('uses the LM Studio native model list to capture supported and active context metadata', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            key: 'qwen/qwen3.5-35b-a3b',
            max_context_length: 262144,
            loaded_instances: [{ config: { context_length: 131072 } }],
          },
        ],
      }),
    });

    const models = await LMStudioModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe(LLMProvider.LMSTUDIO);
    expect(models[0]?.modelIdentifier).toBe('qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234');
    expect(models[0]?.maxContextTokens).toBe(262144);
    expect(models[0]?.activeContextTokens).toBe(131072);
  });

  it('returns null active context when loaded instances disagree on configured context length', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            key: 'mistralai/devstral-small-2-2512',
            max_context_length: 393216,
            loaded_instances: [
              { config: { context_length: 131072 } },
              { config: { context_length: 262144 } },
            ],
          },
        ],
      }),
    });

    const models = await LMStudioModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBe(393216);
    expect(models[0]?.activeContextTokens).toBeNull();
  });
});
