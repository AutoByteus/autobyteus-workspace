import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { ServerMessage } from "./models.js";

/** `RUNTIME_RAW_EVENT_DEBUG=1` logs every run event and the frame it became, numbered in its run's stream. */
const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";
const runtimeRawEventMaxChars = Number.isFinite(Number(process.env.RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

const truncateForDebug = (value: string): string =>
  value.length <= runtimeRawEventMaxChars ? value : `${value.slice(0, runtimeRawEventMaxChars)}...<truncated>`;

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-runtime-event]";
  }
};

const systemInstructionDebugDetails = (event: AgentRunEvent) => {
  const { trace_id, ts, content } = event.payload;
  return {
    eventType: event.eventType,
    trace_id: typeof trace_id === "string" ? trace_id : null,
    ts: typeof ts === "number" && Number.isFinite(ts) ? ts : null,
    contentLength: typeof content === "string" ? Array.from(content).length : null,
  };
};

export const logRuntimeEventForDebug = (runId: string, event: AgentRunEvent, message: ServerMessage): void => {
  if (!isRuntimeRawEventDebugEnabled) return;
  if (event.eventType === AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED) {
    console.log("[RuntimeEvent]", systemInstructionDebugDetails(event));
  } else {
    console.log("[RuntimeEvent]", {
      sequence: message.sequence ?? null,
      runId,
      eventType: event.eventType,
      statusHint: event.statusHint,
      payloadKeys: Object.keys(event.payload),
      rawEventJson: truncateForDebug(stringifyForDebug(event)),
    });
  }
  console.log("[RuntimeMappedMessage]", {
    sequence: message.sequence ?? null,
    runId,
    messageType: message.type,
    payloadId: typeof message.payload?.id === "string" ? message.payload.id : null,
    segmentType: typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null,
    eventType: event.eventType,
  });
};
