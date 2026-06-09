import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
} from "../codex-dynamic-tool.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import type { CodexApprovalRecord } from "./codex-approval-record.js";
import type { CodexAppServerMessage } from "./codex-app-server-message.js";
import {
  buildCodexPermissionApprovalArguments,
  buildCodexPermissionGrantResponse,
  buildCodexPermissionNoGrantResponse,
} from "./codex-permission-approval-response.js";
import type { CodexThread } from "./codex-thread.js";

type CodexToolApprovalCoordinatorInput = {
  codexThread: CodexThread;
  requestId: string | number;
  method: string;
  params: JsonObject;
  emitEvent: (codexThread: CodexThread, event: CodexAppServerMessage) => void;
};

type PendingApprovalResponseInput = {
  codexThread: CodexThread;
  approval: CodexApprovalRecord;
  approved: boolean;
  emitEvent: (event: CodexAppServerMessage) => void;
};

const REQUEST_PERMISSIONS_TOOL_NAME = "request_permissions";

const resolveApprovalIdentity = (params: JsonObject) => {
  const itemId = asString(params.itemId);
  const approvalId = asString(params.approvalId);
  return {
    invocationId: itemId,
    approvalId: approvalId ?? null,
  };
};

const isTerminalApprovalRequestMethod = (eventMethod: string): boolean =>
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

const toToolArguments = (value: unknown): JsonObject => asObject(value) ?? {};

const respondDynamicToolResult = (
  codexThread: CodexThread,
  requestId: string | number,
  result: CodexDynamicToolCallResult,
): void => {
  codexThread.client.respondSuccess(requestId, result);
};

const emitLocalToolApproved = (
  emitEvent: (event: CodexAppServerMessage) => void,
  approval: Pick<CodexApprovalRecord, "invocationId" | "approvalId" | "requestId" | "toolName">,
  params: JsonObject = {},
): void => {
  emitEvent({
    method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
    params: {
      ...params,
      invocation_id: approval.invocationId,
      itemId: approval.invocationId,
      approvalId: approval.approvalId,
      requestId: approval.requestId,
      ...(approval.toolName ? { tool_name: approval.toolName } : {}),
    },
  });
};

const handleTerminalApprovalRequest = ({
  codexThread,
  requestId,
  method,
  params,
  emitEvent,
}: CodexToolApprovalCoordinatorInput): void => {
  const invocation = resolveApprovalIdentity(params);
  if (!invocation.invocationId) {
    codexThread.client.respondError(requestId, -32602, "Approval request missing itemId.");
    return;
  }

  const toolName =
    method === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL
      ? "edit_file"
      : "run_bash";
  if (codexThread.runContext.config.autoExecuteTools) {
    codexThread.client.respondSuccess(requestId, { decision: "accept" });
    emitLocalToolApproved(
      (event) => emitEvent(codexThread, event),
      {
        requestId,
        invocationId: invocation.invocationId,
        approvalId: invocation.approvalId,
        toolName,
      },
      params,
    );
    return;
  }

  const record: CodexApprovalRecord = {
    requestId,
    method,
    invocationId: invocation.invocationId,
    approvalId: invocation.approvalId,
    responseMode: "decision",
    toolName,
  };
  codexThread.recordApprovalRecord(record);

  emitEvent(codexThread, {
    method,
    params: {
      ...params,
      invocation_id: invocation.invocationId,
    },
    request_id: requestId,
  });
};

const handleMcpToolApprovalRequest = ({
  codexThread,
  requestId,
  params,
  emitEvent,
}: Pick<CodexToolApprovalCoordinatorInput, "codexThread" | "requestId" | "params" | "emitEvent">): void => {
  if (!isSimpleMcpToolApprovalRequest(params)) {
    codexThread.client.respondError(
      requestId,
      -32602,
      "Unsupported MCP elicitation payload for tool approval bridge.",
    );
    return;
  }

  const meta = asObject(params._meta);
  const toolArguments = toToolArguments(meta?.tool_params);
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

  const resolvedToolName = pendingCall.toolName ?? toolName;
  if (codexThread.runContext.config.autoExecuteTools) {
    codexThread.client.respondSuccess(requestId, { action: "accept" });
    emitEvent(codexThread, {
      method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
      params: {
        ...params,
        invocation_id: pendingCall.invocationId,
        itemId: pendingCall.invocationId,
        requestId,
        ...(resolvedToolName ? { tool_name: resolvedToolName } : {}),
      },
    });
    return;
  }

  const record: CodexApprovalRecord = {
    requestId,
    method: "mcpServer/elicitation/request",
    invocationId: pendingCall.invocationId,
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

const executeDynamicToolCall = async (
  codexThread: CodexThread,
  approval: Extract<CodexApprovalRecord, { responseMode: "dynamic_tool_call" }>,
): Promise<void> => {
  const handler = codexThread.runContext.runtimeContext.dynamicToolHandlers[approval.toolName] ?? null;
  if (!handler) {
    respondDynamicToolResult(
      codexThread,
      approval.requestId,
      createCodexDynamicToolTextResult(`Dynamic tool '${approval.toolName}' is unavailable.`, false),
    );
    return;
  }

  try {
    const result = await handler({
      runId: codexThread.runId,
      threadId: approval.threadId,
      turnId: approval.turnId,
      callId: approval.callId,
      toolName: approval.toolName,
      arguments: approval.arguments,
    });
    respondDynamicToolResult(codexThread, approval.requestId, result);
  } catch (error) {
    respondDynamicToolResult(
      codexThread,
      approval.requestId,
      createCodexDynamicToolTextResult(
        error instanceof Error ? error.message : String(error),
        false,
      ),
    );
  }
};

const handleDynamicToolCallRequest = async ({
  codexThread,
  requestId,
  method,
  params,
  emitEvent,
}: CodexToolApprovalCoordinatorInput): Promise<void> => {
  const toolName = asString(params.tool);
  const callId = asString(params.callId);
  const threadId = asString(params.threadId) ?? codexThread.threadId;
  const toolArguments = toToolArguments(params.arguments);

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

  const approval: Extract<CodexApprovalRecord, { responseMode: "dynamic_tool_call" }> = {
    requestId,
    method,
    invocationId: callId,
    approvalId: null,
    responseMode: "dynamic_tool_call",
    threadId,
    turnId: asString(params.turnId),
    callId,
    toolName,
    arguments: toolArguments,
  };

  if (codexThread.runContext.config.autoExecuteTools) {
    await executeDynamicToolCall(codexThread, approval);
    return;
  }

  codexThread.recordApprovalRecord(approval);
  emitEvent(codexThread, {
    method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
    params: {
      ...params,
      invocation_id: callId,
      itemId: callId,
      tool_name: toolName,
      arguments: toolArguments,
    },
    request_id: requestId,
  });
};

const handlePermissionApprovalRequest = ({
  codexThread,
  requestId,
  method,
  params,
  emitEvent,
}: CodexToolApprovalCoordinatorInput): void => {
  const invocationId = asString(params.itemId);
  const permissions = asObject(params.permissions);
  if (!invocationId || !permissions) {
    codexThread.client.respondError(
      requestId,
      -32602,
      "Permission approval request missing itemId or permissions.",
    );
    return;
  }

  const threadId = asString(params.threadId);
  const turnId = asString(params.turnId);
  const cwd = asString(params.cwd);
  const reason = asString(params.reason);
  const approvalArguments = buildCodexPermissionApprovalArguments({
    permissions,
    cwd,
    reason,
  });

  if (codexThread.runContext.config.autoExecuteTools) {
    codexThread.client.respondSuccess(
      requestId,
      buildCodexPermissionGrantResponse(permissions, "session"),
    );
    emitLocalToolApproved(
      (event) => emitEvent(codexThread, event),
      {
        requestId,
        invocationId,
        approvalId: null,
        toolName: REQUEST_PERMISSIONS_TOOL_NAME,
      },
      {
        ...params,
        arguments: approvalArguments,
      },
    );
    return;
  }

  const record: CodexApprovalRecord = {
    requestId,
    method,
    invocationId,
    approvalId: null,
    responseMode: "permission_request",
    threadId,
    turnId,
    cwd,
    reason,
    permissions,
    toolName: REQUEST_PERMISSIONS_TOOL_NAME,
  };
  codexThread.recordApprovalRecord(record);

  emitEvent(codexThread, {
    method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
    params: {
      ...params,
      invocation_id: invocationId,
      itemId: invocationId,
      tool_name: REQUEST_PERMISSIONS_TOOL_NAME,
      arguments: approvalArguments,
    },
    request_id: requestId,
  });
};

export const handleCodexToolApprovalRequest = async (
  input: CodexToolApprovalCoordinatorInput,
): Promise<boolean> => {
  const eventMethod = input.method.trim();
  if (isTerminalApprovalRequestMethod(eventMethod)) {
    handleTerminalApprovalRequest({ ...input, method: eventMethod });
    return true;
  }
  if (isMcpServerElicitationRequestMethod(eventMethod)) {
    handleMcpToolApprovalRequest(input);
    return true;
  }
  if (eventMethod === CodexThreadEventName.ITEM_TOOL_CALL) {
    await handleDynamicToolCallRequest({ ...input, method: eventMethod });
    return true;
  }
  if (eventMethod === CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL) {
    handlePermissionApprovalRequest({ ...input, method: eventMethod });
    return true;
  }
  return false;
};

export const respondToPendingCodexToolApproval = async ({
  codexThread,
  approval,
  approved,
  emitEvent,
}: PendingApprovalResponseInput): Promise<void> => {
  if (approval.responseMode === "mcp_server_elicitation") {
    codexThread.client.respondSuccess(approval.requestId, {
      action: approved ? "accept" : "decline",
    });
  } else if (approval.responseMode === "decision") {
    codexThread.client.respondSuccess(approval.requestId, {
      decision: approved ? "accept" : "decline",
    });
  } else if (approval.responseMode === "dynamic_tool_call") {
    if (approved) {
      await executeDynamicToolCall(codexThread, approval);
    } else {
      respondDynamicToolResult(
        codexThread,
        approval.requestId,
        createCodexDynamicToolTextResult("Tool execution denied by user.", false),
      );
    }
  } else {
    codexThread.client.respondSuccess(
      approval.requestId,
      approved
        ? buildCodexPermissionGrantResponse(approval.permissions, "turn")
        : buildCodexPermissionNoGrantResponse(),
    );
  }

  if (approved) {
    emitLocalToolApproved(emitEvent, approval);
  }
};
