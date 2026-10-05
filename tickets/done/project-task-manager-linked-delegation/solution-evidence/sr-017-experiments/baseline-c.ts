import type { AgentRunEvent } from "/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventType } from "/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js";
import type { JsonObject } from "/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-json.js";
import { resolveTurnIdFromAppServerMessage } from "/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-id-resolver.js";
import { CodexThreadEventName } from "/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.js";

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
      return [
        ...completionReasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.TURN_COMPLETED, {
          ...(turnId ? { turnId } : {}),
        }),
      ];
    case CodexThreadEventName.TURN_DIFF_UPDATED:
      return [];
    default:
      return [];
  }
};
