import { appendRuntimeRawEventLog } from "../../shared/runtime-raw-event-file-debug.js";

const isClaudeSessionEventDebugEnabled = (): boolean =>
  process.env.CLAUDE_SESSION_EVENT_DEBUG === "1";
const isClaudeSessionRawEventDebugEnabled = (): boolean =>
  process.env.CLAUDE_SESSION_RAW_EVENT_DEBUG === "1";
const resolveClaudeSessionRawEventMaxChars = (): number =>
  Number.isFinite(Number(process.env.CLAUDE_SESSION_RAW_EVENT_MAX_CHARS))
    ? Math.max(512, Number(process.env.CLAUDE_SESSION_RAW_EVENT_MAX_CHARS))
    : 20_000;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-claude-event]";
  }
};

const truncateForDebug = (value: string): string => {
  const maxChars = resolveClaudeSessionRawEventMaxChars();
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}...<truncated>`;
};

export const debugClaudeSessionEvent = (
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (!isClaudeSessionEventDebugEnabled()) {
    return;
  }
  if (details) {
    console.log(`[ClaudeSessionEvent] ${message}`, details);
    return;
  }
  console.log(`[ClaudeSessionEvent] ${message}`);
};

export const logRawClaudeSessionChunkDetails = (input: {
  runId: string;
  sessionId: string;
  sequence: number;
  chunk: unknown;
}): void => {
  const payload = asObject(input.chunk);
  const eventName = asString(payload.type);
  const message = asObject(payload.message);
  const contentBlock = asObject(payload.content_block);
  const delta = asObject(payload.delta);

  appendRuntimeRawEventLog({
    envVarName: "CLAUDE_SESSION_RAW_EVENT_LOG_DIR",
    backend: "claude",
    scope: "run",
    scopeId: input.runId,
    sequence: input.sequence,
    eventName,
    metadata: {
      runId: input.runId,
      sessionId: input.sessionId,
      messageId: asString(message.id),
      messageRole: asString(message.role),
      stopReason: asString(message.stop_reason) ?? asString(payload.stop_reason),
      contentBlockType:
        asString(contentBlock.type) ?? asString(payload.content_block_type),
      deltaType: asString(delta.type),
      payloadKeys: Object.keys(payload),
    },
    payload: input.chunk,
  });

  if (!isClaudeSessionRawEventDebugEnabled()) {
    return;
  }

  debugClaudeSessionEvent("Raw Claude chunk", {
    sequence: input.sequence,
    runId: input.runId,
    sessionId: input.sessionId,
    eventName,
    payloadKeys: Object.keys(payload),
    rawChunkJson: truncateForDebug(stringifyForDebug(input.chunk)),
  });
};
