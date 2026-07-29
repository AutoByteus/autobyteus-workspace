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
import type {
  AgentRunEventTransformer,
  AgentRunEventTransformerInput,
} from "../../agent-run-event-transformer.js";
import { AgentTurnLifecycleState } from "./agent-turn-lifecycle-state.js";

type PendingErrorCompanion = { allowed: boolean } | null;

export class LifecycleStatusEventTransformer implements AgentRunEventTransformer {
  private readonly stateByContext = new WeakMap<object, AgentTurnLifecycleState>();

  transform(input: AgentRunEventTransformerInput): AgentRunEvent[] {
    const state = this.getState(input.runContext);
    let lastOutwardStatus = state.lastStatus;
    let pendingErrorCompanion: PendingErrorCompanion = null;
    const output: AgentRunEvent[] = [];

    for (const event of input.events) {
      if (event.eventType === AgentRunEventType.AGENT_STATUS) {
        const status = normalizeAgentApiStatus(event.payload.status);
        const accepted = state.observeExplicitStatus(
          status,
          pendingErrorCompanion?.allowed ?? null,
        );
        pendingErrorCompanion = null;
        if (accepted) {
          output.push(event);
          lastOutwardStatus = status;
        }
        continue;
      }

      output.push(event);
      if (event.eventType === AgentRunEventType.ERROR) {
        const observation = state.observeError(resolveAgentRunErrorEvidence(event));
        pendingErrorCompanion = { allowed: observation.companionStatusAllowed };
      } else {
        pendingErrorCompanion = null;
        state.observeBoundaryOrActivity(event);
      }
    }

    if (state.lastStatus && state.lastStatus !== lastOutwardStatus) {
      output.push(this.buildDerivedStatusEvent(input.runContext.runId, state.lastStatus));
    }
    return output;
  }

  private getState(context: object): AgentTurnLifecycleState {
    let state = this.stateByContext.get(context);
    if (!state) {
      state = new AgentTurnLifecycleState();
      this.stateByContext.set(context, state);
    }
    return state;
  }

  private buildDerivedStatusEvent(runId: string, status: AgentApiStatus): AgentRunEvent {
    return {
      eventType: AgentRunEventType.AGENT_STATUS,
      runId,
      payload: buildAgentStatusPayload({
        status,
        canInterrupt: false,
        agentId: runId,
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
