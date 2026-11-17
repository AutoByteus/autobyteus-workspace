import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
} from "../../../domain/agent-status-payload.js";
import type { AgentTurnLifecycleState } from "./agent-turn-lifecycle-state.js";
import type {
  AgentRunEventTransformer,
  AgentRunEventTransformerInput,
} from "../../agent-run-event-transformer.js";

const TERMINAL_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.TURN_COMPLETED,
  AgentRunEventType.TURN_INTERRUPTED,
  AgentRunEventType.ERROR,
]);

export class LifecycleStatusEventTransformer implements AgentRunEventTransformer {
  transform(input: AgentRunEventTransformerInput): AgentRunEvent[] {
    const state = input.lifecycleState;
    if (!state) {
      throw new Error("LifecycleStatusEventTransformer requires run-owned lifecycle state.");
    }
    if (input.runtimeLifecycleSnapshot) {
      state.reconcileRuntimeSnapshot(input.runtimeLifecycleSnapshot);
    }

    const output: AgentRunEvent[] = [];
    for (const event of input.events) {
      if (event.eventType === AgentRunEventType.AGENT_STATUS) {
        state.observeExplicitStatus(normalizeAgentApiStatus(event.payload.status));
        output.push(this.buildStatusEvent(input.runContext.runId, state));
        continue;
      }

      if (TERMINAL_EVENT_TYPES.has(event.eventType)) {
        output.push(event);
        if (event.eventType === AgentRunEventType.ERROR) {
          state.observeError(resolveAgentRunErrorEvidence(event));
        } else {
          state.observeEvent(event);
        }
        output.push(this.buildStatusEvent(input.runContext.runId, state));
        continue;
      }

      state.observeEvent(event);
      output.push(this.buildStatusEvent(input.runContext.runId, state), event);
    }
    return output;
  }

  buildStatusEvent(runId: string, state: Pick<AgentTurnLifecycleState, "status" | "recoverableBlock" | "backgroundTasksRunning">): AgentRunEvent {
    const status = state.status;
    return {
      eventType: AgentRunEventType.AGENT_STATUS,
      runId,
      payload: buildAgentStatusPayload({
        status,
        backgroundTasksRunning: state.backgroundTasksRunning,
        agentId: runId,
        recoverableBlock: state.recoverableBlock,
      }),
      statusHint:
        status === "running"
          ? "ACTIVE"
          : status === "error"
            ? "ERROR"
            : status === "idle" || status === "offline"
              ? "IDLE"
              : null,
    };
  }
}
