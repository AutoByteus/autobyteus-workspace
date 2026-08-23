import type { AutobyteusDiscoveryAuthentication } from 'autobyteus-ts/clients/autobyteus-discovery-authentication.js';
import { AutobyteusModelProvider } from 'autobyteus-ts/llm/autobyteus-provider.js';
import { tryNormalizeDiscoveryEndpointIdentity } from 'autobyteus-ts/llm/discovery-endpoint-identity.js';
import type { LLMModel } from 'autobyteus-ts/llm/models.js';
import { AutobyteusAudioModelProvider } from 'autobyteus-ts/multimedia/audio/autobyteus-audio-provider.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import { AutobyteusImageModelProvider } from 'autobyteus-ts/multimedia/image/autobyteus-image-provider.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import { appConfigProvider } from '../../config/app-config-provider.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-id.js';
import { getSecretVaultRuntime } from '../../secret-management/secret-vault-runtime.js';
import type { SecretManagementService } from '../../secret-management/services/secret-management-service.js';
import type { DynamicSourcePreparation } from './dynamic-model-source-lifecycle.js';

export type AutobyteusRemoteModelKind = 'llm' | 'audio' | 'image';
export type AutobyteusRemoteModel = LLMModel | AudioModel | ImageModel;
export const AUTOBYTEUS_MODEL_DISCOVERY_DEADLINE_MS = 30_000;

type DiscoveryRequestOptions = { signal?: AbortSignal | null };
type DiscoveryPorts = {
  discoverLlm: (
    host: string,
    authentication: AutobyteusDiscoveryAuthentication,
    options?: DiscoveryRequestOptions,
  ) => Promise<LLMModel[]>;
  discoverAudio: (
    host: string,
    authentication: AutobyteusDiscoveryAuthentication,
    options?: DiscoveryRequestOptions,
  ) => Promise<AudioModel[]>;
  discoverImage: (
    host: string,
    authentication: AutobyteusDiscoveryAuthentication,
    options?: DiscoveryRequestOptions,
  ) => Promise<ImageModel[]>;
};

type HostAttempt =
  | { kind: 'success'; models: AutobyteusRemoteModel[] }
  | { kind: 'failure' };

const defaultPorts: DiscoveryPorts = {
  discoverLlm: AutobyteusModelProvider.getModels.bind(AutobyteusModelProvider),
  discoverAudio: AutobyteusAudioModelProvider.getModels.bind(AutobyteusAudioModelProvider),
  discoverImage: AutobyteusImageModelProvider.getModels.bind(AutobyteusImageModelProvider),
};

const isValidHost = (host: string): boolean => {
  return tryNormalizeDiscoveryEndpointIdentity(host) !== null;
};

export class AutobyteusRemoteModelDiscoveryService {
  constructor(
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretVaultRuntime().requireService(),
    private readonly hostsProvider: () => string[] = () => {
      const value = appConfigProvider.config.get('AUTOBYTEUS_LLM_SERVER_HOSTS') ?? '';
      return value.split(',').map((host) => host.trim()).filter(Boolean);
    },
    private readonly ports: DiscoveryPorts = defaultPorts,
    private readonly signalFactory: (deadlineMs: number) => AbortSignal =
      (deadlineMs) => AbortSignal.timeout(deadlineMs),
    private readonly deadlineMs = AUTOBYTEUS_MODEL_DISCOVERY_DEADLINE_MS,
  ) {}

  configuredHosts(): string[] {
    return this.hostsProvider()
      .map((host) => host.trim())
      .filter(Boolean)
      .map((host) => tryNormalizeDiscoveryEndpointIdentity(host) ?? host);
  }

  fingerprint(kind: AutobyteusRemoteModelKind, credentialRevision: number): string {
    return `${kind}|${this.configuredHosts().join(',')}|credential:${credentialRevision}`;
  }

  async prepare(kind: AutobyteusRemoteModelKind): Promise<DynamicSourcePreparation<AutobyteusRemoteModel>> {
    const hosts = this.configuredHosts();
    if (hosts.length === 0) return { models: [], successfulUnitCount: 0, failedUnitCount: 0 };
    const validHosts = hosts.filter(isValidHost);
    const invalidHostCount = hosts.length - validHosts.length;
    if (validHosts.length === 0) throw new Error('AUTOBYTEUS_MODEL_DISCOVERY_INVALID_HOSTS');

    const consumer: SecretConsumerIdentity = {
      kind: 'modelDiscovery',
      modelKind: kind,
      providerId: 'AUTOBYTEUS',
      credentialSlot: 'apiKey',
    };
    let authentication: AutobyteusDiscoveryAuthentication;
    try {
      authentication = { apiKey: await this.managementProvider().resolveForUse(consumer) };
    } catch {
      throw new Error('AUTOBYTEUS_MODEL_DISCOVERY_CREDENTIAL_UNAVAILABLE');
    }

    const attempts = await Promise.all(validHosts.map((host) =>
      this.attemptHost(kind, host, authentication)));
    const successes = attempts.filter(
      (attempt): attempt is Extract<HostAttempt, { kind: 'success' }> => attempt.kind === 'success',
    );
    if (successes.length === 0) throw new Error('AUTOBYTEUS_MODEL_DISCOVERY_UNAVAILABLE');
    return {
      models: successes.flatMap((attempt) => attempt.models),
      successfulUnitCount: successes.length,
      failedUnitCount: invalidHostCount + attempts.length - successes.length,
    };
  }

  private async attemptHost(
    kind: AutobyteusRemoteModelKind,
    host: string,
    authentication: AutobyteusDiscoveryAuthentication,
  ): Promise<HostAttempt> {
    try {
      const options = { signal: this.signalFactory(this.deadlineMs) };
      if (kind === 'llm') {
        return { kind: 'success', models: await this.ports.discoverLlm(host, authentication, options) };
      }
      if (kind === 'audio') {
        return { kind: 'success', models: await this.ports.discoverAudio(host, authentication, options) };
      }
      return { kind: 'success', models: await this.ports.discoverImage(host, authentication, options) };
    } catch {
      return { kind: 'failure' };
    }
  }
}

let singleton: AutobyteusRemoteModelDiscoveryService | null = null;
export const getAutobyteusRemoteModelDiscoveryService = (): AutobyteusRemoteModelDiscoveryService => {
  singleton ??= new AutobyteusRemoteModelDiscoveryService();
  return singleton;
};
