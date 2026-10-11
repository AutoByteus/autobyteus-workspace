import { randomUUID } from "node:crypto";
import {
  serializeDefinitionCatalogChangeMessage,
  type DefinitionCatalogChangeMessage,
} from "./definition-catalog-change-messages.js";

export type DefinitionCatalogChangeConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

/** Every `/ws/definition-catalog` connection of this node; broadcast only, no business logic. */
export class DefinitionCatalogChangeHub {
  private readonly connections = new Map<string, DefinitionCatalogChangeConnection>();

  /** Registers the connection and greets it; a client re-reads its loaded catalogs on every greeting. */
  connect(connection: DefinitionCatalogChangeConnection): string {
    const connectionId = randomUUID();
    this.connections.set(connectionId, connection);
    this.sendTo(connectionId, connection, serializeDefinitionCatalogChangeMessage({ type: "connected" }));
    return connectionId;
  }

  disconnect(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  broadcast(message: DefinitionCatalogChangeMessage): void {
    if (this.connections.size === 0) return;
    const payload = serializeDefinitionCatalogChangeMessage(message);
    for (const [connectionId, connection] of [...this.connections]) this.sendTo(connectionId, connection, payload);
  }

  closeAll(): void {
    for (const connection of this.connections.values()) {
      try { connection.close(1001); } catch { /* connection cleanup is isolated */ }
    }
    this.connections.clear();
  }

  private sendTo(connectionId: string, connection: DefinitionCatalogChangeConnection, payload: string): void {
    try {
      connection.send(payload);
    } catch {
      try { connection.close(1011); } catch { /* no-op */ }
      this.disconnect(connectionId);
    }
  }
}
