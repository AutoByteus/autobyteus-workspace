import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { ModelMetadataProvenance } from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { ModelMetadataProvisioningService } from '../../../src/llm-management/services/model-metadata-provisioning-service.js';
import {
  getSecretStorageConfigurationService,
  resetSecretStorageConfigurationServiceForTests,
} from '../../../src/secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretCredentialSlot } from '../../../src/secret-management/domain/secret-binding.js';

const tempDirectories: string[] = [];
const originalProject = process.env.VERTEX_AI_PROJECT;
const originalLocation = process.env.VERTEX_AI_LOCATION;

const model = (provider: LLMProvider, name: string): ModelInfo => ({
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
  max_context_tokens: provider === LLMProvider.GEMINI ? 1_048_576 : 1_000_000,
  active_context_tokens: null,
  max_input_tokens: provider === LLMProvider.GEMINI ? 1_048_576 : 1_000_000,
  max_output_tokens: provider === LLMProvider.GEMINI ? 65_536 : 64_000,
});

const bootstrap = async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-provisioning-'));
  tempDirectories.push(directory);
  const configuration = getSecretStorageConfigurationService();
  await configuration.bootstrap({ serverDataDir: directory });
  return configuration.requireManagementService();
};

const saveGemini = async (
  credentialSlot: Extract<SecretCredentialSlot, 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey'>,
  value: string,
) => {
  const management = await bootstrap();
  await management.saveForConsumer({
    consumer: { kind: 'llm', providerId: LLMProvider.GEMINI, credentialSlot },
    value: SecretValue.fromString(value),
  });
  return management;
};

const geminiMetadataLookups = (
  resolveSpy: ReturnType<typeof vi.spyOn>,
): unknown[][] => resolveSpy.mock.calls.filter(([consumer]) => (
  (consumer as { kind?: string; providerId?: string }).kind === 'llmMetadata'
  && (consumer as { providerId?: string }).providerId === LLMProvider.GEMINI
));

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await resetSecretStorageConfigurationServiceForTests();
  appConfigProvider.resetForTests();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  if (originalProject === undefined) delete process.env.VERTEX_AI_PROJECT;
  else process.env.VERTEX_AI_PROJECT = originalProject;
  if (originalLocation === undefined) delete process.env.VERTEX_AI_LOCATION;
  else process.env.VERTEX_AI_LOCATION = originalLocation;
});

describe('ModelMetadataProvisioningService', () => {
  it('returns curated-only Gemini metadata with zero HTTP when setup is unconfigured', async () => {
    const management = await bootstrap();
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_ONLY);
    expect(geminiMetadataLookups(resolveSpy)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('contains missing optional native metadata credentials as curated fallback', async () => {
    await bootstrap();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.ANTHROPIC, 'claude-sonnet-4.6')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_FALLBACK);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves the exact native metadata consumer and reports live metadata', async () => {
    const management = await bootstrap();
    await management.saveForConsumer({
      consumer: { kind: 'llmMetadata', providerId: LLMProvider.ANTHROPIC, credentialSlot: 'apiKey' },
      value: SecretValue.fromString('synthetic-anthropic-metadata-key'),
    });
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: { headers?: Record<string, string> }) => {
      expect(options.headers).toMatchObject({ 'x-api-key': 'synthetic-anthropic-metadata-key' });
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 'claude-sonnet-4.6', max_input_tokens: 1_200_000, max_tokens: 80_000 }],
        }),
      } as Response;
    }));

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.ANTHROPIC, 'claude-sonnet-4.6')]);

    expect(resolveSpy).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.ANTHROPIC,
      credentialSlot: 'apiKey',
    });
    expect(result).toMatchObject({
      max_context_tokens: 1_200_000,
      max_input_tokens: 1_200_000,
      max_output_tokens: 80_000,
      metadata_provenance: ModelMetadataProvenance.LIVE,
    });
  });

  it('uses only AI Studio metadata authorization and the Developer API endpoint', async () => {
    const management = await saveGemini(
      'geminiAiStudioApiKey',
      'synthetic-gemini-ai-studio-key',
    );
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    const fetchMock = vi.fn(async (url: string, options: { headers?: Record<string, string> }) => {
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models');
      expect(options.headers).toEqual({ 'x-goog-api-key': 'synthetic-gemini-ai-studio-key' });
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

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(resolveSpy).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.GEMINI,
      credentialSlot: 'geminiAiStudioApiKey',
    });
    expect(resolveSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      credentialSlot: 'geminiVertexExpressApiKey',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      max_context_tokens: 2_097_152,
      max_output_tokens: 98_304,
      metadata_provenance: ModelMetadataProvenance.LIVE,
    });
  });

  it('uses curated-only metadata with zero metadata lookup/HTTP for Vertex Express', async () => {
    const management = await saveGemini(
      'geminiVertexExpressApiKey',
      'synthetic-gemini-vertex-express-key',
    );
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_ONLY);
    expect(geminiMetadataLookups(resolveSpy)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses curated-only metadata with zero metadata lookup/HTTP for complete Vertex Project', async () => {
    const management = await bootstrap();
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    process.env.VERTEX_AI_PROJECT = 'synthetic-project';
    process.env.VERTEX_AI_LOCATION = 'global';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_ONLY);
    expect(geminiMetadataLookups(resolveSpy)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('contains AI Studio HTTP and mapping misses as curated fallback', async () => {
    await saveGemini('geminiAiStudioApiKey', 'synthetic-gemini-ai-studio-key');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{ name: 'models/unrelated', inputTokenLimit: 2_000_000 }],
      }),
    }) as Response));

    const [result] = await new ModelMetadataProvisioningService()
      .enrichBestEffort([model(LLMProvider.GEMINI, 'gemini-3-flash-preview')]);

    expect(result?.metadata_provenance).toBe(ModelMetadataProvenance.CURATED_FALLBACK);
  });

  it('caches one live provider load until explicit invalidation', async () => {
    await saveGemini('geminiAiStudioApiKey', 'synthetic-gemini-ai-studio-key');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{
          name: 'models/gemini-3-flash-preview',
          inputTokenLimit: 2_097_152,
        }],
      }),
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    const service = new ModelMetadataProvisioningService();
    const models = [model(LLMProvider.GEMINI, 'gemini-3-flash-preview')];

    await service.enrichBestEffort(models);
    await service.enrichBestEffort(models);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    service.invalidate();
    await service.enrichBestEffort(models);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
