import type { TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

type RegisteredConnection = {
  teamRunId: string;
  sink: AgentStreamServerMessageSink<TeamStreamServerMessage>;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamStreamBroadcaster {
  private readonly connectionsBySessionId = new Map<string, RegisteredConnection>();

  registerConnection(
    sessionId: string,
    teamRunId: string,
    sink: AgentStreamServerMessageSink<TeamStreamServerMessage>,
  ): void {
    this.connectionsBySessionId.set(sessionId, {
      teamRunId,
      sink,
    });
  }

  unregisterConnection(sessionId: string): void {
    this.connectionsBySessionId.delete(sessionId);
  }

  publishToTeamRun(teamRunId: string, message: TeamStreamServerMessage): number {
    let delivered = 0;

    for (const [sessionId, registered] of this.connectionsBySessionId.entries()) {
      if (registered.teamRunId !== teamRunId) {
        continue;
      }
      try {
        registered.sink.send(message);
        delivered += 1;
      } catch (error) {
        this.connectionsBySessionId.delete(sessionId);
        logger.warn(
          `Team stream broadcast failed for session '${sessionId}' on team run '${teamRunId}'. Removing the stale connection.`,
          error,
        );
      }
    }

    return delivered;
  }
}

let cachedTeamStreamBroadcaster: TeamStreamBroadcaster | null = null;

export const getTeamStreamBroadcaster = (): TeamStreamBroadcaster => {
  if (!cachedTeamStreamBroadcaster) {
    cachedTeamStreamBroadcaster = new TeamStreamBroadcaster();
  }
  return cachedTeamStreamBroadcaster;
};
