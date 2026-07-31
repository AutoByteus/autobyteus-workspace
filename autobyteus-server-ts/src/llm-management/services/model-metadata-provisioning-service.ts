import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { UNKNOWN_MULTIMODAL_CAPABILITIES } from 'autobyteus-ts/llm/multimodal-capabilities.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  ModelMetadataResolver,
  type StaticModelMetadata,
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

export type ModelMetadataProvenanceValue = 'LIVE' | 'CURATED_FALLBACK' | 'CURATED_ONLY';
export type EnrichedModelInfo = ModelInfo & { metadata_provenance?: ModelMetadataProvenanceValue | null };

const staticMetadataForModelInfo = (model: ModelInfo): StaticModelMetadata => ({
  maxContextTokens: model.max_context_tokens,
  maxInputTokens: model.max_input_tokens,
  maxOutputTokens: model.max_output_tokens,
  multimodalCapabilities: UNKNOWN_MULTIMODAL_CAPABILITIES,
  provenance: { sourceUrl: '', verifiedAt: '' },
});

/** Resolves metadata credentials only at the server-owned enrichment boundary. */
export class ModelMetadataProvisioningService {
  private cachedResolver: Promise<ModelMetadataResolver> | null = null;
  private readonly fallbackProvenanceByProvider = new Map<LLMProvider, ModelMetadataProvenanceValue>();

  constructor(
    private readonly metadataApiKeys: ProviderApiKeyResolver =
      createLlmMetadataProviderApiKeyResolver(),
  ) {}

  async enrichBestEffort(models: ModelInfo[]): Promise<EnrichedModelInfo[]> {
    try {
      const resolver = await this.resolver();
      return await Promise.all(models.map(async (model) => {
        const metadata = await resolver.resolve({
          provider: model.provider_type,
          name: model.display_name,
          value: model.value,
          canonicalName: model.canonical_name,
        }, staticMetadataForModelInfo(model));
        const hasLiveMetadata = [
          metadata.maxContextTokens,
          metadata.maxInputTokens,
          metadata.maxOutputTokens,
        ].some((field) => field.source === 'live');
        return {
          ...model,
          max_context_tokens: metadata.maxContextTokens.value,
          active_context_tokens: model.active_context_tokens,
          max_input_tokens: metadata.maxInputTokens.value,
          max_output_tokens: metadata.maxOutputTokens.value,
          metadata_provenance: hasLiveMetadata
            ? 'LIVE'
            : this.fallbackProvenanceByProvider.get(model.provider_type) ?? 'CURATED_ONLY',
        };
      }));
    } catch {
      return models;
    }
  }

  invalidate(): void {
    this.cachedResolver = null;
    this.fallbackProvenanceByProvider.clear();
  }

  private resolver(): Promise<ModelMetadataResolver> {
    this.cachedResolver ??= this.buildStrategies().then(
      (strategies) => new ModelMetadataResolver(strategies),
    );
    return this.cachedResolver;
  }

  private async buildStrategies(): Promise<ProviderModelMetadataStrategies> {
    const strategies: ProviderModelMetadataStrategies = {};
    const anthropic = await this.createLiveStrategy(
      LLMProvider.ANTHROPIC,
      (apiKey) => new AnthropicModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.ANTHROPIC] = anthropic.strategy;
    this.fallbackProvenanceByProvider.set(LLMProvider.ANTHROPIC, anthropic.fallbackProvenance);
    const mistral = await this.createLiveStrategy(
      LLMProvider.MISTRAL,
      (apiKey) => new MistralModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.MISTRAL] = mistral.strategy;
    this.fallbackProvenanceByProvider.set(LLMProvider.MISTRAL, mistral.fallbackProvenance);
    const kimi = await this.createLiveStrategy(
      LLMProvider.KIMI,
      (apiKey) => new KimiModelMetadataProvider(apiKey),
    );
    strategies[LLMProvider.KIMI] = kimi.strategy;
    this.fallbackProvenanceByProvider.set(LLMProvider.KIMI, kimi.fallbackProvenance);
    const gemini = await this.createGeminiStrategy();
    strategies[LLMProvider.GEMINI] = gemini.strategy;
    this.fallbackProvenanceByProvider.set(LLMProvider.GEMINI, gemini.fallbackProvenance);
    return strategies;
  }

  private async createGeminiStrategy(): Promise<StrategyBuildResult> {
    const setup = await getGeminiConfigurationService().getSetupStatus();
    if (setup.selection.kind !== 'aiStudio') {
      return {
        strategy: { kind: 'LIVE_WITH_STATIC_FALLBACK', provider: null },
        fallbackProvenance: 'CURATED_ONLY',
      };
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
  ): Promise<StrategyBuildResult> {
    try {
      const value = await this.metadataApiKeys.resolve(providerId, credentialSlot);
      return {
        strategy: {
          kind: 'LIVE_WITH_STATIC_FALLBACK',
          provider: create(value.revealToTrustedConsumer()),
        },
        fallbackProvenance: 'CURATED_FALLBACK',
      };
    } catch {
      return {
        strategy: { kind: 'LIVE_WITH_STATIC_FALLBACK', provider: null },
        fallbackProvenance: 'CURATED_FALLBACK',
      };
    }
  }
}

type StrategyBuildResult = {
  strategy: ProviderModelMetadataStrategy;
  fallbackProvenance: ModelMetadataProvenanceValue;
};

let singleton: ModelMetadataProvisioningService | null = null;
export const getModelMetadataProvisioningService = (): ModelMetadataProvisioningService => {
  singleton ??= new ModelMetadataProvisioningService();
  return singleton;
};
