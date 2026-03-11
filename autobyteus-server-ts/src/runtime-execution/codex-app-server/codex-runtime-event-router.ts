import { normalizeCodexRuntimeMethod } from "./codex-runtime-method-normalizer.js";
import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";
import { resolveThreadIdFromNotification } from "./codex-runtime-launch-config.js";
import {
  isSendMessageToToolName,
  resolveApprovalInvocationCandidates,
  resolveCommandArgsFromApprovalParams,
  resolveCommandNameFromApprovalParams,
  resolveDynamicToolArgsFromParams,
  resolveDynamicToolNameFromParams,
  toDynamicToolResponse,
} from "./codex-send-message-tooling.js";
import type {
  CodexApprovalRecord,
  CodexInterAgentRelayHandler,
  CodexRunSessionState,
  CodexRuntimeEvent,
} from "./codex-runtime-shared.js";

const isSendMessageRelayDebugEnabled = process.env.CODEX_SEND_MESSAGE_RELAY_DEBUG !== "0";

const resolveRecipientFromToolArguments = (toolArguments: Record<string, unknown>): string | null =>
  asString(toolArguments.recipient_name) ??
  asString(toolArguments.recipientName) ??
  asString(toolArguments.recipient);

const resolveMessageTypeFromToolArguments = (
  toolArguments: Record<string, unknown>,
): string | null => asString(toolArguments.message_type) ?? asString(toolArguments.messageType);

const resolveContentLengthFromToolArguments = (toolArguments: Record<string, unknown>): number | null => {
  const content = asString(toolArguments.content);
  return content ? content.length : null;
};

const logSendMessageRelayDebug = (
  event: string,
  details: Record<string, unknown>,
): void => {
  if (!isSendMessageRelayDebugEnabled) {
    return;
  }
  console.log("[CodexSendMessageRelay]", {
    event,
    ...details,
  });
};

const resolveThreadIdFromRuntimeMessage = (params: JsonObject): string | null => {
  const thread = asObject(params.thread);
  const turn = asObject(params.turn);
  const turnThread = asObject(turn?.thread);
  const item = asObject(params.item);
  const itemThread = asObject(item?.thread);
  const command = asObject(params.command);
  const commandExecution = asObject(params.commandExecution);
  const payloadCommand = asObject(item?.command);

  return (
    asString(params.threadId) ??
    asString(thread?.id) ??
    asString(turn?.threadId) ??
    asString(turnThread?.id) ??
    asString(item?.threadId) ??
    asString(itemThread?.id) ??
    asString(command?.threadId) ??
    asString(commandExecution?.threadId) ??
    asString(payloadCommand?.threadId) ??
    resolveThreadIdFromNotification(params)
  );
};

const resolveTurnIdFromRuntimeMessage = (params: JsonObject): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  return asString(params.turnId) ?? asString(turn?.id) ?? asString(item?.turnId);
};

const isSessionAgnosticStartupMethod = (normalizedMethod: string): boolean =>
  normalizedMethod === "codex/event/mcp_startup_update" ||
  normalizedMethod === "codex/event/mcp_startup_complete";

export const isRuntimeMessageForSession = (
  state: CodexRunSessionState,
  method: string,
  params: JsonObject,
  sessionCount: number,
): boolean => {
  const normalizedMethod = normalizeCodexRuntimeMethod(method);
  if (isSessionAgnosticStartupMethod(normalizedMethod)) {
    return true;
  }
  const threadId = resolveThreadIdFromRuntimeMessage(params);
  if (threadId) {
    return threadId === state.threadId;
  }
  const turnId = resolveTurnIdFromRuntimeMessage(params);
  if (turnId && state.activeTurnId) {
    return turnId === state.activeTurnId;
  }
  return sessionCount === 1;
};

export const handleRuntimeNotification = (
  state: CodexRunSessionState,
  method: string,
  params: JsonObject,
  emitEvent: (state: CodexRunSessionState, event: CodexRuntimeEvent) => void,
): void => {
  const normalizedMethod = normalizeCodexRuntimeMethod(method);
  if (normalizedMethod === "codex/event/mcp_startup_complete") {
    state.startup.resolveReady();
  } else if (normalizedMethod === "turn/started") {
    state.currentStatus = "RUNNING";
    const turn = asObject(params.turn);
    state.activeTurnId = asString(turn?.id);
  } else if (normalizedMethod === "turn/completed") {
    state.currentStatus = "IDLE";
    state.activeTurnId = null;
  } else if (normalizedMethod === "thread/started") {
    const thread = asObject(params.thread);
    const nextThreadId = asString(thread?.id);
    if (nextThreadId) {
      state.threadId = nextThreadId;
    }
  } else if (normalizedMethod === "thread/status/changed") {
    const status = asObject(params.status);
    const statusType = asString(status?.type)?.toLowerCase();
    if (statusType === "idle") {
      state.currentStatus = "IDLE";
    } else if (
      statusType === "inprogress" ||
      statusType === "running" ||
      statusType === "active"
    ) {
      state.currentStatus = "RUNNING";
    } else if (statusType === "error" || statusType === "failed") {
      state.currentStatus = "ERROR";
    }
  } else if (normalizedMethod === "thread/tokenUsage/updated") {
    const nextThreadId = resolveThreadIdFromRuntimeMessage(params);
    if (nextThreadId) {
      state.threadId = nextThreadId;
    }
  }

  emitEvent(state, { method: normalizedMethod, params });
};

type InterAgentRelayRequest = {
  state: CodexRunSessionState;
  requestId: string | number;
  method: string;
  params: JsonObject;
  relayHandler: CodexInterAgentRelayHandler | null;
  emitEvent?: (state: CodexRunSessionState, event: CodexRuntimeEvent) => void;
};

const resolveSendMessageInvocationId = (
  requestId: string | number,
  params: JsonObject,
): string => {
  const item = asObject(params.item) ?? {};
  const command = asObject(params.command) ?? {};
  const commandExecution = asObject(params.commandExecution) ?? {};
  const itemCommand = asObject(item.command) ?? {};
  const candidate =
    asString(params.invocation_id) ??
    asString(params.invocationId) ??
    asString(params.tool_invocation_id) ??
    asString(params.toolInvocationId) ??
    asString(params.id) ??
    asString(params.itemId) ??
    asString(params.item_id) ??
    asString(params.call_id) ??
    asString(params.callId) ??
    asString(item.id) ??
    asString(command.id) ??
    asString(command.call_id) ??
    asString(command.callId) ??
    asString(command.invocation_id) ??
    asString(command.invocationId) ??
    asString(commandExecution.id) ??
    asString(commandExecution.call_id) ??
    asString(commandExecution.callId) ??
    asString(commandExecution.invocation_id) ??
    asString(commandExecution.invocationId) ??
    asString(itemCommand.id) ??
    asString(itemCommand.call_id) ??
    asString(itemCommand.callId) ??
    asString(itemCommand.invocation_id) ??
    asString(itemCommand.invocationId);
  if (candidate) {
    return candidate;
  }
  return String(requestId);
};

const createSendMessageToolPayload = (
  invocationId: string,
  toolArguments: Record<string, unknown>,
): JsonObject => ({
  id: invocationId,
  item_id: invocationId,
  invocation_id: invocationId,
  tool: "send_message_to",
  tool_name: "send_message_to",
  arguments: toolArguments,
  item: {
    id: invocationId,
    type: "tool_call",
    tool: "send_message_to",
    tool_name: "send_message_to",
    arguments: toolArguments,
  },
});

const emitSendMessageToToolLifecycle = (input: {
  state: CodexRunSessionState;
  emitEvent?: (state: CodexRunSessionState, event: CodexRuntimeEvent) => void;
  invocationId: string;
  toolArguments: Record<string, unknown>;
  success: boolean;
  message: string;
}): void => {
  if (!input.emitEvent) {
    return;
  }
  logSendMessageRelayDebug("synthetic_lifecycle_emitted", {
    runId: input.state.runId,
    teamRunId: input.state.teamRunId,
    memberName: input.state.memberName,
    invocationId: input.invocationId,
    recipient: resolveRecipientFromToolArguments(input.toolArguments),
    messageType: resolveMessageTypeFromToolArguments(input.toolArguments),
    contentLength: resolveContentLengthFromToolArguments(input.toolArguments),
    success: input.success,
    message: input.message,
  });

  const basePayload = createSendMessageToolPayload(input.invocationId, input.toolArguments);
  const completedPayload: JsonObject = {
    ...basePayload,
    status: input.success ? "completed" : "failed",
    success: input.success,
    ...(input.success ? { result: { success: true, message: input.message } } : {}),
    ...(!input.success ? { error: input.message, message: input.message } : {}),
    item: {
      id: input.invocationId,
      type: "tool_call",
      tool: "send_message_to",
      tool_name: "send_message_to",
      arguments: input.toolArguments,
      status: input.success ? "completed" : "failed",
      success: input.success,
      ...(input.success ? { result: { success: true, message: input.message } } : {}),
      ...(!input.success ? { error: input.message, message: input.message } : {}),
    },
  };

  input.emitEvent(input.state, {
    method: "item/completed",
    params: completedPayload,
  });
};

export const tryHandleInterAgentRelayRequest = ({
  state,
  requestId,
  method,
  params,
  relayHandler,
  emitEvent,
}: InterAgentRelayRequest): boolean => {
  if (method === "item/commandExecution/requestApproval") {
    const commandName = resolveCommandNameFromApprovalParams(params)?.toLowerCase() ?? null;
    if (!isSendMessageToToolName(commandName)) {
      return false;
    }
    const toolArguments = resolveCommandArgsFromApprovalParams(params);
    const invocationId = resolveSendMessageInvocationId(requestId, params);
    logSendMessageRelayDebug("approval_intercepted", {
      runId: state.runId,
      teamRunId: state.teamRunId,
      memberName: state.memberName,
      requestId: String(requestId),
      invocationId,
      recipient: resolveRecipientFromToolArguments(toolArguments),
      messageType: resolveMessageTypeFromToolArguments(toolArguments),
      contentLength: resolveContentLengthFromToolArguments(toolArguments),
    });
    const emitLifecycle = (success: boolean, message: string): void => {
      emitSendMessageToToolLifecycle({
        state,
        emitEvent,
        invocationId,
        toolArguments,
        success,
        message,
      });
    };
    if (!state.sendMessageToEnabled) {
      logSendMessageRelayDebug("approval_rejected", {
        reason: "send_message_to_disabled",
        runId: state.runId,
        requestId: String(requestId),
        invocationId,
      });
      emitLifecycle(false, "send_message_to is not enabled for this run session.");
      state.client.respondError(
        requestId,
        -32001,
        "send_message_to is not enabled for this run session.",
      );
      return true;
    }

    if (!relayHandler) {
      logSendMessageRelayDebug("approval_rejected", {
        reason: "relay_handler_not_configured",
        runId: state.runId,
        requestId: String(requestId),
        invocationId,
      });
      emitLifecycle(false, "send_message_to relay handler is not configured.");
      state.client.respondError(
        requestId,
        -32001,
        "send_message_to relay handler is not configured.",
      );
      return true;
    }

    void relayHandler({
      senderRunId: state.runId,
      senderTeamRunId: state.teamRunId,
      senderMemberName: state.memberName,
      senderTurnId: state.activeTurnId,
      toolArguments,
    })
      .then((result) => {
        if (!result.accepted) {
          logSendMessageRelayDebug("approval_relay_result", {
            runId: state.runId,
            requestId: String(requestId),
            invocationId,
            accepted: false,
            code: result.code ?? null,
            message: result.message ?? null,
          });
          emitLifecycle(false, result.message ?? "Inter-agent relay rejected.");
          state.client.respondError(
            requestId,
            -32001,
            result.message ?? "Inter-agent relay rejected.",
          );
          return;
        }
        logSendMessageRelayDebug("approval_relay_result", {
          runId: state.runId,
          requestId: String(requestId),
          invocationId,
          accepted: true,
          code: null,
          message: result.message ?? "Message relayed.",
        });
        emitLifecycle(true, result.message ?? "Message relayed.");
        state.client.respondSuccess(requestId, { decision: "accept" });
      })
      .catch((error) => {
        const message = `Inter-agent relay failed: ${String(error)}`;
        logSendMessageRelayDebug("approval_relay_error", {
          runId: state.runId,
          requestId: String(requestId),
          invocationId,
          error: message,
        });
        emitLifecycle(false, message);
        state.client.respondError(
          requestId,
          -32001,
          message,
        );
      });

    return true;
  }

  if (method !== "item/tool/call") {
    return false;
  }

  const toolName = resolveDynamicToolNameFromParams(params);
  if (!isSendMessageToToolName(toolName)) {
    return false;
  }
  const toolArguments = resolveDynamicToolArgsFromParams(params);
  const invocationId = resolveSendMessageInvocationId(requestId, params);
  logSendMessageRelayDebug("tool_call_intercepted", {
    runId: state.runId,
    teamRunId: state.teamRunId,
    memberName: state.memberName,
    requestId: String(requestId),
    invocationId,
    recipient: resolveRecipientFromToolArguments(toolArguments),
    messageType: resolveMessageTypeFromToolArguments(toolArguments),
    contentLength: resolveContentLengthFromToolArguments(toolArguments),
  });

  if (!state.sendMessageToEnabled) {
    logSendMessageRelayDebug("tool_call_rejected", {
      reason: "send_message_to_disabled",
      runId: state.runId,
      requestId: String(requestId),
      invocationId,
    });
    emitSendMessageToToolLifecycle({
      state,
      emitEvent,
      invocationId,
      toolArguments,
      success: false,
      message: "send_message_to is not enabled for this run session.",
    });
    state.client.respondSuccess(
      requestId,
      toDynamicToolResponse({
        success: false,
        message: "send_message_to is not enabled for this run session.",
      }),
    );
    return true;
  }

  if (!relayHandler) {
    logSendMessageRelayDebug("tool_call_rejected", {
      reason: "relay_handler_not_configured",
      runId: state.runId,
      requestId: String(requestId),
      invocationId,
    });
    emitSendMessageToToolLifecycle({
      state,
      emitEvent,
      invocationId,
      toolArguments,
      success: false,
      message: "send_message_to relay handler is not configured.",
    });
    state.client.respondSuccess(
      requestId,
      toDynamicToolResponse({
        success: false,
        message: "send_message_to relay handler is not configured.",
      }),
    );
    return true;
  }

  void relayHandler({
    senderRunId: state.runId,
    senderTeamRunId: state.teamRunId,
    senderMemberName: state.memberName,
    senderTurnId: state.activeTurnId,
    toolArguments,
  })
    .then((result) => {
      if (!result.accepted) {
        logSendMessageRelayDebug("tool_call_relay_result", {
          runId: state.runId,
          requestId: String(requestId),
          invocationId,
          accepted: false,
          code: result.code ?? null,
          message: result.message ?? null,
        });
        emitSendMessageToToolLifecycle({
          state,
          emitEvent,
          invocationId,
          toolArguments,
          success: false,
          message: result.message ?? "Inter-agent relay rejected.",
        });
        state.client.respondSuccess(
          requestId,
          toDynamicToolResponse({
            success: false,
            message: result.message ?? "Inter-agent relay rejected.",
          }),
        );
        return;
      }
      logSendMessageRelayDebug("tool_call_relay_result", {
        runId: state.runId,
        requestId: String(requestId),
        invocationId,
        accepted: true,
        code: null,
        message: result.message ?? "Message relayed.",
      });
      emitSendMessageToToolLifecycle({
        state,
        emitEvent,
        invocationId,
        toolArguments,
        success: true,
        message: result.message ?? "Message relayed.",
      });
      state.client.respondSuccess(
        requestId,
        toDynamicToolResponse({
          success: true,
          message: result.message ?? "Message relayed.",
        }),
      );
    })
    .catch((error) => {
      const message = `Inter-agent relay failed: ${String(error)}`;
      logSendMessageRelayDebug("tool_call_relay_error", {
        runId: state.runId,
        requestId: String(requestId),
        invocationId,
        error: message,
      });
      emitSendMessageToToolLifecycle({
        state,
        emitEvent,
        invocationId,
        toolArguments,
        success: false,
        message,
      });
      state.client.respondSuccess(
        requestId,
        toDynamicToolResponse({
          success: false,
          message,
        }),
      );
    });

  return true;
};

type RuntimeServerRequest = {
  state: CodexRunSessionState;
  requestId: string | number;
  method: string;
  params: JsonObject;
  relayHandler: CodexInterAgentRelayHandler | null;
  emitEvent: (state: CodexRunSessionState, event: CodexRuntimeEvent) => void;
};

export const handleRuntimeServerRequest = ({
  state,
  requestId,
  method,
  params,
  relayHandler,
  emitEvent,
}: RuntimeServerRequest): void => {
  const normalizedMethod = normalizeCodexRuntimeMethod(method);
  if (
    tryHandleInterAgentRelayRequest({
      state,
      requestId,
      method: normalizedMethod,
      params,
      relayHandler,
      emitEvent,
    })
  ) {
    return;
  }

  if (
    normalizedMethod !== "item/commandExecution/requestApproval" &&
    normalizedMethod !== "item/fileChange/requestApproval"
  ) {
    state.client.respondError(
      requestId,
      -32601,
      `Unsupported server request method '${normalizedMethod}'.`,
    );
    return;
  }

  const invocation = resolveApprovalInvocationCandidates(params);
  if (!invocation.primary || !invocation.itemId) {
    state.client.respondError(requestId, -32602, "Approval request missing itemId.");
    return;
  }

  const record: CodexApprovalRecord = {
    requestId,
    method: normalizedMethod,
    invocationId: invocation.primary,
    itemId: invocation.itemId,
    approvalId: invocation.approvalId,
  };
  state.approvalRecords.set(invocation.primary, record);
  for (const alias of invocation.aliases) {
    state.approvalRecords.set(alias, record);
  }

  emitEvent(state, {
    method: normalizedMethod,
    params,
    request_id: requestId,
  });
};

export const findApprovalRecord = (
  state: CodexRunSessionState,
  invocationId: string,
): CodexApprovalRecord | null => {
  const direct = state.approvalRecords.get(invocationId);
  if (direct) {
    return direct;
  }
  const trimmed = invocationId.trim();
  if (!trimmed) {
    return null;
  }
  const baseId = trimmed.includes(":") ? trimmed.split(":")[0] ?? null : null;
  if (baseId) {
    return state.approvalRecords.get(baseId) ?? null;
  }
  return null;
};

export const deleteApprovalRecord = (
  state: CodexRunSessionState,
  record: CodexApprovalRecord,
): void => {
  state.approvalRecords.delete(record.invocationId);
  state.approvalRecords.delete(record.itemId);
};
