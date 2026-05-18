import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
} from "../../../domain/agent-status-payload.js";
import type {
  AgentRunEventProcessor,
  AgentRunEventProcessorInput,
} from "../../agent-run-event-processor.js";

const ACTIVE_LIFECYCLE_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.TURN_STARTED,
  AgentRunEventType.SEGMENT_START,
  AgentRunEventType.SEGMENT_CONTENT,
  AgentRunEventType.TOOL_APPROVAL_REQUESTED,
  AgentRunEventType.TOOL_EXECUTION_STARTED,
  AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
  AgentRunEventType.TOOL_EXECUTION_FAILED,
  AgentRunEventType.TOOL_EXECUTION_INTERRUPTED,
  AgentRunEventType.TOOL_LOG,
  AgentRunEventType.TODO_LIST_UPDATE,
  AgentRunEventType.INTER_AGENT_MESSAGE,
  AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
]);

const IDLE_LIFECYCLE_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.TURN_COMPLETED,
  AgentRunEventType.TURN_INTERRUPTED,
]);

const hasLifecycleStatusEvent = (events: readonly AgentRunEvent[]): boolean =>
  events.some((event) => event.eventType === AgentRunEventType.AGENT_STATUS);

const hasLifecycleErrorEvent = (events: readonly AgentRunEvent[]): boolean =>
  events.some((event) =>
    event.eventType === AgentRunEventType.ERROR ||
    event.statusHint === "ERROR",
  );

const hasActiveLifecycleEvidence = (events: readonly AgentRunEvent[]): boolean =>
  events.some((event) =>
    event.statusHint === "ACTIVE" ||
    ACTIVE_LIFECYCLE_EVENT_TYPES.has(event.eventType),
  );

const hasIdleLifecycleEvidence = (events: readonly AgentRunEvent[]): boolean =>
  events.some((event) =>
    event.statusHint === "IDLE" ||
    IDLE_LIFECYCLE_EVENT_TYPES.has(event.eventType),
  );

const resolveLastLifecycleStatus = (
  events: readonly AgentRunEvent[],
): AgentApiStatus | null => {
  let status: AgentApiStatus | null = null;
  for (const event of events) {
    if (event.eventType !== AgentRunEventType.AGENT_STATUS) {
      continue;
    }
    status = normalizeAgentApiStatus(event.payload.status, "offline");
  }
  return status;
};

export class LifecycleStatusEventProcessor implements AgentRunEventProcessor {
  private readonly lastLifecycleStatusByRunId = new Map<string, AgentApiStatus>();

  process(input: AgentRunEventProcessorInput): AgentRunEvent[] {
    const runId = input.runContext.runId;
    const explicitStatus = resolveLastLifecycleStatus(input.sourceEvents);
    if (explicitStatus) {
      this.lastLifecycleStatusByRunId.set(runId, explicitStatus);
      return [];
    }

    if (hasLifecycleErrorEvent(input.sourceEvents)) {
      this.lastLifecycleStatusByRunId.set(runId, "error");
      return [];
    }

    const lastLifecycleStatus = this.lastLifecycleStatusByRunId.get(runId) ?? null;
    if (
      input.events.length === 0 ||
      hasLifecycleStatusEvent(input.sourceEvents)
    ) {
      return [];
    }

    const status =
      hasActiveLifecycleEvidence(input.sourceEvents)
        ? "running"
        : hasIdleLifecycleEvidence(input.sourceEvents)
          ? "idle"
          : null;
    if (!status || status === lastLifecycleStatus) {
      return [];
    }

    this.lastLifecycleStatusByRunId.set(runId, status);
    return [{
      eventType: AgentRunEventType.AGENT_STATUS,
      runId,
      payload: buildAgentStatusPayload({
        status,
        canInterrupt: false,
        agentId: runId,
      }),
      statusHint: status === "running" ? "ACTIVE" : "IDLE",
    }];
  }
}
