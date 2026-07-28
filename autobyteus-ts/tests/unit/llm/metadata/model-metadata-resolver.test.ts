import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ModelMetadataProvenance,
  ModelMetadataResolver,
  type PartialResolvedModelMetadata,
  type ProviderModelMetadataProvider,
} from '../../../../src/llm/metadata/model-metadata-resolver.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const lookup = (provider: LLMProvider, modelId: string) => ({
  provider,
  name: modelId,
  value: modelId,
  canonicalName: modelId,
});

const resolverWith = (
  provider: LLMProvider,
  entries: Array<[string, PartialResolvedModelMetadata]>,
) => {
  const loadMetadata = vi.fn().mockResolvedValue(new Map(entries));
  return {
    resolver: new ModelMetadataResolver({
      [provider]: {
        kind: 'LIVE_WITH_CURATED_FALLBACK',
        provider: { loadMetadata },
      },
    }),
    loadMetadata,
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ModelMetadataResolver', () => {
  it('returns curated-only provenance for providers without a live strategy', async () => {
    const metadata = await new ModelMetadataResolver().resolve(lookup(LLMProvider.OPENAI, 'gpt-5.5'));

    expect(metadata).toMatchObject({
      maxContextTokens: 1_050_000,
      maxOutputTokens: 128_000,
      provenance: ModelMetadataProvenance.CURATED_ONLY,
    });
  });

  it('returns the official GPT-5.6 limits with curated-only provenance', async () => {
    const resolver = new ModelMetadataResolver();
    for (const modelId of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      await expect(resolver.resolve(lookup(LLMProvider.OPENAI, modelId))).resolves.toMatchObject({
        maxContextTokens: 1_050_000,
        maxOutputTokens: 128_000,
        provenance: ModelMetadataProvenance.CURATED_ONLY,
      });
    }
  });

  it('marks a matching live record LIVE, falls back per model, and caches one provider load', async () => {
    const { resolver, loadMetadata } = resolverWith(LLMProvider.ANTHROPIC, [[
      'claude-sonnet-4-6',
      { maxContextTokens: 1_200_000, maxInputTokens: 1_200_000, maxOutputTokens: 64_000 },
    ]]);

    const liveMetadata = await resolver.resolve(lookup(LLMProvider.ANTHROPIC, 'claude-sonnet-4-6'));
    const curatedFallback = await resolver.resolve(lookup(LLMProvider.ANTHROPIC, 'claude-opus-4-7'));

    expect(liveMetadata).toMatchObject({
      maxContextTokens: 1_200_000,
      maxInputTokens: 1_200_000,
      maxOutputTokens: 64_000,
      provenance: ModelMetadataProvenance.LIVE,
    });
    expect(curatedFallback).toMatchObject({
      maxContextTokens: 1_000_000,
      maxOutputTokens: 128_000,
      provenance: ModelMetadataProvenance.CURATED_FALLBACK,
    });
    expect(loadMetadata).toHaveBeenCalledTimes(1);
  });

  it('returns CURATED_FALLBACK when a live-capable strategy has no configured provider', async () => {
    const resolver = new ModelMetadataResolver({
      [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_CURATED_FALLBACK', provider: null },
    });

    await expect(resolver.resolve(lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview')))
      .resolves.toMatchObject({
        maxContextTokens: 1_048_576,
        provenance: ModelMetadataProvenance.CURATED_FALLBACK,
      });
  });

  it('contains a failed live provider and returns CURATED_FALLBACK', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provider: ProviderModelMetadataProvider = {
      loadMetadata: vi.fn().mockRejectedValue(new Error('synthetic metadata failure')),
    };
    const resolver = new ModelMetadataResolver({
      [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_CURATED_FALLBACK', provider },
    });

    await expect(resolver.resolve(lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview')))
      .resolves.toMatchObject({
        maxContextTokens: 1_048_576,
        provenance: ModelMetadataProvenance.CURATED_FALLBACK,
      });
  });

  it('contains a timed-out live provider and returns CURATED_FALLBACK', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provider: ProviderModelMetadataProvider = {
      loadMetadata: vi.fn(() => new Promise(() => undefined)),
    };
    const resolver = new ModelMetadataResolver(
      { [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_CURATED_FALLBACK', provider } },
      { providerLoadTimeoutMs: 10 },
    );

    const pending = resolver.resolve(lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview'));
    await vi.advanceTimersByTimeAsync(11);

    await expect(pending).resolves.toMatchObject({
      maxContextTokens: 1_048_576,
      provenance: ModelMetadataProvenance.CURATED_FALLBACK,
    });
  });

  it('returns CURATED_FALLBACK when live metadata has no matching record', async () => {
    const { resolver } = resolverWith(LLMProvider.GEMINI, [[
      'gemini-unrelated-model',
      { maxContextTokens: 2_000_000 },
    ]]);

    await expect(resolver.resolve(lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview')))
      .resolves.toMatchObject({
        maxContextTokens: 1_048_576,
        provenance: ModelMetadataProvenance.CURATED_FALLBACK,
      });
  });

  it('preserves live-over-curated merging for Kimi and Mistral', async () => {
    const kimi = resolverWith(LLMProvider.KIMI, [[
      'kimi-k2.6',
      { maxContextTokens: 262_144 },
    ]]).resolver;
    const mistral = resolverWith(LLMProvider.MISTRAL, [[
      'mistral-large-2512',
      { maxContextTokens: 320_000 },
    ]]).resolver;

    await expect(kimi.resolve(lookup(LLMProvider.KIMI, 'kimi-k2.6'))).resolves.toMatchObject({
      maxContextTokens: 262_144,
      provenance: ModelMetadataProvenance.LIVE,
    });
    await expect(mistral.resolve(lookup(LLMProvider.MISTRAL, 'mistral-large-2512')))
      .resolves.toMatchObject({
        maxContextTokens: 320_000,
        provenance: ModelMetadataProvenance.LIVE,
      });
  });

  it('returns curated-only metadata for DeepSeek models without any provider load', async () => {
    const resolver = new ModelMetadataResolver();
    for (const modelId of ['deepseek-v4-flash', 'deepseek-v4-pro']) {
      await expect(resolver.resolve(lookup(LLMProvider.DEEPSEEK, modelId))).resolves.toMatchObject({
        maxContextTokens: 1_000_000,
        maxOutputTokens: 384_000,
        provenance: ModelMetadataProvenance.CURATED_ONLY,
      });
    }
  });
});
