import { LLMProvider } from '../providers.js';
import {
  supportedModelDefinitions,
  type SupportedModelDefinition,
} from '../supported-model-definitions.js';
import type {
  PartialResolvedModelMetadata,
  ResolvedMetadataField,
  ResolvedModelMetadata,
  StaticModelMetadata,
} from './model-metadata-resolver.js';
import type { OpenAICompatibleEndpointDiscoveredModel } from '../openai-compatible-endpoint-discovery.js';

export type BuiltInFallbackCandidate = {
  provider: LLMProvider;
  value: string;
  staticMetadata: StaticModelMetadata;
};

export type BuiltInFallbackIndex = ReadonlyMap<
  string,
  readonly BuiltInFallbackCandidate[]
>;

export type OpenAICompatibleEndpointModelMetadataInput = {
  discoveredModel: OpenAICompatibleEndpointDiscoveredModel;
};

const positiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? value
    : null;

const candidateSortKey = (candidate: BuiltInFallbackCandidate): string =>
  `${candidate.provider}\u0000${candidate.staticMetadata.provenance.sourceUrl}\u0000${candidate.staticMetadata.provenance.verifiedAt}`;

/** Build the fallback index once, preserving every exact provider/value candidate. */
export const buildBuiltInFallbackIndex = (
  definitions: readonly SupportedModelDefinition[] = supportedModelDefinitions,
): BuiltInFallbackIndex => {
  const index = new Map<string, BuiltInFallbackCandidate[]>();
  for (const definition of definitions) {
    const value = definition.value;
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    const candidates = index.get(value) ?? [];
    candidates.push({
      provider: definition.provider,
      value,
      staticMetadata: definition.staticMetadata,
    });
    index.set(value, candidates);
  }

  for (const [value, candidates] of index) {
    index.set(
      value,
      candidates.slice().sort((left, right) =>
        candidateSortKey(left).localeCompare(candidateSortKey(right))),
    );
  }
  return index;
};

export const OPENAI_COMPATIBLE_BUILT_IN_FALLBACK_INDEX = buildBuiltInFallbackIndex();

const unknownField = (): ResolvedMetadataField<number> => ({
  value: null,
  source: { kind: 'unknown' },
});

const inferredField = (
  value: number,
  candidate: BuiltInFallbackCandidate,
): ResolvedMetadataField<number> => ({
  value,
  source: {
    kind: 'inferred_builtin',
    provider: candidate.provider,
    value: candidate.value,
    provenance: candidate.staticMetadata.provenance,
  },
});

type NumericMetadataField = keyof PartialResolvedModelMetadata;

const candidateForField = (
  candidates: readonly BuiltInFallbackCandidate[],
  field: NumericMetadataField,
): { value: number; candidate: BuiltInFallbackCandidate } | null => {
  const valid = candidates
    .map((candidate) => ({
      value: positiveInteger(candidate.staticMetadata[field]),
      candidate,
    }))
    .filter((entry): entry is { value: number; candidate: BuiltInFallbackCandidate } =>
      entry.value !== null);
  if (valid.length === 0) return null;

  valid.sort((left, right) =>
    left.value - right.value
    || candidateSortKey(left.candidate).localeCompare(candidateSortKey(right.candidate)));
  return valid[0] ?? null;
};

const resolveField = (
  advertised: PartialResolvedModelMetadata,
  fallbackCandidates: readonly BuiltInFallbackCandidate[],
  field: NumericMetadataField,
): ResolvedMetadataField<number> => {
  const advertisedValue = positiveInteger(advertised[field]);
  if (advertisedValue !== null) {
    return { value: advertisedValue, source: { kind: 'live' } };
  }

  const fallback = candidateForField(fallbackCandidates, field);
  return fallback ? inferredField(fallback.value, fallback.candidate) : unknownField();
};

export class OpenAICompatibleEndpointModelMetadataResolver {
  constructor(
    private readonly fallbackIndex: BuiltInFallbackIndex =
      OPENAI_COMPATIBLE_BUILT_IN_FALLBACK_INDEX,
  ) {}

  resolve(input: OpenAICompatibleEndpointModelMetadataInput): ResolvedModelMetadata {
    const advertised: PartialResolvedModelMetadata = input.discoveredModel;
    const fallbackCandidates = this.fallbackIndex.get(input.discoveredModel.value) ?? [];

    return {
      maxContextTokens: resolveField(advertised, fallbackCandidates, 'maxContextTokens'),
      maxInputTokens: resolveField(advertised, fallbackCandidates, 'maxInputTokens'),
      maxOutputTokens: resolveField(advertised, fallbackCandidates, 'maxOutputTokens'),
    };
  }
}

export const openAICompatibleEndpointModelMetadataResolver =
  new OpenAICompatibleEndpointModelMetadataResolver();

export const resolveOpenAICompatibleEndpointModelMetadata = (
  input: OpenAICompatibleEndpointModelMetadataInput,
): ResolvedModelMetadata => openAICompatibleEndpointModelMetadataResolver.resolve(input);
