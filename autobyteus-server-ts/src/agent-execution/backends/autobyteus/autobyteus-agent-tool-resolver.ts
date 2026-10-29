import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import type { MemberExecutionContext } from "../../../agent-collaboration/execution/domain/member-execution-context.js";
import type { RuntimeAgentToolExposure } from "../../shared/runtime-agent-tool-exposure.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "../../../agent-tools/agent-communication/send-message-to.js";
import { ensureAutoByteusGetHandoffRulesToolRegistered } from "../../../agent-tools/agent-communication/get-handoff-rules.js";
import { buildAgentRunMessageSenderContext } from "../../../agent-communication/domain/agent-run-message-sender.js";
import {
  createAutoByteusSendMessageToToolForSender,
  isSendMessageToToolName,
  isGetHandoffRulesToolName,
  createAutoByteusGetHandoffRulesToolForSender,
} from "./agent-communication/autobyteus-send-message-tool-factory.js";
import {
  isTaskDelegationToolName,
} from "../../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { registerTaskDelegationTools } from "../../../agent-tools/task-delegation/register-task-delegation-tools.js";
import { LIST_AVAILABLE_AGENTS_TOOL_NAME } from "../../../agent-tools/agent-discovery/list-available-agents-contract.js";
import { createBoundListAvailableAgentsTool } from "../../../agent-tools/agent-discovery/list-available-agents-tool.js";
import { LIST_PEER_NODES_TOOL_NAME } from "../../../agent-tools/agent-discovery/list-peer-nodes-contract.js";
import { createBoundListPeerNodesTool } from "../../../agent-tools/agent-discovery/list-peer-nodes-tool.js";
import { GET_PROJECT_TASK_TOOL_NAME } from "../../../agent-tools/project-tasks/project-task-tool-contract.js";
import { createBoundGetProjectTaskTool } from "../../../agent-tools/project-tasks/project-task-native-tools.js";

type ToolResolutionLogger = {
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type AutoByteusAgentToolResolution = {
  tools: BaseTool[];
  actualToolNames: string[];
};

const defaultLogger: ToolResolutionLogger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export const resolveAutoByteusAgentTools = (input: {
  agentDefinition: AgentDefinition;
  runtimeToolExposure: RuntimeAgentToolExposure;
  senderRunId?: string | null;
  senderName?: string | null;
  runtimeKind?: string | null;
  memberExecutionContext?: MemberExecutionContext | null;
  logger?: ToolResolutionLogger | null;
}): AutoByteusAgentToolResolution => {
  const { agentDefinition, memberExecutionContext = null } = input;
  const logger = input.logger ?? defaultLogger;
  const tools: BaseTool[] = [];
  const actualToolNames: string[] = [];

  for (const name of input.runtimeToolExposure.requestedToolNames) {
    if (isSendMessageToToolName(name) || isGetHandoffRulesToolName(name)) {
      if (isSendMessageToToolName(name)) ensureAutoByteusSendMessageToToolRegistered();
      else ensureAutoByteusGetHandoffRulesToolRegistered();
      if (!input.senderRunId?.trim()) {
        logger.warn(
          `Tool '${name}' defined in agent definition '${agentDefinition.name}' requires senderRunId. Skipping.`,
        );
        continue;
      }
      try {
        const sender = buildAgentRunMessageSenderContext({
            senderRunId: input.senderRunId,
            senderName: input.senderName ?? agentDefinition.name,
            runtimeKind: input.runtimeKind ?? null,
            memberExecutionContext,
          });
        tools.push(isSendMessageToToolName(name)
          ? createAutoByteusSendMessageToToolForSender(sender)
          : createAutoByteusGetHandoffRulesToolForSender(sender));
        actualToolNames.push(name);
      } catch (error) {
        logger.error(
          `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
        );
      }
      continue;
    }

    // The discovery tools (autobyteus-261: also list_peer_nodes) need a run that can delegate.
    if (name.trim() === LIST_AVAILABLE_AGENTS_TOOL_NAME || name.trim() === LIST_PEER_NODES_TOOL_NAME) {
      if (!memberExecutionContext?.collaboration.listAvailableAgents) {
        logger.warn(
          `Tool '${name}' defined in agent definition '${agentDefinition.name}' requires a run that can delegate to available agents. Skipping.`,
        );
        continue;
      }
      tools.push(name.trim() === LIST_AVAILABLE_AGENTS_TOOL_NAME
        ? createBoundListAvailableAgentsTool(memberExecutionContext)
        : createBoundListPeerNodesTool(memberExecutionContext));
      actualToolNames.push(name);
      continue;
    }

    if (isTaskDelegationToolName(name)) {
      if (!memberExecutionContext) {
        logger.warn(
          `Tool '${name}' defined in agent definition '${agentDefinition.name}' requires a Team-member context. Skipping.`,
        );
        continue;
      }
      if (!defaultToolRegistry.getToolDefinition(name)) {
        registerTaskDelegationTools();
      }
      try {
        tools.push(defaultToolRegistry.createTool(name, new ToolConfig({
          taskDelegation: Object.freeze({
            identity: memberExecutionContext.identity,
            commands: memberExecutionContext.tasks,
          }),
        })));
        actualToolNames.push(name);
      } catch (error) {
        logger.error(
          `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
        );
      }
      continue;
    }

    // `get_project_task` reads with its caller's Task scope, so it is always created bound, never by the generic registry path (AR-008).
    if (name.trim() === GET_PROJECT_TASK_TOOL_NAME) {
      tools.push(createBoundGetProjectTaskTool(memberExecutionContext));
      actualToolNames.push(name);
      continue;
    }

    if (!defaultToolRegistry.getToolDefinition(name)) {
      logger.warn(
        `Tool '${name}' defined in agent definition '${agentDefinition.name}' not found in registry. Skipping.`,
      );
      continue;
    }
    try {
      tools.push(defaultToolRegistry.createTool(name));
      actualToolNames.push(name);
    } catch (error) {
      logger.error(
        `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
      );
    }
  }

  return { tools, actualToolNames };
};
