import path from 'node:path';
import { URL } from 'node:url';
import { ContextFileType } from './context-file-type.js';

function extractPath(uri: string): string {
  try {
    const parsed = new URL(uri);
    return parsed.pathname;
  } catch {
    return uri;
  }
}

export class ContextFile {
  uri: string;
  fileType: ContextFileType;
  fileName: string | null;
  metadata: Record<string, unknown>;

  constructor(
    uri: string,
    fileType: ContextFileType = ContextFileType.UNKNOWN,
    fileName: string | null = null,
    metadata: Record<string, unknown> = {}
  ) {
    if (!uri || typeof uri !== 'string') {
      throw new TypeError(`ContextFile uri must be a non-empty string, got ${typeof uri}`);
    }

    this.uri = uri;
    this.fileType = fileType;
    this.fileName = fileName;
    this.metadata = metadata ?? {};

    if (!this.fileName) {
      try {
        const parsedPath = extractPath(this.uri);
        this.fileName = path.basename(parsedPath);
      } catch {
        this.fileName = 'unknown_file';
      }
    }

    if (this.fileType === ContextFileType.UNKNOWN) {
      const inferred = ContextFileType.fromPath(this.uri);
      if (inferred !== ContextFileType.UNKNOWN) {
        this.fileType = inferred;
      }
    }
  }

  toString(): string {
    const metaKeys = Object.keys(this.metadata ?? {});
    return `ContextFile(uri='${this.uri}', fileName='${this.fileName}', fileType='${this.fileType}', metadata_keys=${metaKeys})`;
  }
}
