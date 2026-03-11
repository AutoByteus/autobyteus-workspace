import { ServerMessage } from "./models.js";

export type TeamStreamBroadcastConnection = {
  send: (data: string) => void;
};

type RegisteredConnection = {
  teamRunId: string;
  connection: TeamStreamBroadcastConnection;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamStreamBroadcaster {
  private readonly connectionsBySessionId = new Map<string, RegisteredConnection>();

  registerConnection(
    sessionId: string,
    teamRunId: string,
    connection: TeamStreamBroadcastConnection,
  ): void {
    this.connectionsBySessionId.set(sessionId, {
      teamRunId,
      connection,
    });
  }

  unregisterConnection(sessionId: string): void {
    this.connectionsBySessionId.delete(sessionId);
  }

  publishToTeamRun(teamRunId: string, message: ServerMessage): number {
    const payload = message.toJson();
    let delivered = 0;

    for (const [sessionId, registered] of this.connectionsBySessionId.entries()) {
      if (registered.teamRunId !== teamRunId) {
        continue;
      }
      try {
        registered.connection.send(payload);
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
