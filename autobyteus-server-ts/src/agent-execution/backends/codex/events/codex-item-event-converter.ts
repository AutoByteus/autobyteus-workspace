import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

const isSendMessageToToolName = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  return value.trim().toLowerCase() === "send_message_to";
};

const normalizeToolNameForEvent = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  if (isSendMessageToToolName(value)) {
    return "send_message_to";
  }
  return value;
};

export type CodexItemEventConverterContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  createSegmentContentEvent: (
    codexEventName: string,
    payload: JsonObject,
    segmentType?: "text" | "reasoning",
  ) => AgentRunEvent | null;
  clearReasoningSegmentForTurn: (payload: JsonObject) => void;
  resolveItemType: (payload: JsonObject) => string | null;
  isUserMessageItem: (itemType: string | null) => boolean;
  isReasoningItem: (itemType: string | null) => boolean;
  isWebSearchItem: (itemType: string | null) => boolean;
  resolveWebSearchMetadata: (payload: JsonObject) => Record<string, unknown>;
  resolveSegmentStartId: (payload: JsonObject, segmentType: string) => string;
  resolveSegmentType: (payload: JsonObject) => string;
  resolveSegmentMetadata: (payload: JsonObject) => Record<string, unknown> | undefined;
  resolveReasoningSnapshot: (payload: JsonObject) => string;
  resolveReasoningSegmentId: (payload: JsonObject) => string;
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
  resolveLogEntry: (payload: JsonObject) => string;
  isExecutionFailure: (payload: JsonObject) => boolean;
  resolveToolError: (payload: JsonObject) => string;
  resolveToolResult: (payload: JsonObject) => unknown;
  resolveToolDecisionReason: (payload: JsonObject) => string | null;
  resolveExecutionStatus: (payload: JsonObject) => string | null;
};

export const isCodexItemEventName = (codexEventName: string): boolean =>
  codexEventName.startsWith("item/");

const createTerminalToolExecutionEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
  fallbackToolName: "run_bash" | "edit_file" = "run_bash",
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  const toolName = normalizeToolNameForEvent(context.resolveToolName(payload, fallbackToolName));
  const serializedPayload = serializePayload(payload);
  const status = context.resolveExecutionStatus(payload)?.toLowerCase() ?? null;
  if (status === "declined") {
    const reason = context.resolveToolDecisionReason(payload) ?? "Tool execution denied.";
    return context.createEvent(codexEventName, AgentRunEventType.TOOL_DENIED, {
      ...serializedPayload,
      ...(invocationId ? { invocation_id: invocationId } : {}),
      ...(toolName ? { tool_name: toolName } : {}),
      reason,
      error: context.resolveToolError(payload),
    });
  }
  const eventType = context.isExecutionFailure(payload)
    ? AgentRunEventType.TOOL_EXECUTION_FAILED
    : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED;
  return context.createEvent(codexEventName, eventType, {
    ...serializedPayload,
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(toolName ? { tool_name: toolName } : {}),
    ...(context.isExecutionFailure(payload)
      ? { error: context.resolveToolError(payload) }
      : { result: context.resolveToolResult(payload) }),
  });
};

export const convertCodexItemEvent = (
  context: CodexItemEventConverterContext,
  codexEventName: string,
  payload: JsonObject,
): AgentRunEvent | null => {
  switch (codexEventName) {
    case CodexThreadEventName.ITEM_STARTED: {
      const itemType = context.resolveItemType(payload);
      if (context.isUserMessageItem(itemType) || context.isReasoningItem(itemType)) {
        return null;
      }
      if (itemType === "commandexecution") {
        context.clearReasoningSegmentForTurn(payload);
        const invocationId = context.resolveInvocationId(payload);
        const toolName = normalizeToolNameForEvent(context.resolveToolName(payload, "run_bash"));
        const commandValue = context.resolveCommandValue(payload);
        if (isSendMessageToToolName(toolName) || isSendMessageToToolName(commandValue)) {
          return null;
        }
        return context.createEvent(
          codexEventName,
          AgentRunEventType.TOOL_EXECUTION_STARTED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: context.resolveToolArguments(payload, "run_bash"),
          },
        );
      }
      context.clearReasoningSegmentForTurn(payload);
      if (context.isWebSearchItem(itemType)) {
        return context.createEvent(
          codexEventName,
          AgentRunEventType.SEGMENT_START,
          {
            ...serializePayload(payload),
            id: context.resolveSegmentStartId(payload, "tool_call"),
            segment_type: "tool_call",
            metadata: context.resolveWebSearchMetadata(payload),
          },
        );
      }
      const segmentType = context.resolveSegmentType(payload);
      const segmentMetadata = context.resolveSegmentMetadata(payload);
      return context.createEvent(
        codexEventName,
        AgentRunEventType.SEGMENT_START,
        {
          ...serializePayload(payload),
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
        },
      );
    }
    case CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA:
      context.clearReasoningSegmentForTurn(payload);
      return context.createSegmentContentEvent(codexEventName, payload, "text");
    case CodexThreadEventName.ITEM_COMPLETED: {
      const itemType = context.resolveItemType(payload);
      if (context.isUserMessageItem(itemType)) {
        return null;
      }
      if (context.isReasoningItem(itemType)) {
        const reasoningDelta = context.resolveReasoningSnapshot(payload);
        if (!reasoningDelta) {
          return null;
        }
        return context.createEvent(
          codexEventName,
          AgentRunEventType.SEGMENT_CONTENT,
          {
            ...serializePayload(payload),
            id: context.resolveReasoningSegmentId(payload),
            delta: reasoningDelta,
            segment_type: "reasoning",
          },
        );
      }
      if (itemType === "commandexecution") {
        const toolName = normalizeToolNameForEvent(context.resolveToolName(payload, "run_bash"));
        const commandValue = context.resolveCommandValue(payload);
        if (isSendMessageToToolName(toolName) || isSendMessageToToolName(commandValue)) {
          return null;
        }
        return createTerminalToolExecutionEvent(context, codexEventName, payload, "run_bash");
      }
      if (context.isWebSearchItem(itemType)) {
        return context.createEvent(
          codexEventName,
          AgentRunEventType.SEGMENT_END,
          {
            ...serializePayload(payload),
            id: context.resolveSegmentId(payload),
            metadata: context.resolveWebSearchMetadata(payload),
          },
        );
      }
      return context.createEvent(
        codexEventName,
        AgentRunEventType.SEGMENT_END,
        {
          ...serializePayload(payload),
          id: context.resolveSegmentId(payload),
          ...(context.resolveSegmentMetadata(payload)
            ? { metadata: context.resolveSegmentMetadata(payload) }
            : {}),
        },
      );
    }
    case CodexThreadEventName.ITEM_REASONING_DELTA:
    case CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED:
      return context.createSegmentContentEvent(codexEventName, payload, "reasoning");
    case CodexThreadEventName.ITEM_REASONING_COMPLETED: {
      const reasoningDelta = context.resolveReasoningSnapshot(payload);
      if (!reasoningDelta) {
        return null;
      }
      return context.createEvent(
        codexEventName,
        AgentRunEventType.SEGMENT_CONTENT,
        {
          ...serializePayload(payload),
          id: context.resolveReasoningSegmentId(payload),
          delta: reasoningDelta,
          segment_type: "reasoning",
        },
      );
    }
    case CodexThreadEventName.ITEM_PLAN_DELTA:
      return context.createEvent(
        codexEventName,
        AgentRunEventType.TODO_LIST_UPDATE,
        serializePayload(payload),
      );
    case CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL:
    case CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL:
    case CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED: {
      const invocationId = context.resolveInvocationId(payload);
      const fallbackToolName =
        codexEventName === CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL
          ? "edit_file"
          : "run_bash";
      const toolName = normalizeToolNameForEvent(
        context.resolveToolName(payload, fallbackToolName),
      );
      return context.createEvent(
        codexEventName,
        AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          arguments: context.resolveToolArguments(payload, fallbackToolName),
        },
      );
    }
    case CodexThreadEventName.LOCAL_TOOL_APPROVED: {
      const invocationId = context.resolveInvocationId(payload);
      const toolName = normalizeToolNameForEvent(context.resolveToolName(payload, "run_bash"));
      const reason = context.resolveToolDecisionReason(payload);
      return context.createEvent(
        codexEventName,
        AgentRunEventType.TOOL_APPROVED,
        {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(reason ? { reason } : {}),
        },
      );
    }
    case CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED:
      return createTerminalToolExecutionEvent(context, codexEventName, payload, "run_bash");
    case CodexThreadEventName.ITEM_FILE_CHANGE_STARTED:
      context.clearReasoningSegmentForTurn(payload);
      const fileChangeMetadata = context.resolveSegmentMetadata(payload) ?? {};
      return context.createEvent(
        codexEventName,
        AgentRunEventType.SEGMENT_START,
        {
          ...serializePayload(payload),
          id: context.resolveSegmentId(payload, "file-change"),
          segment_type: "edit_file",
          metadata: {
            tool_name: "edit_file",
            ...fileChangeMetadata,
          },
        },
      );
    case CodexThreadEventName.ITEM_FILE_CHANGE_DELTA:
      return context.createEvent(
        codexEventName,
        AgentRunEventType.ARTIFACT_UPDATED,
        {
          ...serializePayload(payload),
          id: context.resolveSegmentId(payload, "file-change"),
        },
      );
    case CodexThreadEventName.ITEM_FILE_CHANGE_COMPLETED:
      return context.createEvent(
        codexEventName,
        AgentRunEventType.ARTIFACT_PERSISTED,
        {
          ...serializePayload(payload),
          id: context.resolveSegmentId(payload, "file-change"),
        },
      );
    default:
      return null;
  }
};
