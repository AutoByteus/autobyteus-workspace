import { LLMProvider } from '../providers.js';
import { getCuratedModelMetadata } from './curated-model-metadata.js';

export interface ResolvedModelMetadata {
  maxContextTokens: number | null;
  activeContextTokens: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
}

export enum ModelMetadataProvenance {
  LIVE = 'LIVE',
  CURATED_FALLBACK = 'CURATED_FALLBACK',
  CURATED_ONLY = 'CURATED_ONLY',
}

export interface ModelMetadataResolution extends ResolvedModelMetadata {
  provenance: ModelMetadataProvenance;
}

export type PartialResolvedModelMetadata = Partial<ResolvedModelMetadata>;

export interface SupportedModelMetadataLookup {
  provider: LLMProvider;
  name: string;
  value: string;
  canonicalName: string;
}

export interface ProviderModelMetadataProvider {
  loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>>;
}

export type ProviderModelMetadataStrategy =
  | {
      kind: 'LIVE_WITH_CURATED_FALLBACK';
      provider: ProviderModelMetadataProvider | null;
    }
  | { kind: 'CURATED_ONLY' };

export type ProviderModelMetadataStrategies = Partial<
  Record<LLMProvider, ProviderModelMetadataStrategy>
>;

interface ModelMetadataResolverOptions {
  providerLoadTimeoutMs?: number;
}

const UNKNOWN_MODEL_METADATA: ResolvedModelMetadata = Object.freeze({
  maxContextTokens: null,
  activeContextTokens: null,
  maxInputTokens: null,
  maxOutputTokens: null
});

const DEFAULT_PROVIDER_LOAD_TIMEOUT_MS = 3000;

const normalizeTimeoutMs = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_PROVIDER_LOAD_TIMEOUT_MS;
};

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const normalizeResolvedModelMetadata = (
  metadata: PartialResolvedModelMetadata | null | undefined
): ResolvedModelMetadata => ({
  maxContextTokens: normalizePositiveInteger(metadata?.maxContextTokens),
  activeContextTokens: normalizePositiveInteger(metadata?.activeContextTokens),
  maxInputTokens: normalizePositiveInteger(metadata?.maxInputTokens),
  maxOutputTokens: normalizePositiveInteger(metadata?.maxOutputTokens)
});

const mergeMetadata = (
  preferred: PartialResolvedModelMetadata | null | undefined,
  fallback: PartialResolvedModelMetadata | null | undefined
): ResolvedModelMetadata => {
  const normalizedPreferred = normalizeResolvedModelMetadata(preferred);
  const normalizedFallback = normalizeResolvedModelMetadata(fallback);

  return {
    maxContextTokens: normalizedPreferred.maxContextTokens ?? normalizedFallback.maxContextTokens,
    activeContextTokens: normalizedPreferred.activeContextTokens ?? normalizedFallback.activeContextTokens,
    maxInputTokens: normalizedPreferred.maxInputTokens ?? normalizedFallback.maxInputTokens,
    maxOutputTokens: normalizedPreferred.maxOutputTokens ?? normalizedFallback.maxOutputTokens
  };
};

const resolveLookupKeys = ({ name, value, canonicalName }: SupportedModelMetadataLookup): string[] => {
  const keys = new Set<string>();
  for (const candidate of [value, name, canonicalName]) {
    if (!candidate) {
      continue;
    }
    keys.add(candidate);
    if (candidate.startsWith('models/')) {
      keys.add(candidate.slice('models/'.length));
    }
  }
  return Array.from(keys);
};

export class ModelMetadataResolver {
  private readonly providerCache = new Map<LLMProvider, Promise<Map<string, PartialResolvedModelMetadata>>>();
  private readonly providerStrategies: ProviderModelMetadataStrategies;
  private readonly providerLoadTimeoutMs: number;

  constructor(
    providerStrategies?: ProviderModelMetadataStrategies,
    options?: ModelMetadataResolverOptions
  ) {
    this.providerStrategies = providerStrategies ?? {};
    this.providerLoadTimeoutMs = normalizeTimeoutMs(options?.providerLoadTimeoutMs);
  }

  async resolve(lookup: SupportedModelMetadataLookup): Promise<ModelMetadataResolution> {
    const curatedMetadata = getCuratedModelMetadata(lookup);
    const strategy = this.providerStrategies[lookup.provider] ?? { kind: 'CURATED_ONLY' };
    if (strategy.kind === 'CURATED_ONLY') {
      return {
        ...mergeMetadata(null, curatedMetadata ?? UNKNOWN_MODEL_METADATA),
        provenance: ModelMetadataProvenance.CURATED_ONLY,
      };
    }

    const liveMetadata = await this.getResolvedProviderMetadata(lookup.provider, strategy.provider);
    const matchedLiveMetadata = this.findMetadata(liveMetadata, lookup);

    return {
      ...mergeMetadata(matchedLiveMetadata, curatedMetadata ?? UNKNOWN_MODEL_METADATA),
      provenance: matchedLiveMetadata
        ? ModelMetadataProvenance.LIVE
        : ModelMetadataProvenance.CURATED_FALLBACK,
    };
  }

  private async getResolvedProviderMetadata(
    provider: LLMProvider,
    metadataProvider: ProviderModelMetadataProvider | null,
  ): Promise<Map<string, PartialResolvedModelMetadata>> {
    let pending = this.providerCache.get(provider);
    if (!pending) {
      pending = metadataProvider
        ? this.loadMetadataWithTimeout(provider, metadataProvider).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to resolve model metadata for provider ${provider}: ${message}`);
            return new Map<string, PartialResolvedModelMetadata>();
          })
        : Promise.resolve(new Map<string, PartialResolvedModelMetadata>());
      this.providerCache.set(provider, pending);
    }

    return pending;
  }

  private async loadMetadataWithTimeout(
    provider: LLMProvider,
    resolver: ProviderModelMetadataProvider
  ): Promise<Map<string, PartialResolvedModelMetadata>> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    try {
      return await Promise.race([
        resolver.loadMetadata(),
        new Promise<Map<string, PartialResolvedModelMetadata>>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`metadata load timed out after ${this.providerLoadTimeoutMs}ms for provider ${provider}`));
          }, this.providerLoadTimeoutMs);
        })
      ]);
    } finally {
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private findMetadata(
    providerMetadata: Map<string, PartialResolvedModelMetadata>,
    lookup: SupportedModelMetadataLookup
  ): PartialResolvedModelMetadata | null {
    for (const key of resolveLookupKeys(lookup)) {
      const metadata = providerMetadata.get(key);
      if (metadata) {
        return metadata;
      }
    }
    return null;
  }
}
