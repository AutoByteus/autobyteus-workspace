import { randomUUID } from "node:crypto";
import { serializeProjectChangeMessage, type ProjectChangeMessage } from "./project-change-messages.js";

export type ProjectChangeHubConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

/** Every `/ws/projects` connection of this node; broadcast only, no business logic. */
export class ProjectChangeHub {
  private readonly connections = new Map<string, ProjectChangeHubConnection>();

  /** Registers the connection and greets it; a client re-reads its loaded views on every greeting. */
  connect(connection: ProjectChangeHubConnection): string {
    const connectionId = randomUUID();
    this.connections.set(connectionId, connection);
    this.sendTo(connectionId, connection, serializeProjectChangeMessage({ type: "connected" }));
    return connectionId;
  }

  disconnect(connectionId: string): void { this.connections.delete(connectionId); }

  broadcast(message: ProjectChangeMessage): void {
    if (this.connections.size === 0) return;
    const payload = serializeProjectChangeMessage(message);
    for (const [connectionId, connection] of [...this.connections]) this.sendTo(connectionId, connection, payload);
  }

  closeAll(): void {
    for (const connection of this.connections.values()) {
      try { connection.close(1001); } catch { /* connection cleanup is isolated */ }
    }
    this.connections.clear();
  }

  private sendTo(connectionId: string, connection: ProjectChangeHubConnection, payload: string): void {
    try { connection.send(payload); }
    catch {
      try { connection.close(1011); } catch { /* no-op */ }
      this.disconnect(connectionId);
    }
  }
}

let singleton: ProjectChangeHub | null = null;
/** The node's process hub (the websocket route connects clients; the publisher broadcasts). */
export const getProjectChangeHub = (): ProjectChangeHub => singleton ??= new ProjectChangeHub();
export const resetProjectChangeHubForTests = (): void => { singleton = null; };
