import type {
  AgentRunMessageFileReferenceArtifactType,
  AgentRunMessageFileReferencePayload,
} from "../../../domain/agent-run-message-file-reference.js";
import { inferArtifactType } from "../../../../utils/artifact-utils.js";
import {
  buildMessageFileReferenceId,
  normalizeMessageFileReferencePath,
} from "../../../../services/message-file-references/message-file-reference-identity.js";

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const inferMessageFileReferenceArtifactType = (
  pathValue: string,
): AgentRunMessageFileReferenceArtifactType => {
  const inferred = inferArtifactType(pathValue);
  return inferred === "file"
    || inferred === "image"
    || inferred === "audio"
    || inferred === "video"
    || inferred === "pdf"
    || inferred === "csv"
    || inferred === "excel"
    ? inferred
    : "other";
};

export const buildMessageFileReferencePayload = (input: {
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  messageType: string;
  path: string;
  timestamp?: string;
}): AgentRunMessageFileReferencePayload => {
  const normalizedPath = normalizeMessageFileReferencePath(input.path);
  const timestamp = input.timestamp ?? new Date().toISOString();

  return {
    referenceId: buildMessageFileReferenceId({
      teamRunId: input.teamRunId,
      senderRunId: input.senderRunId,
      receiverRunId: input.receiverRunId,
      path: normalizedPath,
    }),
    teamRunId: input.teamRunId,
    senderRunId: input.senderRunId,
    senderMemberName: normalizeOptionalString(input.senderMemberName),
    receiverRunId: input.receiverRunId,
    receiverMemberName: normalizeOptionalString(input.receiverMemberName),
    path: normalizedPath,
    type: inferMessageFileReferenceArtifactType(normalizedPath),
    messageType: input.messageType,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
