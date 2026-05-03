import type { ClaudeSdkQueryLike } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

export type ClaudeActiveTurnExecution = {
  turnId: string;
  abortController: AbortController;
  interrupted: boolean;
  query: ClaudeSdkQueryLike | null;
  queryClosed: boolean;
  settledTask: Promise<void>;
  interruptSettlementTask: Promise<void> | null;
};

export const createClaudeActiveTurnExecution = (
  turnId: string,
  abortController: AbortController,
): ClaudeActiveTurnExecution => ({
  turnId,
  abortController,
  interrupted: false,
  query: null,
  queryClosed: false,
  settledTask: Promise.resolve(),
  interruptSettlementTask: null,
});

export const isClaudeActiveTurnInterrupted = (
  activeTurn: ClaudeActiveTurnExecution | null,
  abortController: AbortController | null = activeTurn?.abortController ?? null,
): boolean => Boolean(activeTurn?.interrupted || abortController?.signal.aborted);
