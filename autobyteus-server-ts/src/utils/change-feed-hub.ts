import { randomUUID } from "node:crypto";

export type ChangeFeedConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

/**
 * Every connection of one `/ws/<feed>` route of this node: greets each connection, broadcasts
 * messages and closes all. Broadcast only, no business logic; the feed's own serializer is the
 * exact writer of its messages.
 */
export class ChangeFeedHub<Message> {
  private readonly connections = new Map<string, ChangeFeedConnection>();

  constructor(private readonly feed: Readonly<{
    serialize: (message: Message) => string;
    connectedMessage: Message;
  }>) {}

  /** Registers the connection and greets it; a client re-reads its views on every greeting. */
  connect(connection: ChangeFeedConnection): string {
    const connectionId = randomUUID();
    this.connections.set(connectionId, connection);
    this.sendTo(connectionId, connection, this.feed.serialize(this.feed.connectedMessage));
    return connectionId;
  }

  disconnect(connectionId: string): void { this.connections.delete(connectionId); }

  broadcast(message: Message): void {
    if (this.connections.size === 0) return;
    const payload = this.feed.serialize(message);
    for (const [connectionId, connection] of [...this.connections]) this.sendTo(connectionId, connection, payload);
  }

  closeAll(): void {
    for (const connection of this.connections.values()) {
      try { connection.close(1001); } catch { /* connection cleanup is isolated */ }
    }
    this.connections.clear();
  }

  private sendTo(connectionId: string, connection: ChangeFeedConnection, payload: string): void {
    try { connection.send(payload); }
    catch {
      try { connection.close(1011); } catch { /* no-op */ }
      this.disconnect(connectionId);
    }
  }
}
