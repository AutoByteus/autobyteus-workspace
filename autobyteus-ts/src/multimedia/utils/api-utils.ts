import { loadMediaReference } from './media-reference-loader.js';

export async function loadImageFromUrl(url: string): Promise<Buffer> {
  try {
    const loaded = await loadMediaReference(url, { fallbackMimeType: 'image/png' });
    return loaded.bytes;
  } catch (error) {
    console.error(`Failed to load image from URL/path '${url}': ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
