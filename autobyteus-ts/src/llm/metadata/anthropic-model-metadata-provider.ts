import type {
  PartialResolvedModelMetadata,
  ProviderModelMetadataProvider
} from './model-metadata-resolver.js';

interface AnthropicModelListItem {
  id?: string;
  display_name?: string;
  max_input_tokens?: number;
  max_tokens?: number;
}

interface AnthropicModelListResponse {
  data?: AnthropicModelListItem[];
}

const normalizePositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export class AnthropicModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(
    private readonly apiKey: string | null = process.env.ANTHROPIC_API_KEY ?? null,
    private readonly baseUrl: string = process.env.ANTHROPIC_API_BASE_URL ?? 'https://api.anthropic.com/v1',
    private readonly apiVersion: string = process.env.ANTHROPIC_API_VERSION ?? '2023-06-01'
  ) {}

  async loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>> {
    if (!this.apiKey) {
      return new Map();
    }

    const response = await fetch(`${trimTrailingSlash(this.baseUrl)}/models`, {
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion
      }
    });

    if (!response.ok) {
      throw new Error(`Anthropic metadata request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as AnthropicModelListResponse | AnthropicModelListItem[];
    const items = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

    const metadata = new Map<string, PartialResolvedModelMetadata>();
    for (const item of items) {
      const maxInputTokens = normalizePositiveInteger(item.max_input_tokens);
      const entry: PartialResolvedModelMetadata = {
        maxContextTokens: maxInputTokens,
        maxInputTokens,
        maxOutputTokens: normalizePositiveInteger(item.max_tokens)
      };

      for (const alias of [item.id, item.display_name].filter((candidate): candidate is string => Boolean(candidate))) {
        metadata.set(alias, entry);
      }
    }

    return metadata;
  }
}
