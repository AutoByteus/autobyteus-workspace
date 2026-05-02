import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import type { CodexAppServerMessage } from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import {
  resolveThreadIdFromAppServerMessage,
  resolveTurnIdFromAppServerMessage,
} from "./codex-thread-id-resolver.js";
import type { CodexThread } from "./codex-thread.js";
import { resolveCodexThreadTokenUsage } from "./codex-thread-token-usage.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const hasEntries = (value: JsonObject): boolean => Object.keys(value).length > 0;

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
    const turn = asObject(params.turn);
    codexThread.markTurnCompleted(asString(turn?.id));
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
    const turnId =
      resolveTurnIdFromAppServerMessage(params) ??
      codexThread.activeTurnId;
    const usage = resolveCodexThreadTokenUsage(params);
    if (!turnId) {
      logger.warn(
        `Run '${codexThread.runId}': Codex token-usage update arrived without a turn id. Skipping persistence.`,
      );
    } else if (!usage) {
      logger.warn(
        `Run '${codexThread.runId}': Codex token-usage update for turn '${turnId}' did not include usable token counts.`,
      );
    } else {
      codexThread.recordTurnTokenUsage(turnId, usage);
    }
  }

  if (itemType === "mcptoolcall") {
    const invocationId = asString(item?.id);
    if (eventMethod === CodexThreadEventName.ITEM_STARTED && invocationId) {
      codexThread.trackPendingMcpToolCall({
        invocationId,
        turnId: asString(params.turnId) ?? asString(params.turn_id),
        serverName: asString(item?.server),
        toolName: asString(item?.tool),
        arguments: asObject(item?.arguments) ?? {},
      });
    }
    if (eventMethod === CodexThreadEventName.ITEM_COMPLETED) {
      if (invocationId) {
        const pending = codexThread.completePendingMcpToolCall(invocationId);
        const pendingArguments = pending?.arguments ?? {};
        const itemArguments = asObject(item?.arguments) ?? {};
        const argumentsPayload = { ...itemArguments, ...pendingArguments };
        const toolName = asString(item?.tool) ?? pending?.toolName ?? null;
        const turnId = asString(params.turnId) ?? asString(params.turn_id) ?? pending?.turnId ?? null;
        emitEvent(codexThread, {
          method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
          params: {
            ...params,
            invocation_id: invocationId,
            ...(turnId ? { turn_id: turnId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            ...(hasEntries(argumentsPayload) ? { arguments: argumentsPayload } : {}),
          },
        });
      }
    }
  }

  emitEvent(codexThread, { method: eventMethod, params });
};
