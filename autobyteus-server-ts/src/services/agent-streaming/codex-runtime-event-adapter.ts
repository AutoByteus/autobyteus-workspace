import { normalizeCodexRuntimeMethod } from "../../runtime-execution/codex-app-server/codex-runtime-method-normalizer.js";
import { serializePayload } from "./payload-serialization.js";
import { ServerMessage, ServerMessageType } from "./models.js";
import { CodexRuntimeEventSegmentHelper } from "./codex-runtime-event-segment-helper.js";
import { asObject } from "./codex-runtime-event-tool-helper.js";

type CodexRuntimeNotification = {
  method?: unknown;
  params?: unknown;
  payload?: unknown;
};

const isSendMessageToToolName = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "send_message_to" ||
    normalized.endsWith("__send_message_to") ||
    normalized.endsWith(".send_message_to") ||
    normalized.endsWith("/send_message_to")
  );
};

const normalizeToolNameForUi = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  if (isSendMessageToToolName(value)) {
    return "send_message_to";
  }
  return value;
};

export class CodexRuntimeEventAdapter extends CodexRuntimeEventSegmentHelper {
  map(rawEvent: unknown): ServerMessage {
    const envelope = asObject(rawEvent) as CodexRuntimeNotification;
    const rawMethod = typeof envelope.method === "string" ? envelope.method : null;
    const method = rawMethod ? this.normalizeMethodAlias(rawMethod) : "";
    const payload = asObject(envelope.params ?? envelope.payload ?? {});
    this.logRawRuntimeEvent(rawEvent, rawMethod, method, payload);

    if (!method) {
      return new ServerMessage(ServerMessageType.ERROR, {
        code: "RUNTIME_EVENT_UNMAPPED",
        message: "Runtime event method is missing.",
      });
    }

    if (method === "turn/started") {
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        new_status: "RUNNING",
        old_status: null,
        runtime_event_method: method,
      });
    }

    if (method === "turn/completed") {
      this.clearReasoningSegmentForTurn(payload);
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        new_status: "IDLE",
        old_status: "RUNNING",
        runtime_event_method: method,
      });
    }

    if (method === "turn/diffUpdated") {
      return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "turn/taskProgressUpdated") {
      return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "codex/event/web_search_begin" || method === "codex/event/web_search_end") {
      return this.toNoopMessage(method, payload);
    }

    if (method === "item/added") {
      const itemType = this.resolveItemType(payload);
      if (this.isUserMessageItem(itemType) || this.isReasoningItem(itemType)) {
        return this.toNoopMessage(method, payload);
      }
      if (this.isWebSearchItem(itemType)) {
        return new ServerMessage(ServerMessageType.SEGMENT_START, {
          ...serializePayload(payload),
          id: this.resolveSegmentStartId(payload, "tool_call"),
          segment_type: "tool_call",
          metadata: this.resolveWebSearchMetadata(payload),
          runtime_event_method: method,
        });
      }
      const segmentType = this.resolveSegmentType(payload);
      return new ServerMessage(ServerMessageType.SEGMENT_START, {
        ...serializePayload(payload),
        id: this.resolveSegmentStartId(payload, segmentType),
        segment_type: segmentType,
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/delta") {
      const resolvedSegmentType = this.resolveSegmentType(payload);
      if (resolvedSegmentType === "reasoning") {
        return this.mapSegmentDelta(method, payload, "reasoning");
      }
      if (resolvedSegmentType === "text") {
        return this.mapSegmentDelta(method, payload, "text");
      }
      return this.mapSegmentDelta(method, payload);
    }

    if (method === "item/completed") {
      const itemType = this.resolveItemType(payload);
      if (this.isUserMessageItem(itemType)) {
        return this.toNoopMessage(method, payload);
      }
      if (this.isReasoningItem(itemType)) {
        const reasoningDelta = this.resolveReasoningSnapshot(payload);
        if (!reasoningDelta) {
          return this.toNoopMessage(method, payload);
        }
        return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
          ...serializePayload(payload),
          id: this.resolveReasoningSegmentId(payload),
          delta: reasoningDelta,
          segment_type: "reasoning",
          runtime_event_method: method,
        });
      }
      if (this.isWebSearchItem(itemType)) {
        return new ServerMessage(ServerMessageType.SEGMENT_END, {
          ...serializePayload(payload),
          id: this.resolveSegmentId(payload),
          metadata: this.resolveWebSearchMetadata(payload),
          runtime_event_method: method,
        });
      }
      return new ServerMessage(ServerMessageType.SEGMENT_END, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload),
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/outputText/delta") {
      return this.mapSegmentDelta(method, payload, "text");
    }

    if (method === "item/outputText/completed") {
      return new ServerMessage(ServerMessageType.SEGMENT_END, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/reasoning/delta" || method === "item/reasoning/summaryPartAdded") {
      return this.mapSegmentDelta(method, payload, "reasoning");
    }

    if (method === "item/reasoning/completed") {
      const reasoningDelta = this.resolveReasoningSnapshot(payload);
      if (!reasoningDelta) {
        return this.toNoopMessage(method, payload);
      }
      return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
        ...serializePayload(payload),
        id: this.resolveReasoningSegmentId(payload),
        delta: reasoningDelta,
        segment_type: "reasoning",
        runtime_event_method: method,
      });
    }

    if (method === "item/plan/delta") {
      return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/started") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, "run_bash"));
      const commandValue = this.resolveCommandValue(payload);
      if (isSendMessageToToolName(toolName) || isSendMessageToToolName(commandValue)) {
        return this.toNoopMessage(method, payload);
      }
      return new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        arguments: this.resolveToolArguments(payload, "run_bash"),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/delta") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, "run_bash"));
      const commandValue = this.resolveCommandValue(payload);
      if (isSendMessageToToolName(toolName) || isSendMessageToToolName(commandValue)) {
        return this.toNoopMessage(method, payload);
      }
      return new ServerMessage(ServerMessageType.TOOL_LOG, {
        ...serializePayload(payload),
        ...(invocationId ? { tool_invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        log_entry: this.resolveLogEntry(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/completed") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, "run_bash"));
      return new ServerMessage(
        this.isExecutionFailure(payload)
          ? ServerMessageType.TOOL_EXECUTION_FAILED
          : ServerMessageType.TOOL_EXECUTION_SUCCEEDED,
        {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(this.isExecutionFailure(payload)
            ? { error: this.resolveToolError(payload) }
            : { result: this.resolveToolResult(payload) }),
          runtime_event_method: method,
        },
      );
    }

    if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
      const invocationId = this.resolveInvocationId(payload);
      const fallbackToolName = method === "item/fileChange/requestApproval" ? "edit_file" : "run_bash";
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, fallbackToolName));
      return new ServerMessage(ServerMessageType.TOOL_APPROVAL_REQUESTED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        arguments: this.resolveToolArguments(payload, fallbackToolName),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/approved") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, "run_bash"));
      const reason = this.resolveToolDecisionReason(payload);
      return new ServerMessage(ServerMessageType.TOOL_APPROVED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        ...(reason ? { reason } : {}),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/denied") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = normalizeToolNameForUi(this.resolveToolName(payload, "run_bash"));
      const reason = this.resolveToolDecisionReason(payload) ?? "Tool execution denied.";
      return new ServerMessage(ServerMessageType.TOOL_DENIED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        reason,
        error: this.resolveToolError(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/started") {
      return new ServerMessage(ServerMessageType.SEGMENT_START, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        segment_type: "edit_file",
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/delta") {
      return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/completed") {
      return new ServerMessage(ServerMessageType.ARTIFACT_PERSISTED, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        runtime_event_method: method,
      });
    }

    if (method === "thread/tokenUsage/updated") {
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "inter_agent_message") {
      return new ServerMessage(ServerMessageType.INTER_AGENT_MESSAGE, {
        sender_agent_id:
          (typeof payload.sender_agent_id === "string" && payload.sender_agent_id) ||
          (typeof payload.senderAgentRunId === "string" && payload.senderAgentRunId) ||
          "unknown_sender",
        recipient_role_name:
          (typeof payload.recipient_role_name === "string" && payload.recipient_role_name) ||
          (typeof payload.recipientRoleName === "string" && payload.recipientRoleName) ||
          "recipient",
        content:
          (typeof payload.content === "string" && payload.content) ||
          "",
        message_type:
          (typeof payload.message_type === "string" && payload.message_type) ||
          (typeof payload.messageType === "string" && payload.messageType) ||
          "agent_message",
        ...(typeof payload.sender_agent_name === "string"
          ? { sender_agent_name: payload.sender_agent_name }
          : {}),
        runtime_event_method: method,
      });
    }

    if (method === "error") {
      const nestedError = asObject(payload.error);
      const errorCode = nestedError.code ?? payload.code;
      const errorMessage = nestedError.message ?? payload.message;
      return new ServerMessage(ServerMessageType.ERROR, {
        code: typeof errorCode === "string" ? errorCode : "RUNTIME_ERROR",
        message:
          typeof errorMessage === "string"
            ? errorMessage
            : "Runtime emitted an error event.",
        runtime_event_method: method,
      });
    }

    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      id:
        (typeof payload.segment_id === "string" && payload.segment_id) ||
        (typeof payload.id === "string" && payload.id) ||
        "runtime-event",
      runtime_event_method: method,
      payload: serializePayload(payload),
    });
  }

  normalizeMethodAlias(method: string): string {
    return normalizeCodexRuntimeMethod(method);
  }

  private mapSegmentDelta(
    method: string,
    payload: Record<string, unknown>,
    segmentType?: "text" | "reasoning",
  ): ServerMessage {
    const delta = this.resolveDelta(payload);
    if (!delta) {
      return this.toNoopMessage(method, payload);
    }
    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      ...serializePayload(payload),
      id: segmentType === "reasoning" ? this.resolveReasoningSegmentId(payload) : this.resolveSegmentId(payload),
      delta,
      ...(segmentType ? { segment_type: segmentType } : {}),
      runtime_event_method: method,
    });
  }

  private toNoopMessage(method: string, payload: Record<string, unknown>): ServerMessage {
    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      id: this.resolveSegmentId(payload),
      delta: "",
      runtime_event_method: method,
    });
  }
}
