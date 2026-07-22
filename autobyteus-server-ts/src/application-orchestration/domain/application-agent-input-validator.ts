import type {
  ApplicationAgentInput,
  ApplicationRuntimeInputContextFile,
} from "@autobyteus/application-sdk-contracts";
import {
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_COUNT_LIMIT,
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_URI_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_METADATA_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_TEXT_BYTES_LIMIT,
} from "../../application-communication-limits.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key));
const bytesWithin = (value: string, limit: number): boolean => Buffer.byteLength(value, "utf8") <= limit;
const isNullableBoundedString = (value: unknown): boolean =>
  value === undefined || value === null ||
  (typeof value === "string" && bytesWithin(value, APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT));
const isMetadata = (value: unknown): value is Record<string, unknown> | null | undefined => {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" && bytesWithin(serialized, APPLICATION_AGENT_INPUT_METADATA_BYTES_LIMIT);
  } catch {
    return false;
  }
};
const isContextFile = (value: unknown): value is ApplicationRuntimeInputContextFile => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["uri", "fileType", "fileName", "metadata"])) return false;
  return typeof value.uri === "string" && Boolean(value.uri.trim())
    && bytesWithin(value.uri, APPLICATION_AGENT_INPUT_CONTEXT_FILE_URI_BYTES_LIMIT)
    && isNullableBoundedString(value.fileType)
    && isNullableBoundedString(value.fileName)
    && isMetadata(value.metadata);
};

export const isApplicationAgentInputWithinLimits = (value: unknown): value is ApplicationAgentInput => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["text", "contextFiles", "metadata"]) ||
      typeof value.text !== "string" || !bytesWithin(value.text, APPLICATION_AGENT_INPUT_TEXT_BYTES_LIMIT) ||
      !isMetadata(value.metadata)) return false;
  return value.contextFiles === undefined || value.contextFiles === null ||
    (Array.isArray(value.contextFiles) &&
      value.contextFiles.length <= APPLICATION_AGENT_INPUT_CONTEXT_FILE_COUNT_LIMIT &&
      value.contextFiles.every(isContextFile));
};

export const requireApplicationAgentInputWithinLimits = (value: unknown): ApplicationAgentInput => {
  if (!isApplicationAgentInputWithinLimits(value)) {
    throw new Error("Application agent input is invalid or exceeds its delivery limit.");
  }
  return value;
};
