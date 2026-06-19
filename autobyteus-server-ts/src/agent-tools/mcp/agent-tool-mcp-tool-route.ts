import type { ConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";

export const AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND = "static_adapter" as const;
export const AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND = "configured_mcp_tool" as const;

export type AgentToolMcpStaticAdapterToolRoute = {
  kind: typeof AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND;
  toolName: string;
};

export type AgentToolMcpConfiguredMcpToolRoute = ConfiguredMcpAgentToolSource & {
  kind: typeof AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND;
};

export type AgentToolMcpToolRoute =
  | AgentToolMcpStaticAdapterToolRoute
  | AgentToolMcpConfiguredMcpToolRoute;

export type AgentToolMcpToolRouteTable = Record<string, AgentToolMcpToolRoute>;

export const toStaticAdapterToolRoute = (toolName: string): AgentToolMcpStaticAdapterToolRoute => ({
  kind: AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND,
  toolName,
});

export const toConfiguredMcpToolRoute = (
  source: ConfiguredMcpAgentToolSource,
): AgentToolMcpConfiguredMcpToolRoute => ({
  ...source,
  kind: AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND,
});

export const cloneAgentToolMcpToolRoute = (
  route: AgentToolMcpToolRoute,
): AgentToolMcpToolRoute => ({ ...route });

export const cloneAgentToolMcpToolRouteTable = (
  routes: AgentToolMcpToolRouteTable,
): AgentToolMcpToolRouteTable => Object.fromEntries(
  Object.entries(routes).map(([toolName, route]) => [
    toolName,
    cloneAgentToolMcpToolRoute(route),
  ]),
);
