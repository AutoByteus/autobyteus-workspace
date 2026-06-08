import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import {
  ClaudeSendMessageToolCallHandler,
  type ClaudeSendMessageToolApprovalHandler,
} from "./claude-send-message-tool-call-handler.js";
import { buildClaudeSendMessageToolDefinition } from "./claude-send-message-tool-definition-builder.js";
import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { buildClaudeTaskDelegationToolDefinitions } from "../task-delegation/build-claude-task-delegation-tool-definitions.js";

export const buildClaudeTeamMcpServers = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
  sendMessageToToolingEnabled?: boolean;
  enabledTaskDelegationToolNames?: Iterable<string> | null;
}): Promise<Record<string, unknown> | null> => {
  const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
  const sendMessageToEnabled =
    options.sendMessageToToolingEnabled === true &&
    Boolean(memberTeamContext?.deliverInterAgentMessage) &&
    Boolean(memberTeamContext?.teamRunId);
  const taskDelegationToolDefinitions = await buildClaudeTaskDelegationToolDefinitions({
    sdkClient: options.sdkClient,
    memberTeamContext,
    enabledToolNames: options.enabledTaskDelegationToolNames,
  });

  if (!sendMessageToEnabled && !taskDelegationToolDefinitions) {
    return null;
  }

  const tools: Record<string, unknown>[] = [];
  if (sendMessageToEnabled) {
    if (
      !memberTeamContext ||
      !memberTeamContext.deliverInterAgentMessage ||
      !memberTeamContext.teamRunId
    ) {
      return null;
    }

    const handler = new ClaudeSendMessageToolCallHandler({
      deliverInterAgentMessage: memberTeamContext.deliverInterAgentMessage,
      requestToolApproval: options.requestToolApproval,
      emitEvent: options.emitEvent,
    });
    const toolDefinition = await buildClaudeSendMessageToolDefinition({
      runContext: options.runContext,
      sdkClient: options.sdkClient,
      handler,
    });
    if (!toolDefinition) {
      return null;
    }
    tools.push(toolDefinition);
  }
  if (taskDelegationToolDefinitions) {
    tools.push(...taskDelegationToolDefinitions);
  }

  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_team",
    tools,
  });
  if (!normalized) {
    return null;
  }

  return {
    autobyteus_team: normalized,
  };
};
