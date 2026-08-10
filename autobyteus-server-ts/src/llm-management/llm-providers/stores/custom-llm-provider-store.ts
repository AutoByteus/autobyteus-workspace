import path from 'node:path';
import {
  buildCustomProviderId,
  DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
  normalizeProviderName,
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

export class CustomLlmProviderStoreError extends Error {
  constructor(readonly code:
    | 'CUSTOM_PROVIDER_CONFIG_INVALID'
    | 'CUSTOM_PROVIDER_NAME_INVALID'
    | 'CUSTOM_PROVIDER_NAME_CONFLICT'
    | 'CUSTOM_PROVIDER_ID_CONFLICT') {
    super(code);
    this.name = 'CustomLlmProviderStoreError';
  }

  toJSON(): { code: CustomLlmProviderStoreError['code'] } {
    return { code: this.code };
  }
}

const parseCurrentConfig = (value: unknown): CustomLlmProviderConfigFile => {
  try {
    return parseCustomLlmProviderConfigFile(value);
  } catch {
    throw new CustomLlmProviderStoreError('CUSTOM_PROVIDER_CONFIG_INVALID');
  }
};

export class CustomLlmProviderStore {
  constructor(
    private readonly appDataDir: string = appConfigProvider.config.getAppDataDir(),
  ) {}

  private getFilePath(): string {
    return path.join(
      this.appDataDir,
      'llm',
      'custom-llm-providers.json',
    );
  }

  async listProviders(): Promise<CustomLlmProviderRecord[]> {
    const rawFile = await readJsonFile<unknown>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
    );
    return sortProviders(parseCurrentConfig(rawFile).providers);
  }

  async getProviderById(providerId: string): Promise<CustomLlmProviderRecord | null> {
    const providers = await this.listProviders();
    return providers.find((provider) => provider.id === providerId) ?? null;
  }

  async createProvider(input: {
    name: string;
    providerType: LLMProvider.OPENAI_COMPATIBLE;
    baseUrl: string;
  }): Promise<CustomLlmProviderRecord> {
    let committedRecord: CustomLlmProviderRecord | null = null;

    await updateJsonFile<unknown>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
      (existing) => {
        const parsed = parseCurrentConfig(existing);
        const displayName = input.name.normalize('NFKC').trim().replace(/\s+/gu, ' ');
        let providerId: string;
        try {
          providerId = buildCustomProviderId(displayName);
        } catch {
          throw new CustomLlmProviderStoreError('CUSTOM_PROVIDER_NAME_INVALID');
        }
        const canonicalName = normalizeProviderName(displayName);
        if (parsed.providers.some(
          (provider) => normalizeProviderName(provider.name) === canonicalName,
        )) {
          throw new CustomLlmProviderStoreError('CUSTOM_PROVIDER_NAME_CONFLICT');
        }
        if (parsed.providers.some((provider) => provider.id === providerId)) {
          throw new CustomLlmProviderStoreError('CUSTOM_PROVIDER_ID_CONFLICT');
        }
        const nextRecord: CustomLlmProviderRecord = {
          id: providerId,
          name: displayName,
          providerType: input.providerType,
          baseUrl: input.baseUrl,
        };
        committedRecord = nextRecord;
        return {
          version: 3,
          providers: sortProviders([...parsed.providers, nextRecord]),
        };
      },
    );

    if (!committedRecord) {
      throw new CustomLlmProviderStoreError('CUSTOM_PROVIDER_CONFIG_INVALID');
    }
    return committedRecord;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await updateJsonFile<unknown>(
      this.getFilePath(),
      DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE,
      (existing) => {
        const parsed = parseCurrentConfig(existing);
        return {
          version: 3,
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
