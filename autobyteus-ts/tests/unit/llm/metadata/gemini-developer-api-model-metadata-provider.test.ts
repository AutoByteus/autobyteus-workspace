import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiDeveloperApiModelMetadataProvider } from '../../../../src/llm/metadata/gemini-developer-api-model-metadata-provider.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeminiDeveloperApiModelMetadataProvider', () => {
  it('uses the fixed Developer API endpoint and maps documented model aliases and limits', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{
          name: 'models/gemini-3-flash-preview',
          baseModelId: 'gemini-3-flash-preview',
          inputTokenLimit: 2_097_152,
          outputTokenLimit: 98_304,
        }],
      }),
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    const metadata = await new GeminiDeveloperApiModelMetadataProvider('synthetic-ai-studio-key')
      .loadMetadata();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models',
      { headers: { 'x-goog-api-key': 'synthetic-ai-studio-key' } },
    );
    expect(metadata.get('models/gemini-3-flash-preview')).toEqual({
      maxContextTokens: 2_097_152,
      maxInputTokens: 2_097_152,
      maxOutputTokens: 98_304,
    });
    expect(metadata.get('gemini-3-flash-preview')).toEqual(
      metadata.get('models/gemini-3-flash-preview'),
    );
  });

  it('rejects a non-success response without including request credentials', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 }) as Response));

    await expect(
      new GeminiDeveloperApiModelMetadataProvider('synthetic-ai-studio-key').loadMetadata(),
    ).rejects.toThrow('Gemini Developer API metadata request failed with status 403');
  });
});
