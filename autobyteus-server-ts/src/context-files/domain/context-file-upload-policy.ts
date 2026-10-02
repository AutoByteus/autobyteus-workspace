import path from "node:path";
import { randomUUID } from "node:crypto";
import { extension as mimeExtension } from "mime-types";
export const CONTEXT_FILE_MAX_BYTES = 25 * 1024 * 1024;
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
