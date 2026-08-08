import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { ModelMetadataProvenance } from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { ResolvedModelMetadata } from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';

const geminiHarness = vi.hoisted(() => ({
  selection: { kind: 'unconfigured' } as
    | { kind: 'unconfigured' }
    | { kind: 'aiStudio' }
    | { kind: 'vertexExpress' }
    | { kind: 'vertexProject'; project: string; location: string },
}));

vi.mock('../../../src/llm-management/services/gemini-configuration-service.js', () => ({
  getGeminiConfigurationService: () => ({
    getSetupStatus: vi.fn(async () => ({ selection: geminiHarness.selection })),
  }),
}));

import { ModelMetadataProvisioningService } from '../../../src/llm-management/services/model-metadata-provisioning-service.js';

const model = (
  provider: LLMProvider,
  name: string,
  resolvedModelMetadata: ResolvedModelMetadata | null = null,
): ModelInfo => ({
  model_identifier: name,
  display_name: name,
  value: name,
  canonical_name: name,
  provider_id: provider,
  provider_name: provider,
  provider_type: provider,
  runtime: 'api',
  host_url: null,
  description: null,
  config_schema: null,
  max_context_tokens: 1_048_576,
  active_context_tokens: null,
  max_input_tokens: 1_048_576,
  max_output_tokens: 65_536,
  resolved_model_metadata: resolvedModelMetadata,
});

describe('ModelMetadataProvisioningService', () => {
  afterEach(() => {
    geminiHarness.selection = { kind: 'unconfigured' };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    { kind: 'unconfigured' },
    { kind: 'vertexExpress' },
    { kind: 'vertexProject', project: 'synthetic-project', location: 'global' },
  ] as const)('uses CURATED_ONLY with zero secret/HTTP operations for $kind', async (selection) => {
    geminiHarness.selection = selection;
    const resolve = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService({ resolve } as never)
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_ONLY);
    expect(resolve).not.toHaveBeenCalledWith('GEMINI', expect.any(String));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses only AI Studio authorization and Developer API models.list for LIVE metadata', async () => {
    geminiHarness.selection = { kind: 'aiStudio' };
    const resolve = vi.fn().mockResolvedValue(SecretValue.fromString('synthetic-ai-studio-key'));
    const fetchMock = vi.fn(async (url: string, options: { headers?: Record<string, string> }) => {
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models');
      expect(options.headers).toEqual({ 'x-goog-api-key': 'synthetic-ai-studio-key' });
      return {
        ok: true,
        json: async () => ({
          models: [{
            name: 'models/gemini-3-flash-preview',
            inputTokenLimit: 2_097_152,
            outputTokenLimit: 98_304,
          }],
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService({ resolve } as never)
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(resolve).toHaveBeenCalledWith('GEMINI', 'geminiAiStudioApiKey');
    expect(resolve).not.toHaveBeenCalledWith('GEMINI', 'geminiVertexExpressApiKey');
    expect(result).toMatchObject({
      max_context_tokens: 2_097_152,
      max_output_tokens: 98_304,
      metadata_provenance: ModelMetadataProvenance.LIVE,
    });
  });

  it.each([
    ['missing credential', vi.fn().mockRejectedValue(new Error('missing')), vi.fn()],
    ['HTTP failure', vi.fn().mockResolvedValue(SecretValue.fromString('synthetic-key')), vi.fn(async () => ({
      ok: false,
      status: 503,
    }) as Response)],
    ['mapping miss', vi.fn().mockResolvedValue(SecretValue.fromString('synthetic-key')), vi.fn(async () => ({
      ok: true,
      json: async () => ({ models: [{ name: 'models/unrelated' }] }),
    }) as Response)],
  ])('contains AI Studio %s as CURATED_FALLBACK', async (_case, resolve, fetchMock) => {
    geminiHarness.selection = { kind: 'aiStudio' };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService({ resolve } as never)
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_FALLBACK);
  });

  it('caches one provider load until explicit invalidation', async () => {
    geminiHarness.selection = { kind: 'aiStudio' };
    const resolve = vi.fn().mockResolvedValue(SecretValue.fromString('synthetic-key'));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{ name: 'models/gemini-3-flash-preview', inputTokenLimit: 2_097_152 }],
      }),
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const service = new ModelMetadataProvisioningService({ resolve } as never);
    const models = [model(LLMProvider.GEMINI, 'gemini-3-flash-preview')];

    await service.enrichBestEffort(models);
    await service.enrichBestEffort(models);
    expect(resolve).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.enrichBestEffort(models);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves inferred custom endpoint source and per-field values through enrichment', async () => {
    const resolvedModelMetadata: ResolvedModelMetadata = {
      maxContextTokens: {
        value: 1_000_000,
        source: {
          kind: 'inferred_builtin',
          provider: LLMProvider.QWEN,
          value: 'qwen3.8-max',
          provenance: {
            sourceUrl: 'https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models',
            verifiedAt: '2026-08-06',
          },
        },
      },
      maxInputTokens: { value: null, source: { kind: 'unknown' } },
      maxOutputTokens: { value: null, source: { kind: 'unknown' } },
    };

    const customModel = model(LLMProvider.OPENAI_COMPATIBLE, 'qwen3.8-max', resolvedModelMetadata);
    customModel.max_context_tokens = 1_000_000;
    customModel.max_input_tokens = null;
    customModel.max_output_tokens = null;
    const [result] = await new ModelMetadataProvisioningService({ resolve: vi.fn() } as never)
      .enrichBestEffort([customModel]);

    expect(result).toMatchObject({
      max_context_tokens: 1_000_000,
      max_input_tokens: null,
      max_output_tokens: null,
      resolved_model_metadata: resolvedModelMetadata,
      metadata_provenance: ModelMetadataProvenance.CURATED_FALLBACK,
    });
  });

  it('keeps live, inferred, and unknown custom fields distinct while mapping coarse provenance truthfully', async () => {
    const live = model(LLMProvider.OPENAI_COMPATIBLE, 'live-custom', {
      maxContextTokens: {
        value: 654321,
        source: { kind: 'live' },
      },
      maxInputTokens: { value: null, source: { kind: 'unknown' } },
      maxOutputTokens: { value: null, source: { kind: 'unknown' } },
    });
    live.max_context_tokens = 654321;
    live.max_input_tokens = null;
    live.max_output_tokens = null;

    const inferred = model(LLMProvider.OPENAI_COMPATIBLE, 'inferred-custom', {
      maxContextTokens: {
        value: 1_000_000,
        source: {
          kind: 'inferred_builtin',
          provider: LLMProvider.QWEN,
          value: 'qwen3-max',
          provenance: {
            sourceUrl: 'https://catalog.example.test/qwen3-max',
            verifiedAt: '2026-08-03',
          },
        },
      },
      maxInputTokens: { value: null, source: { kind: 'unknown' } },
      maxOutputTokens: { value: null, source: { kind: 'unknown' } },
    });
    inferred.max_context_tokens = 1_000_000;
    inferred.max_input_tokens = null;
    inferred.max_output_tokens = null;

    const unknown = model(LLMProvider.OPENAI_COMPATIBLE, 'unknown-custom');
    unknown.max_context_tokens = null;
    unknown.max_input_tokens = null;
    unknown.max_output_tokens = null;
    unknown.resolved_model_metadata = {
      maxContextTokens: { value: null, source: { kind: 'unknown' } },
      maxInputTokens: { value: null, source: { kind: 'unknown' } },
      maxOutputTokens: { value: null, source: { kind: 'unknown' } },
    };

    const [liveResult, inferredResult, unknownResult] = await new ModelMetadataProvisioningService({ resolve: vi.fn() } as never)
      .enrichBestEffort([live, inferred, unknown]);

    expect(liveResult).toMatchObject({
      max_context_tokens: 654321,
      resolved_model_metadata: live.resolved_model_metadata,
      metadata_provenance: ModelMetadataProvenance.LIVE,
    });
    expect(inferredResult).toMatchObject({
      max_context_tokens: 1_000_000,
      resolved_model_metadata: inferred.resolved_model_metadata,
      metadata_provenance: ModelMetadataProvenance.CURATED_FALLBACK,
    });
    expect(unknownResult).toMatchObject({
      max_context_tokens: null,
      max_input_tokens: null,
      max_output_tokens: null,
      resolved_model_metadata: {
        maxContextTokens: { value: null, source: { kind: 'unknown' } },
      },
      metadata_provenance: ModelMetadataProvenance.CURATED_ONLY,
    });
  });
});
