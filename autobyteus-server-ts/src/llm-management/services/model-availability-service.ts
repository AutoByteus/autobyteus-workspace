import { LLMFactory } from 'autobyteus-ts/llm/llm-factory.js';
import { tryNormalizeDiscoveryEndpointIdentity } from 'autobyteus-ts/llm/discovery-endpoint-identity.js';
import {
  parseHostScopedLlmModelIdentifier,
  type HostScopedLlmModelIdentifier,
} from 'autobyteus-ts/llm/models.js';
import {
  parseOpenAICompatibleEndpointModelIdentifier,
} from 'autobyteus-ts/llm/openai-compatible-endpoint-model.js';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../llm-providers/stores/custom-llm-provider-store.js';
import { getModelCatalogService, type ModelCatalogService } from './model-catalog-service.js';
import type { ModelSourceStatus } from '../llm-providers/domain/models.js';

export type AvailableModelKind = 'LLM' | 'AUDIO' | 'IMAGE' | 'VIDEO';

/**
 * autobyteus-500 G-5 (SR-015 R1, SR-016): an AutoByteus LLM identifier of a provider loaded on demand (Ollama, LM Studio,
 * a custom OpenAI-compatible endpoint) after its provider's catalog is ensured. `unreadable`: the provider can't be
 * resolved (its host or endpoint isn't configured), the load throws, or its source reports any failed unit or a failed
 * state; the counts span the provider's hosts, so one failed host may be this model's.
 */
export type OnDemandModelLoad = 'not_on_demand' | 'loaded' | 'unreadable';

const FAILED_SOURCE_STATES: ReadonlySet<string> = new Set(['ERROR', 'STALE_ERROR']);
const sourceFailed = (source: ModelSourceStatus): boolean =>
  source.failedUnitCount > 0 || FAILED_SOURCE_STATES.has(source.state);

const isOnDemandIdentifier = (identifier: string): boolean =>
  parseOpenAICompatibleEndpointModelIdentifier(identifier) !== null
  || parseHostScopedLlmModelIdentifier(identifier) !== null;

const normalizedConfiguredEndpoints = (hosts: readonly string[]): string[] => hosts
  .map((host) => tryNormalizeDiscoveryEndpointIdentity(host))
  .filter((host): host is string => host !== null);

const uniqueConfiguredEndpointForAuthority = (
  hosts: readonly string[],
  authority: string,
): string | null => {
  const matches = normalizedConfiguredEndpoints(hosts)
    .filter((endpoint) => new URL(endpoint).host === authority);
  return matches.length === 1 ? matches[0]! : null;
};

const isExactConfiguredEndpoint = (
  configuredEndpoint: string | null,
  registeredEndpoint: string | null | undefined,
): boolean => configuredEndpoint !== null
  && tryNormalizeDiscoveryEndpointIdentity(registeredEndpoint ?? '') === configuredEndpoint;

const configuredHostsFor = (runtime: HostScopedLlmModelIdentifier['runtime']): string[] =>
  runtime === LLMRuntime.OLLAMA ? OllamaModelProvider.getHosts() : LMStudioModelProvider.getHosts();

export class ModelAvailabilityService {
  constructor(
    private readonly catalog: ModelCatalogService = getModelCatalogService(),
    private readonly customProviders: CustomLlmProviderStore = getCustomLlmProviderStore(),
  ) {}

  async ensureModelAvailable(
    modelIdentifier: string,
    kind: AvailableModelKind,
    runtimeKind = 'autobyteus',
  ): Promise<void> {
    if (await this.isRegistered(modelIdentifier, kind)) return;
    // Its own errors reach the start as before; G-5's `loadOnDemandModel` classifies them instead.
    if (!await this.loadProviderCatalog(modelIdentifier, kind, runtimeKind)) throw new Error('MODEL_IDENTIFIER_NOT_AVAILABLE');
    if (!await this.isRegistered(modelIdentifier, kind)) {
      throw new Error('MODEL_IDENTIFIER_NOT_AVAILABLE');
    }
  }

  /** G-5: loads an AutoByteus LLM identifier's on-demand provider, as a start would, and says whether it was read. */
  async loadOnDemandModel(identifier: string): Promise<OnDemandModelLoad> {
    if (!isOnDemandIdentifier(identifier)) return 'not_on_demand';
    try {
      const loaded = await this.loadProviderCatalog(identifier, 'LLM', 'autobyteus');
      return !loaded || loaded.snapshot.sources.some(sourceFailed) ? 'unreadable' : 'loaded';
    } catch {
      return 'unreadable';
    }
  }

  /** The on-demand load step both use: the identifier's provider, its catalog ensured; null when it can't be resolved. */
  private async loadProviderCatalog(identifier: string, kind: AvailableModelKind, runtimeKind: string) {
    const providerId = await this.resolveDynamicProvider(identifier, kind);
    if (!providerId) return null;
    return { snapshot: await this.catalog.ensureProviderModelCatalog(providerId, runtimeKind) };
  }

  private async resolveDynamicProvider(
    identifier: string,
    kind: AvailableModelKind,
  ): Promise<string | null> {
    if (kind !== 'LLM') return null;
    const custom = parseOpenAICompatibleEndpointModelIdentifier(identifier);
    if (custom) {
      return await this.customProviders.getProviderById(custom.providerId)
        ? custom.providerId
        : null;
    }
    const hosted = parseHostScopedLlmModelIdentifier(identifier);
    if (!hosted) return null;
    const provider = hosted.runtime === LLMRuntime.OLLAMA ? LLMProvider.OLLAMA : LLMProvider.LMSTUDIO;
    return uniqueConfiguredEndpointForAuthority(configuredHostsFor(hosted.runtime), hosted.host)
      ? provider
      : null;
  }

  private async isRegistered(identifier: string, kind: AvailableModelKind): Promise<boolean> {
    if (kind === 'LLM') {
      const registered = (await LLMFactory.listAvailableModels())
        .find((model) => model.model_identifier === identifier);
      if (!registered) return false;
      const hosted = parseHostScopedLlmModelIdentifier(identifier);
      if (!hosted) return true;
      return isExactConfiguredEndpoint(
        uniqueConfiguredEndpointForAuthority(configuredHostsFor(hosted.runtime), hosted.host),
        registered.host_url,
      );
    }
    if (kind === 'AUDIO') return AudioClientFactory.hasRegisteredModel(identifier);
    if (kind === 'IMAGE') return ImageClientFactory.hasRegisteredModel(identifier);
    return false;
  }
}

let singleton: ModelAvailabilityService | null = null;
export const getModelAvailabilityService = (): ModelAvailabilityService => {
  singleton ??= new ModelAvailabilityService();
  return singleton;
};
