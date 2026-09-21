import type { ContextFile } from './context-file.js';
import { ContextFileType } from './context-file-type.js';

/** Accepted reference values only: no inferred type, metadata, or physical lookup. */
export type ContextFileReference = Readonly<{
  uri: string;
  fileType: ContextFileType;
  fileName: string | null;
}>;

export function captureContextFileReference(
  file: Pick<ContextFile, 'uri' | 'fileType' | 'fileName'>,
): ContextFileReference {
  if (typeof file.uri !== 'string' || !file.uri.trim()) {
    throw new TypeError('Context file reference uri must be a non-empty string.');
  }
  if (typeof file.fileType !== 'string' || !Object.values(ContextFileType).includes(file.fileType)) {
    throw new TypeError('Context file reference file_type must be a ContextFileType.');
  }
  if (file.fileName !== null && typeof file.fileName !== 'string') {
    throw new TypeError('Context file reference file_name must be a string or null.');
  }
  return Object.freeze({ uri: file.uri, fileType: file.fileType, fileName: file.fileName });
}

export function contextFileReferenceFromDict(value: unknown): ContextFileReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Context file reference must be an object.');
  }
  const record = value as Record<string, unknown>;
  return captureContextFileReference({
    uri: record.uri as string,
    fileType: record.file_type as ContextFileType,
    fileName: record.file_name as string | null,
  });
}

export function contextFileReferenceToDict(value: ContextFileReference): Record<string, unknown> {
  const reference = captureContextFileReference(value);
  return { uri: reference.uri, file_type: reference.fileType, file_name: reference.fileName };
}
