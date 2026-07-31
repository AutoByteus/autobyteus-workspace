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
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0 ? value : null;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export class AnthropicModelMetadataProvider implements ProviderModelMetadataProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.anthropic.com/v1',
    private readonly apiVersion: string = '2023-06-01'
  ) {}

  async loadMetadata(): Promise<Map<string, PartialResolvedModelMetadata>> {
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
