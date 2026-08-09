import { resolveStreamingContentFlushIntervalMs } from "../../../config/streaming-content-flush-interval-setting.js";
import { ServerMessage } from "../models.js";
import { classifyAgentStreamWebSocketEgressMessage } from "./agent-stream-websocket-egress-policy.js";
import {
  appendStreamContent,
  canAppendStreamContent,
  cloneStreamContentMessage,
} from "./stream-content-coalescing.js";

export interface AgentStreamServerMessageSink {
  send(message: ServerMessage): void;
}

export type AgentStreamWebSocketEgressOptions = {
  sendRaw: (payload: string) => void;
  readIntervalMs?: () => number;
  onSendError?: (error: unknown) => void;
};

export class AgentStreamWebSocketEgress implements AgentStreamServerMessageSink {
  private pendingContent: ServerMessage[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly readIntervalMs: () => number;
  private readonly onSendError: (error: unknown) => void;

  constructor(private readonly options: AgentStreamWebSocketEgressOptions) {
    this.readIntervalMs = options.readIntervalMs ?? resolveStreamingContentFlushIntervalMs;
    this.onSendError = options.onSendError ?? (() => undefined);
  }

  send(message: ServerMessage): void {
    if (this.disposed) {
      return;
    }

    const action = classifyAgentStreamWebSocketEgressMessage(message);
    if (action === "COALESCE") {
      this.enqueueContent(message);
      return;
    }
    if (action === "SEND_WITHOUT_FLUSH") {
      this.sendRaw(message);
      return;
    }

    this.flush();
    this.sendRaw(message);
  }

  flush(): void {
    this.cancelTimer();
    if (this.pendingContent.length === 0) {
      return;
    }

    const snapshot = this.pendingContent;
    this.pendingContent = [];
    for (const message of snapshot) {
      this.sendRaw(message);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cancelTimer();
    this.pendingContent = [];
  }

  private enqueueContent(message: ServerMessage): void {
    const tail = this.pendingContent[this.pendingContent.length - 1];
    if (tail && canAppendStreamContent(tail, message)) {
      appendStreamContent(tail, message);
    } else {
      this.pendingContent.push(cloneStreamContentMessage(message));
    }

    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        try {
          this.flush();
        } catch (error) {
          this.onSendError(error);
        }
      }, this.readIntervalMs());
    }
  }

  private cancelTimer(): void {
    if (this.flushTimer === null) {
      return;
    }
    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  private sendRaw(message: ServerMessage): void {
    this.options.sendRaw(message.toJson());
  }
}
