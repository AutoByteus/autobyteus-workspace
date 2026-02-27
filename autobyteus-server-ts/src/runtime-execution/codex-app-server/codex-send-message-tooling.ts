import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";

export type ApprovalInvocationCandidates = {
  primary: string | null;
  aliases: string[];
  itemId: string | null;
  approvalId: string | null;
};

export const resolveApprovalInvocationCandidates = (
  params: JsonObject,
): ApprovalInvocationCandidates => {
  const itemId = asString(params.itemId);
  const approvalId = asString(params.approvalId);
  if (!itemId) {
    return { primary: null, aliases: [], itemId: null, approvalId };
  }
  if (!approvalId) {
    return { primary: itemId, aliases: [], itemId, approvalId: null };
  }
  return {
    primary: `${itemId}:${approvalId}`,
    aliases: [itemId],
    itemId,
    approvalId,
  };
};

export const resolveTeamRunIdFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): string | null => asString(metadata?.teamRunId ?? metadata?.team_run_id);

export const resolveMemberNameFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): string | null => asString(metadata?.memberName ?? metadata?.member_name);

const buildSendMessageToDynamicToolSpec = (): JsonObject => ({
  name: "send_message_to",
  description: "Send a message to another member in the same team run.",
  inputSchema: {
    type: "object",
    properties: {
      recipient_name: {
        type: "string",
        description: "Recipient team member name.",
      },
      content: {
        type: "string",
        description: "Message content to deliver.",
      },
      message_type: {
        type: "string",
        description: "Optional message type label.",
      },
    },
    required: ["recipient_name", "content"],
    additionalProperties: false,
  },
});

export const resolveDynamicTools = (options: {
  teamRunId: string | null;
  interAgentRelayEnabled: boolean;
}): JsonObject[] | null => {
  if (!options.interAgentRelayEnabled || !options.teamRunId) {
    return null;
  }
  return [buildSendMessageToDynamicToolSpec()];
};

export const resolveCommandNameFromApprovalParams = (params: JsonObject): string | null => {
  const command = asObject(params.command);
  const commandExecution = asObject(params.commandExecution);
  const item = asObject(params.item);
  const payloadCommand = asObject(item?.command);
  return (
    asString(params.command_name) ??
    asString(params.tool_name) ??
    asString(params.name) ??
    asString(command?.name) ??
    asString(command?.command) ??
    asString(commandExecution?.name) ??
    asString(commandExecution?.command) ??
    asString(payloadCommand?.name) ??
    asString(payloadCommand?.command)
  );
};

export const resolveCommandArgsFromApprovalParams = (
  params: JsonObject,
): Record<string, unknown> => {
  const command = asObject(params.command);
  const commandExecution = asObject(params.commandExecution);
  const item = asObject(params.item);
  const payloadCommand = asObject(item?.command);
  const args =
    asObject(params.arguments) ??
    asObject(params.args) ??
    asObject(command?.arguments) ??
    asObject(command?.args) ??
    asObject(commandExecution?.arguments) ??
    asObject(commandExecution?.args) ??
    asObject(payloadCommand?.arguments) ??
    asObject(payloadCommand?.args);
  return args ?? {};
};

const parseJsonObject = (value: unknown): JsonObject | null => {
  const direct = asObject(value);
  if (direct) {
    return direct;
  }
  if (typeof value !== "string") {
    return null;
  }
  try {
    return asObject(JSON.parse(value));
  } catch {
    return null;
  }
};

export const resolveDynamicToolNameFromParams = (params: JsonObject): string | null => {
  const item = asObject(params.item);
  const tool = asObject(item?.tool);
  return (
    asString(params.tool) ??
    asString(params.tool_name) ??
    asString(params.name) ??
    asString(tool?.name)
  );
};

export const resolveDynamicToolArgsFromParams = (params: JsonObject): Record<string, unknown> => {
  const item = asObject(params.item);
  const tool = asObject(item?.tool);
  const args =
    parseJsonObject(params.arguments) ??
    parseJsonObject(params.args) ??
    parseJsonObject(params.input) ??
    parseJsonObject(tool?.arguments) ??
    parseJsonObject(tool?.args);
  return args ?? {};
};

export const isSendMessageToToolName = (toolName: string | null): boolean => {
  if (!toolName) {
    return false;
  }
  const normalized = toolName.trim().toLowerCase();
  return (
    normalized === "send_message_to" ||
    normalized.endsWith(".send_message_to") ||
    normalized.endsWith("/send_message_to")
  );
};

export const toDynamicToolResponse = (input: {
  success: boolean;
  message: string;
}): JsonObject => ({
  success: input.success,
  contentItems: [
    {
      type: "inputText",
      text: input.message,
    },
  ],
});
