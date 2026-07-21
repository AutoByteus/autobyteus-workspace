import { LLMFactory } from 'autobyteus-ts';
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
  private readonly inFlightByKind = new Map<AutobyteusRemoteModelKind, Promise<number>>();

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
    const hosts = this.hostsProvider();
    const hostsKey = hosts.join(',');
    if (this.completedHostsByKind.get(kind) === hostsKey) {
      return this.modelCountsByKind.get(kind) ?? 0;
    }
    return this.run(kind, hosts, hostsKey);
  }

  async refresh(kind: AutobyteusRemoteModelKind): Promise<number> {
    const hosts = this.hostsProvider();
    return this.run(kind, hosts, hosts.join(','));
  }

  async clearAllWithoutLookup(): Promise<void> {
    const hostsKey = this.hostsProvider().join(',');
    for (const kind of ['llm', 'audio', 'image'] as const) {
      await this.clear(kind);
      this.completedHostsByKind.set(kind, hostsKey);
      this.modelCountsByKind.set(kind, 0);
    }
  }

  private run(kind: AutobyteusRemoteModelKind, hosts: string[], hostsKey: string): Promise<number> {
    const existing = this.inFlightByKind.get(kind);
    if (existing) return existing;

    const operation = this.discoverAndSync(kind, hosts, hostsKey)
      .finally(() => this.inFlightByKind.delete(kind));
    this.inFlightByKind.set(kind, operation);
    return operation;
  }

  private async discoverAndSync(
    kind: AutobyteusRemoteModelKind,
    hosts: string[],
    hostsKey: string,
  ): Promise<number> {
    if (hosts.length === 0) {
      const count = await this.clear(kind);
      this.completedHostsByKind.set(kind, hostsKey);
      this.modelCountsByKind.set(kind, count);
      return count;
    }

    const consumer: SecretConsumerIdentity = {
      kind: 'modelDiscovery',
      modelKind: kind,
      providerId: 'AUTOBYTEUS',
      credentialSlot: 'apiKey',
    };
    let rawApiKey: string | null = null;
    try {
      const apiKey = await this.managementProvider().resolveForUse(consumer);
      rawApiKey = apiKey.revealToTrustedConsumer();
      const count = await this.discover(kind, hosts, rawApiKey);
      this.completedHostsByKind.set(kind, hostsKey);
      this.modelCountsByKind.set(kind, count);
      return count;
    } catch {
      throw new Error(`AUTOBYTEUS_${kind.toUpperCase()}_DISCOVERY_FAILED`);
    } finally {
      rawApiKey = null;
    }
  }

  private async discover(kind: AutobyteusRemoteModelKind, hosts: string[], apiKey: string): Promise<number> {
    switch (kind) {
      case 'llm': {
        const models = await this.ports.discoverLlm(hosts, apiKey);
        return this.ports.syncLlm(LLMRuntime.AUTOBYTEUS, models);
      }
      case 'audio': {
        const models = await this.ports.discoverAudio(hosts, apiKey);
        return this.ports.syncAudio(MultimediaRuntime.AUTOBYTEUS, models);
      }
      case 'image': {
        const models = await this.ports.discoverImage(hosts, apiKey);
        return this.ports.syncImage(MultimediaRuntime.AUTOBYTEUS, models);
      }
    }
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
