import type { StreamEvent } from "autobyteus-ts";
import { StreamEventType } from "autobyteus-ts";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import {
  resolveAgentRunErrorEvidence,
  type AgentRunErrorEvidence,
} from "../../../domain/agent-run-error-evidence.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../../domain/agent-status-payload.js";
import { projectAutoByteusAgentStatus } from "./autobyteus-status-projector.js";

const resolveStatusHint = (
  eventType: StreamEventType,
  statusPayload?: AgentStatusPayload,
  errorEvidence?: AgentRunErrorEvidence | null,
): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (eventType === StreamEventType.ERROR_EVENT) {
    return errorEvidence?.kind === "TURN_TERMINAL" || errorEvidence?.kind === "RUNTIME_GLOBAL"
      ? "ERROR"
      : null;
  }
  if (eventType === StreamEventType.TURN_STARTED) {
    return "ACTIVE";
  }
  if (eventType === StreamEventType.TURN_COMPLETED) {
    return "IDLE";
  }
  if (eventType === StreamEventType.TURN_INTERRUPTED) {
    return "IDLE";
  }
  if (eventType === StreamEventType.AGENT_STATUS) {
    if (statusPayload?.status === "offline" || statusPayload?.status === "idle") {
      return "IDLE";
    }
    if (statusPayload?.status === "error") {
      return "ERROR";
    }
    return "ACTIVE";
  }
  return null;
};

const resolveSegmentEventType = (payload: Record<string, unknown>): AgentRunEventType | null => {
  const raw =
    typeof payload.event_type === "string"
      ? payload.event_type
      : typeof payload.type === "string"
        ? payload.type
        : null;
  const normalized = raw?.trim().toUpperCase() ?? null;
  if (normalized === "SEGMENT_START" || normalized === "START") {
    return AgentRunEventType.SEGMENT_START;
  }
  if (normalized === "SEGMENT_END" || normalized === "END") {
    return AgentRunEventType.SEGMENT_END;
  }
  if (normalized === "SEGMENT_CONTENT" || normalized === "CONTENT") {
    return AgentRunEventType.SEGMENT_CONTENT;
  }
  return null;
};

const eventTypeByStreamEvent = new Map<StreamEventType, AgentRunEventType>([
  [StreamEventType.TURN_STARTED, AgentRunEventType.TURN_STARTED],
  [StreamEventType.TURN_COMPLETED, AgentRunEventType.TURN_COMPLETED],
  [StreamEventType.TURN_INTERRUPTED, AgentRunEventType.TURN_INTERRUPTED],
  [StreamEventType.AGENT_STATUS, AgentRunEventType.AGENT_STATUS],
  [StreamEventType.COMPACTION_STATUS, AgentRunEventType.COMPACTION_STATUS],
  [StreamEventType.ASSISTANT_COMPLETE_RESPONSE, AgentRunEventType.ASSISTANT_COMPLETE],
  [StreamEventType.TOKEN_USAGE_UPDATED, AgentRunEventType.TOKEN_USAGE_UPDATED],
  [StreamEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_APPROVAL_REQUESTED],
  [StreamEventType.TOOL_APPROVED, AgentRunEventType.TOOL_APPROVED],
  [StreamEventType.TOOL_DENIED, AgentRunEventType.TOOL_DENIED],
  [StreamEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_STARTED],
  [StreamEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED],
  [StreamEventType.TOOL_EXECUTION_FAILED, AgentRunEventType.TOOL_EXECUTION_FAILED],
  [StreamEventType.TOOL_EXECUTION_INTERRUPTED, AgentRunEventType.TOOL_EXECUTION_INTERRUPTED],
  [StreamEventType.TOOL_INTERACTION_LOG_ENTRY, AgentRunEventType.TOOL_LOG],
  [StreamEventType.SYSTEM_TASK_NOTIFICATION, AgentRunEventType.SYSTEM_TASK_NOTIFICATION],
  [StreamEventType.INTER_AGENT_MESSAGE, AgentRunEventType.INTER_AGENT_MESSAGE],
  [StreamEventType.ARTIFACT_PERSISTED, AgentRunEventType.ARTIFACT_PERSISTED],
  [StreamEventType.ERROR_EVENT, AgentRunEventType.ERROR],
]);

type AutoByteusStatusSnapshotProvider = () => AgentStatusPayload;

const defaultStatusSnapshotProvider = (): AgentStatusPayload => ({
  status: "offline",
  can_interrupt: false,
});

export class AutoByteusStreamEventConverter {
  private activeTurn: { kind: "none" } | { kind: "anonymous" } | { kind: "identified"; turnId: string } = {
    kind: "none",
  };

  constructor(
    private readonly runId: string,
    private readonly getStatusPayload: AutoByteusStatusSnapshotProvider = defaultStatusSnapshotProvider,
  ) {}

  convert(event: StreamEvent): AgentRunEvent | null {
    const payload = serializePayload(event.data);
    const errorEvidence = event.event_type === StreamEventType.ERROR_EVENT
      ? this.resolveErrorEvidence(payload)
      : null;
    this.observeTurnLifecycle(event.event_type, payload, errorEvidence);
    const statusPayload =
      event.event_type === StreamEventType.AGENT_STATUS
        ? this.getCanonicalStatusPayload(payload.status)
        : undefined;
    const statusHint = resolveStatusHint(event.event_type, statusPayload, errorEvidence);

    if (event.event_type === StreamEventType.SEGMENT_EVENT) {
      const eventType = resolveSegmentEventType(payload);
      if (!eventType) {
        return null;
      }
      const turnId =
        typeof payload.turn_id === "string" && payload.turn_id.length > 0
          ? payload.turn_id
          : null;
      if (!turnId) {
        return null;
      }
      const nestedPayload =
        payload.payload &&
        typeof payload.payload === "object" &&
        !Array.isArray(payload.payload)
          ? (payload.payload as Record<string, unknown>)
          : {};
      const {
        turnId: _nestedCamelTurnId,
        turn_id: _nestedTurnId,
        ...canonicalNestedPayload
      } = nestedPayload;
      return {
        eventType,
        runId: this.runId,
        payload: {
          id:
            typeof payload.segment_id === "string" && payload.segment_id.length > 0
              ? payload.segment_id
              : "",
          turn_id: turnId,
          ...(payload.segment_type !== undefined ? { segment_type: payload.segment_type } : {}),
          ...canonicalNestedPayload,
        },
        statusHint,
      };
    }

    const eventType = eventTypeByStreamEvent.get(event.event_type) ?? null;
    if (!eventType) {
      return null;
    }

    const normalizedPayload = eventType === AgentRunEventType.AGENT_STATUS
      ? (statusPayload ?? this.getStatusPayload())
      : eventType === AgentRunEventType.TOKEN_USAGE_UPDATED
        ? {
            ...payload,
            observed_at: event.timestamp instanceof Date
              ? event.timestamp.toISOString()
              : new Date().toISOString(),
          }
        : payload;

    return {
      eventType,
      runId: this.runId,
      payload: normalizedPayload,
      statusHint,
    };
  }

  private observeTurnLifecycle(
    eventType: StreamEventType,
    payload: Record<string, unknown>,
    errorEvidence: AgentRunErrorEvidence | null,
  ): void {
    const turnId = this.resolveTurnId(payload);
    if (eventType === StreamEventType.TURN_STARTED) {
      this.activeTurn = turnId
        ? { kind: "identified", turnId }
        : { kind: "anonymous" };
      return;
    }
    if (
      eventType === StreamEventType.TURN_COMPLETED ||
      eventType === StreamEventType.TURN_INTERRUPTED
    ) {
      this.clearMatchingTurn(turnId);
      return;
    }
    if (eventType === StreamEventType.ERROR_EVENT) {
      if (errorEvidence?.kind === "RUNTIME_GLOBAL") {
        this.activeTurn = { kind: "none" };
      } else if (errorEvidence?.kind === "TURN_TERMINAL") {
        this.clearMatchingTurn(errorEvidence.turnId);
      }
    }
  }

  private getCanonicalStatusPayload(explicitStatus?: unknown): AgentStatusPayload {
    const snapshot = this.getStatusPayload();
    const snapshotStatus = snapshot.status;
    const eventStatus = explicitStatus === undefined || explicitStatus === null
      ? snapshotStatus
      : this.projectExplicitStatus(explicitStatus, snapshotStatus);
    const status = this.activeTurn.kind !== "none" &&
      (eventStatus === "idle" || eventStatus === "offline" || eventStatus === "initializing")
      ? "running"
      : eventStatus;

    const canonical = buildAgentStatusPayload({
      status,
      canInterrupt: snapshot.can_interrupt === true,
      agentId: snapshot.agent_id,
      agentName: snapshot.agent_name,
      memberRouteKey: snapshot.member_route_key,
      memberPath: snapshot.member_path,
      sourceRouteKey: snapshot.source_route_key,
      sourcePath: snapshot.source_path,
    });

    if (
      snapshot.member_route_key &&
      snapshot.member_path &&
      !canonical.member_route_key &&
      !canonical.member_path
    ) {
      return {
        ...canonical,
        member_route_key: snapshot.member_route_key,
        member_path: [...snapshot.member_path],
        source_route_key: snapshot.source_route_key ?? snapshot.member_route_key,
        source_path: snapshot.source_path ? [...snapshot.source_path] : [...snapshot.member_path],
      };
    }
    return canonical;
  }

  private projectExplicitStatus(
    explicitStatus: unknown,
    fallbackStatus: AgentApiStatus,
  ): AgentApiStatus {
    if (typeof explicitStatus !== "string" || explicitStatus.trim().length === 0) {
      return fallbackStatus;
    }
    const projected = projectAutoByteusAgentStatus({
      currentStatus: explicitStatus,
      isActive: true,
    }).status;
    return projected ?? fallbackStatus;
  }

  private resolveTurnId(payload: Record<string, unknown>): string | null {
    const value = typeof payload.turn_id === "string"
      ? payload.turn_id
      : typeof payload.turnId === "string"
        ? payload.turnId
        : null;
    const normalized = value?.trim() ?? "";
    return normalized.length > 0 ? normalized : null;
  }

  private resolveErrorEvidence(payload: Record<string, unknown>): AgentRunErrorEvidence | null {
    return resolveAgentRunErrorEvidence({
      eventType: AgentRunEventType.ERROR,
      runId: this.runId,
      payload,
      statusHint: null,
    });
  }

  private clearMatchingTurn(turnId: string | null): void {
    if (this.activeTurn.kind === "anonymous") {
      if (!turnId) {
        this.activeTurn = { kind: "none" };
      }
      return;
    }
    if (
      this.activeTurn.kind === "identified" &&
      turnId === this.activeTurn.turnId
    ) {
      this.activeTurn = { kind: "none" };
    }
  }
}
