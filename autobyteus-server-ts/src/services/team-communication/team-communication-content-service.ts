import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import {
  TeamCommunicationProjectionService,
  getTeamCommunicationProjectionService,
} from "./team-communication-projection-service.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationReferenceFile,
} from "./team-communication-types.js";

const LOG_PREFIX = "[team-communication]";
const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type TeamCommunicationReferenceContentErrorCode =
  | "REFERENCE_NOT_FOUND"
  | "INVALID_REFERENCE_PATH"
  | "REFERENCE_CONTENT_UNAVAILABLE"
  | "REFERENCE_CONTENT_FORBIDDEN";

export class TeamCommunicationReferenceContentError extends Error {
  readonly code: TeamCommunicationReferenceContentErrorCode;

  constructor(code: TeamCommunicationReferenceContentErrorCode, message: string) {
    super(message);
    this.name = "TeamCommunicationReferenceContentError";
    this.code = code;
  }
}

export interface ResolvedTeamCommunicationReferenceContent {
  message: TeamCommunicationMessage;
  reference: TeamCommunicationReferenceFile;
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
      throw new TeamCommunicationReferenceContentError(
        "REFERENCE_CONTENT_FORBIDDEN",
        "Referenced communication file content is not readable.",
      );
    }
    return false;
  }
};

const logContentResolveFailure = (
  input: { teamRunId: string; messageId: string; referenceId: string },
  code: TeamCommunicationReferenceContentErrorCode,
): void => {
  logger.warn(
    `${LOG_PREFIX} content resolve failure teamRunId=${input.teamRunId} messageId=${input.messageId} referenceId=${input.referenceId} reason=${code}`,
  );
};

export class TeamCommunicationContentService {
  constructor(
    private readonly projectionService: TeamCommunicationProjectionService =
      getTeamCommunicationProjectionService(),
  ) {}

  async resolveContent(input: {
    teamRunId: string;
    messageId: string;
    referenceId: string;
  }): Promise<ResolvedTeamCommunicationReferenceContent> {
    const resolved = await this.projectionService.resolveReference(input);
    if (!resolved) {
      logContentResolveFailure(input, "REFERENCE_NOT_FOUND");
      throw new TeamCommunicationReferenceContentError(
        "REFERENCE_NOT_FOUND",
        "Team communication reference was not found.",
      );
    }

    if (!path.isAbsolute(resolved.reference.path)) {
      logContentResolveFailure(input, "INVALID_REFERENCE_PATH");
      throw new TeamCommunicationReferenceContentError(
        "INVALID_REFERENCE_PATH",
        "Stored team communication reference path is invalid.",
      );
    }

    const absolutePath = resolved.reference.path;
    let isReadable: boolean;
    try {
      isReadable = isReadableFile(absolutePath);
    } catch (error) {
      if (error instanceof TeamCommunicationReferenceContentError) {
        logContentResolveFailure(input, error.code);
      }
      throw error;
    }
    if (!isReadable) {
      logContentResolveFailure(input, "REFERENCE_CONTENT_UNAVAILABLE");
      throw new TeamCommunicationReferenceContentError(
        "REFERENCE_CONTENT_UNAVAILABLE",
        "Referenced communication file content is not available.",
      );
    }

    const mimeType = (
      lookupMime(absolutePath)
      || (resolved.reference.type === "file" ? "text/plain" : "application/octet-stream")
    ).toString();
    return {
      ...resolved,
      absolutePath,
      mimeType,
      stream: fs.createReadStream(absolutePath),
    };
  }
}

let cachedContentService: TeamCommunicationContentService | null = null;

export const getTeamCommunicationContentService = (): TeamCommunicationContentService => {
  if (!cachedContentService) {
    cachedContentService = new TeamCommunicationContentService();
  }
  return cachedContentService;
};
