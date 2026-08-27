import type { ConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";
import type { ApplicationAgentToolRoute } from "../../application-agent-tools/domain/application-agent-tool-route.js";
import { cloneApplicationAgentToolRoute } from "../../application-agent-tools/domain/application-agent-tool-route.js";

export const AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND = "static_adapter" as const;
export const AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND = "configured_mcp_tool" as const;
export const AGENT_TOOL_MCP_APPLICATION_TOOL_ROUTE_KIND = "application_agent_tool" as const;

export type AgentToolMcpStaticAdapterToolRoute = {
  kind: typeof AGENT_TOOL_MCP_STATIC_ADAPTER_ROUTE_KIND;
  toolName: string;
};

export type AgentToolMcpConfiguredMcpToolRoute = ConfiguredMcpAgentToolSource & {
  kind: typeof AGENT_TOOL_MCP_CONFIGURED_MCP_ROUTE_KIND;
};

export type AgentToolMcpApplicationToolRoute = ApplicationAgentToolRoute;

export type AgentToolMcpToolRoute =
  | AgentToolMcpStaticAdapterToolRoute
  | AgentToolMcpConfiguredMcpToolRoute
  | AgentToolMcpApplicationToolRoute;

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
): AgentToolMcpToolRoute => route.kind === AGENT_TOOL_MCP_APPLICATION_TOOL_ROUTE_KIND
  ? cloneApplicationAgentToolRoute(route)
  : { ...route };

export const cloneAgentToolMcpToolRouteTable = (
  routes: AgentToolMcpToolRouteTable,
): AgentToolMcpToolRouteTable => Object.fromEntries(
  Object.entries(routes).map(([toolName, route]) => [
    toolName,
    cloneAgentToolMcpToolRoute(route),
  ]),
);
