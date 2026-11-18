import {
  normalizeExplicitAgentCommunicationReferenceFiles,
  type ExplicitAgentCommunicationReferenceFileValidationError,
} from "./agent-communication-reference-files.js";
import {
  buildSendMessageTargetSelector,
  type SendMessageTargetSelector,
} from "../domain/send-message-target-selector.js";

import { SEND_MESSAGE_TO_NODE_WITH_ADDRESS } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

type SendMessageToValidationError = {
  code: "TARGET_SELECTOR_INVALID" | "UNSUPPORTED_TARGET_SELECTOR_ALIAS" | "INVALID_MESSAGE_CONTENT" | "INVALID_REFERENCE_FILES" | "INVALID_TOOL_ARGUMENTS";
  message: string;
};

export type SendMessageToToolArguments = {
  recipientAddress: string | null;
  targetAgentRunId: string | null;
  /** autobyteus-492: the peer node of the target run, trimmed; `null` when not given. */
  node: string | null;
  /** `node` was given but is not a non-empty string. */
  nodeInvalid: boolean;
  target: SendMessageTargetSelector | null;
  unsupportedTargetSelectorFields: string[];
  content: string | null;
  messageType: string;
  referenceFiles: string[];
  referenceFilesError: ExplicitAgentCommunicationReferenceFileValidationError | null;
};

const LOG_PREFIX = "[agent-communication]";

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readReferenceFiles = (toolArguments: Record<string, unknown>): unknown =>
  Object.prototype.hasOwnProperty.call(toolArguments, "reference_files")
    ? toolArguments.reference_files
    : toolArguments.referenceFiles;

const unsupportedTargetSelectorAliases = (toolArguments: Record<string, unknown>): string[] =>
  ["recipient", "recipientAddress", "targetAgentRunId"].filter((fieldName) =>
    Object.prototype.hasOwnProperty.call(toolArguments, fieldName),
  );

export const parseSendMessageToToolArguments = (
  toolArguments: Record<string, unknown>,
): SendMessageToToolArguments => {
  const referenceFilesResult = normalizeExplicitAgentCommunicationReferenceFiles(
    readReferenceFiles(toolArguments),
  );
  const recipientAddress =
    readString(toolArguments.recipient_address);
  const targetAgentRunId =
    readString(toolArguments.target_agent_run_id);
  const targetResult = buildSendMessageTargetSelector({
    recipientAddress,
    targetAgentRunId,
  });

  const node = toolArguments.node;
  const nodeGiven = node !== undefined && node !== null;
  return {
    recipientAddress,
    targetAgentRunId,
    node: nodeGiven && typeof node === "string" && node.trim() ? node.trim() : null,
    nodeInvalid: nodeGiven && (typeof node !== "string" || !node.trim()),
    target: targetResult.ok ? targetResult.target : null,
    unsupportedTargetSelectorFields: unsupportedTargetSelectorAliases(toolArguments),
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
  if (input.unsupportedTargetSelectorFields.length > 0) {
    return {
      code: "UNSUPPORTED_TARGET_SELECTOR_ALIAS",
      message: `${toolName} target selector fields must use recipient_address or target_agent_run_id only. Unsupported field(s): ${input.unsupportedTargetSelectorFields.join(", ")}.`,
    };
  }
  const targetResult = buildSendMessageTargetSelector({
    recipientAddress: input.recipientAddress,
    targetAgentRunId: input.targetAgentRunId,
    toolName,
  });
  if (!targetResult.ok) {
    return {
      code: "TARGET_SELECTOR_INVALID",
      message: targetResult.message,
    };
  }
  if (input.nodeInvalid) {
    return { code: "INVALID_TOOL_ARGUMENTS", message: `${toolName} node must be the name of a peer node registered on this node; leave it out for an agent of this node.` };
  }
  if (input.node !== null && targetResult.target.kind === "recipient_address") {
    return { code: "INVALID_TOOL_ARGUMENTS", message: SEND_MESSAGE_TO_NODE_WITH_ADDRESS };
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
