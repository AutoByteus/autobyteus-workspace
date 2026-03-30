import type { ClaudeRunContext } from "../../../agent-execution/backends/claude/backend/claude-agent-run-context.js";
import {
  getRuntimeMemberContexts,
  resolveRuntimeMemberContext,
} from "../../domain/team-run-context.js";
import type { ClaudeSdkClient } from "../../../runtime-management/claude/client/claude-sdk-client.js";
import {
  ClaudeSendMessageToolCallHandler,
  type ClaudeSendMessageToolApprovalHandler,
} from "./claude-send-message-tool-call-handler.js";
import { buildClaudeSendMessageToolDefinition } from "./claude-send-message-tool-definition-builder.js";
import type { ClaudeSessionEvent } from "../../../agent-execution/backends/claude/claude-runtime-shared.js";
import { AgentTeamRunManager } from "../../services/agent-team-run-manager.js";
import { buildInterAgentMessageDeliveryHandler } from "../../services/inter-agent-message-delivery-handler-builder.js";

export const buildClaudeTeamMcpServers = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
}): Promise<Record<string, unknown> | null> => {
  const currentMemberName =
    resolveRuntimeMemberContext(
      options.runContext.runtimeContext.teamContext,
      options.runContext.runId,
    )?.memberName ?? null;
  const allowedRecipientNames = getRuntimeMemberContexts(
    options.runContext.runtimeContext.teamContext?.runtimeContext ?? null,
  )
    .map((memberContext) => memberContext.memberName)
    .filter((memberName) => memberName !== currentMemberName);
  const deliveryHandler = buildInterAgentMessageDeliveryHandler(
    options.runContext.runtimeContext.teamContext?.runId ?? null,
    AgentTeamRunManager.getInstance(),
  );
  if (
    !options.runContext.runtimeContext.teamContext ||
    !deliveryHandler ||
    !options.runContext.runtimeContext.teamContext?.runId ||
    allowedRecipientNames.length === 0
  ) {
    return null;
  }

  const handler = new ClaudeSendMessageToolCallHandler({
    deliverInterAgentMessage: deliveryHandler,
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
