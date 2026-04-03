import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import type { CodexAppServerMessage } from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import { resolveThreadIdFromAppServerMessage } from "./codex-thread-id-resolver.js";
import type { CodexThread } from "./codex-thread.js";

export const handleAppServerNotification = (
  codexThread: CodexThread,
  method: string,
  params: JsonObject,
  emitEvent: (codexThread: CodexThread, event: CodexAppServerMessage) => void,
): void => {
  const eventMethod = method.trim();
  const item = asObject(params.item);
  const itemType = asString(item?.type)?.replace(/[_-]/g, "").toLowerCase();
  if (eventMethod === CodexThreadEventName.TURN_STARTED) {
    const turn = asObject(params.turn);
    codexThread.markTurnStarted(asString(turn?.id));
  } else if (eventMethod === CodexThreadEventName.TURN_COMPLETED) {
    codexThread.markTurnCompleted();
  } else if (eventMethod === CodexThreadEventName.THREAD_STARTED) {
    const thread = asObject(params.thread);
    const nextThreadId = asString(thread?.id);
    if (nextThreadId) {
      codexThread.setThreadId(nextThreadId);
    }
  } else if (eventMethod === CodexThreadEventName.THREAD_STATUS_CHANGED) {
    const status = asObject(params.status);
    const statusType = asString(status?.type)?.toLowerCase();
    if (statusType === "idle") {
      codexThread.setCurrentStatus("IDLE");
    } else if (
      statusType === "inprogress" ||
      statusType === "running" ||
      statusType === "active"
    ) {
      codexThread.setCurrentStatus("RUNNING");
    } else if (statusType === "error" || statusType === "failed") {
      codexThread.setCurrentStatus("ERROR");
    }
  } else if (eventMethod === CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED) {
    const nextThreadId = resolveThreadIdFromAppServerMessage(params);
    if (nextThreadId) {
      codexThread.setThreadId(nextThreadId);
    }
  }

  if (itemType === "mcptoolcall") {
    const invocationId = asString(item?.id);
    if (eventMethod === CodexThreadEventName.ITEM_STARTED && invocationId) {
      codexThread.trackPendingMcpToolCall({
        invocationId,
        turnId: asString(params.turnId),
        serverName: asString(item?.server),
        toolName: asString(item?.tool),
        arguments: asObject(item?.arguments) ?? {},
      });
    }
    if (eventMethod === CodexThreadEventName.ITEM_COMPLETED) {
      if (invocationId) {
        emitEvent(codexThread, {
          method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
          params: {
            ...params,
            invocation_id: invocationId,
            ...(asString(item?.tool) ? { tool_name: asString(item?.tool) } : {}),
          },
        });
      }
      codexThread.completePendingMcpToolCall(invocationId);
    }
  }

  emitEvent(codexThread, { method: eventMethod, params });
};
