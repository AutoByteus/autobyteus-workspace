import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import {
  ClaudeSendMessageToolCallHandler,
  type ClaudeSendMessageToolApprovalHandler,
} from "./claude-send-message-tool-call-handler.js";
import { buildClaudeSendMessageToolDefinition } from "./claude-send-message-tool-definition-builder.js";
import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";

export const buildClaudeTeamMcpServers = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
}): Promise<Record<string, unknown> | null> => {
  const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
  if (
    !memberTeamContext ||
    !memberTeamContext.deliverInterAgentMessage ||
    !memberTeamContext.teamRunId ||
    memberTeamContext.allowedRecipientNames.length === 0
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

  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_team",
    tools: [toolDefinition],
  });
  if (!normalized) {
    return null;
  }

  return {
    autobyteus_team: normalized,
  };
};
