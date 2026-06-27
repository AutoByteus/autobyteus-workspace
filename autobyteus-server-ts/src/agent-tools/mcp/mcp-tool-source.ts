const MCP_WIRE_TOOL_NAME_PATTERN = /^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isMcpMarkerString = (value: unknown): boolean => {
  const normalized = normalizeString(value)?.toLowerCase();
  return normalized === "mcp" || normalized === "mcp_tool_result";
};

export const isMcpWireToolName = (value: string | null | undefined): boolean => {
  const normalized = normalizeString(value);
  return Boolean(normalized && MCP_WIRE_TOOL_NAME_PATTERN.test(normalized));
};

export const hasExplicitProviderMcpMarker = (
  value: Record<string, unknown>,
): boolean => {
  const directBooleanMarkers = [
    value.is_mcp_tool,
    value.isMcpTool,
    value.mcp_tool,
    value.mcpTool,
    value.mcp_tool_result,
    value.mcpToolResult,
  ];
  if (directBooleanMarkers.some((entry) => entry === true)) {
    return true;
  }

  const directStringMarkers = [
    value.tool_source,
    value.toolSource,
    value.result_source,
    value.resultSource,
    value.provider_source,
    value.providerSource,
    value.source_kind,
    value.sourceKind,
  ];
  if (directStringMarkers.some(isMcpMarkerString)) {
    return true;
  }

  const metadata = isRecord(value.metadata) ? value.metadata : null;
  if (!metadata) {
    return false;
  }

  return [
    metadata.tool_source,
    metadata.toolSource,
    metadata.result_source,
    metadata.resultSource,
    metadata.provider_source,
    metadata.providerSource,
    metadata.source_kind,
    metadata.sourceKind,
  ].some(isMcpMarkerString);
};
