import { describe, expect, it } from 'vitest';
import {
  buildBuiltInFallbackIndex,
  canonicalizeOpenAICompatibleEndpointIdentity,
  OpenAICompatibleEndpointModelMetadataResolver,
  OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES,
} from '../../../../src/llm/metadata/openai-compatible-endpoint-model-metadata.js';
import type { EndpointModelProfile } from '../../../../src/llm/metadata/openai-compatible-endpoint-model-metadata.js';
import type { SupportedModelDefinition } from '../../../../src/llm/supported-model-definition.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const staticMetadata = (context: number | null, input: number | null, output: number | null, sourceUrl: string) => ({
  maxContextTokens: context,
  maxInputTokens: input,
  maxOutputTokens: output,
  multimodalCapabilities: { image: 'unsupported', audio: 'unsupported', video: 'unsupported' } as const,
  provenance: { sourceUrl, verifiedAt: '2026-08-03' },
});

const definition = (
  provider: LLMProvider,
  value: string,
  metadata: ReturnType<typeof staticMetadata>,
) => ({ provider, value, name: value, canonicalName: value, staticMetadata: metadata } as SupportedModelDefinition);

const discovered = (value: string, metadata: Record<string, unknown> = {}) => ({
  id: value,
  name: value,
  value,
  canonicalName: value,
  ...metadata,
});

describe('OpenAI-compatible endpoint metadata resolver', () => {
  it('matches the exact Alibaba Token Plan profile and leaves undocumented fields unknown', () => {
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver();
    const metadata = resolver.resolve({
      endpointBaseUrl: 'HTTPS://TOKEN-PLAN.AP-SOUTHEAST-1.MAAS.ALIYUNCS.COM/compatible-mode/./v1/?ignored=true#fragment',
      discoveredModel: discovered('qwen3.8-max-preview'),
    });

    expect(metadata.maxContextTokens).toEqual({
      value: 1_000_000,
      source: expect.objectContaining({
        kind: 'endpoint_profile',
        profileId: OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES[0]?.profileId,
      }),
    });
    expect(metadata.maxInputTokens.source).toEqual({ kind: 'unknown' });
    expect(metadata.maxOutputTokens.source).toEqual({ kind: 'unknown' });
  });

  it('uses advertised values first, then rejects endpoint near-matches before exact-value fallback', () => {
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver();
    const advertised = resolver.resolve({
      endpointBaseUrl: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      discoveredModel: discovered('qwen3.8-max-preview', { maxContextTokens: 2_000_000 }),
    });
    expect(advertised.maxContextTokens).toMatchObject({ value: 2_000_000, source: { kind: 'live' } });

    const nearMatch = resolver.resolve({
      endpointBaseUrl: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v2',
      discoveredModel: discovered('qwen3.7-max'),
    });
    expect(nearMatch.maxContextTokens).toMatchObject({ value: 262_144, source: { kind: 'inferred_builtin', provider: LLMProvider.QWEN, value: 'qwen3.7-max' } });

    const exactPlan = resolver.resolve({
      endpointBaseUrl: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      discoveredModel: discovered('qwen3.7-max'),
    });
    expect(exactPlan.maxContextTokens).toMatchObject({ value: 1_000_000, source: { kind: 'endpoint_profile' } });
  });

  it('selects the lowest valid duplicate built-in field and carries the selected provenance', () => {
    const definitions = [
      definition(LLMProvider.OPENAI, 'duplicate-model', staticMetadata(900, 800, null, 'https://z.example')),
      definition(LLMProvider.ANTHROPIC, 'duplicate-model', staticMetadata(700, 800, 500, 'https://a.example')),
      definition(LLMProvider.GEMINI, 'duplicate-model', staticMetadata(700, null, 400, 'https://b.example')),
    ];
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver(
      [],
      definitions,
      buildBuiltInFallbackIndex(definitions),
    );
    const metadata = resolver.resolve({
      endpointBaseUrl: 'https://unrecognized.example/v1',
      discoveredModel: discovered('duplicate-model'),
    });

    expect(metadata.maxContextTokens).toMatchObject({
      value: 700,
      source: { kind: 'inferred_builtin', provider: LLMProvider.ANTHROPIC, value: 'duplicate-model', provenance: { sourceUrl: 'https://a.example' } },
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

  it('canonicalizes default ports, one host dot, dot segments, and trailing path slashes', () => {
    expect(canonicalizeOpenAICompatibleEndpointIdentity(
      'HTTPS://Example.TEST.:443/a/../v1///?plan=token#ignored',
    )).toEqual({ protocol: 'https', hostname: 'example.test', port: null, basePath: '/v1' });
    expect(canonicalizeOpenAICompatibleEndpointIdentity('http://example.test:8080')).toEqual({
      protocol: 'http', hostname: 'example.test', port: 8080, basePath: '',
    });
  });

  it('resolves exact built-in profile references as endpoint-profile provenance', () => {
    const definitions = [
      definition(LLMProvider.OPENAI, 'referenced-model', staticMetadata(1234, 1200, 256, 'https://builtin.example')),
    ];
    const profiles: readonly EndpointModelProfile[] = [{
      protocol: 'https',
      hostname: 'profile.example',
      port: null,
      basePath: '/v1',
      profileId: 'profile-reference',
      modelValue: 'custom-model',
      provenance: { sourceUrl: 'https://profile.example/source', verifiedAt: '2026-08-03' },
      reference: { provider: LLMProvider.OPENAI, value: 'referenced-model' },
    }];
    const resolver = new OpenAICompatibleEndpointModelMetadataResolver(
      profiles,
      definitions,
      buildBuiltInFallbackIndex(definitions),
    );

    expect(resolver.resolve({
      endpointBaseUrl: 'https://profile.example/v1',
      discoveredModel: discovered('custom-model'),
    }).maxContextTokens).toEqual({
      value: 1234,
      source: {
        kind: 'endpoint_profile',
        profileId: 'profile-reference',
        provenance: { sourceUrl: 'https://profile.example/source', verifiedAt: '2026-08-03' },
        reference: { provider: LLMProvider.OPENAI, value: 'referenced-model' },
      },
    });
  });
});
