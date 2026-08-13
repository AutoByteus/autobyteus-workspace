import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import type { JsonObject } from "../codex-app-server-json.js";

export type CodexWebSearchItemEventProjectorContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  serializeItemPayload: (payload: JsonObject) => Record<string, unknown>;
  resolveSegmentStartId: (payload: JsonObject) => string | null;
  resolveSegmentId: (payload: JsonObject) => string | null;
  resolveSegmentMetadata: (payload: JsonObject) => Record<string, unknown>;
  resolveInvocationId: (payload: JsonObject) => string | null;
  resolveTurnId: (payload: JsonObject) => string | null;
  resolveArguments: (payload: JsonObject) => Record<string, unknown>;
  resolveResult: (payload: JsonObject) => unknown;
  resolveError: (payload: JsonObject) => string;
  isExecutionFailure: (payload: JsonObject) => boolean;
};

export const projectCodexWebSearchStartedEvents = (
  context: CodexWebSearchItemEventProjectorContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const toolArguments = context.resolveArguments(payload);
  const hasToolArguments = Object.keys(toolArguments).length > 0;
  return [
    context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
      ...context.serializeItemPayload(payload),
      id: context.resolveSegmentStartId(payload),
      segment_type: "tool_call",
      metadata: context.resolveSegmentMetadata(payload),
    }),
    context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
      ...context.serializeItemPayload(payload),
      ...(invocationId ? { invocation_id: invocationId } : {}),
      ...(turnId ? { turn_id: turnId } : {}),
      tool_name: "search_web",
      ...(hasToolArguments ? { arguments: toolArguments } : {}),
    }),
  ];
};

export const projectCodexWebSearchCompletedEvents = (
  context: CodexWebSearchItemEventProjectorContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const toolArguments = context.resolveArguments(payload);
  const hasToolArguments = Object.keys(toolArguments).length > 0;
  const basePayload = {
    ...context.serializeItemPayload(payload),
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(turnId ? { turn_id: turnId } : {}),
    tool_name: "search_web",
    ...(hasToolArguments ? { arguments: toolArguments } : {}),
  };
  const lifecycleEvent = context.isExecutionFailure(payload)
    ? context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_FAILED, {
        ...basePayload,
        error: context.resolveError(payload),
      })
    : context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        ...basePayload,
        result: context.resolveResult(payload),
      });
  return [
    lifecycleEvent,
    context.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
      ...context.serializeItemPayload(payload),
      id: context.resolveSegmentId(payload),
      metadata: context.resolveSegmentMetadata(payload),
    }),
  ];
};
