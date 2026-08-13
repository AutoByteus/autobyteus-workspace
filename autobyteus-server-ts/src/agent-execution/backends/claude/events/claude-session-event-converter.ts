import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import {
  asNonEmptyRawString,
  asObject,
  asString,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { normalizeClaudeAgentToolsToolNameForEvent } from "../agent-tools-mcp/claude-agent-tools-mcp-tool-name.js";
import { normalizeClaudeBrowserToolResult } from "./claude-browser-tool-result-normalizer.js";
import { normalizeClaudeMediaToolResult } from "../media/claude-media-tool-result-normalizer.js";
import {
  projectMcpToolResultForApplication,
  type McpEffectiveResultSource,
} from "../../../../agent-tools/mcp/mcp-effective-tool-result-projector.js";
import {
  hasExplicitProviderMcpMarker,
  isMcpWireToolName,
} from "../../../../agent-tools/mcp/mcp-tool-source.js";
import { ClaudeSessionEventName } from "./claude-session-event-name.js";
import { isAgentSegmentType } from "../../../domain/agent-segment.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import {
  logProviderSegmentAdmissionRejection,
  type ProviderSegmentAdmissionRejectionReason,
} from "../../shared/provider-segment-admission-debug.js";

class ClaudeSegmentSourcePayloadRejected extends Error {
  constructor(readonly reasonCode: ProviderSegmentAdmissionRejectionReason) {
    super(reasonCode);
  }
}

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
  const agentToolsToolName = normalizeClaudeAgentToolsToolNameForEvent(trimmed);
  if (agentToolsToolName !== trimmed) {
    return agentToolsToolName;
  }
  return trimmed;
};

const resolveToolName = (payload: Record<string, unknown>): string | null =>
  normalizeToolNameForEvent(asString(payload.tool_name));

const normalizeSerializedToolName = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const toolName = normalizeToolNameForEvent(asString(payload.tool_name));
  return toolName ? { ...payload, tool_name: toolName } : payload;
};

const resolveToolArguments = (payload: Record<string, unknown>): Record<string, unknown> => {
  const argumentsPayload = asObject(payload.arguments);
  return argumentsPayload ? serializePayload(argumentsPayload) : {};
};

const resolveSegmentMetadata = (
  payload: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const metadata = asObject(payload.metadata);
  if (metadata) {
    return normalizeSerializedToolName(serializePayload(metadata));
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
  ...(asString(payload.error_scope) ? { error_scope: asString(payload.error_scope) } : {}),
  ...(asString(payload.error_effect) ? { error_effect: asString(payload.error_effect) } : {}),
  ...(resolveTurnId(payload) ? { turn_id: resolveTurnId(payload) } : {}),
});

type ClaudeProjectedToolResult = {
  result: unknown;
  mcpErrorMessage: string | null;
};

const omitResultField = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const { result: _result, ...rest } = payload;
  return rest;
};

const resolveClaudeMcpResultSource = (
  payload: Record<string, unknown>,
  rawToolName: string | null,
  canonicalToolName: string | null,
): McpEffectiveResultSource | null => {
  if (isMcpWireToolName(rawToolName)) {
    return {
      kind: "mcp_tool_result",
      provider: "claude",
      evidence: "provider_mcp_wire_tool_name",
      rawToolName,
      canonicalToolName,
    };
  }
  if (hasExplicitProviderMcpMarker(payload)) {
    return {
      kind: "mcp_tool_result",
      provider: "claude",
      evidence: "explicit_provider_mcp_marker",
      rawToolName,
      canonicalToolName,
    };
  }
  return null;
};

const resolveClaudeProjectedToolResult = (
  payload: Record<string, unknown>,
  rawToolName: string | null,
  canonicalToolName: string | null,
): ClaudeProjectedToolResult => {
  const rawResult = payload.result ?? null;
  const source = resolveClaudeMcpResultSource(payload, rawToolName, canonicalToolName);
  const projection = source
    ? projectMcpToolResultForApplication(rawResult, source)
    : null;
  const effectiveResult = projection?.matched ? projection.result : rawResult;
  const browserNormalizedResult = normalizeClaudeBrowserToolResult(
    canonicalToolName,
    effectiveResult,
  );
  const mediaNormalizedResult = normalizeClaudeMediaToolResult(
    canonicalToolName,
    browserNormalizedResult,
  );
  return {
    result: mediaNormalizedResult,
    mcpErrorMessage: projection?.isError ? projection.errorMessage : null,
  };
};

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
  constructor(
    private readonly runId: string,
    private readonly getLifecycleSnapshot: () => AgentRuntimeLifecycleSnapshot = () => ({
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    }),
  ) {}

  convert(event: ClaudeSessionEvent): AgentRunEvent[] {
    try {
      return this.convertExact(event);
    } catch (error) {
      if (error instanceof ClaudeSegmentSourcePayloadRejected) {
        logProviderSegmentAdmissionRejection({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          runId: this.runId,
          nativeEventName: event.method.trim(),
          reasonCode: error.reasonCode,
        });
        return [];
      }
      throw error;
    }
  }

  private convertExact(event: ClaudeSessionEvent): AgentRunEvent[] {
    const claudeEventName = event.method.trim();
    const payload = asObject(event.params) ?? {};
    const turnId = resolveTurnId(payload);

    switch (claudeEventName) {
      case ClaudeSessionEventName.TURN_STARTED:
        return this.createLifecycleEvents(claudeEventName, AgentRunEventType.TURN_STARTED, {
          ...(turnId ? { turnId } : {}),
        });
      case ClaudeSessionEventName.TURN_COMPLETED:
        return this.createLifecycleEvents(claudeEventName, AgentRunEventType.TURN_COMPLETED, {
          ...(turnId ? { turnId } : {}),
        });
      case ClaudeSessionEventName.TURN_INTERRUPTED:
        return this.createLifecycleEvents(claudeEventName, AgentRunEventType.TURN_INTERRUPTED, {
          ...(turnId ? { turnId } : {}),
        });
      case ClaudeSessionEventName.SESSION_TERMINATED:
      case ClaudeSessionEventName.STATUS_CHANGED:
        return [this.createStatusEvent(claudeEventName)];
      case ClaudeSessionEventName.STATUS_COMPACTING:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.COMPACTION_STATUS,
          this.buildClaudeCompactionBoundaryPayload(payload, "claude.status_compacting", false),
        )];
      case ClaudeSessionEventName.TOKEN_USAGE_UPDATED:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.TOKEN_USAGE_UPDATED,
          serializePayload(payload),
        )];
      case ClaudeSessionEventName.COMPACT_BOUNDARY:
        return [this.createEvent(
          claudeEventName,
          AgentRunEventType.COMPACTION_STATUS,
          this.buildClaudeCompactionBoundaryPayload(payload, "claude.compact_boundary", true),
        )];
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA: {
        const id = resolveSegmentId(payload);
        const delta = asNonEmptyRawString(payload.delta);
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_CONTENT, {
          ...serializePayload(payload),
          id,
          delta,
        })];
      }
      case ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED: {
        const id = resolveSegmentId(payload);
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_END, {
          ...serializePayload(payload),
          id,
        })];
      }
      case ClaudeSessionEventName.ITEM_ADDED: {
        const id = resolveSegmentId(payload);
        const segmentType = asString(payload.segment_type);
        const segmentMetadata = resolveSegmentMetadata(payload);
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_START, {
          ...serializePayload(payload),
          id,
          segment_type: segmentType,
          ...(segmentMetadata ? { metadata: segmentMetadata } : {}),
        })];
      }
      case ClaudeSessionEventName.ITEM_COMPLETED: {
        const id = resolveSegmentId(payload);
        const segmentMetadata = resolveSegmentMetadata(payload);
        return [this.createEvent(claudeEventName, AgentRunEventType.SEGMENT_END, {
          ...serializePayload(payload),
          id,
          ...(segmentMetadata ? { metadata: segmentMetadata } : {}),
        })];
      }
      case ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED: {
        const invocationId = resolveInvocationId(payload);
        const toolName = resolveToolName(payload);
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
        const rawToolName = asString(payload.tool_name);
        const toolName = resolveToolName(payload);
        const error = asString(payload.error);
        const hasArguments = Object.prototype.hasOwnProperty.call(payload, "arguments");
        const projectedToolResult = resolveClaudeProjectedToolResult(
          payload,
          rawToolName,
          toolName,
        );
        const failureError = error ?? projectedToolResult.mcpErrorMessage;
        const serializedPayload = failureError
          ? omitResultField(serializePayload(payload))
          : serializePayload(payload);
        return [this.createEvent(
          claudeEventName,
          failureError
            ? AgentRunEventType.TOOL_EXECUTION_FAILED
            : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          {
            ...serializedPayload,
            ...(invocationId ? { invocation_id: invocationId } : {}),
            ...(toolName ? { tool_name: toolName } : {}),
            ...(failureError ? { error: failureError } : { result: projectedToolResult.result }),
            ...(hasArguments ? { arguments: resolveToolArguments(payload) } : {}),
          },
        )];
      }
      case ClaudeSessionEventName.ERROR: {
        const errorEvent = this.createEvent(
          claudeEventName,
          AgentRunEventType.ERROR,
          buildErrorPayload(payload),
        );
        return [errorEvent];
      }
      default:
        return [];
    }
  }

  private createLifecycleEvents(
    claudeEventName: string,
    lifecycleEventType:
      | AgentRunEventType.TURN_STARTED
      | AgentRunEventType.TURN_COMPLETED
      | AgentRunEventType.TURN_INTERRUPTED,
    lifecyclePayload: Record<string, unknown>,
  ): AgentRunEvent[] {
    return [
      this.createEvent(claudeEventName, lifecycleEventType, lifecyclePayload),
    ];
  }

  private createStatusEvent(
    claudeEventName: string,
    payload: Record<string, unknown> = {},
  ): AgentRunEvent {
    const snapshot = this.getLifecycleSnapshot();
    return this.createEvent(claudeEventName, AgentRunEventType.AGENT_STATUS, {
      status: snapshot.availability === "offline" ? "offline" : snapshot.phase,
      ...payload,
    });
  }

  private createEvent(
    claudeEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ): AgentRunEvent {
    const isSegmentEvent = eventType === AgentRunEventType.SEGMENT_START ||
      eventType === AgentRunEventType.SEGMENT_CONTENT ||
      eventType === AgentRunEventType.SEGMENT_END;
    const segmentId = isSegmentEvent ? resolveSegmentId(payload) : null;
    const segmentTurnId = isSegmentEvent ? resolveTurnId(payload) : null;
    if (isSegmentEvent && (!segmentId || !segmentTurnId)) {
      throw new ClaudeSegmentSourcePayloadRejected("CLAUDE_SEGMENT_IDENTITY_INVALID");
    }
    if (eventType === AgentRunEventType.SEGMENT_START && !isAgentSegmentType(payload.segment_type)) {
      throw new ClaudeSegmentSourcePayloadRejected("CLAUDE_SEGMENT_TYPE_INVALID");
    }
    if (eventType === AgentRunEventType.SEGMENT_CONTENT && typeof payload.delta !== "string") {
      throw new ClaudeSegmentSourcePayloadRejected("CLAUDE_SEGMENT_CONTENT_INVALID");
    }
    const normalizedPayload = eventType === AgentRunEventType.SEGMENT_START
      ? { id: segmentId, turn_id: segmentTurnId, segment_type: payload.segment_type,
          ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}) }
      : eventType === AgentRunEventType.SEGMENT_CONTENT
        ? { id: segmentId, turn_id: segmentTurnId, delta: payload.delta }
        : eventType === AgentRunEventType.SEGMENT_END
          ? { id: segmentId, turn_id: segmentTurnId,
              ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
              ...(payload.interrupted !== undefined ? { interrupted: payload.interrupted } : {}),
              ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
              ...(payload.failed !== undefined ? { failed: payload.failed } : {}),
              ...(payload.error !== undefined ? { error: payload.error } : {}) }
          : payload;
    const event: AgentRunEvent = {
      eventType,
      runId: this.runId,
      payload: normalizedPayload,
      statusHint: null,
    };
    if (eventType !== AgentRunEventType.ERROR) {
      event.statusHint = deriveClaudeAgentRunStatusHint(claudeEventName);
      return event;
    }

    const evidence = resolveAgentRunErrorEvidence(event);
    event.statusHint = evidence?.kind === "TURN_TERMINAL" || evidence?.kind === "RUNTIME_GLOBAL"
      ? "ERROR"
      : null;
    return event;
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
