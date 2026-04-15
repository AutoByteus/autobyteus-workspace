import { randomUUID } from "node:crypto";
import type { ApplicationNotificationMessage } from "@autobyteus/application-sdk-contracts";

export type ApplicationNotificationStreamMessage =
  | { type: "connected"; applicationId: string }
  | { type: "notification"; notification: ApplicationNotificationMessage };

export type ApplicationNotificationStreamConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

const toJson = (payload: ApplicationNotificationStreamMessage): string => JSON.stringify(payload);

export class ApplicationNotificationStreamService {
  private readonly listenersByApplicationId = new Map<
    string,
    Map<string, ApplicationNotificationStreamConnection>
  >();
  private readonly applicationIdByConnectionId = new Map<string, string>();

  connect(applicationId: string, connection: ApplicationNotificationStreamConnection): string {
    const connectionId = randomUUID();
    const listeners = this.listenersByApplicationId.get(applicationId) ?? new Map();
    listeners.set(connectionId, connection);
    this.listenersByApplicationId.set(applicationId, listeners);
    this.applicationIdByConnectionId.set(connectionId, applicationId);
    connection.send(toJson({ type: "connected", applicationId }));
    return connectionId;
  }

  disconnect(connectionId: string): void {
    const applicationId = this.applicationIdByConnectionId.get(connectionId);
    if (!applicationId) {
      return;
    }
    const listeners = this.listenersByApplicationId.get(applicationId);
    listeners?.delete(connectionId);
    if (listeners && listeners.size === 0) {
      this.listenersByApplicationId.delete(applicationId);
    }
    this.applicationIdByConnectionId.delete(connectionId);
  }

  publish(notification: ApplicationNotificationMessage): void {
    const listeners = this.listenersByApplicationId.get(notification.applicationId);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const payload = toJson({ type: "notification", notification });
    for (const [connectionId, connection] of listeners.entries()) {
      try {
        connection.send(payload);
      } catch {
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

let cachedApplicationNotificationStreamService: ApplicationNotificationStreamService | null = null;

export const getApplicationNotificationStreamService = (): ApplicationNotificationStreamService => {
  if (!cachedApplicationNotificationStreamService) {
    cachedApplicationNotificationStreamService = new ApplicationNotificationStreamService();
  }
  return cachedApplicationNotificationStreamService;
};
