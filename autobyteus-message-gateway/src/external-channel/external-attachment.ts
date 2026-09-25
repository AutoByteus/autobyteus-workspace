import { throwParseError } from './errors.js';

export type ExternalAttachment = {
  kind: string;
  url: string;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  metadata: Record<string, unknown>;
};

export function parseExternalAttachment(input: unknown): ExternalAttachment {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throwParseError('INVALID_ATTACHMENT', 'Attachment must be an object.', 'attachments');
  }

  const record = input as Record<string, unknown>;
  const kindRaw = record.kind ?? record.type;
  const urlRaw = record.url ?? record.uri;
  const mimeTypeRaw = record.mimeType ?? record.mime_type ?? null;
  const fileNameRaw = record.fileName ?? record.file_name ?? null;
  const sizeBytesRaw = record.sizeBytes ?? record.size_bytes ?? null;
  const metadataRaw = record.metadata ?? {};

  if (typeof kindRaw !== 'string' || kindRaw.trim().length === 0) {
    throwParseError('INVALID_ATTACHMENT', 'Attachment kind is required.', 'attachments.kind');
  }
  if (typeof urlRaw !== 'string' || urlRaw.trim().length === 0) {
    throwParseError('INVALID_ATTACHMENT', 'Attachment URL is required.', 'attachments.url');
  }
  if (mimeTypeRaw !== null && typeof mimeTypeRaw !== 'string') {
    throwParseError('INVALID_ATTACHMENT', 'Attachment mimeType must be a string.', 'attachments.mimeType');
  }
  if (fileNameRaw !== null && typeof fileNameRaw !== 'string') {
    throwParseError('INVALID_ATTACHMENT', 'Attachment fileName must be a string.', 'attachments.fileName');
  }
  if (sizeBytesRaw !== null && (typeof sizeBytesRaw !== 'number' || !Number.isFinite(sizeBytesRaw) || sizeBytesRaw < 0)) {
    throwParseError('INVALID_ATTACHMENT', 'Attachment sizeBytes must be a non-negative number.', 'attachments.sizeBytes');
  }
  if (typeof metadataRaw !== 'object' || metadataRaw === null || Array.isArray(metadataRaw)) {
    throwParseError('INVALID_ATTACHMENT', 'Attachment metadata must be an object.', 'attachments.metadata');
  }

  return {
    kind: kindRaw.trim(),
    url: urlRaw.trim(),
    mimeType: mimeTypeRaw === null ? null : mimeTypeRaw.trim(),
    fileName: fileNameRaw === null ? null : fileNameRaw.trim(),
    sizeBytes: sizeBytesRaw === null ? null : sizeBytesRaw,
    metadata: metadataRaw as Record<string, unknown>
  };
}

export function parseExternalAttachmentList(input: unknown): ExternalAttachment[] {
  if (input === undefined || input === null) {
    return [];
  }
  if (!Array.isArray(input)) {
    throwParseError('INVALID_ATTACHMENT', 'Attachments must be an array.', 'attachments');
  }
  return input.map((item) => parseExternalAttachment(item));
}

