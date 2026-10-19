import type { CodexThreadEventMessage } from "../thread/codex-thread.js";
import type { CodexSegmentTurnRejectionReason } from "../thread/codex-segment-turn-admission.js";
import type { CodexSegmentTurnRejectionSummary } from "../thread/codex-segment-turn-rejection-accounts.js";
import type { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { appendRuntimeRawEventLog } from "../../shared/runtime-raw-event-file-debug.js";

const isCodexThreadEventDebugEnabled = (): boolean => process.env.CODEX_THREAD_EVENT_DEBUG === "1";
const isCodexThreadRawEventDebugEnabled = (): boolean =>
  process.env.CODEX_THREAD_RAW_EVENT_DEBUG === "1";
const resolveCodexThreadRawEventMaxChars = (): number =>
  Number.isFinite(Number(process.env.CODEX_THREAD_RAW_EVENT_MAX_CHARS))
    ? Math.max(512, Number(process.env.CODEX_THREAD_RAW_EVENT_MAX_CHARS))
    : 20_000;

export const debugCodexThreadEvent = (
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (!isCodexThreadEventDebugEnabled()) {
    return;
  }
  if (details) {
    console.log(`[CodexThreadEvent] ${message}`, details);
    return;
  }
  console.log(`[CodexThreadEvent] ${message}`);
};

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
    return "[unserializable-codex-event]";
  }
};

const truncateForDebug = (value: string): string => {
  const codexThreadRawEventMaxChars = resolveCodexThreadRawEventMaxChars();
  if (value.length <= codexThreadRawEventMaxChars) {
    return value;
  }
  return `${value.slice(0, codexThreadRawEventMaxChars)}...<truncated>`;
};

const formatRawCodexThreadEventForDebug = (value: unknown): string =>
  truncateForDebug(stringifyForDebug(value));

export const logRawCodexThreadEventDetails = (
  runId: string,
  sequence: number,
  event: CodexThreadEventMessage,
): void => {
  const rawMethod = event.method;
  const eventName = rawMethod.trim();
  const payload = event.params;
  const item = asObject(payload.item);
  const turn = asObject(payload.turn);
  const summaryPart = asString(payload.summary_part) ?? asString(payload.summaryPart) ?? "";
  const itemId = asString(payload.item_id) ?? asString(payload.itemId) ?? asString(item.id);
  const itemType =
    asString(item.type) ?? asString(payload.item_type) ?? asString(payload.itemType);
  const itemName = asString(item.name);
  const itemStatus = asString(item.status);
  const callId = asString(item.call_id) ?? asString(payload.call_id);
  const turnId = asString(payload.turnId) ?? asString(payload.turn_id) ?? asString(turn.id);

  appendRuntimeRawEventLog({
    envVarName: "CODEX_THREAD_RAW_EVENT_LOG_DIR",
    backend: "codex",
    scope: "run",
    scopeId: runId,
    sequence,
    eventName: eventName || null,
    metadata: {
      runId,
      rawMethod,
      eventId: asString(payload.id),
      itemId,
      itemType,
      itemName,
      itemStatus,
      callId,
      turnId,
      payloadKeys: Object.keys(payload),
      summaryPartLength: summaryPart.length,
    },
    payload: event,
  });

  if (!isCodexThreadRawEventDebugEnabled()) {
    return;
  }

  debugCodexThreadEvent("Raw Codex event", {
    sequence,
    runId,
    rawMethod,
    eventName: eventName || null,
    eventId: asString(payload.id),
    itemId,
    itemType,
    itemName,
    itemStatus,
    callId,
    turnId,
    payloadKeys: Object.keys(payload),
    summaryPartLength: summaryPart.length,
    rawEventJson: formatRawCodexThreadEventForDebug(event),
  });
};

type CodexSegmentTurnRejectionLogContext = Readonly<{ runtimeKind: RuntimeKind; runId: string }>;

/**
 * Detailed line for a rejection account's first rejected event. Logs ids and the item type only,
 * never item content. Later rejections of the same account are counted by the thread and written
 * by `logCodexSegmentTurnAdmissionRejectionSummaries` at its boundaries.
 */
export const logCodexSegmentTurnAdmissionRejection = (
  input: CodexSegmentTurnRejectionLogContext & Readonly<{
    nativeEventName: string;
    reasonCode: CodexSegmentTurnRejectionReason;
    itemType: string | null;
    turnId: string | null;
    activeTurnId: string | null;
  }>,
): void => {
  console.warn("[CodexSegmentTurnAdmissionRejected]", {
    runtimeKind: input.runtimeKind,
    runId: input.runId,
    nativeEventName: input.nativeEventName,
    reasonCode: input.reasonCode,
    itemType: input.itemType,
    turnId: input.turnId,
    activeTurnId: input.activeTurnId,
  });
};

export const logCodexSegmentTurnAdmissionRejectionSummaries = (
  context: CodexSegmentTurnRejectionLogContext,
  summaries: readonly CodexSegmentTurnRejectionSummary[],
): void => {
  for (const summary of summaries) {
    console.warn("[CodexSegmentTurnAdmissionRejectedSummary]", {
      runtimeKind: context.runtimeKind,
      runId: context.runId,
      turnId: summary.turnId,
      count: summary.count,
    });
  }
};
