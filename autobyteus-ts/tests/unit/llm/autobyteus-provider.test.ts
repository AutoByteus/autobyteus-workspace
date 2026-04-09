import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAvailableLlmModelsSync = vi.hoisted(() => vi.fn());
const mockClose = vi.hoisted(() => vi.fn());

vi.mock('../../../src/clients/autobyteus-client.js', () => ({
  AutobyteusClient: class {
    getAvailableLlmModelsSync = mockGetAvailableLlmModelsSync;
    close = mockClose;
  }
}));

import { AutobyteusModelProvider } from '../../../src/llm/autobyteus-provider.js';

describe('AutobyteusModelProvider', () => {
  const originalHosts = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;

  beforeEach(() => {
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = 'https://autobyteus.example';
    mockGetAvailableLlmModelsSync.mockReset();
    mockClose.mockReset();
  });

  afterEach(() => {
    if (originalHosts === undefined) {
      delete process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
    } else {
      process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = originalHosts;
    }
    vi.restoreAllMocks();
  });

  it('keeps unknown context metadata as null instead of defaulting to 8192', async () => {
    mockGetAvailableLlmModelsSync.mockResolvedValue({
      models: [
        {
          name: 'remote-model',
          value: 'remote-model',
          canonical_name: 'remote-model',
          provider: 'OPENAI',
          config: {
            pricing_config: {
              input_token_pricing: 0,
              output_token_pricing: 0,
            },
          },
        },
      ],
    });

    const models = await AutobyteusModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBeNull();
    expect(models[0]?.activeContextTokens).toBeNull();
  });

  it('prefers explicit server metadata when present', async () => {
    mockGetAvailableLlmModelsSync.mockResolvedValue({
      models: [
        {
          name: 'server-model',
          value: 'server-model',
          canonical_name: 'server-model',
          provider: 'OPENAI',
          max_context_tokens: 200000,
          active_context_tokens: 64000,
          max_input_tokens: 180000,
          max_output_tokens: 16000,
          config: {
            token_limit: 120000,
            pricing_config: {
              input_token_pricing: 0,
              output_token_pricing: 0,
            },
          },
        },
      ],
    });

    const models = await AutobyteusModelProvider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBe(200000);
    expect(models[0]?.activeContextTokens).toBe(64000);
    expect(models[0]?.maxInputTokens).toBe(180000);
    expect(models[0]?.maxOutputTokens).toBe(16000);
  });
});
