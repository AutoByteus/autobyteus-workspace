import { PROJECT_TASK_TOOL_MANIFEST, projectTaskToolError } from "../../project-tasks/project-task-tool-manifest.js";
import { toAgentToolMcpToolResult, type AgentToolMcpAdapterProvider, type AgentToolMcpToolAdapter } from "../agent-tool-mcp-adapter.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";
import { GET_PROJECT_TASK_TOOL_NAME } from "../../project-tasks/project-task-tool-contract.js";
import { ANY_TASK_READ_SCOPE, taskReadScopeOf } from "../../project-tasks/project-task-read-scope.js";
/** Node-local data operations have no collaboration-member prerequisite; selection remains session-owned. */
export class ProjectTaskToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return PROJECT_TASK_TOOL_MANIFEST.map((entry) => ({
      definition: {name: entry.name, description: entry.description, inputSchema: entry.parameterSchema},
      configuredMcpCollisionPolicy: "protect_static_adapter", isAvailable: () => true,
      execute: async ({rawArguments, session}) => {
        // Only get_project_task reads the caller's Task scope; it is asked inside the call, so a failure is a refusal (AR-008).
        try {
          const scope = entry.name === GET_PROJECT_TASK_TOOL_NAME ? taskReadScopeOf(session.sender?.memberExecutionContext) : ANY_TASK_READ_SCOPE;
          return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(await entry.execute(rawArguments, scope)));
        }
        catch (e) { return toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(projectTaskToolError(e), {isError: true})); }
      },
    }));
  }
}
