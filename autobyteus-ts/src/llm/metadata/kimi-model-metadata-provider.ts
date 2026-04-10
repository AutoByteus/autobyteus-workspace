import type {
  PartialResolvedModelMetadata,
  ProviderModelMetadataProvider
} from './model-metadata-resolver.js';

interface KimiModelListItem {
  id?: string;
  name?: string;
  model?: string;
  context_length?: number;
  contextLength?: number;
}

interface KimiModelListResponse {
  data?: KimiModelListItem[];
  models?: KimiModelListItem[];
}

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export class KimiModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(
    private readonly apiKey: string | null = process.env.KIMI_API_KEY ?? null,
    private readonly baseUrl: string = process.env.KIMI_API_BASE_URL ?? 'https://api.moonshot.ai/v1'
  ) {}

  async loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>> {
    if (!this.apiKey) {
      return new Map();
    }

    const response = await fetch(`${trimTrailingSlash(this.baseUrl)}/models`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Kimi metadata request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as KimiModelListResponse | KimiModelListItem[];
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.models)
          ? payload.models
          : [];

    const metadata = new Map<string, PartialResolvedModelMetadata>();
    for (const item of items) {
      const modelId = item.id ?? item.name ?? item.model ?? null;
      if (!modelId) {
        continue;
      }

      metadata.set(modelId, {
        maxContextTokens: normalizePositiveInteger(item.context_length ?? item.contextLength)
      });
    }

    return metadata;
  }
}
