import {
  LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_NAME,
  buildListAvailableAgentsParameterSchema,
  listAvailableAgentsFor,
} from "../../agent-discovery/list-available-agents-contract.js";
import type { PeerDiscoveryAccess } from "../../../agent-collaboration/execution/remote/peer-discovery-channel.js";
import type { AgentToolMcpAdapterProvider, AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentDiscoveryMcpResult } from "./agent-discovery-mcp-result.js";

/**
 * `list_available_agents` over Agent Tools MCP (Codex, Claude, AGY and the other MCP runtimes).
 * Available only to a sender whose member context can list (DS-004); the tool is exposed only
 * when the agent definition selects it.
 */
export class ListAvailableAgentsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  /** The host's discovery, from its composition (autobyteus-500 FU-011). */
  constructor(private readonly peerDiscovery: PeerDiscoveryAccess) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_AVAILABLE_AGENTS_TOOL_NAME,
        description: LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
        inputSchema: buildListAvailableAgentsParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberExecutionContext?.collaboration.listAvailableAgents),
      execute: async ({ session, rawArguments }) =>
        toAgentDiscoveryMcpResult(await listAvailableAgentsFor(session.sender.memberExecutionContext?.collaboration, rawArguments, this.peerDiscovery())),
    }];
  }
}
