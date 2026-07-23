import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { LMStudioLLM } from './api/lmstudio-llm.js';

type LmstudioLoadedInstance = {
  config?: {
    context_length?: number | null;
  } | null;
};

type LmstudioNativeModel = {
  key?: string;
  max_context_length?: number | null;
  loaded_instances?: LmstudioLoadedInstance[] | null;
};

type LmstudioNativeModelResponse = {
  models?: LmstudioNativeModel[] | null;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export class LMStudioModelProvider {
  static readonly DEFAULT_LMSTUDIO_HOST = 'http://localhost:1234';

  static getHosts(): string[] {
    const hostsStr = process.env.LMSTUDIO_HOSTS;
    if (hostsStr) {
      return hostsStr.split(',').map((host) => host.trim()).filter(Boolean);
    }

    return [LMStudioModelProvider.DEFAULT_LMSTUDIO_HOST];
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return Boolean(parsed.protocol && parsed.host);
    } catch {
      return false;
    }
  }

  private static async fetchNativeModels(hostUrl: string): Promise<LmstudioNativeModel[]> {
    const endpoint = `${hostUrl.replace(/\/+$/, '')}/api/v1/models`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`LM Studio native model discovery failed with status ${response.status}`);
    }

    const payload = (await response.json()) as LmstudioNativeModelResponse;
    return Array.isArray(payload.models) ? payload.models : [];
  }

  private static resolveActiveContextTokens(modelInfo: LmstudioNativeModel): number | null {
    const contexts = (modelInfo.loaded_instances ?? [])
      .map((instance) => instance?.config?.context_length ?? null)
      .filter(isPositiveInteger);

    if (!contexts.length) {
      return null;
    }

    return contexts.every((value) => value === contexts[0]) ? contexts[0]! : null;
  }

  static async getModels(): Promise<LLMModel[]> {
    const hosts = LMStudioModelProvider.getHosts();
    const allModels: LLMModel[] = [];

    for (const hostUrl of hosts) {
      if (!LMStudioModelProvider.isValidUrl(hostUrl)) {
        console.error(`Invalid LM Studio host URL: ${hostUrl}, skipping.`);
        continue;
      }

      console.log(`Discovering LM Studio models from host: ${hostUrl}`);

      let models: LmstudioNativeModel[] = [];
      try {
        models = await LMStudioModelProvider.fetchNativeModels(hostUrl);
      } catch (error: any) {
        console.warn(`Could not connect to LM Studio at ${hostUrl}. Ensure the server is running.`, error?.message ?? error);
        continue;
      }

      for (const modelInfo of models) {
        const modelId = modelInfo?.key;
        if (!modelId) continue;

        try {
          const llmModel = new LLMModel({
            name: modelId,
            value: modelId,
            provider: LLMProvider.LMSTUDIO,
            llmClass: LMStudioLLM,
            canonicalName: modelId,
            runtime: LLMRuntime.LMSTUDIO,
            hostUrl: hostUrl,
            defaultConfig: new LLMConfig({
              pricingConfig: new TokenPricingConfig({ inputTokenPricing: 0.0, outputTokenPricing: 0.0 })
            }),
            maxContextTokens: isPositiveInteger(modelInfo.max_context_length) ? modelInfo.max_context_length : null,
            activeContextTokens: LMStudioModelProvider.resolveActiveContextTokens(modelInfo)
          });
          allModels.push(llmModel);
        } catch (error: any) {
          console.warn(`Failed to create LLMModel for '${modelId}' from ${hostUrl}: ${error?.message ?? error}`);
        }
      }
    }

    return allModels;
  }

  static async discoverAndRegister(): Promise<number> {
    try {
      const { LLMFactory } = await import('./llm-factory.js');
      const discoveredModels = await LMStudioModelProvider.getModels();
      let registeredCount = 0;

      for (const model of discoveredModels) {
        try {
          LLMFactory.registerModel(model);
          registeredCount += 1;
        } catch (error: any) {
          console.warn(`Failed to register LM Studio model '${model.name}': ${error?.message ?? error}`);
        }
      }

      if (registeredCount > 0) {
        console.log(`Finished LM Studio discovery. Total models registered: ${registeredCount}`);
      }

      return registeredCount;
    } catch (error: any) {
      console.error(`Unexpected error during LM Studio model discovery: ${error?.message ?? error}`);
      return 0;
    }
  }
}
