import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import type { CodexLocalDerivedEventInput } from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import {
  resolveThreadIdFromAppServerMessage,
  resolveTurnIdFromAppServerMessage,
} from "./codex-thread-id-resolver.js";
import type {
  CodexNativeAdmittedThreadEventMessage,
  CodexThread,
} from "./codex-thread.js";
import { resolveCodexThreadTokenUsage } from "./codex-thread-token-usage.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const hasEntries = (value: Readonly<JsonObject>): boolean => Object.keys(value).length > 0;

const isExplicitStaleTurnBoundary = (
  eventTurnId: string | null,
  activeTurnId: string | null,
): boolean => Boolean(
  eventTurnId &&
  activeTurnId &&
  eventTurnId !== activeTurnId,
);

const noEmissionResult = (): CodexNotificationHandlingResult => Object.freeze({
  localDerivedEvents: Object.freeze([]),
  emitNativeMessage: false,
});

export type CodexNotificationHandlingResult = Readonly<{
  localDerivedEvents: readonly CodexLocalDerivedEventInput[];
  emitNativeMessage: boolean;
}>;

export const handleAppServerNotification = (
  codexThread: CodexThread,
  message: CodexNativeAdmittedThreadEventMessage,
): CodexNotificationHandlingResult => {
  const eventMethod = message.method;
  const params = message.params;
  const localDerivedEvents: CodexLocalDerivedEventInput[] = [];
  let eventParams = params;
  const item = asObject(params.item);
  const itemType = asString(item?.type)?.replace(/[_-]/g, "").toLowerCase();
  if (eventMethod === CodexThreadEventName.TURN_STARTED) {
    const turn = asObject(params.turn);
    codexThread.markTurnStarted(asString(turn?.id));
  } else if (eventMethod === CodexThreadEventName.TURN_COMPLETED) {
    const eventTurnId = resolveTurnIdFromAppServerMessage(params);
    if (isExplicitStaleTurnBoundary(eventTurnId, codexThread.activeTurnId)) {
      return noEmissionResult();
    }
    codexThread.markTurnCompleted(eventTurnId);
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
      const eventTurnId = resolveTurnIdFromAppServerMessage(params);
      if (isExplicitStaleTurnBoundary(eventTurnId, codexThread.activeTurnId)) {
        return noEmissionResult();
      }
      const turnId = eventTurnId ?? codexThread.activeTurnId;
      if (turnId) {
        codexThread.markTurnFailed(turnId);
        localDerivedEvents.push({
          method: CodexThreadEventName.ERROR,
          params: {
            code: "CODEX_THREAD_STATUS_FAILED",
            message: asString(params.message) ?? "Codex thread status changed to error.",
            error_scope: "turn",
            error_effect: "terminal",
            turn_id: turnId,
          },
        });
        return Object.freeze({
          localDerivedEvents: Object.freeze(localDerivedEvents),
          emitNativeMessage: false,
        });
      }
      codexThread.setCurrentStatus("ERROR");
    }
  } else if (eventMethod === CodexThreadEventName.ERROR) {
    const eventTurnId = resolveTurnIdFromAppServerMessage(params);
    const errorEffect = params.willRetry === true ? "diagnostic" : "terminal";
    if (
      errorEffect === "terminal" &&
      isExplicitStaleTurnBoundary(eventTurnId, codexThread.activeTurnId)
    ) {
      return noEmissionResult();
    }
    const turnId = eventTurnId ?? codexThread.activeTurnId;
    if (turnId) {
      if (errorEffect === "terminal") {
        codexThread.markTurnFailed(turnId);
      }
      eventParams = {
        ...params,
        error_scope: "turn",
        error_effect: errorEffect,
        turn_id: turnId,
      };
    }
  } else if (eventMethod === CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED) {
    const nextThreadId = resolveThreadIdFromAppServerMessage(params);
    if (nextThreadId) {
      codexThread.setThreadId(nextThreadId);
    }
    const turnId =
      resolveTurnIdFromAppServerMessage(params) ??
      codexThread.activeTurnId;
    const usage = turnId
      ? resolveCodexThreadTokenUsage({
          params,
          runId: codexThread.runId,
          turnId,
          threadId: codexThread.threadId,
          model: codexThread.model,
        })
      : null;
    if (!turnId) {
      logger.warn(
        `Run '${codexThread.runId}': Codex token-usage update arrived without a turn id. Skipping persistence.`,
      );
    } else if (!usage) {
      logger.warn(
        `Run '${codexThread.runId}': Codex token-usage update for turn '${turnId}' did not include usable token counts.`,
      );
    } else {
      codexThread.recordTokenUsageUpdate(usage);
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
        localDerivedEvents.push({
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

  if (eventParams !== params) {
    localDerivedEvents.push({ method: eventMethod, params: eventParams });
  }

  return Object.freeze({
    localDerivedEvents: Object.freeze(localDerivedEvents),
    emitNativeMessage: eventParams === params,
  });
};
