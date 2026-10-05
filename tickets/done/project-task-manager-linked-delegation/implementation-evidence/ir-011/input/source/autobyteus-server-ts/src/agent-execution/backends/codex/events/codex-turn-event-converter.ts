import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import { resolveTurnIdFromAppServerMessage } from "../thread/codex-thread-id-resolver.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";
import type { CodexCompactionAbandonReason } from "./codex-provider-compaction-status-projector.js";

export type CodexTurnEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  closeReasoningBlocksForBoundary: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent[];
  closeAllReasoningBlocks: (codexEventName: string) => AgentRunEvent[];
  clearOrderedToolsForBoundary: (payload: JsonObject) => void;
  clearAllOrderedTools: () => void;
  /** Failed closes for compactions still open when the turn ends (all open ones when the turn id is unknown). */
  closeOpenCompactionsForTurn: (
    codexEventName: string,
    turnId: string | null,
    reason: CodexCompactionAbandonReason,
  ) => AgentRunEvent[];
};

const resolveTurnEndAbandonReason = (payload: JsonObject): CodexCompactionAbandonReason => {
  const turn = payload.turn && typeof payload.turn === "object" && !Array.isArray(payload.turn)
    ? payload.turn as Record<string, unknown>
    : null;
  const status = turn?.status ?? payload.status;
  return status === "interrupted" ? "interrupted" : status === "failed" ? "turn_failed" : "turn_ended";
};

export const isCodexTurnEventName = (codexEventName: string): boolean =>
  codexEventName.startsWith("turn/");

export const convertCodexTurnEvent = (
  context: CodexTurnEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  const turnId = resolveTurnIdFromAppServerMessage(payload);
  switch (codexEventName) {
    case CodexThreadEventName.TURN_STARTED:
      const startReasoningEnds = context.closeAllReasoningBlocks(codexEventName);
      context.clearAllOrderedTools();
      return [
        ...startReasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.TURN_STARTED, {
          ...(turnId ? { turnId } : {}),
        }),
      ];
    case CodexThreadEventName.TURN_COMPLETED:
      const completionReasoningEnds = context.closeReasoningBlocksForBoundary(
        codexEventName,
        payload,
      );
      context.clearOrderedToolsForBoundary(payload);
<<<<<<< HEAD
      const turn = asObject(payload.turn);
      const status = asString(turn?.status);
      if (status === "failed" && turnId) {
        const error = asObject(turn?.error);
        return [...completionReasoningEnds, context.createEvent(codexEventName, AgentRunEventType.ERROR, {
          code: "CODEX_TURN_FAILED",
          message: asString(error?.message) ?? "Codex turn failed.",
          error_scope: "turn",
          error_effect: "terminal",
          turn_id: turnId,
        })];
      }
      return [
        ...completionReasoningEnds,
        context.createEvent(codexEventName, status === "interrupted"
          ? AgentRunEventType.TURN_INTERRUPTED : AgentRunEventType.TURN_COMPLETED, {
=======
      const abandonedCompactions = context.closeOpenCompactionsForTurn(
        codexEventName,
        turnId,
        resolveTurnEndAbandonReason(payload),
      );
      return [
        ...completionReasoningEnds,
        ...abandonedCompactions,
        context.createEvent(codexEventName, AgentRunEventType.TURN_COMPLETED, {
>>>>>>> origin/personal
          ...(turnId ? { turnId } : {}),
        }),
      ];
    case CodexThreadEventName.TURN_DIFF_UPDATED:
      return [];
    default:
      return [];
  }
};
