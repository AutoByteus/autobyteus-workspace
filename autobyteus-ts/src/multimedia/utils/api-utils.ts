import axios from 'axios';
import fs from 'node:fs/promises';

export async function loadImageFromUrl(url: string): Promise<Buffer> {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    }

    const data = await fs.readFile(url);
    return Buffer.from(data);
  } catch (error) {
    console.error(`Failed to load image from URL/path '${url}': ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
