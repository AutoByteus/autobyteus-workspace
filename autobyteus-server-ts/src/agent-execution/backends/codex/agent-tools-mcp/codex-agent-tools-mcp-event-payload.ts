import {
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import {
  CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME,
  isCodexAgentToolsSendMessageToolName,
  normalizeCodexAgentToolsToolNameForEvent,
} from "./codex-agent-tools-mcp-materializer.js";

const QUALIFIED_SEND_MESSAGE_TOOL_NAME =
  `${AGENT_TOOLS_MCP_SERVER_NAME}.${SEND_MESSAGE_TO_TOOL_NAME}`;
const DOUBLE_UNDERSCORE_SEND_MESSAGE_TOOL_NAME =
  `${AGENT_TOOLS_MCP_SERVER_NAME}__${SEND_MESSAGE_TO_TOOL_NAME}`;
const AGENT_TOOLS_REDACTED_SERVER_NAME = "agent_tools";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizedKey = (key: string): string =>
  key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const isSecretKey = (key: string): boolean =>
  new Set([
    "authorization",
    "headers",
    "httpheaders",
    "bearer",
    "bearertoken",
    "capabilitytoken",
    "token",
    "tokenhash",
  ]).has(normalizedKey(key));

const valueContainsAgentToolsProviderMarker = (value: unknown): boolean =>
  JSON.stringify(value)?.includes(AGENT_TOOLS_MCP_SERVER_NAME) ?? false;

const valueContainsSecretMarker = (value: unknown): boolean => {
  const serialized = JSON.stringify(value) ?? "";
  return /\bBearer\b/i.test(serialized) || /\bAuthorization\b/i.test(serialized);
};

const shouldOmitValue = (key: string, value: unknown): boolean => {
  const keyToken = normalizedKey(key);
  if (isSecretKey(key) && valueContainsSecretMarker(value)) {
    return true;
  }
  if (
    ["server", "servername", "serverinfo", "mcpserver", "mcpservername"].includes(keyToken) &&
    valueContainsAgentToolsProviderMarker(value)
  ) {
    return true;
  }
  return false;
};

const sanitizeString = (value: string): string => {
  if (normalizeCodexAgentToolsToolNameForEvent(value) === SEND_MESSAGE_TO_TOOL_NAME) {
    return SEND_MESSAGE_TO_TOOL_NAME;
  }
  return value
    .replaceAll(CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME, SEND_MESSAGE_TO_TOOL_NAME)
    .replaceAll(QUALIFIED_SEND_MESSAGE_TOOL_NAME, SEND_MESSAGE_TO_TOOL_NAME)
    .replaceAll(DOUBLE_UNDERSCORE_SEND_MESSAGE_TOOL_NAME, SEND_MESSAGE_TO_TOOL_NAME)
    .replaceAll(AGENT_TOOLS_MCP_SERVER_NAME, AGENT_TOOLS_REDACTED_SERVER_NAME)
    .replace(/Bearer\s+[^\s,}\]]+/gi, "<redacted>")
    .replace(/Authorization/gi, "authorization_redacted");
};

const sanitizeValue = (value: unknown, key = ""): unknown => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, key));
  }
  const objectValue = asObject(value);
  if (!objectValue) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(objectValue)) {
    if (shouldOmitValue(entryKey, entryValue)) {
      continue;
    }
    next[entryKey] = sanitizeValue(entryValue, entryKey);
  }
  return next;
};

const hasAgentToolsProviderMarker = (payload: Record<string, unknown>): boolean => {
  const item = asObject(payload.item);
  const serverName =
    asString(payload.server) ??
    asString(payload.serverName) ??
    asString(item?.server) ??
    asString(item?.serverName) ??
    asString(asObject(item?.serverInfo)?.name);
  return serverName === AGENT_TOOLS_MCP_SERVER_NAME;
};

const hasSendMessageToolName = (payload: Record<string, unknown>): boolean => {
  const item = asObject(payload.item);
  return [
    payload.tool_name,
    payload.tool,
    payload.name,
    item?.tool_name,
    item?.tool,
    item?.name,
  ].some((value) => isCodexAgentToolsSendMessageToolName(asString(value)));
};

export const isCodexAgentToolsSendMessagePayload = (
  payload: Record<string, unknown>,
): boolean => hasSendMessageToolName(payload) || hasAgentToolsProviderMarker(payload);

export const serializeCodexItemEventPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const serialized = serializePayload(payload);
  if (!isCodexAgentToolsSendMessagePayload(serialized)) {
    return serialized;
  }
  return sanitizeValue(serialized) as Record<string, unknown>;
};
