import { ServerMessage } from "./models.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

type RegisteredConnection = {
  runId: string;
  sink: AgentStreamServerMessageSink;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class AgentStreamBroadcaster {
  private readonly connectionsBySessionId = new Map<string, RegisteredConnection>();

  registerConnection(
    sessionId: string,
    runId: string,
    sink: AgentStreamServerMessageSink,
  ): void {
    this.connectionsBySessionId.set(sessionId, {
      runId,
      sink,
    });
  }

  unregisterConnection(sessionId: string): void {
    this.connectionsBySessionId.delete(sessionId);
  }

  publishToRun(runId: string, message: ServerMessage): number {
    let delivered = 0;

    for (const [sessionId, registered] of this.connectionsBySessionId.entries()) {
      if (registered.runId !== runId) {
        continue;
      }
      try {
        registered.sink.send(message);
        delivered += 1;
      } catch (error) {
        this.connectionsBySessionId.delete(sessionId);
        logger.warn(
          `Agent stream broadcast failed for session '${sessionId}' on run '${runId}'. Removing the stale connection.`,
          error,
        );
      }
    }

    return delivered;
  }
}

let cachedAgentStreamBroadcaster: AgentStreamBroadcaster | null = null;

export const getAgentStreamBroadcaster = (): AgentStreamBroadcaster => {
  if (!cachedAgentStreamBroadcaster) {
    cachedAgentStreamBroadcaster = new AgentStreamBroadcaster();
  }
  return cachedAgentStreamBroadcaster;
};
