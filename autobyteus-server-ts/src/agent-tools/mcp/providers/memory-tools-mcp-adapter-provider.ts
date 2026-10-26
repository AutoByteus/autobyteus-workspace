import { SEARCH_MEMORY_TOOL_MANIFEST, memoryToolError } from "../../memory/memory-tool-manifest.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";

/** `search_memory` over MCP; the asking run is the session's owner. Selection remains session-owned. */
export class MemoryToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    const entry = SEARCH_MEMORY_TOOL_MANIFEST;
    return [{
      definition: { name: entry.name, description: entry.description, inputSchema: entry.parameterSchema },
      configuredMcpCollisionPolicy: "protect_static_adapter", isAvailable: () => true,
      execute: async ({ session, rawArguments }) => {
        try { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(JSON.stringify(await entry.execute(rawArguments, session.owner.runId)))); }
        catch (error) { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(JSON.stringify(memoryToolError(error)), { isError: true })); }
      },
    }];
  }
}
