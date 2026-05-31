import type { MemoryTraceEvent } from "../../../agent-memory/domain/models.js";
import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../historical-replay-event-types.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const normalizeProviderStatusToPhase = (
  status: unknown,
): "requested" | "started" | "completed" | "failed" => {
  const normalized = asString(status)?.toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? null;
  if (!normalized) {
    return "completed";
  }
  if (["requested", "queued", "pending", "scheduled"].includes(normalized)) {
    return "requested";
  }
  if (["started", "starting", "running", "in_progress", "compacting"].includes(normalized)) {
    return "started";
  }
  if (["failed", "failure", "error", "errored"].includes(normalized)) {
    return "failed";
  }
  return "completed";
};

const getCompactionMessage = (phase: "requested" | "started" | "completed" | "failed"): string => {
  switch (phase) {
    case "failed":
      return "Provider context compaction failed";
    case "started":
      return "Provider context compaction started";
    case "requested":
      return "Provider context compaction queued";
    case "completed":
    default:
      return "Provider context compaction boundary recorded";
  }
};

const resolveProviderSessionId = (details: Record<string, unknown> | null): string | null =>
  asString(details?.provider_session_id) ??
  asString(details?.providerSessionId) ??
  asString(details?.provider_thread_id) ??
  asString(details?.providerThreadId);

const resolveCompactionActivityId = (
  trace: MemoryTraceEvent,
  details: Record<string, unknown> | null,
  boundaryKey: string,
): string => {
  const providerEventId = asString(details?.provider_event_id) ?? asString(details?.providerEventId);
  if (providerEventId) {
    const provider = asString(details?.provider) ?? "provider";
    const providerSessionId = resolveProviderSessionId(details) ?? "session";
    const turnId = trace.turnId || "turn";
    return `compaction:provider:${provider}:${providerSessionId}:${providerEventId}:${turnId}`;
  }
  return `compaction:boundary:${boundaryKey}`;
};

const inferActivityType = (
  toolName: string | null,
  toolArgs: Record<string, unknown> | null,
): HistoricalReplayToolEvent["activityType"] => {
  if (toolName === "write_file") {
    return "write_file";
  }
  if (
    toolName === "edit_file" ||
    typeof toolArgs?.patch === "string" ||
    typeof toolArgs?.diff === "string"
  ) {
    return "edit_file";
  }
  if (toolName === "run_bash" || typeof toolArgs?.command === "string") {
    return "terminal_command";
  }
  return "tool_call";
};

const resolveContextText = (
  toolName: string | null,
  toolArgs: Record<string, unknown> | null,
): string => {
  const pathCandidate = typeof toolArgs?.path === "string" ? toolArgs.path.trim() : "";
  if (pathCandidate) {
    return pathCandidate;
  }
  const commandCandidate = typeof toolArgs?.command === "string" ? toolArgs.command.trim() : "";
  if (commandCandidate) {
    return commandCandidate;
  }
  return toolName?.trim() || "tool";
};

const resolveInvocationId = (trace: MemoryTraceEvent): string =>
  trace.toolCallId?.trim() || `${trace.turnId}:${trace.seq}`;

const createToolEvent = (trace: MemoryTraceEvent): HistoricalReplayToolEvent => {
  const toolArgs = asRecord(trace.toolArgs);
  const toolName = trace.toolName?.trim() || "tool";
  return {
    kind: "tool",
    invocationId: resolveInvocationId(trace),
    toolName,
    toolArgs,
    toolResult: trace.toolResult ?? null,
    toolError: trace.toolError ?? null,
    content: trace.content ?? null,
    media: trace.media ?? null,
    ts: trace.ts ?? null,
    activityType: inferActivityType(toolName, toolArgs),
    status: trace.toolError ? "error" : trace.toolResult != null ? "success" : "parsed",
    contextText: resolveContextText(toolName, toolArgs),
    logs: [],
    detailLevel: "source_limited",
  };
};

const createCompactionEvent = (trace: MemoryTraceEvent): HistoricalReplayEvent => {
  const details = asRecord(trace.toolResult);
  const boundaryKey =
    asString(details?.boundary_key) ??
    asString(details?.boundaryKey) ??
    trace.id?.trim() ??
    `${trace.turnId}:${trace.seq}`;
  const phase = normalizeProviderStatusToPhase(details?.status);
  const providerEventId = asString(details?.provider_event_id) ?? asString(details?.providerEventId);
  const providerSessionId = resolveProviderSessionId(details);

  return {
    kind: "compaction",
    activityId: resolveCompactionActivityId(trace, details, boundaryKey),
    phase,
    message: getCompactionMessage(phase),
    turnId: trace.turnId || null,
    provider: asString(details?.provider),
    sourceSurface: asString(details?.source_surface) ?? asString(details?.sourceSurface),
    boundaryKey,
    providerEventId,
    providerSessionId,
    trigger: asString(details?.trigger),
    preTokens: asNumber(details?.pre_tokens) ?? asNumber(details?.preTokens),
    rotationEligible: asBoolean(details?.rotation_eligible) ?? asBoolean(details?.rotationEligible),
    ts: trace.ts ?? null,
    detailLevel: "source_limited",
  };
};

const mergeToolResult = (
  pending: HistoricalReplayToolEvent,
  trace: MemoryTraceEvent,
): HistoricalReplayToolEvent => {
  const toolArgs = asRecord(trace.toolArgs) ?? pending.toolArgs;
  const toolName = trace.toolName?.trim() || pending.toolName;
  const nextTimestamp =
    typeof trace.ts === "number" && Number.isFinite(trace.ts) && trace.ts > 0
      ? trace.ts
      : pending.ts;
  return {
    ...pending,
    toolName,
    toolArgs,
    toolResult: trace.toolResult ?? pending.toolResult ?? null,
    toolError: trace.toolError ?? pending.toolError ?? null,
    content: trace.content ?? pending.content ?? null,
    media: trace.media ?? pending.media ?? null,
    ts: nextTimestamp ?? null,
    status: trace.toolError ? "error" : trace.toolResult != null ? "success" : pending.status,
    contextText: resolveContextText(toolName, toolArgs),
  };
};

export const buildHistoricalReplayEvents = (
  rawTraces: MemoryTraceEvent[],
): HistoricalReplayEvent[] => {
  const events: HistoricalReplayEvent[] = [];
  const pendingToolCalls = new Map<string, HistoricalReplayToolEvent>();
  const pendingAnonymousToolCalls: HistoricalReplayToolEvent[] = [];

  for (const trace of rawTraces) {
    if (trace.traceType === "user" || trace.traceType === "assistant") {
      events.push({
        kind: "message",
        role: trace.traceType,
        content: trace.content ?? null,
        media: trace.media ?? null,
        ts: trace.ts ?? null,
      });
      continue;
    }

    if (trace.traceType === "reasoning") {
      events.push({
        kind: "reasoning",
        content: trace.content ?? null,
        media: trace.media ?? null,
        ts: trace.ts ?? null,
      });
      continue;
    }

    if (trace.traceType === "provider_compaction_boundary") {
      events.push(createCompactionEvent(trace));
      continue;
    }

    if (trace.traceType === "tool_call") {
      const toolEvent = createToolEvent(trace);
      events.push(toolEvent);
      if (trace.toolCallId?.trim()) {
        pendingToolCalls.set(trace.toolCallId.trim(), toolEvent);
      } else {
        pendingAnonymousToolCalls.push(toolEvent);
      }
      continue;
    }

    if (trace.traceType === "tool_result") {
      const toolCallId = trace.toolCallId?.trim() || null;
      const pending = toolCallId
        ? pendingToolCalls.get(toolCallId) ?? null
        : pendingAnonymousToolCalls.pop() ?? null;
      if (pending) {
        const merged = mergeToolResult(pending, trace);
        Object.assign(pending, merged);
        if (toolCallId) {
          pendingToolCalls.delete(toolCallId);
        }
        continue;
      }

      events.push(createToolEvent(trace));
    }
  }

  return events;
};
