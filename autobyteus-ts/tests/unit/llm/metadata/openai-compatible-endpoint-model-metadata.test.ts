import { describe, expect, it } from 'vitest';
import {
  buildBuiltInFallbackIndex,
  OpenAICompatibleEndpointModelMetadataResolver,
} from '../../../../src/llm/metadata/openai-compatible-endpoint-model-metadata.js';
import type { SupportedModelDefinition } from '../../../../src/llm/supported-model-definition.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const staticMetadata = (
  context: number | null,
  input: number | null,
  output: number | null,
  sourceUrl: string,
) => ({
  maxContextTokens: context,
  maxInputTokens: input,
  maxOutputTokens: output,
  multimodalCapabilities: {
    image: 'unsupported', audio: 'unsupported', video: 'unsupported',
  } as const,
  provenance: { sourceUrl, verifiedAt: '2026-08-06' },
});

const definition = (
  provider: LLMProvider,
  value: string,
  metadata: ReturnType<typeof staticMetadata>,
) => ({
  provider,
  value,
  name: value,
  canonicalName: value,
  staticMetadata: metadata,
} as SupportedModelDefinition);

const discovered = (value: string, metadata: Record<string, unknown> = {}) => ({
  id: value,
  name: value,
  value,
  canonicalName: value,
  ...metadata,
});

describe('OpenAI-compatible endpoint metadata resolver', () => {
  it('uses advertised values before exact built-in metadata independently per field', () => {
    const definitions = [
      definition(
        LLMProvider.QWEN,
        'exact-model',
        staticMetadata(1_000_000, 900_000, 128_000, 'https://catalog.example/exact'),
      ),
    ];
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver(
      buildBuiltInFallbackIndex(definitions),
    );

    const metadata = resolver.resolve({
      discoveredModel: discovered('exact-model', { maxContextTokens: 2_000_000 }),
    });

    expect(metadata.maxContextTokens).toEqual({
      value: 2_000_000,
      source: { kind: 'live' },
    });
    expect(metadata.maxInputTokens).toMatchObject({
      value: 900_000,
      source: {
        kind: 'inferred_builtin', provider: LLMProvider.QWEN, value: 'exact-model',
      },
    });
    expect(metadata.maxOutputTokens).toMatchObject({
      value: 128_000,
      source: { kind: 'inferred_builtin', provider: LLMProvider.QWEN },
    });
  });

  it('selects the lowest valid duplicate built-in field and selected provenance deterministically', () => {
    const definitions = [
      definition(LLMProvider.OPENAI, 'duplicate-model', staticMetadata(900, 800, null, 'https://z.example')),
      definition(LLMProvider.ANTHROPIC, 'duplicate-model', staticMetadata(700, 800, 500, 'https://a.example')),
      definition(LLMProvider.GEMINI, 'duplicate-model', staticMetadata(700, null, 400, 'https://b.example')),
    ];
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver(
      buildBuiltInFallbackIndex(definitions),
    );
    const metadata = resolver.resolve({
      discoveredModel: discovered('duplicate-model'),
    });

    expect(metadata.maxContextTokens).toMatchObject({
      value: 700,
      source: {
        kind: 'inferred_builtin',
        provider: LLMProvider.ANTHROPIC,
        value: 'duplicate-model',
        provenance: { sourceUrl: 'https://a.example' },
      },
    });
    expect(metadata.maxInputTokens).toMatchObject({
      value: 800,
      source: { kind: 'inferred_builtin', provider: LLMProvider.ANTHROPIC },
    });
    expect(metadata.maxOutputTokens).toMatchObject({
      value: 400,
      source: { kind: 'inferred_builtin', provider: LLMProvider.GEMINI },
    });
  });

  it('uses exact values only and leaves unknown or suffixed near-matches unknown', () => {
    const definitions = [
      definition(LLMProvider.QWEN, 'deepseek-v4-pro', staticMetadata(1_000_000, null, null, 'https://catalog.example/deepseek')),
    ];
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver(
      buildBuiltInFallbackIndex(definitions),
    );

    expect(resolver.resolve({
      discoveredModel: discovered('deepseek-v4-pro'),
    }).maxContextTokens).toMatchObject({
      value: 1_000_000,
      source: { kind: 'inferred_builtin', value: 'deepseek-v4-pro' },
    });
    expect(resolver.resolve({
      discoveredModel: discovered('deepseek-v4-pro-0713'),
    }).maxContextTokens).toEqual({ value: null, source: { kind: 'unknown' } });
    expect(resolver.resolve({
      discoveredModel: discovered('DeepSeek-V4-Pro'),
    }).maxContextTokens).toEqual({ value: null, source: { kind: 'unknown' } });
  });

  it('indexes non-empty definition values without transforming whitespace, case, or prefixes', () => {
    const definitions = [
      definition(LLMProvider.QWEN, '  glm-5.2  ', staticMetadata(198_000, null, null, 'https://catalog.example/glm')),
      definition(LLMProvider.QWEN, '   ', staticMetadata(123, null, null, 'https://catalog.example/blank')),
    ];
    const index = buildBuiltInFallbackIndex(definitions);

    expect(index.has('glm-5.2')).toBe(false);
    expect(index.has('  glm-5.2  ')).toBe(true);
    expect(index.has('')).toBe(false);
  });
});
