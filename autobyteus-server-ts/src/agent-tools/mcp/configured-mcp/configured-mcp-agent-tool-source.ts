export const CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND = "configured_mcp_tool" as const;

export type ConfiguredMcpAgentToolSource = {
  kind: typeof CONFIGURED_MCP_AGENT_TOOL_SOURCE_KIND;
  registeredToolName: string;
  mcpServerId: string;
};

export type ConfiguredMcpAgentToolSourceDiagnosticCode =
  | "configured_mcp_tool_collision"
  | "configured_mcp_tool_missing"
  | "configured_mcp_tool_not_mcp_origin"
  | "configured_mcp_tool_missing_server_id";

export type ConfiguredMcpAgentToolSourceDiagnostic = {
  code: ConfiguredMcpAgentToolSourceDiagnosticCode;
  registeredToolName: string;
  message: string;
};

export type ConfiguredMcpAgentToolSourceResolution = {
  sources: ConfiguredMcpAgentToolSource[];
  diagnostics: ConfiguredMcpAgentToolSourceDiagnostic[];
};

export const cloneConfiguredMcpAgentToolSource = (
  source: ConfiguredMcpAgentToolSource,
): ConfiguredMcpAgentToolSource => ({ ...source });
