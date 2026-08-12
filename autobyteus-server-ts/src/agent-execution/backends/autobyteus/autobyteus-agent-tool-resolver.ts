import type { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import type { RuntimeAgentToolExposure } from "../../shared/runtime-agent-tool-exposure.js";
import { ensureAutoByteusSendMessageToToolRegistered } from "../../../agent-tools/agent-communication/send-message-to.js";
import { buildAgentRunMessageSenderContext } from "../../../agent-communication/domain/agent-run-message-sender.js";
import { resolveAutoByteusStandaloneToolNames } from "./autobyteus-mixed-tool-exposure.js";
import {
  createAutoByteusSendMessageToToolForSender,
  isSendMessageToToolName,
} from "./agent-communication/autobyteus-send-message-tool-factory.js";
import { DELEGATE_TASK_TOOL_NAME } from "../../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { registerDelegateTaskTool } from "../../../agent-tools/task-delegation/delegate-task.js";

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
  memberTeamContext?: MemberTeamContext | null;
  logger?: ToolResolutionLogger | null;
}): AutoByteusAgentToolResolution => {
  const { agentDefinition, memberTeamContext = null } = input;
  const logger = input.logger ?? defaultLogger;
  const resolvedToolNames = resolveAutoByteusStandaloneToolNames({
    toolNames: input.runtimeToolExposure.requestedToolNames,
    memberTeamContext,
  });
  const tools: BaseTool[] = [];
  const actualToolNames: string[] = [];

  for (const name of resolvedToolNames) {
    if (isSendMessageToToolName(name)) {
      ensureAutoByteusSendMessageToToolRegistered();
      if (!input.senderRunId?.trim()) {
        logger.warn(
          `Tool '${name}' defined in agent definition '${agentDefinition.name}' requires senderRunId. Skipping.`,
        );
        continue;
      }
      try {
        tools.push(createAutoByteusSendMessageToToolForSender(
          buildAgentRunMessageSenderContext({
            senderRunId: input.senderRunId,
            senderName: input.senderName ?? agentDefinition.name,
            runtimeKind: input.runtimeKind ?? null,
            memberTeamContext,
          }),
        ));
        actualToolNames.push(name);
      } catch (error) {
        logger.error(
          `Failed to create tool instance for '${name}' from agent definition '${agentDefinition.name}': ${String(error)}`,
        );
      }
      continue;
    }

    if (name === DELEGATE_TASK_TOOL_NAME && !defaultToolRegistry.getToolDefinition(name)) {
      registerDelegateTaskTool();
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
