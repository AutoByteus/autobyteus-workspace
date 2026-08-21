import { createToolCallIdentity, toolCallIdentityKey } from "autobyteus-ts/memory/models/tool-call-identity.js";
import { ToolInteraction, ToolInteractionStatus } from "autobyteus-ts/memory/models/tool-interaction.js";
import { buildToolInteractions } from "autobyteus-ts/memory/tool-interaction-builder.js";
import type { ToolCallContext } from "autobyteus-ts/memory/tool-trace-lifecycle-index.js";
import type { MemoryTraceEvent, MemoryTurnTraceEvent } from "../../../agent-memory/domain/models.js";
import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../historical-replay-event-types.js";
import {
  buildReplayTurnGroupId,
  buildToolReplayEventId,
  createLegacyOccurrenceAllocator,
  resolveTraceReplayIdentity,
} from "../historical-replay-event-identity.js";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const asBoolean = (value: unknown): boolean | null => typeof value === "boolean" ? value : null;

const normalizeProviderStatusToPhase = (
  status: unknown,
): "requested" | "started" | "completed" | "failed" => {
  const normalized = asString(status)?.toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? null;
  if (!normalized) return "completed";
  if (["requested", "queued", "pending", "scheduled"].includes(normalized)) return "requested";
  if (["started", "starting", "running", "in_progress", "compacting"].includes(normalized)) return "started";
  if (["failed", "failure", "error", "errored"].includes(normalized)) return "failed";
  return "completed";
};

const getCompactionMessage = (phase: "requested" | "started" | "completed" | "failed"): string => {
  if (phase === "failed") return "Provider context compaction failed";
  if (phase === "started") return "Provider context compaction started";
  if (phase === "requested") return "Provider context compaction queued";
  return "Provider context compaction boundary recorded";
};

const resolveProviderSessionId = (details: Record<string, unknown> | null): string | null =>
  asString(details?.provider_session_id) ?? asString(details?.providerSessionId) ??
  asString(details?.provider_thread_id) ?? asString(details?.providerThreadId);

const resolveCompactionActivityId = (
  trace: MemoryTurnTraceEvent,
  details: Record<string, unknown> | null,
  boundaryKey: string,
): string => {
  const providerEventId = asString(details?.provider_event_id) ?? asString(details?.providerEventId);
  if (providerEventId) {
    return `compaction:provider:${asString(details?.provider) ?? "provider"}:${resolveProviderSessionId(details) ?? "session"}:${providerEventId}:${trace.turnId || "turn"}`;
  }
  return `compaction:boundary:${boundaryKey}`;
};

const inferActivityType = (
  toolName: string | null,
  toolArgs: Record<string, unknown> | null,
): HistoricalReplayToolEvent["activityType"] => {
  if (toolName === "write_file") return "write_file";
  if (toolName === "edit_file" || typeof toolArgs?.patch === "string" || typeof toolArgs?.diff === "string") {
    return "edit_file";
  }
  if (toolName === "run_bash" || typeof toolArgs?.command === "string") return "terminal_command";
  return "tool_call";
};

const resolveContextText = (toolName: string | null, toolArgs: Record<string, unknown> | null): string => {
  const path = typeof toolArgs?.path === "string" ? toolArgs.path.trim() : "";
  if (path) return path;
  const command = typeof toolArgs?.command === "string" ? toolArgs.command.trim() : "";
  return command || toolName?.trim() || "tool";
};

const createToolEvent = (
  interaction: ToolInteraction,
  anchor: MemoryTurnTraceEvent,
  terminal: MemoryTurnTraceEvent | null,
  identity: { eventId: string; turnGroupId: string },
): HistoricalReplayToolEvent => {
  const toolName = interaction.toolName?.trim() || "tool";
  const toolArgs = interaction.arguments;
  return {
    ...identity,
    kind: "tool",
    invocationId: interaction.toolCallId,
    toolName,
    toolArgs,
    toolResult: interaction.result ?? null,
    toolError: interaction.error,
    content: terminal?.content ?? anchor.content ?? null,
    media: terminal?.media ?? anchor.media ?? null,
    ts: terminal?.ts ?? anchor.ts ?? null,
    activityType: inferActivityType(toolName, toolArgs),
    status: interaction.status === ToolInteractionStatus.ERROR
      ? "error"
      : interaction.status === ToolInteractionStatus.SUCCESS ? "success" : "parsed",
    contextText: resolveContextText(toolName, toolArgs),
    logs: [],
    detailLevel: "source_limited",
  };
};

const createCompactionEvent = (
  trace: MemoryTurnTraceEvent,
  identity: { eventId: string; turnGroupId: string },
): HistoricalReplayEvent => {
  const details = asRecord(trace.toolResult);
  const boundaryKey = asString(details?.boundary_key) ?? asString(details?.boundaryKey) ??
    trace.id?.trim() ?? `${trace.turnId}:${trace.seq}`;
  const phase = normalizeProviderStatusToPhase(details?.status);
  return {
    ...identity,
    kind: "compaction",
    activityId: resolveCompactionActivityId(trace, details, boundaryKey),
    phase,
    message: getCompactionMessage(phase),
    turnId: trace.turnId || null,
    compactionOperationId: asString(details?.compaction_operation_id) ?? asString(details?.compactionOperationId),
    requestedTurnId: asString(details?.requested_turn_id) ?? asString(details?.requestedTurnId),
    executionTurnId: asString(details?.execution_turn_id) ?? asString(details?.executionTurnId),
    provider: asString(details?.provider),
    sourceSurface: asString(details?.source_surface) ?? asString(details?.sourceSurface),
    boundaryKey,
    providerEventId: asString(details?.provider_event_id) ?? asString(details?.providerEventId),
    providerSessionId: resolveProviderSessionId(details),
    trigger: asString(details?.trigger),
    preTokens: asNumber(details?.pre_tokens) ?? asNumber(details?.preTokens),
    rawTraceCount: asNumber(details?.raw_trace_count) ?? asNumber(details?.rawTraceCount),
    semanticFactCount: asNumber(details?.semantic_fact_count) ?? asNumber(details?.semanticFactCount),
    rotationEligible: asBoolean(details?.rotation_eligible) ?? asBoolean(details?.rotationEligible),
    ts: trace.ts ?? null,
    detailLevel: "source_limited",
  };
};

export type HistoricalReplayBuildOptions = {
  callContextByIdentity?: ReadonlyMap<string, ToolCallContext>;
  interactionByIdentity?: ReadonlyMap<string, ToolInteraction>;
  traceById?: ReadonlyMap<string, MemoryTurnTraceEvent>;
  includedToolIdentityKeys?: ReadonlySet<string>;
};

export const buildHistoricalReplayEvents = (
  rawTraces: MemoryTraceEvent[],
  options: HistoricalReplayBuildOptions = {},
): HistoricalReplayEvent[] => {
  const turnTraces = rawTraces.filter(
    (trace): trace is MemoryTurnTraceEvent => trace.scope !== "run",
  );
  const interactionByIdentity = options.interactionByIdentity ?? new Map(
    buildToolInteractions(turnTraces, options).map((interaction) => [
      toolCallIdentityKey({ turnId: interaction.turnId!, toolCallId: interaction.toolCallId }),
      interaction,
    ]),
  );
  const traceById = options.traceById ?? new Map(
    turnTraces.flatMap((trace) => trace.id ? [[trace.id, trace] as const] : []),
  );
  const emittedToolIdentities = new Set<string>();
  const events: HistoricalReplayEvent[] = [];
  const nextLegacyOccurrence = createLegacyOccurrenceAllocator();

  for (const trace of rawTraces) {
    if (trace.scope === "run") {
      events.push({
        eventId: trace.id,
        kind: "system_instruction",
        activityId: trace.id,
        content: trace.content,
        ts: trace.ts,
      });
      continue;
    }
    if (trace.traceType === "user" || trace.traceType === "assistant") {
      events.push({
        ...resolveTraceReplayIdentity(trace, nextLegacyOccurrence),
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
        ...resolveTraceReplayIdentity(trace, nextLegacyOccurrence),
        kind: "reasoning",
        content: trace.content ?? null,
        media: trace.media ?? null,
        ts: trace.ts ?? null,
      });
      continue;
    }
    if (trace.traceType === "provider_compaction_boundary") {
      events.push(createCompactionEvent(trace, resolveTraceReplayIdentity(trace, nextLegacyOccurrence)));
      continue;
    }
    if (trace.traceType !== "tool_call" && trace.traceType !== "tool_result") continue;
    const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
    if (!identity) {
      if (trace.traceType === "tool_result") {
        events.push(createToolEvent(new ToolInteraction({
          toolCallId: `${trace.turnId}:${trace.seq}`,
          turnId: trace.turnId,
          toolName: trace.toolName?.trim() || "tool",
          arguments: trace.toolArgs ?? null,
          result: trace.toolResult ?? null,
          error: trace.toolError ?? null,
          status: trace.toolError !== null && trace.toolError !== undefined
            ? ToolInteractionStatus.ERROR
            : ToolInteractionStatus.SUCCESS,
          anchorRawTraceId: trace.id ?? null,
          terminalRawTraceId: trace.id ?? null,
          anchorTs: trace.ts ?? null,
          terminalTs: trace.ts ?? null,
        }), trace, trace, resolveTraceReplayIdentity(trace, nextLegacyOccurrence)));
      }
      continue;
    }
    const key = toolCallIdentityKey(identity);
    if (options.includedToolIdentityKeys && !options.includedToolIdentityKeys.has(key)) continue;
    if (emittedToolIdentities.has(key)) continue;
    const interaction = interactionByIdentity.get(key);
    if (!interaction) continue;
    const anchor = interaction.anchorRawTraceId ? traceById.get(interaction.anchorRawTraceId) : trace;
    if (!anchor || (anchor.id && trace.id ? anchor.id !== trace.id : anchor !== trace)) continue;
    emittedToolIdentities.add(key);
    const terminal = interaction.terminalRawTraceId
      ? traceById.get(interaction.terminalRawTraceId) ?? null
      : null;
    const eventId = buildToolReplayEventId(identity.turnId, identity.toolCallId);
    events.push(createToolEvent(interaction, anchor, terminal, {
      eventId,
      turnGroupId: buildReplayTurnGroupId(identity.turnId, eventId),
    }));
  }
  return events;
};
