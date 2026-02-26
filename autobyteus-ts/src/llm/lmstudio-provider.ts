import { OpenAI } from 'openai';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { LMStudioLLM } from './api/lmstudio-llm.js';

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

  static async getModels(): Promise<LLMModel[]> {
    const hosts = LMStudioModelProvider.getHosts();
    const allModels: LLMModel[] = [];

    for (const hostUrl of hosts) {
      if (!LMStudioModelProvider.isValidUrl(hostUrl)) {
        console.error(`Invalid LM Studio host URL: ${hostUrl}, skipping.`);
        continue;
      }

      console.log(`Discovering LM Studio models from host: ${hostUrl}`);
      const baseUrl = `${hostUrl.replace(/\/+$/, '')}/v1`;
      const client = new OpenAI({ baseURL: baseUrl, apiKey: 'lm-studio' });

      let models: Array<{ id?: string }> = [];
      try {
        const response: any = await client.models.list();
        models = response?.data ?? [];
      } catch (error: any) {
        console.warn(`Could not connect to LM Studio at ${hostUrl}. Ensure the server is running.`, error?.message ?? error);
        continue;
      }

      for (const modelInfo of models) {
        const modelId = modelInfo?.id;
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
            })
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
