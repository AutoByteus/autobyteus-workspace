import { LLMProvider } from '../providers.js';
import {
  supportedModelDefinitions,
  type SupportedModelDefinition,
} from '../supported-model-definitions.js';
import type {
  PartialResolvedModelMetadata,
  ResolvedMetadataField,
  ResolvedModelMetadata,
  ResolvedMetadataSource,
  StaticModelMetadata,
  StaticModelMetadataProvenance,
} from './model-metadata-resolver.js';
import type { OpenAICompatibleEndpointDiscoveredModel } from '../openai-compatible-endpoint-discovery.js';

export type CanonicalEndpointIdentity = {
  protocol: 'http' | 'https';
  hostname: string;
  port: number | null;
  basePath: string;
};

export type EndpointModelProfile = CanonicalEndpointIdentity & {
  profileId: string;
  modelValue: string;
  provenance: StaticModelMetadataProvenance;
  explicit?: PartialResolvedModelMetadata;
  reference?: { provider: LLMProvider; value: string };
};

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
  endpointBaseUrl: string;
  discoveredModel: OpenAICompatibleEndpointDiscoveredModel;
};

const POSITIVE_INTEGER = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? value
    : null;

const PROFILE_SOURCE_URL = 'https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models';
const PROFILE_VERIFIED_AT = '2026-07-30';
const DEEPSEEK_ALIAS_PROFILE_SOURCE_URL = 'https://api-docs.deepseek.com/quick_start/pricing';
const DEEPSEEK_ALIAS_PROFILE_VERIFIED_AT = '2026-08-03';

/** The profile is intentionally exact: this gateway is a separate Alibaba plan endpoint. */
export const OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES: readonly EndpointModelProfile[] = [
  {
    protocol: 'https',
    hostname: 'token-plan.ap-southeast-1.maas.aliyuncs.com',
    port: null,
    basePath: '/compatible-mode/v1',
    profileId: 'alibaba-token-plan-qwencloud-2026-07-30',
    modelValue: 'qwen3.8-max-preview',
    provenance: {
      sourceUrl: PROFILE_SOURCE_URL,
      verifiedAt: PROFILE_VERIFIED_AT,
    },
    explicit: { maxContextTokens: 1_000_000 },
  },
  {
    protocol: 'https',
    hostname: 'token-plan.ap-southeast-1.maas.aliyuncs.com',
    port: null,
    basePath: '/compatible-mode/v1',
    profileId: 'alibaba-token-plan-qwencloud-2026-07-30',
    modelValue: 'qwen3.7-max',
    provenance: {
      sourceUrl: PROFILE_SOURCE_URL,
      verifiedAt: PROFILE_VERIFIED_AT,
    },
    explicit: { maxContextTokens: 1_000_000 },
  },
  {
    protocol: 'https',
    hostname: 'token-plan.ap-southeast-1.maas.aliyuncs.com',
    port: null,
    basePath: '/compatible-mode/v1',
    profileId: 'alibaba-token-plan-deepseek-wire-alias-2026-08-03',
    modelValue: 'deepseek-v4-flash-0731',
    provenance: {
      sourceUrl: DEEPSEEK_ALIAS_PROFILE_SOURCE_URL,
      verifiedAt: DEEPSEEK_ALIAS_PROFILE_VERIFIED_AT,
    },
    reference: { provider: LLMProvider.DEEPSEEK, value: 'deepseek-v4-flash' },
  },
];

const candidateSortKey = (candidate: BuiltInFallbackCandidate): string =>
  `${candidate.provider}\u0000${candidate.staticMetadata.provenance.sourceUrl}\u0000${candidate.staticMetadata.provenance.verifiedAt}`;

/** Build the fallback index once, preserving every exact provider/value candidate. */
export const buildBuiltInFallbackIndex = (
  definitions: readonly SupportedModelDefinition[] = supportedModelDefinitions,
): BuiltInFallbackIndex => {
  const index = new Map<string, BuiltInFallbackCandidate[]>();
  for (const definition of definitions) {
    const value = typeof definition.value === 'string' ? definition.value.trim() : '';
    if (!value) continue;
    const candidates = index.get(value) ?? [];
    candidates.push({
      provider: definition.provider,
      value,
      staticMetadata: definition.staticMetadata,
    });
    index.set(value, candidates);
  }

  for (const [value, candidates] of index) {
    index.set(value, candidates.slice().sort((left, right) => candidateSortKey(left).localeCompare(candidateSortKey(right))));
  }
  return index;
};

export const OPENAI_COMPATIBLE_BUILT_IN_FALLBACK_INDEX = buildBuiltInFallbackIndex();

const canonicalPath = (pathname: string): string => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withoutTrailingSlashes = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlashes === '/' ? '' : withoutTrailingSlashes;
};

export const canonicalizeOpenAICompatibleEndpointIdentity = (
  baseUrl: string,
): CanonicalEndpointIdentity | null => {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const protocol = parsed.protocol.slice(0, -1) as CanonicalEndpointIdentity['protocol'];
  const hostname = parsed.hostname.endsWith('.')
    ? parsed.hostname.slice(0, -1).toLowerCase()
    : parsed.hostname.toLowerCase();
  const parsedPort = parsed.port ? Number.parseInt(parsed.port, 10) : null;
  const port = parsedPort === null || parsedPort === (protocol === 'http' ? 80 : 443)
    ? null
    : parsedPort;

  return { protocol, hostname, port, basePath: canonicalPath(parsed.pathname) };
};

const sameEndpointIdentity = (
  left: CanonicalEndpointIdentity,
  right: CanonicalEndpointIdentity,
): boolean => left.protocol === right.protocol
  && left.hostname === right.hostname
  && left.port === right.port
  && left.basePath === right.basePath;

const fieldValue = (
  metadata: PartialResolvedModelMetadata | undefined,
  field: keyof PartialResolvedModelMetadata,
): number | null => POSITIVE_INTEGER(metadata?.[field]);

const unknownField = (): ResolvedMetadataField<number> => ({
  value: null,
  source: { kind: 'unknown' },
});

const profileField = (
  value: number,
  profile: EndpointModelProfile,
  fromReference = false,
): ResolvedMetadataField<number> => {
  const source: ResolvedMetadataSource = {
    kind: 'endpoint_profile',
    profileId: profile.profileId,
    provenance: profile.provenance,
    ...(fromReference && profile.reference ? { reference: profile.reference } : {}),
  };
  return { value, source };
};

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

const exactReferencedDefinition = (
  reference: NonNullable<EndpointModelProfile['reference']>,
  definitions: readonly SupportedModelDefinition[],
): SupportedModelDefinition | null => definitions.find(
  (definition) => definition.provider === reference.provider
    && definition.value.trim() === reference.value,
) ?? null;

const candidateForField = (
  candidates: readonly BuiltInFallbackCandidate[],
  field: keyof StaticModelMetadata,
): { value: number; candidate: BuiltInFallbackCandidate } | null => {
  if (field === 'provenance' || field === 'multimodalCapabilities') return null;
  const valid = candidates
    .map((candidate) => ({
      value: POSITIVE_INTEGER(candidate.staticMetadata[field]),
      candidate,
    }))
    .filter((entry): entry is { value: number; candidate: BuiltInFallbackCandidate } => entry.value !== null);
  if (valid.length === 0) return null;

  valid.sort((left, right) => left.value - right.value || candidateSortKey(left.candidate).localeCompare(candidateSortKey(right.candidate)));
  return valid[0] ?? null;
};

const profileValueForField = (
  profile: EndpointModelProfile | null,
  field: keyof PartialResolvedModelMetadata,
  definitions: readonly SupportedModelDefinition[],
): ResolvedMetadataField<number> | null => {
  if (!profile) return null;

  const explicit = fieldValue(profile.explicit, field);
  if (explicit !== null) return profileField(explicit, profile);

  const referenced = profile.reference
    ? exactReferencedDefinition(profile.reference, definitions)
    : null;
  const referencedValue = fieldValue(referenced?.staticMetadata, field);
  return referencedValue === null ? null : profileField(referencedValue, profile, true);
};

const resolveField = (
  advertised: PartialResolvedModelMetadata,
  profile: EndpointModelProfile | null,
  fallbackCandidates: readonly BuiltInFallbackCandidate[],
  field: keyof PartialResolvedModelMetadata,
  definitions: readonly SupportedModelDefinition[],
): ResolvedMetadataField<number> => {
  const advertisedValue = fieldValue(advertised, field);
  if (advertisedValue !== null) return { value: advertisedValue, source: { kind: 'live' } };

  const profileResolved = profileValueForField(profile, field, definitions);
  if (profileResolved) return profileResolved;

  const fallback = candidateForField(fallbackCandidates, field);
  return fallback ? inferredField(fallback.value, fallback.candidate) : unknownField();
};

export class OpenAICompatibleEndpointModelMetadataResolver {
  constructor(
    private readonly profiles: readonly EndpointModelProfile[] = OPENAI_COMPATIBLE_ENDPOINT_MODEL_PROFILES,
    private readonly definitions: readonly SupportedModelDefinition[] = supportedModelDefinitions,
    private readonly fallbackIndex: BuiltInFallbackIndex = OPENAI_COMPATIBLE_BUILT_IN_FALLBACK_INDEX,
  ) {}

  resolve(input: OpenAICompatibleEndpointModelMetadataInput): ResolvedModelMetadata {
    const endpointIdentity = canonicalizeOpenAICompatibleEndpointIdentity(input.endpointBaseUrl);
    const modelValue = input.discoveredModel.value;
    const profile = endpointIdentity
      ? this.profiles.find((candidate) => sameEndpointIdentity(candidate, endpointIdentity)
        && candidate.modelValue === modelValue) ?? null
      : null;
    const advertised: PartialResolvedModelMetadata = input.discoveredModel;
    const fallbackCandidates = this.fallbackIndex.get(modelValue) ?? [];

    return {
      maxContextTokens: resolveField(advertised, profile, fallbackCandidates, 'maxContextTokens', this.definitions),
      maxInputTokens: resolveField(advertised, profile, fallbackCandidates, 'maxInputTokens', this.definitions),
      maxOutputTokens: resolveField(advertised, profile, fallbackCandidates, 'maxOutputTokens', this.definitions),
    };
  }
}

export const openAICompatibleEndpointModelMetadataResolver =
  new OpenAICompatibleEndpointModelMetadataResolver();

export const resolveOpenAICompatibleEndpointModelMetadata = (
  input: OpenAICompatibleEndpointModelMetadataInput,
): ResolvedModelMetadata => openAICompatibleEndpointModelMetadataResolver.resolve(input);
