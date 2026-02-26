import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import {
  DEFAULT_RUNTIME_KIND,
  normalizeRuntimeKind,
  type RuntimeKind,
} from "../runtime-kind.js";
import { AutobyteusRuntimeModelProvider } from "./providers/autobyteus-runtime-model-provider.js";
import { CodexRuntimeModelProvider } from "./providers/codex-runtime-model-provider.js";
import type { RuntimeModelProvider } from "./runtime-model-provider.js";

export class RuntimeModelCatalogService {
  private providers = new Map<RuntimeKind, RuntimeModelProvider>();

  constructor(providers?: RuntimeModelProvider[]) {
    const defaults =
      providers && providers.length > 0
        ? providers
        : [new AutobyteusRuntimeModelProvider(), new CodexRuntimeModelProvider()];

    for (const provider of defaults) {
      this.providers.set(provider.runtimeKind, provider);
    }
  }

  async listLlmModels(runtimeKind?: string | null): Promise<ModelInfo[]> {
    return this.resolveProvider(runtimeKind).listLlmModels();
  }

  async reloadLlmModels(runtimeKind?: string | null): Promise<void> {
    await this.resolveProvider(runtimeKind).reloadLlmModels();
  }

  async reloadLlmModelsForProvider(
    provider: LLMProvider,
    runtimeKind?: string | null,
  ): Promise<number> {
    return this.resolveProvider(runtimeKind).reloadLlmModelsForProvider(provider);
  }

  async listAudioModels(runtimeKind?: string | null): Promise<AudioModel[]> {
    return this.resolveProvider(runtimeKind).listAudioModels();
  }

  async reloadAudioModels(runtimeKind?: string | null): Promise<void> {
    await this.resolveProvider(runtimeKind).reloadAudioModels();
  }

  async listImageModels(runtimeKind?: string | null): Promise<ImageModel[]> {
    return this.resolveProvider(runtimeKind).listImageModels();
  }

  async reloadImageModels(runtimeKind?: string | null): Promise<void> {
    await this.resolveProvider(runtimeKind).reloadImageModels();
  }

  private resolveProvider(runtimeKind?: string | null): RuntimeModelProvider {
    const normalized = normalizeRuntimeKind(runtimeKind, DEFAULT_RUNTIME_KIND);
    const provider = this.providers.get(normalized);
    if (!provider) {
      throw new Error(`Runtime model provider '${normalized}' is not configured.`);
    }
    return provider;
  }
}

let cachedRuntimeModelCatalogService: RuntimeModelCatalogService | null = null;

export const getRuntimeModelCatalogService = (): RuntimeModelCatalogService => {
  if (!cachedRuntimeModelCatalogService) {
    cachedRuntimeModelCatalogService = new RuntimeModelCatalogService();
  }
  return cachedRuntimeModelCatalogService;
};
