import {
  LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
  LIST_AVAILABLE_AGENTS_TOOL_NAME,
  buildListAvailableAgentsParameterSchema,
  listAvailableAgentsFor,
} from "../../agent-discovery/list-available-agents-contract.js";
import {
  toAgentToolMcpToolResult,
  type AgentToolMcpAdapterProvider,
  type AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";

/**
 * `list_available_agents` over Agent Tools MCP (Codex, Claude, AGY and the other MCP runtimes).
 * Available only to a sender whose member context can list (DS-004); the tool is exposed only
 * when the agent definition selects it.
 */
export class ListAvailableAgentsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: LIST_AVAILABLE_AGENTS_TOOL_NAME,
        description: LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION,
        inputSchema: buildListAvailableAgentsParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: ({ sender }) => Boolean(sender?.memberExecutionContext?.collaboration.listAvailableAgents),
      execute: async ({ session }) => {
        const result = await listAvailableAgentsFor(session.sender.memberExecutionContext?.collaboration);
        return toAgentToolMcpToolResult({
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        });
      },
    }];
  }
}
