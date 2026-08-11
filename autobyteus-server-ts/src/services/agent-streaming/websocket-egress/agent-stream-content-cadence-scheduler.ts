import { ServerMessageType } from "../models.js";
import type {
  AgentStreamEgressForward,
  AgentStreamEgressScheduler,
  StreamEgressMessage,
} from "./agent-stream-egress-control.js";
import {
  appendStreamContent,
  canAppendStreamContent,
  cloneStreamContentMessage,
  isCoalescibleStreamContent,
} from "./stream-content-coalescing.js";

type CadenceAction = "COALESCE" | "FLUSH_THEN_FORWARD" | "FORWARD_WITHOUT_FLUSH";

const SAFE_COMPANION_TYPES = new Set<ServerMessageType>([
  ServerMessageType.AGENT_COMMAND_ACK,
  ServerMessageType.CONNECTED,
  ServerMessageType.TOKEN_USAGE_UPDATED,
]);

const classifyMessage = (message: StreamEgressMessage): CadenceAction => {
  if (isCoalescibleStreamContent(message)) return "COALESCE";
  if (SAFE_COMPANION_TYPES.has(message.type as ServerMessageType)) return "FORWARD_WITHOUT_FLUSH";
  if (message.type === ServerMessageType.AGENT_STATUS) {
    return message.payload.status === "initializing" || message.payload.status === "running"
      ? "FORWARD_WITHOUT_FLUSH"
      : "FLUSH_THEN_FORWARD";
  }
  return "FLUSH_THEN_FORWARD";
};

export type AgentStreamContentCadenceSchedulerOptions = {
  readIntervalMs: () => number;
  onScheduledError: (error: unknown) => void;
};

export class AgentStreamContentCadenceScheduler<
  M extends StreamEgressMessage = StreamEgressMessage,
> implements AgentStreamEgressScheduler<M> {
  private pendingContent: M[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(private readonly options: AgentStreamContentCadenceSchedulerOptions) {}

  accept(message: M, forward: AgentStreamEgressForward<M>): void {
    if (this.disposed) return;
    const action = classifyMessage(message);
    if (action === "COALESCE") {
      this.enqueueContent(message, forward);
      return;
    }
    if (action === "FLUSH_THEN_FORWARD") {
      this.flush(forward);
    }
    forward(message);
  }

  flush(forward: AgentStreamEgressForward<M>): void {
    this.cancelTimer();
    const snapshot = this.pendingContent;
    this.pendingContent = [];
    snapshot.forEach(forward);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelTimer();
    this.pendingContent = [];
  }

  private enqueueContent(message: M, forward: AgentStreamEgressForward<M>): void {
    const tail = this.pendingContent[this.pendingContent.length - 1];
    if (tail && canAppendStreamContent(tail, message)) {
      this.pendingContent[this.pendingContent.length - 1] = appendStreamContent(tail, message);
    } else {
      this.pendingContent.push(cloneStreamContentMessage(message));
    }
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      try {
        this.flush(forward);
      } catch (error) {
        this.options.onScheduledError(error);
      }
    }, this.options.readIntervalMs());
  }

  private cancelTimer(): void {
    if (this.flushTimer === null) return;
    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
}
