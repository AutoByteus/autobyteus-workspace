import type {
  PartialResolvedModelMetadata,
  ProviderModelMetadataProvider
} from './model-metadata-resolver.js';

interface GeminiModelListItem {
  name?: string;
  baseModelId?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

interface GeminiModelListResponse {
  models?: GeminiModelListItem[];
}

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const trimLeadingModelsPrefix = (value: string): string =>
  value.startsWith('models/') ? value.slice('models/'.length) : value;

export class GeminiModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(
    private readonly apiKey: string | null =
      process.env.GEMINI_API_KEY ?? process.env.VERTEX_AI_API_KEY ?? null,
    private readonly endpoint: string =
      process.env.GEMINI_MODEL_METADATA_ENDPOINT ??
      'https://generativelanguage.googleapis.com/v1beta/models'
  ) {}

  async loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>> {
    if (!this.apiKey) {
      return new Map();
    }

    const separator = this.endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`${this.endpoint}${separator}key=${encodeURIComponent(this.apiKey)}`);

    if (!response.ok) {
      throw new Error(`Gemini metadata request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GeminiModelListResponse;
    const metadata = new Map<string, PartialResolvedModelMetadata>();

    for (const item of payload.models ?? []) {
      const inputTokenLimit = normalizePositiveInteger(item.inputTokenLimit);
      const entry: PartialResolvedModelMetadata = {
        maxContextTokens: inputTokenLimit,
        maxInputTokens: inputTokenLimit,
        maxOutputTokens: normalizePositiveInteger(item.outputTokenLimit)
      };

      for (const alias of [item.name, item.baseModelId].filter((candidate): candidate is string => Boolean(candidate))) {
        metadata.set(alias, entry);
        metadata.set(trimLeadingModelsPrefix(alias), entry);
      }
    }

    return metadata;
  }
}
