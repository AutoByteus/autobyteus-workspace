import {
  LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME,
  LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE,
  buildListAvailableAgentRuntimesParameterSchema,
  listAvailableAgentRuntimes,
} from "../../agent-runtimes/list-available-agent-runtimes-contract.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";

/**
 * `list_available_agent_runtimes` over Agent Tools MCP (Codex, Claude, Antigravity, Grok runtimes). Needs no member
 * context; the catalog offers it only to agents whose definition lists it.
 */
export class ListAvailableAgentRuntimesMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_NAME,
        description: LIST_AVAILABLE_AGENT_RUNTIMES_TOOL_DESCRIPTION,
        inputSchema: buildListAvailableAgentRuntimesParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: () => true,
      execute: async () => {
        const report = await listAvailableAgentRuntimes();
        return report
          ? toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(report))
          : toAgentToolMcpToolResult({ content: [{ type: "text", text: LIST_AVAILABLE_AGENT_RUNTIMES_UNAVAILABLE }], isError: true });
      },
    }];
  }
}
