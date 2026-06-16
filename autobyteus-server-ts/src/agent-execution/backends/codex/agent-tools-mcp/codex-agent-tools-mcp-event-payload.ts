import {
  AGENT_TOOLS_MCP_SERVER_NAME,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  isAgentToolsMcpProviderToolName,
  normalizeAgentToolsMcpToolNameForEvent,
  replaceAgentToolsMcpProviderNamesInText,
} from "../../../../agent-tools/mcp/agent-tools-mcp-tool-name.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import {
  normalizeCodexAgentToolsToolNameForEvent,
} from "./codex-agent-tools-mcp-materializer.js";

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
    "accesstoken",
    "apikey",
    "authorization",
    "authorizationheader",
    "authtoken",
    "headers",
    "httpheaders",
    "bearer",
    "bearertoken",
    "capabilitytoken",
    "refreshtoken",
    "secret",
    "sessionid",
    "sessiontoken",
    "token",
    "tokenhash",
  ]).has(normalizedKey(key));

const valueContainsAgentToolsProviderMarker = (value: unknown): boolean => {
  const serialized = JSON.stringify(value) ?? "";
  return serialized.includes(AGENT_TOOLS_MCP_SERVER_NAME) ||
    /\/mcp\/agent-tools\//i.test(serialized);
};

const shouldOmitValue = (key: string, value: unknown): boolean => {
  const keyToken = normalizedKey(key);
  if (isSecretKey(key)) {
    return true;
  }
  if (
    [
      "server",
      "servername",
      "serverinfo",
      "mcpserver",
      "mcpservername",
      "serverurl",
      "url",
    ].includes(keyToken) &&
    valueContainsAgentToolsProviderMarker(value)
  ) {
    return true;
  }
  return false;
};

const sanitizeString = (value: string): string => {
  const canonicalToolName = normalizeCodexAgentToolsToolNameForEvent(value);
  if (canonicalToolName && canonicalToolName !== value && isAgentToolsMcpProviderToolName(value)) {
    return canonicalToolName;
  }
  return replaceAgentToolsMcpProviderNamesInText(value, AGENT_TOOLS_REDACTED_SERVER_NAME)
    .replace(/\/mcp\/agent-tools\/[^/?#\s"'`,}\]]+/gi, "/mcp/agent-tools/<redacted>")
    .replace(/\bAuthorization\b\s*[:=]\s*Bearer\s+[^\s,}\]]+/gi, "authorization_redacted=<redacted>")
    .replace(/Bearer\s+[^\s,}\]]+/gi, "<redacted>")
    .replace(
      /\b(authorization|bearerToken|capabilityToken|accessToken|refreshToken|sessionToken|token|tokenHash|apiKey)\b\s*[:=]\s*["']?[^"',}\]\s]+["']?/gi,
      "$1=<redacted>",
    )
    .replace(/\bAuthorization\b/gi, "authorization_redacted");
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

const hasAgentToolsToolName = (payload: Record<string, unknown>): boolean => {
  const item = asObject(payload.item);
  return [
    payload.tool_name,
    payload.tool,
    payload.name,
    item?.tool_name,
    item?.tool,
    item?.name,
  ].some((value) => {
    const toolName = asString(value);
    return Boolean(
      toolName && (
        isAgentToolsMcpProviderToolName(toolName) ||
        toolName.includes(AGENT_TOOLS_MCP_SERVER_NAME)
      ),
    );
  });
};

export const isCodexAgentToolsMcpPayload = (
  payload: Record<string, unknown>,
): boolean =>
  hasAgentToolsToolName(payload) ||
  hasAgentToolsProviderMarker(payload) ||
  valueContainsAgentToolsProviderMarker(payload);

export const isCodexAgentToolsSendMessagePayload = isCodexAgentToolsMcpPayload;

export const serializeCodexItemEventPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const serialized = serializePayload(payload);
  if (!isCodexAgentToolsMcpPayload(serialized)) {
    return serialized;
  }
  return sanitizeValue(serialized) as Record<string, unknown>;
};
