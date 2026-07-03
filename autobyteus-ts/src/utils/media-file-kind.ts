import path from 'node:path';

export type MediaFileKind = 'image' | 'audio' | 'video';

const MEDIA_FILE_KIND_BY_EXTENSION: Readonly<Record<string, MediaFileKind>> = Object.freeze({
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.mp3': 'audio',
  '.wav': 'audio',
  '.m4a': 'audio',
  '.ogg': 'audio',
  '.aac': 'audio',
  '.flac': 'audio',
  '.mp4': 'video',
  '.mpeg': 'video',
  '.mov': 'video',
  '.avi': 'video',
  '.webm': 'video',
  '.mkv': 'video'
});

export const SUPPORTED_MEDIA_FILE_EXTENSIONS = Object.freeze(
  Object.keys(MEDIA_FILE_KIND_BY_EXTENSION)
) as readonly string[];

const sourcePathForExtension = (source: string): string => {
  const trimmed = source.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.pathname;
  } catch {
    return trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  }
};

export const getMediaFileExtension = (source: string): string => {
  if (typeof source !== 'string') {
    return '';
  }
  return path.extname(sourcePathForExtension(source)).toLowerCase();
};

export const getMediaFileKindFromPath = (source: string): MediaFileKind | null => {
  const extension = getMediaFileExtension(source);
  return MEDIA_FILE_KIND_BY_EXTENSION[extension] ?? null;
};

export const isSupportedMediaFileExtension = (extension: string): boolean =>
  Object.prototype.hasOwnProperty.call(
    MEDIA_FILE_KIND_BY_EXTENSION,
    extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`
  );
