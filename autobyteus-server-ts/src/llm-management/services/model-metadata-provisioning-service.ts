import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  ModelMetadataResolver,
  type ProviderModelMetadataProvider,
} from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';
import { AnthropicModelMetadataProvider } from 'autobyteus-ts/llm/metadata/anthropic-model-metadata-provider.js';
import { GeminiModelMetadataProvider } from 'autobyteus-ts/llm/metadata/gemini-model-metadata-provider.js';
import { KimiModelMetadataProvider } from 'autobyteus-ts/llm/metadata/kimi-model-metadata-provider.js';
import { MistralModelMetadataProvider } from 'autobyteus-ts/llm/metadata/mistral-model-metadata-provider.js';
import { appConfigProvider } from '../../config/app-config-provider.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';

type MetadataProviders = Partial<Record<LLMProvider, ProviderModelMetadataProvider>>;

/** Resolves metadata credentials only at the server-owned enrichment boundary. */
export class ModelMetadataProvisioningService {
  private cachedProviders: Promise<MetadataProviders> | null = null;

  async enrich(models: ModelInfo[]): Promise<ModelInfo[]> {
    const resolver = new ModelMetadataResolver(await this.providers());
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
      };
    }));
  }

  invalidate(): void {
    this.cachedProviders = null;
  }

  private providers(): Promise<MetadataProviders> {
    this.cachedProviders ??= this.buildProviders();
    return this.cachedProviders;
  }

  private async buildProviders(): Promise<MetadataProviders> {
    const providers: MetadataProviders = {};
    await this.addApiKeyProvider(providers, LLMProvider.ANTHROPIC,
      (apiKey) => new AnthropicModelMetadataProvider(apiKey));
    await this.addApiKeyProvider(providers, LLMProvider.MISTRAL,
      (apiKey) => new MistralModelMetadataProvider(apiKey));
    await this.addApiKeyProvider(providers, LLMProvider.KIMI,
      (apiKey) => new KimiModelMetadataProvider(apiKey));

    const geminiMode = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
    if (geminiMode === 'AI_STUDIO' || geminiMode === 'VERTEX_EXPRESS') {
      const credentialSlot = geminiMode === 'AI_STUDIO'
        ? 'geminiAiStudioApiKey'
        : 'geminiVertexExpressApiKey';
      await this.addApiKeyProvider(providers, LLMProvider.GEMINI,
        (apiKey) => new GeminiModelMetadataProvider(apiKey), credentialSlot);
    }
    return providers;
  }

  private async addApiKeyProvider(
    providers: MetadataProviders,
    providerId: LLMProvider,
    create: (apiKey: string) => ProviderModelMetadataProvider,
    credentialSlot: 'apiKey' | 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey' = 'apiKey',
  ): Promise<void> {
    const consumer: SecretConsumerIdentity = {
      kind: 'llmMetadata',
      providerId,
      credentialSlot,
    };
    try {
      const value = await getSecretStorageConfigurationService()
        .requireManagementService()
        .resolveForUse(consumer);
      providers[providerId] = create(value.revealToTrustedConsumer());
    } catch {
      // Curated metadata remains available when live enrichment is not configured.
    }
  }
}

let singleton: ModelMetadataProvisioningService | null = null;
export const getModelMetadataProvisioningService = (): ModelMetadataProvisioningService => {
  singleton ??= new ModelMetadataProvisioningService();
  return singleton;
};
