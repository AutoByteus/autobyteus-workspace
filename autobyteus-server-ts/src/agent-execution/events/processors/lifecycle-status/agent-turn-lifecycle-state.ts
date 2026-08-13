import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type { AgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../../../domain/agent-run-event-turn-id.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentApiStatus } from "../../../domain/agent-status-payload.js";

export type AgentActiveTurn =
  | { kind: "NONE" }
  | { kind: "IDENTIFIED"; turnId: string }
  | { kind: "ANONYMOUS" };

type PendingCommand = {
  token: number;
  previousStatus: AgentApiStatus;
  acceptedWithoutTurnId: boolean;
};

const ACTIVITY_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.SEGMENT_START,
  AgentRunEventType.SEGMENT_CONTENT,
  AgentRunEventType.SEGMENT_END,
  AgentRunEventType.COMPACTION_STATUS,
  AgentRunEventType.TOKEN_USAGE_UPDATED,
  AgentRunEventType.ASSISTANT_COMPLETE,
  AgentRunEventType.TOOL_APPROVAL_REQUESTED,
  AgentRunEventType.TOOL_APPROVED,
  AgentRunEventType.TOOL_DENIED,
  AgentRunEventType.TOOL_EXECUTION_STARTED,
  AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
  AgentRunEventType.TOOL_EXECUTION_FAILED,
  AgentRunEventType.TOOL_EXECUTION_INTERRUPTED,
  AgentRunEventType.TOOL_LOG,
  AgentRunEventType.TODO_LIST_UPDATE,
]);

export class AgentTurnLifecycleState {
  activeTurn: AgentActiveTurn = { kind: "NONE" };
  readonly retiredTurnIds = new Set<string>();
  lastStatus: AgentApiStatus = "idle";
  private pendingCommand: PendingCommand | null = null;
  private nextCommandToken = 1;

  beginCommand(): number | null {
    if (this.activeTurn.kind !== "NONE" || this.pendingCommand) {
      return null;
    }
    const token = this.nextCommandToken++;
    this.pendingCommand = {
      token,
      previousStatus: this.lastStatus,
      acceptedWithoutTurnId: false,
    };
    this.lastStatus = "initializing";
    return token;
  }

  acceptCommand(token: number, turnId: string | null): void {
    if (this.pendingCommand?.token !== token) {
      return;
    }
    if (turnId) {
      this.pendingCommand = null;
      this.openIdentifiedTurn(turnId);
      return;
    }
    this.pendingCommand.acceptedWithoutTurnId = true;
    this.lastStatus = "initializing";
  }

  rollbackCommand(token: number): void {
    if (this.pendingCommand?.token !== token) {
      return;
    }
    const previousStatus = this.pendingCommand.previousStatus;
    this.pendingCommand = null;
    if (this.activeTurn.kind === "NONE") {
      this.lastStatus = previousStatus === "running" ? "idle" : previousStatus;
    }
  }

  failCommand(token: number): void {
    if (this.pendingCommand?.token !== token) {
      return;
    }
    this.pendingCommand = null;
    this.retireAndClearActiveTurn();
    this.lastStatus = "error";
  }

  terminate(): void {
    this.pendingCommand = null;
    this.retireAndClearActiveTurn();
    this.lastStatus = "offline";
  }

  reconcileRuntimeSnapshot(snapshot: AgentRuntimeLifecycleSnapshot): void {
    if (snapshot.availability === "offline") {
      this.terminate();
      return;
    }
    if (snapshot.phase === "error") {
      this.pendingCommand = null;
      this.retireAndClearActiveTurn();
      this.lastStatus = "error";
      return;
    }

    if (snapshot.currentTurn.kind === "IDENTIFIED") {
      if (!this.retiredTurnIds.has(snapshot.currentTurn.turnId)) {
        this.pendingCommand = null;
        this.openIdentifiedTurn(snapshot.currentTurn.turnId);
      }
      return;
    }

    if (this.activeTurn.kind === "IDENTIFIED") {
      this.lastStatus = "running";
      return;
    }

    if (snapshot.currentTurn.kind === "ANONYMOUS") {
      this.pendingCommand = null;
      this.activeTurn = { kind: "ANONYMOUS" };
      this.lastStatus = "running";
      return;
    }

    if (this.activeTurn.kind === "ANONYMOUS") {
      if (snapshot.phase !== "idle") {
        this.lastStatus = "running";
        return;
      }
      this.activeTurn = { kind: "NONE" };
    }

    if (this.pendingCommand) {
      this.lastStatus = "initializing";
      return;
    }

    // A terminal error is a canonical lifecycle fact. A runtime that has
    // already fallen back to an otherwise-empty idle snapshot must not erase
    // it during a status read or reconnect bind. A later command/start event
    // can still advance the lifecycle normally.
    if (this.lastStatus === "error") {
      return;
    }

    this.lastStatus = snapshot.phase === "running"
      ? "initializing"
      : snapshot.phase;
  }

  observeEvent(event: AgentRunEvent): void {
    if (event.eventType === AgentRunEventType.TURN_STARTED) {
      const turnId = resolveAgentRunEventTurnId(event);
      this.pendingCommand = null;
      if (turnId) {
        this.openIdentifiedTurn(turnId);
      } else if (this.activeTurn.kind === "NONE") {
        this.activeTurn = { kind: "ANONYMOUS" };
        this.lastStatus = "running";
      }
      return;
    }

    if (
      event.eventType === AgentRunEventType.TURN_COMPLETED ||
      event.eventType === AgentRunEventType.TURN_INTERRUPTED
    ) {
      this.observeTurnTerminal(resolveAgentRunEventTurnId(event));
      return;
    }

    if (!ACTIVITY_EVENT_TYPES.has(event.eventType)) {
      return;
    }

    const turnId = resolveAgentRunEventTurnId(event);
    if (this.activeTurn.kind === "IDENTIFIED") {
      if (!turnId || turnId === this.activeTurn.turnId) {
        this.lastStatus = "running";
      }
      return;
    }
    if (this.activeTurn.kind === "ANONYMOUS") {
      this.lastStatus = "running";
      return;
    }
    if (!this.pendingCommand?.acceptedWithoutTurnId) {
      return;
    }
    this.pendingCommand = null;
    if (turnId && !this.retiredTurnIds.has(turnId)) {
      this.openIdentifiedTurn(turnId);
    } else if (!turnId) {
      this.activeTurn = { kind: "ANONYMOUS" };
      this.lastStatus = "running";
    }
  }

  observeError(evidence: AgentRunErrorEvidence | null): void {
    if (
      !evidence ||
      evidence.kind === "TURN_DIAGNOSTIC" ||
      evidence.kind === "RUNTIME_DIAGNOSTIC"
    ) {
      return;
    }
    if (evidence.kind === "RUNTIME_GLOBAL") {
      this.pendingCommand = null;
      this.retireAndClearActiveTurn();
      this.lastStatus = "error";
      return;
    }

    const turnId = evidence.turnId;
    if (this.retiredTurnIds.has(turnId)) {
      return;
    }
    this.retiredTurnIds.add(turnId);
    if (
      this.activeTurn.kind === "IDENTIFIED" &&
      this.activeTurn.turnId === turnId
    ) {
      this.activeTurn = { kind: "NONE" };
      this.pendingCommand = null;
      this.lastStatus = "error";
    }
  }

  observeExplicitStatus(status: AgentApiStatus): void {
    if (status === "offline") {
      this.terminate();
      return;
    }
    if (status === "error") {
      if (this.activeTurn.kind === "NONE") {
        this.pendingCommand = null;
        this.lastStatus = "error";
      }
      return;
    }
    if (status === "running") {
      if (this.activeTurn.kind !== "NONE") {
        this.lastStatus = "running";
      } else if (this.pendingCommand?.acceptedWithoutTurnId) {
        this.pendingCommand = null;
        this.activeTurn = { kind: "ANONYMOUS" };
        this.lastStatus = "running";
      }
      return;
    }
    if (this.activeTurn.kind !== "NONE") {
      this.lastStatus = "running";
      return;
    }
    if (this.pendingCommand) {
      this.lastStatus = "initializing";
      return;
    }
    this.lastStatus = status;
  }

  get status(): AgentApiStatus {
    if (this.activeTurn.kind !== "NONE") {
      return "running";
    }
    if (this.pendingCommand) {
      return "initializing";
    }
    return this.lastStatus;
  }

  private openIdentifiedTurn(turnId: string): void {
    if (this.retiredTurnIds.has(turnId)) {
      return;
    }
    if (
      this.activeTurn.kind === "IDENTIFIED" &&
      this.activeTurn.turnId !== turnId
    ) {
      this.retiredTurnIds.add(this.activeTurn.turnId);
    }
    this.activeTurn = { kind: "IDENTIFIED", turnId };
    this.lastStatus = "running";
  }

  private observeTurnTerminal(turnId: string | null): void {
    if (!turnId) {
      if (this.activeTurn.kind === "ANONYMOUS") {
        this.activeTurn = { kind: "NONE" };
        this.pendingCommand = null;
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
      this.pendingCommand = null;
      this.lastStatus = "idle";
    }
  }

  private retireAndClearActiveTurn(): void {
    if (this.activeTurn.kind === "IDENTIFIED") {
      this.retiredTurnIds.add(this.activeTurn.turnId);
    }
    this.activeTurn = { kind: "NONE" };
  }
}
