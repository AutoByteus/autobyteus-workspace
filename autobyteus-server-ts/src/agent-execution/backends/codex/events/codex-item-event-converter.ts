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
import type { CodexReasoningBlockUpdate } from "./codex-reasoning-block-tracker.js";
import type { CodexToolLifecyclePlacement } from "./codex-ordered-tool-boundary-tracker.js";

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
  resolveCompletedReasoningSnapshot: (payload: JsonObject) => CodexReasoningBlockUpdate | null;
  clearReasoningBlockForBoundary: (payload: JsonObject) => void;
  classifyToolLifecycleUpdate: (payload: JsonObject) => CodexToolLifecyclePlacement;
  isUserMessageItem: (itemType: string | null) => boolean;
  isReasoningItem: (itemType: string | null) => boolean;
  resolveWebSearchMetadata: (payload: JsonObject) => Record<string, unknown>;
  resolveWebSearchArguments: (payload: JsonObject) => Record<string, unknown>;
  resolveWebSearchResult: (payload: JsonObject) => unknown;
  resolveWebSearchError: (payload: JsonObject) => string;
  resolveTurnId: (payload: JsonObject) => string | null;
  resolveSegmentStartId: (payload: JsonObject, segmentType: string) => string;
  resolveSegmentType: (payload: JsonObject) => string;
  resolveSegmentMetadata: (payload: JsonObject) => Record<string, unknown> | undefined;
  resolveSegmentId: (payload: JsonObject, fallback?: string) => string;
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

export const isCodexItemEventName = (codexEventName: string): boolean =>
  codexEventName.startsWith("item/");

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

const createWebSearchSegmentStartEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent =>
  context.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
    ...serializeCodexItemEventPayload(payload),
    id: context.resolveSegmentStartId(payload, "tool_call"),
    segment_type: "tool_call",
    metadata: context.resolveWebSearchMetadata(payload),
  });

const createWebSearchLifecycleStartedEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const toolArguments = context.resolveWebSearchArguments(payload);
  const hasToolArguments = Object.keys(toolArguments).length > 0;
  return context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
    ...serializeCodexItemEventPayload(payload),
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(turnId ? { turn_id: turnId } : {}),
    tool_name: "search_web",
    ...(hasToolArguments ? { arguments: toolArguments } : {}),
  });
};

const createWebSearchTerminalLifecycleEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const toolArguments = context.resolveWebSearchArguments(payload);
  const hasToolArguments = Object.keys(toolArguments).length > 0;
  const basePayload = {
    ...serializeCodexItemEventPayload(payload),
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(turnId ? { turn_id: turnId } : {}),
    tool_name: "search_web",
    ...(hasToolArguments ? { arguments: toolArguments } : {}),
  };

  if (context.isExecutionFailure(payload)) {
    return context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_FAILED, {
      ...basePayload,
      error: context.resolveWebSearchError(payload),
    });
  }

  return context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
    ...basePayload,
    result: context.resolveWebSearchResult(payload),
  });
};

const createWebSearchSegmentEndEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent =>
  context.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
    ...serializeCodexItemEventPayload(payload),
    id: context.resolveSegmentId(payload),
    metadata: context.resolveWebSearchMetadata(payload),
  });

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

const createReasoningContentEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent[] => {
  const update = context.resolveCompletedReasoningSnapshot(payload);
  if (!update) return [];
  return [
    context.createEvent(codexEventName, AgentRunEventType.SEGMENT_CONTENT, {
      ...serializeCodexItemEventPayload(payload),
      id: update.segmentId,
      delta: update.delta,
      segment_type: "reasoning",
    }),
  ];
};

const applyToolLifecyclePlacement = (
  context: CodexItemEventConverterContext,
  payload: JsonObject,
): void => {
  if (context.classifyToolLifecycleUpdate(payload) === "result_first_creation") {
    context.clearReasoningBlockForBoundary(payload);
  }
};

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
        context.clearReasoningBlockForBoundary(payload);
        return [];
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
        applyToolLifecyclePlacement(context, payload);
        return [
          context.createEvent(codexEventName, AgentRunEventType.TOOL_EXECUTION_STARTED, {
            ...serializeCodexItemEventPayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: context.resolveToolArguments(payload, "run_bash"),
          }),
        ];
      }
      if (itemFamily === "web_search") {
        applyToolLifecyclePlacement(context, payload);
        return [
          createWebSearchSegmentStartEvent(context, codexEventName, payload),
          createWebSearchLifecycleStartedEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "file_change") {
        applyToolLifecyclePlacement(context, payload);
        return [
          createFileChangeSegmentStartEvent(context, codexEventName, payload),
          createFileChangeLifecycleStartedEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "mcp_tool_call" || itemFamily === "dynamic_tool_call") {
        applyToolLifecyclePlacement(context, payload);
        return [
          createDynamicToolSegmentStartEvent(context, codexEventName, payload),
          createDynamicToolLifecycleStartedEvent(context, codexEventName, payload),
        ];
      }
      const segmentType = context.resolveSegmentType(payload);
      if (
        segmentType === "tool_call" ||
        segmentType === "run_bash" ||
        segmentType === "edit_file"
      ) {
        applyToolLifecyclePlacement(context, payload);
      } else {
        context.clearReasoningBlockForBoundary(payload);
      }
      const segmentMetadata = context.resolveSegmentMetadata(payload);
      return [
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
      context.clearReasoningBlockForBoundary(payload);
      const textEvent = context.createTextSegmentContentEvent(codexEventName, payload);
      return textEvent ? [textEvent] : [];
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
        return createReasoningContentEvent(context, codexEventName, payload);
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
        applyToolLifecyclePlacement(context, payload);
        return [createTerminalToolExecutionEvent(context, codexEventName, payload, "run_bash")];
      }
      if (itemFamily === "file_change") {
        applyToolLifecyclePlacement(context, payload);
        const invocationId = context.resolveInvocationId(payload);
        const serializedPayload = serializeCodexItemEventPayload(payload);
        const events: AgentRunEvent[] = [];
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
        applyToolLifecyclePlacement(context, payload);
        return [
          createTerminalToolExecutionEvent(context, codexEventName, payload),
          createSegmentEndEvent(context, codexEventName, payload),
        ];
      }
      if (itemFamily === "web_search") {
        applyToolLifecyclePlacement(context, payload);
        return [
          createWebSearchTerminalLifecycleEvent(context, codexEventName, payload),
          createWebSearchSegmentEndEvent(context, codexEventName, payload),
        ];
      }
      return [
        createSegmentEndEvent(context, codexEventName, payload),
      ];
    }
    case CodexThreadEventName.ITEM_REASONING_DELTA:
    case CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED:
    case CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA:
      return [];
    case CodexThreadEventName.ITEM_REASONING_COMPLETED: {
      return createReasoningContentEvent(context, codexEventName, payload);
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
      applyToolLifecyclePlacement(context, payload);
      const invocationId = context.resolveInvocationId(payload);
      const fallbackToolName =
        codexEventName === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL
          ? "edit_file"
          : "run_bash";
      const toolName = normalizeCodexAgentToolsToolNameForEvent(
        context.resolveToolName(payload, fallbackToolName),
      );
      return [
        context.createEvent(codexEventName, AgentRunEventType.TOOL_APPROVAL_REQUESTED, {
          ...serializeCodexItemEventPayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          arguments: context.resolveToolArguments(payload, fallbackToolName),
        }),
      ];
    }
    case CodexThreadEventName.LOCAL_TOOL_APPROVED: {
      applyToolLifecyclePlacement(context, payload);
      const invocationId = context.resolveInvocationId(payload);
      const toolName = normalizeCodexAgentToolsToolNameForEvent(context.resolveToolName(payload, "run_bash"));
      const reason = context.resolveToolDecisionReason(payload);
      return [
        context.createEvent(codexEventName, AgentRunEventType.TOOL_APPROVED, {
          ...serializeCodexItemEventPayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(reason ? { reason } : {}),
        }),
      ];
    }
    case CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED:
      applyToolLifecyclePlacement(context, payload);
      return [createTerminalToolExecutionEvent(context, codexEventName, payload)];
    case CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA: {
      const invocationId = context.resolveInvocationId(payload);
      const logEntry = context.resolveLogEntry(payload);
      if (!invocationId || !logEntry) {
        return [];
      }
      applyToolLifecyclePlacement(context, payload);
      return [
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
