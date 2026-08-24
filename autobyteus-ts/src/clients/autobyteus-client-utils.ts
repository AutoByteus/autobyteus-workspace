import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import type { AxiosError } from 'axios';
import { joinDiscoveryEndpointPath } from '../llm/discovery-endpoint-identity.js';

export type AutobyteusMediaKind = 'image' | 'audio' | 'video';

const DEFAULT_INLINE_MEDIA_MAX_BYTES: Record<AutobyteusMediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 25 * 1024 * 1024
};

const INLINE_MEDIA_MAX_BYTES_ENV: Record<AutobyteusMediaKind, string> = {
  image: 'AUTOBYTEUS_INLINE_IMAGE_MAX_BYTES',
  audio: 'AUTOBYTEUS_INLINE_AUDIO_MAX_BYTES',
  video: 'AUTOBYTEUS_INLINE_VIDEO_MAX_BYTES'
};

export const joinAutobyteusUrl = (baseUrl: string, requestPath: string): string =>
  joinDiscoveryEndpointPath(baseUrl, requestPath);

export const formatAutobyteusHttpError = (error: AxiosError): Error => {
  const response = error.response;
  const status = response?.status;
  const statusText = response?.statusText ?? '';
  let detail = '';
  if (response?.data) {
    if (typeof response.data === 'string') {
      detail = response.data;
    } else {
      try {
        detail = JSON.stringify(response.data);
      } catch {
        detail = String(response.data);
      }
    }
  }
  let message = status ? `HTTP ${status} ${statusText}`.trim() : 'HTTP error';
  if (detail) message = `${message}: ${detail}`;
  else if (error.message) message = `${message}: ${error.message}`;
  const wrapped = new Error(message);
  Object.assign(wrapped, { cause: error });
  return wrapped;
};

export const getInlineMediaMaxBytes = (kind: AutobyteusMediaKind): number => {
  const configuredValue = process.env[INLINE_MEDIA_MAX_BYTES_ENV[kind]];
  if (!configuredValue) return DEFAULT_INLINE_MEDIA_MAX_BYTES[kind];
  const parsed = Number(configuredValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_INLINE_MEDIA_MAX_BYTES[kind];
};

export const isHttpMediaUrl = (source: string): boolean =>
  source.startsWith('http://') || source.startsWith('https://');
export const isDataUri = (source: string): boolean => source.startsWith('data:');
export const isMediaUri = (source: string): boolean => source.startsWith('media://');

export const estimateBase64DecodedBytes = (base64Data: string): number => {
  const normalized = base64Data.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};

export const parseDataUri = (
  mediaSource: string,
): { mimeType: string; payload: string; isBase64Payload: boolean } => {
  const commaIndex = mediaSource.indexOf(',');
  if (commaIndex < 0) throw new Error('Invalid data URI media source: missing payload separator.');
  const header = mediaSource.slice(0, commaIndex);
  return {
    mimeType: header.slice(5).split(';', 1)[0] || 'application/octet-stream',
    payload: mediaSource.slice(commaIndex + 1),
    isBase64Payload: header.toLowerCase().includes(';base64')
  };
};

export const getFilenameFromUrl = (mediaUrl: string, fallback: string): string => {
  try {
    const basename = path.basename(new URL(mediaUrl).pathname);
    return basename || fallback;
  } catch {
    return fallback;
  }
};

export const getLocalFilePathFromSource = (source: string): string | null => {
  if (source.startsWith('file://')) {
    try {
      return fileURLToPath(source);
    } catch {
      return null;
    }
  }
  return isHttpMediaUrl(source) || isDataUri(source) || isMediaUri(source) ? null : source;
};
