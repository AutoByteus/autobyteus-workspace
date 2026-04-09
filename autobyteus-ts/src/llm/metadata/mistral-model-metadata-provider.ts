import type {
  PartialResolvedModelMetadata,
  ProviderModelMetadataProvider
} from './model-metadata-resolver.js';

interface MistralModelListItem {
  id?: string;
  name?: string | null;
  aliases?: string[];
  max_context_length?: number;
}

interface MistralModelListResponse {
  data?: MistralModelListItem[];
}

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export class MistralModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(
    private readonly apiKey: string | null = process.env.MISTRAL_API_KEY ?? null,
    private readonly baseUrl: string = process.env.MISTRAL_API_BASE_URL ?? 'https://api.mistral.ai/v1'
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
      throw new Error(`Mistral metadata request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MistralModelListResponse | MistralModelListItem[];
    const items = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

    const metadata = new Map<string, PartialResolvedModelMetadata>();
    for (const item of items) {
      const entry: PartialResolvedModelMetadata = {
        maxContextTokens: normalizePositiveInteger(item.max_context_length)
      };

      const aliases = [item.id, item.name ?? null, ...(item.aliases ?? [])].filter(
        (candidate): candidate is string => Boolean(candidate)
      );
      for (const alias of aliases) {
        metadata.set(alias, entry);
      }
    }

    return metadata;
  }
}
