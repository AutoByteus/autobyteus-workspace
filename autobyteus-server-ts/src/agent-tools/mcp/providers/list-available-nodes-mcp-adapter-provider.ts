import {
  LIST_AVAILABLE_NODES_TOOL_DESCRIPTION,
  LIST_AVAILABLE_NODES_TOOL_NAME,
  buildListAvailableNodesParameterSchema,
  listAvailableNodesFor,
} from "../../agent-discovery/list-available-nodes-contract.js";
import type { AgentToolMcpAdapterProvider, AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentDiscoveryMcpResult } from "./agent-discovery-mcp-result.js";

/**
 * `list_available_nodes` over Agent Tools MCP (autobyteus-261). The same availability as `list_available_agents`
 * (a sender whose member context can list); exposed only when the agent definition selects it.
 */
export class ListAvailableNodesMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_AVAILABLE_NODES_TOOL_NAME,
        description: LIST_AVAILABLE_NODES_TOOL_DESCRIPTION,
        inputSchema: buildListAvailableNodesParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberExecutionContext?.collaboration.listAvailableAgents),
      execute: async ({ session }) =>
        toAgentDiscoveryMcpResult(await listAvailableNodesFor(session.sender.memberExecutionContext?.collaboration)),
    }];
  }
}
