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
import { appConfigProvider } from '../../config/app-config-provider.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';

/** Resolves metadata credentials only at the server-owned enrichment boundary. */
export class ModelMetadataProvisioningService {
  private cachedResolver: Promise<ModelMetadataResolver> | null = null;

  async enrich(models: ModelInfo[]): Promise<ModelInfo[]> {
    const resolver = await this.resolver();
    return Promise.all(models.map(async (model) => {
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
    const mode = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
    switch (mode) {
      case 'AI_STUDIO':
        return this.createLiveStrategy(
          LLMProvider.GEMINI,
          (apiKey) => new GeminiDeveloperApiModelMetadataProvider(apiKey),
          'geminiAiStudioApiKey',
        );
      case 'VERTEX_EXPRESS':
      case 'VERTEX_PROJECT':
        return { kind: 'CURATED_ONLY' };
      default:
        throw new Error('GEMINI_SETUP_MODE_INVALID');
    }
  }

  private async createLiveStrategy(
    providerId: LLMProvider,
    create: (apiKey: string) => ProviderModelMetadataProvider,
    credentialSlot: 'apiKey' | 'geminiAiStudioApiKey' = 'apiKey',
  ): Promise<ProviderModelMetadataStrategy> {
    const consumer: SecretConsumerIdentity = {
      kind: 'llmMetadata',
      providerId,
      credentialSlot,
    };
    try {
      const value = await getSecretStorageConfigurationService()
        .requireManagementService()
        .resolveForUse(consumer);
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
