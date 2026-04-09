import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelMetadataResolver } from '../../../../src/llm/metadata/model-metadata-resolver.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const mockFetch = vi.hoisted(() => vi.fn());

const ENV_KEYS = ['ANTHROPIC_API_KEY', 'KIMI_API_KEY', 'MISTRAL_API_KEY', 'GEMINI_API_KEY', 'VERTEX_AI_API_KEY'] as const;

describe('ModelMetadataResolver', () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('returns curated metadata for docs-only providers without performing live requests', async () => {
    const resolver = new ModelMetadataResolver();

    const metadata = await resolver.resolve({
      provider: LLMProvider.OPENAI,
      name: 'gpt-5.4',
      value: 'gpt-5.4',
      canonicalName: 'gpt-5.4'
    });

    expect(metadata.maxContextTokens).toBe(1000000);
    expect(metadata.maxOutputTokens).toBe(128000);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('prefers live Anthropic metadata when available and falls back to curated values for missing models', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'claude-sonnet-4-6', max_input_tokens: 1200000, max_tokens: 64000 }]
      })
    });

    const resolver = new ModelMetadataResolver();

    const liveMetadata = await resolver.resolve({
      provider: LLMProvider.ANTHROPIC,
      name: 'claude-sonnet-4.6',
      value: 'claude-sonnet-4-6',
      canonicalName: 'claude-sonnet-4.6'
    });
    const curatedFallback = await resolver.resolve({
      provider: LLMProvider.ANTHROPIC,
      name: 'claude-opus-4.6',
      value: 'claude-opus-4-6',
      canonicalName: 'claude-opus-4.6'
    });

    expect(liveMetadata.maxContextTokens).toBe(1200000);
    expect(liveMetadata.maxInputTokens).toBe(1200000);
    expect(liveMetadata.maxOutputTokens).toBe(64000);
    expect(curatedFallback.maxContextTokens).toBe(1000000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('prefers live Kimi metadata when available and falls back to curated values for missing models', async () => {
    process.env.KIMI_API_KEY = 'test-kimi-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'kimi-k2.5', context_length: 262144 }]
      })
    });

    const resolver = new ModelMetadataResolver();

    const liveMetadata = await resolver.resolve({
      provider: LLMProvider.KIMI,
      name: 'kimi-k2.5',
      value: 'kimi-k2.5',
      canonicalName: 'kimi-k2.5'
    });
    const curatedFallback = await resolver.resolve({
      provider: LLMProvider.KIMI,
      name: 'kimi-k2-thinking',
      value: 'kimi-k2-thinking',
      canonicalName: 'kimi-k2-thinking'
    });

    expect(liveMetadata.maxContextTokens).toBe(262144);
    expect(curatedFallback.maxContextTokens).toBe(256000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('parses Mistral model-list metadata from the official models endpoint', async () => {
    process.env.MISTRAL_API_KEY = 'test-mistral-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 'mistral-large-2512',
          max_context_length: 320000
        }
      ])
    });

    const resolver = new ModelMetadataResolver();

    const metadata = await resolver.resolve({
      provider: LLMProvider.MISTRAL,
      name: 'mistral-large-3',
      value: 'mistral-large-2512',
      canonicalName: 'mistral-large-3'
    });

    expect(metadata.maxContextTokens).toBe(320000);
    expect(metadata.maxOutputTokens).toBeNull();
  });

  it('parses Gemini model limits from the official model list endpoint', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-3-flash-preview',
            baseModelId: 'gemini-3-flash-preview',
            inputTokenLimit: 1048576,
            outputTokenLimit: 65536
          }
        ]
      })
    });

    const resolver = new ModelMetadataResolver();

    const metadata = await resolver.resolve({
      provider: LLMProvider.GEMINI,
      name: 'gemini-3-flash-preview',
      value: 'gemini-3-flash-preview',
      canonicalName: 'gemini-3-flash-preview'
    });

    expect(metadata.maxContextTokens).toBe(1048576);
    expect(metadata.maxInputTokens).toBe(1048576);
    expect(metadata.maxOutputTokens).toBe(65536);
  });
});
