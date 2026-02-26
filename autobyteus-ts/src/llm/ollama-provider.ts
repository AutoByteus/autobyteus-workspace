import { Ollama } from 'ollama';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { OllamaProviderResolver } from './ollama-provider-resolver.js';
import { OllamaLLM } from './api/ollama-llm.js';

export class OllamaModelProvider {
  static readonly DEFAULT_OLLAMA_HOST = 'http://localhost:11434';

  static getHosts(): string[] {
    const hostsStr = process.env.OLLAMA_HOSTS;
    if (hostsStr) {
      return hostsStr.split(',').map((host) => host.trim()).filter(Boolean);
    }

    return [OllamaModelProvider.DEFAULT_OLLAMA_HOST];
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
    const hosts = OllamaModelProvider.getHosts();
    const allModels: LLMModel[] = [];

    for (const hostUrl of hosts) {
      if (!OllamaModelProvider.isValidUrl(hostUrl)) {
        console.error(`Invalid Ollama host URL provided: '${hostUrl}', skipping.`);
        continue;
      }

      console.info(`Discovering Ollama models from host: ${hostUrl}`);
      const client = new Ollama({ host: hostUrl });

      let models: Array<{ model?: string }> = [];
      try {
        const response: any = await client.list();
        models = response?.models ?? [];
      } catch (error: any) {
        console.warn(`Could not connect to Ollama server at ${hostUrl}. Ensure it's running.`, error?.message ?? error);
        continue;
      }

      for (const modelInfo of models) {
        const modelName = modelInfo?.model;
        if (!modelName) continue;

        try {
          const provider = OllamaProviderResolver.resolve(modelName);
          const llmModel = new LLMModel({
            name: modelName,
            value: modelName,
            provider,
            llmClass: OllamaLLM,
            canonicalName: modelName,
            runtime: LLMRuntime.OLLAMA,
            hostUrl: hostUrl,
            defaultConfig: new LLMConfig({
              pricingConfig: new TokenPricingConfig({ inputTokenPricing: 0.0, outputTokenPricing: 0.0 })
            })
          });
          allModels.push(llmModel);
        } catch (error: any) {
          console.warn(`Failed to create LLMModel for '${modelName}' from host ${hostUrl}: ${error?.message ?? error}`);
        }
      }
    }

    return allModels;
  }

  static async discoverAndRegister(): Promise<number> {
    try {
      const { LLMFactory } = await import('./llm-factory.js');
      const discoveredModels = await OllamaModelProvider.getModels();
      let registeredCount = 0;

      for (const model of discoveredModels) {
        try {
          LLMFactory.registerModel(model);
          registeredCount += 1;
        } catch (error: any) {
          console.warn(`Failed to register Ollama model '${model.name}': ${error?.message ?? error}`);
        }
      }

      if (registeredCount > 0) {
        console.info(`Finished Ollama discovery. Total models registered: ${registeredCount}`);
      }

      return registeredCount;
    } catch (error: any) {
      console.error(`Unexpected error during Ollama model discovery: ${error?.message ?? error}`);
      return 0;
    }
  }
}
