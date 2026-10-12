import { randomUUID } from "node:crypto";
import {
  serializeAgentPackageDefinitionChangeMessage,
  type AgentPackageDefinitionChangeMessage,
} from "./agent-package-definition-change-messages.js";

export type AgentPackageDefinitionChangeConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

/** Every `/ws/agent-package-definitions` connection of this node; broadcast only, no business logic. */
export class AgentPackageDefinitionChangeHub {
  private readonly connections = new Map<string, AgentPackageDefinitionChangeConnection>();

  /** Registers the connection and greets it; a client re-reads its loaded catalogs on every greeting. */
  connect(connection: AgentPackageDefinitionChangeConnection): string {
    const connectionId = randomUUID();
    this.connections.set(connectionId, connection);
    this.sendTo(connectionId, connection, serializeAgentPackageDefinitionChangeMessage({ type: "connected" }));
    return connectionId;
  }

  disconnect(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  broadcast(message: AgentPackageDefinitionChangeMessage): void {
    if (this.connections.size === 0) return;
    const payload = serializeAgentPackageDefinitionChangeMessage(message);
    for (const [connectionId, connection] of [...this.connections]) this.sendTo(connectionId, connection, payload);
  }

  closeAll(): void {
    for (const connection of this.connections.values()) {
      try { connection.close(1001); } catch { /* connection cleanup is isolated */ }
    }
    this.connections.clear();
  }

  private sendTo(connectionId: string, connection: AgentPackageDefinitionChangeConnection, payload: string): void {
    try {
      connection.send(payload);
    } catch {
      try { connection.close(1011); } catch { /* no-op */ }
      this.disconnect(connectionId);
    }
  }
}
