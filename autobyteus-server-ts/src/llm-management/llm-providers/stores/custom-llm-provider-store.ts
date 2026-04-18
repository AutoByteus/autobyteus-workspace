import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
  parseCustomLlmProviderConfigFile,
  type CustomLlmProviderConfigFile,
  type CustomLlmProviderRecord,
} from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import { readJsonFile, updateJsonFile } from '../../../persistence/file/store-utils.js';

const sortProviders = (providers: CustomLlmProviderRecord[]): CustomLlmProviderRecord[] =>
  providers
    .slice()
    .sort((left, right) => {
      if (left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      return left.id.localeCompare(right.id);
    });

export class CustomLlmProviderStore {
  private getFilePath(): string {
    return path.join(
      appConfigProvider.config.getAppDataDir(),
      'llm',
      'custom-llm-providers.json',
    );
  }

  async listProviders(): Promise<CustomLlmProviderRecord[]> {
    const rawFile = await readJsonFile<CustomLlmProviderConfigFile>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
    );
    return sortProviders(parseCustomLlmProviderConfigFile(rawFile).providers);
  }

  async getProviderById(providerId: string): Promise<CustomLlmProviderRecord | null> {
    const providers = await this.listProviders();
    return providers.find((provider) => provider.id === providerId) ?? null;
  }

  async createProvider(input: {
    name: string;
    providerType: LLMProvider.OPENAI_COMPATIBLE;
    baseUrl: string;
    apiKey: string;
  }): Promise<CustomLlmProviderRecord> {
    const nextRecord: CustomLlmProviderRecord = {
      id: `provider_${randomUUID().replace(/-/g, '')}`,
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
    };

    await updateJsonFile<CustomLlmProviderConfigFile>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
      (existing) => {
        const parsed = parseCustomLlmProviderConfigFile(existing);
        return {
          version: 1,
          providers: sortProviders([...parsed.providers, nextRecord]),
        };
      },
    );

    return nextRecord;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await updateJsonFile<CustomLlmProviderConfigFile>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
      (existing) => {
        const parsed = parseCustomLlmProviderConfigFile(existing);
        return {
          version: 1,
          providers: sortProviders(parsed.providers.filter((provider) => provider.id !== providerId)),
        };
      },
    );
  }
}

let cachedCustomLlmProviderStore: CustomLlmProviderStore | null = null;

export const getCustomLlmProviderStore = (): CustomLlmProviderStore => {
  if (!cachedCustomLlmProviderStore) {
    cachedCustomLlmProviderStore = new CustomLlmProviderStore();
  }
  return cachedCustomLlmProviderStore;
};
