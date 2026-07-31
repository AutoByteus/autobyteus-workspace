import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ModelMetadataResolver,
  type PartialResolvedModelMetadata,
  type ProviderModelMetadataProvider,
} from '../../../../src/llm/metadata/model-metadata-resolver.js';
import type { StaticModelMetadata } from '../../../../src/llm/supported-model-definition.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const lookup = (provider: LLMProvider, modelId: string) => ({
  provider,
  name: modelId,
  value: modelId,
  canonicalName: modelId,
});

const staticMetadata: StaticModelMetadata = {
  maxContextTokens: 1_000_000,
  maxInputTokens: 900_000,
  maxOutputTokens: 128_000,
  multimodalCapabilities: {
    image: 'supported',
    audio: 'unsupported',
    video: 'unsupported',
  },
  provenance: {
    sourceUrl: 'https://example.test/model-catalog',
    verifiedAt: '2026-07-31',
  },
};

const unknownStaticMetadata: StaticModelMetadata = {
  ...staticMetadata,
  maxContextTokens: null,
  maxInputTokens: null,
  maxOutputTokens: null,
};

const resolverWith = (
  provider: LLMProvider,
  entries: Array<[string, PartialResolvedModelMetadata]>,
) => {
  const loadMetadata = vi.fn().mockResolvedValue(new Map(entries));
  return {
    resolver: new ModelMetadataResolver({
      [provider]: {
        kind: 'LIVE_WITH_STATIC_FALLBACK',
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
  it('returns static-definition values with per-field provenance when live metadata is unavailable', async () => {
    const metadata = await new ModelMetadataResolver().resolve(
      lookup(LLMProvider.OPENAI, 'gpt-5.5'),
      staticMetadata,
    );

    expect(metadata).toEqual({
      maxContextTokens: {
        value: 1_000_000,
        source: 'static_definition',
        staticProvenance: staticMetadata.provenance,
      },
      maxInputTokens: {
        value: 900_000,
        source: 'static_definition',
        staticProvenance: staticMetadata.provenance,
      },
      maxOutputTokens: {
        value: 128_000,
        source: 'static_definition',
        staticProvenance: staticMetadata.provenance,
      },
    });
  });

  it('merges matching live fields independently, falls back to static fields, and caches one provider load', async () => {
    const { resolver, loadMetadata } = resolverWith(LLMProvider.ANTHROPIC, [[
      'claude-sonnet-4-6',
      { maxContextTokens: 1_200_000, maxInputTokens: null, maxOutputTokens: 64_000 },
    ]]);

    const liveMetadata = await resolver.resolve(
      lookup(LLMProvider.ANTHROPIC, 'claude-sonnet-4-6'),
      staticMetadata,
    );
    const staticFallback = await resolver.resolve(
      lookup(LLMProvider.ANTHROPIC, 'claude-opus-4-7'),
      staticMetadata,
    );

    expect(liveMetadata).toEqual({
      maxContextTokens: { value: 1_200_000, source: 'live' },
      maxInputTokens: {
        value: 900_000,
        source: 'static_definition',
        staticProvenance: staticMetadata.provenance,
      },
      maxOutputTokens: { value: 64_000, source: 'live' },
    });
    expect(staticFallback.maxContextTokens).toMatchObject({
      value: 1_000_000,
      source: 'static_definition',
    });
    expect(staticFallback.maxOutputTokens).toMatchObject({
      value: 128_000,
      source: 'static_definition',
    });
    expect(loadMetadata).toHaveBeenCalledTimes(1);
  });

  it('uses static definitions when a live strategy has no configured provider or no matching record', async () => {
    const resolver = new ModelMetadataResolver({
      [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_STATIC_FALLBACK', provider: null },
    });

    await expect(resolver.resolve(
      lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview'),
      staticMetadata,
    )).resolves.toMatchObject({
      maxContextTokens: { value: 1_000_000, source: 'static_definition' },
    });

    const { resolver: unmatchedResolver } = resolverWith(LLMProvider.GEMINI, [[
      'gemini-unrelated-model',
      { maxContextTokens: 2_000_000 },
    ]]);
    await expect(unmatchedResolver.resolve(
      lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview'),
      staticMetadata,
    )).resolves.toMatchObject({
      maxContextTokens: { value: 1_000_000, source: 'static_definition' },
    });
  });

  it('contains a failed live provider and returns static-definition fields', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provider: ProviderModelMetadataProvider = {
      loadMetadata: vi.fn().mockRejectedValue(new Error('synthetic metadata failure')),
    };
    const resolver = new ModelMetadataResolver({
      [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_STATIC_FALLBACK', provider },
    });

    await expect(resolver.resolve(
      lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview'),
      staticMetadata,
    )).resolves.toMatchObject({
      maxContextTokens: { value: 1_000_000, source: 'static_definition' },
      maxOutputTokens: { value: 128_000, source: 'static_definition' },
    });
  });

  it('contains a timed-out live provider and returns static-definition fields', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provider: ProviderModelMetadataProvider = {
      loadMetadata: vi.fn<ProviderModelMetadataProvider['loadMetadata']>(
        () => new Promise<Map<string, PartialResolvedModelMetadata>>(() => undefined)
      ),
    };
    const resolver = new ModelMetadataResolver(
      { [LLMProvider.GEMINI]: { kind: 'LIVE_WITH_STATIC_FALLBACK', provider } },
      { providerLoadTimeoutMs: 10 },
    );

    const pending = resolver.resolve(
      lookup(LLMProvider.GEMINI, 'gemini-3-flash-preview'),
      staticMetadata,
    );
    await vi.advanceTimersByTimeAsync(11);

    await expect(pending).resolves.toMatchObject({
      maxContextTokens: { value: 1_000_000, source: 'static_definition' },
    });
  });

  it('rejects invalid live numeric values in favor of static values and reports unknown when both are absent', async () => {
    const { resolver } = resolverWith(LLMProvider.KIMI, [[
      'kimi-k2.6',
      {
        maxContextTokens: 0,
        maxInputTokens: -1,
        maxOutputTokens: Number.NaN,
      },
    ]]);

    await expect(resolver.resolve(lookup(LLMProvider.KIMI, 'kimi-k2.6'), staticMetadata))
      .resolves.toMatchObject({
        maxContextTokens: { value: 1_000_000, source: 'static_definition' },
        maxInputTokens: { value: 900_000, source: 'static_definition' },
        maxOutputTokens: { value: 128_000, source: 'static_definition' },
      });

    const { resolver: unknownResolver } = resolverWith(LLMProvider.MISTRAL, [[
      'mistral-unknown',
      { maxContextTokens: null, maxInputTokens: null, maxOutputTokens: null },
    ]]);
    await expect(unknownResolver.resolve(
      lookup(LLMProvider.MISTRAL, 'mistral-unknown'),
      unknownStaticMetadata,
    )).resolves.toEqual({
      maxContextTokens: { value: null, source: 'unknown' },
      maxInputTokens: { value: null, source: 'unknown' },
      maxOutputTokens: { value: null, source: 'unknown' },
    });
  });

  it('matches provider metadata through models/ and canonical lookup keys', async () => {
    const { resolver } = resolverWith(LLMProvider.GEMINI, [[
      'gemini-3-flash-preview',
      { maxContextTokens: 2_000_000 },
    ]]);

    await expect(resolver.resolve({
      ...lookup(LLMProvider.GEMINI, 'models/gemini-3-flash-preview'),
      value: 'unmatched-value',
      canonicalName: 'gemini-canonical',
    }, staticMetadata)).resolves.toMatchObject({
      maxContextTokens: { value: 2_000_000, source: 'live' },
    });
  });
});
