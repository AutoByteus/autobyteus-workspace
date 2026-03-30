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

  emitEvent(codexThread, { method: eventMethod, params });
};
