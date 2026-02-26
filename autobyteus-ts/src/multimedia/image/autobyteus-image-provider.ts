import { AutobyteusClient } from '../../clients/autobyteus-client.js';
import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { ImageModel } from './image-model.js';
import { AutobyteusImageClient } from './api/autobyteus-image-client.js';
import { ImageClientFactory } from './image-client-factory.js';

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

export class AutobyteusImageModelProvider {
  private static discoveryPromise: Promise<void> | null = null;
  private static lastHostsKey: string | null = null;

  static resetDiscovery(): void {
    AutobyteusImageModelProvider.discoveryPromise = null;
    AutobyteusImageModelProvider.lastHostsKey = null;
  }

  static async ensureDiscovered(): Promise<void> {
    const hostsKey = parseHosts().join(',');
    if (!hostsKey) {
      if (AutobyteusImageModelProvider.lastHostsKey !== '') {
        console.info('No Autobyteus server hosts configured. Skipping Autobyteus image model discovery.');
      }
      AutobyteusImageModelProvider.lastHostsKey = '';
      AutobyteusImageModelProvider.discoveryPromise = null;
      return;
    }

    if (
      AutobyteusImageModelProvider.lastHostsKey &&
      AutobyteusImageModelProvider.lastHostsKey !== hostsKey
    ) {
      AutobyteusImageModelProvider.discoveryPromise = null;
    }

    AutobyteusImageModelProvider.lastHostsKey = hostsKey;

    if (!AutobyteusImageModelProvider.discoveryPromise) {
      AutobyteusImageModelProvider.discoveryPromise = AutobyteusImageModelProvider
        .discoverAndRegister()
        .catch((error) => {
          console.warn(`Autobyteus image model discovery failed: ${String(error)}`);
        });
    }
    return AutobyteusImageModelProvider.discoveryPromise;
  }

  static async discoverAndRegister(): Promise<void> {
    const hosts = parseHosts();
    if (hosts.length === 0) {
      console.info('No Autobyteus server hosts configured. Skipping Autobyteus image model discovery.');
      return;
    }

    let totalRegistered = 0;

    for (const hostUrl of hosts) {
      const startTime = Date.now();
      if (!isValidUrl(hostUrl)) {
        console.error(`Invalid Autobyteus host URL for image model discovery: ${hostUrl}, skipping.`);
        continue;
      }

      const client = new AutobyteusClient(hostUrl);
      try {
        const response = await client.getAvailableImageModelsSync();
        const models = isRecord(response) ? response.models : null;

        if (!Array.isArray(models) || models.length === 0) {
          console.info(`No image models found on host ${hostUrl}.`);
          continue;
        }

        let hostRegistered = 0;
        let skippedMalformed = 0;
        let skippedMissingSchema = 0;
        let skippedUnknownProvider = 0;
        const registeredIdentifiers: string[] = [];
        for (const modelInfo of models) {
          if (!isRecord(modelInfo)) {
            console.warn(`Skipping malformed image model from ${hostUrl}: ${JSON.stringify(modelInfo)}`);
            skippedMalformed += 1;
            continue;
          }

          const name = typeof modelInfo.name === 'string' ? modelInfo.name : null;
          const value = typeof modelInfo.value === 'string' ? modelInfo.value : null;
          const providerValue = typeof modelInfo.provider === 'string' ? modelInfo.provider : null;

          if (!name || !value || !providerValue) {
            console.warn(`Skipping malformed image model from ${hostUrl}: ${JSON.stringify(modelInfo)}`);
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
            console.error(`Cannot register image model '${name}' with unknown provider '${providerValue}'.`);
            skippedUnknownProvider += 1;
            continue;
          }

          const imageModel = new ImageModel({
            name,
            value,
            provider,
            clientClass: AutobyteusImageClient,
            runtime: MultimediaRuntime.AUTOBYTEUS,
            hostUrl: hostUrl,
            parameterSchema: modelInfo.parameter_schema as Record<string, unknown>
          });

          ImageClientFactory.registerModel(imageModel);
          hostRegistered += 1;
          registeredIdentifiers.push(imageModel.modelIdentifier);
        }

        if (hostRegistered > 0) {
          console.info(`Registered ${hostRegistered} image models from Autobyteus host ${hostUrl}.`);
          console.info(`Autobyteus image models from ${hostUrl}: ${registeredIdentifiers.join(', ')}`);
        }
        console.info(
          `Autobyteus image discovery summary for ${hostUrl}: total=${models.length}, ` +
          `registered=${hostRegistered}, skippedMalformed=${skippedMalformed}, ` +
          `skippedMissingSchema=${skippedMissingSchema}, skippedUnknownProvider=${skippedUnknownProvider}, ` +
          `durationMs=${Date.now() - startTime}`
        );
        totalRegistered += hostRegistered;
      } catch (error) {
        console.warn(`Could not fetch image models from Autobyteus server at ${hostUrl}: ${String(error)}`);
      } finally {
        await client.close();
      }
    }

    if (totalRegistered > 0) {
      console.info(`Finished Autobyteus image model discovery. Total models registered: ${totalRegistered}`);
    }
  }
}
