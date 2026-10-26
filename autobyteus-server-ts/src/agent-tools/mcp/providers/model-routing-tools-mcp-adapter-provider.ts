import {
  SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION,
  SUBMIT_LAUNCH_CHOICES_TOOL_NAME,
  buildSubmitLaunchChoicesParameterSchema,
  submitLaunchChoices,
} from "../../model-routing/submit-launch-choices-contract.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";

/**
 * `submit_launch_choices` over Agent Tools MCP (Codex, Claude, Antigravity, Grok runtimes). Needs no member context (the
 * Model Router agent's run has none); the catalog offers it only to agents whose definition lists it, and the tool
 * accepts only the node's Model Router agent's run as caller.
 */
export class ModelRoutingToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [{
      definition: {
        name: SUBMIT_LAUNCH_CHOICES_TOOL_NAME,
        description: SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION,
        inputSchema: buildSubmitLaunchChoicesParameterSchema(),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter" as const,
      isAvailable: () => true,
      execute: async ({ session, rawArguments }) => {
        const result = await submitLaunchChoices(session.owner.runId, rawArguments);
        return toAgentToolMcpToolResult({ content: [{ type: "text", text: result.text }], isError: result.isError });
      },
    }];
  }
}
