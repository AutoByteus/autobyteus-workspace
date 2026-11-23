import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";
import type { CollaborationRootKind } from "@autobyteus/collaboration-stream-contracts";
import { createRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { messageReferenceId } from "../../agent-team-execution/services/team-reference-file-projection.js";
import type { RunViewMessagesReader } from "./run-view-messages-reader.js";

export type MessageReferenceContentErrorCode =
  | "REFERENCE_NOT_FOUND"
  | "INVALID_REFERENCE_PATH"
  | "REFERENCE_CONTENT_UNAVAILABLE"
  | "REFERENCE_CONTENT_FORBIDDEN";

export class MessageReferenceContentError extends Error {
  constructor(readonly code: MessageReferenceContentErrorCode, message: string) {
    super(message);
    this.name = "MessageReferenceContentError";
  }
}

export type ResolvedMessageReferenceContent = Readonly<{
  absolutePath: string;
  mimeType: string;
  stream: fs.ReadStream;
}>;

const required = (value: string, name: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new MessageReferenceContentError("REFERENCE_NOT_FOUND", `${name} is required.`);
  return normalized;
};

/** A regular file this process can read; a file it may not read is refused as such, anything else is unavailable. */
const isReadableFile = (absolutePath: string): boolean => {
  try {
    if (!fs.statSync(absolutePath).isFile()) return false;
    fs.accessSync(absolutePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "EACCES") {
      throw new MessageReferenceContentError("REFERENCE_CONTENT_FORBIDDEN", "The referenced file is not readable.");
    }
    return false;
  }
};

/**
 * A reference file of a message of one run's view (autobyteus-615, DS-001): the view (the same composition its message list
 * is read from, `RunViewMessagesReader`), then the message by ID, then the reference by the one ID rule
 * (`messageReferenceId`), then the file. It serves only a path that a message of that view names (QR-001); whichever run's
 * log holds the message, the view finds it, as the list did.
 */
export class MessageReferenceContentReader {
  constructor(private readonly dependencies: Readonly<{ views: Pick<RunViewMessagesReader, "read"> }>) {}

  async resolve(input: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; messageId: string; referenceId: string }>):
    Promise<ResolvedMessageReferenceContent> {
    const messageId = required(input.messageId, "messageId");
    const referenceId = required(input.referenceId, "referenceId");
    const view = createRootExecutionIdentity({ rootSubjectKind: input.rootKind, rootRunId: required(input.rootRunId, "rootRunId") });
    const message = (await this.dependencies.views.read(view)).messages.find((candidate) => candidate.messageId === messageId);
    const filePath = message?.referenceFiles.find((candidate) => messageReferenceId(messageId, candidate) === referenceId);
    if (!filePath) {
      throw new MessageReferenceContentError("REFERENCE_NOT_FOUND", "The message or its reference was not found in this conversation.");
    }
    if (!path.isAbsolute(filePath)) {
      throw new MessageReferenceContentError("INVALID_REFERENCE_PATH", "The stored reference path is invalid.");
    }
    if (!isReadableFile(filePath)) {
      throw new MessageReferenceContentError("REFERENCE_CONTENT_UNAVAILABLE", "The referenced file is not available.");
    }
    return Object.freeze({
      absolutePath: filePath,
      mimeType: String(lookupMime(filePath) || "text/plain"),
      stream: fs.createReadStream(filePath),
    });
  }
}

let processReader: MessageReferenceContentReader | null = null;

/** The composition root sets the process reader it created, beside the participant messages reader; the returned function releases it. */
export const setProcessMessageReferenceContentReader = (reader: MessageReferenceContentReader): (() => void) => {
  processReader = reader;
  return () => { if (processReader === reader) processReader = null; };
};

/** The process reader, for the reference route; a process that serves the route composes it, so a missing one throws. */
export const getMessageReferenceContentReader = (): MessageReferenceContentReader => {
  if (!processReader) throw new Error("The message reference content reader is created by the composition root.");
  return processReader;
};
