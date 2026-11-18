import {
  LIST_PEER_NODES_TOOL_DESCRIPTION,
  LIST_PEER_NODES_TOOL_NAME,
  buildListPeerNodesParameterSchema,
  listPeerNodesFor,
} from "../../agent-discovery/list-peer-nodes-contract.js";
import type { AgentToolMcpAdapterProvider, AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentDiscoveryMcpResult } from "./agent-discovery-mcp-result.js";

/**
 * `list_peer_nodes` over Agent Tools MCP (autobyteus-261). The same availability as `list_available_agents`
 * (a sender whose member context can list); exposed only when the agent definition selects it.
 */
export class ListPeerNodesMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_PEER_NODES_TOOL_NAME,
        description: LIST_PEER_NODES_TOOL_DESCRIPTION,
        inputSchema: buildListPeerNodesParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberExecutionContext?.collaboration.listAvailableAgents),
      execute: async ({ session }) =>
        toAgentDiscoveryMcpResult(await listPeerNodesFor(session.sender.memberExecutionContext?.collaboration)),
    }];
  }
}
