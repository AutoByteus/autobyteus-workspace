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

  toDict(): Record<string, unknown> {
    return {
      uri: this.uri,
      file_type: this.fileType,
      file_name: this.fileName,
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, unknown>): ContextFile {
    const payload = data ?? {};
    if (!payload || typeof payload !== 'object' || typeof (payload as { uri?: unknown }).uri !== 'string') {
      throw new Error("ContextFile 'uri' in dictionary must be a string.");
    }

    const payloadRecord = payload as Record<string, unknown>;
    const fileTypeStr = payloadRecord.file_type ?? ContextFileType.UNKNOWN;
    const fileType = Object.values(ContextFileType).includes(fileTypeStr as ContextFileType)
      ? (fileTypeStr as ContextFileType)
      : ContextFileType.UNKNOWN;
    const fileName = typeof payloadRecord.file_name === 'string' ? payloadRecord.file_name : null;
    const metadata =
      payloadRecord.metadata && typeof payloadRecord.metadata === 'object' && !Array.isArray(payloadRecord.metadata)
        ? (payloadRecord.metadata as Record<string, unknown>)
        : {};

    return new ContextFile(
      payloadRecord.uri as string,
      fileType,
      fileName,
      metadata
    );
  }

  toString(): string {
    const metaKeys = Object.keys(this.metadata ?? {});
    return `ContextFile(uri='${this.uri}', fileName='${this.fileName}', fileType='${this.fileType}', metadata_keys=${metaKeys})`;
  }
}
