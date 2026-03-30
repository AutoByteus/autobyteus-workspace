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
    };
    codexThread.recordApprovalRecord(record, invocation.aliases);

    emitEvent(codexThread, {
      method: eventMethod,
      params,
      request_id: requestId,
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
