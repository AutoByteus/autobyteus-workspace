import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OpenAICompatibleEndpointDiscovery,
  OpenAICompatibleEndpointModelProvider,
  SecretValue,
} from 'autobyteus-ts';

const resolveForUse = vi.hoisted(() => vi.fn());
vi.mock('../../../../../src/secret-management/secret-vault-runtime.js', () => ({
  getSecretVaultRuntime: () => ({
    requireService: () => ({ resolveForUse }),
  }),
}));

import { CustomLlmProviderRuntimeSyncService } from '../../../../../src/llm-management/llm-providers/services/custom-llm-provider-runtime-sync-service.js';

const endpoint = {
  id: 'provider_internal_gateway',
  name: 'Internal Gateway',
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: 'https://gateway.example.invalid/v1',
} as const;
const discoveredModels = [{ id: 'vendor:model:a', name: 'Vendor Model A' }];
const mappedModel = { modelIdentifier: 'openai-compatible:provider_internal_gateway:vendor:model:a' };

describe('CustomLlmProviderRuntimeSyncService', () => {
  const store = { getProviderById: vi.fn() };
  let reloadSavedEndpoints: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resolveForUse.mockReset().mockResolvedValue(SecretValue.fromString('synthetic-key'));
    store.getProviderById.mockReset().mockResolvedValue(endpoint);
    vi.spyOn(OpenAICompatibleEndpointDiscovery, 'probeEndpoint').mockResolvedValue(discoveredModels);
    reloadSavedEndpoints = vi.spyOn(OpenAICompatibleEndpointModelProvider.prototype, 'reloadSavedEndpoints')
      .mockResolvedValue({
        models: [mappedModel],
        statuses: [{ endpointId: endpoint.id, status: 'READY' }],
      } as never);
  });

  it('prepares exactly one saved provider using its metadata credential identity', async () => {
    const service = new CustomLlmProviderRuntimeSyncService(store as never);

    await expect(service.prepareProvider(endpoint.id)).resolves.toEqual({
      endpoint,
      models: [mappedModel],
    });
    expect(store.getProviderById).toHaveBeenCalledWith(endpoint.id);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'llmMetadata', providerId: endpoint.id, credentialSlot: 'apiKey',
    });
    expect(OpenAICompatibleEndpointDiscovery.probeEndpoint).toHaveBeenCalledWith({
      baseUrl: endpoint.baseUrl,
      apiKey: 'synthetic-key',
    });
    expect(reloadSavedEndpoints).toHaveBeenCalledWith([{ endpoint, discoveredModels }]);
  });

  it('maps already-probed rows without performing a second source discovery', async () => {
    const service = new CustomLlmProviderRuntimeSyncService(store as never);

    await expect(service.prepareRows(endpoint as never, discoveredModels)).resolves.toEqual({
      endpoint,
      models: [mappedModel],
    });
    expect(store.getProviderById).not.toHaveBeenCalled();
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(OpenAICompatibleEndpointDiscovery.probeEndpoint).not.toHaveBeenCalled();
    expect(reloadSavedEndpoints).toHaveBeenCalledWith([{ endpoint, discoveredModels }]);
  });

  it('normalizes credential and discovery failures without exposing provider detail', async () => {
    const service = new CustomLlmProviderRuntimeSyncService(store as never);
    resolveForUse.mockRejectedValueOnce(new Error('sensitive vault detail'));
    await expect(service.prepareProvider(endpoint.id))
      .rejects.toThrow('CUSTOM_PROVIDER_CREDENTIAL_UNAVAILABLE');

    resolveForUse.mockResolvedValueOnce(SecretValue.fromString('synthetic-key'));
    vi.mocked(OpenAICompatibleEndpointDiscovery.probeEndpoint)
      .mockRejectedValueOnce(new Error('sensitive upstream response'));
    await expect(service.prepareProvider(endpoint.id))
      .rejects.toThrow('CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE');
  });
});
