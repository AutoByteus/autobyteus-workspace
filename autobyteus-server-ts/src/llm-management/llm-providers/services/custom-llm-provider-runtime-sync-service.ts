import { LLMFactory } from 'autobyteus-ts';
import type {
  OpenAICompatibleEndpointReloadReport,
  OpenAICompatibleEndpointReloadStatus,
} from 'autobyteus-ts';
import type { CustomProviderReloadStatus } from '../domain/models.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../stores/custom-llm-provider-store.js';

const buildNeverLoadedStatus = (providerId: string): CustomProviderReloadStatus => ({
  providerId,
  status: 'ERROR',
  message: null,
  modelCount: 0,
  preservedPreviousModels: false,
});

const mapStatus = (status: OpenAICompatibleEndpointReloadStatus): CustomProviderReloadStatus => ({
  providerId: status.endpointId,
  status: status.status === 'NEVER_LOADED' ? 'ERROR' : status.status,
  message: status.message ?? null,
  modelCount: status.modelCount,
  preservedPreviousModels: status.preservedPreviousModels,
});

export class CustomLlmProviderRuntimeSyncService {
  private hasEverSynced = false;
  private lastStatusesByProviderId = new Map<string, CustomProviderReloadStatus>();
  private syncPromise: Promise<OpenAICompatibleEndpointReloadReport> | null = null;

  constructor(
    private readonly customProviderStore: CustomLlmProviderStore = getCustomLlmProviderStore(),
  ) {}

  async ensureSyncedForCatalogRead(): Promise<void> {
    if (this.hasEverSynced) {
      return;
    }
    await this.syncSavedProviders();
  }

  async syncSavedProviders(): Promise<OpenAICompatibleEndpointReloadReport> {
    if (!this.syncPromise) {
      this.syncPromise = this.performSync().finally(() => {
        this.syncPromise = null;
      });
    }
    return this.syncPromise;
  }

  getStatus(providerId: string): CustomProviderReloadStatus {
    return this.lastStatusesByProviderId.get(providerId) ?? buildNeverLoadedStatus(providerId);
  }

  private async performSync(): Promise<OpenAICompatibleEndpointReloadReport> {
    const savedProviders = await this.customProviderStore.listProviders();
    const report = await LLMFactory.syncOpenAICompatibleEndpointModels(savedProviders);
    this.hasEverSynced = true;
    this.lastStatusesByProviderId = new Map(
      report.statuses.map((status) => {
        const mappedStatus = mapStatus(status);
        return [mappedStatus.providerId, mappedStatus];
      }),
    );
    return report;
  }
}

let cachedCustomLlmProviderRuntimeSyncService: CustomLlmProviderRuntimeSyncService | null = null;

export const getCustomLlmProviderRuntimeSyncService = (): CustomLlmProviderRuntimeSyncService => {
  if (!cachedCustomLlmProviderRuntimeSyncService) {
    cachedCustomLlmProviderRuntimeSyncService = new CustomLlmProviderRuntimeSyncService();
  }
  return cachedCustomLlmProviderRuntimeSyncService;
};
