import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { ModelMetadataProvisioningService } from '../../../src/llm-management/services/model-metadata-provisioning-service.js';
import {
  getSecretStorageConfigurationService,
  resetSecretStorageConfigurationServiceForTests,
} from '../../../src/secret-management/configuration/secret-storage-configuration-service.js';

const tempDirectories: string[] = [];
const initialGeminiSetupMode = process.env.GEMINI_SETUP_MODE;

const anthropicModel = (): ModelInfo => ({
  model_identifier: 'claude-sonnet-4.6',
  display_name: 'claude-sonnet-4.6',
  value: 'claude-sonnet-4-6',
  canonical_name: 'claude-sonnet-4.6',
  provider_id: 'ANTHROPIC',
  provider_name: 'Anthropic',
  provider_type: 'ANTHROPIC',
  runtime: 'api',
  host_url: null,
  description: null,
  config_schema: null,
  max_context_tokens: 1_000_000,
  active_context_tokens: 1_000_000,
  max_input_tokens: 1_000_000,
  max_output_tokens: 64_000,
});

const geminiModel = (): ModelInfo => ({
  model_identifier: 'gemini-3-flash-preview',
  display_name: 'gemini-3-flash-preview',
  value: 'gemini-3-flash-preview',
  canonical_name: 'gemini-3-flash-preview',
  provider_id: 'GEMINI',
  provider_name: 'Gemini',
  provider_type: LLMProvider.GEMINI,
  runtime: 'api',
  host_url: null,
  description: null,
  config_schema: null,
  max_context_tokens: 1_048_576,
  active_context_tokens: null,
  max_input_tokens: 1_048_576,
  max_output_tokens: 65_536,
});

const bootstrapGeminiMetadataStore = async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-provisioning-gemini-'));
  tempDirectories.push(directory);
  const configuration = getSecretStorageConfigurationService();
  await configuration.bootstrap({ serverDataDir: directory });
  const management = configuration.requireManagementService();
  await management.saveForConsumer({
    consumer: { kind: 'llmMetadata', providerId: 'GEMINI', credentialSlot: 'geminiAiStudioApiKey' },
    value: SecretValue.fromString('synthetic-gemini-ai-studio-key'),
  });
  await management.saveForConsumer({
    consumer: { kind: 'llmMetadata', providerId: 'GEMINI', credentialSlot: 'geminiVertexExpressApiKey' },
    value: SecretValue.fromString('synthetic-gemini-vertex-express-key'),
  });
  return management;
};

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetSecretStorageConfigurationServiceForTests();
  appConfigProvider.resetForTests();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  delete process.env.ANTHROPIC_API_KEY;
  if (initialGeminiSetupMode === undefined) delete process.env.GEMINI_SETUP_MODE;
  else process.env.GEMINI_SETUP_MODE = initialGeminiSetupMode;
});

describe('ModelMetadataProvisioningService', () => {
  it('uses curated metadata without lookup or HTTP when the managed definition is missing', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-provisioning-missing-'));
    tempDirectories.push(directory);
    await getSecretStorageConfigurationService().bootstrap({ serverDataDir: directory });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService().enrich([anthropicModel()]);

    expect(result?.max_context_tokens).toBe(1_000_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves the exact metadata consumer from the Store and enriches through the provider client', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-provisioning-configured-'));
    tempDirectories.push(directory);
    const configuration = getSecretStorageConfigurationService();
    await configuration.bootstrap({ serverDataDir: directory });
    await configuration.requireManagementService().saveForConsumer({
      consumer: { kind: 'llmMetadata', providerId: 'ANTHROPIC', credentialSlot: 'apiKey' },
      value: SecretValue.fromString('synthetic-metadata-key'),
    });
    const fetchMock = vi.fn(async (_url: string, options: { headers?: Record<string, string> }) => {
      expect(options.headers).toMatchObject({ 'x-api-key': 'synthetic-metadata-key' });
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 'claude-sonnet-4-6', max_input_tokens: 1_200_000, max_tokens: 80_000 }],
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService().enrich([anthropicModel()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      max_context_tokens: 1_200_000,
      active_context_tokens: null,
      max_input_tokens: 1_200_000,
      max_output_tokens: 80_000,
    });
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it.each([
    {
      mode: 'AI_STUDIO',
      selectedSlot: 'geminiAiStudioApiKey' as const,
      rejectedSlot: 'geminiVertexExpressApiKey' as const,
      expectedKey: 'synthetic-gemini-ai-studio-key',
    },
    {
      mode: 'VERTEX_EXPRESS',
      selectedSlot: 'geminiVertexExpressApiKey' as const,
      rejectedSlot: 'geminiAiStudioApiKey' as const,
      expectedKey: 'synthetic-gemini-vertex-express-key',
    },
  ])('selects only the $mode Gemini metadata consumer and merges live metadata over curated values', async ({
    mode,
    selectedSlot,
    rejectedSlot,
    expectedKey,
  }) => {
    const management = await bootstrapGeminiMetadataStore();
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    process.env.GEMINI_SETUP_MODE = mode;
    const fetchMock = vi.fn(async (url: string, options: { headers?: Record<string, string> }) => {
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models');
      expect(options.headers).toEqual({ 'x-goog-api-key': expectedKey });
      return {
        ok: true,
        json: async () => ({
          models: [{
            name: 'models/gemini-3-flash-preview',
            baseModelId: 'gemini-3-flash-preview',
            inputTokenLimit: 2_097_152,
            outputTokenLimit: 98_304,
          }],
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService().enrich([geminiModel()]);

    expect(resolveSpy).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.GEMINI,
      credentialSlot: selectedSlot,
    });
    expect(resolveSpy).not.toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.GEMINI,
      credentialSlot: rejectedSlot,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      max_context_tokens: 2_097_152,
      max_input_tokens: 2_097_152,
      max_output_tokens: 98_304,
    });
  });

  it('uses curated Gemini metadata with zero Gemini secret lookup in Vertex Project mode', async () => {
    const management = await bootstrapGeminiMetadataStore();
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    process.env.GEMINI_SETUP_MODE = 'VERTEX_PROJECT';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await new ModelMetadataProvisioningService().enrich([geminiModel()]);

    const geminiLookups = resolveSpy.mock.calls.filter(([consumer]) => consumer.providerId === LLMProvider.GEMINI);
    expect(geminiLookups).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      max_context_tokens: 1_048_576,
      max_input_tokens: 1_048_576,
      max_output_tokens: 65_536,
    });
  });
});
