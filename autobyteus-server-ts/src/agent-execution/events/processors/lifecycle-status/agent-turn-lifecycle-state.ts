import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type { AgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../../../domain/agent-run-event-turn-id.js";
import type { AgentApiStatus } from "../../../domain/agent-status-payload.js";

export type AgentActiveTurn =
  | { kind: "NONE" }
  | { kind: "IDENTIFIED"; turnId: string }
  | { kind: "ANONYMOUS"; openedBy: "boundary" | "explicit_running" };

export type AgentRunErrorObservation = {
  companionStatusAllowed: boolean;
};

const RECOVERY_ACTIVITY_EVENT_TYPES = new Set<AgentRunEventType>([
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

export class AgentTurnLifecycleState {
  activeTurn: AgentActiveTurn = { kind: "NONE" };
  readonly retiredTurnIds = new Set<string>();
  lastStatus: AgentApiStatus | null = null;

  observeBoundaryOrActivity(event: AgentRunEvent): void {
    if (event.eventType === AgentRunEventType.TURN_STARTED) {
      this.observeTurnStarted(resolveAgentRunEventTurnId(event));
      return;
    }
    if (
      event.eventType === AgentRunEventType.TURN_COMPLETED ||
      event.eventType === AgentRunEventType.TURN_INTERRUPTED
    ) {
      this.observeTurnTerminal(resolveAgentRunEventTurnId(event));
      return;
    }
    if (RECOVERY_ACTIVITY_EVENT_TYPES.has(event.eventType)) {
      this.observeRecoveryActivity(resolveAgentRunEventTurnId(event));
    }
  }

  observeError(evidence: AgentRunErrorEvidence | null): AgentRunErrorObservation {
    if (!evidence || evidence.kind === "TURN_DIAGNOSTIC") {
      return { companionStatusAllowed: false };
    }
    if (evidence.kind === "RUNTIME_GLOBAL") {
      this.retireAndClearActiveTurn();
      this.lastStatus = "error";
      return { companionStatusAllowed: true };
    }

    const turnId = evidence.turnId;
    if (this.retiredTurnIds.has(turnId)) {
      return { companionStatusAllowed: false };
    }
    this.retiredTurnIds.add(turnId);
    if (this.activeTurn.kind === "IDENTIFIED") {
      if (this.activeTurn.turnId !== turnId) {
        return { companionStatusAllowed: false };
      }
      this.activeTurn = { kind: "NONE" };
      this.lastStatus = "error";
      return { companionStatusAllowed: true };
    }
    if (this.activeTurn.kind === "ANONYMOUS") {
      return { companionStatusAllowed: false };
    }
    this.lastStatus = "error";
    return { companionStatusAllowed: true };
  }

  observeExplicitStatus(
    status: AgentApiStatus,
    errorCompanionAllowed: boolean | null,
  ): boolean {
    if (status === "running") {
      if (this.activeTurn.kind === "NONE") {
        this.activeTurn = { kind: "ANONYMOUS", openedBy: "explicit_running" };
      }
      this.lastStatus = "running";
      return true;
    }
    if (status === "idle") {
      if (this.activeTurn.kind === "IDENTIFIED") {
        return false;
      }
      this.activeTurn = { kind: "NONE" };
      this.lastStatus = "idle";
      return true;
    }
    if (status === "initializing") {
      if (this.activeTurn.kind !== "NONE") {
        return false;
      }
      this.lastStatus = "initializing";
      return true;
    }
    if (status === "error") {
      if (errorCompanionAllowed === false) {
        return false;
      }
      this.lastStatus = "error";
      return true;
    }

    this.retireAndClearActiveTurn();
    this.lastStatus = "offline";
    return true;
  }

  private observeTurnStarted(turnId: string | null): void {
    if (!turnId) {
      if (this.activeTurn.kind === "NONE") {
        this.activeTurn = { kind: "ANONYMOUS", openedBy: "boundary" };
        this.lastStatus = "running";
      } else if (this.activeTurn.kind === "ANONYMOUS") {
        this.lastStatus = "running";
      }
      return;
    }
    if (this.retiredTurnIds.has(turnId)) {
      return;
    }
    if (
      this.activeTurn.kind === "IDENTIFIED" &&
      this.activeTurn.turnId === turnId
    ) {
      return;
    }
    if (this.activeTurn.kind === "IDENTIFIED") {
      this.retiredTurnIds.add(this.activeTurn.turnId);
    }
    this.activeTurn = { kind: "IDENTIFIED", turnId };
    this.lastStatus = "running";
  }

  private observeTurnTerminal(turnId: string | null): void {
    if (!turnId) {
      if (this.activeTurn.kind === "ANONYMOUS") {
        this.activeTurn = { kind: "NONE" };
        this.lastStatus = "idle";
      }
      return;
    }
    this.retiredTurnIds.add(turnId);
    if (
      this.activeTurn.kind === "IDENTIFIED" &&
      this.activeTurn.turnId === turnId
    ) {
      this.activeTurn = { kind: "NONE" };
      this.lastStatus = "idle";
    }
  }

  private observeRecoveryActivity(turnId: string | null): void {
    if (
      this.lastStatus === "error" &&
      turnId &&
      this.activeTurn.kind === "IDENTIFIED" &&
      this.activeTurn.turnId === turnId &&
      !this.retiredTurnIds.has(turnId)
    ) {
      this.lastStatus = "running";
    }
  }

  private retireAndClearActiveTurn(): void {
    if (this.activeTurn.kind === "IDENTIFIED") {
      this.retiredTurnIds.add(this.activeTurn.turnId);
    }
    this.activeTurn = { kind: "NONE" };
  }
}
