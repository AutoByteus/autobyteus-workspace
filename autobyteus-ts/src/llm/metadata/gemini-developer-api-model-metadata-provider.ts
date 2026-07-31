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
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0 ? value : null;

const trimLeadingModelsPrefix = (value: string): string =>
  value.startsWith('models/') ? value.slice('models/'.length) : value;

const GEMINI_DEVELOPER_API_MODELS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiDeveloperApiModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(private readonly apiKey: string) {}

  async loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>> {
    const response = await fetch(GEMINI_DEVELOPER_API_MODELS_ENDPOINT, {
      headers: { 'x-goog-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Gemini Developer API metadata request failed with status ${response.status}`);
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
