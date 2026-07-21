import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { ModelMetadataProvisioningService } from '../../../src/llm-management/services/model-metadata-provisioning-service.js';
import {
  getSecretStorageConfigurationService,
  resetSecretStorageConfigurationServiceForTests,
} from '../../../src/secret-management/configuration/secret-storage-configuration-service.js';

const tempDirectories: string[] = [];

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

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetSecretStorageConfigurationServiceForTests();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  delete process.env.ANTHROPIC_API_KEY;
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
});
