import { TASK_DELEGATION_TOOL_MANIFEST } from "../../task-delegation/task-delegation-tool-manifest.js";
import {
  getTaskDelegationToolService,
  type TaskDelegationToolService,
} from "../../task-delegation/task-delegation-tool-service.js";
import {
  toTaskDelegationJsonString,
  toTaskDelegationToolErrorPayload,
} from "../../task-delegation/task-delegation-tool-serialization.js";
import {
  toAgentToolMcpToolResult,
  type AgentToolMcpAdapterProvider,
  type AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  createAgentToolsMcpErrorResult,
  createAgentToolsMcpSuccessResult,
} from "../agent-tools-mcp-operation-result.js";
import { toAgentToolsMcpStructuredJsonResult } from "../agent-tools-mcp-structured-json-result.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class TaskDelegationToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  constructor(
    private readonly taskDelegationToolService: TaskDelegationToolService = getTaskDelegationToolService(),
  ) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return TASK_DELEGATION_TOOL_MANIFEST.map((entry) => ({
      definition: {
        name: entry.name,
        description: entry.description,
        inputSchema: entry.parameterSchema,
        ...(entry.resultSchema ? { outputSchema: entry.resultSchema } : {}),
      },
      configuredMcpCollisionPolicy: "protect_static_adapter",
      isAvailable: ({ sender }) => Boolean(sender?.memberTeamContext),
      execute: async ({ session, rawArguments }) => {
        const capabilities = session.executionCapabilities;
        if (capabilities.kind !== "team_member") {
          return createAgentToolsMcpErrorResult(
            toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(
              new Error("Task delegation tools require an authenticated Team-member capability."),
            )),
            "task_delegation_context_required",
          );
        }
        try {
          const result = await entry.execute(
            this.taskDelegationToolService,
            capabilities.taskDelegation,
            entry.parseInput(asRawArguments(rawArguments)),
          );
          const serializedResult = toTaskDelegationJsonString(result);
          return entry.resultSchema
            ? toAgentToolMcpToolResult(toAgentToolsMcpStructuredJsonResult(serializedResult))
            : createAgentToolsMcpSuccessResult(serializedResult);
        } catch (error) {
          return createAgentToolsMcpErrorResult(
            toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(error)),
            "task_delegation_tool_execution_failed",
          );
        }
      },
    }));
  }
}
