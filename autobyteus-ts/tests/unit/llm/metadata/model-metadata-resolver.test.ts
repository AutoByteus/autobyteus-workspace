import { describe, expect, it, vi } from 'vitest';
import {
  ModelMetadataResolver,
  type PartialResolvedModelMetadata,
} from '../../../../src/llm/metadata/model-metadata-resolver.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const resolverWith = (
  provider: LLMProvider,
  entries: Array<[string, PartialResolvedModelMetadata]>,
) => {
  const loadMetadata = vi.fn().mockResolvedValue(new Map(entries));
  return {
    resolver: new ModelMetadataResolver({ [provider]: { loadMetadata } }),
    loadMetadata,
  };
};

describe('ModelMetadataResolver', () => {
  it('returns curated metadata for docs-only providers without a live resolver', async () => {
    const metadata = await new ModelMetadataResolver().resolve({
      provider: LLMProvider.OPENAI,
      name: 'gpt-5.5',
      value: 'gpt-5.5',
      canonicalName: 'gpt-5.5',
    });
    expect(metadata.maxContextTokens).toBe(1050000);
    expect(metadata.maxOutputTokens).toBe(128000);
  });

  it('returns the official GPT-5.6 limits for every canonical model', async () => {
    const resolver = new ModelMetadataResolver();
    for (const modelId of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      await expect(resolver.resolve({
        provider: LLMProvider.OPENAI,
        name: modelId,
        value: modelId,
        canonicalName: modelId,
      })).resolves.toMatchObject({ maxContextTokens: 1050000, maxOutputTokens: 128000 });
    }
  });

  it('prefers injected Anthropic metadata and falls back to curated values for missing models', async () => {
    const { resolver, loadMetadata } = resolverWith(LLMProvider.ANTHROPIC, [[
      'claude-sonnet-4-6',
      { maxContextTokens: 1200000, maxInputTokens: 1200000, maxOutputTokens: 64000 },
    ]]);
    const liveMetadata = await resolver.resolve({
      provider: LLMProvider.ANTHROPIC,
      name: 'claude-sonnet-4.6',
      value: 'claude-sonnet-4-6',
      canonicalName: 'claude-sonnet-4.6',
    });
    const curatedFallback = await resolver.resolve({
      provider: LLMProvider.ANTHROPIC,
      name: 'claude-opus-4.7',
      value: 'claude-opus-4-7',
      canonicalName: 'claude-opus-4.7',
    });
    expect(liveMetadata).toMatchObject({
      maxContextTokens: 1200000,
      maxInputTokens: 1200000,
      maxOutputTokens: 64000,
    });
    expect(curatedFallback).toMatchObject({ maxContextTokens: 1000000, maxOutputTokens: 128000 });
    expect(loadMetadata).toHaveBeenCalledTimes(1);
  });

  it('prefers injected Kimi metadata and retains curated fallback', async () => {
    const { resolver, loadMetadata } = resolverWith(LLMProvider.KIMI, [[
      'kimi-k2.6',
      { maxContextTokens: 262144 },
    ]]);
    const liveMetadata = await resolver.resolve({
      provider: LLMProvider.KIMI,
      name: 'kimi-k2.6',
      value: 'kimi-k2.6',
      canonicalName: 'kimi-k2.6',
    });
    const curatedFallback = await resolver.resolve({
      provider: LLMProvider.KIMI,
      name: 'kimi-k2.7-code',
      value: 'kimi-k2.7-code',
      canonicalName: 'kimi-k2.7-code',
    });
    expect(liveMetadata.maxContextTokens).toBe(262144);
    expect(curatedFallback.maxContextTokens).toBe(256000);
    expect(loadMetadata).toHaveBeenCalledTimes(1);
  });

  it('returns curated metadata for DeepSeek V4 models without a live resolver', async () => {
    const resolver = new ModelMetadataResolver();
    for (const modelId of ['deepseek-v4-flash', 'deepseek-v4-pro']) {
      await expect(resolver.resolve({
        provider: LLMProvider.DEEPSEEK,
        name: modelId,
        value: modelId,
        canonicalName: modelId,
      })).resolves.toMatchObject({ maxContextTokens: 1000000, maxOutputTokens: 384000 });
    }
  });

  it('uses injected Mistral metadata from the server-owned enrichment boundary', async () => {
    const { resolver } = resolverWith(LLMProvider.MISTRAL, [[
      'mistral-large-2512',
      { maxContextTokens: 320000 },
    ]]);
    const metadata = await resolver.resolve({
      provider: LLMProvider.MISTRAL,
      name: 'mistral-large-3',
      value: 'mistral-large-2512',
      canonicalName: 'mistral-large-3',
    });
    expect(metadata.maxContextTokens).toBe(320000);
    expect(metadata.maxOutputTokens).toBeNull();
  });

  it('uses injected Gemini metadata from the server-owned enrichment boundary', async () => {
    const { resolver } = resolverWith(LLMProvider.GEMINI, [[
      'gemini-3-flash-preview',
      { maxContextTokens: 1048576, maxInputTokens: 1048576, maxOutputTokens: 65536 },
    ]]);
    const metadata = await resolver.resolve({
      provider: LLMProvider.GEMINI,
      name: 'gemini-3-flash-preview',
      value: 'gemini-3-flash-preview',
      canonicalName: 'gemini-3-flash-preview',
    });
    expect(metadata).toMatchObject({
      maxContextTokens: 1048576,
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
    });
  });
});
