import path from "node:path";
import { randomUUID } from "node:crypto";
import { extension as mimeExtension, lookup as mimeLookup } from "mime-types";
export const CONTEXT_FILE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const allowedMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml",
  "text/html",
  "text/x-python",
  "application/javascript",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/ogg",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
]);

/** The per-type size limits of a context file, in bytes (see GLOSSARY.md "Context Files"). */
export interface ContextFileSizeLimits { audioVideoMaxBytes: number; otherFileMaxBytes: number }

/** The accepted audio and video types: the files the audio/video limit covers. */
export const audioVideoContextFileMimeTypes: readonly string[] = [...allowedMimeTypes]
  .filter((mimeType) => mimeType.startsWith("audio/") || mimeType.startsWith("video/"));

/** The size limit that applies to a file of this type. */
export const contextFileMaxBytesFor = (mimeType: string, limits: ContextFileSizeLimits): number =>
  audioVideoContextFileMimeTypes.includes(mimeType) ? limits.audioVideoMaxBytes : limits.otherFileMaxBytes;

/** The multipart cap of an upload route: the larger limit; the writer enforces the file's own limit. */
export const contextFileUploadCapBytes = (limits: ContextFileSizeLimits): number =>
  Math.max(limits.audioVideoMaxBytes, limits.otherFileMaxBytes);

/** The accepted MIME type of a local file, from its extension; null when the app does not accept that type. */
export const contextFileMimeTypeForPath = (filePath: string): string | null => {
  const mimeType = mimeLookup(filePath);
  return mimeType && allowedMimeTypes.has(mimeType) ? mimeType : null;
};

const sanitizeFilenameStem = (filename: string): string => {
  const stem = path.parse(filename).name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return stem || "file";
};

const sanitizeFilenameExtension = (filename: string, mimetype: string): string => {
  const preferredExtension = mimeExtension(mimetype) ?? path.extname(filename).replace(/^\./, "");
  const normalizedExtension = String(preferredExtension || "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  return normalizedExtension ? `.${normalizedExtension}` : "";
};

export const buildStoredFilename = (filename: string, mimetype: string): string => {
  const token = randomUUID().replace(/-/g, "").slice(0, 12);
  const stem = sanitizeFilenameStem(filename).slice(0, 80);
  const extension = sanitizeFilenameExtension(filename, mimetype);
  return `ctx_${token}__${stem}${extension}`;
};
