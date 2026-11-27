import { SANDBOX_TOOL_MANIFESTS, sandboxToolError } from "../../sandboxes/sandbox-tool-manifest.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";

/**
 * `create_sandbox`, `run_in_sandbox` and `destroy_sandbox` over Agent Tools MCP (Codex, Claude, Grok, DeepSeek
 * Harness); the asking run is the session's owner. The catalog offers them only to agents whose definition lists them.
 */
export class SandboxToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return SANDBOX_TOOL_MANIFESTS.map((manifest) => ({
      definition: { name: manifest.name, description: manifest.description, inputSchema: manifest.parameterSchema },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: () => true,
      execute: async ({ session, rawArguments }) => {
        try { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(await manifest.execute(rawArguments, session.owner.runId))); }
        catch (error) { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(sandboxToolError(error), { isError: true })); }
      },
    }));
  }
}
