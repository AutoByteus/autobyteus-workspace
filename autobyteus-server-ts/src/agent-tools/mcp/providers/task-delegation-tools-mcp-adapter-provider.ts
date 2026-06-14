import { TASK_DELEGATION_TOOL_MANIFEST } from "../../task-delegation/task-delegation-tool-manifest.js";
import {
  buildTaskDelegationToolContextFromMemberTeamContext,
  getTaskDelegationToolService,
  type TaskDelegationToolService,
} from "../../task-delegation/task-delegation-tool-service.js";
import {
  toTaskDelegationJsonString,
  toTaskDelegationToolErrorPayload,
} from "../../task-delegation/task-delegation-tool-serialization.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  createAgentToolsMcpErrorResult,
  createAgentToolsMcpSuccessResult,
} from "../agent-tools-mcp-operation-result.js";

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
      },
      isAvailable: ({ sender }) => Boolean(sender?.memberTeamContext),
      execute: async ({ session, rawArguments }) => {
        const memberTeamContext = session.sender.memberTeamContext;
        if (!memberTeamContext) {
          return createAgentToolsMcpErrorResult(
            toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(
              new Error("Task delegation tools require an active team member context."),
            )),
            "task_delegation_context_required",
          );
        }
        const context = buildTaskDelegationToolContextFromMemberTeamContext(memberTeamContext);
        try {
          const result = await entry.execute(
            this.taskDelegationToolService,
            context,
            entry.parseInput(asRawArguments(rawArguments)),
          );
          return createAgentToolsMcpSuccessResult(toTaskDelegationJsonString(result));
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
