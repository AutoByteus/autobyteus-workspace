import { PROJECT_TASK_TOOL_MANIFEST, projectTaskToolError } from "../../project-tasks/project-task-tool-manifest.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";
/** Node-local data operations have no collaboration-member prerequisite; selection remains session-owned. */
export class ProjectTaskToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return PROJECT_TASK_TOOL_MANIFEST.map((entry) => ({
      definition: {name: entry.name, description: entry.description, inputSchema: entry.parameterSchema},
      configuredMcpCollisionPolicy: "protect_static_adapter", isAvailable: () => true,
      execute: async ({rawArguments}) => {
        try { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(JSON.stringify(await entry.execute(rawArguments)))); }
        catch (e) { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(JSON.stringify(projectTaskToolError(e)), {isError: true})); }
      },
    }));
  }
}
