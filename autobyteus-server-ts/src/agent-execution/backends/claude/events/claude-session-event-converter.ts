import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { isBrowserToolName } from "../../../../agent-tools/browser/browser-tool-contract.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import { asObject, asString, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { isClaudeSendMessageToolName } from "../claude-send-message-tool-name.js";
import { ClaudeSessionEventName } from "./claude-session-event-name.js";

const CLAUDE_BROWSER_MCP_TOOL_PREFIX = "mcp__autobyteus_browser__";

const resolveSegmentId = (payload: Record<string, unknown>): string | null =>
  asString(payload.id);

const resolveInvocationId = (payload: Record<string, unknown>): string | null =>
  asString(payload.invocation_id);

const normalizeToolNameForEvent = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith(CLAUDE_BROWSER_MCP_TOOL_PREFIX)) {
    return trimmed;
  }
  const candidate = trimmed.slice(CLAUDE_BROWSER_MCP_TOOL_PREFIX.length);
  return isBrowserToolName(candidate) ? candidate : trimmed;
};

const resolveToolName = (payload: Record<string, unknown>): string | null =>
  normalizeToolNameForEvent(asString(payload.tool_name));

const resolveToolArguments = (payload: Record<string, unknown>): Record<string, unknown> => {
  const argumentsPayload = asObject(payload.arguments);
  return argumentsPayload ? serializePayload(argumentsPayload) : {};
};

const resolveSegmentMetadata = (
  payload: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const metadata = asObject(payload.metadata);
  if (metadata) {
    return serializePayload(metadata);
  }
  const toolName = resolveToolName(payload);
  const argumentsPayload = resolveToolArguments(payload);
  if (!toolName && Object.keys(argumentsPayload).length === 0) {
    return undefined;
  }
  return {
    ...(toolName ? { tool_name: toolName } : {}),
    ...(Object.keys(argumentsPayload).length > 0 ? { arguments: argumentsPayload } : {}),
  };
};

const buildErrorPayload = (payload: Record<string, unknown>): Record<string, unknown> => ({
  code: asString(payload.code) ?? "RUNTIME_ERROR",
  message: asString(payload.message) ?? "Claude runtime emitted an error.",
});

export const deriveClaudeAgentRunStatusHint = (
  claudeEventName: string,
): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (claudeEventName === ClaudeSessionEventName.TURN_STARTED) {
    return "ACTIVE";
  }
  if (
    claudeEventName === ClaudeSessionEventName.TURN_COMPLETED ||
    claudeEventName === ClaudeSessionEventName.TURN_INTERRUPTED ||
    claudeEventName === ClaudeSessionEventName.SESSION_TERMINATED
  ) {
    return "IDLE";
  }
  if (claudeEventName === ClaudeSessionEventName.ERROR) {
    return "ERROR";
  }
  return null;
};

export class ClaudeSessionEventConverter {
  constructor(private readonly runId: string) {}

  convert(event: ClaudeSessionEvent): AgentRunEvent | null {
    const claudeEventName = event.method.trim();
    const payload = asObject(event.params) ?? {};

    switch (claudeEventName) {
      case ClaudeSessionEventName.TURN_STARTED:
        return this.createEvent(claudeEventName, AgentRunEventType.AGENT_STATUS, {
          new_status: "RUNNING",
          old_status: null,
        });
      case ClaudeSessionEventName.TURN_COMPLETED:
      case ClaudeSessionEventName.TURN_INTERRUPTED:
      case ClaudeSessionEventName.SESSION_TERMINATED:
        return this.createEvent(claudeEventName, AgentRunEventType.AGENT_STATUS, {
          new_status: "IDLE",
          old_status: "RUNNING",
        });
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA: {
        const id = resolveSegmentId(payload);
        const delta = asString(payload.delta);
        if (!id || !delta) {
          return null;
        }
        return this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_CONTENT, {
          ...serializePayload(payload),
          id,
          delta,
          segment_type: "text",
        });
      }
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED: {
        const id = resolveSegmentId(payload);
        if (!id) {
          return null;
        }
        return this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_END, {
          ...serializePayload(payload),
          id,
          segment_type: "text",
        });
      }
      case ClaudeSessionEventName.ITEM_ADDED:
      case ClaudeSessionEventName.ITEM_COMPLETED: {
        const id = resolveSegmentId(payload);
        const segmentType = asString(payload.segment_type);
        const toolName = resolveToolName(payload);
        const segmentMetadata = resolveSegmentMetadata(payload);
        if (!id || !segmentType) {
          return null;
        }
        const eventType =
          claudeEventName === ClaudeSessionEventName.ITEM_ADDED
            ? AgentRunEventType.SEGMENT_START
            : AgentRunEventType.SEGMENT_END;
        return this.createEvent(claudeEventName, eventType, {
          ...serializePayload(payload),
          id,
          segment_type: segmentType,
          ...(segmentMetadata ? { metadata: segmentMetadata } : {}),
        });
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return null;
        }
        return this.createEvent(
          claudeEventName,
          AgentRunEventType.TOOL_EXECUTION_STARTED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: resolveToolArguments(payload),
          },
        );
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return null;
        }
        return this.createEvent(
          claudeEventName,
          AgentRunEventType.TOOL_APPROVAL_REQUESTED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: resolveToolArguments(payload),
          },
        );
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return null;
        }
        const reason = asString(payload.reason);
        return this.createEvent(claudeEventName, AgentRunEventType.TOOL_APPROVED, {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(reason ? { reason } : {}),
        });
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return null;
        }
        const reason = asString(payload.reason) ?? "Tool execution denied.";
        return this.createEvent(claudeEventName, AgentRunEventType.TOOL_DENIED, {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          reason,
          error: asString(payload.error) ?? reason,
        });
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return null;
        }
        const error = asString(payload.error);
        return this.createEvent(
          claudeEventName,
          error
            ? AgentRunEventType.TOOL_EXECUTION_FAILED
            : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            ...(error ? { error } : { result: payload.result ?? null }),
          },
        );
      }
      case ClaudeSessionEventName.ERROR:
        return this.createEvent(
          claudeEventName,
          AgentRunEventType.ERROR,
          buildErrorPayload(payload),
        );
      default:
        return null;
    }
  }

  private createEvent(
    claudeEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ): AgentRunEvent {
    return {
      eventType,
      runId: this.runId,
      payload,
      statusHint: deriveClaudeAgentRunStatusHint(claudeEventName),
    };
  }
}
