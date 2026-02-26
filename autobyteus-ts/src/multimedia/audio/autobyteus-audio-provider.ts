import { AutobyteusClient } from '../../clients/autobyteus-client.js';
import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { AudioModel } from './audio-model.js';
import { AutobyteusAudioClient } from './api/autobyteus-audio-client.js';
import { AudioClientFactory } from './audio-client-factory.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function parseHosts(): string[] {
  const hosts = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
  if (hosts) {
    return hosts.split(',').map((host) => host.trim()).filter(Boolean);
  }

  return [];
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function resolveProvider(provider: string): MultimediaProvider | null {
  const normalized = provider.trim().toUpperCase();
  if (Object.values(MultimediaProvider).includes(normalized as MultimediaProvider)) {
    return normalized as MultimediaProvider;
  }
  return null;
}

export class AutobyteusAudioModelProvider {
  private static discoveryPromise: Promise<void> | null = null;
  private static lastHostsKey: string | null = null;

  static resetDiscovery(): void {
    AutobyteusAudioModelProvider.discoveryPromise = null;
    AutobyteusAudioModelProvider.lastHostsKey = null;
  }

  static async ensureDiscovered(): Promise<void> {
    const hostsKey = parseHosts().join(',');
    if (!hostsKey) {
      if (AutobyteusAudioModelProvider.lastHostsKey !== '') {
        console.info('No Autobyteus server hosts configured. Skipping Autobyteus audio model discovery.');
      }
      AutobyteusAudioModelProvider.lastHostsKey = '';
      AutobyteusAudioModelProvider.discoveryPromise = null;
      return;
    }

    if (
      AutobyteusAudioModelProvider.lastHostsKey &&
      AutobyteusAudioModelProvider.lastHostsKey !== hostsKey
    ) {
      AutobyteusAudioModelProvider.discoveryPromise = null;
    }

    AutobyteusAudioModelProvider.lastHostsKey = hostsKey;

    if (!AutobyteusAudioModelProvider.discoveryPromise) {
      AutobyteusAudioModelProvider.discoveryPromise = AutobyteusAudioModelProvider
        .discoverAndRegister()
        .catch((error) => {
          console.warn(`Autobyteus audio model discovery failed: ${String(error)}`);
        });
    }
    return AutobyteusAudioModelProvider.discoveryPromise;
  }

  static async discoverAndRegister(): Promise<void> {
    const hosts = parseHosts();
    if (hosts.length === 0) {
      console.info('No Autobyteus server hosts configured. Skipping Autobyteus audio model discovery.');
      return;
    }

    let totalRegistered = 0;

    for (const hostUrl of hosts) {
      const startTime = Date.now();
      if (!isValidUrl(hostUrl)) {
        console.error(`Invalid Autobyteus host URL for audio model discovery: ${hostUrl}, skipping.`);
        continue;
      }

      const client = new AutobyteusClient(hostUrl);
      try {
        const response = await client.getAvailableAudioModelsSync();
        const models = isRecord(response) ? response.models : null;

        if (!Array.isArray(models) || models.length === 0) {
          console.info(`No audio models found on host ${hostUrl}.`);
          continue;
        }

        let hostRegistered = 0;
        let skippedMalformed = 0;
        let skippedMissingSchema = 0;
        let skippedUnknownProvider = 0;
        const registeredIdentifiers: string[] = [];
        for (const modelInfo of models) {
          if (!isRecord(modelInfo)) {
            console.warn(`Skipping malformed audio model from ${hostUrl}: ${JSON.stringify(modelInfo)}`);
            skippedMalformed += 1;
            continue;
          }

          const name = typeof modelInfo.name === 'string' ? modelInfo.name : null;
          const value = typeof modelInfo.value === 'string' ? modelInfo.value : null;
          const providerValue = typeof modelInfo.provider === 'string' ? modelInfo.provider : null;

          if (!name || !value || !providerValue) {
            console.warn(`Skipping malformed audio model from ${hostUrl}: ${JSON.stringify(modelInfo)}`);
            skippedMalformed += 1;
            continue;
          }

          if (!('parameter_schema' in modelInfo)) {
            console.debug(
              `Skipping model from ${hostUrl} as it lacks a parameter schema: ${name}`
            );
            skippedMissingSchema += 1;
            continue;
          }

          const provider = resolveProvider(providerValue);
          if (!provider) {
            console.error(`Cannot register audio model '${name}' with unknown provider '${providerValue}'.`);
            skippedUnknownProvider += 1;
            continue;
          }

          const audioModel = new AudioModel({
            name,
            value,
            provider,
            clientClass: AutobyteusAudioClient,
            runtime: MultimediaRuntime.AUTOBYTEUS,
            hostUrl: hostUrl,
            parameterSchema: modelInfo.parameter_schema as Record<string, unknown>
          });

          AudioClientFactory.registerModel(audioModel);
          hostRegistered += 1;
          registeredIdentifiers.push(audioModel.modelIdentifier);
        }

        if (hostRegistered > 0) {
          console.info(`Registered ${hostRegistered} audio models from Autobyteus host ${hostUrl}.`);
          console.info(`Autobyteus audio models from ${hostUrl}: ${registeredIdentifiers.join(', ')}`);
        }
        console.info(
          `Autobyteus audio discovery summary for ${hostUrl}: total=${models.length}, ` +
          `registered=${hostRegistered}, skippedMalformed=${skippedMalformed}, ` +
          `skippedMissingSchema=${skippedMissingSchema}, skippedUnknownProvider=${skippedUnknownProvider}, ` +
          `durationMs=${Date.now() - startTime}`
        );
        totalRegistered += hostRegistered;
      } catch (error) {
        console.warn(`Could not fetch audio models from Autobyteus server at ${hostUrl}: ${String(error)}`);
      } finally {
        await client.close();
      }
    }

    if (totalRegistered > 0) {
      console.info(`Finished Autobyteus audio model discovery. Total models registered: ${totalRegistered}`);
    }
  }
}
