import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { UNKNOWN_MULTIMODAL_CAPABILITIES } from 'autobyteus-ts/llm/multimodal-capabilities.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  ModelMetadataResolver,
  type ResolvedMetadataField,
  type ResolvedMetadataSource,
  type ResolvedModelMetadata,
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
export type EnrichedModelInfo = ModelInfo & {
  resolved_model_metadata: ResolvedModelMetadata | null;
  metadata_provenance?: ModelMetadataProvenanceValue | null;
};

const sourceProvenance = (source: ResolvedMetadataSource): StaticModelMetadata['provenance'] => {
  switch (source.kind) {
    case 'inferred_builtin':
    case 'static_definition':
      return source.provenance;
    default:
      return { sourceUrl: '', verifiedAt: '' };
  }
};

const firstStaticProvenance = (model: ModelInfo): StaticModelMetadata['provenance'] => {
  for (const field of [
    model.resolved_model_metadata?.maxContextTokens,
    model.resolved_model_metadata?.maxInputTokens,
    model.resolved_model_metadata?.maxOutputTokens,
  ]) {
    if (field?.source.kind === 'static_definition') {
      return sourceProvenance(field.source);
    }
  }
  return { sourceUrl: '', verifiedAt: '' };
};

const staticMetadataForModelInfo = (model: ModelInfo): StaticModelMetadata => ({
  maxContextTokens: model.max_context_tokens,
  maxInputTokens: model.max_input_tokens,
  maxOutputTokens: model.max_output_tokens,
  multimodalCapabilities: UNKNOWN_MULTIMODAL_CAPABILITIES,
  provenance: firstStaticProvenance(model),
});

const validValue = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0;

const preserveCustomResolvedField = (
  field: ResolvedMetadataField<number> | undefined,
): field is ResolvedMetadataField<number> => {
  if (!field || !validValue(field.value)) return false;
  return field.source.kind === 'live'
    || field.source.kind === 'inferred_builtin';
};

const mergeResolvedField = (
  existing: ResolvedMetadataField<number> | undefined,
  providerResolved: ResolvedMetadataField<number>,
): ResolvedMetadataField<number> => preserveCustomResolvedField(existing) ? existing : providerResolved;

const mergeResolvedMetadata = (
  existing: ResolvedModelMetadata | null | undefined,
  providerResolved: ResolvedModelMetadata,
): ResolvedModelMetadata => ({
  maxContextTokens: mergeResolvedField(existing?.maxContextTokens, providerResolved.maxContextTokens),
  maxInputTokens: mergeResolvedField(existing?.maxInputTokens, providerResolved.maxInputTokens),
  maxOutputTokens: mergeResolvedField(existing?.maxOutputTokens, providerResolved.maxOutputTokens),
});

const coarseProvenanceFor = (
  metadata: ResolvedModelMetadata,
  fallback: ModelMetadataProvenanceValue,
): ModelMetadataProvenanceValue => {
  const fields = [metadata.maxContextTokens, metadata.maxInputTokens, metadata.maxOutputTokens];
  if (fields.some((field) => field.source.kind === 'live')) return 'LIVE';
  if (fields.some((field) => field.source.kind === 'inferred_builtin')) {
    return 'CURATED_FALLBACK';
  }
  return fallback;
};

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
        const resolvedModelMetadata = mergeResolvedMetadata(
          model.resolved_model_metadata,
          metadata,
        );
        return {
          ...model,
          max_context_tokens: resolvedModelMetadata.maxContextTokens.value,
          active_context_tokens: model.active_context_tokens,
          max_input_tokens: resolvedModelMetadata.maxInputTokens.value,
          max_output_tokens: resolvedModelMetadata.maxOutputTokens.value,
          resolved_model_metadata: resolvedModelMetadata,
          metadata_provenance: coarseProvenanceFor(
            resolvedModelMetadata,
            this.fallbackProvenanceByProvider.get(model.provider_type) ?? 'CURATED_ONLY',
          ),
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
