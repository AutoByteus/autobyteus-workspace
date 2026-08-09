import { loadMediaReference } from './media-reference-loader.js';

export async function loadImageFromUrl(url: string, signal?: AbortSignal): Promise<Buffer> {
  try {
    const loaded = await loadMediaReference(url, { fallbackMimeType: 'image/png', signal });
    return loaded.bytes;
  } catch (error) {
    console.error(`Failed to load image from URL/path '${url}': ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
