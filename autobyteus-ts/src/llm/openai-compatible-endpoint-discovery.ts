const DEFAULT_DISCOVERY_TIMEOUT_MS = 15_000;
const DISCOVERY_ERROR_MESSAGE_LIMIT = 240;

export type OpenAICompatibleEndpointDiscoveredModel = {
  id: string;
  name: string;
  value: string;
  canonicalName: string;
  maxContextTokens?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

export type OpenAICompatibleEndpointDiscoveryInput = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
};

const truncateMessage = (message: string): string =>
  message.length <= DISCOVERY_ERROR_MESSAGE_LIMIT
    ? message
    : `${message.slice(0, DISCOVERY_ERROR_MESSAGE_LIMIT - 1)}…`;

export const normalizeOpenAICompatibleEndpointBaseUrl = (value: string): string => {
  const normalized = normalizeRequiredString(value, 'baseUrl').replace(/\/+$/, '');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('baseUrl must be a valid absolute URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('baseUrl must use http:// or https://.');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
};

const normalizeDiscoveryInput = (
  input: OpenAICompatibleEndpointDiscoveryInput,
): Required<Omit<OpenAICompatibleEndpointDiscoveryInput, 'fetchImpl'>> => ({
  baseUrl: normalizeOpenAICompatibleEndpointBaseUrl(input.baseUrl),
  apiKey: normalizeRequiredString(input.apiKey, 'apiKey'),
  timeoutMs:
    typeof input.timeoutMs === 'number' && Number.isFinite(input.timeoutMs) && input.timeoutMs > 0
      ? Math.trunc(input.timeoutMs)
      : DEFAULT_DISCOVERY_TIMEOUT_MS,
});

const extractModelId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['id', 'name', 'model']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

const extractModelsArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data;
  }
  if (Array.isArray(record.models)) {
    return record.models;
  }
  return [];
};

const METADATA_ALIASES = {
  maxContextTokens: [
    'context_window',
    'contextWindow',
    'context_window_tokens',
    'contextWindowTokens',
    'max_context_tokens',
    'maxContextTokens',
    'context_length',
    'contextLength',
    'max_context_length',
    'maxContextLength',
  ],
  maxInputTokens: [
    'max_input_tokens',
    'maxInputTokens',
    'input_token_limit',
    'inputTokenLimit',
    'max_prompt_tokens',
    'maxPromptTokens',
    'max_input_length',
    'maxInputLength',
  ],
  maxOutputTokens: [
    'max_output_tokens',
    'maxOutputTokens',
    'output_token_limit',
    'outputTokenLimit',
    'max_completion_tokens',
    'maxCompletionTokens',
    'max_output_length',
    'maxOutputLength',
  ],
} as const satisfies Record<
  'maxContextTokens' | 'maxInputTokens' | 'maxOutputTokens',
  readonly string[]
>;

export const openAICompatibleEndpointMetadataAliases = METADATA_ALIASES;

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0
    ? value
    : null;

const extractAdvertisedMetadata = (
  value: unknown,
): Pick<OpenAICompatibleEndpointDiscoveredModel, 'maxContextTokens' | 'maxInputTokens' | 'maxOutputTokens'> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const metadata: Pick<
    OpenAICompatibleEndpointDiscoveredModel,
    'maxContextTokens' | 'maxInputTokens' | 'maxOutputTokens'
  > = {};
  for (const field of Object.keys(METADATA_ALIASES) as Array<keyof typeof METADATA_ALIASES>) {
    for (const alias of METADATA_ALIASES[field]) {
      const normalized = normalizePositiveInteger(record[alias]);
      if (normalized !== null) {
        metadata[field] = normalized;
        break;
      }
    }
  }
  return metadata;
};

const mapDiscoveredModels = (payload: unknown): OpenAICompatibleEndpointDiscoveredModel[] => {
  const modelsById = new Map<string, OpenAICompatibleEndpointDiscoveredModel>();
  for (const candidate of extractModelsArray(payload)) {
    const modelId = extractModelId(candidate);
    if (!modelId) continue;

    const existing = modelsById.get(modelId);
    const advertised = extractAdvertisedMetadata(candidate);
    if (!existing) {
      modelsById.set(modelId, {
        id: modelId,
        name: modelId,
        value: modelId,
        canonicalName: modelId,
        ...advertised,
      });
      continue;
    }

    for (const field of ['maxContextTokens', 'maxInputTokens', 'maxOutputTokens'] as const) {
      if (existing[field] === undefined && advertised[field] !== undefined) {
        existing[field] = advertised[field];
      }
    }
  }

  return Array.from(modelsById.values())
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((model) => model);
};

export const normalizeOpenAICompatibleEndpointDiscoveredModels = mapDiscoveredModels;

const buildDiscoveryEndpoint = (baseUrl: string): string => `${baseUrl}/models`;

export class OpenAICompatibleEndpointDiscovery {
  static async probeEndpoint(
    input: OpenAICompatibleEndpointDiscoveryInput,
  ): Promise<OpenAICompatibleEndpointDiscoveredModel[]> {
    const normalized = normalizeDiscoveryInput(input);
    const fetchImpl = input.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), normalized.timeoutMs);

    try {
      const response = await fetchImpl(buildDiscoveryEndpoint(normalized.baseUrl), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${normalized.apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Model discovery failed with status ${response.status}.`);
      }

      const payload = await response.json();
      return mapDiscoveredModels(payload);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw new Error(`Model discovery timed out after ${normalized.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
