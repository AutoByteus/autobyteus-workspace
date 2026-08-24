import { LLMFactory } from 'autobyteus-ts/llm/llm-factory.js';
import { tryNormalizeDiscoveryEndpointIdentity } from 'autobyteus-ts/llm/discovery-endpoint-identity.js';
import {
  parseHostScopedLlmModelIdentifier,
} from 'autobyteus-ts/llm/models.js';
import {
  parseOpenAICompatibleEndpointModelIdentifier,
} from 'autobyteus-ts/llm/openai-compatible-endpoint-model.js';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import { parseHostScopedMultimediaModelIdentifier } from 'autobyteus-ts/multimedia/model-identifier.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  getCustomLlmProviderStore,
  type CustomLlmProviderStore,
} from '../llm-providers/stores/custom-llm-provider-store.js';
import {
  getAutobyteusRemoteModelDiscoveryService,
  type AutobyteusRemoteModelDiscoveryService,
} from './autobyteus-remote-model-discovery-service.js';
import { getModelCatalogService, type ModelCatalogService } from './model-catalog-service.js';

export type AvailableModelKind = 'LLM' | 'AUDIO' | 'IMAGE' | 'VIDEO';

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

export class ModelAvailabilityService {
  constructor(
    private readonly catalog: ModelCatalogService = getModelCatalogService(),
    private readonly customProviders: CustomLlmProviderStore = getCustomLlmProviderStore(),
    private readonly autobyteusDiscovery: AutobyteusRemoteModelDiscoveryService =
      getAutobyteusRemoteModelDiscoveryService(),
  ) {}

  async ensureModelAvailable(
    modelIdentifier: string,
    kind: AvailableModelKind,
    runtimeKind = 'autobyteus',
  ): Promise<void> {
    if (await this.isRegistered(modelIdentifier, kind)) return;
    const providerId = await this.resolveDynamicProvider(modelIdentifier, kind);
    if (!providerId) throw new Error('MODEL_IDENTIFIER_NOT_AVAILABLE');
    await this.catalog.ensureProviderModelCatalog(providerId, runtimeKind);
    if (!await this.isRegistered(modelIdentifier, kind)) {
      throw new Error('MODEL_IDENTIFIER_NOT_AVAILABLE');
    }
  }

  private async resolveDynamicProvider(
    identifier: string,
    kind: AvailableModelKind,
  ): Promise<string | null> {
    if (kind === 'LLM') {
      const custom = parseOpenAICompatibleEndpointModelIdentifier(identifier);
      if (custom) {
        return await this.customProviders.getProviderById(custom.providerId)
          ? custom.providerId
          : null;
      }
      const hosted = parseHostScopedLlmModelIdentifier(identifier);
      if (!hosted) return null;
      if (hosted.runtime === LLMRuntime.OLLAMA) {
        return uniqueConfiguredEndpointForAuthority(OllamaModelProvider.getHosts(), hosted.host)
          ? LLMProvider.OLLAMA
          : null;
      }
      if (hosted.runtime === LLMRuntime.LMSTUDIO) {
        return uniqueConfiguredEndpointForAuthority(LMStudioModelProvider.getHosts(), hosted.host)
          ? LLMProvider.LMSTUDIO
          : null;
      }
      return uniqueConfiguredEndpointForAuthority(
        this.autobyteusDiscovery.configuredHosts(),
        hosted.host,
      )
        ? LLMProvider.AUTOBYTEUS
        : null;
    }
    if (kind !== 'AUDIO' && kind !== 'IMAGE') return null;
    const hosted = parseHostScopedMultimediaModelIdentifier(identifier);
    return hosted
      && uniqueConfiguredEndpointForAuthority(
        this.autobyteusDiscovery.configuredHosts(),
        hosted.host,
      )
      ? LLMProvider.AUTOBYTEUS
      : null;
  }

  private async isRegistered(identifier: string, kind: AvailableModelKind): Promise<boolean> {
    if (kind === 'LLM') {
      const registered = (await LLMFactory.listAvailableModels())
        .find((model) => model.model_identifier === identifier);
      if (!registered) return false;
      const hosted = parseHostScopedLlmModelIdentifier(identifier);
      if (!hosted) return true;
      const hosts = hosted.runtime === LLMRuntime.OLLAMA
        ? OllamaModelProvider.getHosts()
        : hosted.runtime === LLMRuntime.LMSTUDIO
          ? LMStudioModelProvider.getHosts()
          : this.autobyteusDiscovery.configuredHosts();
      return isExactConfiguredEndpoint(
        uniqueConfiguredEndpointForAuthority(hosts, hosted.host),
        registered.host_url,
      );
    }
    if (kind === 'AUDIO') {
      const registered = AudioClientFactory.listModels()
        .find((model) => model.modelIdentifier === identifier);
      if (!registered) return false;
      if (registered.runtime !== MultimediaRuntime.AUTOBYTEUS) return true;
      const hosted = parseHostScopedMultimediaModelIdentifier(identifier);
      return hosted !== null && isExactConfiguredEndpoint(
        uniqueConfiguredEndpointForAuthority(
          this.autobyteusDiscovery.configuredHosts(),
          hosted.host,
        ),
        registered.hostUrl,
      );
    }
    if (kind === 'IMAGE') {
      const registered = ImageClientFactory.listModels()
        .find((model) => model.modelIdentifier === identifier);
      if (!registered) return false;
      if (registered.runtime !== MultimediaRuntime.AUTOBYTEUS) return true;
      const hosted = parseHostScopedMultimediaModelIdentifier(identifier);
      return hosted !== null && isExactConfiguredEndpoint(
        uniqueConfiguredEndpointForAuthority(
          this.autobyteusDiscovery.configuredHosts(),
          hosted.host,
        ),
        registered.hostUrl,
      );
    }
    return false;
  }
}

let singleton: ModelAvailabilityService | null = null;
export const getModelAvailabilityService = (): ModelAvailabilityService => {
  singleton ??= new ModelAvailabilityService();
  return singleton;
};
