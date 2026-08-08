import { LLMProvider } from '../providers.js';
import type { StaticModelMetadata } from '../supported-model-definition.js';

export type { StaticModelMetadata, StaticModelMetadataProvenance } from '../supported-model-definition.js';

export enum ModelMetadataProvenance {
  LIVE = 'LIVE',
  CURATED_FALLBACK = 'CURATED_FALLBACK',
  CURATED_ONLY = 'CURATED_ONLY',
}

export type ResolvedMetadataSource =
  | { kind: 'live' }
  | {
      kind: 'inferred_builtin';
      provider: LLMProvider;
      value: string;
      provenance: StaticModelMetadata['provenance'];
    }
  | { kind: 'static_definition'; provenance: StaticModelMetadata['provenance'] }
  | { kind: 'unknown' };

export type ResolvedMetadataField<T> = {
  value: T | null;
  source: ResolvedMetadataSource;
};

export type ResolvedModelMetadata = {
  maxContextTokens: ResolvedMetadataField<number>;
  maxInputTokens: ResolvedMetadataField<number>;
  maxOutputTokens: ResolvedMetadataField<number>;
};

/** Numeric fields returned by a provider's live model metadata endpoint. */
export type PartialResolvedModelMetadata = Partial<{
  maxContextTokens: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
}>;

export interface SupportedModelMetadataLookup {
  provider: LLMProvider;
  name: string;
  value: string;
  canonicalName: string;
}

export interface ProviderModelMetadataProvider {
  loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>>;
}

export type ProviderModelMetadataStrategy = {
  kind: 'LIVE_WITH_STATIC_FALLBACK' | 'LIVE_WITH_CURATED_FALLBACK';
  provider: ProviderModelMetadataProvider | null;
};

export type ProviderModelMetadataStrategies = Partial<
  Record<LLMProvider, ProviderModelMetadataStrategy>
>;

interface ModelMetadataResolverOptions {
  providerLoadTimeoutMs?: number;
}

const DEFAULT_PROVIDER_LOAD_TIMEOUT_MS = 3000;

const normalizeTimeoutMs = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_PROVIDER_LOAD_TIMEOUT_MS;
};

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? value
    : null;

const resolveLookupKeys = ({ name, value, canonicalName }: SupportedModelMetadataLookup): string[] => {
  const keys = new Set<string>();
  for (const candidate of [value, name, canonicalName]) {
    if (!candidate) continue;
    keys.add(candidate);
    if (candidate.startsWith('models/')) keys.add(candidate.slice('models/'.length));
  }
  return [...keys];
};

const resolveField = (
  liveValue: unknown,
  staticValue: number | null,
  provenance: StaticModelMetadata['provenance'],
): ResolvedMetadataField<number> => {
  const live = normalizePositiveInteger(liveValue);
  if (live !== null) return { value: live, source: { kind: 'live' } };

  const staticResolved = normalizePositiveInteger(staticValue);
  if (staticResolved !== null) {
    return {
      value: staticResolved,
      source: { kind: 'static_definition', provenance },
    };
  }

  return { value: null, source: { kind: 'unknown' } };
};

export class ModelMetadataResolver {
  private readonly providerCache = new Map<LLMProvider, Promise<Map<string, PartialResolvedModelMetadata>>>();
  private readonly providerStrategies: ProviderModelMetadataStrategies;
  private readonly providerLoadTimeoutMs: number;

  constructor(
    providerStrategies: ProviderModelMetadataStrategies = {},
    options: ModelMetadataResolverOptions = {},
  ) {
    this.providerStrategies = providerStrategies;
    this.providerLoadTimeoutMs = normalizeTimeoutMs(options.providerLoadTimeoutMs);
  }

  /** Resolve each intrinsic numeric field independently: live, static definition, then unknown. */
  async resolve(
    lookup: SupportedModelMetadataLookup,
    staticMetadata: StaticModelMetadata,
  ): Promise<ResolvedModelMetadata> {
    const strategy = this.providerStrategies[lookup.provider];
    const liveMetadata = strategy
      ? await this.getResolvedProviderMetadata(lookup.provider, strategy.provider)
      : new Map<string, PartialResolvedModelMetadata>();
    const live = this.findMetadata(liveMetadata, lookup);

    return {
      maxContextTokens: resolveField(
        live?.maxContextTokens,
        staticMetadata.maxContextTokens,
        staticMetadata.provenance,
      ),
      maxInputTokens: resolveField(
        live?.maxInputTokens,
        staticMetadata.maxInputTokens,
        staticMetadata.provenance,
      ),
      maxOutputTokens: resolveField(
        live?.maxOutputTokens,
        staticMetadata.maxOutputTokens,
        staticMetadata.provenance,
      ),
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
    resolver: ProviderModelMetadataProvider,
  ): Promise<Map<string, PartialResolvedModelMetadata>> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        resolver.loadMetadata(),
        new Promise<Map<string, PartialResolvedModelMetadata>>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`metadata load timed out after ${this.providerLoadTimeoutMs}ms for provider ${provider}`));
          }, this.providerLoadTimeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    }
  }

  private findMetadata(
    providerMetadata: Map<string, PartialResolvedModelMetadata>,
    lookup: SupportedModelMetadataLookup,
  ): PartialResolvedModelMetadata | null {
    for (const key of resolveLookupKeys(lookup)) {
      const metadata = providerMetadata.get(key);
      if (metadata) return metadata;
    }
    return null;
  }
}
