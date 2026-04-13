import { randomUUID } from "node:crypto";
import type { ApplicationSessionSnapshot } from "../domain/models.js";

export type ApplicationSessionStreamMessage =
  | { type: "connected"; applicationSessionId: string }
  | { type: "snapshot"; session: ApplicationSessionSnapshot };

export type ApplicationSessionStreamConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

const toJson = (payload: ApplicationSessionStreamMessage): string => JSON.stringify(payload);

export class ApplicationSessionStreamService {
  private readonly listenersBySessionId = new Map<
    string,
    Map<string, ApplicationSessionStreamConnection>
  >();
  private readonly sessionIdByConnectionId = new Map<string, string>();

  connect(
    applicationSessionId: string,
    connection: ApplicationSessionStreamConnection,
    snapshot: ApplicationSessionSnapshot,
  ): string {
    const connectionId = randomUUID();
    const listeners = this.listenersBySessionId.get(applicationSessionId) ?? new Map();
    listeners.set(connectionId, connection);
    this.listenersBySessionId.set(applicationSessionId, listeners);
    this.sessionIdByConnectionId.set(connectionId, applicationSessionId);
    connection.send(toJson({ type: "connected", applicationSessionId }));
    connection.send(toJson({ type: "snapshot", session: snapshot }));
    return connectionId;
  }

  disconnect(connectionId: string): void {
    const sessionId = this.sessionIdByConnectionId.get(connectionId);
    if (!sessionId) {
      return;
    }
    const listeners = this.listenersBySessionId.get(sessionId);
    listeners?.delete(connectionId);
    if (listeners && listeners.size === 0) {
      this.listenersBySessionId.delete(sessionId);
    }
    this.sessionIdByConnectionId.delete(connectionId);
  }

  publish(snapshot: ApplicationSessionSnapshot): void {
    const listeners = this.listenersBySessionId.get(snapshot.applicationSessionId);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const payload = toJson({ type: "snapshot", session: snapshot });
    for (const [connectionId, connection] of listeners.entries()) {
      try {
        connection.send(payload);
      } catch (error) {
        console.warn(
          `Failed to publish application session snapshot for '${snapshot.applicationSessionId}': ${String(error)}`,
        );
        try {
          connection.close(1011);
        } catch {
          // no-op
        }
        this.disconnect(connectionId);
      }
    }
  }
}

let cachedApplicationSessionStreamService: ApplicationSessionStreamService | null = null;

export const getApplicationSessionStreamService = (): ApplicationSessionStreamService => {
  if (!cachedApplicationSessionStreamService) {
    cachedApplicationSessionStreamService = new ApplicationSessionStreamService();
  }
  return cachedApplicationSessionStreamService;
};
