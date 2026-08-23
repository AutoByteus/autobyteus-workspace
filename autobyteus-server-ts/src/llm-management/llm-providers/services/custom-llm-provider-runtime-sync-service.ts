import {
  OpenAICompatibleEndpointDiscovery,
  OpenAICompatibleEndpointModelProvider,
  type CustomLlmProviderRecord,
  type OpenAICompatibleEndpointDiscoveredModel,
  type OpenAICompatibleEndpointModel,
} from 'autobyteus-ts';
import { getSecretVaultRuntime } from '../../../secret-management/secret-vault-runtime.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../stores/custom-llm-provider-store.js';

export type PreparedCustomProviderModels = {
  endpoint: CustomLlmProviderRecord;
  models: OpenAICompatibleEndpointModel[];
};

export class CustomLlmProviderRuntimeSyncService {
  private readonly modelProvider = new OpenAICompatibleEndpointModelProvider();

  constructor(
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
  ) {}

  async prepareProvider(providerId: string): Promise<PreparedCustomProviderModels> {
    const endpoint = await this.customProviderStore.getProviderById(providerId);
    if (!endpoint) throw new Error('CUSTOM_PROVIDER_NOT_FOUND');
    let apiKey: string;
    try {
      const resolved = await getSecretVaultRuntime()
        .requireService()
        .resolveForUse({ kind: 'llmMetadata', providerId: endpoint.id, credentialSlot: 'apiKey' });
      apiKey = resolved.revealToTrustedConsumer();
    } catch {
      throw new Error('CUSTOM_PROVIDER_CREDENTIAL_UNAVAILABLE');
    }
    let discoveredModels: OpenAICompatibleEndpointDiscoveredModel[];
    try {
      discoveredModels = await OpenAICompatibleEndpointDiscovery.probeEndpoint({
        baseUrl: endpoint.baseUrl,
        apiKey,
      });
    } catch {
      throw new Error('CUSTOM_PROVIDER_DISCOVERY_UNAVAILABLE');
    }
    return this.prepareRows(endpoint, discoveredModels);
  }

  async prepareRows(
    endpoint: CustomLlmProviderRecord,
    discoveredModels: OpenAICompatibleEndpointDiscoveredModel[],
  ): Promise<PreparedCustomProviderModels> {
    const report = await this.modelProvider.reloadSavedEndpoints([
      { endpoint, discoveredModels },
    ]);
    const status = report.statuses[0];
    if (!status || status.status !== 'READY') throw new Error('CUSTOM_PROVIDER_MODEL_MAPPING_FAILED');
    return { endpoint, models: report.models };
  }
}

let singleton: CustomLlmProviderRuntimeSyncService | null = null;
export const getCustomLlmProviderRuntimeSyncService = (): CustomLlmProviderRuntimeSyncService => {
  singleton ??= new CustomLlmProviderRuntimeSyncService();
  return singleton;
};
