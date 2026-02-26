import { AutobyteusClient } from '../clients/autobyteus-client.js';
import { LLMConfig } from './utils/llm-config.js';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { AutobyteusLLM } from './api/autobyteus-llm.js';

type ModelInfoPayload = Record<string, unknown>;
type ServerResponse = { models?: unknown };

export class AutobyteusModelProvider {
  static readonly DEFAULT_SERVER_URL = 'https://localhost:8000';

  static getHosts(): string[] {
    const hostsStr = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
    if (hostsStr) {
      return hostsStr.split(',').map((host) => host.trim()).filter(Boolean);
    }

    return [];
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return Boolean(parsed.protocol && parsed.host);
    } catch {
      return false;
    }
  }

  static async getModels(): Promise<LLMModel[]> {
    const hosts = AutobyteusModelProvider.getHosts();
    if (!hosts.length) {
      console.info('No Autobyteus LLM server hosts configured. Skipping discovery.');
      return [];
    }

    const allModels: LLMModel[] = [];

    for (const hostUrl of hosts) {
      if (!AutobyteusModelProvider.isValidUrl(hostUrl)) {
        console.error(`Invalid Autobyteus host URL: ${hostUrl}, skipping.`);
        continue;
      }

      console.info(`Discovering Autobyteus models from host: ${hostUrl}`);
      let client: AutobyteusClient | null = null;

      try {
        client = new AutobyteusClient(hostUrl);
        const response = await client.getAvailableLlmModelsSync();

        if (!AutobyteusModelProvider.validateServerResponse(response)) {
          continue;
        }

        const responseRecord = response as ServerResponse;
        const models = Array.isArray(responseRecord.models)
          ? (responseRecord.models as ModelInfoPayload[])
          : [];
        for (const modelInfo of models) {
          const validation = AutobyteusModelProvider.validateModelInfo(modelInfo);
          if (!validation.valid) {
            console.warn(validation.message);
            continue;
          }

          const configData = modelInfo.config;
          if (!configData || typeof configData !== 'object' || Array.isArray(configData)) {
            console.warn('Config must be a dictionary');
            continue;
          }
          const llmConfig = AutobyteusModelProvider.parseLLMConfig(configData as Record<string, unknown>);
          if (!llmConfig) {
            continue;
          }

          try {
            const provider = AutobyteusModelProvider.parseProvider(String(modelInfo.provider));
            const llmModel = new LLMModel({
              name: String(modelInfo.name),
              value: String(modelInfo.value),
              provider,
              llmClass: AutobyteusLLM,
              canonicalName: (modelInfo.canonical_name as string | undefined) ?? String(modelInfo.name),
              runtime: LLMRuntime.AUTOBYTEUS,
              hostUrl: hostUrl,
              defaultConfig: llmConfig
            });
            allModels.push(llmModel);
          } catch (error: any) {
            console.error(
              `Failed to create LLMModel for '${modelInfo?.name ?? 'unknown'}' from ${hostUrl}: ${error?.message ?? error}`
            );
          }
        }
      } catch (error: any) {
        console.warn(`Could not connect or fetch models from Autobyteus server at ${hostUrl}: ${error?.message ?? error}`);
      } finally {
        if (client) {
          await client.close();
        }
      }
    }

    return allModels;
  }

  static async discoverAndRegister(): Promise<number> {
    try {
      const { LLMFactory } = await import('./llm-factory.js');
      const discoveredModels = await AutobyteusModelProvider.getModels();
      let registeredCount = 0;

      for (const model of discoveredModels) {
        try {
          LLMFactory.registerModel(model);
          registeredCount += 1;
        } catch (error: any) {
          console.warn(`Failed to register Autobyteus model '${model.name}': ${error?.message ?? error}`);
        }
      }

      if (registeredCount > 0) {
        console.info(`Finished Autobyteus discovery. Total models registered: ${registeredCount}`);
      }

      return registeredCount;
    } catch (error: any) {
      console.error(`Unexpected error during Autobyteus model discovery: ${error?.message ?? error}`);
      return 0;
    }
  }

  private static validateServerResponse(response: unknown): boolean {
    if (typeof response !== 'object' || response === null) {
      console.error('Invalid server response format');
      return false;
    }

    if (!('models' in (response as ServerResponse))) {
      console.error("Missing 'models' field in response");
      return false;
    }

    if (!Array.isArray((response as ServerResponse).models)) {
      console.error("Models field must be a list");
      return false;
    }

    return true;
  }

  private static validateModelInfo(modelInfo: ModelInfoPayload): { valid: boolean; message: string } {
    const requiredFields = ['name', 'value', 'provider', 'config'];
    for (const field of requiredFields) {
      if (!(field in modelInfo)) {
        return { valid: false, message: `Missing required field '${field}' in model info` };
      }
      if (!modelInfo[field]) {
        return { valid: false, message: `Empty value for required field '${field}'` };
      }
    }

    const providerValue = String(modelInfo.provider ?? '');
    if (!AutobyteusModelProvider.isProviderValue(providerValue)) {
      return { valid: false, message: `Invalid provider '${providerValue}'` };
    }

    if (typeof modelInfo.config !== 'object' || modelInfo.config === null || Array.isArray(modelInfo.config)) {
      return { valid: false, message: 'Config must be a dictionary' };
    }

    return { valid: true, message: '' };
  }

  private static parseLLMConfig(configData: Record<string, unknown>): LLMConfig | null {
    try {
      const pricingData = (configData as { pricing_config?: Record<string, unknown> }).pricing_config ?? {};
      if (!AutobyteusModelProvider.validatePricingConfig(pricingData)) {
        throw new Error('Invalid pricing configuration');
      }

      const llmConfig = LLMConfig.fromDict(configData);

      if (!llmConfig.tokenLimit || llmConfig.tokenLimit < 1) {
        console.warn('Setting default token limit (8192)');
        llmConfig.tokenLimit = 8192;
      }

      if (llmConfig.temperature < 0 || llmConfig.temperature > 2) {
        console.warn('Temperature out of range, resetting to 0.7');
        llmConfig.temperature = 0.7;
      }

      return llmConfig;
    } catch (error: unknown) {
      console.error(`Config parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private static validatePricingConfig(pricingData: Record<string, unknown>): boolean {
    const requiredKeys = ['input_token_pricing', 'output_token_pricing'];

    for (const key of requiredKeys) {
      if (!(key in pricingData)) {
        console.error(`Missing pricing key: ${key}`);
        return false;
      }
      const value = pricingData[key];
      if (typeof value !== 'number') {
        console.error(`Invalid pricing type for ${key}`);
        return false;
      }
      if (value < 0) {
        console.error(`Negative pricing for ${key}`);
        return false;
      }
    }

    return true;
  }

  private static isProviderValue(provider: string): boolean {
    return Object.values(LLMProvider).includes(provider as LLMProvider);
  }

  private static parseProvider(provider: string): LLMProvider {
    if (!AutobyteusModelProvider.isProviderValue(provider)) {
      throw new Error(`Invalid provider '${provider}'`);
    }
    return provider as LLMProvider;
  }
}
