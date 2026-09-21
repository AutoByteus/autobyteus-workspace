import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import type { TaskUpdate } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";
import { AgentOrgRunManager } from "./agent-org-run-manager.js";

export type AgentOrgReferenceContentErrorCode =
  | "REFERENCE_NOT_FOUND"
  | "INVALID_REFERENCE_PATH"
  | "REFERENCE_CONTENT_UNAVAILABLE"
  | "REFERENCE_CONTENT_FORBIDDEN";

export class AgentOrgReferenceContentError extends Error {
  constructor(readonly code: AgentOrgReferenceContentErrorCode, message: string) {
    super(message);
    this.name = "AgentOrgReferenceContentError";
  }
}

export type ResolvedAgentOrgReferenceContent = Readonly<{
  absolutePath: string;
  mimeType: string;
  stream: fs.ReadStream;
}>;

const required = (value: string, name: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
};

const referenceId = (ownerId: string, filePath: string): string =>
  createHash("sha256").update(`${ownerId}\0${filePath}`).digest("hex");

const updateId = (update: TaskUpdate): string =>
  "submissionId" in update ? update.submissionId
    : "reviewId" in update ? update.reviewId
      : update.interruptionId;

const readableFile = (absolutePath: string): boolean => {
  try {
    if (!fs.statSync(absolutePath).isFile()) return false;
    fs.accessSync(absolutePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "EACCES") {
      throw new AgentOrgReferenceContentError(
        "REFERENCE_CONTENT_FORBIDDEN",
        "Referenced AgentOrg file content is not readable.",
      );
    }
    return false;
  }
};

/** Resolves Org-owned sidecar references without reinterpreting them as Team records. */
export class AgentOrgReferenceContentService {
  constructor(private readonly records: Pick<AgentOrgRunManager, "getCollaborationRecordsSnapshot"> = AgentOrgRunManager.getInstance()) {}

  async resolveCommunication(input: Readonly<{
    orgRunId: string;
    messageId: string;
    referenceId: string;
  }>): Promise<ResolvedAgentOrgReferenceContent> {
    const snapshot = await this.records.getCollaborationRecordsSnapshot(required(input.orgRunId, "orgRunId"));
    const messageId = required(input.messageId, "messageId");
    const expectedReferenceId = required(input.referenceId, "referenceId");
    const message = snapshot.messages.messages.find((candidate) => candidate.messageId === messageId);
    const filePath = message?.referenceFiles.find((candidate) =>
      referenceId(messageId, candidate) === expectedReferenceId);
    return this.open(filePath);
  }

  async resolveTask(input: Readonly<{
    orgRunId: string;
    taskId: string;
    referenceId: string;
  }>): Promise<ResolvedAgentOrgReferenceContent> {
    const snapshot = await this.records.getCollaborationRecordsSnapshot(required(input.orgRunId, "orgRunId"));
    const taskId = required(input.taskId, "taskId");
    const expectedReferenceId = required(input.referenceId, "referenceId");
    const task = snapshot.tasks.records.find((candidate) => candidate.taskId === taskId);
    const candidates = task ? [
      ...task.referenceFiles.map((filePath) => ({ ownerId: task.taskId, filePath })),
      ...task.updates.flatMap((update) => "referenceFiles" in update
        ? update.referenceFiles.map((filePath) => ({ ownerId: updateId(update), filePath }))
        : []),
    ] : [];
    return this.open(candidates.find((candidate) =>
      referenceId(candidate.ownerId, candidate.filePath) === expectedReferenceId)?.filePath);
  }

  private open(filePath: string | undefined): ResolvedAgentOrgReferenceContent {
    if (!filePath) {
      throw new AgentOrgReferenceContentError("REFERENCE_NOT_FOUND", "AgentOrg reference was not found.");
    }
    if (!path.isAbsolute(filePath)) {
      throw new AgentOrgReferenceContentError("INVALID_REFERENCE_PATH", "Stored AgentOrg reference path is invalid.");
    }
    if (!readableFile(filePath)) {
      throw new AgentOrgReferenceContentError(
        "REFERENCE_CONTENT_UNAVAILABLE",
        "Referenced AgentOrg file content is not available.",
      );
    }
    return Object.freeze({
      absolutePath: filePath,
      mimeType: String(lookupMime(filePath) || "text/plain"),
      stream: fs.createReadStream(filePath),
    });
  }
}

let cached: AgentOrgReferenceContentService | null = null;
export const getAgentOrgReferenceContentService = (): AgentOrgReferenceContentService =>
  cached ??= new AgentOrgReferenceContentService();
