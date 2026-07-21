import {
  SearchClientFactory,
  SearchProvider,
  type SearchExecutor,
} from 'autobyteus-ts';
import { SecretValue } from 'autobyteus-ts';
import { appConfigProvider } from '../../config/app-config-provider.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';

type SupportedSearchProvider = 'serper' | 'serpapi' | 'vertex_ai_search';

const supportedProviders = new Set<SupportedSearchProvider>([
  'serper', 'serpapi', 'vertex_ai_search',
]);

const normalizeProvider = (provider: string): SupportedSearchProvider => {
  const value = provider.trim().toLowerCase() as SupportedSearchProvider;
  if (!supportedProviders.has(value)) throw new Error('SEARCH_PROVIDER_UNSUPPORTED');
  return value;
};

export class SearchProvisioningService implements SearchExecutor {
  async search(query: string, numResults: number): Promise<string> {
    const provider = normalizeProvider(appConfigProvider.config.get('DEFAULT_SEARCH_PROVIDER') ?? '');
    const apiKey = await getSecretStorageConfigurationService()
      .requireManagementService()
      .resolveForUse(this.consumer(provider));
    const factory = SearchClientFactory.getInstance();
    const client = provider === 'vertex_ai_search'
      ? factory.createSearchClient({
          provider: SearchProvider.VERTEX_AI_SEARCH,
          apiKey,
          servingConfig: this.requireServingConfig(),
        })
      : factory.createSearchClient({
          provider: provider === 'serper' ? SearchProvider.SERPER : SearchProvider.SERPAPI,
          apiKey,
        });
    return client.search(query, numResults);
  }

  async getConfigurationStatus(): Promise<{
    provider: string;
    backendHealth: string;
    lifecycle: string | null;
    instructionCode: string | null;
    serperStorageState: string | null;
    serpapiStorageState: string | null;
    vertexAiSearchStorageState: string | null;
    vertexAiSearchServingConfig: string | null;
  }> {
    const configuration = getSecretStorageConfigurationService();
    const snapshot = await configuration.snapshot();
    const status = async (provider: SupportedSearchProvider): Promise<string | null> => {
      try {
        const result = await configuration
          .requireManagementService()
          .getStatusForConsumer(this.consumer(provider));
        return result.health.state === 'READY' ? result.secret?.storageState ?? null : null;
      } catch {
        return null;
      }
    };
    return {
      provider: appConfigProvider.config.get('DEFAULT_SEARCH_PROVIDER')?.trim().toLowerCase() ?? '',
      backendHealth: snapshot.health.state,
      lifecycle: snapshot.lifecycle?.kind ?? null,
      instructionCode: 'instructionCode' in snapshot.health
        ? snapshot.health.instructionCode
        : snapshot.lifecycle?.kind === 'EXTERNALLY_MANAGED'
          ? snapshot.lifecycle.instructionCode
          : null,
      serperStorageState: await status('serper'),
      serpapiStorageState: await status('serpapi'),
      vertexAiSearchStorageState: await status('vertex_ai_search'),
      vertexAiSearchServingConfig:
        appConfigProvider.config.get('VERTEX_AI_SEARCH_SERVING_CONFIG')?.trim() || null,
    };
  }

  async saveConfiguration(input: {
    provider: string;
    apiKey?: string | null;
    vertexServingConfig?: string | null;
  }): Promise<void> {
    const provider = normalizeProvider(input.provider);
    const existing = await this.getConfigurationStatus();
    const alreadyConfigured = provider === 'serper'
      ? existing.serperStorageState === 'CONFIGURED'
      : provider === 'serpapi'
        ? existing.serpapiStorageState === 'CONFIGURED'
        : existing.vertexAiSearchStorageState === 'CONFIGURED';
    const apiKey = input.apiKey?.trim();
    if (apiKey) {
      await getSecretStorageConfigurationService().requireManagementService().saveForConsumer({
        consumer: this.consumer(provider),
        value: SecretValue.fromString(apiKey),
      });
    } else if (!alreadyConfigured) {
      throw new Error('SEARCH_API_KEY_REQUIRED');
    }
    if (provider === 'vertex_ai_search') {
      const servingConfig = input.vertexServingConfig?.trim()
        || existing.vertexAiSearchServingConfig;
      if (!servingConfig) throw new Error('VERTEX_SEARCH_SERVING_CONFIG_REQUIRED');
      appConfigProvider.config.set('VERTEX_AI_SEARCH_SERVING_CONFIG', servingConfig);
    }
    appConfigProvider.config.set('DEFAULT_SEARCH_PROVIDER', provider);
  }

  private consumer(provider: SupportedSearchProvider): SecretConsumerIdentity {
    return { kind: 'search', providerId: provider, credentialSlot: 'apiKey' };
  }

  private requireServingConfig(): string {
    const value = appConfigProvider.config.get('VERTEX_AI_SEARCH_SERVING_CONFIG')?.trim();
    if (!value) throw new Error('VERTEX_SEARCH_SERVING_CONFIG_REQUIRED');
    return value;
  }
}

let singleton: SearchProvisioningService | null = null;
export const getSearchProvisioningService = (): SearchProvisioningService => {
  singleton ??= new SearchProvisioningService();
  return singleton;
};
