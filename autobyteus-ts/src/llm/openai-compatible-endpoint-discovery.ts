const DEFAULT_DISCOVERY_TIMEOUT_MS = 15_000;
const DISCOVERY_ERROR_MESSAGE_LIMIT = 240;

export type OpenAICompatibleEndpointDiscoveredModel = {
  id: string;
  name: string;
  value: string;
  canonicalName: string;
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

const mapDiscoveredModels = (payload: unknown): OpenAICompatibleEndpointDiscoveredModel[] => {
  const uniqueModelIds = new Set<string>();
  for (const candidate of extractModelsArray(payload)) {
    const modelId = extractModelId(candidate);
    if (modelId) {
      uniqueModelIds.add(modelId);
    }
  }

  return Array.from(uniqueModelIds)
    .sort((left, right) => left.localeCompare(right))
    .map((modelId) => ({
      id: modelId,
      name: modelId,
      value: modelId,
      canonicalName: modelId,
    }));
};

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
        const responseText = truncateMessage(await response.text().catch(() => ''));
        const suffix = responseText ? `: ${responseText}` : '';
        throw new Error(`Model discovery failed with status ${response.status}${suffix}`);
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
