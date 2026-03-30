import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
} from "../codex-dynamic-tool.js";
import type { CodexApprovalRecord } from "./codex-approval-record.js";
import type { CodexAppServerMessage } from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import type { CodexThread } from "./codex-thread.js";

const resolveApprovalInvocationCandidates = (params: JsonObject) => {
  const itemId = asString(params.itemId);
  const approvalId = asString(params.approvalId);
  if (!itemId) {
    return { primary: null, aliases: [], itemId: null, approvalId };
  }
  if (!approvalId) {
    return { primary: itemId, aliases: [], itemId, approvalId: null };
  }
  return {
    primary: `${itemId}:${approvalId}`,
    aliases: [itemId],
    itemId,
    approvalId,
  };
};

type AppServerRequest = {
  codexThread: CodexThread;
  requestId: string | number;
  method: string;
  params: JsonObject;
  emitEvent: (codexThread: CodexThread, event: CodexAppServerMessage) => void;
};

const isApprovalRequestMethod = (eventMethod: string): boolean =>
  eventMethod === CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL ||
  eventMethod === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL;

const isMcpServerElicitationRequestMethod = (eventMethod: string): boolean =>
  eventMethod === "mcpServer/elicitation/request";

const extractMcpToolNameFromMessage = (message: string | null): string | null => {
  if (!message) {
    return null;
  }
  const matched = message.match(/run tool "([^"]+)"/i);
  return matched?.[1]?.trim() || null;
};

const isSimpleMcpToolApprovalRequest = (params: JsonObject): boolean => {
  const mode = asString(params.mode);
  const meta = asObject(params._meta);
  const approvalKind = asString(meta?.codex_approval_kind);
  const requestedSchema = asObject(params.requestedSchema);
  const properties = asObject(requestedSchema?.properties);
  return (
    mode === "form" &&
    approvalKind === "mcp_tool_call" &&
    Object.keys(properties ?? {}).length === 0
  );
};

const handleMcpToolApprovalRequest = ({
  codexThread,
  requestId,
  params,
  emitEvent,
}: Pick<AppServerRequest, "codexThread" | "requestId" | "params" | "emitEvent">): void => {
  if (!isSimpleMcpToolApprovalRequest(params)) {
    codexThread.client.respondError(
      requestId,
      -32602,
      "Unsupported MCP elicitation payload for tool approval bridge.",
    );
    return;
  }

  const meta = asObject(params._meta);
  const toolArguments = asObject(meta?.tool_params) ?? {};
  const toolName =
    asString(meta?.tool_name) ??
    extractMcpToolNameFromMessage(asString(params.message));
  const pendingCall = codexThread.findPendingMcpToolCall({
    turnId: asString(params.turnId),
    serverName: asString(params.serverName),
    toolName,
  });

  if (!pendingCall) {
    codexThread.client.respondError(
      requestId,
      -32602,
      "MCP tool approval request did not match a pending MCP tool call.",
    );
    return;
  }

  if (codexThread.runContext.config.autoExecuteTools) {
    codexThread.client.respondSuccess(requestId, { action: "accept" });
    emitEvent(codexThread, {
      method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
      params: {
        ...params,
        invocation_id: pendingCall.invocationId,
        itemId: pendingCall.invocationId,
        requestId,
        ...(pendingCall.toolName ?? toolName ? { tool_name: pendingCall.toolName ?? toolName } : {}),
      },
    });
    return;
  }

  const resolvedToolName = pendingCall.toolName ?? toolName;
  const record: CodexApprovalRecord = {
    requestId,
    method: "mcpServer/elicitation/request",
    invocationId: pendingCall.invocationId,
    itemId: pendingCall.invocationId,
    approvalId: null,
    responseMode: "mcp_server_elicitation",
    toolName: resolvedToolName,
  };
  codexThread.recordApprovalRecord(record);

  emitEvent(codexThread, {
    method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
    params: {
      ...params,
      invocation_id: pendingCall.invocationId,
      itemId: pendingCall.invocationId,
      ...(resolvedToolName ? { tool_name: resolvedToolName } : {}),
      arguments:
        Object.keys(toolArguments).length > 0
          ? toolArguments
          : pendingCall.arguments,
    },
    request_id: requestId,
  });
};

const respondDynamicToolResult = (
  codexThread: CodexThread,
  requestId: string | number,
  result: CodexDynamicToolCallResult,
): void => {
  codexThread.client.respondSuccess(requestId, result);
};

const handleDynamicToolCallRequest = async ({
  codexThread,
  requestId,
  params,
}: Omit<AppServerRequest, "emitEvent" | "method"> & { method?: string }): Promise<void> => {
  const toolName = asString(params.tool);
  const callId = asString(params.callId);
  const threadId = asString(params.threadId) ?? codexThread.threadId;
  const toolArguments = asObject(params.arguments) ?? {};

  if (!toolName || !callId || !threadId) {
    respondDynamicToolResult(
      codexThread,
      requestId,
      createCodexDynamicToolTextResult("Dynamic tool request payload was invalid.", false),
    );
    return;
  }

  const handler = codexThread.runContext.runtimeContext.dynamicToolHandlers[toolName] ?? null;
  if (!handler) {
    respondDynamicToolResult(
      codexThread,
      requestId,
      createCodexDynamicToolTextResult(`Dynamic tool '${toolName}' is unavailable.`, false),
    );
    return;
  }

  try {
    const result = await handler({
      runId: codexThread.runId,
      threadId,
      turnId: asString(params.turnId),
      callId,
      toolName,
      arguments: toolArguments,
    });
    respondDynamicToolResult(codexThread, requestId, result);
  } catch (error) {
    respondDynamicToolResult(
      codexThread,
      requestId,
      createCodexDynamicToolTextResult(
        error instanceof Error ? error.message : String(error),
        false,
      ),
    );
  }
};

export const handleAppServerRequest = async ({
  codexThread,
  requestId,
  method,
  params,
  emitEvent,
}: AppServerRequest): Promise<void> => {
  const eventMethod = method.trim();

  if (isApprovalRequestMethod(eventMethod)) {
    const invocation = resolveApprovalInvocationCandidates(params);
    if (!invocation.primary || !invocation.itemId) {
      codexThread.client.respondError(requestId, -32602, "Approval request missing itemId.");
      return;
    }

    const record: CodexApprovalRecord = {
      requestId,
      method: eventMethod,
      invocationId: invocation.primary,
      itemId: invocation.itemId,
      approvalId: invocation.approvalId,
      responseMode: "decision",
      toolName:
        eventMethod === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL
          ? "edit_file"
          : "run_bash",
    };
    codexThread.recordApprovalRecord(record, invocation.aliases);

    emitEvent(codexThread, {
      method: eventMethod,
      params,
      request_id: requestId,
    });
    return;
  }

  if (isMcpServerElicitationRequestMethod(eventMethod)) {
    handleMcpToolApprovalRequest({
      codexThread,
      requestId,
      params,
      emitEvent,
    });
    return;
  }

  if (eventMethod === CodexThreadEventName.ITEM_TOOL_CALL) {
    await handleDynamicToolCallRequest({
      codexThread,
      requestId,
      params,
    });
    return;
  }

  codexThread.client.respondError(
    requestId,
    -32601,
    `Unsupported server request method '${eventMethod}'.`,
  );
};
