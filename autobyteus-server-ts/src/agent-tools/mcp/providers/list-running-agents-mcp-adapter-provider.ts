import {
  LIST_RUNNING_AGENTS_TOOL_DESCRIPTION,
  LIST_RUNNING_AGENTS_TOOL_NAME,
  buildListRunningAgentsParameterSchema,
  listRunningAgentsFor,
} from "../../agent-discovery/list-running-agents-contract.js";
import type { AgentToolMcpAdapterProvider, AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentDiscoveryMcpResult } from "./agent-discovery-mcp-result.js";
import type { PeerDiscoveryAccess } from "../../../agent-collaboration/execution/remote/peer-discovery-channel.js";

/**
 * `list_running_agents` over Agent Tools MCP (autobyteus-492). The same availability as `list_available_agents`: a sender
 * whose member context can list; exposed only when the agent definition selects it.
 */
export class ListRunningAgentsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  /** The host's discovery, from its composition (autobyteus-500 FU-011). */
  constructor(private readonly peerDiscovery: PeerDiscoveryAccess) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_RUNNING_AGENTS_TOOL_NAME,
        description: LIST_RUNNING_AGENTS_TOOL_DESCRIPTION,
        inputSchema: buildListRunningAgentsParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberExecutionContext?.collaboration.listAvailableAgents),
      execute: async ({ session, rawArguments }) =>
        toAgentDiscoveryMcpResult(await listRunningAgentsFor(session.sender.memberExecutionContext, rawArguments, this.peerDiscovery())),
    }];
  }
}
