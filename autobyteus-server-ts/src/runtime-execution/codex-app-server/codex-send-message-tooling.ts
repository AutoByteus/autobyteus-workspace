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

export const resolveSendMessageToEnabledFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => {
  const raw = metadata?.sendMessageToEnabled ?? metadata?.send_message_to_enabled;
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return false;
};

export type CodexTeamManifestMember = {
  memberName: string;
  role: string | null;
  description: string | null;
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeTeamManifestMember = (value: unknown): CodexTeamManifestMember | null => {
  const row = asObject(value);
  if (!row) {
    return null;
  }
  const memberName =
    asString(row.memberName ?? row.member_name ?? row.name)?.trim() ?? null;
  if (!memberName) {
    return null;
  }
  const role = asString(row.role)?.trim() ?? null;
  const description =
    asString(row.description ?? row.summary)?.trim() ?? null;
  return {
    memberName,
    role,
    description,
  };
};

export const resolveTeamManifestMembersFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): CodexTeamManifestMember[] => {
  const source = metadata?.teamMemberManifest ?? metadata?.team_member_manifest;
  const rows = asArray(source);
  const members: CodexTeamManifestMember[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeTeamManifestMember(row);
    if (!normalized) {
      continue;
    }
    const dedupeKey = normalizeName(normalized.memberName);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    members.push(normalized);
  }
  return members;
};

export const resolveAllowedRecipientNamesFromManifest = (options: {
  currentMemberName: string | null;
  members: CodexTeamManifestMember[];
}): string[] => {
  const self = options.currentMemberName ? normalizeName(options.currentMemberName) : null;
  return options.members
    .map((member) => member.memberName)
    .filter((name) => name.trim().length > 0)
    .filter((name) => (self ? normalizeName(name) !== self : true));
};

const buildSendMessageToDynamicToolSpec = (allowedRecipientNames: string[]): JsonObject => ({
  name: "send_message_to",
  description: "Send a message to another member in the same team run.",
  inputSchema: {
    type: "object",
    properties: {
      recipient_name: {
        type: "string",
        description: "Recipient team member name.",
        ...(allowedRecipientNames.length > 0
          ? {
              enum: allowedRecipientNames,
            }
          : {}),
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
  sendMessageToEnabled: boolean;
  allowedRecipientNames?: string[] | null;
}): JsonObject[] | null => {
  if (!options.interAgentRelayEnabled || !options.teamRunId || !options.sendMessageToEnabled) {
    return null;
  }
  return [
    buildSendMessageToDynamicToolSpec(
      Array.isArray(options.allowedRecipientNames) ? options.allowedRecipientNames : [],
    ),
  ];
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
  const payloadTool = asObject(params.tool);
  const itemTool = asObject(item?.tool);
  return (
    asString(params.tool) ??
    asString(params.toolName) ??
    asString(params.tool_name) ??
    asString(payloadTool?.name) ??
    asString(payloadTool?.toolName) ??
    asString(payloadTool?.tool_name) ??
    asString(item?.tool) ??
    asString(item?.toolName) ??
    asString(item?.tool_name) ??
    asString(itemTool?.name) ??
    asString(itemTool?.toolName) ??
    asString(itemTool?.tool_name) ??
    asString(item?.name) ??
    asString(item?.command) ??
    asString(params.command_name) ??
    asString(params.name) ??
    asString(params.command)
  );
};

export const resolveDynamicToolArgsFromParams = (params: JsonObject): Record<string, unknown> => {
  const item = asObject(params.item);
  const payloadTool = asObject(params.tool);
  const itemTool = asObject(item?.tool);
  const args =
    parseJsonObject(params.arguments) ??
    parseJsonObject(params.args) ??
    parseJsonObject(params.input) ??
    parseJsonObject(payloadTool?.arguments) ??
    parseJsonObject(payloadTool?.args) ??
    parseJsonObject(item?.arguments) ??
    parseJsonObject(item?.args) ??
    parseJsonObject(item?.input) ??
    parseJsonObject(itemTool?.arguments) ??
    parseJsonObject(itemTool?.args) ??
    parseJsonObject(itemTool?.input);
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
