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

const resolveTurnId = (payload: Record<string, unknown>): string | null =>
  asString(payload.turnId) ?? asString(payload.turn_id);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

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

  convert(event: ClaudeSessionEvent): AgentRunEvent[] {
    const claudeEventName = event.method.trim();
    const payload = asObject(event.params) ?? {};
    const turnId = resolveTurnId(payload);

    switch (claudeEventName) {
      case ClaudeSessionEventName.TURN_STARTED:
        return this.createLifecycleEvents(claudeEventName, AgentRunEventType.TURN_STARTED, {
          ...(turnId ? { turnId } : {}),
        }, {
          new_status: "RUNNING",
          old_status: null,
          ...(turnId ? { turnId } : {}),
        });
      case ClaudeSessionEventName.TURN_COMPLETED:
      case ClaudeSessionEventName.TURN_INTERRUPTED:
      case ClaudeSessionEventName.SESSION_TERMINATED:
        return this.createLifecycleEvents(claudeEventName, AgentRunEventType.TURN_COMPLETED, {
          ...(turnId ? { turnId } : {}),
        }, {
          new_status: "IDLE",
          old_status: "RUNNING",
          ...(turnId ? { turnId } : {}),
        });
      case ClaudeSessionEventName.STATUS_COMPACTING:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.COMPACTION_STATUS,
          this.buildClaudeCompactionBoundaryPayload(payload, "claude.status_compacting", false),
        )];
      case ClaudeSessionEventName.COMPACT_BOUNDARY:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.COMPACTION_STATUS,
          this.buildClaudeCompactionBoundaryPayload(payload, "claude.compact_boundary", true),
        )];
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA: {
        const id = resolveSegmentId(payload);
        const delta = asString(payload.delta);
        if (!id || !delta) {
          return [];
        }
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_CONTENT, {
          ...serializePayload(payload),
          id,
          delta,
          segment_type: "text",
        })];
      }
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED: {
        const id = resolveSegmentId(payload);
        if (!id) {
          return [];
        }
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_END, {
          ...serializePayload(payload),
          id,
          segment_type: "text",
        })];
      }
      case ClaudeSessionEventName.ITEM_ADDED:
      case ClaudeSessionEventName.ITEM_COMPLETED: {
        const id = resolveSegmentId(payload);
        const segmentType = asString(payload.segment_type);
        const toolName = resolveToolName(payload);
        const segmentMetadata = resolveSegmentMetadata(payload);
        if (!id || !segmentType) {
          return [];
        }
        const eventType =
          claudeEventName === ClaudeSessionEventName.ITEM_ADDED
            ? AgentRunEventType.SEGMENT_START
            : AgentRunEventType.SEGMENT_END;
        return [this.createEvent(claudeEventName, eventType, {
          ...serializePayload(payload),
          id,
          segment_type: segmentType,
          ...(segmentMetadata ? { metadata: segmentMetadata } : {}),
        })];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return [];
        }
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.TOOL_EXECUTION_STARTED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: resolveToolArguments(payload),
          },
        )];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return [];
        }
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.TOOL_APPROVAL_REQUESTED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            arguments: resolveToolArguments(payload),
          },
        )];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return [];
        }
        const reason = asString(payload.reason);
        return [this.createEvent(claudeEventName, AgentRunEventType.TOOL_APPROVED, {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(reason ? { reason } : {}),
        })];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return [];
        }
        const reason = asString(payload.reason) ?? "Tool execution denied.";
        return [this.createEvent(claudeEventName, AgentRunEventType.TOOL_DENIED, {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          arguments: resolveToolArguments(payload),
          reason,
          error: asString(payload.error) ?? reason,
        })];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
        if (isClaudeSendMessageToolName(toolName)) {
          return [];
        }
        const error = asString(payload.error);
        const hasArguments = Object.prototype.hasOwnProperty.call(payload, "arguments");
        return [this.createEvent(
          claudeEventName,
          error
            ? AgentRunEventType.TOOL_EXECUTION_FAILED
            : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          {
            ...serializePayload(payload),
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            ...(error ? { error } : { result: payload.result ?? null }),
            ...(hasArguments ? { arguments: resolveToolArguments(payload) } : {}),
          },
        )];
      }
      case ClaudeSessionEventName.ERROR:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.ERROR,
          buildErrorPayload(payload),
        )];
      default:
        return [];
    }
  }

  private createLifecycleEvents(
    claudeEventName: string,
    lifecycleEventType: AgentRunEventType.TURN_STARTED | AgentRunEventType.TURN_COMPLETED,
    lifecyclePayload: Record<string, unknown>,
    statusPayload: Record<string, unknown>,
  ): AgentRunEvent[] {
    return [
      this.createEvent(claudeEventName, lifecycleEventType, lifecyclePayload),
      this.createEvent(claudeEventName, AgentRunEventType.AGENT_STATUS, statusPayload),
    ];
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

  private buildClaudeCompactionBoundaryPayload(
    payload: Record<string, unknown>,
    sourceSurface: "claude.status_compacting" | "claude.compact_boundary",
    rotationEligible: boolean,
  ): Record<string, unknown> {
    const sessionId =
      asString(payload.sessionId) ??
      asString(payload.session_id) ??
      asString(payload.threadId) ??
      asString(payload.thread_id);
    const turnId = resolveTurnId(payload);
    const eventId =
      asString(payload.uuid) ??
      asString(payload.id) ??
      asString(payload.event_id) ??
      asString(payload.eventId);
    const boundaryKey = [
      "claude",
      sessionId ?? "session",
      sourceSurface,
      eventId ?? "event",
      turnId ?? "turn",
    ].join(":");
    return {
      kind: "provider_compaction_boundary",
      runtime_kind: "CLAUDE",
      provider: "claude",
      source_surface: sourceSurface,
      boundary_key: boundaryKey,
      provider_session_id: sessionId,
      provider_event_id: eventId,
      provider_timestamp: asNumber(payload.ts) ?? asNumber(payload.timestamp) ?? null,
      turn_id: turnId,
      trigger: asString(payload.trigger) ?? null,
      status: sourceSurface === "claude.status_compacting" ? "compacting" : "compacted",
      pre_tokens: asNumber(payload.pre_tokens) ?? asNumber(payload.input_tokens) ?? null,
      rotation_eligible: rotationEligible,
      semantic_compaction: false,
      raw: serializePayload(payload),
    };
  }
}
