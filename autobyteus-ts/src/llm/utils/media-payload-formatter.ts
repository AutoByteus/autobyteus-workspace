import axios from 'axios';
import fs from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';

/**
 * Determine MIME type of file.
 */
export function getMimeType(filePath: string): string {
  const mimeType = mime.lookup(filePath);
  return mimeType || 'application/octet-stream';
}

/**
 * Check if a string is a valid base64 encoded string.
 */
export function isBase64(s: string): boolean {
  if (typeof s !== 'string' || s.length % 4 !== 0) {
    return false;
  }
  // Standard regex for base64
  const regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return regex.test(s);
}

/**
 * Check if path exists and has a valid media extension.
 */
export async function isValidMediaPath(filePath: string): Promise<boolean> {
  const validExtensions = new Set([
    // Images
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    // Audio
    ".mp3", ".wav", ".ogg", ".aac", ".flac",
    // Video
    ".mp4", ".mpeg", ".mov", ".avi", ".webm", ".mkv"
  ]);

  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!validExtensions.has(ext)) return false;
    
    await fs.access(filePath);
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function isExistingFilePath(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Create properly structured data URI object for API.
 */
export function createDataUri(mimeType: string, base64Data: string): { type: string, image_url: { url: string } } {
  return {
    type: "image_url",
    image_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  };
}

/**
 * Downloads content from a URL and returns it as a base64 encoded string.
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      // Allow self-signed certs in dev similar to python verify=False
      // httpsAgent: new https.Agent({ rejectUnauthorized: false }) // skipped for now to keep deps light unless needed
    });
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error(`Failed to download from URL ${url}: ${error}`);
    throw error;
  }
}

/**
 * Reads a file from a local path and returns it as a base64 encoded string.
 */
export async function fileToBase64(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error(`Failed to read and encode file at ${filePath}: ${error}`);
    throw error;
  }
}

/**
 * Orchestrator function that converts a media source (file path, URL, or existing base64)
 * into a base64 encoded string by delegating to specialized functions.
 */
export async function mediaSourceToBase64(mediaSource: string): Promise<string> {
  if (mediaSource.startsWith('data:')) {
    const commaIndex = mediaSource.indexOf(',');
    if (commaIndex < 0) {
      throw new Error('Invalid data URI media source: missing payload separator.');
    }

    const header = mediaSource.slice(0, commaIndex).toLowerCase();
    const payload = mediaSource.slice(commaIndex + 1);
    if (header.includes(';base64')) {
      return payload;
    }
    return Buffer.from(decodeURIComponent(payload), 'utf8').toString('base64');
  }

  if (mediaSource.startsWith('http://') || mediaSource.startsWith('https://')) {
    return await urlToBase64(mediaSource);
  }

  if (await isValidMediaPath(mediaSource)) {
    return await fileToBase64(mediaSource);
  }

  if (isBase64(mediaSource)) {
    return mediaSource;
  }

  throw new Error("Invalid media source: not a valid file path, URL, or base64 string.");
}

/**
 * Converts a media source (data URI, local path, URL, or raw base64) into a data URI.
 */
export async function mediaSourceToDataUri(mediaSource: string): Promise<string> {
  if (mediaSource.startsWith('data:')) {
    return mediaSource;
  }

  if (mediaSource.startsWith('http://') || mediaSource.startsWith('https://')) {
    try {
      const response = await axios.get(mediaSource, { responseType: 'arraybuffer' });
      const headerContentType = response.headers?.['content-type'];
      const mimeTypeFromHeader = typeof headerContentType === 'string'
        ? headerContentType.split(';')[0].trim()
        : '';
      const parsedUrlPath = (() => {
        try {
          return new URL(mediaSource).pathname;
        } catch {
          return mediaSource;
        }
      })();
      const mimeTypeFromPath = mime.lookup(parsedUrlPath) || '';
      const mimeType = mimeTypeFromHeader || mimeTypeFromPath || 'application/octet-stream';
      const base64Data = Buffer.from(response.data).toString('base64');
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error(`Failed to convert URL to data URI ${mediaSource}: ${error}`);
      throw error;
    }
  }

  if (await isExistingFilePath(mediaSource)) {
    const base64Data = await fileToBase64(mediaSource);
    const mimeType = getMimeType(mediaSource);
    return `data:${mimeType};base64,${base64Data}`;
  }

  if (isBase64(mediaSource)) {
    return `data:application/octet-stream;base64,${mediaSource}`;
  }

  throw new Error("Invalid media source: not a valid file path, URL, base64 string, or data URI.");
}
