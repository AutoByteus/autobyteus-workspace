import { ServerMessage } from "./models.js";

export type AgentStreamBroadcastConnection = {
  send: (data: string) => void;
};

type RegisteredConnection = {
  runId: string;
  connection: AgentStreamBroadcastConnection;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class AgentStreamBroadcaster {
  private readonly connectionsBySessionId = new Map<string, RegisteredConnection>();

  registerConnection(
    sessionId: string,
    runId: string,
    connection: AgentStreamBroadcastConnection,
  ): void {
    this.connectionsBySessionId.set(sessionId, {
      runId,
      connection,
    });
  }

  unregisterConnection(sessionId: string): void {
    this.connectionsBySessionId.delete(sessionId);
  }

  publishToRun(runId: string, message: ServerMessage): number {
    const payload = message.toJson();
    let delivered = 0;

    for (const [sessionId, registered] of this.connectionsBySessionId.entries()) {
      if (registered.runId !== runId) {
        continue;
      }
      try {
        registered.connection.send(payload);
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
