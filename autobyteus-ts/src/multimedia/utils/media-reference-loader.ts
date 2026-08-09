import axios from 'axios';
import mime from 'mime-types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type LoadedMediaReference = {
  bytes: Buffer;
  base64: string;
  mimeType: string;
};

const DATA_URI_PATTERN = /^data:([^;,]+)?((?:;[^,]+)*),(.*)$/s;

const normalizeMimeType = (mimeType: unknown, fallback: string): string => {
  if (typeof mimeType !== 'string') {
    return fallback;
  }
  const base = mimeType.split(';')[0]?.trim().toLowerCase();
  return base || fallback;
};

const guessMimeType = (source: string, fallback: string): string =>
  normalizeMimeType(mime.lookup(source) || null, fallback);

const decodeDataUri = (reference: string, fallbackMimeType: string): LoadedMediaReference => {
  const match = DATA_URI_PATTERN.exec(reference);
  if (!match) {
    throw new Error('Invalid data URI media reference.');
  }

  const [, rawMimeType, metadata, payload] = match;
  const isBase64 = metadata?.split(';').some((part) => part.toLowerCase() === 'base64') ?? false;
  const decodedPayload = decodeURIComponent(payload ?? '');
  const bytes = isBase64
    ? Buffer.from(decodedPayload, 'base64')
    : Buffer.from(decodedPayload, 'utf8');

  return {
    bytes,
    base64: bytes.toString('base64'),
    mimeType: normalizeMimeType(rawMimeType, fallbackMimeType),
  };
};

const resolveLocalReference = (reference: string): string => {
  if (reference.startsWith('file:')) {
    return fileURLToPath(reference);
  }
  return reference;
};

export async function loadMediaReference(
  reference: string,
  options: { fallbackMimeType?: string; signal?: AbortSignal } = {},
): Promise<LoadedMediaReference> {
  const normalizedReference = reference.trim();
  if (!normalizedReference) {
    throw new Error('Media reference must be a non-empty string.');
  }

  const fallbackMimeType = options.fallbackMimeType ?? 'application/octet-stream';

  if (normalizedReference.startsWith('data:')) {
    return decodeDataUri(normalizedReference, fallbackMimeType);
  }

  if (normalizedReference.startsWith('http://') || normalizedReference.startsWith('https://')) {
    const response = await axios.get(normalizedReference, { responseType: 'arraybuffer', signal: options.signal });
    const bytes = Buffer.from(response.data);
    const contentType = normalizeMimeType(response.headers?.['content-type'], '');
    return {
      bytes,
      base64: bytes.toString('base64'),
      mimeType: contentType || guessMimeType(normalizedReference, fallbackMimeType),
    };
  }

  const localPath = resolveLocalReference(normalizedReference);
  const bytes = Buffer.from(await fs.readFile(localPath));
  return {
    bytes,
    base64: bytes.toString('base64'),
    mimeType: guessMimeType(path.basename(localPath), fallbackMimeType),
  };
}
