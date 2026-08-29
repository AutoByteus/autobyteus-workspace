import fs from "node:fs";
import type { ApplicationEngineStatus } from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationEngineClient,
  ApplicationEngineClientNotification,
} from "../runtime/application-engine-client.js";
import type { ApplicationWorkerSupervisor } from "../runtime/application-worker-supervisor.js";
import type { ApplicationWorkerWebSocketActionInput } from "../runtime/protocol.js";

export type ApplicationEngineRuntimeHandle = Readonly<{
  supervisor: ApplicationWorkerSupervisor;
  client: ApplicationEngineClient;
}>;

export const createApplicationEngineBaseStatus = (
  applicationId: string,
): ApplicationEngineStatus => ({
  applicationId,
  state: "stopped",
  ready: false,
  startedAt: null,
  lastFailure: null,
  exposures: null,
});

export class ApplicationEngineStateRegistry {
  private readonly statusByApplicationId =
    new Map<string, ApplicationEngineStatus>();
  private readonly runtimeHandleByApplicationId =
    new Map<string, ApplicationEngineRuntimeHandle>();
  private readonly notificationListeners = new Set<(event: {
    applicationId: string;
    message: ApplicationEngineClientNotification;
  }) => void>();
  private readonly webSocketActionListeners = new Set<(event: {
    applicationId: string;
    action: ApplicationWorkerWebSocketActionInput;
  }) => Promise<void> | void>();
  private readonly workerCloseListeners = new Set<(event: {
    applicationId: string;
    error: Error | null;
  }) => void>();

  getAttachedHandle(applicationId: string): ApplicationEngineRuntimeHandle | null {
    return this.runtimeHandleByApplicationId.get(applicationId) ?? null;
  }

  listAttachedApplicationIds(): readonly string[] {
    return Object.freeze(Array.from(this.runtimeHandleByApplicationId.keys()));
  }

  attach(applicationId: string, handle: ApplicationEngineRuntimeHandle): void {
    if (this.runtimeHandleByApplicationId.has(applicationId)) {
      throw new Error(`Application engine '${applicationId}' is already attached.`);
    }
    this.runtimeHandleByApplicationId.set(applicationId, handle);
  }

  detachIfCurrent(
    applicationId: string,
    expectedHandle: ApplicationEngineRuntimeHandle,
  ): boolean {
    if (this.runtimeHandleByApplicationId.get(applicationId) !== expectedHandle) {
      return false;
    }
    this.runtimeHandleByApplicationId.delete(applicationId);
    return true;
  }

  getStatus(applicationId: string): ApplicationEngineStatus {
    return this.statusByApplicationId.get(applicationId)
      ?? createApplicationEngineBaseStatus(applicationId);
  }

  updateStatus(
    applicationId: string,
    status: ApplicationEngineStatus,
    statusPath?: string,
  ): void {
    this.statusByApplicationId.set(applicationId, status);
    if (statusPath) {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }
  }

  onNotification(listener: (event: {
    applicationId: string;
    message: ApplicationEngineClientNotification;
  }) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onWebSocketAction(listener: (event: {
    applicationId: string;
    action: ApplicationWorkerWebSocketActionInput;
  }) => Promise<void> | void): () => void {
    this.webSocketActionListeners.add(listener);
    return () => this.webSocketActionListeners.delete(listener);
  }

  onWorkerClose(listener: (event: {
    applicationId: string;
    error: Error | null;
  }) => void): () => void {
    this.workerCloseListeners.add(listener);
    return () => this.workerCloseListeners.delete(listener);
  }

  publishNotification(
    applicationId: string,
    message: ApplicationEngineClientNotification,
  ): void {
    for (const listener of this.notificationListeners) {
      try {
        listener({ applicationId, message });
      } catch {
        // Listener isolation is intentional.
      }
    }
  }

  async publishWebSocketAction(
    applicationId: string,
    action: ApplicationWorkerWebSocketActionInput,
  ): Promise<{ accepted: true }> {
    for (const listener of this.webSocketActionListeners) {
      await listener({ applicationId, action });
    }
    return { accepted: true };
  }

  publishWorkerClose(applicationId: string, error: Error | null): void {
    for (const listener of this.workerCloseListeners) {
      try {
        listener({ applicationId, error });
      } catch {
        // Listener isolation is intentional.
      }
    }
  }

  clearListeners(): void {
    this.notificationListeners.clear();
    this.webSocketActionListeners.clear();
    this.workerCloseListeners.clear();
  }
}
