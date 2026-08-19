import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { resolveCodexToolItemFamily } from "../items/codex-tool-item-family.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";
import {
  convertCodexItemCompactionEvent,
  type CodexItemCompactionEventConverterContext,
} from "./codex-item-compaction-event-converter.js";
import { isCodexAgentToolsSendMessageToolName, normalizeCodexAgentToolsToolNameForEvent } from "../agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import { serializeCodexItemEventPayload } from "../agent-tools-mcp/codex-agent-tools-mcp-event-payload.js";
import { createTerminalToolExecutionEvent } from "./codex-terminal-tool-execution-event.js";
import type { CodexToolLifecyclePlacement } from "./codex-ordered-tool-boundary-tracker.js";
import type { AgentSegmentType } from "../../../domain/agent-segment.js";
import {
  projectCodexWebSearchCompletedEvents,
  projectCodexWebSearchStartedEvents,
  type CodexWebSearchItemEventProjectorContext,
} from "./codex-web-search-item-event-projector.js";

export type CodexItemEventConverterContext = CodexItemCompactionEventConverterContext & {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  createTextSegmentContentEvent: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent | null;
  resolveCompletedReasoningEvents: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent[];
  closeReasoningBlocksForBoundary: (
    codexEventName: string,
    payload: JsonObject,
  ) => AgentRunEvent[];
  classifyToolLifecycleUpdate: (payload: JsonObject) => CodexToolLifecyclePlacement;
  isUserMessageItem: (itemType: string | null) => boolean;
  isReasoningItem: (itemType: string | null) => boolean;
  resolveWebSearchMetadata: (payload: JsonObject) => Record<string, unknown>;
  resolveWebSearchArguments: (payload: JsonObject) => Record<string, unknown>;
  resolveWebSearchResult: (payload: JsonObject) => unknown;
  resolveWebSearchError: (payload: JsonObject) => string;
  resolveTurnId: (payload: JsonObject) => string | null;
  resolveSegmentStartId: (payload: JsonObject, segmentType: AgentSegmentType | null) => string | null;
  resolveSegmentType: (payload: JsonObject) => AgentSegmentType | null;
  resolveSegmentMetadata: (payload: JsonObject) => Record<string, unknown> | undefined;
  resolveSegmentId: (payload: JsonObject) => string | null;
  resolveInvocationId: (payload: JsonObject) => string | null;
  resolveToolName: (
    payload: JsonObject,
    fallback?: "run_bash" | "edit_file",
  ) => string | null;
  resolveCommandValue: (payload: JsonObject) => string | null;
  resolveToolArguments: (
    payload: JsonObject,
    fallbackToolName: "run_bash" | "edit_file",
  ) => Record<string, unknown>;
  resolveDynamicToolArguments: (payload: JsonObject) => Record<string, unknown>;
  hasExplicitToolArguments: (payload: JsonObject) => boolean;
  resolveLogEntry: (payload: JsonObject) => string;
  isExecutionFailure: (payload: JsonObject) => boolean;
  resolveToolError: (payload: JsonObject) => string;
  resolveToolResult: (payload: JsonObject) => unknown;
  resolveToolDecisionReason: (payload: JsonObject) => string | null;
  resolveExecutionStatus: (payload: JsonObject) => string | null;
};

const webSearchProjectorContext = (
  context: CodexItemEventConverterContext,
): CodexWebSearchItemEventProjectorContext => ({
  createEvent: context.createEvent,
  serializeItemPayload: serializeCodexItemEventPayload,
  resolveSegmentStartId: (payload) => context.resolveSegmentStartId(payload, "tool_call"),
  resolveSegmentId: context.resolveSegmentId,
  resolveSegmentMetadata: context.resolveWebSearchMetadata,
  resolveInvocationId: context.resolveInvocationId,
  resolveTurnId: context.resolveTurnId,
  resolveArguments: context.resolveWebSearchArguments,
  resolveResult: context.resolveWebSearchResult,
  resolveError: context.resolveWebSearchError,
  isExecutionFailure: context.isExecutionFailure,
});

const codexItemEventNames = new Set<string>([
  CodexThreadEventName.ITEM_STARTED,
  CodexThreadEventName.ITEM_COMPLETED,
  CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
  CodexThreadEventName.ITEM_REASONING_DELTA,
  CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
  CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA,
  CodexThreadEventName.ITEM_REASONING_COMPLETED,
  CodexThreadEventName.ITEM_PLAN_DELTA,
  CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
  CodexThreadEventName.ITEM_TOOL_CALL,
  CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL,
  CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA,
  CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL,
]);

export const isCodexItemEventName = (codexEventName: string): boolean =>
  codexItemEventNames.has(codexEventName);

const createDynamicToolSegmentStartEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const serializedPayload = serializeCodexItemEventPayload(payload);
  const metadata = context.resolveSegmentMetadata(serializedPayload as JsonObject);
  return context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
    ...serializedPayload,
    id: context.resolveSegmentStartId(payload, "tool_call"),
    segment_type: "tool_call",
    ...(metadata ? { metadata } : {}),
  });
};

const createDynamicToolLifecycleStartedEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const toolName = normalizeCodexAgentToolsToolNameForEvent(context.resolveToolName(payload));
  const serializedPayload = serializeCodexItemEventPayload(payload);
  return context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
    ...serializedPayload,
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(turnId ? { turn_id: turnId } : {}),
    ...(toolName ? { tool_name: toolName } : {}),
    arguments: context.resolveDynamicToolArguments(serializedPayload as JsonObject),
  });
};

const createSegmentEndEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const serializedPayload = serializeCodexItemEventPayload(payload);
  const metadata = context.resolveSegmentMetadata(serializedPayload as JsonObject);
  return context.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
    ...serializedPayload,
    id: context.resolveSegmentId(payload),
    ...(metadata ? { metadata } : {}),
  });
};

const createFileChangeSegmentStartEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const segmentMetadata = context.resolveSegmentMetadata(payload) ?? {};
  return context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
    ...serializeCodexItemEventPayload(payload),
    id: context.resolveSegmentStartId(payload, "edit_file"),
    segment_type: "edit_file",
    metadata: {
      tool_name: "edit_file",
      ...segmentMetadata,
    },
  });
};

const createFileChangeLifecycleStartedEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  return context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
    ...serializeCodexItemEventPayload(payload),
    ...(invocationId ? { invocation_id: invocationId } : {}),
    tool_name: "edit_file",
    arguments: context.resolveToolArguments(payload, "edit_file"),
  });
};

const createFileChangeSegmentEndEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const metadata = context.resolveSegmentMetadata(payload);
  return context.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
    ...serializeCodexItemEventPayload(payload),
    id: context.resolveSegmentId(payload),
    ...(metadata ? { metadata } : {}),
  });
};

const applyToolLifecyclePlacement = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] =>
  context.classifyToolLifecycleUpdate(payload) === "result_first_creation"
    ? context.closeReasoningBlocksForBoundary(codexEventName, payload)
    : [];

export const convertCodexItemEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  switch (codexEventName) {
    case CodexThreadEventName.ITEM_STARTED: {
      const compactionEvents = convertCodexItemCompactionEvent(context, codexEventName, payload);
      if (compactionEvents) return compactionEvents;
      const itemType = context.resolveItemType(payload);
      const itemFamily = resolveCodexToolItemFamily(itemType);
      if (context.isReasoningItem(itemType)) return [];
      if (context.isUserMessageItem(itemType)) {
        return context.closeReasoningBlocksForBoundary(codexEventName, payload);
      }
      if (itemFamily === "command_execution") {
        const invocationId = context.resolveInvocationId(payload);
        const toolName = normalizeCodexAgentToolsToolNameForEvent(context.resolveToolName(payload, "run_bash"));
        const commandValue = context.resolveCommandValue(payload);
        if (
          isCodexAgentToolsSendMessageToolName(toolName) ||
          isCodexAgentToolsSendMessageToolName(commandValue)
        ) {
          return [];
        }
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        const metadata = context.resolveSegmentMetadata(payload) ?? {};
        return [
          ...reasoningEnds,
          context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
            id: context.resolveSegmentStartId(payload, "run_bash"),
            turn_id: context.resolveTurnId(payload),
            segment_type: "run_bash",
            metadata: {
              ...(toolName ? { tool_name: toolName } : {}),
              ...(commandValue ? { command: commandValue } : {}),
              ...metadata,
            },
          }),
          context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
            ...serializeCodexItemEventPayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: context.resolveToolArguments(payload, "run_bash"),
          }),
        ];
      }
      if (itemFamily === "web_search") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          ...projectCodexWebSearchStartedEvents(
            webSearchProjectorContext(context),
            codexEventName,
            payload,
          ),
        ];
      }
      if (itemFamily === "file_change") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          createFileChangeSegmentStartEvent(context, codexEventName, payload),
          createFileChangeLifecycleStartedEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "mcp_tool_call" || itemFamily === "dynamic_tool_call") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          createDynamicToolSegmentStartEvent(context, codexEventName, payload),
          createDynamicToolLifecycleStartedEvent(context, codexEventName, payload),
        ];
      }
      const segmentType = context.resolveSegmentType(payload);
      if (!segmentType) return [];
      const reasoningEnds = (
        segmentType === "tool_call" ||
        segmentType === "run_bash" ||
        segmentType === "edit_file"
      )
        ? applyToolLifecyclePlacement(context, codexEventName, payload)
        : context.closeReasoningBlocksForBoundary(codexEventName, payload);
      const segmentMetadata = context.resolveSegmentMetadata(payload);
      return [
        ...reasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
          ...serializeCodexItemEventPayload(payload),
          id: context.resolveSegmentStartId(payload, segmentType),
          segment_type: segmentType,
          ...(segmentMetadata
            ? {
                metadata:
                  segmentType === "edit_file"
                    ? { tool_name: "edit_file", ...segmentMetadata }
                    : segmentMetadata,
              }
            : {}),
        }),
      ];
    }
    case CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA: {
      const reasoningEnds = context.closeReasoningBlocksForBoundary(codexEventName, payload);
      const textEvent = context.createTextSegmentContentEvent(codexEventName, payload);
      return textEvent ? [...reasoningEnds, textEvent] : reasoningEnds;
    }
    case CodexThreadEventName.ITEM_COMPLETED: {
      const compactionEvents = convertCodexItemCompactionEvent(context, codexEventName, payload);
      if (compactionEvents) return compactionEvents;
      const itemType = context.resolveItemType(payload);
      const itemFamily = resolveCodexToolItemFamily(itemType);
      if (context.isUserMessageItem(itemType)) {
        return [];
      }
      if (context.isReasoningItem(itemType)) {
        return context.resolveCompletedReasoningEvents(codexEventName, payload);
      }
      if (itemFamily === "command_execution") {
        const toolName = normalizeCodexAgentToolsToolNameForEvent(context.resolveToolName(payload, "run_bash"));
        const commandValue = context.resolveCommandValue(payload);
        if (
          isCodexAgentToolsSendMessageToolName(toolName) ||
          isCodexAgentToolsSendMessageToolName(commandValue)
        ) {
          return [];
        }
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          createTerminalToolExecutionEvent(context, codexEventName, payload, "run_bash"),
          createSegmentEndEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "file_change") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        const invocationId = context.resolveInvocationId(payload);
        const serializedPayload = serializeCodexItemEventPayload(payload);
        const events: AgentRunEvent[] = [...reasoningEnds];
        const failed = context.isExecutionFailure(payload);
        const declined = context.resolveExecutionStatus(payload)?.toLowerCase() === "declined";

        if (declined) {
          events.push(
            context.createEvent(codexEventName, AgentRunEventType.TOOL_DENIED, {
              ...serializedPayload,
              ...(invocationId ? { invocation_id: invocationId } : {}),
              tool_name: "edit_file",
              reason: context.resolveToolDecisionReason(payload) ?? "Tool execution denied.",
              error: context.resolveToolError(payload),
            }),
          );
        } else if (failed) {
          events.push(
            context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_FAILED, {
              ...serializedPayload,
              ...(invocationId ? { invocation_id: invocationId } : {}),
              tool_name: "edit_file",
              error: context.resolveToolError(payload),
            }),
          );
        } else {
          events.push(
            context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
              ...serializedPayload,
              ...(invocationId ? { invocation_id: invocationId } : {}),
              tool_name: "edit_file",
              result: context.resolveToolResult(payload),
            }),
          );
        }

        events.push(createFileChangeSegmentEndEvent(context, codexEventName, payload));
        return events;
      }
      if (itemFamily === "dynamic_tool_call") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          createTerminalToolExecutionEvent(context, codexEventName, payload),
          createSegmentEndEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "web_search") {
        const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
        return [
          ...reasoningEnds,
          ...projectCodexWebSearchCompletedEvents(
            webSearchProjectorContext(context),
            codexEventName,
            payload,
          ),
        ];
      }
      if (!context.resolveSegmentType(payload)) return [];
      return [
        createSegmentEndEvent(context, codexEventName, payload),
      ];
    }
    case CodexThreadEventName.ITEM_REASONING_DELTA:
    case CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED:
    case CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA:
      return [];
    case CodexThreadEventName.ITEM_REASONING_COMPLETED: {
      return context.resolveCompletedReasoningEvents(codexEventName, payload);
    }
    case CodexThreadEventName.ITEM_PLAN_DELTA:
      return [
        context.createEvent(
          codexEventName,
          AgentRunEventType.TODO_LIST_UPDATE,
          serializeCodexItemEventPayload(payload),
        ),
      ];
    case CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL:
    case CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL:
    case CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED: {
      const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
      const invocationId = context.resolveInvocationId(payload);
      const fallbackToolName =
        codexEventName === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL
          ? "edit_file"
          : "run_bash";
      const toolName = normalizeCodexAgentToolsToolNameForEvent(
        context.resolveToolName(payload, fallbackToolName),
      );
      return [
        ...reasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.TOOL_APPROVAL_REQUESTED, {
          ...serializeCodexItemEventPayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          arguments: context.resolveToolArguments(payload, fallbackToolName),
        }),
      ];
    }
    case CodexThreadEventName.LOCAL_TOOL_APPROVED: {
      const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
      const invocationId = context.resolveInvocationId(payload);
      const toolName = normalizeCodexAgentToolsToolNameForEvent(context.resolveToolName(payload, "run_bash"));
      const reason = context.resolveToolDecisionReason(payload);
      return [
        ...reasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.TOOL_APPROVED, {
          ...serializeCodexItemEventPayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(reason ? { reason } : {}),
        }),
      ];
    }
    case CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED: {
      const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
      return [
        ...reasoningEnds,
        createTerminalToolExecutionEvent(context, codexEventName, payload),
      ];
    }
    case CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA: {
      const invocationId = context.resolveInvocationId(payload);
      const logEntry = context.resolveLogEntry(payload);
      if (!invocationId || !logEntry) {
        return [];
      }
      const reasoningEnds = applyToolLifecyclePlacement(context, codexEventName, payload);
      return [
        ...reasoningEnds,
        context.createEvent(codexEventName, AgentRunEventType.TOOL_LOG, {
          ...serializeCodexItemEventPayload(payload),
          tool_invocation_id: invocationId,
          tool_name: "edit_file",
          log_entry: logEntry,
        }),
      ];
    }
    case CodexThreadEventName.ITEM_TOOL_CALL:
    case CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL:
      return [];
    default:
      return [];
  }
};
