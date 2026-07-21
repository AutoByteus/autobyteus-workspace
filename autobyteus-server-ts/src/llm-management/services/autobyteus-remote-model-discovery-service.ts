import { LLMFactory } from 'autobyteus-ts';
import type { AutobyteusDiscoveryAuthentication } from 'autobyteus-ts/clients/autobyteus-discovery-authentication.js';
import { AutobyteusModelProvider } from 'autobyteus-ts/llm/autobyteus-provider.js';
import { LLMRuntime } from 'autobyteus-ts/llm/runtimes.js';
import { AudioClientFactory } from 'autobyteus-ts/multimedia/audio/audio-client-factory.js';
import { AutobyteusAudioModelProvider } from 'autobyteus-ts/multimedia/audio/autobyteus-audio-provider.js';
import { ImageClientFactory } from 'autobyteus-ts/multimedia/image/image-client-factory.js';
import { AutobyteusImageModelProvider } from 'autobyteus-ts/multimedia/image/autobyteus-image-provider.js';
import { MultimediaRuntime } from 'autobyteus-ts/multimedia/runtimes.js';
import { appConfigProvider } from '../../config/app-config-provider.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretManagementService } from '../../secret-management/services/secret-management-service.js';

export type AutobyteusRemoteModelKind = 'llm' | 'audio' | 'image';

const REMOTE_MODEL_KINDS = ['llm', 'audio', 'image'] as const;

type InFlightDiscovery = {
  generation: number;
  hostsKey: string;
  token: symbol;
  promise: Promise<number>;
};

type DiscoveryPorts = {
  discoverLlm: typeof AutobyteusModelProvider.getModels;
  discoverAudio: typeof AutobyteusAudioModelProvider.getModels;
  discoverImage: typeof AutobyteusImageModelProvider.getModels;
  syncLlm: typeof LLMFactory.syncRuntimeModels;
  syncAudio: typeof AudioClientFactory.syncRuntimeModels;
  syncImage: typeof ImageClientFactory.syncRuntimeModels;
};

const defaultPorts: DiscoveryPorts = {
  discoverLlm: AutobyteusModelProvider.getModels.bind(AutobyteusModelProvider),
  discoverAudio: AutobyteusAudioModelProvider.getModels.bind(AutobyteusAudioModelProvider),
  discoverImage: AutobyteusImageModelProvider.getModels.bind(AutobyteusImageModelProvider),
  syncLlm: LLMFactory.syncRuntimeModels.bind(LLMFactory),
  syncAudio: AudioClientFactory.syncRuntimeModels.bind(AudioClientFactory),
  syncImage: ImageClientFactory.syncRuntimeModels.bind(ImageClientFactory),
};

export class AutobyteusRemoteModelDiscoveryService {
  private readonly completedHostsByKind = new Map<AutobyteusRemoteModelKind, string>();
  private readonly modelCountsByKind = new Map<AutobyteusRemoteModelKind, number>();
  private readonly generationsByKind = new Map<AutobyteusRemoteModelKind, number>();
  private readonly inFlightByKind = new Map<AutobyteusRemoteModelKind, InFlightDiscovery>();
  private readonly syncTailsByKind = new Map<AutobyteusRemoteModelKind, Promise<void>>();
  private clearInFlight: Promise<void> | null = null;
  private clearToken: symbol | null = null;

  constructor(
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretStorageConfigurationService().requireManagementService(),
    private readonly hostsProvider: () => string[] = () => {
      const value = appConfigProvider.config.get('AUTOBYTEUS_LLM_SERVER_HOSTS') ?? '';
      return value.split(',').map((host) => host.trim()).filter(Boolean);
    },
    private readonly ports: DiscoveryPorts = defaultPorts,
  ) {}

  async ensureDiscovered(kind: AutobyteusRemoteModelKind): Promise<number> {
    if (this.clearInFlight) await this.clearInFlight;
    const hosts = this.hostsProvider();
    const hostsKey = hosts.join(',');
    if (this.completedHostsByKind.get(kind) === hostsKey) {
      return this.modelCountsByKind.get(kind) ?? 0;
    }
    return this.run(kind, hosts, hostsKey);
  }

  async refresh(kind: AutobyteusRemoteModelKind): Promise<number> {
    if (this.clearInFlight) await this.clearInFlight;
    const hosts = this.hostsProvider();
    return this.run(kind, hosts, hosts.join(','));
  }

  clearAllWithoutLookup(): Promise<void> {
    if (this.clearInFlight) return this.clearInFlight;

    const token = Symbol('authoritative-clear');
    const operation = this.performAuthoritativeClear().finally(() => {
      if (this.clearToken === token) {
        this.clearInFlight = null;
        this.clearToken = null;
      }
    });
    this.clearToken = token;
    this.clearInFlight = operation;
    return operation;
  }

  private async performAuthoritativeClear(): Promise<void> {
    const hostsKey = this.hostsProvider().join(',');
    const generations = REMOTE_MODEL_KINDS.map((kind) => {
      const generation = this.advanceGeneration(kind);
      this.inFlightByKind.delete(kind);
      return { kind, generation };
    });

    for (const { kind, generation } of generations) {
      await this.publish(kind, generation, hostsKey, () => this.clear(kind));
    }
  }

  private run(kind: AutobyteusRemoteModelKind, hosts: string[], hostsKey: string): Promise<number> {
    const currentGeneration = this.generationsByKind.get(kind) ?? 0;
    const existing = this.inFlightByKind.get(kind);
    if (
      existing
      && existing.generation === currentGeneration
      && existing.hostsKey === hostsKey
    ) return existing.promise;

    const generation = this.advanceGeneration(kind);
    const token = Symbol(`${kind}:${generation}`);
    const operation = this.discoverAndSync(kind, hosts, hostsKey, generation)
      .finally(() => {
        if (this.inFlightByKind.get(kind)?.token === token) {
          this.inFlightByKind.delete(kind);
        }
      });
    this.inFlightByKind.set(kind, { generation, hostsKey, token, promise: operation });
    return operation;
  }

  private async discoverAndSync(
    kind: AutobyteusRemoteModelKind,
    hosts: string[],
    hostsKey: string,
    generation: number,
  ): Promise<number> {
    if (hosts.length === 0) {
      return this.publish(kind, generation, hostsKey, () => this.clear(kind));
    }

    const consumer: SecretConsumerIdentity = {
      kind: 'modelDiscovery',
      modelKind: kind,
      providerId: 'AUTOBYTEUS',
      credentialSlot: 'apiKey',
    };
    try {
      const apiKey = await this.managementProvider().resolveForUse(consumer);
      const authentication: AutobyteusDiscoveryAuthentication = { apiKey };
      return await this.discover(kind, hosts, hostsKey, generation, authentication);
    } catch {
      if (!this.isCurrentGeneration(kind, generation)) {
        return this.modelCountsByKind.get(kind) ?? 0;
      }
      throw new Error(`AUTOBYTEUS_${kind.toUpperCase()}_DISCOVERY_FAILED`);
    }
  }

  private async discover(
    kind: AutobyteusRemoteModelKind,
    hosts: string[],
    hostsKey: string,
    generation: number,
    authentication: AutobyteusDiscoveryAuthentication,
  ): Promise<number> {
    switch (kind) {
      case 'llm': {
        const models = await this.ports.discoverLlm(hosts, authentication);
        return this.publish(kind, generation, hostsKey, () =>
          this.ports.syncLlm(LLMRuntime.AUTOBYTEUS, models));
      }
      case 'audio': {
        const models = await this.ports.discoverAudio(hosts, authentication);
        return this.publish(kind, generation, hostsKey, () =>
          this.ports.syncAudio(MultimediaRuntime.AUTOBYTEUS, models));
      }
      case 'image': {
        const models = await this.ports.discoverImage(hosts, authentication);
        return this.publish(kind, generation, hostsKey, () =>
          this.ports.syncImage(MultimediaRuntime.AUTOBYTEUS, models));
      }
    }
  }

  private publish(
    kind: AutobyteusRemoteModelKind,
    generation: number,
    hostsKey: string,
    synchronize: () => number | Promise<number>,
  ): Promise<number> {
    const predecessor = this.syncTailsByKind.get(kind) ?? Promise.resolve();
    const operation = predecessor.catch(() => undefined).then(async () => {
      if (!this.isCurrentGeneration(kind, generation)) {
        return this.modelCountsByKind.get(kind) ?? 0;
      }

      const count = await synchronize();
      if (!this.isCurrentGeneration(kind, generation)) {
        return this.modelCountsByKind.get(kind) ?? 0;
      }

      this.completedHostsByKind.set(kind, hostsKey);
      this.modelCountsByKind.set(kind, count);
      return count;
    });
    this.syncTailsByKind.set(kind, operation.then(() => undefined, () => undefined));
    return operation;
  }

  private advanceGeneration(kind: AutobyteusRemoteModelKind): number {
    const generation = (this.generationsByKind.get(kind) ?? 0) + 1;
    this.generationsByKind.set(kind, generation);
    return generation;
  }

  private isCurrentGeneration(kind: AutobyteusRemoteModelKind, generation: number): boolean {
    return this.generationsByKind.get(kind) === generation;
  }

  private async clear(kind: AutobyteusRemoteModelKind): Promise<number> {
    switch (kind) {
      case 'llm':
        return this.ports.syncLlm(LLMRuntime.AUTOBYTEUS, []);
      case 'audio':
        return this.ports.syncAudio(MultimediaRuntime.AUTOBYTEUS, []);
      case 'image':
        return this.ports.syncImage(MultimediaRuntime.AUTOBYTEUS, []);
    }
  }
}

let singleton: AutobyteusRemoteModelDiscoveryService | null = null;
export const getAutobyteusRemoteModelDiscoveryService = (): AutobyteusRemoteModelDiscoveryService => {
  singleton ??= new AutobyteusRemoteModelDiscoveryService();
  return singleton;
};
