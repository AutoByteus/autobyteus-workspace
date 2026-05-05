import {
  normalizeExplicitTeamCommunicationReferenceFiles,
  type ExplicitTeamCommunicationReferenceFileValidationError,
} from "../../services/team-communication/team-communication-reference-files.js";

type SendMessageToValidationError = {
  code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS" | "INVALID_MESSAGE_CONTENT" | "INVALID_REFERENCE_FILES";
  message: string;
};

export type SendMessageToToolArguments = {
  recipientName: string | null;
  content: string | null;
  messageType: string;
  referenceFiles: string[];
  referenceFilesError: ExplicitTeamCommunicationReferenceFileValidationError | null;
};

const LOG_PREFIX = "[team-communication]";

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readReferenceFiles = (toolArguments: Record<string, unknown>): unknown =>
  Object.prototype.hasOwnProperty.call(toolArguments, "reference_files")
    ? toolArguments.reference_files
    : toolArguments.referenceFiles;

export const parseSendMessageToToolArguments = (
  toolArguments: Record<string, unknown>,
): SendMessageToToolArguments => {
  const referenceFilesResult = normalizeExplicitTeamCommunicationReferenceFiles(
    readReferenceFiles(toolArguments),
  );

  return {
    recipientName:
      readString(toolArguments.recipient_name) ??
      readString(toolArguments.recipientName) ??
      readString(toolArguments.recipient),
    content: readString(toolArguments.content),
    messageType:
      readString(toolArguments.message_type) ??
      readString(toolArguments.messageType) ??
      "agent_message",
    referenceFiles: referenceFilesResult.ok ? referenceFilesResult.referenceFiles : [],
    referenceFilesError: referenceFilesResult.ok ? null : referenceFilesResult.error,
  };
};

export const validateParsedSendMessageToToolArguments = (
  toolName: string,
  input: SendMessageToToolArguments,
): SendMessageToValidationError | null => {
  if (!input.recipientName?.trim()) {
    return {
      code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
      message: `${toolName} requires a non-empty recipient_name.`,
    };
  }
  if (!input.content?.trim()) {
    return {
      code: "INVALID_MESSAGE_CONTENT",
      message: `${toolName} requires a non-empty content field.`,
    };
  }
  if (input.referenceFilesError) {
    const location = input.referenceFilesError.index === undefined
      ? ""
      : ` index=${input.referenceFilesError.index}`;
    console.warn(
      `${LOG_PREFIX} invalid reference_files validation toolName=${toolName}${location} reason=${input.referenceFilesError.reason}`,
    );
    return {
      code: "INVALID_REFERENCE_FILES",
      message: `${toolName} reference_files must be an array of absolute local file path strings. Invalid ${input.referenceFilesError.reason}.`,
    };
  }
  return null;
};
