/**
 * Claude Agent SDK 0.3.280 frames rebuilt from the token-meter-accuracy probes
 * (`tickets/.../token-meter-accuracy/probes/P2`, `P3`, `P4`). Each call keeps the probe's exact
 * `message_start`/`message_delta` usage and the SDK's `getContextUsage({detail:'summary'})`
 * answer after it; each turn keeps the probe's cumulative `modelUsage` for the agent's model
 * plus the auxiliary Haiku title row (DEC-002 b: excluded).
 */
import type { ClaudeSdkContextUsage } from "../../../src/runtime-management/claude/client/claude-sdk-streaming-session.js";

export type ProbeCall = Readonly<{
  id: string;
  input: number;
  cacheRead: number;
  cacheCreation: number;
  output: number;
  thinking: number;
  /** The SDK context reading taken right after this call's `message_delta`. */
  context: ClaudeSdkContextUsage;
}>;

export type ProbeTurn = Readonly<{
  resultId: string;
  calls: readonly ProbeCall[];
  /** Cumulative `modelUsage` for the agent's model after this turn. */
  selected: Readonly<{ inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number }>;
}>;

export type ProbeSession = Readonly<{ model: string; rawModelId: string; turns: readonly ProbeTurn[] }>;

const AUXILIARY_HAIKU = {
  inputTokens: 935, outputTokens: 13, cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
  canonicalModel: "claude-haiku-4-5", provider: "firstParty",
};

const haikuContext = (totalTokens: number): ClaudeSdkContextUsage =>
  ({ totalTokens, rawMaxTokens: 200_000, autoCompactThreshold: 167_000 });

/** P4: Haiku 4.5, one turn of four main-loop calls (three Bash calls), then a one-call turn. */
export const P4_HAIKU_MIDTURN: ProbeSession = {
  model: "claude-haiku-4-5",
  rawModelId: "claude-haiku-4-5",
  turns: [
    {
      resultId: "p4-result-1",
      calls: [
        { id: "msg_011CfrRC2SE2g6FRNQshRr3b", input: 10, cacheRead: 4944, cacheCreation: 1592, output: 190, thinking: 111, context: haikuContext(6546) },
        { id: "msg_011CfrRCFu74dj3URuvit4aN", input: 8, cacheRead: 6536, cacheCreation: 240, output: 104, thinking: 25, context: haikuContext(6784) },
        { id: "msg_011CfrRCM2gGxXQR8foTEVWK", input: 8, cacheRead: 6776, cacheCreation: 152, output: 104, thinking: 25, context: haikuContext(6936) },
        { id: "msg_011CfrRCRst1RMWntkwU1EYo", input: 8, cacheRead: 6928, cacheCreation: 152, output: 33, thinking: 26, context: haikuContext(7088) },
      ],
      selected: { inputTokens: 34, outputTokens: 431, cacheReadInputTokens: 25184, cacheCreationInputTokens: 2136 },
    },
    {
      resultId: "p4-result-2",
      calls: [
        { id: "msg_011CfrRCW5tYWZgVKXUR9RqA", input: 10, cacheRead: 7080, cacheCreation: 76, output: 40, thinking: 32, context: haikuContext(7166) },
      ],
      selected: { inputTokens: 44, outputTokens: 471, cacheReadInputTokens: 32264, cacheCreationInputTokens: 2212 },
    },
  ],
};

const compactContext = (totalTokens: number): ClaudeSdkContextUsage =>
  ({ totalTokens, rawMaxTokens: 100_000, autoCompactThreshold: 67_000 });

/**
 * P3: Haiku 4.5 with `CLAUDE_CODE_AUTO_COMPACT_WINDOW=100000`. Turn 2's compaction failed and
 * left the context at 94,643 (95 %, above the 67,000 threshold); turn 3 compacted, and its
 * summariser call appears only in `modelUsage` (remainder 45,481 input).
 */
export const P3_HAIKU_AUTOCOMPACT: ProbeSession = {
  model: "claude-haiku-4-5",
  rawModelId: "claude-haiku-4-5",
  turns: [
    {
      resultId: "p3-result-1",
      calls: [{ id: "msg_p3_1", input: 10, cacheRead: 4944, cacheCreation: 45565, output: 70, thinking: 62, context: compactContext(50519) }],
      selected: { inputTokens: 10, outputTokens: 70, cacheReadInputTokens: 4944, cacheCreationInputTokens: 45565 },
    },
    {
      resultId: "p3-result-2",
      calls: [{ id: "msg_p3_2", input: 10, cacheRead: 50509, cacheCreation: 44124, output: 59, thinking: 52, context: compactContext(94643) }],
      selected: { inputTokens: 20, outputTokens: 129, cacheReadInputTokens: 55453, cacheCreationInputTokens: 89689 },
    },
    {
      resultId: "p3-result-3",
      calls: [{ id: "msg_p3_3", input: 10, cacheRead: 4944, cacheCreation: 46230, output: 59, thinking: 51, context: compactContext(51184) }],
      selected: { inputTokens: 45511, outputTokens: 1536, cacheReadInputTokens: 110906, cacheCreationInputTokens: 135996 },
    },
  ],
};

/**
 * P2: Opus 5.5 (1M window, auto-compact threshold 967,000), one turn of four calls. P2 read the
 * context only after `result` (5,659 = the last call's prompt); the earlier readings follow the
 * rule P4 measured mid-turn (reading = that call's input + cache read + cache creation).
 */
export const P2_OPUS_PARTIAL: ProbeSession = {
  model: "claude-opus-5-5",
  rawModelId: "claude-opus-5-5",
  turns: [
    {
      resultId: "p2-result-1",
      calls: [
        { id: "msg_011CfrQmNifrjDMt2KJKrnwp", input: 2, cacheRead: 0, cacheCreation: 2030, output: 72, thinking: 0, context: { totalTokens: 2032, rawMaxTokens: 1_000_000, autoCompactThreshold: 967_000 } },
        { id: "msg_011CfrQma4oXDNnSRVEqJLsR", input: 2, cacheRead: 2030, cacheCreation: 3372, output: 123, thinking: 50, context: { totalTokens: 5404, rawMaxTokens: 1_000_000, autoCompactThreshold: 967_000 } },
        { id: "msg_011CfrQmhR4hUdubxCBjTJes", input: 2, cacheRead: 5402, cacheCreation: 153, output: 72, thinking: 0, context: { totalTokens: 5557, rawMaxTokens: 1_000_000, autoCompactThreshold: 967_000 } },
        { id: "msg_011CfrQmnDYV9ktBP7G9i8xo", input: 2, cacheRead: 5555, cacheCreation: 102, output: 5, thinking: 0, context: { totalTokens: 5659, rawMaxTokens: 1_000_000, autoCompactThreshold: 967_000 } },
      ],
      selected: { inputTokens: 8, outputTokens: 272, cacheReadInputTokens: 12987, cacheCreationInputTokens: 5657 },
    },
  ],
};

export const messageStartFrame = (call: ProbeCall, model: string, sessionId: string, parentToolUseId: string | null = null) => ({
  type: "stream_event",
  parent_tool_use_id: parentToolUseId,
  session_id: sessionId,
  uuid: `${call.id}-start`,
  event: {
    type: "message_start",
    message: {
      id: call.id,
      type: "message",
      role: "assistant",
      model,
      content: [],
      usage: {
        input_tokens: call.input,
        cache_read_input_tokens: call.cacheRead,
        cache_creation_input_tokens: call.cacheCreation,
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: call.cacheCreation },
        output_tokens: 1,
      },
    },
  },
});

export const contentDeltaFrame = (call: ProbeCall, sessionId: string) => ({
  type: "stream_event",
  parent_tool_use_id: null,
  session_id: sessionId,
  uuid: `${call.id}-delta-text`,
  event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "partial" } },
});

export const messageDeltaFrame = (call: ProbeCall, sessionId: string, parentToolUseId: string | null = null) => ({
  type: "stream_event",
  parent_tool_use_id: parentToolUseId,
  session_id: sessionId,
  uuid: `${call.id}-delta`,
  event: {
    type: "message_delta",
    delta: { stop_reason: "tool_use", stop_sequence: null },
    usage: {
      input_tokens: call.input,
      cache_read_input_tokens: call.cacheRead,
      cache_creation_input_tokens: call.cacheCreation,
      output_tokens: call.output,
      output_tokens_details: { thinking_tokens: call.thinking },
    },
  },
});

/** The turn's terminal `result`; `result.usage` is the multi-call sum the old meter misread. */
export const resultFrame = (session: ProbeSession, turn: ProbeTurn, sessionId: string) => {
  const sum = (pick: (call: ProbeCall) => number) => turn.calls.reduce((total, call) => total + pick(call), 0);
  return {
    type: "result",
    subtype: "success",
    session_id: sessionId,
    uuid: turn.resultId,
    num_turns: turn.calls.length,
    usage: {
      input_tokens: sum((call) => call.input),
      cache_read_input_tokens: sum((call) => call.cacheRead),
      cache_creation_input_tokens: sum((call) => call.cacheCreation),
      output_tokens: sum((call) => call.output),
    },
    modelUsage: {
      "claude-haiku-4-5-20251001": AUXILIARY_HAIKU,
      [session.rawModelId]: {
        ...turn.selected,
        canonicalModel: session.model,
        provider: "firstParty",
        contextWindow: 200_000,
        costUSD: 0.01,
      },
    },
  };
};

/** One main-loop call's stream events in SDK order. */
export const callFrames = (call: ProbeCall, model: string, sessionId: string): unknown[] => [
  messageStartFrame(call, model, sessionId),
  contentDeltaFrame(call, sessionId),
  messageDeltaFrame(call, sessionId),
];
