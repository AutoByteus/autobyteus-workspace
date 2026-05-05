import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import {
  MessageFileReferenceProjectionService,
  getMessageFileReferenceProjectionService,
} from "./message-file-reference-projection-service.js";
import type { MessageFileReferenceEntry } from "./message-file-reference-types.js";

const LOG_PREFIX = "[message-file-reference]";
const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type MessageFileReferenceContentErrorCode =
  | "REFERENCE_NOT_FOUND"
  | "INVALID_REFERENCE_PATH"
  | "REFERENCE_CONTENT_UNAVAILABLE"
  | "REFERENCE_CONTENT_FORBIDDEN";

export class MessageFileReferenceContentError extends Error {
  readonly code: MessageFileReferenceContentErrorCode;

  constructor(code: MessageFileReferenceContentErrorCode, message: string) {
    super(message);
    this.name = "MessageFileReferenceContentError";
    this.code = code;
  }
}

export interface ResolvedMessageFileReferenceContent {
  entry: MessageFileReferenceEntry;
  absolutePath: string;
  mimeType: string;
  stream: fs.ReadStream;
}

const isReadableFile = (absolutePath: string): boolean => {
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      return false;
    }
    fs.accessSync(absolutePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "EACCES") {
      throw new MessageFileReferenceContentError(
        "REFERENCE_CONTENT_FORBIDDEN",
        "Referenced artifact content is not readable.",
      );
    }
    return false;
  }
};

const logContentResolveFailure = (
  input: { teamRunId: string; referenceId: string },
  code: MessageFileReferenceContentErrorCode,
): void => {
  logger.warn(
    `${LOG_PREFIX} content resolve failure teamRunId=${input.teamRunId} referenceId=${input.referenceId} reason=${code}`,
  );
};

export class MessageFileReferenceContentService {
  constructor(
    private readonly projectionService: MessageFileReferenceProjectionService =
      getMessageFileReferenceProjectionService(),
  ) {}

  async resolveContent(input: {
    teamRunId: string;
    referenceId: string;
  }): Promise<ResolvedMessageFileReferenceContent> {
    const entry = await this.projectionService.resolveReference(input);
    if (!entry) {
      logContentResolveFailure(input, "REFERENCE_NOT_FOUND");
      throw new MessageFileReferenceContentError(
        "REFERENCE_NOT_FOUND",
        "Message file reference was not found.",
      );
    }

    if (!path.isAbsolute(entry.path)) {
      logContentResolveFailure(input, "INVALID_REFERENCE_PATH");
      throw new MessageFileReferenceContentError(
        "INVALID_REFERENCE_PATH",
        "Stored message file reference path is invalid.",
      );
    }

    const absolutePath = entry.path;
    let isReadable: boolean;
    try {
      isReadable = isReadableFile(absolutePath);
    } catch (error) {
      if (error instanceof MessageFileReferenceContentError) {
        logContentResolveFailure(input, error.code);
      }
      throw error;
    }
    if (!isReadable) {
      logContentResolveFailure(input, "REFERENCE_CONTENT_UNAVAILABLE");
      throw new MessageFileReferenceContentError(
        "REFERENCE_CONTENT_UNAVAILABLE",
        "Referenced artifact content is not available.",
      );
    }

    const mimeType = (lookupMime(absolutePath) || (entry.type === "file" ? "text/plain" : "application/octet-stream")).toString();
    return {
      entry,
      absolutePath,
      mimeType,
      stream: fs.createReadStream(absolutePath),
    };
  }
}

let cachedContentService: MessageFileReferenceContentService | null = null;

export const getMessageFileReferenceContentService = (): MessageFileReferenceContentService => {
  if (!cachedContentService) {
    cachedContentService = new MessageFileReferenceContentService();
  }
  return cachedContentService;
};
