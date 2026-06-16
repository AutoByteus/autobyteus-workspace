import { AGENT_TOOLS_MCP_SERVER_NAME } from "./agent-tool-mcp-session.js";

const MCP_WIRE_PREFIX = `mcp__${AGENT_TOOLS_MCP_SERVER_NAME}__`;
const QUALIFIED_PREFIX = `${AGENT_TOOLS_MCP_SERVER_NAME}.`;
const DOUBLE_UNDERSCORE_PREFIX = `${AGENT_TOOLS_MCP_SERVER_NAME}__`;
const TOOL_NAME_PATTERN = "[A-Za-z0-9_-]+";
const EXACT_TOOL_NAME_PATTERN = new RegExp(`^${TOOL_NAME_PATTERN}$`);

const normalizeString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const stripExactPrefixCaseInsensitive = (value: string, prefix: string): string | null => {
  if (!value.toLowerCase().startsWith(prefix.toLowerCase())) {
    return null;
  }
  const candidate = normalizeString(value.slice(prefix.length));
  return candidate && EXACT_TOOL_NAME_PATTERN.test(candidate) ? candidate : null;
};

const normalizePrefixedAgentToolsMcpToolName = (
  value: string | null | undefined,
): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return (
    stripExactPrefixCaseInsensitive(normalized, MCP_WIRE_PREFIX) ??
    stripExactPrefixCaseInsensitive(normalized, QUALIFIED_PREFIX) ??
    stripExactPrefixCaseInsensitive(normalized, DOUBLE_UNDERSCORE_PREFIX)
  );
};

export const buildAgentToolsMcpWireToolName = (toolName: string): string =>
  `${MCP_WIRE_PREFIX}${toolName}`;

export const isAgentToolsMcpProviderToolName = (value: string | null | undefined): boolean => {
  return Boolean(normalizePrefixedAgentToolsMcpToolName(value));
};

export const normalizeAgentToolsMcpToolNameForEvent = (
  value: string | null | undefined,
): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalizePrefixedAgentToolsMcpToolName(normalized) ?? normalized;
};

export const replaceAgentToolsMcpProviderNamesInText = (
  value: string,
  redactedServerName = "agent_tools",
): string => {
  const escapedServerName = AGENT_TOOLS_MCP_SERVER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .replace(new RegExp(`mcp__${escapedServerName}__(${TOOL_NAME_PATTERN})`, "gi"), "$1")
    .replace(new RegExp(`${escapedServerName}\\.(${TOOL_NAME_PATTERN})`, "gi"), "$1")
    .replace(new RegExp(`${escapedServerName}__(${TOOL_NAME_PATTERN})`, "gi"), "$1")
    .replaceAll(AGENT_TOOLS_MCP_SERVER_NAME, redactedServerName);
};
