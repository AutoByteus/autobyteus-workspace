import { describe, expect, it, vi } from 'vitest';
import {
  normalizeOpenAICompatibleEndpointDiscoveredModels,
  openAICompatibleEndpointMetadataAliases,
  OpenAICompatibleEndpointDiscovery,
} from '../../../src/llm/openai-compatible-endpoint-discovery.js';

describe('OpenAI-compatible endpoint discovery normalization', () => {
  it('accepts only the fixed top-level numeric alias allowlist in documented order', () => {
    const [model] = normalizeOpenAICompatibleEndpointDiscoveredModels({
      data: [{
        id: 'model-a',
        context_window: '100',
        contextWindow: 200,
        context_window_tokens: 300,
        max_input_tokens: false,
        maxInputTokens: 400,
        max_output_tokens: 0,
        maxOutputTokens: 500,
        max_tokens: 900,
        limits: { context_window: 999_999 },
      }],
    });

    expect(model).toMatchObject({
      id: 'model-a',
      maxContextTokens: 200,
      maxInputTokens: 400,
      maxOutputTokens: 500,
    });
    expect(model).not.toHaveProperty('max_tokens');
  });

  it('merges duplicate rows by first valid advertised field while allowing independent fall-through', () => {
    const models = normalizeOpenAICompatibleEndpointDiscoveredModels([
      { id: 'model-a', context_window: 100, maxInputTokens: 'invalid' },
      { name: 'model-a', contextWindow: 200, maxInputTokens: 400, maxOutputTokens: 500 },
      { model: 'model-b', maxOutputTokens: 600 },
      'model-c',
    ]);

    expect(models).toEqual([
      { id: 'model-a', name: 'model-a', value: 'model-a', canonicalName: 'model-a', maxContextTokens: 100, maxInputTokens: 400, maxOutputTokens: 500 },
      { id: 'model-b', name: 'model-b', value: 'model-b', canonicalName: 'model-b', maxOutputTokens: 600 },
      { id: 'model-c', name: 'model-c', value: 'model-c', canonicalName: 'model-c' },
    ]);
  });

  it('accepts every documented alias and rejects invalid, nested, and unrelated values', () => {
    for (const [field, aliases] of Object.entries(openAICompatibleEndpointMetadataAliases)) {
      for (const alias of aliases) {
        const [model] = normalizeOpenAICompatibleEndpointDiscoveredModels({
          data: [{
            id: `${field}-${alias}`,
            [alias]: 1234,
            nested: { [alias]: 999999 },
            unrelated_limit: 888888,
          }],
        });

        expect(model?.[field as keyof typeof openAICompatibleEndpointMetadataAliases]).toBe(1234);
        expect(model).not.toHaveProperty('unrelated_limit');
      }
    }

    const [model] = normalizeOpenAICompatibleEndpointDiscoveredModels({
      data: [{
        id: 'invalid-values',
        context_window: '1234',
        contextWindow: false,
        context_window_tokens: Number.NaN,
        contextWindowTokens: Number.POSITIVE_INFINITY,
        max_context_tokens: 1.25,
        limits: { context_window: 999999 },
      }],
    });

    expect(model).toEqual({
      id: 'invalid-values',
      name: 'invalid-values',
      value: 'invalid-values',
      canonicalName: 'invalid-values',
    });
  });

  it('probes one synthetic models response without returning credentials or raw payload fields', async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://gateway.example.test/v1/models');
      expect(init.method).toBe('GET');
      expect(init.headers).toEqual({
        Authorization: 'Bearer synthetic-discovery-key',
        Accept: 'application/json',
      });
      return {
        ok: true,
        json: async () => ({
          data: [{
            id: 'live-model',
            contextWindowTokens: 654321,
            private_provider_payload: 'do-not-project',
          }],
        }),
      } as Response;
    });

    const models = await OpenAICompatibleEndpointDiscovery.probeEndpoint({
      baseUrl: 'https://gateway.example.test/v1',
      apiKey: 'synthetic-discovery-key',
      fetchImpl,
    });

    expect(models).toEqual([{
      id: 'live-model',
      name: 'live-model',
      value: 'live-model',
      canonicalName: 'live-model',
      maxContextTokens: 654321,
    }]);
    expect(JSON.stringify(models)).not.toContain('synthetic-discovery-key');
    expect(JSON.stringify(models)).not.toContain('do-not-project');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports only the HTTP status for a failed discovery response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }) as Response);

    await expect(OpenAICompatibleEndpointDiscovery.probeEndpoint({
      baseUrl: 'https://gateway.example.test/v1',
      apiKey: 'synthetic-discovery-key',
      fetchImpl,
    })).rejects.toThrow('Model discovery failed with status 503.');
  });

  it('aborts a slow discovery request at the configured timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
        await new Promise<void>((resolve) => {
          init.signal?.addEventListener('abort', () => resolve(), { once: true });
        });
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      });
      const pending = OpenAICompatibleEndpointDiscovery.probeEndpoint({
        baseUrl: 'https://gateway.example.test/v1',
        apiKey: 'synthetic-discovery-key',
        timeoutMs: 5,
        fetchImpl,
      });
      const rejection = expect(pending).rejects.toThrow('Model discovery timed out after 5ms.');

      await vi.advanceTimersByTimeAsync(6);
      await rejection;
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
