import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import {
  DEFAULT_RUNTIME_KIND,
  normalizeRuntimeKind,
  type RuntimeKind,
} from "../runtime-kind.js";
import { registerDefaultRuntimeModelProviders } from "./runtime-model-catalog-defaults.js";
import type { RuntimeModelProvider } from "./runtime-model-provider.js";

export class RuntimeModelCatalogService {
  private providers = new Map<RuntimeKind, RuntimeModelProvider>();

  constructor(providers?: RuntimeModelProvider[]) {
    for (const provider of providers ?? []) {
      this.registerRuntimeModelProvider(provider);
    }
  }

  registerRuntimeModelProvider(provider: RuntimeModelProvider): void {
    this.providers.set(provider.runtimeKind, provider);
  }

  hasRuntimeModelProvider(runtimeKind: RuntimeKind): boolean {
    return this.providers.has(runtimeKind);
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
    registerDefaultRuntimeModelProviders(cachedRuntimeModelCatalogService);
  }
  return cachedRuntimeModelCatalogService;
};
