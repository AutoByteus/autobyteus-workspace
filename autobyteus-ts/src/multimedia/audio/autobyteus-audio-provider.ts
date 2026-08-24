import { AutobyteusClient } from '../../clients/autobyteus-client.js';
import type { AutobyteusDiscoveryAuthentication } from '../../clients/autobyteus-discovery-authentication.js';
import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { AudioModel } from './audio-model.js';
import { AutobyteusAudioClient } from './api/autobyteus-audio-client.js';
import {
  normalizeDiscoveryEndpointIdentity,
  tryNormalizeDiscoveryEndpointIdentity,
} from '../../llm/discovery-endpoint-identity.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isValidUrl = (url: string): boolean => {
  return tryNormalizeDiscoveryEndpointIdentity(url) !== null;
};

const resolveProvider = (provider: string): MultimediaProvider | null => {
  const normalized = provider.trim().toUpperCase();
  return Object.values(MultimediaProvider).includes(normalized as MultimediaProvider)
    ? normalized as MultimediaProvider
    : null;
};

export class AutobyteusAudioModelProvider {
  static async getModels(
    hostUrl: string,
    authentication: AutobyteusDiscoveryAuthentication,
    options: { signal?: AbortSignal | null } = {},
  ): Promise<AudioModel[]> {
    if (!isValidUrl(hostUrl)) {
      throw new Error('AUTOBYTEUS_AUDIO_DISCOVERY_HOST_INVALID');
    }
    const endpointIdentity = normalizeDiscoveryEndpointIdentity(hostUrl);

    const client = new AutobyteusClient(
      endpointIdentity,
      authentication.apiKey.revealToTrustedConsumer(),
    );
    try {
      const response = await client.getAvailableAudioModelsSync(options);
      const models = isRecord(response) ? response.models : null;
      if (!Array.isArray(models)) throw new Error('AUTOBYTEUS_AUDIO_DISCOVERY_RESPONSE_INVALID');

      const discovered: AudioModel[] = [];
      for (const modelInfo of models) {
        if (!isRecord(modelInfo)) continue;
        const name = typeof modelInfo.name === 'string' ? modelInfo.name : null;
        const value = typeof modelInfo.value === 'string' ? modelInfo.value : null;
        const providerValue = typeof modelInfo.provider === 'string' ? modelInfo.provider : null;
        if (!name || !value || !providerValue || !('parameter_schema' in modelInfo)) continue;

        const provider = resolveProvider(providerValue);
        if (!provider) continue;
        discovered.push(new AudioModel({
          name,
          value,
          provider,
          clientClass: AutobyteusAudioClient,
          runtime: MultimediaRuntime.AUTOBYTEUS,
          hostUrl: endpointIdentity,
          parameterSchema: modelInfo.parameter_schema as Record<string, unknown>,
        }));
      }
      return discovered;
    } finally {
      await client.close();
    }
  }
}
