import { Ollama } from 'ollama';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig, TokenPricingConfig } from './utils/llm-config.js';
import { OllamaLLM } from './api/ollama-llm.js';

type OllamaListModel = {
  model?: string;
};

type OllamaShowResponse = {
  parameters?: string | null;
  model_info?: Record<string, unknown> | null;
};

type OllamaRunningModel = {
  model?: string;
  context_length?: number | null;
  details?: {
    context_length?: number | null;
  } | null;
};

type OllamaRunningModelsResponse = {
  models?: OllamaRunningModel[] | null;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const parseConfiguredNumCtx = (parameters: string | null | undefined): number | null => {
  if (!parameters) {
    return null;
  }

  const match = parameters.match(/(?:^|\n)\s*num_ctx\s+(\d+)\b/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractSupportedContextLength = (modelInfo: Record<string, unknown> | null | undefined): number | null => {
  if (!modelInfo) {
    return null;
  }

  for (const [key, value] of Object.entries(modelInfo)) {
    if (key.endsWith('.context_length') && isPositiveInteger(value)) {
      return value;
    }
  }

  return null;
};

const extractRunningContextLength = (runningModel: OllamaRunningModel | undefined): number | null => {
  if (!runningModel) {
    return null;
  }

  if (isPositiveInteger(runningModel.context_length)) {
    return runningModel.context_length;
  }

  if (isPositiveInteger(runningModel.details?.context_length)) {
    return runningModel.details.context_length;
  }

  return null;
};

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

  private static async fetchModelDetails(hostUrl: string, modelName: string): Promise<OllamaShowResponse> {
    const response = await fetch(`${hostUrl.replace(/\/+$/, '')}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName })
    });

    if (!response.ok) {
      throw new Error(`Ollama show failed with status ${response.status}`);
    }

    return (await response.json()) as OllamaShowResponse;
  }

  private static async fetchRunningModels(hostUrl: string): Promise<Map<string, OllamaRunningModel>> {
    const response = await fetch(`${hostUrl.replace(/\/+$/, '')}/api/ps`);
    if (!response.ok) {
      throw new Error(`Ollama ps failed with status ${response.status}`);
    }

    const payload = (await response.json()) as OllamaRunningModelsResponse;
    const runningModels = new Map<string, OllamaRunningModel>();
    for (const model of payload.models ?? []) {
      if (typeof model?.model === 'string' && model.model.trim().length > 0) {
        runningModels.set(model.model, model);
      }
    }
    return runningModels;
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

      let models: OllamaListModel[] = [];
      try {
        const response: any = await client.list();
        models = response?.models ?? [];
      } catch (error: any) {
        console.warn(`Could not connect to Ollama server at ${hostUrl}. Ensure it's running.`, error?.message ?? error);
        continue;
      }

      let runningModels = new Map<string, OllamaRunningModel>();
      try {
        runningModels = await OllamaModelProvider.fetchRunningModels(hostUrl);
      } catch (error: any) {
        console.warn(`Could not read running Ollama models from ${hostUrl}.`, error?.message ?? error);
      }

      for (const modelInfo of models) {
        const modelName = modelInfo?.model;
        if (!modelName) continue;

        let modelDetails: OllamaShowResponse | null = null;
        try {
          modelDetails = await OllamaModelProvider.fetchModelDetails(hostUrl, modelName);
        } catch (error: any) {
          console.warn(`Failed to fetch Ollama model details for '${modelName}' from ${hostUrl}: ${error?.message ?? error}`);
        }

        const maxContextTokens = extractSupportedContextLength(modelDetails?.model_info);
        const activeContextTokens =
          extractRunningContextLength(runningModels.get(modelName)) ??
          parseConfiguredNumCtx(modelDetails?.parameters);

        try {
          const llmModel = new LLMModel({
            name: modelName,
            value: modelName,
            provider: LLMProvider.OLLAMA,
            llmClass: OllamaLLM,
            canonicalName: modelName,
            runtime: LLMRuntime.OLLAMA,
            hostUrl: hostUrl,
            defaultConfig: new LLMConfig({
              pricingConfig: new TokenPricingConfig({ inputTokenPricing: 0.0, outputTokenPricing: 0.0 })
            }),
            maxContextTokens,
            activeContextTokens
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
