import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  ModelMetadataResolver,
  type ProviderModelMetadataProvider,
  type ProviderModelMetadataStrategies,
  type ProviderModelMetadataStrategy,
} from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';
import { AnthropicModelMetadataProvider } from 'autobyteus-ts/llm/metadata/anthropic-model-metadata-provider.js';
import { GeminiDeveloperApiModelMetadataProvider } from 'autobyteus-ts/llm/metadata/gemini-developer-api-model-metadata-provider.js';
import { KimiModelMetadataProvider } from 'autobyteus-ts/llm/metadata/kimi-model-metadata-provider.js';
import { MistralModelMetadataProvider } from 'autobyteus-ts/llm/metadata/mistral-model-metadata-provider.js';
import type { ProviderApiKeyResolver } from 'autobyteus-ts';
import { createLlmMetadataProviderApiKeyResolver } from '../../secret-management/resolution/secret-management-provider-api-key-resolver.js';
import { getGeminiConfigurationService } from './gemini-configuration-service.js';

/** Resolves metadata credentials only at the server-owned enrichment boundary. */
export class ModelMetadataProvisioningService {
  private cachedResolver: Promise<ModelMetadataResolver> | null = null;

  constructor(
    private readonly metadataApiKeys: ProviderApiKeyResolver =
      createLlmMetadataProviderApiKeyResolver(),
  ) {}

  async enrichBestEffort(models: ModelInfo[]): Promise<ModelInfo[]> {
    try {
      const resolver = await this.resolver();
      return await Promise.all(models.map(async (model) => {
        const metadata = await resolver.resolve({
          provider: model.provider_type,
          name: model.display_name,
          value: model.value,
          canonicalName: model.canonical_name,
        });
        return {
          ...model,
          max_context_tokens: metadata.maxContextTokens,
          active_context_tokens: metadata.activeContextTokens,
          max_input_tokens: metadata.maxInputTokens,
          max_output_tokens: metadata.maxOutputTokens,
          metadata_provenance: metadata.provenance,
        };
      }));
    } catch {
      return models;
    }
  }

  invalidate(): void {
    this.cachedResolver = null;
  }

  private resolver(): Promise<ModelMetadataResolver> {
    this.cachedResolver ??= this.buildStrategies().then(
      (strategies) => new ModelMetadataResolver(strategies),
    );
    return this.cachedResolver;
  }

  private async buildStrategies(): Promise<ProviderModelMetadataStrategies> {
    const strategies: ProviderModelMetadataStrategies = {};
    strategies[LLMProvider.ANTHROPIC] = await this.createLiveStrategy(
      LLMProvider.ANTHROPIC,
      (apiKey) => new AnthropicModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.MISTRAL] = await this.createLiveStrategy(
      LLMProvider.MISTRAL,
      (apiKey) => new MistralModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.KIMI] = await this.createLiveStrategy(
      LLMProvider.KIMI,
      (apiKey) => new KimiModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.GEMINI] = await this.createGeminiStrategy();
    return strategies;
  }

  private async createGeminiStrategy(): Promise<ProviderModelMetadataStrategy> {
    const setup = await getGeminiConfigurationService().getSetupStatus();
    if (setup.selection.kind !== 'aiStudio') {
      return { kind: 'CURATED_ONLY' };
    }
    return this.createLiveStrategy(
      LLMProvider.GEMINI,
      (apiKey) => new GeminiDeveloperApiModelMetadataProvider(apiKey),
      'geminiAiStudioApiKey',
    );
  }

  private async createLiveStrategy(
    providerId: LLMProvider,
    create: (apiKey: string) => ProviderModelMetadataProvider,
    credentialSlot: 'apiKey' | 'geminiAiStudioApiKey' = 'apiKey',
  ): Promise<ProviderModelMetadataStrategy> {
    try {
      const value = await this.metadataApiKeys.resolve(providerId, credentialSlot);
      return {
        kind: 'LIVE_WITH_CURATED_FALLBACK',
        provider: create(value.revealToTrustedConsumer()),
      };
    } catch {
      return { kind: 'LIVE_WITH_CURATED_FALLBACK', provider: null };
    }
  }
}

let singleton: ModelMetadataProvisioningService | null = null;
export const getModelMetadataProvisioningService = (): ModelMetadataProvisioningService => {
  singleton ??= new ModelMetadataProvisioningService();
  return singleton;
};
