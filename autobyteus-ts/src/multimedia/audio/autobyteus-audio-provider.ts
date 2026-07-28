import { AutobyteusClient } from '../../clients/autobyteus-client.js';
import type { AutobyteusDiscoveryAuthentication } from '../../clients/autobyteus-discovery-authentication.js';
import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { AudioModel } from './audio-model.js';
import { AutobyteusAudioClient } from './api/autobyteus-audio-client.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
};

const resolveProvider = (provider: string): MultimediaProvider | null => {
  const normalized = provider.trim().toUpperCase();
  return Object.values(MultimediaProvider).includes(normalized as MultimediaProvider)
    ? normalized as MultimediaProvider
    : null;
};

export class AutobyteusAudioModelProvider {
  static async getModels(
    hosts: string[],
    authentication: AutobyteusDiscoveryAuthentication,
  ): Promise<AudioModel[]> {
    if (hosts.length === 0) return [];

    const discovered: AudioModel[] = [];
    let authoritativeResponses = 0;

    for (const hostUrl of hosts) {
      if (!isValidUrl(hostUrl)) {
        console.warn('AUTOBYTEUS_AUDIO_DISCOVERY_HOST_INVALID');
        continue;
      }

      const client = new AutobyteusClient(
        hostUrl,
        authentication.apiKey.revealToTrustedConsumer(),
      );
      try {
        const response = await client.getAvailableAudioModelsSync();
        const models = isRecord(response) ? response.models : null;
        if (!Array.isArray(models)) {
          console.warn('AUTOBYTEUS_AUDIO_DISCOVERY_RESPONSE_INVALID');
          continue;
        }
        authoritativeResponses += 1;

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
            hostUrl,
            parameterSchema: modelInfo.parameter_schema as Record<string, unknown>,
          }));
        }
      } catch {
        console.warn('AUTOBYTEUS_AUDIO_DISCOVERY_REMOTE_FAILED');
      } finally {
        await client.close();
      }
    }

    if (authoritativeResponses === 0) throw new Error('AUTOBYTEUS_AUDIO_DISCOVERY_FAILED');
    return discovered;
  }
}
