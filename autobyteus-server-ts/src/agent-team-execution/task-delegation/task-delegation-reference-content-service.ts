import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";
import {
  getTaskDelegationProjectionService,
  type TaskDelegationProjectionService,
  type TaskReferenceProjection,
} from "./task-delegation-projection-service.js";

export type TaskDelegationReferenceContentErrorCode =
  | "REFERENCE_NOT_FOUND"
  | "INVALID_REFERENCE_PATH"
  | "REFERENCE_CONTENT_UNAVAILABLE"
  | "REFERENCE_CONTENT_FORBIDDEN";

export class TaskDelegationReferenceContentError extends Error {
  constructor(
    readonly code: TaskDelegationReferenceContentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TaskDelegationReferenceContentError";
  }
}

export interface ResolvedTaskDelegationReferenceContent {
  record: TaskDelegationRecordV1;
  reference: TaskReferenceProjection;
  absolutePath: string;
  mimeType: string;
  stream: fs.ReadStream;
}

const isReadableFile = (absolutePath: string): boolean => {
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return false;
    fs.accessSync(absolutePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "EACCES") {
      throw new TaskDelegationReferenceContentError(
        "REFERENCE_CONTENT_FORBIDDEN",
        "Referenced task file content is not readable.",
      );
    }
    return false;
  }
};

export class TaskDelegationReferenceContentService {
  constructor(
    private readonly projections: Pick<TaskDelegationProjectionService, "resolveReference"> = getTaskDelegationProjectionService(),
  ) {}

  async resolveContent(input: {
    teamRunId: string;
    taskId: string;
    referenceId: string;
  }): Promise<ResolvedTaskDelegationReferenceContent> {
    const teamRunId = input.teamRunId.trim();
    const resolved = await this.projections.resolveReference({
      rootTeamRunId: teamRunId,
      taskId: input.taskId,
      referenceId: input.referenceId,
    });
    if (!resolved) {
      throw new TaskDelegationReferenceContentError(
        "REFERENCE_NOT_FOUND",
        "Task reference was not found.",
      );
    }

    if (!path.isAbsolute(resolved.reference.path)) {
      throw new TaskDelegationReferenceContentError(
        "INVALID_REFERENCE_PATH",
        "Stored task reference path is invalid.",
      );
    }

    const absolutePath = resolved.reference.path;
    if (!isReadableFile(absolutePath)) {
      throw new TaskDelegationReferenceContentError(
        "REFERENCE_CONTENT_UNAVAILABLE",
        "Referenced task file content is not available.",
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

let cachedContentService: TaskDelegationReferenceContentService | null = null;

export const getTaskDelegationReferenceContentService = (): TaskDelegationReferenceContentService => {
  if (!cachedContentService) {
    cachedContentService = new TaskDelegationReferenceContentService();
  }
  return cachedContentService;
};
