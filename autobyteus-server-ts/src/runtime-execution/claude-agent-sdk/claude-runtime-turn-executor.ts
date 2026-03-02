import { normalizeClaudeStreamChunk } from "./claude-runtime-message-normalizers.js";
import {
  nowTimestampSeconds,
  type ClaudeRunSessionState,
  type ClaudeRuntimeEvent,
} from "./claude-runtime-shared.js";

export const executeClaudeTurnStream = async (options: {
  state: ClaudeRunSessionState;
  turnId: string;
  content: string;
  invokeQueryStream: (state: ClaudeRunSessionState, prompt: string, signal: AbortSignal) => Promise<AsyncIterable<unknown>>;
  signal: AbortSignal;
  ensureSessionTranscript: (sessionId: string) => void;
  recordSessionMessage: (sessionId: string, message: Record<string, unknown>) => void;
  emitEvent: (event: ClaudeRuntimeEvent) => void;
}): Promise<void> => {
  let userMessageBoundToResolvedSession = false;
  let assistantOutput = "";

  const stream = await options.invokeQueryStream(options.state, options.content, options.signal);
  for await (const chunk of stream) {
    const normalized = normalizeClaudeStreamChunk(chunk);
    if (normalized.sessionId && normalized.sessionId !== options.state.sessionId) {
      const previousSessionId = options.state.sessionId;
      options.state.sessionId = normalized.sessionId;
      options.ensureSessionTranscript(options.state.sessionId);
      // Claude may return a canonical session id after the first stream chunk.
      // Mirror the triggering user turn into the resolved session transcript.
      if (!userMessageBoundToResolvedSession && previousSessionId !== options.state.sessionId) {
        options.recordSessionMessage(options.state.sessionId, {
          role: "user",
          content: options.content,
          createdAt: nowTimestampSeconds(),
        });
        userMessageBoundToResolvedSession = true;
      }
    }

    if (normalized.delta) {
      if (normalized.source === "result" && assistantOutput.length > 0) {
        continue;
      }
      assistantOutput += normalized.delta;
      options.emitEvent({
        method: "item/outputText/delta",
        params: {
          id: options.turnId,
          turnId: options.turnId,
          delta: normalized.delta,
        },
      });
    }
  }

  if (assistantOutput.length > 0) {
    options.recordSessionMessage(options.state.sessionId, {
      role: "assistant",
      content: assistantOutput,
      createdAt: nowTimestampSeconds(),
    });
  }

  options.emitEvent({
    method: "item/outputText/completed",
    params: {
      id: options.turnId,
      turnId: options.turnId,
      text: assistantOutput,
    },
  });
  options.emitEvent({
    method: "turn/completed",
    params: {
      turnId: options.turnId,
    },
  });
};
